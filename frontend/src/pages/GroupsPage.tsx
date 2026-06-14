import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { listGroups, createGroup, getUserGlobalSummary } from '../api/group.api';
import { useAuthStore } from '../stores/authStore';
import { Plus, Users, ArrowUpRight, ArrowDownRight, LogOut, Loader2, ArrowRight, Search, Landmark, Calendar, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';

interface GroupListItem {
  id: string;
  name: string;
  role: string;
  joinedAt: string;
  memberCount: number;
}

export const GroupsPage = () => {
  const [groups, setGroups] = useState<GroupListItem[]>([]);
  const [summary, setSummary] = useState({ totalOwed: 0, totalOwedTo: 0, netBalance: 0 });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Mouse move track for dynamic glow card gradients
  const [mouseCoords, setMouseCoords] = useState({ x: 0, y: 0 });

  const navigate = useNavigate();
  const logoutStore = useAuthStore((state) => state.logout);
  const user = useAuthStore((state) => state.user);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [groupsRes, summaryRes] = await Promise.all([
        listGroups(),
        getUserGlobalSummary()
      ]);
      setGroups(groupsRes.data);
      setSummary(summaryRes.data);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to fetch dashboard data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setMouseCoords({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    });
  };

  const handleCreateGroup = async () => {
    if (!newGroupName.trim()) {
      toast.error('Group name cannot be empty');
      return;
    }
    setIsCreating(true);
    try {
      const response = await createGroup(newGroupName.trim());
      toast.success('Group created successfully!');
      setIsModalOpen(false);
      setNewGroupName('');
      navigate(`/groups/${response.data.id}`);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to create group');
    } finally {
      setIsCreating(false);
    }
  };

  const handleLogout = () => {
    logoutStore();
    toast.success('Logged out successfully');
    navigate('/login');
  };

  // Filter groups in client state
  const filteredGroups = groups.filter((group) =>
    group.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#0d0c0b] text-[#f7f4f0] font-sans pb-20 relative overflow-hidden">
      {/* Background ambient lighting */}
      <div className="absolute top-[-25%] left-[-15%] w-[600px] h-[600px] bg-indigo-900/10 rounded-full blur-[140px] ambient-blob-1 pointer-events-none" />
      <div className="absolute bottom-[-15%] right-[-15%] w-[700px] h-[700px] bg-indigo-955/10 rounded-full blur-[160px] ambient-blob-2 pointer-events-none" />

      {/* Premium Header */}
      <header className="border-b border-indigo-900/10 bg-[#0d0c0b]/50 backdrop-blur-xl sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-950 to-indigo-900 border border-indigo-850 flex items-center justify-center shadow-lg shadow-indigo-955/50">
              <span className="font-serif font-black text-xl text-indigo-400">S</span>
            </div>
            <div>
              <h1 className="font-serif font-black text-lg tracking-wider text-[#f7f4f0] leading-none">
                Spreetail
              </h1>
              <p className="text-indigo-600/80 text-[9px] uppercase font-bold tracking-widest leading-none mt-1.5">
                Consolidated Ledger
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3 bg-slate-900/30 border border-indigo-900/10 px-4 py-2 rounded-xl">
              <div className="w-8 h-8 rounded-lg bg-indigo-950 border border-indigo-900/30 text-indigo-455 flex items-center justify-center font-bold text-sm">
                {user?.name.charAt(0).toUpperCase()}
              </div>
              <div className="text-left hidden sm:block">
                <p className="text-xs font-black text-slate-200 leading-none">{user?.name}</p>
                <p className="text-[10px] text-slate-500 mt-1 leading-none">{user?.email}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="p-2.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/5 rounded-xl transition-all duration-200 border border-transparent hover:border-rose-500/10 cursor-pointer"
              title="Logout"
            >
              <LogOut className="w-4.5 h-4.5" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Grid: Asymmetric Layout */}
      <main className="max-w-6xl mx-auto px-6 mt-12 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* LEFT COLUMN: The Ledger Desk (5 cols) */}
          <div className="lg:col-span-5 space-y-8 lg:sticky lg:top-24">
            {/* Ledger Profile & Balance Slip */}
            <div className="relative bg-[#141312] border border-indigo-900/15 rounded-3xl p-8 overflow-hidden shadow-2xl">
              {/* Gold light burst */}
              <div className="absolute -top-12 -right-12 w-36 h-36 bg-indigo-600/5 rounded-full blur-2xl pointer-events-none" />
              
              <div className="space-y-6">
                <div>
                  <div className="flex items-center gap-2 text-[10px] text-indigo-400 font-extrabold uppercase tracking-widest">
                    <Landmark className="w-3.5 h-3.5" />
                    <span>Personal Balance Statement</span>
                  </div>
                  <h2 className="text-3xl font-black tracking-tight text-[#f7f4f0] font-serif mt-2">
                    {user?.name}
                  </h2>
                  <p className="text-slate-500 text-xs mt-1">Spreetail Account Registry</p>
                </div>

                {/* Elegant balance receipt card */}
                <div className="bg-[#0d0c0b]/80 border border-indigo-900/10 rounded-2xl p-6 space-y-4 shadow-inner">
                  <div className="border-b border-indigo-900/10 pb-4">
                    <p className="text-slate-500 text-[9px] font-bold uppercase tracking-widest">Net Standing Balance</p>
                    <p className={`text-4xl font-serif font-black tracking-tight mt-1 ${
                      summary.netBalance > 0 ? 'text-emerald-400' : summary.netBalance < 0 ? 'text-rose-400' : 'text-[#f7f4f0]'
                    }`}>
                      {summary.netBalance > 0 ? `+$${summary.netBalance.toFixed(2)}` : summary.netBalance < 0 ? `-$${Math.abs(summary.netBalance).toFixed(2)}` : '$0.00'}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div>
                      <p className="text-slate-500 text-[8px] font-bold uppercase tracking-widest flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        <span>Owed to you</span>
                      </p>
                      <p className="font-serif font-bold text-sm text-emerald-400 mt-1">
                        +${summary.totalOwed.toFixed(2)}
                      </p>
                    </div>
                    <div>
                      <p className="text-slate-500 text-[8px] font-bold uppercase tracking-widest flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                        <span>You owe</span>
                      </p>
                      <p className="font-serif font-bold text-sm text-rose-400 mt-1">
                        -${summary.totalOwedTo.toFixed(2)}
                      </p>
                    </div>
                  </div>
                </div>

                <p className="text-[10px] text-slate-550 leading-relaxed italic">
                  * Dynamic ledger balances compile live from all joint groups, individual settlements, and expense splits.
                </p>
              </div>
            </div>

            {/* Premium CTA Button */}
            <div className="bg-gradient-to-r from-indigo-950/20 to-indigo-900/5 border border-dashed border-indigo-900/20 rounded-3xl p-6 text-center">
              <p className="text-slate-400 text-xs mb-4 leading-relaxed">
                Log shared travel bills, dining outings, or apartment rent splits.
              </p>
              <button
                onClick={() => setIsModalOpen(true)}
                className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-[#0d0c0b] font-black px-5 py-4 rounded-2xl shadow-lg hover:shadow-indigo-600/10 hover:-translate-y-0.5 active:translate-y-0 transition-all cursor-pointer text-xs uppercase tracking-wider"
              >
                <Plus className="w-4 h-4 stroke-[3]" />
                <span>Open New Ledger</span>
              </button>
            </div>
          </div>

          {/* RIGHT COLUMN: Active Ledgers (7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            {/* Header controls & stats */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-indigo-900/10">
              <h3 className="text-xl font-serif font-black tracking-wide flex items-center gap-2">
                <Users className="w-5 h-5 text-indigo-400" />
                <span>Active Ledgers ({groups.length})</span>
              </h3>

              {/* Minimal Search Bar */}
              <div className="relative w-full sm:w-64">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  placeholder="Filter by name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-[#141312] border border-indigo-900/10 rounded-xl pl-9 pr-4 py-2.5 text-xs text-[#f7f4f0] placeholder-slate-550 focus:outline-none focus:border-indigo-650 transition-all font-semibold"
                />
              </div>
            </div>

            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-24 bg-[#141312]/20 border border-indigo-900/5 rounded-3xl backdrop-blur-sm">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-550 mb-3" />
                <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">Loading ledger data...</p>
              </div>
            ) : filteredGroups.length === 0 ? (
              <div className="text-center py-20 bg-[#141312]/10 border border-dashed border-indigo-900/15 rounded-3xl px-6">
                <Users className="w-12 h-12 text-indigo-950 mx-auto mb-4" />
                <h4 className="text-slate-350 font-bold text-base font-serif">No matching records</h4>
                <p className="text-slate-550 text-xs max-w-xs mx-auto mt-2 leading-relaxed">
                  {searchQuery ? "Try refining your search text or open a new ledger group to get started." : "Create your first group to start logging dynamic splits."}
                </p>
                {!searchQuery && (
                  <button
                    onClick={() => setIsModalOpen(true)}
                    className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-[#0d0c0b] font-black px-5 py-3.5 rounded-xl transition-all cursor-pointer text-xs mt-6 uppercase tracking-wider"
                  >
                    <Plus className="w-3.5 h-3.5 stroke-[3]" />
                    <span>Create Group</span>
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredGroups.map((group) => (
                  <div
                    key={group.id}
                    onClick={() => navigate(`/groups/${group.id}`)}
                    onMouseMove={handleMouseMove}
                    style={{
                      '--mouse-x': `${mouseCoords.x}px`,
                      '--mouse-y': `${mouseCoords.y}px`
                    } as React.CSSProperties}
                    className="premium-glow-card rounded-2xl p-6 flex flex-col justify-between cursor-pointer border border-[#141312] bg-[#141312]/40 hover:bg-[#141312]/80 group h-48 relative"
                  >
                    {/* Visual details */}
                    <div className="space-y-4 relative z-10">
                      <div className="flex justify-between items-start">
                        <div className="w-10 h-10 bg-indigo-950/60 border border-indigo-900/30 text-indigo-400 rounded-xl flex items-center justify-center font-serif font-black text-lg shadow-inner">
                          {group.name.charAt(0).toUpperCase()}
                        </div>
                        <span className="text-[8px] text-indigo-400 bg-indigo-950/40 border border-indigo-900/30 px-2.5 py-0.5 rounded-md font-bold uppercase tracking-widest">
                          {group.role}
                        </span>
                      </div>
                      
                      <div>
                        <h4 className="font-bold text-slate-100 group-hover:text-indigo-400 transition-colors text-base font-serif truncate">
                          {group.name}
                        </h4>
                        <p className="text-slate-550 text-[10px] flex items-center gap-1 mt-1 font-semibold">
                          <Users className="w-3 h-3 text-indigo-500/60" />
                          <span>{group.memberCount} member{group.memberCount !== 1 ? 's' : ''}</span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between border-t border-indigo-900/10 pt-3 relative z-10 text-[9px]">
                      <span className="text-slate-500 flex items-center gap-1 font-semibold">
                        <Calendar className="w-3 h-3" />
                        <span>Opened {new Date(group.joinedAt).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}</span>
                      </span>
                      <div className="flex items-center gap-1 text-slate-400 group-hover:text-indigo-400 transition-all font-bold uppercase tracking-wider">
                        <span>Ledger</span>
                        <ArrowRight className="w-3 h-3 transform group-hover:translate-x-0.5 transition-transform" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Create Group Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
          <div 
            onClick={() => {
              setIsModalOpen(false);
              setNewGroupName('');
            }}
            className="absolute inset-0 bg-[#0d0c0b]/85 backdrop-blur-sm"
          />
          <div className="relative w-full max-w-md bg-[#141312] border border-indigo-900/15 rounded-3xl p-8 shadow-2xl z-10 animate-in fade-in zoom-in-95 duration-150 glass-surface">
            <h3 className="text-2xl font-serif font-black text-[#f7f4f0] mb-2">Create New Ledger</h3>
            <p className="text-slate-400 text-xs mb-6 leading-relaxed">
              Open a new balance ledger sheet. You can immediately invite members, record bills, and settle debts.
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-slate-500 text-[9px] font-bold uppercase tracking-widest mb-2">
                  Ledger Group Name
                </label>
                <input
                  type="text"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  placeholder="e.g. Ski Trip 2026 or Shared Apartment"
                  className="w-full bg-[#0d0c0b]/60 border border-indigo-900/10 rounded-xl px-4 py-3.5 text-[#f7f4f0] placeholder-slate-650 focus:outline-none focus:border-indigo-650 transition-all text-sm font-semibold"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleCreateGroup();
                  }}
                  autoFocus
                />
              </div>
            </div>

            <div className="mt-8 flex justify-end gap-3 text-xs">
              <button
                onClick={() => {
                  setIsModalOpen(false);
                  setNewGroupName('');
                }}
                className="px-5 py-3 bg-[#0d0c0b] hover:bg-slate-900 text-slate-455 hover:text-slate-200 font-bold rounded-xl transition-all cursor-pointer uppercase tracking-wider"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateGroup}
                disabled={isCreating}
                className="flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-[#0d0c0b] font-black rounded-xl shadow-lg transition-all cursor-pointer disabled:opacity-50 uppercase tracking-wider"
              >
                {isCreating ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Opening...</span>
                  </>
                ) : (
                  <span>Open Ledger</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GroupsPage;
