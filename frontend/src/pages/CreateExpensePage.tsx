import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { getGroupDetail } from '../api/group.api';
import { createExpense } from '../api/expense.api';
import { useAuthStore } from '../stores/authStore';
import { Group, SplitMethod } from '../types';
import { ArrowLeft, ArrowRight, Check, DollarSign, Calendar, Info, Loader2, Users, FileText, CheckSquare, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';

export const CreateExpensePage = () => {
  const { groupId } = useParams<{ groupId: string }>();
  const navigate = useNavigate();
  const currentUser = useAuthStore((state) => state.user);

  const [group, setGroup] = useState<Group | null>(null);
  const [isLoadingGroup, setIsLoadingGroup] = useState(true);
  const [step, setStep] = useState(1);

  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [paidById, setPaidById] = useState('');

  const [splitMethod, setSplitMethod] = useState<SplitMethod>(SplitMethod.EQUAL);

  const [selectedParticipants, setSelectedParticipants] = useState<Record<string, boolean>>({});
  const [shareValues, setShareValues] = useState<Record<string, string>>({});

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [immediateSettlement, setImmediateSettlement] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('CASH');

  useEffect(() => {
    if (!groupId) return;
    const fetchGroup = async () => {
      try {
        const res = await getGroupDetail(groupId);
        setGroup(res.data);
        const isMember = res.data.members?.some(m => m.userId === currentUser?.id && m.isActive);
        if (isMember && currentUser) {
          setPaidById(currentUser.id);
        } else if (res.data.members && res.data.members.length > 0) {
          setPaidById(res.data.members[0].userId);
        }
        
        const initialSelected: Record<string, boolean> = {};
        res.data.members?.forEach(m => {
          if (m.isActive) {
            initialSelected[m.userId] = true;
          }
        });
        setSelectedParticipants(initialSelected);
      } catch (err: any) {
        toast.error('Failed to load group details');
        navigate('/');
      } finally {
        setIsLoadingGroup(false);
      }
    };
    fetchGroup();
  }, [groupId, currentUser, navigate]);

  if (isLoadingGroup || !group) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-100 font-sans">
        <Loader2 className="w-10 h-10 animate-spin text-indigo-500 mb-4" />
        <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">Loading group members...</p>
      </div>
    );
  }

  const activeMembers = group.members?.filter(m => m.isActive) || [];
  const selectedCount = Object.values(selectedParticipants).filter(Boolean).length;
  const totalAmountNum = parseFloat(amount) || 0;

  const getRunningSum = () => {
    let sum = 0;
    activeMembers.forEach(m => {
      if (selectedParticipants[m.userId]) {
        sum += parseFloat(shareValues[m.userId] || '0') || 0;
      }
    });
    return sum;
  };

  const runningSum = getRunningSum();
  const remainingValue = totalAmountNum - runningSum;
  const remainingPercentage = 100 - runningSum;

  const validateStep1 = () => {
    if (!description.trim()) {
      toast.error('Please enter a description');
      return false;
    }
    if (!amount || isNaN(totalAmountNum) || totalAmountNum <= 0) {
      toast.error('Please enter a valid amount');
      return false;
    }
    if (!date) {
      toast.error('Please select a date');
      return false;
    }
    if (!paidById) {
      toast.error('Please select who paid');
      return false;
    }
    return true;
  };

  const validateStep3 = () => {
    if (selectedCount === 0) {
      toast.error('Please select at least one participant');
      return false;
    }

    if (splitMethod === SplitMethod.UNEQUAL) {
      if (Math.abs(runningSum - totalAmountNum) > 0.01) {
        toast.error(`Sum of splits ($${runningSum.toFixed(2)}) must equal total ($${totalAmountNum.toFixed(2)})`);
        return false;
      }
    } else if (splitMethod === SplitMethod.PERCENTAGE) {
      if (Math.abs(runningSum - 100) > 0.01) {
        toast.error(`Sum of percentages (${runningSum.toFixed(2)}%) must equal 100%`);
        return false;
      }
    } else if (splitMethod === SplitMethod.SHARE) {
      if (runningSum <= 0) {
        toast.error('Total shares must be greater than 0');
        return false;
      }
      let hasInvalidShare = false;
      activeMembers.forEach(m => {
        if (selectedParticipants[m.userId]) {
          const val = parseFloat(shareValues[m.userId] || '0');
          if (isNaN(val) || val < 0 || !Number.isInteger(val)) {
            hasInvalidShare = true;
          }
        }
      });
      if (hasInvalidShare) {
        toast.error('All shares must be non-negative integers');
        return false;
      }
    }
    return true;
  };

  const nextStep = () => {
    if (step === 1 && !validateStep1()) return;
    if (step === 3 && !validateStep3()) return;
    setStep(prev => prev + 1);
  };

  const prevStep = () => {
    setStep(prev => prev - 1);
  };

  const handleSubmit = async () => {
    if (!validateStep1() || !validateStep3() || !groupId) return;

    setIsSubmitting(true);
    try {
      const participantsPayload = activeMembers
        .filter(m => selectedParticipants[m.userId])
        .map(m => {
          let val: number | undefined = undefined;
          if (splitMethod === SplitMethod.UNEQUAL || splitMethod === SplitMethod.PERCENTAGE || splitMethod === SplitMethod.SHARE) {
            val = parseFloat(shareValues[m.userId] || '0') || 0;
          }
          return {
            userId: m.userId,
            shareValue: val
          };
        });

      await createExpense(groupId, {
        description: description.trim(),
        amount: totalAmountNum,
        date: new Date(date).toISOString(),
        paidById,
        splitMethod,
        participants: participantsPayload,
        immediateSettlement,
        paymentMethod: immediateSettlement ? paymentMethod : null
      });

      toast.success('Expense created successfully!');
      navigate(`/groups/${groupId}`);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to create expense');
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleParticipant = (userId: string) => {
    setSelectedParticipants(prev => {
      const next = { ...prev, [userId]: !prev[userId] };
      if (!next[userId]) {
        setShareValues(sv => {
          const updated = { ...sv };
          delete updated[userId];
          return updated;
        });
      }
      return next;
    });
  };

  const renderConfirmationSplits = () => {
    if (splitMethod === SplitMethod.EQUAL) {
      const splitAmount = totalAmountNum / selectedCount;
      return activeMembers
        .filter(m => selectedParticipants[m.userId])
        .map(m => (
          <div key={m.userId} className="flex justify-between py-2 border-b border-slate-800 text-sm">
            <span className="text-slate-300 font-medium">{m.user?.name}</span>
            <span className="text-slate-100 font-extrabold">${splitAmount.toFixed(2)}</span>
          </div>
        ));
    } else if (splitMethod === SplitMethod.UNEQUAL) {
      return activeMembers
        .filter(m => selectedParticipants[m.userId])
        .map(m => {
          const val = parseFloat(shareValues[m.userId] || '0') || 0;
          return (
            <div key={m.userId} className="flex justify-between py-2 border-b border-slate-800 text-sm">
              <span className="text-slate-300 font-medium">{m.user?.name}</span>
              <span className="text-slate-100 font-extrabold">${val.toFixed(2)}</span>
            </div>
          );
        });
    } else if (splitMethod === SplitMethod.PERCENTAGE) {
      return activeMembers
        .filter(m => selectedParticipants[m.userId])
        .map(m => {
          const pct = parseFloat(shareValues[m.userId] || '0') || 0;
          const shareAmt = (pct / 100) * totalAmountNum;
          return (
            <div key={m.userId} className="flex justify-between py-2 border-b border-slate-800 text-sm">
              <span className="text-slate-300 font-medium">{m.user?.name}</span>
              <span className="text-slate-100 font-extrabold">
                ${shareAmt.toFixed(2)} <span className="text-xs text-slate-500 font-bold">({pct}%)</span>
              </span>
            </div>
          );
        });
    } else if (splitMethod === SplitMethod.SHARE) {
      const totalShares = runningSum;
      return activeMembers
        .filter(m => selectedParticipants[m.userId])
        .map(m => {
          const shares = parseFloat(shareValues[m.userId] || '0') || 0;
          const shareAmt = (shares / totalShares) * totalAmountNum;
          return (
            <div key={m.userId} className="flex justify-between py-2 border-b border-slate-800 text-sm">
              <span className="text-slate-300 font-medium">{m.user?.name}</span>
              <span className="text-slate-100 font-extrabold">
                ${shareAmt.toFixed(2)} <span className="text-xs text-slate-500 font-bold">({shares} shares)</span>
              </span>
            </div>
          );
        });
    }
    return null;
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans pb-16 relative overflow-hidden">
      {/* Background blobs */}
      <div className="absolute top-[-25%] left-[-10%] w-[500px] h-[500px] bg-indigo-650/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-15%] right-[-10%] w-[500px] h-[500px] bg-indigo-600/5 rounded-full blur-[120px] pointer-events-none" />

      {/* Header (Glassmorphic) */}
      <header className="border-b border-slate-900 bg-slate-950/75 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to={`/groups/${groupId}`} className="p-2.5 hover:bg-slate-900 rounded-xl text-slate-400 hover:text-slate-100 transition-all border border-transparent hover:border-slate-800/80">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="font-extrabold text-lg text-slate-100 tracking-tight leading-tight">Add Expense</h1>
              <p className="text-slate-500 text-[10px] uppercase font-bold tracking-wider">Group: {group.name}</p>
            </div>
          </div>
          <div className="text-[10px] text-indigo-400 bg-indigo-950 border border-indigo-900/60 rounded-full px-3 py-1 font-bold uppercase tracking-wider">
            Step {step} of 5
          </div>
        </div>
      </header>

      {/* Premium Step Indicator Progress Bar */}
      <div className="max-w-xl mx-auto px-4 mt-8">
        <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden">
          <div 
            className="bg-gradient-to-r from-indigo-500 to-indigo-600 h-full transition-all duration-300 ease-out rounded-full"
            style={{ width: `${(step / 5) * 100}%` }}
          />
        </div>
      </div>

      <main className="max-w-lg mx-auto px-4 mt-8 relative z-10">
        {/* Step 1: Details */}
        {step === 1 && (
          <div className="bg-slate-900/40 border border-slate-900 rounded-3xl p-6 shadow-2xl backdrop-blur-md animate-in fade-in slide-in-from-bottom-4 duration-250">
            <h2 className="text-xl font-extrabold text-slate-50 mb-6 flex items-center gap-2 pb-2.5 border-b border-slate-800">
              <FileText className="w-5 h-5 text-indigo-400" />
              <span>Expense Details</span>
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-2">
                  Description / Title
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. Dinner party, Groceries"
                  className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-3 text-slate-105 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all text-sm font-semibold"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-2">
                  Total Amount (USD)
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 inset-y-0 flex items-center text-slate-400 text-sm font-black">$</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full bg-slate-800/50 border border-slate-700 rounded-xl pl-8 pr-4 py-3 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all text-sm font-extrabold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-2">
                  Date
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-3 text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all text-sm font-semibold"
                />
              </div>

              <div>
                <label className="block text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-2">
                  Paid By
                </label>
                <select
                  value={paidById}
                  onChange={(e) => setPaidById(e.target.value)}
                  className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-3 py-3 text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all text-sm font-semibold"
                >
                  {activeMembers.map(m => (
                    <option key={m.userId} value={m.userId} className="bg-slate-900">
                      {m.userId === currentUser?.id ? `You (${m.user?.name})` : m.user?.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mt-8 flex justify-end">
              <button
                onClick={nextStep}
                className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-5 py-3 rounded-xl shadow-lg shadow-indigo-600/10 hover:shadow-indigo-600/20 hover:-translate-y-0.5 active:translate-y-0 transition-all cursor-pointer text-xs"
              >
                <span>Choose Split Method</span>
                <ArrowRight className="w-4 h-4 stroke-[2.5]" />
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Split Method Selection */}
        {step === 2 && (
          <div className="bg-slate-900/40 border border-slate-900 rounded-3xl p-6 shadow-2xl backdrop-blur-md animate-in fade-in slide-in-from-bottom-4 duration-250">
            <h2 className="text-xl font-extrabold text-slate-50 mb-1">Choose Split Method</h2>
            <p className="text-slate-400 text-xs mb-6">Distribute total cost of <strong className="text-indigo-400">${totalAmountNum.toFixed(2)}</strong>:</p>

            <div className="grid grid-cols-1 gap-3">
              {[
                { id: SplitMethod.EQUAL, title: 'Split Equally', desc: 'Divide cost evenly.' },
                { id: SplitMethod.UNEQUAL, title: 'Split Unequally', desc: 'Specify exact dollar amounts.' },
                { id: SplitMethod.PERCENTAGE, title: 'Split by Percentage', desc: 'Define percentage shares. Sum must equal 100%.' },
                { id: SplitMethod.SHARE, title: 'Split by Share', desc: 'Input share integers.' }
              ].map(method => (
                <div
                  key={method.id}
                  onClick={() => setSplitMethod(method.id)}
                  className={`border rounded-2xl p-4 cursor-pointer transition-all hover:bg-slate-800/40 flex justify-between items-center ${splitMethod === method.id ? 'border-indigo-500 bg-indigo-600/5' : 'border-slate-800 bg-slate-900/60'}`}
                >
                  <div className="pr-4">
                    <h4 className="font-extrabold text-slate-100 text-sm">{method.title}</h4>
                    <p className="text-slate-400 text-[11px] mt-1 leading-relaxed">{method.desc}</p>
                  </div>
                  {splitMethod === method.id && (
                    <div className="w-5 h-5 rounded-full bg-indigo-600 flex items-center justify-center text-white shrink-0">
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="mt-8 flex justify-between gap-3">
              <button onClick={prevStep} className="px-4 py-2.5 bg-slate-800 hover:bg-slate-750 text-slate-300 font-bold rounded-xl text-xs transition-all cursor-pointer">Back</button>
              <button onClick={nextStep} className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-5 py-2.5 rounded-xl text-xs transition-all cursor-pointer">
                <span>Select Participants</span>
                <ArrowRight className="w-4 h-4 stroke-[2.5]" />
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Participants Selection & Share Inputs */}
        {step === 3 && (
          <div className="bg-slate-900/40 border border-slate-900 rounded-3xl p-6 shadow-2xl backdrop-blur-md animate-in fade-in slide-in-from-bottom-4 duration-250">
            <div className="flex justify-between items-center mb-2 pb-2.5 border-b border-slate-800">
              <h2 className="text-xl font-extrabold text-slate-50">Participants</h2>
              <span className="text-[10px] text-indigo-400 bg-indigo-950 border border-indigo-900/60 rounded-full px-2.5 py-0.5 font-bold">
                {selectedCount} selected
              </span>
            </div>

            {/* Validation Panel */}
            {(splitMethod === SplitMethod.UNEQUAL || splitMethod === SplitMethod.PERCENTAGE) && (
              <div className={`mb-6 p-4 rounded-xl border text-xs flex gap-3 ${
                splitMethod === SplitMethod.UNEQUAL
                  ? Math.abs(remainingValue) < 0.01 ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
                  : Math.abs(remainingPercentage) < 0.01 ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
              }`}>
                <Info className="w-4 h-4 shrink-0 self-center" />
                <div>
                  {splitMethod === SplitMethod.UNEQUAL ? (
                    <>
                      <p className="font-bold">Sum: ${runningSum.toFixed(2)} of ${totalAmountNum.toFixed(2)}</p>
                      {Math.abs(remainingValue) >= 0.01 && <p className="text-[10px] mt-0.5 opacity-80">Remaining: ${remainingValue.toFixed(2)}</p>}
                    </>
                  ) : (
                    <>
                      <p className="font-bold">Sum: {runningSum.toFixed(2)}% of 100%</p>
                      {Math.abs(remainingPercentage) >= 0.01 && <p className="text-[10px] mt-0.5 opacity-80">Remaining: {remainingPercentage.toFixed(2)}%</p>}
                    </>
                  )}
                </div>
              </div>
            )}

            {splitMethod === SplitMethod.SHARE && (
              <div className="mb-6 p-4 rounded-xl border bg-indigo-500/10 border-indigo-500/20 text-indigo-400 text-xs flex gap-3">
                <Users className="w-4 h-4 shrink-0 self-center" />
                <div>
                  <p className="font-bold">Total Shares: {runningSum}</p>
                  {runningSum > 0 && <p className="text-[10px] mt-0.5 opacity-80">Each share value: ${(totalAmountNum / runningSum).toFixed(2)}</p>}
                </div>
              </div>
            )}

            <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1">
              {activeMembers.map((m) => {
                const isSelected = !!selectedParticipants[m.userId];
                return (
                  <div
                    key={m.userId}
                    className={`border rounded-2xl p-3 flex items-center justify-between transition-all ${isSelected ? 'border-slate-700 bg-slate-800/35' : 'border-slate-800 opacity-60 bg-slate-900/10'}`}
                  >
                    <div onClick={() => toggleParticipant(m.userId)} className="flex items-center gap-3 cursor-pointer select-none flex-grow">
                      <div className={`w-5 h-5 rounded-lg flex items-center justify-center border ${isSelected ? 'bg-indigo-600 border-indigo-500 text-white' : 'border-slate-700 bg-slate-800'}`}>
                        {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                      </div>
                      <div>
                        <p className="font-bold text-slate-200 text-sm">{m.user?.name}</p>
                        <p className="text-slate-500 text-[10px] mt-0.5">{m.user?.email}</p>
                      </div>
                    </div>

                    {isSelected && splitMethod !== SplitMethod.EQUAL && (
                      <div className="w-32">
                        <div className="relative flex items-center">
                          {splitMethod === SplitMethod.UNEQUAL && <span className="absolute left-3 text-slate-400 text-xs font-bold">$</span>}
                          <input
                            type="number"
                            min="0"
                            step={splitMethod === SplitMethod.SHARE ? '1' : '0.01'}
                            value={shareValues[m.userId] || ''}
                            onChange={(e) => {
                              const val = e.target.value;
                              setShareValues(prev => ({ ...prev, [m.userId]: val }));
                            }}
                            placeholder={splitMethod === SplitMethod.SHARE ? '1' : '0.00'}
                            className="w-full bg-slate-900 border border-slate-800 rounded-xl py-2 text-right text-slate-100 pr-3 pl-6 text-sm font-extrabold focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-transparent transition-all"
                          />
                          {splitMethod === SplitMethod.PERCENTAGE && <span className="absolute right-3 text-slate-400 text-xs font-bold">%</span>}
                        </div>
                      </div>
                    )}

                    {isSelected && splitMethod === SplitMethod.EQUAL && (
                      <div className="text-right text-slate-400 text-xs font-extrabold pr-2">
                        ${(totalAmountNum / selectedCount).toFixed(2)}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="mt-8 flex justify-between gap-3">
              <button onClick={prevStep} className="px-4 py-2.5 bg-slate-800 text-slate-300 font-bold rounded-xl text-xs cursor-pointer">Back</button>
              <button onClick={nextStep} className="flex items-center gap-1.5 bg-indigo-600 text-white font-bold px-5 py-2.5 rounded-xl text-xs cursor-pointer">
                <span>Payment Option</span>
                <ArrowRight className="w-4 h-4 stroke-[2.5]" />
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Payment Option */}
        {step === 4 && (
          <div className="bg-slate-900/40 border border-slate-900 rounded-3xl p-6 shadow-2xl backdrop-blur-md animate-in fade-in slide-in-from-bottom-4 duration-250">
            <h2 className="text-xl font-extrabold text-slate-50 mb-1">Payment Preference</h2>
            <p className="text-slate-400 text-xs mb-6 font-sans">Choose how this expense's splits should be settled:</p>

            <div className="space-y-4">
              {/* Pay Later Option */}
              <div
                onClick={() => setImmediateSettlement(false)}
                className={`border rounded-2xl p-4 cursor-pointer transition-all hover:bg-slate-800/45 flex justify-between items-center ${!immediateSettlement ? 'border-indigo-500 bg-indigo-600/5' : 'border-slate-800 bg-slate-900/60'}`}
              >
                <div className="pr-4">
                  <h4 className="font-extrabold text-slate-100 text-sm">Pay Later (Standard Split)</h4>
                  <p className="text-slate-400 text-[11px] mt-1 leading-relaxed font-sans">
                    Log the split as a standard pending group debt to be settled dynamically over time.
                  </p>
                </div>
                {!immediateSettlement && (
                  <div className="w-5 h-5 rounded-full bg-indigo-600 flex items-center justify-center text-white shrink-0">
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                  </div>
                )}
              </div>

              {/* Pay Now Option */}
              <div
                onClick={() => setImmediateSettlement(true)}
                className={`border rounded-2xl p-4 cursor-pointer transition-all hover:bg-slate-800/45 flex justify-between items-center ${immediateSettlement ? 'border-indigo-500 bg-indigo-600/5' : 'border-slate-800 bg-slate-900/60'}`}
              >
                <div className="pr-4">
                  <h4 className="font-extrabold text-slate-100 text-sm">Pay Now (Immediate Settlement)</h4>
                  <p className="text-slate-400 text-[11px] mt-1 leading-relaxed font-sans">
                    Record the expense and assume everyone has already paid you back their share immediately.
                  </p>
                </div>
                {immediateSettlement && (
                  <div className="w-5 h-5 rounded-full bg-indigo-600 flex items-center justify-center text-white shrink-0">
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                  </div>
                )}
              </div>

              {/* Payment Method Selector (Only visible if Pay Now) */}
              {immediateSettlement && (
                <div className="mt-4 pt-4 border-t border-slate-800 animate-in fade-in duration-200">
                  <label className="block text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-2">
                    Select Payment Method
                  </label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-3 py-3 text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all text-sm font-semibold"
                  >
                    <option value="CASH">Cash 💵</option>
                    <option value="BANK_TRANSFER">Bank Transfer 🏦</option>
                    <option value="VENMO">Venmo 📱</option>
                    <option value="PAYPAL">PayPal 💳</option>
                    <option value="UPI">UPI ⚡</option>
                    <option value="CREDIT_CARD">Credit Card 💳</option>
                  </select>
                </div>
              )}
            </div>

            <div className="mt-8 flex justify-between gap-3">
              <button onClick={prevStep} className="px-4 py-2.5 bg-slate-800 hover:bg-slate-750 text-slate-300 font-bold rounded-xl text-xs transition-all cursor-pointer">Back</button>
              <button onClick={nextStep} className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-5 py-2.5 rounded-xl text-xs transition-all cursor-pointer">
                <span>Review & Confirm</span>
                <ArrowRight className="w-4 h-4 stroke-[2.5]" />
              </button>
            </div>
          </div>
        )}

        {/* Step 5: Confirm */}
        {step === 5 && (
          <div className="bg-slate-900/40 border border-slate-900 rounded-3xl p-6 shadow-2xl backdrop-blur-md animate-in fade-in slide-in-from-bottom-4 duration-250">
            <h2 className="text-xl font-extrabold text-slate-50 mb-1 flex items-center gap-2 pb-2.5 border-b border-slate-800">
              <CheckSquare className="w-5 h-5 text-indigo-400" />
              <span>Confirm Expense</span>
            </h2>
            
            <div className="space-y-4 bg-slate-950/40 border border-slate-900 rounded-2xl p-5 mb-6 text-xs font-sans">
              <div className="flex justify-between border-b border-slate-800 pb-2.5">
                <span className="text-slate-500 font-bold uppercase tracking-wider text-[9px]">Description</span>
                <span className="text-slate-100 font-extrabold text-sm">{description}</span>
              </div>
              <div className="flex justify-between border-b border-slate-800 pb-2.5">
                <span className="text-slate-500 font-bold uppercase tracking-wider text-[9px]">Total Cost</span>
                <span className="text-indigo-400 font-black text-base">${totalAmountNum.toFixed(2)}</span>
              </div>
              <div className="flex justify-between border-b border-slate-800 pb-2.5">
                <span className="text-slate-500 font-bold uppercase tracking-wider text-[9px]">Payer</span>
                <span className="text-slate-200 font-extrabold">
                  {group.members?.find(m => m.userId === paidById)?.user?.name}
                </span>
              </div>
              <div className="flex justify-between border-b border-slate-800 pb-2.5">
                <span className="text-slate-500 font-bold uppercase tracking-wider text-[9px]">Date</span>
                <span className="text-slate-200 font-bold">{new Date(date).toLocaleDateString()}</span>
              </div>
              <div className="flex justify-between border-b border-slate-800 pb-2.5">
                <span className="text-slate-500 font-bold uppercase tracking-wider text-[9px]">Payment Type</span>
                <span className={`font-black ${immediateSettlement ? 'text-emerald-400 animate-pulse' : 'text-amber-400'}`}>
                  {immediateSettlement ? `Pay Now (${paymentMethod.replace('_', ' ')})` : 'Pay Later'}
                </span>
              </div>
              <div>
                <span className="block text-slate-400 font-bold uppercase tracking-wider text-[9px] mb-3">Splits Overview</span>
                <div className="space-y-1 bg-slate-900/50 p-3 rounded-xl border border-slate-800">
                  {renderConfirmationSplits()}
                </div>
              </div>
            </div>

            <div className="mt-8 flex justify-between gap-3">
              <button onClick={prevStep} className="px-4 py-2.5 bg-slate-800 text-slate-300 font-bold rounded-xl text-xs cursor-pointer">Back</button>
              <button onClick={handleSubmit} disabled={isSubmitting} className="flex items-center justify-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-black px-6 py-3 rounded-xl shadow-lg shadow-indigo-600/10 hover:shadow-indigo-600/20 cursor-pointer text-xs flex-grow disabled:opacity-50">
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                    <span>Confirm & Post</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default CreateExpensePage;
