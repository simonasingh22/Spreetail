import React, { useState } from 'react';
import { SimplifiedDebt } from '../../types';
import { ArrowUpRight, ArrowDownRight, RefreshCw, HelpCircle, CheckCircle } from 'lucide-react';

interface BalanceSummaryProps {
  simplifiedDebts: SimplifiedDebt[];
  rawDebts: SimplifiedDebt[];
  currentUserId?: string;
  onSettleUp: (payeeId: string, amount: number) => void;
}

export const BalanceSummary: React.FC<BalanceSummaryProps> = ({
  simplifiedDebts,
  rawDebts,
  currentUserId,
  onSettleUp
}) => {
  const [showDetailed, setShowDetailed] = useState(false);

  const activeDebts = showDetailed ? rawDebts : simplifiedDebts;

  const userOwesList: SimplifiedDebt[] = [];
  const owesUserList: SimplifiedDebt[] = [];
  const otherDebtsList: SimplifiedDebt[] = [];

  activeDebts.forEach((debt) => {
    if (debt.fromId === currentUserId) {
      userOwesList.push(debt);
    } else if (debt.toId === currentUserId) {
      owesUserList.push(debt);
    } else {
      otherDebtsList.push(debt);
    }
  });

  return (
    <div className="bg-slate-900/40 border border-slate-900 rounded-3xl p-5 shadow-xl w-full backdrop-blur-md">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-3.5 border-b border-slate-850">
        <div>
          <h3 className="font-extrabold text-slate-100 text-sm uppercase tracking-widest">Group Balances</h3>
          <p className="text-slate-500 text-[10px] uppercase font-bold mt-1 tracking-wider">
            {showDetailed ? 'Raw pairwise debts' : 'Simplified optimal paths'}
          </p>
        </div>
        
        <button
          onClick={() => setShowDetailed(!showDetailed)}
          className="flex items-center gap-1.5 bg-slate-950/60 hover:bg-slate-800 border border-slate-850 hover:border-slate-700 text-indigo-400 font-bold px-3 py-1.5 rounded-xl text-[10px] uppercase tracking-wider transition-all cursor-pointer shadow-inner"
        >
          <RefreshCw className="w-3 h-3" />
          <span>{showDetailed ? 'Simplified' : 'Pairwise'}</span>
        </button>
      </div>

      {activeDebts.length === 0 ? (
        <div className="text-center py-10 bg-slate-950/40 rounded-2xl border border-slate-900/60">
          <CheckCircle className="w-8 h-8 text-emerald-500/80 mx-auto mb-3" />
          <p className="text-slate-350 font-bold text-xs">Everyone is settled up!</p>
          <p className="text-slate-550 text-[10px] mt-1">No outstanding balances found.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* You Owe Section */}
          {userOwesList.length > 0 && (
            <div>
              <h4 className="text-slate-500 text-[9px] font-bold uppercase tracking-widest mb-3">You Owe</h4>
              <div className="space-y-2">
                {userOwesList.map((debt, idx) => (
                  <div key={idx} className="bg-rose-500/5 border border-rose-500/10 rounded-2xl p-4 flex justify-between items-center gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 bg-rose-950/40 border border-rose-900/30 text-rose-400 rounded-lg flex items-center justify-center shrink-0">
                        <ArrowDownRight className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs text-slate-300 font-medium truncate">
                          To <span className="font-bold text-slate-100">{debt.toName}</span>
                        </p>
                        <p className="text-xs font-black text-rose-455 mt-0.5">${debt.amount.toFixed(2)}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => onSettleUp(debt.toId, debt.amount)}
                      className="bg-rose-500 hover:bg-rose-400 text-white font-bold px-3 py-1.5 rounded-lg text-[10px] uppercase tracking-wider transition-all cursor-pointer shadow-sm shadow-rose-950/20"
                    >
                      Settle
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Owes You Section */}
          {owesUserList.length > 0 && (
            <div>
              <h4 className="text-slate-500 text-[9px] font-bold uppercase tracking-widest mb-3">Owes You</h4>
              <div className="space-y-2">
                {owesUserList.map((debt, idx) => (
                  <div key={idx} className="bg-emerald-500/5 border border-emerald-500/10 rounded-2xl p-4 flex justify-between items-center gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 bg-emerald-950/40 border border-emerald-900/30 text-emerald-400 rounded-lg flex items-center justify-center shrink-0">
                        <ArrowUpRight className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs text-slate-300 font-medium truncate">
                          From <span className="font-bold text-slate-100">{debt.fromName}</span>
                        </p>
                        <p className="text-xs font-black text-emerald-400 mt-0.5">${debt.amount.toFixed(2)}</p>
                      </div>
                    </div>
                    <span className="text-[8px] text-slate-500 bg-slate-950/40 px-2 py-0.5 rounded-md font-bold uppercase tracking-wider border border-slate-850">
                      Owed
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Other Debts Section */}
          {otherDebtsList.length > 0 && (
            <div>
              <h4 className="text-slate-500 text-[9px] font-bold uppercase tracking-widest mb-3">Other Debts</h4>
              <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1">
                {otherDebtsList.map((debt, idx) => (
                  <div key={idx} className="bg-slate-950/35 border border-slate-900 rounded-2xl p-3.5 flex justify-between items-center text-xs">
                    <span className="text-slate-400 min-w-0 truncate pr-2 font-medium">
                      <span className="font-bold text-slate-300">{debt.fromName}</span> owes <span className="font-bold text-slate-300">{debt.toName}</span>
                    </span>
                    <span className="text-slate-200 font-extrabold shrink-0 bg-slate-900 border border-slate-850 px-2 py-0.5 rounded-lg text-[11px]">${debt.amount.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default BalanceSummary;
