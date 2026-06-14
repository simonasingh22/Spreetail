import React, { useState, useEffect, useRef } from 'react';
import { useExpenseChat } from '../hooks/useExpenseChat';
import { useAuthStore } from '../stores/authStore';
import { Send, Loader2, MessageSquare } from 'lucide-react';

interface ExpenseChatProps {
  expenseId: string;
}

export const ExpenseChat: React.FC<ExpenseChatProps> = ({ expenseId }) => {
  const { messages, isLoading, sendMessage } = useExpenseChat(expenseId);
  const currentUser = useAuthStore((state) => state.user);
  const [inputText, setInputText] = useState('');
  
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const scrollToBottom = (behavior: 'smooth' | 'auto' = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  };

  // Auto-scroll on new messages or history load
  useEffect(() => {
    scrollToBottom('smooth');
  }, [messages, isLoading]);

  const handleSend = () => {
    const trimmed = inputText.trim();
    if (!trimmed) return;
    sendMessage(trimmed);
    setInputText('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-900/50 rounded-2xl border border-slate-800 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 bg-slate-900/80 border-b border-slate-800 flex items-center gap-2">
        <MessageSquare className="w-4 h-4 text-indigo-400" />
        <h4 className="font-bold text-xs text-slate-200 uppercase tracking-wider">Comments & Chat</h4>
      </div>

      {/* Messages Thread */}
      <div className="flex-grow overflow-y-auto p-4 space-y-3 min-h-[200px] max-h-[350px]">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-full py-10">
            <Loader2 className="w-6 h-6 animate-spin text-indigo-500 mb-2" />
            <p className="text-slate-500 text-xs">Loading comments...</p>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full py-16 text-center">
            <MessageSquare className="w-8 h-8 text-slate-700 mb-2" />
            <p className="text-slate-400 font-semibold text-xs">No comments yet</p>
            <p className="text-slate-600 text-[10px] mt-0.5">Start the conversation below.</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.userId === currentUser?.id;
            
            // Format timestamp nicely
            let timeStr = '';
            try {
              timeStr = new Date(msg.createdAt).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit'
              });
            } catch (e) {
              timeStr = '';
            }

            return (
              <div
                key={msg.id}
                className={`flex flex-col max-w-[85%] ${isMe ? 'ml-auto items-end' : 'mr-auto items-start'}`}
              >
                {/* Sender Name (only for others) */}
                {!isMe && (
                  <span className="text-[10px] text-slate-400 font-semibold mb-1 px-1">
                    {msg.userName}
                  </span>
                )}

                {/* Message Bubble */}
                <div
                  className={`px-3 py-2 rounded-2xl text-xs break-words shadow ${
                    isMe
                      ? 'bg-indigo-600 text-white rounded-tr-none'
                      : 'bg-slate-800 text-slate-100 rounded-tl-none border border-slate-750'
                  }`}
                >
                  {msg.content === null ? (
                    <span className="text-slate-500 italic">This message was deleted.</span>
                  ) : (
                    msg.content
                  )}
                </div>

                {/* Time Indicator */}
                <span className="text-[9px] text-slate-500 mt-1 px-1">
                  {timeStr}
                </span>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input Bar (No HTML form tag) */}
      <div className="p-3 bg-slate-900/60 border-t border-slate-800 flex items-center gap-2">
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Write a comment..."
          maxLength={1000}
          className="flex-grow bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-transparent transition-all"
        />
        <button
          onClick={handleSend}
          disabled={!inputText.trim()}
          className="p-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-30 disabled:bg-indigo-800 text-white rounded-xl shadow transition-all cursor-pointer"
        >
          <Send className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};

export default ExpenseChat;
