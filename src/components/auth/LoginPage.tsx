import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Truck, Lock, User, Eye, EyeOff, ShieldCheck, Mail, ArrowRight, AlertCircle, Sparkles } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { login, setIsEmailInboxOpen, unreadEmailCount } = useAuth();
  const [username, setUsername] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsLoading(true);

    const result = await login(username, password);
    if (!result.success) {
      setErrorMsg(result.error || 'Invalid credentials.');
    }
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4 selection:bg-blue-500 selection:text-white relative">
      {/* Background ambient lighting */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Main Container */}
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden relative z-10">
        {/* Brand Header */}
        <div className="p-6 text-center bg-gradient-to-b from-slate-800/80 to-slate-900 border-b border-slate-800/90 relative">
          <div className="w-14 h-14 rounded-2xl bg-blue-600/20 text-blue-400 flex items-center justify-center mx-auto mb-3 border border-blue-500/30 shadow-lg shadow-blue-950/50">
            <Truck className="w-7 h-7" />
          </div>
          <h1 className="text-xl font-black tracking-tight text-slate-100">TRANS-LOGIX</h1>
          <p className="text-xs text-slate-400 mt-1">Driver Attendance & Odometer Management</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-4">
          {errorMsg && (
            <div className="p-3.5 bg-rose-950/40 border border-rose-800/60 rounded-2xl text-rose-200 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div className="leading-relaxed">{errorMsg}</div>
            </div>
          )}

          {/* Username */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">Username or Employee Code</label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter username or employee code"
                className="w-full bg-slate-950 border border-slate-700/80 rounded-2xl pl-10 pr-4 py-3 text-xs text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-blue-500 transition-colors font-mono"
              />
            </div>
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-300">Password</label>
            </div>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                className="w-full bg-slate-950 border border-slate-700/80 rounded-2xl pl-10 pr-10 py-3 text-xs text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-blue-500 transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-3.5 text-slate-500 hover:text-slate-300"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold py-3.5 px-4 rounded-2xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-blue-900/40 transition-all cursor-pointer mt-2"
          >
            {isLoading ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <span>Sign In</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>
      </div>

      {/* Authority Email Inbox Launcher */}
      <div className="mt-4 text-center">
        <button
          type="button"
          onClick={() => setIsEmailInboxOpen(true)}
          className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 flex items-center gap-2 bg-slate-900/80 px-4 py-2 rounded-full border border-indigo-500/30 shadow-md cursor-pointer"
        >
          <Mail className="w-3.5 h-3.5" />
          <span>Higher Authority Email Inbox</span>
          {unreadEmailCount > 0 && (
            <span className="px-1.5 py-0.2 bg-indigo-500 text-white rounded-full text-[10px] font-bold font-mono">
              {unreadEmailCount}
            </span>
          )}
        </button>
      </div>
    </div>
  );
};
