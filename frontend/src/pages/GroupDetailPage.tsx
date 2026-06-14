import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  getGroupDetail,
  addMember,
  removeMember,
  deleteGroup,
  getGroupBalances
} from '../api/group.api';
import { listExpenses, deleteExpense, getExpenseDetail } from '../api/expense.api';
import { listSettlements, deleteSettlement } from '../api/settlement.api';
import { useAuthStore } from '../stores/authStore';
import { Group, GroupMember, Expense, Settlement, GroupBalancesResponse, GroupRole } from '../types';
import BalanceSummary from '../components/balances/BalanceSummary';
import SettleUpModal from '../components/balances/SettleUpModal';
import ExpenseChat from '../components/ExpenseChat';
import {
  ArrowLeft,
  Plus,
  Users,
  Trash2,
  Calendar,
  DollarSign,
  UserPlus,
  TrendingDown,
  TrendingUp,
  Clock,
  Loader2,
  X,
  UserMinus,
  MessageSquare,
  Sparkles,
  ArrowRight,
  Search,
  Receipt,
  History,
  Scale
} from 'lucide-react';
import toast from 'react-hot-toast';

export const GroupDetailPage = () => {
  const { id: groupId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const currentUser = useAuthStore((state) => state.user);

  const [group, setGroup] = useState<Group | null>(null);
  const [balances, setBalances] = useState<GroupBalancesResponse | null>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Workspace active tab
  const [activeTab, setActiveTab] = useState<'expenses' | 'settlements' | 'matrix'>('expenses');

  // Client side search states
  const [expenseSearchQuery, setExpenseSearchQuery] = useState('');
  const [memberSearchQuery, setMemberSearchQuery] = useState('');

  // Pagination
  const [expensePage, setExpensePage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Modals & Drawers States
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [isInviting, setIsInviting] = useState(false);

  const [isSettleOpen, setIsSettleOpen] = useState(false);
  const [settlePayeeId, setSettlePayeeId] = useState('');
  const [settleAmount, setSettleAmount] = useState<number | undefined>(undefined);

  // Selected Expense Detail Drawer
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isLoadingExpense, setIsLoadingExpense] = useState(false);

  const fetchGroupData = async () => {
    if (!groupId) return;
    try {
      const [groupRes, balancesRes, expensesRes, settlementsRes] = await Promise.all([
        getGroupDetail(groupId),
        getGroupBalances(groupId),
        listExpenses(groupId, expensePage, 10),
        listSettlements(groupId)
      ]);

      setGroup(groupRes.data);
      setBalances(balancesRes.data);
      setExpenses(expensesRes.data);
      setTotalPages(expensesRes.pagination.totalPages);
      setSettlements(settlementsRes.data);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to fetch group details');
      navigate('/');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    setIsLoading(true);
    fetchGroupData();
  }, [groupId, expensePage]);

  if (isLoading || !group || !balances) {
    return (
      <div className="min-h-screen bg-[#0d0c0b] flex flex-col items-center justify-center text-[#f7f4f0]">
        <Loader2 className="w-10 h-10 animate-spin text-indigo-500 mb-4" />
        <p className="text-slate-500 text-xs uppercase font-bold tracking-wider">Loading group dashboard...</p>
      </div>
    );
  }

  const myMembership = group.members?.find((m) => m.userId === currentUser?.id);
  const isAdmin = myMembership?.role === GroupRole.ADMIN;

  const handleInvite = async () => {
    if (!inviteEmail.trim()) {
      toast.error('Email cannot be empty');
      return;
    }
    setIsInviting(true);
    try {
      await addMember(group.id, inviteEmail.trim());
      toast.success('Member added successfully!');
      setIsInviteOpen(false);
      setInviteEmail('');
      fetchGroupData();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to invite user');
    } finally {
      setIsInviting(false);
    }
  };

  const handleRemoveMember = async (userId: string, userName: string) => {
    const isSelf = userId === currentUser?.id;
    const confirmMessage = isSelf
      ? 'Are you sure you want to leave this group?'
      : `Are you sure you want to remove ${userName} from the group?`;

    if (!window.confirm(confirmMessage)) return;

    try {
      await removeMember(group.id, userId);
      toast.success(isSelf ? 'You left the group' : `${userName} was removed`);
      if (isSelf) {
        navigate('/');
      } else {
        fetchGroupData();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to remove member');
    }
  };

  const handleDeleteGroup = async () => {
    if (!window.confirm('WARNING: Permanently delete group, expenses, and settlements? This action cannot be undone.')) {
      return;
    }

    try {
      await deleteGroup(group.id);
      toast.success('Group deleted successfully');
      navigate('/');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to delete group');
    }
  };

  const handleDeleteExpense = async (expenseId: string) => {
    if (!window.confirm('Are you sure you want to delete this expense?')) return;

    try {
      await deleteExpense(expenseId);
      toast.success('Expense deleted');
      setIsDrawerOpen(false);
      setSelectedExpense(null);
      fetchGroupData();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to delete expense');
    }
  };

  const handleDeleteSettlement = async (settlementId: string) => {
    if (!window.confirm('Are you sure you want to delete this settlement record?')) return;

    try {
      await deleteSettlement(settlementId);
      toast.success('Settlement record deleted');
      fetchGroupData();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to delete settlement record');
    }
  };

  const openSettleModal = (payeeId = '', amount?: number) => {
    setSettlePayeeId(payeeId);
    setSettleAmount(amount);
    setIsSettleOpen(true);
  };

  const openExpenseDetail = async (id: string) => {
    setIsLoadingExpense(true);
    setIsDrawerOpen(true);
    try {
      const res = await getExpenseDetail(id);
      setSelectedExpense(res.data);
    } catch (err: any) {
      toast.error('Failed to load expense details');
      setIsDrawerOpen(false);
    } finally {
      setIsLoadingExpense(false);
    }
  };

  const myNetBalance = balances.individualSummary[currentUser?.id || ''] || 0;

  // Filter members client-side
  const filteredMembers = (group.members || []).filter((m) =>
    m.user?.name.toLowerCase().includes(memberSearchQuery.toLowerCase()) ||
    m.user?.email.toLowerCase().includes(memberSearchQuery.toLowerCase())
  );

  // Filter expenses client-side
  const filteredExpenses = expenses.filter((e) =>
    e.description.toLowerCase().includes(expenseSearchQuery.toLowerCase()) ||
    e.paidBy?.name.toLowerCase().includes(expenseSearchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#0d0c0b] text-[#f7f4f0] font-sans pb-20 relative overflow-hidden">
      {/* Background ambient lighting */}
      <div className="absolute top-[-25%] right-[-15%] w-[600px] h-[600px] bg-indigo-900/5 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-[-15%] left-[-15%] w-[600px] h-[600px] bg-indigo-955/5 rounded-full blur-[140px] pointer-events-none" />

      {/* Header */}
      <header className="border-b border-indigo-900/10 bg-[#0d0c0b]/50 backdrop-blur-xl sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/" className="p-2.5 bg-slate-900/35 border border-indigo-900/10 text-slate-400 hover:text-[#f7f4f0] rounded-xl transition-all cursor-pointer">
              <ArrowLeft className="w-4.5 h-4.5" />
            </Link>
            <div>
              <h1 className="font-serif font-black text-xl text-[#f7f4f0] tracking-tight leading-tight">{group.name}</h1>
              <p className="text-slate-500 text-[10px] uppercase font-bold tracking-widest flex items-center gap-1.5 mt-1 leading-none">
                <Users className="w-3.5 h-3.5 text-indigo-500/70" />
                <span>{group.members?.filter(m => m.isActive).length} active members</span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => openSettleModal()}
              className="bg-[#141312] hover:bg-slate-900 border border-indigo-900/10 text-slate-300 font-bold px-4.5 py-3 rounded-xl text-xs transition-all cursor-pointer uppercase tracking-wider"
            >
              Settle Up
            </button>
            <Link
              to={`/groups/${group.id}/expenses/new`}
              className="bg-indigo-600 hover:bg-indigo-500 text-[#0d0c0b] font-black px-4.5 py-3 rounded-xl text-xs shadow-md transition-all uppercase tracking-wider"
            >
              Add Expense
            </Link>
          </div>
        </div>
      </header>

      {/* Main Grid: Restructured */}
      <main className="max-w-6xl mx-auto px-6 mt-10 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* LEFT SIDEBAR: Ledger Control & Standing (4 cols) */}
          <div className="lg:col-span-4 space-y-6">
            
            {/* Custom Standing Card */}
            <div className={`p-6 border rounded-3xl flex flex-col justify-between shadow-xl backdrop-blur-md relative overflow-hidden ${
              myNetBalance > 0 
                ? 'bg-emerald-500/5 border-emerald-500/15 text-emerald-400 shadow-emerald-950/5' 
                : myNetBalance < 0 
                  ? 'bg-rose-500/5 border-rose-500/15 text-rose-400 shadow-rose-950/5' 
                  : 'bg-[#141312] border-indigo-900/10 text-[#f7f4f0]'
            }`}>
              <div className="flex items-center justify-between mb-4">
                <p className="text-[10px] text-slate-500 uppercase tracking-widest font-extrabold">Ledger Standing</p>
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center border ${
                  myNetBalance > 0 
                    ? 'bg-emerald-950/60 border-emerald-800/40 text-emerald-455' 
                    : myNetBalance < 0 
                      ? 'bg-rose-950/60 border-rose-800/40 text-rose-455' 
                      : 'bg-slate-850 border-slate-800 text-slate-400'
                }`}>
                  {myNetBalance > 0 ? <TrendingUp className="w-4 h-4" /> : myNetBalance < 0 ? <TrendingDown className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
                </div>
              </div>

              <div>
                <p className="text-3xl font-serif font-black tracking-tight leading-tight">
                  {myNetBalance > 0 
                    ? `Owed $${myNetBalance.toFixed(2)}` 
                    : myNetBalance < 0 
                      ? `You owe $${Math.abs(myNetBalance).toFixed(2)}` 
                      : 'Settled Up'}
                </p>
                <p className="text-slate-500 text-[10px] mt-1">Individual summary standing in this group.</p>
              </div>

              {myNetBalance < 0 && (
                <button
                  onClick={() => {
                    const recommendedDebt = balances.simplified.find(d => d.fromId === currentUser?.id);
                    openSettleModal(recommendedDebt?.toId || '', recommendedDebt?.amount);
                  }}
                  className="bg-indigo-650 hover:bg-indigo-600 text-[#0d0c0b] font-black px-4 py-2.5 rounded-xl text-[10px] transition-all cursor-pointer mt-5 uppercase tracking-wider shadow-md w-full"
                >
                  Settle Recommended Debt
                </button>
              )}
            </div>

            {/* Members Card with search */}
            <div className="bg-[#141312] border border-indigo-900/15 rounded-3xl p-6 shadow-xl">
              <div className="flex justify-between items-center mb-4 pb-3 border-b border-indigo-900/10">
                <h3 className="font-extrabold text-[#f7f4f0] text-xs uppercase tracking-widest flex items-center gap-2">
                  <Users className="w-4 h-4 text-indigo-400" />
                  <span>Ledger Members</span>
                </h3>
                <button
                  onClick={() => setIsInviteOpen(true)}
                  className="p-2 bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-400 border border-indigo-550/20 rounded-xl transition-all cursor-pointer"
                  title="Add Member"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Members search filter */}
              <div className="relative mb-4">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  placeholder="Find member..."
                  value={memberSearchQuery}
                  onChange={(e) => setMemberSearchQuery(e.target.value)}
                  className="w-full bg-[#0d0c0b]/80 border border-indigo-900/10 rounded-xl pl-8.5 pr-3 py-2 text-[10px] text-[#f7f4f0] placeholder-slate-600 focus:outline-none focus:border-indigo-650 transition-all font-semibold"
                />
              </div>

              <div className="space-y-4 max-h-[250px] overflow-y-auto pr-1">
                {filteredMembers
                  .filter((m) => m.isActive)
                  .map((m) => {
                    const userBalance = balances.individualSummary[m.userId] || 0;
                    const isUserSelf = m.userId === currentUser?.id;
                    return (
                      <div key={m.id} className="flex justify-between items-center text-xs group-member-row">
                        <div className="flex items-center gap-3.5 min-w-0">
                          <div className="w-8 h-8 rounded-lg bg-[#0d0c0b] border border-indigo-900/10 text-slate-350 font-black flex items-center justify-center text-xs shrink-0 shadow-inner">
                            {m.user?.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <div className="font-bold text-slate-200 flex items-center gap-1.5 min-w-0">
                              <span className="truncate max-w-[100px]">{m.user?.name}</span>
                              {isUserSelf && <span className="text-[8px] text-indigo-455 bg-indigo-950/60 border border-indigo-900/20 px-1 rounded font-bold uppercase tracking-wider">Self</span>}
                            </div>
                            <p className="text-[9px] text-slate-500 truncate max-w-[120px] mt-0.5">{m.user?.email}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <p className={`font-black ${userBalance > 0 ? 'text-emerald-400' : userBalance < 0 ? 'text-rose-400' : 'text-slate-600'}`}>
                              {userBalance > 0 ? `+$${userBalance.toFixed(2)}` : userBalance < 0 ? `-$${Math.abs(userBalance).toFixed(2)}` : '$0.00'}
                            </p>
                          </div>
                          {(isAdmin || isUserSelf) && (
                            <button
                              onClick={() => handleRemoveMember(m.userId, m.user?.name || '')}
                              className="p-1 hover:bg-rose-500/10 text-slate-600 hover:text-rose-400 rounded-lg transition-all cursor-pointer"
                              title={isUserSelf ? 'Leave Group' : 'Remove Member'}
                            >
                              <UserMinus className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>

            {/* Admin operations */}
            {isAdmin && (
              <div className="bg-[#141312] border border-indigo-900/15 rounded-3xl p-6 shadow-xl">
                <h3 className="font-bold text-slate-200 text-xs uppercase tracking-widest mb-2.5">Administrative Controls</h3>
                <p className="text-[10px] text-slate-500 mb-4 leading-relaxed">Delete this ledger permanently. This will wipe all expense entries, settlements, and simplifications.</p>
                <button
                  onClick={handleDeleteGroup}
                  className="w-full flex items-center justify-center gap-2 bg-rose-500/5 hover:bg-rose-600 text-rose-455 hover:text-[#0d0c0b] border border-rose-550/15 hover:border-transparent font-black py-3 px-4 rounded-xl text-xs transition-all cursor-pointer uppercase tracking-wider shadow-sm"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete Ledger Group</span>
                </button>
              </div>
            )}
          </div>

          {/* RIGHT SIDEBAR: Workspace (8 cols) */}
          <div className="lg:col-span-8 space-y-6">
            
            {/* Tabbed workspace headers */}
            <div className="flex border-b border-indigo-900/10 p-1 gap-2 bg-[#141312]/50 rounded-2xl w-full max-w-md">
              <button
                onClick={() => setActiveTab('expenses')}
                className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'expenses' 
                    ? 'bg-indigo-600 text-[#0d0c0b]' 
                    : 'text-slate-400 hover:text-[#f7f4f0] hover:bg-[#141312]'
                }`}
              >
                <Receipt className="w-4 h-4" />
                <span>Expenses Log</span>
              </button>
              <button
                onClick={() => setActiveTab('settlements')}
                className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'settlements' 
                    ? 'bg-indigo-600 text-[#0d0c0b]' 
                    : 'text-slate-400 hover:text-[#f7f4f0] hover:bg-[#141312]'
                }`}
              >
                <History className="w-4 h-4" />
                <span>Settlements</span>
              </button>
              <button
                onClick={() => setActiveTab('matrix')}
                className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'matrix' 
                    ? 'bg-indigo-600 text-[#0d0c0b]' 
                    : 'text-slate-400 hover:text-[#f7f4f0] hover:bg-[#141312]'
                }`}
              >
                <Scale className="w-4 h-4" />
                <span>Debt Matrix</span>
              </button>
            </div>

            {/* Tab content area */}
            <div className="bg-[#141312]/40 border border-indigo-900/15 rounded-3xl p-6 shadow-2xl backdrop-blur-md min-h-[400px]">
              
              {/* TAB 1: EXPENSES LOG */}
              {activeTab === 'expenses' && (
                <div className="space-y-6 animate-in fade-in duration-200">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-indigo-900/10">
                    <div>
                      <h3 className="font-extrabold text-sm uppercase tracking-widest text-[#f7f4f0]">Ledger Sheets</h3>
                      <p className="text-[10px] text-slate-500 mt-1 uppercase font-bold tracking-wider">Chronological list of all expenses</p>
                    </div>

                    <div className="relative w-full sm:w-60">
                      <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                      <input
                        type="text"
                        placeholder="Search bills..."
                        value={expenseSearchQuery}
                        onChange={(e) => setExpenseSearchQuery(e.target.value)}
                        className="w-full bg-[#0d0c0b] border border-indigo-900/10 rounded-xl pl-8.5 pr-3 py-2 text-xs text-[#f7f4f0] placeholder-slate-600 focus:outline-none focus:border-indigo-650 transition-all font-semibold"
                      />
                    </div>
                  </div>

                  {filteredExpenses.length === 0 ? (
                    <div className="text-center py-20 bg-[#0d0c0b]/40 rounded-2xl border border-indigo-900/5 shadow-inner">
                      <div className="w-14 h-14 bg-indigo-600/10 border border-indigo-500/20 text-indigo-400 rounded-2xl flex items-center justify-center mx-auto mb-4 animate-pulse">
                        <DollarSign className="w-7 h-7" />
                      </div>
                      <h4 className="font-bold text-slate-200">No matching entries</h4>
                      <p className="text-xs text-slate-500 mt-1.5 max-w-xs mx-auto mb-6">Create new entries to populate the ledger list sheet.</p>
                      <Link
                        to={`/groups/${group.id}/expenses/new`}
                        className="inline-flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-[#0d0c0b] font-black px-5 py-3.5 rounded-xl text-xs transition-all shadow-md uppercase tracking-wider"
                      >
                        <Plus className="w-4 h-4 stroke-[3]" />
                        <span>Log First Expense</span>
                      </Link>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {filteredExpenses.map((expense) => {
                        const isPayer = expense.paidById === currentUser?.id;
                        const myPart = expense.participants?.find((p) => p.userId === currentUser?.id);
                        const shareVal = myPart ? myPart.amountOwed : 0;

                        return (
                          <div
                            key={expense.id}
                            onClick={() => openExpenseDetail(expense.id)}
                            className="bg-[#0d0c0b]/40 hover:bg-[#0d0c0b]/85 border border-[#141312] hover:border-indigo-900/20 rounded-2xl p-4 transition-all duration-200 cursor-pointer flex justify-between items-center group shadow-sm"
                          >
                            <div className="flex items-center gap-4">
                              <div className="text-center bg-[#141312] border border-indigo-900/10 px-3 py-2 rounded-xl min-w-[52px]">
                                <p className="text-[9px] text-slate-500 font-extrabold uppercase tracking-wider">
                                  {new Date(expense.date).toLocaleDateString(undefined, { month: 'short' })}
                                </p>
                                <p className="text-base font-black text-slate-200 leading-tight">
                                  {new Date(expense.date).getDate()}
                                </p>
                              </div>
                              <div>
                                <h4 className="font-extrabold text-[#f7f4f0] text-sm group-hover:text-indigo-400 transition-colors">
                                  {expense.description}
                                </h4>
                                <p className="text-slate-500 text-[10px] mt-1 font-semibold">
                                  Paid by <span className="font-bold text-slate-400">{expense.paidBy?.name}</span>
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-4">
                              <div className="text-right hidden sm:block">
                                <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wide">Total cost</p>
                                <p className="text-sm font-black text-slate-200 mt-0.5">${Number(expense.amount).toFixed(2)}</p>
                              </div>
                              <div className="text-right border-l border-indigo-900/10 pl-4 min-w-[90px]">
                                {isPayer ? (
                                  <>
                                    <p className="text-[8px] font-bold text-emerald-400 uppercase tracking-wider">You lent</p>
                                    <p className="text-sm font-black text-emerald-400 mt-0.5">
                                      ${(Number(expense.amount) - Number(shareVal)).toFixed(2)}
                                    </p>
                                  </>
                                ) : myPart ? (
                                  <>
                                    <p className="text-[8px] font-bold text-rose-400 uppercase tracking-wider">You owe</p>
                                    <p className="text-sm font-black text-rose-400 mt-0.5">${Number(shareVal).toFixed(2)}</p>
                                  </>
                                ) : (
                                  <>
                                    <p className="text-[8px] font-bold text-slate-500 uppercase tracking-wider">Excluded</p>
                                    <p className="text-sm font-bold text-slate-500 mt-0.5">$0.00</p>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}

                      {/* Pagination Controls */}
                      {totalPages > 1 && (
                        <div className="flex justify-between items-center mt-6 pt-4 border-t border-indigo-900/10 text-xs">
                          <button
                            onClick={() => setExpensePage((p) => Math.max(1, p - 1))}
                            disabled={expensePage === 1}
                            className="px-4 py-2.5 bg-slate-900/40 border border-indigo-900/10 hover:bg-[#141312] disabled:opacity-30 rounded-xl text-slate-300 font-bold transition-all cursor-pointer uppercase tracking-wider text-[10px]"
                          >
                            Previous
                          </button>
                          <span className="text-slate-500 font-bold tracking-widest uppercase text-[9px]">Page {expensePage} of {totalPages}</span>
                          <button
                            onClick={() => setExpensePage((p) => Math.min(totalPages, p + 1))}
                            disabled={expensePage === totalPages}
                            className="px-4 py-2.5 bg-slate-900/40 border border-indigo-900/10 hover:bg-[#141312] disabled:opacity-30 rounded-xl text-slate-300 font-bold transition-all cursor-pointer uppercase tracking-wider text-[10px]"
                          >
                            Next
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: SETTLEMENTS */}
              {activeTab === 'settlements' && (
                <div className="space-y-6 animate-in fade-in duration-200">
                  <div className="pb-3 border-b border-indigo-900/10">
                    <h3 className="font-extrabold text-sm uppercase tracking-widest text-[#f7f4f0]">Payment Settlements</h3>
                    <p className="text-[10px] text-slate-500 mt-1 uppercase font-bold tracking-wider">Records of debts cleared between members</p>
                  </div>

                  {settlements.length === 0 ? (
                    <div className="text-center py-16 bg-[#0d0c0b]/40 border border-indigo-900/5 rounded-2xl">
                      <History className="w-10 h-10 text-indigo-950 mx-auto mb-3" />
                      <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">No settlements found</p>
                      <p className="text-slate-550 text-[10px] mt-1.5">Record settle up payouts to display them here.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {settlements.map((s) => {
                        const isSettlementPayer = s.payerId === currentUser?.id;
                        const canDeleteSettlement = isSettlementPayer || isAdmin;

                        return (
                          <div key={s.id} className="bg-[#0d0c0b]/40 border border-[#141312] rounded-2xl p-4 flex justify-between items-center shadow-sm">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-[#141312] border border-indigo-900/10 flex items-center justify-center text-indigo-400 font-black text-xs shrink-0 shadow-inner">
                                $
                              </div>
                              <div>
                                <p className="text-xs text-slate-200">
                                  <span className="font-bold text-[#f7f4f0]">{s.payer?.name}</span> settled{' '}
                                  <span className="font-bold text-[#f7f4f0]">{s.payee?.name}</span>
                                </p>
                                {s.note && <p className="text-[10px] text-indigo-400/80 mt-1 italic">"{s.note}"</p>}
                                <p className="text-[9px] text-slate-550 mt-1">{new Date(s.createdAt).toLocaleString()}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <div className="flex flex-col items-end gap-1">
                                <span className="text-xs font-black text-[#f7f4f0] bg-[#141312] border border-indigo-900/10 px-2.5 py-1 rounded-lg">
                                  ${Number(s.amount).toFixed(2)}
                                </span>
                                <span className="text-[8px] font-extrabold text-indigo-400 bg-indigo-950/40 border border-indigo-900/20 px-1.5 py-0.5 rounded uppercase tracking-widest text-center min-w-[50px]">
                                  {s.paymentMethod?.replace('_', ' ')}
                                </span>
                              </div>
                              {canDeleteSettlement && (
                                <button
                                  onClick={() => handleDeleteSettlement(s.id)}
                                  className="p-1.5 hover:bg-rose-500/10 text-slate-600 hover:text-rose-400 rounded-lg transition-all cursor-pointer"
                                  title="Delete Settlement Record"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: DEBT MATRIX */}
              {activeTab === 'matrix' && (
                <div className="animate-in fade-in duration-200">
                  <BalanceSummary
                    simplifiedDebts={balances.simplified}
                    rawDebts={balances.raw}
                    currentUserId={currentUser?.id}
                    onSettleUp={(payeeId, amount) => openSettleModal(payeeId, amount)}
                  />
                </div>
              )}
              
            </div>
          </div>
        </div>
      </main>

      {/* Settle Up Modal */}
      <SettleUpModal
        groupId={group.id}
        members={group.members || []}
        currentUserId={currentUser?.id}
        prefilledPayeeId={settlePayeeId}
        prefilledAmount={settleAmount}
        isOpen={isSettleOpen}
        onClose={() => setIsSettleOpen(false)}
        onSuccess={fetchGroupData}
      />

      {/* Invite Member Modal */}
      {isInviteOpen && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
          <div onClick={() => setIsInviteOpen(false)} className="absolute inset-0 bg-[#0d0c0b]/85 backdrop-blur-sm" />
          <div className="relative w-full max-w-md bg-[#141312] border border-indigo-900/15 rounded-3xl p-8 shadow-2xl z-10 animate-in fade-in zoom-in-95 duration-150 glass-surface">
            <h3 className="text-2xl font-serif font-black text-[#f7f4f0] mb-2">Invite Member</h3>
            <p className="text-slate-400 text-xs mb-6 leading-relaxed">
              Add a member by email immediately. The user must have already registered an account with Spreetail.
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-slate-500 text-[9px] font-bold uppercase tracking-widest mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="e.g. email@example.com"
                  className="w-full bg-[#0d0c0b]/60 border border-indigo-900/10 rounded-xl px-4 py-3.5 text-[#f7f4f0] placeholder-slate-600 focus:outline-none focus:border-indigo-650 transition-all text-sm font-semibold"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleInvite();
                  }}
                  autoFocus
                />
              </div>
            </div>

            <div className="mt-8 flex justify-end gap-3 text-xs">
              <button
                onClick={() => {
                  setIsInviteOpen(false);
                  setInviteEmail('');
                }}
                className="px-5 py-3 bg-[#0d0c0b] hover:bg-slate-900 text-slate-400 hover:text-slate-200 font-bold rounded-xl transition-all cursor-pointer uppercase tracking-wider"
              >
                Cancel
              </button>
              <button
                onClick={handleInvite}
                disabled={isInviting}
                className="flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-[#0d0c0b] font-black rounded-xl shadow-lg transition-all cursor-pointer disabled:opacity-50 uppercase tracking-wider"
              >
                {isInviting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Adding...</span>
                  </>
                ) : (
                  <span>Add Member</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Selected Expense Detail Drawer (Overlay Glassmorphism & Receipt Styling) */}
      {isDrawerOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div onClick={() => setIsDrawerOpen(false)} className="absolute inset-0 bg-[#0d0c0b]/85 backdrop-blur-sm transition-opacity" />

          <div className="relative w-full max-w-md bg-[#141312] border-l border-indigo-900/15 h-full p-8 shadow-2xl flex flex-col z-10 animate-in slide-in-from-right duration-200 glass-surface">
            <div className="flex justify-between items-center pb-4 border-b border-indigo-900/10 mb-6">
              <h3 className="font-serif font-black text-xl text-[#f7f4f0] tracking-tight flex items-center gap-2">
                <Receipt className="w-5 h-5 text-indigo-400" />
                <span>Ledger Receipt</span>
              </h3>
              <button
                onClick={() => setIsDrawerOpen(false)}
                className="p-2 hover:bg-[#0d0c0b] border border-transparent hover:border-indigo-900/10 rounded-xl text-slate-400 hover:text-slate-100 transition-all cursor-pointer"
              >
                <X className="w-4.5 h-4.5" />
              </button>
            </div>

            {isLoadingExpense || !selectedExpense ? (
              <div className="flex flex-col items-center justify-center flex-grow">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-500 mb-2" />
                <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">Loading splits...</p>
              </div>
            ) : (
              <div className="flex-grow flex flex-col justify-between min-h-0">
                <div className="flex-grow overflow-y-auto space-y-6 pr-1">
                  
                  {/* Expense Main Title and Info */}
                  <div className="border-b border-dashed border-indigo-900/30 pb-6 text-center">
                    <p className="text-[10px] text-slate-500 font-extrabold uppercase tracking-widest mb-1.5">Spreetail Registered Slip</p>
                    <h2 className="text-2xl font-serif font-black text-[#f7f4f0] tracking-tight">{selectedExpense.description}</h2>
                    <p className="text-4xl font-serif font-black text-indigo-400 mt-3 tracking-tight">${Number(selectedExpense.amount).toFixed(2)}</p>
                    
                    <div className="flex flex-wrap items-center justify-center gap-2 mt-5 text-[9px] text-slate-455 font-bold uppercase tracking-wider">
                      <span className="bg-[#0d0c0b] border border-indigo-900/10 px-2.5 py-1 rounded-lg">
                        Paid by: {selectedExpense.paidBy?.name}
                      </span>
                      <span className="bg-[#0d0c0b] border border-indigo-900/10 px-2.5 py-1 rounded-lg">
                        Split: {selectedExpense.splitMethod}
                      </span>
                      <span className="bg-[#0d0c0b] border border-indigo-900/10 px-2.5 py-1 rounded-lg">
                        {new Date(selectedExpense.date).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  {/* Splits Breakdown */}
                  <div className="space-y-3">
                    <h4 className="text-slate-550 text-[9px] font-bold uppercase tracking-widest text-center">Split Breakdowns</h4>
                    <div className="space-y-3 bg-[#0d0c0b]/50 border border-indigo-900/10 rounded-2xl p-5 shadow-inner">
                      {selectedExpense.participants?.map((p) => (
                        <div key={p.id} className="flex justify-between items-center text-xs">
                          <span className="text-slate-300 font-bold">{p.user?.name}</span>
                          <div className="text-right">
                            <span className="text-[#f7f4f0] font-black">${Number(p.amountOwed).toFixed(2)}</span>
                            {p.shareValue !== null && p.shareValue !== undefined && (
                              <span className="text-[9px] text-slate-550 font-bold block mt-0.5">
                                {selectedExpense.splitMethod === 'PERCENTAGE'
                                  ? `${p.shareValue}%`
                                  : selectedExpense.splitMethod === 'SHARE'
                                    ? `${p.shareValue} share${p.shareValue !== 1 ? 's' : ''}`
                                    : `$${Number(p.shareValue).toFixed(2)}`
                                }
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Expense Comment Chat Thread */}
                  <div className="border-t border-dashed border-indigo-900/30 pt-6">
                    <ExpenseChat expenseId={selectedExpense.id} />
                  </div>
                </div>

                {/* Delete / Settings bar */}
                {(selectedExpense.createdById === currentUser?.id || isAdmin) && (
                  <div className="pt-4 border-t border-indigo-900/10 mt-4">
                    <button
                      onClick={() => handleDeleteExpense(selectedExpense.id)}
                      className="w-full flex items-center justify-center gap-2 bg-rose-500/5 hover:bg-rose-600 text-rose-455 hover:text-[#0d0c0b] border border-rose-550/15 hover:border-transparent font-black py-3 px-4 rounded-xl text-xs transition-all cursor-pointer uppercase tracking-wider"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Void Expense Record</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default GroupDetailPage;
