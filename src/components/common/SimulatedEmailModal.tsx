import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import type { ApprovalRequest } from '../../types';
import { Mail, ShieldCheck, XCircle, CheckCircle, ExternalLink, RefreshCw, X, AlertTriangle } from 'lucide-react';
import confetti from 'canvas-confetti';

export const SimulatedEmailModal: React.FC = () => {
  const { isEmailInboxOpen, setIsEmailInboxOpen, showToast, setActivePublicApprovalToken } = useAuth();
  const [approvals, setApprovals] = useState<ApprovalRequest[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<ApprovalRequest | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchApprovals = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/admin/approvals');
      if (res.ok) {
        const data = await res.json();
        setApprovals(data.approvals || []);
        if (data.approvals?.length > 0 && !selectedRequest) {
          setSelectedRequest(data.approvals[0]);
        }
      }
    } catch {
      // Ignored
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isEmailInboxOpen) {
      fetchApprovals();
    }
  }, [isEmailInboxOpen]);

  if (!isEmailInboxOpen) return null;

  const handleAction = async (token: string, action: 'activate' | 'reject') => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/approval/${token}/${action}`, {
        method: 'POST',
      });
      const data = await res.json();
      if (res.ok) {
        if (action === 'activate') {
          confetti({ particleCount: 80, spread: 60, origin: { y: 0.6 } });
          showToast('success', 'Driver Activated', data.message);
        } else {
          showToast('info', 'Driver Rejected', data.message);
        }
        await fetchApprovals();
        // Update selected request state
        if (selectedRequest) {
          setSelectedRequest((prev) => (prev ? { ...prev, status: action === 'activate' ? 'APPROVED' : 'REJECTED' } : null));
        }
      } else {
        showToast('error', 'Action Failed', data.error);
      }
    } catch (err: any) {
      showToast('error', 'Network Error', 'Failed to communicate with server.');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="p-4 bg-slate-800/90 border-b border-slate-700/60 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600/20 text-indigo-400 flex items-center justify-center border border-indigo-500/30">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-slate-100 text-base">Higher Authority Email Inbox</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  Simulation & Testing
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Approvals are sent to: <span className="text-indigo-300 font-mono">approvals@company.com</span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchApprovals}
              disabled={isLoading}
              className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-700/50 rounded-xl transition-colors"
              title="Refresh Emails"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={() => setIsEmailInboxOpen(false)}
              className="p-2 text-slate-400 hover:text-slate-100 hover:bg-slate-700/50 rounded-xl transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex flex-1 min-h-[420px] overflow-hidden">
          {/* Email List Sidebar */}
          <div className="w-1/3 border-r border-slate-800 bg-slate-950/50 overflow-y-auto p-2 space-y-2">
            {approvals.length === 0 ? (
              <div className="p-4 text-center text-xs text-slate-500">No approval emails found.</div>
            ) : (
              approvals.map((req) => {
                const isSelected = selectedRequest?.id === req.id;
                return (
                  <button
                    key={req.id}
                    onClick={() => setSelectedRequest(req)}
                    className={`w-full text-left p-3 rounded-xl border transition-all ${
                      isSelected
                        ? 'bg-indigo-950/40 border-indigo-500/50 shadow-md'
                        : 'bg-slate-900/60 border-slate-800 hover:bg-slate-800/40'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold text-xs text-slate-200 truncate">{req.employee_name}</span>
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                          req.status === 'APPROVED'
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : req.status === 'REJECTED'
                            ? 'bg-rose-500/20 text-rose-400'
                            : req.status === 'EXPIRED'
                            ? 'bg-slate-700 text-slate-400'
                            : 'bg-amber-500/20 text-amber-400'
                        }`}
                      >
                        {req.status}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 font-mono">{req.employee_code}</p>
                    <p className="text-[10px] text-slate-500 mt-1">
                      {new Date(req.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </button>
                );
              })
            )}
          </div>

          {/* Email Reading Pane */}
          <div className="flex-1 bg-slate-900/70 p-6 overflow-y-auto flex flex-col justify-between">
            {selectedRequest ? (
              <div className="space-y-5">
                {/* Email Meta Card */}
                <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-xl space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">Subject:</span>
                    <span className="font-semibold text-slate-200 text-sm">
                      Driver Account Activation Request - {selectedRequest.employee_name}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>From:</span>
                    <span className="font-mono text-slate-300">attendance-system@company.com</span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>To:</span>
                    <span className="font-mono text-indigo-400">{selectedRequest.approval_email}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>Date:</span>
                    <span>{new Date(selectedRequest.created_at).toLocaleString()}</span>
                  </div>
                </div>

                {/* Email Body */}
                <div className="p-5 bg-white text-slate-900 rounded-xl shadow-md space-y-4 text-sm font-sans border border-slate-200">
                  <div className="border-b border-slate-200 pb-3">
                    <h4 className="font-bold text-base text-slate-900">Driver Account Activation Request</h4>
                    <p className="text-xs text-slate-600 mt-0.5">
                      A new driver profile has been created and requires your one-time activation approval.
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3 py-2 text-xs bg-slate-50 p-3 rounded-lg border border-slate-200 font-mono">
                    <div>
                      <span className="text-slate-500 block">Driver Name:</span>
                      <strong className="text-slate-900 text-sm">{selectedRequest.employee_name}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Employee Code:</span>
                      <strong className="text-slate-900 text-sm">{selectedRequest.employee_code}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Username:</span>
                      <strong className="text-indigo-600">{selectedRequest.username}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Created By:</span>
                      <strong className="text-slate-700">Admin</strong>
                    </div>
                  </div>

                  <p className="text-xs text-slate-600 leading-relaxed">
                    Please approve or reject this driver account. Upon approval, the driver will be enabled to log in with the credentials provided by the Admin.
                  </p>

                  {/* Actions inside Email */}
                  {selectedRequest.status === 'PENDING' ? (
                    <div className="pt-2 flex flex-col sm:flex-row gap-3">
                      <button
                        onClick={() => handleAction(selectedRequest.raw_token, 'activate')}
                        disabled={actionLoading}
                        className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 px-4 rounded-lg text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <CheckCircle className="w-4 h-4" /> ACTIVATE DRIVER
                      </button>
                      <button
                        onClick={() => handleAction(selectedRequest.raw_token, 'reject')}
                        disabled={actionLoading}
                        className="flex-1 bg-rose-600 hover:bg-rose-700 text-white font-bold py-2.5 px-4 rounded-lg text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <XCircle className="w-4 h-4" /> REJECT DRIVER
                      </button>
                    </div>
                  ) : (
                    <div
                      className={`p-3 rounded-lg text-xs font-semibold flex items-center gap-2 ${
                        selectedRequest.status === 'APPROVED'
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                          : selectedRequest.status === 'REJECTED'
                          ? 'bg-rose-100 text-rose-800 border border-rose-300'
                          : 'bg-slate-100 text-slate-700 border border-slate-300'
                      }`}
                    >
                      {selectedRequest.status === 'APPROVED' && <CheckCircle className="w-4 h-4 text-emerald-600" />}
                      {selectedRequest.status === 'REJECTED' && <XCircle className="w-4 h-4 text-rose-600" />}
                      This request has been {selectedRequest.status}. Token is now closed.
                    </div>
                  )}

                  {/* Direct Link to Standalone Landing Page */}
                  <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-500">
                    <span>Secure Token Link:</span>
                    <button
                      onClick={() => {
                        setActivePublicApprovalToken(selectedRequest.raw_token);
                        setIsEmailInboxOpen(false);
                      }}
                      className="text-indigo-600 hover:underline flex items-center gap-1 font-medium"
                    >
                      Open Public Landing View <ExternalLink className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-500 text-xs">
                Select an email from the list to view.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
