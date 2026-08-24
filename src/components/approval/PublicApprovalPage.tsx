import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import type { ApprovalRequest, Employee } from '../../types';
import { ShieldCheck, CheckCircle2, XCircle, AlertCircle, ArrowLeft, Clock, UserCheck, Lock } from 'lucide-react';
import confetti from 'canvas-confetti';

interface PublicApprovalPageProps {
  token: string;
  onExit: () => void;
}

export const PublicApprovalPage: React.FC<PublicApprovalPageProps> = ({ token, onExit }) => {
  const { showToast } = useAuth();
  const [request, setRequest] = useState<ApprovalRequest | null>(null);
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);

  const fetchRequestDetails = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/approval/${token}`);
      const data = await res.json();
      if (res.ok) {
        setRequest(data.request);
        setEmployee(data.employee);
      } else {
        setErrorMsg(data.error || 'Invalid or expired approval token.');
      }
    } catch {
      setErrorMsg('Failed to connect to authentication server.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRequestDetails();
  }, [token]);

  const handleAction = async (action: 'activate' | 'reject') => {
    setIsProcessing(true);
    try {
      const res = await fetch(`/api/approval/${token}/${action}`, {
        method: 'POST',
      });
      const data = await res.json();
      if (res.ok) {
        if (action === 'activate') {
          confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
          showToast('success', 'Driver Activated', data.message);
        } else {
          showToast('info', 'Driver Rejected', data.message);
        }
        setActionSuccessMsg(data.message);
        await fetchRequestDetails();
      } else {
        setErrorMsg(data.error || 'Failed to complete approval action.');
        showToast('error', 'Action Error', data.error);
      }
    } catch {
      setErrorMsg('Network communication error.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-4">
      {/* Top Banner Navigation */}
      <div className="w-full max-w-xl mb-4 flex items-center justify-between">
        <button
          onClick={onExit}
          className="flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-slate-200 bg-slate-900 border border-slate-800 px-3.5 py-2 rounded-xl transition-all shadow-sm"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Main App
        </button>
        <span className="text-xs font-mono text-slate-500 flex items-center gap-1.5">
          <Lock className="w-3.5 h-3.5 text-emerald-400" /> End-to-End Secure Token
        </span>
      </div>

      <div className="w-full max-w-xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-6 bg-gradient-to-b from-slate-800/80 to-slate-900 border-b border-slate-800 text-center relative">
          <div className="w-14 h-14 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 text-indigo-400 flex items-center justify-center mx-auto mb-3 shadow-lg">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-slate-100 tracking-tight">Higher Authority Approval Portal</h2>
          <p className="text-xs text-slate-400 mt-1">One-Time Driver Account Activation Service</p>
        </div>

        {/* Content */}
        <div className="p-6 sm:p-8 space-y-6">
          {isLoading ? (
            <div className="py-12 text-center text-slate-400 space-y-3">
              <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs font-medium">Validating cryptographic token...</p>
            </div>
          ) : errorMsg ? (
            <div className="p-4 bg-rose-950/40 border border-rose-800/60 rounded-2xl text-rose-200 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold text-sm">Approval Token Issue</h4>
                <p className="text-xs mt-1 text-rose-300/90 leading-relaxed">{errorMsg}</p>
              </div>
            </div>
          ) : request && employee ? (
            <div className="space-y-6">
              {/* Success Message Banner if just processed */}
              {actionSuccessMsg && (
                <div className="p-4 bg-emerald-950/40 border border-emerald-700/60 rounded-2xl text-emerald-200 flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-bold text-sm">Action Successfully Recorded</h4>
                    <p className="text-xs mt-1 text-emerald-300/90 leading-relaxed">{actionSuccessMsg}</p>
                  </div>
                </div>
              )}

              {/* Driver Identity Card */}
              <div className="bg-slate-950/60 border border-slate-800/90 rounded-2xl p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
                  <div>
                    <span className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">Candidate Driver</span>
                    <h3 className="text-lg font-bold text-slate-100">{employee.name}</h3>
                  </div>
                  <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/30">
                    {employee.employee_code}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-slate-500 block">Username</span>
                    <span className="font-semibold text-slate-200 font-mono">{employee.username}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Contact Phone</span>
                    <span className="font-semibold text-slate-200">{employee.phone}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Email Address</span>
                    <span className="font-semibold text-slate-200">{employee.email}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Created On</span>
                    <span className="font-semibold text-slate-200 font-mono">
                      {new Date(request.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                {/* Status Indicator */}
                <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs">
                  <span className="text-slate-400">Current Status:</span>
                  <span
                    className={`font-bold px-2.5 py-0.5 rounded-full text-[11px] ${
                      request.status === 'APPROVED'
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : request.status === 'REJECTED'
                        ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                        : request.status === 'EXPIRED'
                        ? 'bg-slate-800 text-slate-400 border border-slate-700'
                        : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                    }`}
                  >
                    {request.status === 'PENDING' ? 'AWAITING YOUR APPROVAL' : request.status}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              {request.status === 'PENDING' ? (
                <div className="space-y-3">
                  <p className="text-xs text-slate-400 text-center leading-relaxed">
                    By clicking <strong className="text-emerald-400">ACTIVATE DRIVER</strong>, you authorize this driver to log in and start recording attendance immediately.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                    <button
                      onClick={() => handleAction('activate')}
                      disabled={isProcessing}
                      className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3.5 px-4 rounded-xl shadow-lg shadow-emerald-950/50 transition-all flex items-center justify-center gap-2 cursor-pointer text-sm"
                    >
                      <CheckCircle2 className="w-5 h-5" /> ACTIVATE DRIVER
                    </button>
                    <button
                      onClick={() => handleAction('reject')}
                      disabled={isProcessing}
                      className="w-full bg-rose-600 hover:bg-rose-500 text-white font-bold py-3.5 px-4 rounded-xl shadow-lg shadow-rose-950/50 transition-all flex items-center justify-center gap-2 cursor-pointer text-sm"
                    >
                      <XCircle className="w-5 h-5" /> REJECT DRIVER
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-xl text-center space-y-2">
                  <p className="text-xs text-slate-300">
                    This approval token has been processed as <strong className="text-slate-100">{request.status}</strong> on{' '}
                    {request.approved_at || request.rejected_at ? new Date((request.approved_at || request.rejected_at)!).toLocaleString() : 'N/A'}.
                  </p>
                  <p className="text-[11px] text-slate-500">Security tokens cannot be reused once submitted.</p>
                </div>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};
