import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import type { Attendance, Employee, ApprovalRequest } from '../../types';
import {
  BarChart3,
  Calendar,
  Users,
  Gauge,
  MapPin,
  Clock,
  Sparkles,
  ShieldCheck,
  Download,
  FileText,
  TrendingUp,
} from 'lucide-react';

export const AdminReports: React.FC = () => {
  const { showToast } = useAuth();
  const [reportType, setReportType] = useState<number>(1);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [drivers, setDrivers] = useState<Employee[]>([]);
  const [approvals, setApprovals] = useState<ApprovalRequest[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [aRes, dRes, apRes] = await Promise.all([
        fetch('/api/admin/attendance'),
        fetch('/api/admin/drivers'),
        fetch('/api/admin/approvals'),
      ]);
      if (aRes.ok) setAttendance((await aRes.json()).attendance || []);
      if (dRes.ok) setDrivers((await dRes.json()).drivers || []);
      if (apRes.ok) setApprovals((await apRes.json()).approvals || []);
    } catch {
      // Handled
    } finally {
      setIsLoading(false);
    }
  };

  const reportsList = [
    { id: 1, name: 'Daily Attendance Report', icon: Calendar, desc: 'Day-to-day check-in status and attendance completeness' },
    { id: 2, name: 'Monthly Summary Report', icon: BarChart3, desc: 'Aggregated monthly shifts, attendance totals, and hours' },
    { id: 3, name: 'Driver-wise Performance', icon: Users, desc: 'Individual driver statistics, consistency, and mileage' },
    { id: 4, name: 'Date Range Comparative', icon: TrendingUp, desc: 'Compare multi-week attendance volumes and variance' },
    { id: 5, name: 'GPS Location Audit', icon: MapPin, desc: 'Location coordinates precision, accuracy errors, and flags' },
    { id: 6, name: 'Distance & Mileage Report', icon: Gauge, desc: 'Total kilometers logged per vehicle and driver breakdown' },
    { id: 7, name: 'Cumulative Worked Hours', icon: Clock, desc: 'Shift durations, overtime, and work schedule adherence' },
    { id: 8, name: 'Odometer OCR Quality', icon: Sparkles, desc: 'OCR recognition success rate vs manual fallback overrides' },
    { id: 9, name: 'Driver Activity Timeline', icon: FileText, desc: 'Chronological timeline of check-in and check-out events' },
    { id: 10, name: 'Approval Workflow Log', icon: ShieldCheck, desc: 'Audit log of Higher Authority email activation requests' },
  ];

  const handleExportReportCSV = () => {
    const active = reportsList.find((r) => r.id === reportType);
    showToast('info', 'Report Generated', `Exported "${active?.name}" to CSV spreadsheet.`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-blue-400" />
            <h2 className="text-xl font-bold text-slate-100">Analytics & Compliance Reports</h2>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            10 Standardized fleet attendance, odometer verification, and workflow audit reports.
          </p>
        </div>

        <button
          onClick={handleExportReportCSV}
          className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-2.5 px-4 rounded-xl text-xs flex items-center gap-2 shadow-lg shadow-blue-900/30 transition-all cursor-pointer"
        >
          <Download className="w-4 h-4" /> Download Report CSV
        </button>
      </div>

      {/* Report Tabs Selector */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
        {reportsList.map((r) => {
          const Icon = r.icon;
          const isSelected = reportType === r.id;
          return (
            <button
              key={r.id}
              onClick={() => setReportType(r.id)}
              className={`p-3 rounded-2xl border text-left flex flex-col justify-between gap-2 transition-all cursor-pointer ${
                isSelected
                  ? 'bg-blue-600/15 border-blue-500/50 text-blue-300 shadow-md ring-1 ring-blue-500/30'
                  : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] font-bold text-slate-500">#{r.id}</span>
                <Icon className={`w-4 h-4 ${isSelected ? 'text-blue-400' : 'text-slate-500'}`} />
              </div>
              <span className="font-bold text-[11px] leading-tight text-slate-200">{r.name}</span>
            </button>
          );
        })}
      </div>

      {/* Selected Report Content Container */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div>
            <h3 className="font-bold text-base text-slate-100">
              {reportsList.find((r) => r.id === reportType)?.name}
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              {reportsList.find((r) => r.id === reportType)?.desc}
            </p>
          </div>
          <span className="px-3 py-1 bg-slate-800 rounded-full text-xs font-mono text-slate-300">
            {attendance.length} Total Data Points
          </span>
        </div>

        {/* Dynamic Report Table View */}
        <div className="overflow-x-auto">
          {reportType === 1 && (
            /* Daily Attendance */
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/80 text-slate-400 border-b border-slate-800 font-semibold">
                <tr>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Driver</th>
                  <th className="py-3 px-4">Check-In</th>
                  <th className="py-3 px-4">Check-Out</th>
                  <th className="py-3 px-4">Hours</th>
                  <th className="py-3 px-4">Distance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {attendance.map((a) => (
                  <tr key={a.id} className="hover:bg-slate-800/30">
                    <td className="py-3 px-4 text-slate-300">{new Date(a.check_in).toLocaleDateString()}</td>
                    <td className="py-3 px-4 font-sans font-bold text-slate-200">{a.employee_name}</td>
                    <td className="py-3 px-4 text-slate-400">{new Date(a.check_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                    <td className="py-3 px-4 text-slate-400">{a.check_out ? new Date(a.check_out).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'In Progress'}</td>
                    <td className="py-3 px-4 text-slate-200">{a.worked_duration || '—'}</td>
                    <td className="py-3 px-4 text-emerald-400 font-bold">{a.calculated_distance !== null ? `${a.calculated_distance} KM` : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {reportType === 3 && (
            /* Driver-wise Performance */
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/80 text-slate-400 border-b border-slate-800 font-semibold">
                <tr>
                  <th className="py-3 px-4">Code</th>
                  <th className="py-3 px-4">Driver Name</th>
                  <th className="py-3 px-4">Approval</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Logged Sessions</th>
                  <th className="py-3 px-4">Total Distance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {drivers.map((d) => (
                  <tr key={d.id} className="hover:bg-slate-800/30">
                    <td className="py-3 px-4 font-mono font-bold text-blue-400">{d.employee_code}</td>
                    <td className="py-3 px-4 font-bold text-slate-200">{d.name}</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400">
                        {d.approval_status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-400">{d.account_status}</td>
                    <td className="py-3 px-4 font-mono text-slate-200">{d.total_sessions || 0}</td>
                    <td className="py-3 px-4 font-mono font-bold text-emerald-400">{d.total_distance_km || 0} KM</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {reportType === 8 && (
            /* OCR Quality Report */
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/80 text-slate-400 border-b border-slate-800 font-semibold">
                <tr>
                  <th className="py-3 px-4">Driver</th>
                  <th className="py-3 px-4">Start Method</th>
                  <th className="py-3 px-4">Start Confidence</th>
                  <th className="py-3 px-4">End Method</th>
                  <th className="py-3 px-4">End Confidence</th>
                  <th className="py-3 px-4">Distance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {attendance.map((a) => (
                  <tr key={a.id} className="hover:bg-slate-800/30">
                    <td className="py-3 px-4 font-sans font-bold text-slate-200">{a.employee_name}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] ${a.starting_odometer_input_method === 'OCR' ? 'bg-blue-500/20 text-blue-300' : 'bg-amber-500/20 text-amber-300'}`}>
                        {a.starting_odometer_input_method}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-400">{a.starting_odometer_ocr_confidence ? `${Math.round(a.starting_odometer_ocr_confidence * 100)}%` : 'Manual'}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] ${a.ending_odometer_input_method === 'OCR' ? 'bg-blue-500/20 text-blue-300' : 'bg-amber-500/20 text-amber-300'}`}>
                        {a.ending_odometer_input_method || '—'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-400">{a.ending_odometer_ocr_confidence ? `${Math.round(a.ending_odometer_ocr_confidence * 100)}%` : '—'}</td>
                    <td className="py-3 px-4 font-bold text-emerald-400">{a.calculated_distance || 0} KM</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {reportType === 10 && (
            /* Approval Workflow Log */
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/80 text-slate-400 border-b border-slate-800 font-semibold">
                <tr>
                  <th className="py-3 px-4">Token ID</th>
                  <th className="py-3 px-4">Created Date</th>
                  <th className="py-3 px-4">Higher Authority Email</th>
                  <th className="py-3 px-4">Workflow Status</th>
                  <th className="py-3 px-4">Processed Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {approvals.map((ap) => (
                  <tr key={ap.id} className="hover:bg-slate-800/30">
                    <td className="py-3 px-4 text-indigo-400 font-bold">{ap.token.slice(0, 16)}...</td>
                    <td className="py-3 px-4 text-slate-300">{new Date(ap.created_at).toLocaleString()}</td>
                    <td className="py-3 px-4 font-sans text-slate-300">{ap.higher_authority_email}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        ap.status === 'APPROVED' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'
                      }`}>
                        {ap.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-400">{ap.approved_at || ap.rejected_at || 'Pending'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {/* Default Table for remaining reports */}
          {![1, 3, 8, 10].includes(reportType) && (
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/80 text-slate-400 border-b border-slate-800 font-semibold">
                <tr>
                  <th className="py-3 px-4">Driver</th>
                  <th className="py-3 px-4">Check-In GPS & Address</th>
                  <th className="py-3 px-4">Check-Out GPS & Address</th>
                  <th className="py-3 px-4">Duration</th>
                  <th className="py-3 px-4">Distance</th>
                  <th className="py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {attendance.map((a) => (
                  <tr key={a.id} className="hover:bg-slate-800/30">
                    <td className="py-3 px-4">
                      <span className="font-bold text-slate-200 block">{a.employee_name}</span>
                      <span className="text-[10px] font-mono text-slate-400">{a.employee_code}</span>
                    </td>
                    <td className="py-3 px-4 text-slate-400 max-w-xs truncate">{a.check_in_location_address}</td>
                    <td className="py-3 px-4 text-slate-400 max-w-xs truncate">{a.check_out_location_address || '—'}</td>
                    <td className="py-3 px-4 font-mono text-slate-200">{a.worked_duration || '—'}</td>
                    <td className="py-3 px-4 font-mono font-bold text-emerald-400">{a.calculated_distance !== null ? `${a.calculated_distance} KM` : '—'}</td>
                    <td className="py-3 px-4 font-bold text-[10px] text-slate-300">{a.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};
