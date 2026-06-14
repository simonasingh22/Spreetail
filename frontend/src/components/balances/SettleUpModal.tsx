import React, { useState, useEffect } from 'react';
import { GroupMember } from '../../types';
import { createSettlement } from '../../api/settlement.api';
import { Check, DollarSign, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

interface SettleUpModalProps {
  groupId: string;
  members: GroupMember[];
  currentUserId?: string;
  prefilledPayeeId?: string;
  prefilledAmount?: number;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const SettleUpModal: React.FC<SettleUpModalProps> = ({
  groupId,
  members,
  currentUserId,
  prefilledPayeeId = '',
  prefilledAmount,
  isOpen,
  onClose,
  onSuccess
}) => {
  const [payeeId, setPayeeId] = useState(prefilledPayeeId);
  const [amount, setAmount] = useState(prefilledAmount ? prefilledAmount.toString() : '');
  const [note, setNote] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filter members to only show options other than the current user
  const payeeOptions = members.filter(m => m.userId !== currentUserId && m.isActive);

  // Sync state with props on opening
  useEffect(() => {
    if (isOpen) {
      setPayeeId(prefilledPayeeId);
      setAmount(prefilledAmount ? prefilledAmount.toFixed(2) : '');
      setNote('');
      setPaymentMethod('CASH');
    }
  }, [isOpen, prefilledPayeeId, prefilledAmount]);

  const handleSubmit = async () => {
    if (!payeeId) {
      toast.error('Please select who you are paying');
      return;
    }
    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      toast.error('Please enter a valid amount greater than 0');
      return;
    }

    setIsSubmitting(true);
    try {
      await createSettlement(groupId, {
        payeeId,
        amount: amountNum,
        note: note.trim() || null,
        paymentMethod
      });
      toast.success('Settlement recorded successfully!');
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to record settlement');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
      {/* Backdrop */}
      <div 
        onClick={onClose}
        className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
      />
      {/* Dialog container (No HTML form tag) */}
      <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl z-10 animate-in fade-in zoom-in-95 duration-150 glass-surface">
        <h3 className="text-xl font-bold text-slate-100 mb-2">Record Payment</h3>
        <p className="text-slate-400 text-sm mb-6">Record a cash or bank transfer payment to settle your debts.</p>

        <div className="space-y-4">
          {/* Payer displays as 'You' */}
          <div>
            <label className="block text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">
              From (Payer)
            </label>
            <div className="w-full bg-slate-800/50 border border-slate-800 rounded-lg px-4 py-2.5 text-slate-300 font-semibold text-sm">
              You
            </div>
          </div>

          {/* Payee Selector */}
          <div>
            <label className="block text-slate-300 text-xs font-semibold uppercase tracking-wider mb-2">
              To (Payee)
            </label>
            <select
              value={payeeId}
              onChange={(e) => setPayeeId(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-3 text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
            >
              <option value="">Select payee...</option>
              {payeeOptions.map(m => (
                <option key={m.userId} value={m.userId}>
                  {m.user?.name} ({m.user?.email})
                </option>
              ))}
            </select>
          </div>

          {/* Amount */}
          <div>
            <label className="block text-slate-300 text-xs font-semibold uppercase tracking-wider mb-2">
              Amount (USD)
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                <span className="text-slate-400 text-sm font-semibold">$</span>
              </div>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-8 pr-4 py-3 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all font-semibold"
              />
            </div>
          </div>

          {/* Payment Method */}
          <div>
            <label className="block text-slate-300 text-xs font-semibold uppercase tracking-wider mb-2">
              Payment Method
            </label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="w-full bg-slate-805 bg-slate-800 border border-slate-700 rounded-lg px-3 py-3 text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all text-sm"
            >
              <option value="CASH">Cash 💵</option>
              <option value="BANK_TRANSFER">Bank Transfer 🏦</option>
              <option value="VENMO">Venmo 📱</option>
              <option value="PAYPAL">PayPal 💳</option>
              <option value="UPI">UPI ⚡</option>
              <option value="CREDIT_CARD">Credit Card 💳</option>
            </select>
          </div>

          {/* Optional Note */}
          <div>
            <label className="block text-slate-300 text-xs font-semibold uppercase tracking-wider mb-2">
              Note (Optional)
            </label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Settle up for coffee"
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSubmit();
              }}
            />
          </div>
        </div>

        <div className="mt-8 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-lg transition-all cursor-pointer text-sm"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="flex items-center gap-1.5 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-lg shadow-lg hover:shadow-indigo-600/25 transition-all cursor-pointer text-sm disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <Check className="w-4 h-4 stroke-[3]" />
                <span>Save Settlement</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettleUpModal;
