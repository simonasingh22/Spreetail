import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { listGroups, createGroup, getUserGlobalSummary } from '../api/group.api';
import { useAuthStore } from '../stores/authStore';
import { Plus, Users, ArrowUpRight, ArrowDownRight, LogOut, Loader2, ArrowRight } from 'lucide-react';
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

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans pb-16 relative overflow-hidden">
      {/* Dynamic Animated Ambient Blobs */}
      <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] bg-indigo-600/10 rounded-full blur-[120px] ambient-blob-1 pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-indigo-500/5 rounded-full blur-[140px] ambient-blob-2 pointer-events-none" />
      <div className="absolute top-[40%] right-[20%] w-[350px] h-[350px] bg-emerald-500/5 rounded-full blur-[100px] pointer-events-none" />

      {/* Header (Glassmorphic) */}
      <header className="border-b border-slate-900 bg-slate-950/75 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-indigo-750 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <span className="font-extrabold text-lg text-white">S</span>
            </div>
            <div>
              <h1 className="font-black text-lg tracking-tight bg-gradient-to-r from-slate-50 to-slate-200 bg-clip-text text-transparent">
                Spreetail
              </h1>
              <p className="text-slate-500 text-[10px] uppercase font-bold tracking-wider">Dynamic Expenses</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3 bg-slate-900/50 border border-slate-800/80 px-3.5 py-1.5 rounded-xl">
              <div className="w-8 h-8 rounded-lg bg-indigo-950/80 border border-indigo-900/40 text-indigo-400 flex items-center justify-center font-bold text-sm">
                {user?.name.charAt(0).toUpperCase()}
              </div>
              <div className="text-left hidden sm:block">
                <p className="text-xs font-bold text-slate-200 leading-none">{user?.name}</p>
                <p className="text-[10px] text-slate-555 mt-0.5 leading-none">{user?.email}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="p-2.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition-all duration-200 border border-transparent hover:border-rose-500/20 cursor-pointer"
              title="Logout"
            >
              <LogOut className="w-4.5 h-4.5" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-6xl mx-auto px-4 mt-10 relative z-10">
        {/* Welcome Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
          <div>
            <h2 className="text-3xl font-black tracking-tight text-slate-50">Hello, {user?.name}!</h2>
            <p className="text-slate-400 text-sm mt-1.5">Quickly settle, record, and simplify shared expenses with friends.</p>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-6 py-3.5 rounded-2xl shadow-lg shadow-indigo-600/15 hover:shadow-indigo-600/25 hover:-translate-y-0.5 active:translate-y-0 transition-all cursor-pointer w-full md:w-auto text-sm"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Create New Group</span>
          </button>
        </div>

        {/* Global Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {/* Net Balance Card */}
          <div className="bg-slate-900/40 border border-slate-900 rounded-3xl p-6 shadow-xl relative overflow-hidden backdrop-blur-md">
            <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-indigo-500/5 to-indigo-700/5 rounded-full translate-x-8 -translate-y-8" />
            <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-3">Net Balance</p>
            <p className={`text-4xl font-black ${summary.netBalance > 0 ? 'text-emerald-400' : summary.netBalance < 0 ? 'text-rose-400' : 'text-slate-200'}`}>
              {summary.netBalance > 0 ? `+$${summary.netBalance.toFixed(2)}` : summary.netBalance < 0 ? `-$${Math.abs(summary.netBalance).toFixed(2)}` : '$0.00'}
            </p>
            <div className="mt-3.5 flex items-center gap-1.5 text-[11px] text-slate-500">
              <span>Dynamic standing across all groups</span>
            </div>
          </div>

          {/* Owed Card */}
          <div className="bg-slate-900/40 border border-slate-900 rounded-3xl p-6 shadow-xl relative overflow-hidden backdrop-blur-md">
            <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full translate-x-8 -translate-y-8" />
            <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-3">You are owed</p>
            <div className="flex items-baseline gap-2">
              <ArrowUpRight className="w-5 h-5 text-emerald-400 self-center" />
              <p className="text-4xl font-black text-emerald-400">${summary.totalOwed.toFixed(2)}</p>
            </div>
            <p className="text-[11px] text-slate-500 mt-3.5">Receivable balances from group members</p>
          </div>

          {/* Owe Card */}
          <div className="bg-slate-900/40 border border-slate-900 rounded-3xl p-6 shadow-xl relative overflow-hidden backdrop-blur-md">
            <div className="absolute top-0 right-0 w-24 h-24 bg-rose-500/5 rounded-full translate-x-8 -translate-y-8" />
            <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-3">You owe</p>
            <div className="flex items-baseline gap-2">
              <ArrowDownRight className="w-5 h-5 text-rose-400 self-center" />
              <p className="text-4xl font-black text-rose-400">${summary.totalOwedTo.toFixed(2)}</p>
            </div>
            <p className="text-[11px] text-slate-500 mt-3.5">Pending settlements to pay back</p>
          </div>
        </div>

        {/* Groups List Section */}
        <div className="mb-6">
          <h3 className="text-lg font-black text-slate-100 mb-6 flex items-center gap-2">
            <Users className="w-5 h-5 text-indigo-400" />
            <span>Active Groups ({groups.length})</span>
          </h3>

          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-24 bg-slate-900/20 border border-slate-900 rounded-3xl backdrop-blur-sm">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-500 mb-3" />
              <p className="text-slate-550 text-xs uppercase font-bold tracking-wider">Loading your groups...</p>
            </div>
          ) : groups.length === 0 ? (
            <div className="text-center py-20 bg-slate-900/10 border border-dashed border-slate-800 rounded-3xl backdrop-blur-sm px-6">
              <Users className="w-12 h-12 text-slate-700 mx-auto mb-4" />
              <h4 className="text-slate-200 font-bold text-lg">No groups yet</h4>
              <p className="text-slate-500 text-xs max-w-sm mx-auto mt-2 mb-6 leading-relaxed">
                Log a group for trips, split dinners, or shared room expenses. You can add members instantly by email.
              </p>
              <button
                onClick={() => setIsModalOpen(true)}
                className="inline-flex items-center gap-2 bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-400 border border-indigo-500/20 font-bold px-5 py-3 rounded-2xl transition-all cursor-pointer text-xs"
              >
                <Plus className="w-4 h-4 stroke-[3]" />
                <span>Create Group</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {groups.map((group) => (
                <div
                  key={group.id}
                  onClick={() => navigate(`/groups/${group.id}`)}
                  onMouseMove={handleMouseMove}
                  style={{
                    // Pass coordinates to CSS custom properties for hover glow radial effects
                    // We cast coords object properly
                    '--mouse-x': `${mouseCoords.x}px`,
                    '--mouse-y': `${mouseCoords.y}px`
                  } as React.CSSProperties}
                  className="premium-glow-card rounded-2xl p-6 flex justify-between items-center group cursor-pointer"
                >
                  <div className="flex items-center gap-5 relative z-10">
                    <div className="w-12 h-12 bg-indigo-950/80 border border-indigo-900/30 text-indigo-400 rounded-xl flex items-center justify-center font-extrabold text-lg transition-transform group-hover:scale-105 duration-200 shadow-inner">
                      {group.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h4 className="font-extrabold text-slate-100 group-hover:text-indigo-400 transition-colors text-base">
                        {group.name}
                      </h4>
                      <p className="text-slate-500 text-[11px] flex items-center gap-1.5 mt-1 font-semibold">
                        <Users className="w-3.5 h-3.5" />
                        <span>{group.memberCount} member{group.memberCount !== 1 ? 's' : ''}</span>
                        <span>•</span>
                        <span className="text-slate-400 bg-slate-800/80 border border-slate-700/30 px-2 py-0.5 rounded text-[9px] uppercase font-bold tracking-wide">
                          {group.role}
                        </span>
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-slate-500 group-hover:text-indigo-400 transition-colors duration-200">
                    <span className="text-[10px] font-semibold hidden sm:inline">Open</span>
                    <ArrowRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform duration-200" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Create Group Modal (Scale 95->100 & Fade) */}
      {isModalOpen && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
          <div 
            onClick={() => {
              setIsModalOpen(false);
              setNewGroupName('');
            }}
            className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
          />
          <div className="relative w-full max-w-md bg-slate-900 border border-slate-800/80 rounded-2xl p-6 shadow-2xl z-10 animate-in fade-in zoom-in-95 duration-150 glass-surface">
            <h3 className="text-xl font-bold text-slate-50 mb-2">Create New Group</h3>
            <p className="text-slate-400 text-xs mb-6 leading-relaxed">Assign a name for your expense group. You can immediately invite members on the dashboard page.</p>

            <div className="space-y-4">
              <div>
                <label className="block text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-2">
                  Group Name
                </label>
                <input
                  type="text"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  placeholder="e.g. Ski Trip 2026"
                  className="w-full bg-slate-800/60 border border-slate-700 rounded-xl px-4 py-3 text-slate-100 placeholder-slate-550 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-transparent transition-all text-sm font-semibold"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleCreateGroup();
                  }}
                  autoFocus
                />
              </div>
            </div>

            <div className="mt-8 flex justify-end gap-3">
              <button
                onClick={() => {
                  setIsModalOpen(false);
                  setNewGroupName('');
                }}
                className="px-4.5 py-2.5 bg-slate-800 hover:bg-slate-750 text-slate-300 font-bold rounded-xl transition-all cursor-pointer text-xs"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateGroup}
                disabled={isCreating}
                className="flex items-center gap-1.5 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl shadow-lg shadow-indigo-600/10 hover:shadow-indigo-600/20 transition-all cursor-pointer text-xs disabled:opacity-50"
              >
                {isCreating ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Creating...</span>
                  </>
                ) : (
                  <span>Create Group</span>
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
