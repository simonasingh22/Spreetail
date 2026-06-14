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
  ArrowRight
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
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-100">
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

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans pb-16 relative overflow-hidden">
      {/* Ambient background blur blobs */}
      <div className="absolute top-[-25%] right-[-10%] w-[500px] h-[500px] bg-indigo-600/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-15%] left-[-10%] w-[500px] h-[500px] bg-indigo-600/5 rounded-full blur-[120px] pointer-events-none" />

      {/* Header (Glassmorphic) */}
      <header className="border-b border-slate-900 bg-slate-950/75 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/" className="p-2.5 hover:bg-slate-900 rounded-xl text-slate-400 hover:text-slate-100 transition-all border border-transparent hover:border-slate-800/80">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="font-extrabold text-lg text-slate-50 tracking-tight leading-tight">{group.name}</h1>
              <p className="text-slate-500 text-[10px] uppercase font-bold tracking-wider flex items-center gap-1.5 mt-0.5">
                <Users className="w-3 h-3 text-indigo-400" />
                <span>{group.members?.filter(m => m.isActive).length} active members</span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => openSettleModal()}
              className="bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-200 font-bold px-4 py-2.5 rounded-xl text-xs transition-all cursor-pointer shadow-sm"
            >
              Settle Up
            </button>
            <Link
              to={`/groups/${group.id}/expenses/new`}
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-4 py-2.5 rounded-xl text-xs shadow-md shadow-indigo-600/10 hover:shadow-indigo-600/20 hover:-translate-y-0.5 active:translate-y-0 transition-all"
            >
              Add Expense
            </Link>
          </div>
        </div>
      </header>

      {/* Main Grid */}
      <main className="max-w-6xl mx-auto px-4 mt-8 grid grid-cols-1 lg:grid-cols-12 gap-8 relative z-10">
        {/* LEFT COLUMN: Sidebar (Members List & Administrative settings) */}
        <div className="lg:col-span-3 space-y-6">
          {/* Members Card */}
          <div className="bg-slate-900/40 border border-slate-900 rounded-3xl p-5 shadow-xl backdrop-blur-md">
            <div className="flex justify-between items-center mb-4 pb-2.5 border-b border-slate-800">
              <h3 className="font-extrabold text-slate-100 text-xs uppercase tracking-widest flex items-center gap-2">
                <Users className="w-3.5 h-3.5 text-indigo-400" />
                <span>Group Members</span>
              </h3>
              <button
                onClick={() => setIsInviteOpen(true)}
                className="p-1.5 bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-400 border border-indigo-500/20 rounded-lg transition-all cursor-pointer"
                title="Add Member"
              >
                <UserPlus className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-4 max-h-[300px] overflow-y-auto pr-1">
              {group.members
                ?.filter((m) => m.isActive)
                .map((m) => {
                  const userBalance = balances.individualSummary[m.userId] || 0;
                  const isUserSelf = m.userId === currentUser?.id;
                  return (
                    <div key={m.id} className="flex justify-between items-center text-xs group-member-row">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-slate-950/80 border border-slate-800 text-slate-300 font-extrabold flex items-center justify-center text-[11px] shadow-sm">
                          {m.user?.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="font-bold text-slate-200 flex items-center gap-1.5 min-w-0">
                            <span className="truncate max-w-[90px]">{m.user?.name}</span>
                            {isUserSelf && <span className="text-[9px] text-slate-500 bg-slate-800 px-1 rounded font-bold">You</span>}
                          </div>
                          <p className="text-[9px] text-slate-500 truncate max-w-[100px] mt-0.5">{m.user?.email}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <div className="text-right">
                          <p className={`font-extrabold ${userBalance > 0 ? 'text-emerald-400' : userBalance < 0 ? 'text-rose-400' : 'text-slate-600'}`}>
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

          {/* Group Settings / Delete Panel */}
          {isAdmin && (
            <div className="bg-slate-900/40 border border-slate-900 rounded-3xl p-5 shadow-xl backdrop-blur-md">
              <h3 className="font-bold text-slate-200 text-xs uppercase tracking-widest mb-2.5">Administrative</h3>
              <p className="text-[10px] text-slate-500 mb-4 leading-relaxed">Permanently purge this group, deleting all recorded expenses, splits, comments, and settlements. This is irreversible.</p>
              <button
                onClick={handleDeleteGroup}
                className="w-full flex items-center justify-center gap-2 bg-rose-500/10 hover:bg-rose-500 text-rose-400 hover:text-white border border-rose-500/20 hover:border-transparent font-bold py-2.5 px-4 rounded-xl text-xs transition-all cursor-pointer shadow-sm shadow-rose-950/10"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Group</span>
              </button>
            </div>
          )}
        </div>

        {/* CENTER COLUMN: Main Content (Standing Banner, Expense List & Settlements) */}
        <div className="lg:col-span-6 space-y-6">
          {/* Standing Banner (Premium Glow border & glass effect) */}
          <div className={`p-5 border rounded-3xl flex items-center justify-between shadow-xl backdrop-blur-md ${myNetBalance > 0 ? 'bg-emerald-500/5 border-emerald-500/15 text-emerald-400 shadow-emerald-950/5' : myNetBalance < 0 ? 'bg-rose-500/5 border-rose-500/15 text-rose-400 shadow-rose-950/5' : 'bg-slate-900/40 border-slate-900 text-slate-300'}`}>
            <div className="flex items-center gap-4">
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center border ${myNetBalance > 0 ? 'bg-emerald-950/60 border-emerald-800/40 text-emerald-400' : myNetBalance < 0 ? 'bg-rose-950/60 border-rose-800/40 text-rose-400' : 'bg-slate-800/40 border-slate-700/30'}`}>
                {myNetBalance > 0 ? <TrendingUp className="w-5 h-5" /> : myNetBalance < 0 ? <TrendingDown className="w-5 h-5" /> : <Clock className="w-5 h-5" />}
              </div>
              <div>
                <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Group standing</p>
                <p className="text-xl font-black mt-1 leading-tight tracking-tight">
                  {myNetBalance > 0 ? `You are owed $${myNetBalance.toFixed(2)}` : myNetBalance < 0 ? `You owe $${Math.abs(myNetBalance).toFixed(2)}` : 'You are settled up'}
                </p>
              </div>
            </div>
            {myNetBalance < 0 && (
              <button
                onClick={() => {
                  const recommendedDebt = balances.simplified.find(d => d.fromId === currentUser?.id);
                  openSettleModal(recommendedDebt?.toId || '', recommendedDebt?.amount);
                }}
                className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-4 py-2.5 rounded-xl text-xs shadow-md shadow-indigo-600/15 transition-all cursor-pointer"
              >
                Settle Debt
              </button>
            )}
          </div>

          {/* Expense History List */}
          <div className="bg-slate-900/40 border border-slate-900 rounded-3xl p-6 shadow-xl backdrop-blur-md">
            <h3 className="font-extrabold text-slate-100 text-sm uppercase tracking-widest mb-6 pb-2.5 border-b border-slate-800 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-400" />
              <span>Expense History</span>
            </h3>

            {expenses.length === 0 ? (
              <div className="text-center py-20 bg-slate-900/10 rounded-2xl border border-slate-800/60 shadow-inner">
                <div className="w-14 h-14 bg-indigo-600/10 border border-indigo-500/20 text-indigo-400 rounded-2xl flex items-center justify-center mx-auto mb-4 animate-pulse">
                  <DollarSign className="w-7 h-7 animate-none" />
                </div>
                <h4 className="font-bold text-slate-200">No expenses recorded yet</h4>
                <p className="text-xs text-slate-500 mt-1.5 max-w-xs mx-auto mb-6">Log group expenditures to display here and simplify debts.</p>
                <Link
                  to={`/groups/${group.id}/expenses/new`}
                  className="inline-flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-5 py-3 rounded-xl text-xs transition-all shadow-md shadow-indigo-600/15"
                >
                  <Plus className="w-4 h-4 stroke-[3]" />
                  <span>Log First Expense</span>
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {expenses.map((expense) => {
                  const isPayer = expense.paidById === currentUser?.id;
                  const myPart = expense.participants?.find((p) => p.userId === currentUser?.id);
                  const shareVal = myPart ? myPart.amountOwed : 0;

                  return (
                    <div
                      key={expense.id}
                      onClick={() => openExpenseDetail(expense.id)}
                      className="bg-slate-950/40 hover:bg-slate-800/25 border border-slate-900 hover:border-slate-700 rounded-2xl p-4 transition-all duration-200 cursor-pointer flex justify-between items-center group shadow-sm"
                    >
                      <div className="flex items-center gap-4">
                        <div className="text-center bg-slate-900/60 border border-slate-800 px-3 py-2 rounded-xl min-w-[52px]">
                          <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">
                            {new Date(expense.date).toLocaleDateString(undefined, { month: 'short' })}
                          </p>
                          <p className="text-base font-extrabold text-slate-200 leading-tight">
                            {new Date(expense.date).getDate()}
                          </p>
                        </div>
                        <div>
                          <h4 className="font-extrabold text-slate-100 text-sm group-hover:text-indigo-400 transition-colors">
                            {expense.description}
                          </h4>
                          <p className="text-slate-500 text-[10px] mt-1 font-semibold">
                            Paid by <span className="font-bold text-slate-400">{expense.paidBy?.name}</span>
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Total cost</p>
                          <p className="text-sm font-black text-slate-200 mt-0.5">${Number(expense.amount).toFixed(2)}</p>
                        </div>
                        <div className="text-right border-l border-slate-800 pl-4 min-w-[100px]">
                          {isPayer ? (
                            <>
                              <p className="text-[9px] font-bold text-emerald-400 uppercase tracking-wide">You lent</p>
                              <p className="text-sm font-black text-emerald-400 mt-0.5">
                                ${(Number(expense.amount) - Number(shareVal)).toFixed(2)}
                              </p>
                            </>
                          ) : myPart ? (
                            <>
                              <p className="text-[9px] font-bold text-rose-400 uppercase tracking-wide">You owe</p>
                              <p className="text-sm font-black text-rose-400 mt-0.5">${Number(shareVal).toFixed(2)}</p>
                            </>
                          ) : (
                            <>
                              <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wide">Excluded</p>
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
                  <div className="flex justify-between items-center mt-6 pt-4 border-t border-slate-850 text-xs">
                    <button
                      onClick={() => setExpensePage((p) => Math.max(1, p - 1))}
                      disabled={expensePage === 1}
                      className="px-3.5 py-2 bg-slate-800 hover:bg-slate-750 disabled:opacity-30 rounded-xl text-slate-300 font-bold transition-all cursor-pointer border border-slate-750"
                    >
                      Previous
                    </button>
                    <span className="text-slate-400 font-semibold tracking-wide">Page {expensePage} of {totalPages}</span>
                    <button
                      onClick={() => setExpensePage((p) => Math.min(totalPages, p + 1))}
                      disabled={expensePage === totalPages}
                      className="px-3.5 py-2 bg-slate-800 hover:bg-slate-750 disabled:opacity-30 rounded-xl text-slate-300 font-bold transition-all cursor-pointer border border-slate-750"
                    >
                      Next
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Settlements (Record payments log) */}
          <div className="bg-slate-900/40 border border-slate-900 rounded-3xl p-6 shadow-xl backdrop-blur-md">
            <h3 className="font-extrabold text-slate-100 text-sm uppercase tracking-widest mb-6 pb-2.5 border-b border-slate-800">
              Recent Settlements
            </h3>
            {settlements.length === 0 ? (
              <p className="text-center text-xs text-slate-500 py-8 bg-slate-950/20 border border-slate-800 rounded-2xl">No settlements recorded yet.</p>
            ) : (
              <div className="space-y-3">
                {settlements.map((s) => {
                  const isSettlementPayer = s.payerId === currentUser?.id;
                  const canDeleteSettlement = isSettlementPayer || isAdmin;

                  return (
                    <div key={s.id} className="bg-slate-950/40 border border-slate-900 rounded-2xl p-4 flex justify-between items-center shadow-sm">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center text-indigo-400 font-black text-xs shrink-0">
                          $
                        </div>
                        <div>
                          <p className="text-xs text-slate-200">
                            <span className="font-bold text-slate-100">{s.payer?.name}</span> settled{' '}
                            <span className="font-bold text-slate-100">{s.payee?.name}</span>
                          </p>
                          {s.note && <p className="text-[10px] text-slate-500 mt-1 italic">"{s.note}"</p>}
                          <p className="text-[9px] text-slate-500 mt-1">{new Date(s.createdAt).toLocaleString()}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex flex-col items-end gap-1">
                          <span className="text-xs font-black text-slate-100 bg-slate-900 border border-slate-800 px-2.5 py-1 rounded-lg">
                            ${Number(s.amount).toFixed(2)}
                          </span>
                          <span className="text-[9px] font-extrabold text-indigo-400 bg-indigo-950/65 border border-indigo-900/60 px-1.5 py-0.5 rounded uppercase tracking-widest text-center min-w-[50px]">
                            {s.paymentMethod?.replace('_', ' ')}
                          </span>
                        </div>
                        {canDeleteSettlement && (
                          <button
                            onClick={() => handleDeleteSettlement(s.id)}
                            className="p-1.5 hover:bg-rose-500/10 text-slate-655 hover:text-rose-400 rounded-lg transition-all cursor-pointer"
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
        </div>

        {/* RIGHT COLUMN: Sidebar (Optimal Balances Summary) */}
        <div className="lg:col-span-3">
          <BalanceSummary
            simplifiedDebts={balances.simplified}
            rawDebts={balances.raw}
            currentUserId={currentUser?.id}
            onSettleUp={(payeeId, amount) => openSettleModal(payeeId, amount)}
          />
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
          <div onClick={() => setIsInviteOpen(false)} className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" />
          <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl z-10 animate-in fade-in zoom-in-95 duration-150 glass-surface">
            <h3 className="text-xl font-bold text-slate-50 mb-2">Invite Member</h3>
            <p className="text-slate-450 text-xs mb-6 leading-relaxed">Add member by email immediately. Invited user must have registered an account first.</p>

            <div className="space-y-4">
              <div>
                <label className="block text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="e.g. friend@example.com"
                  className="w-full bg-slate-800/60 border border-slate-700 rounded-xl px-4 py-3 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-transparent transition-all text-sm font-semibold"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleInvite();
                  }}
                  autoFocus
                />
              </div>
            </div>

            <div className="mt-8 flex justify-end gap-3">
              <button
                onClick={() => {
                  setIsInviteOpen(false);
                  setInviteEmail('');
                }}
                className="px-4 py-2.5 bg-slate-800 text-slate-300 font-bold rounded-xl transition-all cursor-pointer text-xs"
              >
                Cancel
              </button>
              <button
                onClick={handleInvite}
                disabled={isInviting}
                className="flex items-center gap-1.5 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl shadow-lg transition-all cursor-pointer text-xs disabled:opacity-50"
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

      {/* Selected Expense Detail Drawer (Overlay Glassmorphism) */}
      {isDrawerOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div onClick={() => setIsDrawerOpen(false)} className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm transition-opacity" />

          <div className="relative w-full max-w-md bg-slate-900 border-l border-slate-800/80 h-full p-6 shadow-2xl flex flex-col z-10 animate-in slide-in-from-right duration-200 glass-surface">
            <div className="flex justify-between items-center pb-4 border-b border-slate-800 mb-6">
              <h3 className="font-extrabold text-lg text-slate-50 tracking-tight">Expense Details</h3>
              <button
                onClick={() => setIsDrawerOpen(false)}
                className="p-2 hover:bg-slate-800 rounded-xl text-slate-400 hover:text-slate-100 transition-all cursor-pointer"
              >
                <X className="w-4.5 h-4.5" />
              </button>
            </div>

            {isLoadingExpense || !selectedExpense ? (
              <div className="flex flex-col items-center justify-center flex-grow">
                <Loader2 className="w-7 h-7 animate-spin text-indigo-500 mb-2" />
                <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider">Loading splits...</p>
              </div>
            ) : (
              <div className="flex-grow flex flex-col justify-between min-h-0">
                <div className="flex-grow overflow-y-auto space-y-6 pr-1">
                  {/* Expense Main Title and Info */}
                  <div>
                    <h2 className="text-2xl font-black text-slate-100 tracking-tight">{selectedExpense.description}</h2>
                    <p className="text-4xl font-extrabold text-indigo-400 mt-2 tracking-tight">${Number(selectedExpense.amount).toFixed(2)}</p>
                    <div className="flex flex-wrap gap-2 mt-4 text-[10px] text-slate-400 font-bold font-sans">
                      <span className="bg-slate-800 border border-slate-700/35 px-2.5 py-1 rounded-lg">
                        Paid by: {selectedExpense.paidBy?.name}
                      </span>
                      <span className="bg-slate-800 border border-slate-700/35 px-2.5 py-1 rounded-lg">
                        Method: {selectedExpense.splitMethod}
                      </span>
                      <span className="bg-slate-800 border border-slate-700/35 px-2.5 py-1 rounded-lg">
                        {new Date(selectedExpense.date).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  {/* Splits Breakdown */}
                  <div>
                    <h4 className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-3">Split Breakdown</h4>
                    <div className="space-y-3 bg-slate-950/40 border border-slate-900 rounded-2xl p-4">
                      {selectedExpense.participants?.map((p) => (
                        <div key={p.id} className="flex justify-between items-center text-xs">
                          <span className="text-slate-300 font-bold">{p.user?.name}</span>
                          <div className="text-right">
                            <span className="text-slate-100 font-black">${Number(p.amountOwed).toFixed(2)}</span>
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
                  <div className="mt-4">
                    <ExpenseChat expenseId={selectedExpense.id} />
                  </div>
                </div>

                {/* Delete / Settings bar */}
                {(selectedExpense.createdById === currentUser?.id || isAdmin) && (
                  <div className="pt-4 border-t border-slate-800 mt-4">
                    <button
                      onClick={() => handleDeleteExpense(selectedExpense.id)}
                      className="w-full flex items-center justify-center gap-2 bg-rose-500/10 hover:bg-rose-600 text-rose-400 hover:text-white border border-rose-500/20 hover:border-transparent font-bold py-2.5 px-4 rounded-xl text-xs transition-all cursor-pointer shadow-sm"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete Expense</span>
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
