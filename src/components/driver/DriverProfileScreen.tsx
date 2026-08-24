import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { User, Lock, Phone, Mail, ShieldCheck, LogOut, Check, AlertCircle, KeyRound, X } from 'lucide-react';

export const DriverProfileScreen: React.FC = () => {
  const { user, employee, logout, showToast } = useAuth();
  const [showPasswordModal, setShowPasswordModal] = useState<boolean>(false);
  const [currentPassword, setCurrentPassword] = useState<string>('');
  const [newPassword, setNewPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [modalError, setModalError] = useState<string | null>(null);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);

    if (newPassword.length < 6) {
      setModalError('New password must be at least 6 characters.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setModalError('New password and confirm password do not match.');
      return;
    }

    if (!user?.id) return;

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          currentPassword,
          newPassword,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        showToast('success', 'Password Updated', 'Your login password has been changed successfully.');
        setShowPasswordModal(false);
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        setModalError(data.error || 'Failed to update password.');
      }
    } catch {
      setModalError('Network error connecting to authentication server.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col h-full space-y-4 pb-4">
      {/* Driver Avatar Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl text-center relative overflow-hidden">
        <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-bold text-2xl mx-auto shadow-lg mb-3">
          {employee?.name ? employee.name.charAt(0).toUpperCase() : 'D'}
        </div>
        <h2 className="text-xl font-bold text-slate-100">{employee?.name || 'Driver'}</h2>
        <p className="text-xs text-slate-400 font-mono mt-0.5">Code: {employee?.employee_code || 'N/A'}</p>

        <div className="flex items-center justify-center gap-2 mt-3">
          <span className="px-3 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
            <ShieldCheck className="w-3 h-3" /> Account Active
          </span>
          <span className="px-3 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">
            Approved Driver
          </span>
        </div>
      </div>

      {/* Details List */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-md space-y-3 text-xs">
        <h3 className="font-bold text-slate-300 text-[11px] uppercase tracking-wider mb-2">Driver Information</h3>

        <div className="flex items-center justify-between py-2 border-b border-slate-800/80">
          <span className="text-slate-500 flex items-center gap-2">
            <User className="w-4 h-4 text-slate-400" /> Username
          </span>
          <span className="font-mono font-semibold text-slate-200">{employee?.username || user?.username}</span>
        </div>

        <div className="flex items-center justify-between py-2 border-b border-slate-800/80">
          <span className="text-slate-500 flex items-center gap-2">
            <Phone className="w-4 h-4 text-slate-400" /> Mobile Number
          </span>
          <span className="font-semibold text-slate-200">{employee?.phone || 'N/A'}</span>
        </div>

        <div className="flex items-center justify-between py-2 border-b border-slate-800/80">
          <span className="text-slate-500 flex items-center gap-2">
            <Mail className="w-4 h-4 text-slate-400" /> Email Address
          </span>
          <span className="font-semibold text-slate-200">{employee?.email || 'N/A'}</span>
        </div>
      </div>

      {/* Actions */}
      <div className="space-y-2">
        <button
          onClick={() => setShowPasswordModal(true)}
          className="w-full p-3.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 rounded-2xl text-xs font-semibold text-slate-200 flex items-center justify-between transition-colors cursor-pointer"
        >
          <span className="flex items-center gap-2.5">
            <KeyRound className="w-4 h-4 text-blue-400" /> Change Login Password
          </span>
          <span className="text-slate-500 text-[10px]">Optional &bull; &rarr;</span>
        </button>

        <button
          onClick={logout}
          className="w-full p-3.5 bg-rose-950/30 hover:bg-rose-950/50 border border-rose-800/40 hover:border-rose-700/60 rounded-2xl text-xs font-semibold text-rose-300 flex items-center justify-center gap-2 transition-colors cursor-pointer"
        >
          <LogOut className="w-4 h-4" /> Sign Out of Application
        </button>
      </div>

      {/* Change Password Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden">
            <div className="p-4 bg-slate-800/80 border-b border-slate-700/60 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-blue-400" />
                <h3 className="font-bold text-sm text-slate-100">Change Password</h3>
              </div>
              <button
                onClick={() => setShowPasswordModal(false)}
                className="p-1 text-slate-400 hover:text-slate-200 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handlePasswordChange} className="p-5 space-y-3.5 text-xs">
              {modalError && (
                <div className="p-3 bg-rose-950/40 border border-rose-800/60 rounded-xl text-rose-200 text-[11px] flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <span>{modalError}</span>
                </div>
              )}

              <div>
                <label className="text-slate-400 block mb-1">Current Password</label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                  placeholder="Enter current password"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">New Password (min. 6 chars)</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  placeholder="Enter new password"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Confirm New Password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  placeholder="Re-enter new password"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="pt-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowPasswordModal(false)}
                  className="w-1/3 py-2.5 font-bold text-slate-400 bg-slate-800 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-2.5 font-bold text-white bg-blue-600 hover:bg-blue-500 rounded-xl flex items-center justify-center gap-1.5 shadow-md disabled:opacity-50"
                >
                  <Check className="w-4 h-4" /> Save New Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
