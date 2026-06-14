import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { loginUser } from '../api/auth.api';
import { useAuthStore } from '../stores/authStore';
import { Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

export const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const navigate = useNavigate();
  const login = useAuthStore((state) => state.login);

  const handleLogin = async () => {
    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await loginUser(email, password);
      const { accessToken, user } = response.data;
      
      login(accessToken, user);
      toast.success('Logged in successfully!');
      navigate('/');
    } catch (err: any) {
      const errMsg = err.response?.data?.error || 'Login failed. Please check your credentials.';
      setError(errMsg);
      toast.error(errMsg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen grid grid-cols-1 md:grid-cols-12 bg-slate-950 overflow-hidden font-sans">
      {/* Left Column: Premium Brand Panel */}
      <div className="hidden md:flex md:col-span-5 flex-col justify-between p-12 bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 border-r border-slate-800/60 relative overflow-hidden">
        {/* Decorative ambient lighting */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -left-20 w-80 h-80 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />

        {/* Brand Header */}
        <div className="flex items-center space-x-3 z-10">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-600/15">
            <span className="text-xl font-serif font-bold text-slate-950">S</span>
          </div>
          <span className="text-xl font-serif font-bold text-slate-100 tracking-wider">Spreetail</span>
        </div>

        {/* Hero Concept */}
        <div className="my-auto z-10 space-y-6 max-w-sm">
          <h2 className="text-4xl font-serif font-bold text-slate-100 leading-tight">
            Simplify sharing. Elevate settling.
          </h2>
          <p className="text-slate-400 text-sm leading-relaxed">
            Experience a premium peer-to-peer ledger designed with absolute precision. Track splits, manage balances, and settle instantly in a few clicks.
          </p>
          <div className="space-y-3 pt-6 border-t border-slate-800/80">
            <div className="flex items-center space-x-3 text-slate-300 text-xs font-semibold uppercase tracking-wider">
              <span className="text-indigo-400">✦</span> 4 Splitting Models
            </div>
            <div className="flex items-center space-x-3 text-slate-300 text-xs font-semibold uppercase tracking-wider">
              <span className="text-indigo-400">✦</span> Greedy Transaction Minimizer
            </div>
            <div className="flex items-center space-x-3 text-slate-300 text-xs font-semibold uppercase tracking-wider">
              <span className="text-indigo-400">✦</span> Real-time Chat Threads
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="z-10 text-xs text-slate-500 font-medium uppercase tracking-wider">
          © 2026 Spreetail Inc.
        </div>
      </div>

      {/* Right Column: Form Panel */}
      <div className="col-span-1 md:col-span-7 flex items-center justify-center p-8 md:p-16 relative">
        <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />
        
        <div className="w-full max-w-md space-y-8 z-10">
          <div>
            <h1 className="text-4xl font-bold text-slate-100 tracking-tight font-serif">Sign In</h1>
            <p className="text-slate-400 text-sm mt-2">Enter your email and password to access your ledgers</p>
          </div>

          {/* Input Fields */}
          <div className="space-y-5">
            <div>
              <label className="block text-slate-300 text-xs font-semibold uppercase tracking-wider mb-2">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3.5 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all duration-200"
              />
            </div>

            <div>
              <label className="block text-slate-300 text-xs font-semibold uppercase tracking-wider mb-2">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3.5 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all duration-200"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleLogin();
                }}
              />
            </div>
          </div>

          {/* Error message */}
          {error && (
            <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl px-4 py-3 text-sm">
              {error}
            </div>
          )}

          {/* Action Button */}
          <div className="space-y-4">
            <button
              onClick={handleLogin}
              disabled={isLoading}
              className="w-full flex items-center justify-center bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800 disabled:opacity-50 text-slate-950 font-bold py-3.5 px-4 rounded-xl shadow-lg hover:shadow-indigo-600/15 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 cursor-pointer"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin mr-2" />
                  Signing In...
                </>
              ) : (
                'Sign In'
              )}
            </button>
          </div>

          {/* Register Redirect */}
          <div className="text-center pt-2">
            <p className="text-slate-400 text-sm">
              Don't have an account?{' '}
              <Link to="/register" className="text-indigo-400 hover:text-indigo-300 hover:underline font-semibold transition-all">
                Sign up here
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
