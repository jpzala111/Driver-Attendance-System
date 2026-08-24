import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import type { DashboardMetrics, Attendance, AuditLog } from '../../types';
import {
  Users,
  UserCheck,
  Clock,
  Play,
  CheckCircle2,
  Gauge,
  MapPin,
  Sparkles,
  AlertTriangle,
  FileSpreadsheet,
  Plus,
  Mail,
  ArrowRight,
  TrendingUp,
  Map,
} from 'lucide-react';

interface AdminDashboardProps {
  onNavigate: (section: string) => void;
  onOpenMap: (attendance: Attendance) => void;
  onCreateDriver: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onNavigate, onOpenMap, onCreateDriver }) => {
  const { setIsEmailInboxOpen } = useAuth();
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [recentAttendance, setRecentAttendance] = useState<Attendance[]>([]);
  const [recentLogs, setRecentLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setIsLoading(true);
    try {
      const [mRes, aRes, lRes] = await Promise.all([
        fetch('/api/admin/dashboard-metrics'),
        fetch('/api/admin/attendance'),
        fetch('/api/admin/audit-logs'),
      ]);

      if (mRes.ok) setMetrics(await mRes.json());
      if (aRes.ok) {
        const aData = await aRes.json();
        setRecentAttendance((aData.attendance || []).slice(0, 5));
      }
      if (lRes.ok) {
        const lData = await lRes.json();
        setRecentLogs((lData.audit_logs || []).slice(0, 5));
      }
    } catch {
      // Handled
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Welcome & Quick Actions */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-semibold text-emerald-400">Live Attendance System</span>
          </div>
          <h2 className="text-2xl font-black text-slate-100 mt-1">Operational Command Dashboard</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Monitor real-time driver check-ins, odometer calculations, and audit logs.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={onCreateDriver}
            className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-2.5 px-4 rounded-xl text-xs flex items-center gap-2 shadow-lg shadow-blue-900/40 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Create Driver
          </button>
          <button
            onClick={() => onNavigate('odoo-export')}
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2.5 px-4 rounded-xl text-xs flex items-center gap-2 shadow-lg shadow-emerald-900/40 transition-all cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4" /> Odoo 19 Export
          </button>
          <button
            onClick={() => setIsEmailInboxOpen(true)}
            className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold py-2.5 px-3.5 rounded-xl text-xs flex items-center gap-2 transition-all cursor-pointer"
            title="Inspect simulated Higher Authority approval email"
          >
            <Mail className="w-4 h-4 text-indigo-400" /> Approval Inbox
          </button>
        </div>
      </div>

      {/* Primary KPI Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
        {/* Total Drivers */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm hover:border-slate-700 transition-colors">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-semibold">Total Drivers</span>
            <Users className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-2xl font-black text-slate-100 font-mono">
            {metrics ? metrics.total_drivers : '—'}
          </div>
          <span className="text-[10px] text-emerald-400 flex items-center gap-1 mt-1">
            {metrics?.active_drivers || 0} active &bull; {metrics?.pending_approvals || 0} pending
          </span>
        </div>

        {/* Currently Working */}
        <div className="bg-slate-900 border border-emerald-900/40 rounded-2xl p-4 shadow-sm bg-emerald-950/10">
          <div className="flex items-center justify-between text-emerald-400 mb-2">
            <span className="text-[11px] font-semibold">Currently Working</span>
            <Play className="w-4 h-4 text-emerald-400 fill-current animate-pulse" />
          </div>
          <div className="text-2xl font-black text-emerald-400 font-mono">
            {metrics ? metrics.currently_working : '—'}
          </div>
          <span className="text-[10px] text-slate-400 mt-1 block">Active on road</span>
        </div>

        {/* Today Checked In */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-semibold">Today Check-Ins</span>
            <Clock className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-black text-slate-100 font-mono">
            {metrics ? metrics.today_checked_in : '—'}
          </div>
          <span className="text-[10px] text-slate-400 mt-1 block">
            {metrics?.today_checked_out || 0} completed check-outs
          </span>
        </div>

        {/* Today Worked Hours */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-semibold">Today Worked Hours</span>
            <TrendingUp className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-black text-slate-100 font-mono">
            {metrics ? `${metrics.today_total_worked_hours}h` : '—'}
          </div>
          <span className="text-[10px] text-slate-400 mt-1 block">Cumulative driver time</span>
        </div>

        {/* Today Total KM */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-semibold">Today Total Distance</span>
            <Gauge className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-black text-amber-300 font-mono">
            {metrics ? `${metrics.today_total_km} KM` : '—'}
          </div>
          <span className="text-[10px] text-slate-400 mt-1 block">Calculated from odometer</span>
        </div>

        {/* Pending Approvals */}
        <div className="bg-slate-900 border border-amber-900/40 rounded-2xl p-4 shadow-sm bg-amber-950/10">
          <div className="flex items-center justify-between text-amber-400 mb-2">
            <span className="text-[11px] font-semibold">Pending Approvals</span>
            <UserCheck className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-black text-amber-400 font-mono">
            {metrics ? metrics.pending_approvals : '—'}
          </div>
          <span className="text-[10px] text-slate-400 mt-1 block">Awaiting email approval</span>
        </div>
      </div>

      {/* Secondary Warning Indicators */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 text-xs">
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <span className="font-semibold text-slate-200">GPS Accuracy Flags</span>
              <p className="text-[11px] text-slate-400">Readings above threshold</p>
            </div>
          </div>
          <span className="text-lg font-bold font-mono text-slate-200">
            {metrics?.location_verification_issues || 0}
          </span>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <span className="font-semibold text-slate-200">Odometer OCR Fallbacks</span>
              <p className="text-[11px] text-slate-400">Manual entries recorded</p>
            </div>
          </div>
          <span className="text-lg font-bold font-mono text-amber-300">
            {metrics?.odometer_manual_entries || 0}
          </span>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-rose-500/10 text-rose-400 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <span className="font-semibold text-slate-200">Overdue Check-Outs</span>
              <p className="text-[11px] text-slate-400">Active &gt; 24h continuous</p>
            </div>
          </div>
          <span className="text-lg font-bold font-mono text-rose-400">
            {metrics?.missed_check_outs || 0}
          </span>
        </div>
      </div>

      {/* Two Column Layout: Recent Attendance & Audit Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Attendance (2 cols) */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Clock className="w-5 h-5 text-blue-400" />
              <h3 className="font-bold text-slate-100 text-base">Recent Attendance Sessions</h3>
            </div>
            <button
              onClick={() => onNavigate('attendance')}
              className="text-xs font-semibold text-blue-400 hover:text-blue-300 flex items-center gap-1"
            >
              View Full Table <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-3">
            {recentAttendance.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500">No attendance logged yet.</div>
            ) : (
              recentAttendance.map((att) => (
                <div
                  key={att.id}
                  className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs hover:border-slate-700 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs ${
                        att.status === 'COMPLETED'
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : 'bg-amber-500/20 text-amber-400'
                      }`}
                    >
                      {att.status === 'COMPLETED' ? '✓' : '●'}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-100">{att.employee_name}</span>
                        <span className="text-[10px] font-mono text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded">
                          {att.employee_code}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        In: {new Date(att.check_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}{' '}
                        &bull; {att.check_in_location_address.split(',')[0]}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
                    <div className="text-right">
                      <span className="font-mono font-bold text-slate-200 block">
                        {att.calculated_distance !== null ? `${att.calculated_distance} KM` : '—'}
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono">
                        {att.worked_duration ? `${att.worked_duration} hrs` : 'In Progress'}
                      </span>
                    </div>

                    <button
                      onClick={() => onOpenMap(att)}
                      className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl border border-slate-700 flex items-center gap-1"
                      title="Inspect on Map"
                    >
                      <Map className="w-4 h-4 text-blue-400" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Audit Activity Feed (1 col) */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              <h3 className="font-bold text-slate-100 text-base">Recent Audit Logs</h3>
            </div>
            <button
              onClick={() => onNavigate('audit-logs')}
              className="text-xs font-semibold text-blue-400 hover:text-blue-300"
            >
              All Logs &rarr;
            </button>
          </div>

          <div className="space-y-3">
            {recentLogs.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500">No audit events logged.</div>
            ) : (
              recentLogs.map((log) => (
                <div key={log.id} className="p-3 bg-slate-950/60 border border-slate-800/80 rounded-2xl space-y-1 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-300 text-[11px]">{log.action}</span>
                    <span className="text-[10px] font-mono text-slate-500">
                      {new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-snug">{log.description}</p>
                  <span className="text-[10px] text-slate-500 block font-mono">By: {log.username}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
