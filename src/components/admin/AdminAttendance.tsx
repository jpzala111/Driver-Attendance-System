import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import type { Attendance, Employee } from '../../types';
import {
  CalendarCheck2,
  Search,
  Filter,
  MapPin,
  Clock,
  Gauge,
  Map,
  Edit2,
  Eye,
  RefreshCw,
  Sparkles,
  AlertCircle,
  X,
  Check,
} from 'lucide-react';

interface AdminAttendanceProps {
  onOpenMap: (attendance: Attendance) => void;
}

export const AdminAttendance: React.FC<AdminAttendanceProps> = ({ onOpenMap }) => {
  const { showToast } = useAuth();
  const [attendanceList, setAttendanceList] = useState<Attendance[]>([]);
  const [drivers, setDrivers] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Filters
  const [selectedDriverId, setSelectedDriverId] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Modals
  const [selectedDetails, setSelectedDetails] = useState<Attendance | null>(null);
  const [editingAttendance, setEditingAttendance] = useState<Attendance | null>(null);
  const [editForm, setEditForm] = useState({
    check_in: '',
    check_out: '',
    starting_odometer: 0,
    ending_odometer: 0,
    status: 'COMPLETED' as 'COMPLETED' | 'IN_PROGRESS',
    edit_reason: '',
  });
  const [isSubmittingEdit, setIsSubmittingEdit] = useState<boolean>(false);
  const [editError, setEditError] = useState<string | null>(null);

  const fetchAttendance = async () => {
    setIsLoading(true);
    try {
      const [attRes, drvRes] = await Promise.all([
        fetch('/api/admin/attendance'),
        fetch('/api/admin/drivers'),
      ]);
      if (attRes.ok) {
        const data = await attRes.json();
        setAttendanceList(data.attendance || []);
      }
      if (drvRes.ok) {
        const dData = await drvRes.json();
        setDrivers(dData.drivers || []);
      }
    } catch {
      // Handled
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAttendance();
  }, []);

  const openEditModal = (att: Attendance) => {
    setEditingAttendance(att);
    setEditForm({
      check_in: att.check_in ? new Date(att.check_in).toISOString().slice(0, 16) : '',
      check_out: att.check_out ? new Date(att.check_out).toISOString().slice(0, 16) : '',
      starting_odometer: att.starting_odometer,
      ending_odometer: att.ending_odometer || att.starting_odometer,
      status: att.status,
      edit_reason: '',
    });
    setEditError(null);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAttendance) return;

    if (!editForm.edit_reason.trim()) {
      setEditError('A mandatory Reason for Correction is required for compliance.');
      return;
    }

    if (editForm.ending_odometer < editForm.starting_odometer) {
      setEditError('Ending odometer cannot be less than starting odometer.');
      return;
    }

    setIsSubmittingEdit(true);
    try {
      const res = await fetch(`/api/admin/attendance/${editingAttendance.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-name': 'Admin',
        },
        body: JSON.stringify({
          check_in: new Date(editForm.check_in).toISOString(),
          check_out: editForm.check_out ? new Date(editForm.check_out).toISOString() : null,
          starting_odometer: Number(editForm.starting_odometer),
          ending_odometer: editForm.ending_odometer ? Number(editForm.ending_odometer) : null,
          status: editForm.status,
          edit_reason: editForm.edit_reason,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        showToast('success', 'Attendance Corrected', 'Attendance record updated and audit log written.');
        setEditingAttendance(null);
        fetchAttendance();
      } else {
        setEditError(data.error || 'Failed to update attendance');
      }
    } catch {
      setEditError('Network error connecting to backend');
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  // Filtered attendance list
  const filteredList = attendanceList.filter((att) => {
    if (selectedDriverId !== 'ALL' && att.employee_id !== selectedDriverId) return false;
    if (statusFilter !== 'ALL' && att.status !== statusFilter) return false;

    if (fromDate) {
      const attDate = new Date(att.check_in).toISOString().slice(0, 10);
      if (attDate < fromDate) return false;
    }
    if (toDate) {
      const attDate = new Date(att.check_in).toISOString().slice(0, 10);
      if (attDate > toDate) return false;
    }

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const matchName = att.employee_name.toLowerCase().includes(term);
      const matchCode = att.employee_code.toLowerCase().includes(term);
      const matchLoc = att.check_in_location_address.toLowerCase().includes(term);
      if (!matchName && !matchCode && !matchLoc) return false;
    }

    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <CalendarCheck2 className="w-5 h-5 text-blue-400" />
            <h2 className="text-xl font-bold text-slate-100">Attendance Logbook</h2>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Full operational view of driver check-ins, check-outs, distance logs, and GPS locations.
          </p>
        </div>

        <button
          onClick={fetchAttendance}
          className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl flex items-center gap-2 text-xs font-semibold"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </div>

      {/* Search and Filters Bar */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs">
          {/* Search */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search driver, address..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-slate-100 focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Driver Selector */}
          <div>
            <select
              value={selectedDriverId}
              onChange={(e) => setSelectedDriverId(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none"
            >
              <option value="ALL">All Drivers</option>
              {drivers.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} ({d.employee_code})
                </option>
              ))}
            </select>
          </div>

          {/* Status Selector */}
          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none"
            >
              <option value="ALL">All Statuses</option>
              <option value="COMPLETED">Completed</option>
              <option value="IN_PROGRESS">In Progress</option>
            </select>
          </div>

          {/* From Date */}
          <div className="flex items-center gap-1 bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5">
            <span className="text-[10px] text-slate-500 shrink-0">From:</span>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="w-full bg-transparent text-slate-200 text-xs focus:outline-none cursor-pointer"
            />
            {fromDate && (
              <button onClick={() => setFromDate('')} className="text-slate-500 hover:text-slate-300 p-0.5">
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* To Date */}
          <div className="flex items-center gap-1 bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5">
            <span className="text-[10px] text-slate-500 shrink-0">To:</span>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="w-full bg-transparent text-slate-200 text-xs focus:outline-none cursor-pointer"
            />
            {toDate && (
              <button onClick={() => setToDate('')} className="text-slate-500 hover:text-slate-300 p-0.5">
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        {/* Quick Date Presets */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-slate-800/80 text-[11px]">
          <span className="text-slate-500 mr-1">Quick Filters:</span>
          <button
            onClick={() => {
              const d = new Date().toISOString().split('T')[0];
              setFromDate(d);
              setToDate(d);
            }}
            className="px-2 py-0.5 bg-slate-800/80 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors cursor-pointer"
          >
            Today
          </button>
          <button
            onClick={() => {
              const y = new Date();
              y.setDate(y.getDate() - 1);
              const d = y.toISOString().split('T')[0];
              setFromDate(d);
              setToDate(d);
            }}
            className="px-2 py-0.5 bg-slate-800/80 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors cursor-pointer"
          >
            Yesterday
          </button>
          <button
            onClick={() => {
              const today = new Date();
              const day = today.getDay();
              const diff = today.getDate() - day + (day === 0 ? -6 : 1);
              const mon = new Date(today.setDate(diff));
              setFromDate(mon.toISOString().split('T')[0]);
              setToDate(new Date().toISOString().split('T')[0]);
            }}
            className="px-2 py-0.5 bg-slate-800/80 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors cursor-pointer"
          >
            This Week
          </button>
          <button
            onClick={() => {
              const today = new Date();
              const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
              setFromDate(firstDay.toISOString().split('T')[0]);
              setToDate(new Date().toISOString().split('T')[0]);
            }}
            className="px-2 py-0.5 bg-slate-800/80 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors cursor-pointer"
          >
            This Month
          </button>
          {(fromDate || toDate || selectedDriverId !== 'ALL' || statusFilter !== 'ALL' || searchTerm) && (
            <button
              onClick={() => {
                setFromDate('');
                setToDate('');
                setSelectedDriverId('ALL');
                setStatusFilter('ALL');
                setSearchTerm('');
              }}
              className="px-2 py-0.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 rounded-lg transition-colors cursor-pointer ml-auto"
            >
              Reset All
            </button>
          )}
        </div>
      </div>

      {/* Attendance Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 text-slate-400 font-semibold border-b border-slate-800">
              <tr>
                <th className="py-3.5 px-4">Driver</th>
                <th className="py-3.5 px-4">Date</th>
                <th className="py-3.5 px-4">Check-In</th>
                <th className="py-3.5 px-4">Check-Out</th>
                <th className="py-3.5 px-4">Duration</th>
                <th className="py-3.5 px-4">Odometer (Start &rarr; End)</th>
                <th className="py-3.5 px-4">Distance</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {isLoading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-500">
                    Loading attendance entries...
                  </td>
                </tr>
              ) : filteredList.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-500">
                    No attendance records match the selected filters.
                  </td>
                </tr>
              ) : (
                filteredList.map((att) => {
                  const checkInTime = new Date(att.check_in);
                  const isCompleted = att.status === 'COMPLETED';

                  return (
                    <tr key={att.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3.5 px-4">
                        <span className="font-bold text-slate-200 block">{att.employee_name}</span>
                        <span className="font-mono text-[10px] text-blue-400 bg-slate-800 px-1.5 py-0.5 rounded">
                          {att.employee_code}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-300 font-mono">
                        {checkInTime.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-mono font-bold text-slate-200">
                          {checkInTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                        <div className="text-[10px] text-slate-400 max-w-xs truncate" title={att.check_in_location_address}>
                          {att.check_in_location_address}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        {att.check_out ? (
                          <>
                            <div className="font-mono font-bold text-slate-200">
                              {new Date(att.check_out).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                            <div className="text-[10px] text-slate-400 max-w-xs truncate" title={att.check_out_location_address || ''}>
                              {att.check_out_location_address}
                            </div>
                          </>
                        ) : (
                          <span className="text-amber-400 font-medium">In Progress</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-300">
                        {att.worked_duration ? `${att.worked_duration} hrs` : '—'}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-[11px] text-slate-300">
                        <div>
                          {att.starting_odometer} KM{' '}
                          <span className="text-[9px] text-slate-500 font-sans">({att.starting_odometer_input_method})</span>
                        </div>
                        <div className="text-slate-400">
                          &rarr; {att.ending_odometer ? `${att.ending_odometer} KM` : '...'}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-emerald-400">
                        {att.calculated_distance !== null ? `${att.calculated_distance} KM` : '—'}
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                            isCompleted
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                              : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                          }`}
                        >
                          {att.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => onOpenMap(att)}
                            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-blue-400 rounded-lg"
                            title="View GPS Points on Map"
                          >
                            <Map className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setSelectedDetails(att)}
                            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg"
                            title="Inspect Details & Odometer Photos"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => openEditModal(att)}
                            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-amber-300 rounded-lg"
                            title="Admin Edit Attendance (Requires Reason)"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
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

      {/* DETAILS MODAL */}
      {selectedDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-lg shadow-2xl p-5 space-y-4 text-xs max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="font-bold text-sm text-slate-100">Attendance Audit Details</h3>
                <p className="text-[11px] text-slate-400 font-mono">
                  {selectedDetails.employee_name} ({selectedDetails.employee_code}) &bull; ID: {selectedDetails.id}
                </p>
              </div>
              <button onClick={() => setSelectedDetails(null)} className="p-1 text-slate-400 hover:text-slate-200">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* GPS Summary */}
            <div className="bg-slate-950/60 p-3.5 rounded-2xl border border-slate-800 space-y-2">
              <span className="font-bold text-slate-300 text-[11px] block">Location Verifications</span>
              <div className="space-y-2 text-[11px]">
                <div>
                  <span className="text-slate-500 block">Check-In GPS:</span>
                  <span className="text-slate-200 font-mono font-bold">
                    {selectedDetails.check_in_latitude.toFixed(6)}, {selectedDetails.check_in_longitude.toFixed(6)}{' '}
                    (±{selectedDetails.check_in_accuracy}m accuracy)
                  </span>
                  <p className="text-slate-400 text-[10px] mt-0.5">{selectedDetails.check_in_location_address}</p>
                </div>
                {selectedDetails.check_out_latitude && (
                  <div>
                    <span className="text-slate-500 block">Check-Out GPS:</span>
                    <span className="text-slate-200 font-mono font-bold">
                      {selectedDetails.check_out_latitude.toFixed(6)}, {selectedDetails.check_out_longitude?.toFixed(6)}{' '}
                      (±{selectedDetails.check_out_accuracy}m accuracy)
                    </span>
                    <p className="text-slate-400 text-[10px] mt-0.5">{selectedDetails.check_out_location_address}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Odometer Photos & OCR */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-slate-950/60 p-3 rounded-2xl border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-300 text-[10px]">STARTING ODOMETER</span>
                  <span className="text-[9px] font-mono bg-blue-500/20 text-blue-300 px-1.5 py-0.5 rounded">
                    {selectedDetails.starting_odometer_input_method}
                  </span>
                </div>
                <div className="text-lg font-mono font-black text-slate-100">{selectedDetails.starting_odometer} KM</div>
                {selectedDetails.starting_odometer_image ? (
                  <img
                    src={selectedDetails.starting_odometer_image}
                    alt="Start Odometer"
                    className="w-full h-28 object-contain rounded-xl bg-black border border-slate-800"
                  />
                ) : (
                  <div className="h-28 bg-slate-900 rounded-xl flex items-center justify-center text-slate-600 text-[10px]">
                    No Photo
                  </div>
                )}
              </div>

              <div className="bg-slate-950/60 p-3 rounded-2xl border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-300 text-[10px]">ENDING ODOMETER</span>
                  <span className="text-[9px] font-mono bg-blue-500/20 text-blue-300 px-1.5 py-0.5 rounded">
                    {selectedDetails.ending_odometer_input_method || '—'}
                  </span>
                </div>
                <div className="text-lg font-mono font-black text-slate-100">
                  {selectedDetails.ending_odometer ? `${selectedDetails.ending_odometer} KM` : '—'}
                </div>
                {selectedDetails.ending_odometer_image ? (
                  <img
                    src={selectedDetails.ending_odometer_image}
                    alt="End Odometer"
                    className="w-full h-28 object-contain rounded-xl bg-black border border-slate-800"
                  />
                ) : (
                  <div className="h-28 bg-slate-900 rounded-xl flex items-center justify-center text-slate-600 text-[10px]">
                    No Photo
                  </div>
                )}
              </div>
            </div>

            {selectedDetails.edit_reason && (
              <div className="p-3 bg-amber-950/30 border border-amber-800/40 rounded-xl text-amber-200 text-[11px]">
                <strong>Admin Correction Note:</strong> {selectedDetails.edit_reason}
              </div>
            )}
          </div>
        </div>
      )}

      {/* EDIT MODAL (Admin Correction with Reason) */}
      {editingAttendance && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-md shadow-2xl p-5 space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="font-bold text-sm text-slate-100">Edit Attendance Record</h3>
                <p className="text-[11px] text-slate-400">
                  {editingAttendance.employee_name} ({editingAttendance.employee_code})
                </p>
              </div>
              <button onClick={() => setEditingAttendance(null)} className="p-1 text-slate-400 hover:text-slate-200">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-3">
              {editError && (
                <div className="p-2.5 bg-rose-950/40 border border-rose-800/60 rounded-xl text-rose-200 text-[11px]">
                  {editError}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1">Check-In Timestamp</label>
                  <input
                    type="datetime-local"
                    required
                    value={editForm.check_in}
                    onChange={(e) => setEditForm({ ...editForm, check_in: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-2 text-slate-100 text-[11px]"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Check-Out Timestamp</label>
                  <input
                    type="datetime-local"
                    value={editForm.check_out}
                    onChange={(e) => setEditForm({ ...editForm, check_out: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-2 text-slate-100 text-[11px]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1">Starting Odometer (KM)</label>
                  <input
                    type="number"
                    required
                    value={editForm.starting_odometer}
                    onChange={(e) => setEditForm({ ...editForm, starting_odometer: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Ending Odometer (KM)</label>
                  <input
                    type="number"
                    value={editForm.ending_odometer}
                    onChange={(e) => setEditForm({ ...editForm, ending_odometer: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 font-mono font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Status</label>
                <select
                  value={editForm.status}
                  onChange={(e) => setEditForm({ ...editForm, status: e.target.value as any })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-100"
                >
                  <option value="COMPLETED">COMPLETED</option>
                  <option value="IN_PROGRESS">IN_PROGRESS</option>
                </select>
              </div>

              <div>
                <label className="text-slate-400 block mb-1 font-semibold text-amber-300">
                  Reason for Correction * (Mandatory for Audit Trail)
                </label>
                <textarea
                  required
                  rows={2}
                  value={editForm.edit_reason}
                  onChange={(e) => setEditForm({ ...editForm, edit_reason: e.target.value })}
                  placeholder="e.g. Corrected odometer ending value due to odometer cluster glare issue..."
                  className="w-full bg-slate-950 border border-amber-800/60 rounded-xl p-2.5 text-slate-100 text-xs focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="pt-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setEditingAttendance(null)}
                  className="w-1/3 py-2.5 font-bold text-slate-400 bg-slate-800 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingEdit}
                  className="flex-1 py-2.5 font-bold text-white bg-blue-600 hover:bg-blue-500 rounded-xl flex items-center justify-center gap-1.5"
                >
                  <Check className="w-4 h-4" /> Save Corrections
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
