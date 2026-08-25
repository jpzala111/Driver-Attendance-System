import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import type { Employee } from '../../types';
import {
  Users,
  Plus,
  Search,
  Filter,
  RefreshCw,
  Mail,
  KeyRound,
  Edit2,
  ShieldCheck,
  ShieldAlert,
  CheckCircle2,
  XCircle,
  AlertCircle,
  X,
  Check,
  Send,
  Lock,
  Copy,
  ExternalLink,
} from 'lucide-react';
import confetti from 'canvas-confetti';

export const AdminDrivers: React.FC = () => {
  const { showToast } = useAuth();
  const [drivers, setDrivers] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Modals state
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [showResetPasswordModal, setShowResetPasswordModal] = useState<Employee | null>(null);
  const [showEditModal, setShowEditModal] = useState<Employee | null>(null);
  const [createdSuccessModal, setCreatedSuccessModal] = useState<{
    driver: Employee;
    approvalUrl: string;
    emailRecipient: string;
  } | null>(null);

  // Form states for Create Driver
  const [createForm, setCreateForm] = useState({
    name: '',
    employee_code: '',
    username: '',
    password: '',
    confirmPassword: '',
    phone: '',
    email: '',
    odoo_employee_id: '',
  });
  const [isSubmittingCreate, setIsSubmittingCreate] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Form states for Reset Password
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [isSubmittingReset, setIsSubmittingReset] = useState(false);

  // Form states for Edit Driver
  const [editForm, setEditForm] = useState({
    name: '',
    phone: '',
    email: '',
    odoo_employee_id: '',
  });
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);

  const fetchDrivers = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/admin/drivers');
      if (res.ok) {
        const data = await res.json();
        setDrivers(data.drivers || []);
      }
    } catch {
      // Ignored
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDrivers();
  }, []);

  const handleCreateDriver = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(null);

    if (createForm.password !== createForm.confirmPassword) {
      setCreateError('Password and Confirm Password do not match.');
      return;
    }

    if (createForm.password.length < 6) {
      setCreateError('Password must be at least 6 characters long.');
      return;
    }

    setIsSubmittingCreate(true);
    try {
      const res = await fetch('/api/admin/drivers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-name': 'Admin',
        },
        body: JSON.stringify({
          name: createForm.name,
          employee_code: createForm.employee_code,
          username: createForm.username,
          password: createForm.password,
          phone: createForm.phone,
          email: createForm.email,
          odoo_employee_id: createForm.odoo_employee_id || `ODOO-${createForm.employee_code}`,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        confetti({ particleCount: 80, spread: 60, origin: { y: 0.6 } });
        if (data.email_dispatch && data.email_dispatch.success === false) {
          showToast('error', 'Driver Created — Email Failed', data.message);
        } else {
          showToast('success', 'Driver Created', data.message);
        }
        setShowCreateModal(false);
        if (data.approval_url && data.employee) {
          setCreatedSuccessModal({
            driver: data.employee,
            approvalUrl: data.approval_url,
            emailRecipient: data.approval_request?.approval_email || 'Higher Authority',
          });
        }
        setCreateForm({
          name: '',
          employee_code: '',
          username: '',
          password: '',
          confirmPassword: '',
          phone: '',
          email: '',
          odoo_employee_id: '',
        });
        await fetchDrivers();
      } else {
        setCreateError(data.error || 'Failed to create driver.');
      }
    } catch {
      setCreateError('Network error connecting to backend.');
    } finally {
      setIsSubmittingCreate(false);
    }
  };

  const handleDirectApprove = async (driverId: string, driverName: string) => {
    if (!confirm(`Are you sure you want to directly approve & activate driver ${driverName}? This grants immediate access.`)) {
      return;
    }
    try {
      const res = await fetch(`/api/admin/drivers/${driverId}/approve-direct`, {
        method: 'POST',
        headers: { 'x-admin-name': 'Admin' },
      });
      const data = await res.json();
      if (res.ok) {
        confetti({ particleCount: 80, spread: 60, origin: { y: 0.6 } });
        showToast('success', 'Driver Activated', data.message);
        fetchDrivers();
      } else {
        showToast('error', 'Approval Error', data.error || 'Failed to approve driver directly');
      }
    } catch {
      showToast('error', 'Error', 'Failed to communicate with server');
    }
  };

  const handleCopyApprovalLink = async (driverId: string, driverName: string) => {
    try {
      const res = await fetch(`/api/admin/drivers/${driverId}/resend-approval`, {
        method: 'POST',
        headers: { 'x-admin-name': 'Admin' },
      });
      const data = await res.json();
      if (res.ok && data.approval_url) {
        await navigator.clipboard.writeText(data.approval_url);
        showToast('success', 'Public Link Copied', `Direct approval link for ${driverName} copied to clipboard! You can share it via WhatsApp/Slack.`);
      } else {
        showToast('error', 'Error', data.error || 'Failed to generate approval link');
      }
    } catch {
      showToast('error', 'Error', 'Failed to copy approval link');
    }
  };

  const handleResendApproval = async (driverId: string, driverName: string) => {
    try {
      const res = await fetch(`/api/admin/drivers/${driverId}/resend-approval`, {
        method: 'POST',
        headers: { 'x-admin-name': 'Admin' },
      });
      const data = await res.json();
      if (res.ok) {
        if (data.email_dispatch && data.email_dispatch.success === false) {
          showToast('error', 'Email Not Sent', data.message || `Could not deliver the approval email for ${driverName}. Use the copy-link option instead.`);
        } else {
          showToast('success', 'Approval Request Dispatched', `Approval email sent to Boss at ${data.approval_request?.approval_email || 'Boss Inbox'} for ${driverName}`);
        }
        fetchDrivers();
      } else {
        showToast('error', 'Error', data.error || 'Failed to resend approval');
      }
    } catch {
      showToast('error', 'Error', 'Failed to communicate with server');
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showResetPasswordModal) return;

    if (newPassword !== confirmNewPassword) {
      showToast('error', 'Validation Error', 'Passwords do not match');
      return;
    }

    if (newPassword.length < 6) {
      showToast('error', 'Validation Error', 'Password must be at least 6 characters');
      return;
    }

    setIsSubmittingReset(true);
    try {
      const res = await fetch(`/api/admin/drivers/${showResetPasswordModal.id}/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-name': 'Admin',
        },
        body: JSON.stringify({ newPassword }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast('success', 'Password Reset', data.message);
        setShowResetPasswordModal(null);
        setNewPassword('');
        setConfirmNewPassword('');
      } else {
        showToast('error', 'Reset Failed', data.error);
      }
    } catch {
      showToast('error', 'Error', 'Failed to communicate with server');
    } finally {
      setIsSubmittingReset(false);
    }
  };

  const handleEditDriver = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showEditModal) return;

    setIsSubmittingEdit(true);
    try {
      const res = await fetch(`/api/admin/drivers/${showEditModal.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-name': 'Admin',
        },
        body: JSON.stringify(editForm),
      });
      const data = await res.json();
      if (res.ok) {
        showToast('success', 'Driver Updated', 'Profile changes saved successfully');
        setShowEditModal(null);
        fetchDrivers();
      } else {
        showToast('error', 'Update Failed', data.error);
      }
    } catch {
      showToast('error', 'Error', 'Failed to update profile');
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  const handleToggleActive = async (driver: Employee) => {
    const newActive = !driver.active;
    try {
      const res = await fetch(`/api/admin/drivers/${driver.id}/toggle-active`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-name': 'Admin',
        },
        body: JSON.stringify({ active: newActive }),
      });
      if (res.ok) {
        showToast('info', 'Status Changed', `${driver.name} is now ${newActive ? 'Active' : 'Inactive'}`);
        fetchDrivers();
      }
    } catch {
      showToast('error', 'Error', 'Failed to toggle status');
    }
  };

  // Filtered List
  const filteredDrivers = drivers.filter((d) => {
    const matchesSearch =
      d.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.employee_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (d.odoo_employee_id || '').toLowerCase().includes(searchTerm.toLowerCase());

    if (!matchesSearch) return false;
    if (statusFilter === 'ALL') return true;
    if (statusFilter === 'PENDING') return d.approval_status === 'PENDING';
    if (statusFilter === 'APPROVED') return d.approval_status === 'APPROVED';
    if (statusFilter === 'REJECTED') return d.approval_status === 'REJECTED';
    if (statusFilter === 'INACTIVE') return !d.active;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header & Action Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-400" />
            <h2 className="text-xl font-bold text-slate-100">Driver Workforce Management</h2>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Admin creates driver accounts with credentials. Higher Authority approves via email.
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-2.5 px-4 rounded-xl text-xs flex items-center gap-2 shadow-lg shadow-blue-900/30 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" /> CREATE DRIVER
        </button>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Search */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search driver by name, code, username..."
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-blue-500"
          />
        </div>

        {/* Status Filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0 text-xs">
          {['ALL', 'PENDING', 'APPROVED', 'REJECTED', 'INACTIVE'].map((tab) => (
            <button
              key={tab}
              onClick={() => setStatusFilter(tab)}
              className={`px-3 py-1.5 rounded-xl font-semibold transition-all whitespace-nowrap cursor-pointer ${
                statusFilter === tab
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-slate-800/80 text-slate-400 hover:text-slate-200'
              }`}
            >
              {tab === 'ALL' ? 'All Drivers' : tab}
            </button>
          ))}
          <button
            onClick={fetchDrivers}
            className="p-2 text-slate-400 hover:text-slate-200 bg-slate-800 rounded-xl"
            title="Refresh list"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Drivers Data Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 text-slate-400 font-semibold border-b border-slate-800">
              <tr>
                <th className="py-3.5 px-4">Code</th>
                <th className="py-3.5 px-4">Driver Name</th>
                <th className="py-3.5 px-4">Username</th>
                <th className="py-3.5 px-4">Contact</th>
                <th className="py-3.5 px-4">Approval Status</th>
                <th className="py-3.5 px-4">Account Status</th>
                <th className="py-3.5 px-4">Odoo ID</th>
                <th className="py-3.5 px-4">Work Done</th>
                <th className="py-3.5 px-4 text-right">Admin Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {isLoading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-500">
                    Loading driver roster...
                  </td>
                </tr>
              ) : filteredDrivers.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-500">
                    No drivers match the current filters.
                  </td>
                </tr>
              ) : (
                filteredDrivers.map((driver) => {
                  const isApproved = driver.approval_status === 'APPROVED';
                  const isPending = driver.approval_status === 'PENDING';
                  const isRejected = driver.approval_status === 'REJECTED';

                  return (
                    <tr key={driver.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-blue-400">{driver.employee_code}</td>
                      <td className="py-3.5 px-4">
                        <span className="font-bold text-slate-200 block">{driver.name}</span>
                        <span className="text-[10px] text-slate-500">
                          Created: {new Date(driver.created_at).toLocaleDateString()}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-slate-300">{driver.username}</td>
                      <td className="py-3.5 px-4 text-slate-400">
                        <div>{driver.phone}</div>
                        <div className="text-[10px] text-slate-500">{driver.email}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border inline-flex items-center gap-1 ${
                            isApproved
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                              : isPending
                              ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                              : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                          }`}
                        >
                          {driver.approval_status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            driver.active
                              ? 'bg-blue-500/10 text-blue-400 border border-blue-500/30'
                              : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          {driver.account_status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-[11px] text-slate-400">
                        {driver.odoo_employee_id || '—'}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-[11px] text-slate-300">
                        <div>{driver.total_sessions || 0} sessions</div>
                        <div className="text-slate-500">{driver.total_distance_km || 0} KM</div>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5 flex-wrap">
                          {isPending && (
                            <>
                              <button
                                onClick={() => handleDirectApprove(driver.id, driver.name)}
                                className="px-2 py-1 bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-300 rounded-lg text-[11px] font-bold border border-emerald-500/30 flex items-center gap-1 cursor-pointer"
                                title="Direct Admin Approval (Instant Activation)"
                              >
                                <CheckCircle2 className="w-3 h-3 text-emerald-400" /> Approve
                              </button>
                              <button
                                onClick={() => handleCopyApprovalLink(driver.id, driver.name)}
                                className="px-2 py-1 bg-blue-600/20 hover:bg-blue-600/40 text-blue-300 rounded-lg text-[11px] font-medium border border-blue-500/30 flex items-center gap-1 cursor-pointer"
                                title="Copy public approval link to clipboard"
                              >
                                <Copy className="w-3 h-3" /> Copy Link
                              </button>
                              <button
                                onClick={() => handleResendApproval(driver.id, driver.name)}
                                className="px-2 py-1 bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-300 rounded-lg text-[11px] font-medium border border-indigo-500/30 flex items-center gap-1 cursor-pointer"
                                title="Resend approval email to higher authority"
                              >
                                <Send className="w-3 h-3" /> Resend
                              </button>
                            </>
                          )}
                          <button
                            onClick={() => {
                              setShowEditModal(driver);
                              setEditForm({
                                name: driver.name,
                                phone: driver.phone,
                                email: driver.email,
                                odoo_employee_id: driver.odoo_employee_id || '',
                              });
                            }}
                            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg"
                            title="Edit Driver Profile"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              setShowResetPasswordModal(driver);
                              setNewPassword('');
                              setConfirmNewPassword('');
                            }}
                            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-amber-300 rounded-lg"
                            title="Reset Driver Password"
                          >
                            <KeyRound className="w-3.5 h-3.5" />
                          </button>
                          {isApproved && (
                            <button
                              onClick={() => handleToggleActive(driver)}
                              className={`p-1.5 rounded-lg ${
                                driver.active
                                  ? 'bg-rose-950/40 text-rose-300 hover:bg-rose-900/60'
                                  : 'bg-emerald-950/40 text-emerald-300 hover:bg-emerald-900/60'
                              }`}
                              title={driver.active ? 'Deactivate Account' : 'Reactivate Account'}
                            >
                              {driver.active ? <XCircle className="w-3.5 h-3.5" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE DRIVER MODAL (Requirement #6, #7, #8, #9, #10, #54) */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
            <div className="p-4 bg-slate-800/80 border-b border-slate-700/60 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-600/20 text-blue-400 flex items-center justify-center">
                  <Plus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-100 text-sm">Create Driver Account</h3>
                  <p className="text-[11px] text-slate-400">Creates profile & triggers one-time approval request</p>
                </div>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-200 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateDriver} className="p-5 overflow-y-auto space-y-4 text-xs">
              {createError && (
                <div className="p-3 bg-rose-950/40 border border-rose-800/60 rounded-xl text-rose-200 flex items-start gap-2 text-xs">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <span>{createError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1">Driver Full Name *</label>
                  <input
                    type="text"
                    required
                    value={createForm.name}
                    onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                    placeholder="e.g. Ramesh Chandra"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="text-slate-400 block mb-1">Unique Employee Code *</label>
                  <input
                    type="text"
                    required
                    value={createForm.employee_code}
                    onChange={(e) => setCreateForm({ ...createForm, employee_code: e.target.value.toUpperCase() })}
                    placeholder="e.g. DR004"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 font-mono text-slate-100 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1">Driver Login Username *</label>
                  <input
                    type="text"
                    required
                    value={createForm.username}
                    onChange={(e) => setCreateForm({ ...createForm, username: e.target.value.toLowerCase() })}
                    placeholder="e.g. ramesh004"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 font-mono text-slate-100 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="text-slate-400 block mb-1">Odoo Employee Mapping ID</label>
                  <input
                    type="text"
                    value={createForm.odoo_employee_id}
                    onChange={(e) => setCreateForm({ ...createForm, odoo_employee_id: e.target.value })}
                    placeholder="e.g. ODOO-EMP-104"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 font-mono text-slate-100 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1">Mobile Number *</label>
                  <input
                    type="tel"
                    required
                    value={createForm.phone}
                    onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })}
                    placeholder="+91 98765 43210"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="text-slate-400 block mb-1">Email Address *</label>
                  <input
                    type="email"
                    required
                    value={createForm.email}
                    onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                    placeholder="driver@company.com"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Password created by Admin (Requirement #9) */}
              <div className="p-3.5 bg-slate-950/60 border border-slate-800 rounded-2xl space-y-3">
                <span className="text-[11px] font-bold text-slate-300 block">Initial Login Credentials</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-slate-400 block mb-1">Driver Password *</label>
                    <input
                      type="password"
                      required
                      value={createForm.password}
                      onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                      placeholder="Enter initial password"
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 block mb-1">Confirm Password *</label>
                    <input
                      type="password"
                      required
                      value={createForm.confirmPassword}
                      onChange={(e) => setCreateForm({ ...createForm, confirmPassword: e.target.value })}
                      placeholder="Re-enter password"
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
                <p className="text-[10px] text-slate-500">
                  Password will be hashed with bcrypt. Admin will communicate this password to the driver securely.
                </p>
              </div>

              {/* Workflow notice */}
              <div className="p-3 bg-indigo-950/30 border border-indigo-800/40 rounded-xl text-[11px] text-indigo-300">
                Clicking <strong>SEND REQUEST</strong> will create the driver profile with status <strong>PENDING APPROVAL</strong> and dispatch a single approval email to the Higher Authority.
              </div>

              <div className="pt-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="w-1/3 py-2.5 font-bold text-slate-400 bg-slate-800 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingCreate}
                  className="flex-1 py-2.5 font-bold text-white bg-blue-600 hover:bg-blue-500 rounded-xl flex items-center justify-center gap-2 shadow-md disabled:opacity-50 cursor-pointer transition-all"
                >
                  {isSubmittingCreate ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Creating &amp; Sending Request...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>SEND REQUEST</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RESET PASSWORD MODAL */}
      {showResetPasswordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-sm shadow-2xl p-5 space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="font-bold text-sm text-slate-100">Reset Driver Password</h3>
                <p className="text-[11px] text-slate-400">{showResetPasswordModal.name} ({showResetPasswordModal.employee_code})</p>
              </div>
              <button
                onClick={() => setShowResetPasswordModal(null)}
                className="p-1 text-slate-400 hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleResetPassword} className="space-y-3">
              <div>
                <label className="text-slate-400 block mb-1">New Password (min 6 chars)</label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Confirm New Password</label>
                <input
                  type="password"
                  required
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 focus:outline-none"
                />
              </div>

              <div className="pt-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowResetPasswordModal(null)}
                  className="w-1/3 py-2.5 font-bold text-slate-400 bg-slate-800 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingReset}
                  className="flex-1 py-2.5 font-bold text-white bg-amber-600 hover:bg-amber-500 rounded-xl flex items-center justify-center gap-1.5"
                >
                  <KeyRound className="w-4 h-4" /> Reset Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT DRIVER MODAL */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-md shadow-2xl p-5 space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="font-bold text-sm text-slate-100">Edit Driver Profile</h3>
                <p className="text-[11px] text-slate-400">{showEditModal.employee_code}</p>
              </div>
              <button onClick={() => setShowEditModal(null)} className="p-1 text-slate-400 hover:text-slate-200">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleEditDriver} className="space-y-3">
              <div>
                <label className="text-slate-400 block mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-100"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Mobile Number</label>
                <input
                  type="tel"
                  required
                  value={editForm.phone}
                  onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-100"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  value={editForm.email}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-100"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Odoo Employee ID</label>
                <input
                  type="text"
                  value={editForm.odoo_employee_id}
                  onChange={(e) => setEditForm({ ...editForm, odoo_employee_id: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 font-mono text-slate-100"
                />
              </div>

              <div className="pt-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowEditModal(null)}
                  className="w-1/3 py-2.5 font-bold text-slate-400 bg-slate-800 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingEdit}
                  className="flex-1 py-2.5 font-bold text-white bg-blue-600 hover:bg-blue-500 rounded-xl flex items-center justify-center gap-1.5"
                >
                  <Check className="w-4 h-4" /> Save Profile Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DRIVER CREATION SUCCESS WITH DIRECT PUBLIC LINK MODAL */}
      {createdSuccessModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm">
          <div className="bg-slate-900 border border-emerald-500/40 rounded-3xl w-full max-w-lg shadow-2xl p-6 space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-100">Driver Created Successfully!</h3>
                  <p className="text-[11px] text-emerald-400">Approval email dispatched to {createdSuccessModal.emailRecipient}</p>
                </div>
              </div>
              <button
                onClick={() => setCreatedSuccessModal(null)}
                className="p-1 text-slate-400 hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-3.5 space-y-2">
              <div className="flex justify-between items-center text-slate-300">
                <span>Driver Name:</span>
                <span className="font-bold text-slate-100">{createdSuccessModal.driver.name}</span>
              </div>
              <div className="flex justify-between items-center text-slate-300">
                <span>Employee Code:</span>
                <span className="font-mono text-indigo-400">{createdSuccessModal.driver.employee_code}</span>
              </div>
              <div className="flex justify-between items-center text-slate-300">
                <span>Approval Status:</span>
                <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 font-bold border border-amber-500/30 text-[10px]">
                  PENDING BOSS APPROVAL
                </span>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-slate-300 font-semibold flex items-center justify-between">
                <span>Direct Public Approval Link:</span>
                <span className="text-[10px] text-emerald-400 font-normal">Works without login (No 403 error)</span>
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={createdSuccessModal.approvalUrl}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-300 font-mono text-[11px]"
                />
                <button
                  type="button"
                  onClick={async () => {
                    await navigator.clipboard.writeText(createdSuccessModal.approvalUrl);
                    showToast('success', 'Copied!', 'Public approval link copied to clipboard.');
                  }}
                  className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl flex items-center gap-1.5 shrink-0 cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5" /> Copy
                </button>
              </div>
              <p className="text-[10px] text-slate-400">
                You can forward this link to your boss via WhatsApp, SMS, or Slack if they haven't checked their email yet.
              </p>
            </div>

            <div className="pt-2 flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleDirectApprove(createdSuccessModal.driver.id, createdSuccessModal.driver.name)}
                className="w-1/2 py-2.5 font-bold text-emerald-300 bg-emerald-950/40 hover:bg-emerald-900/60 border border-emerald-500/30 rounded-xl flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Admin Direct Approve
              </button>
              <button
                type="button"
                onClick={() => setCreatedSuccessModal(null)}
                className="flex-1 py-2.5 font-bold text-white bg-slate-800 hover:bg-slate-700 rounded-xl"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

