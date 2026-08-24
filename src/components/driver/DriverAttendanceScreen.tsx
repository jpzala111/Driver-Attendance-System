import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import type { Attendance } from '../../types';
import { Calendar, Clock, MapPin, Gauge, Navigation, RefreshCw, Map } from 'lucide-react';

interface DriverAttendanceScreenProps {
  onOpenMap: (attendance: Attendance) => void;
}

export const DriverAttendanceScreen: React.FC<DriverAttendanceScreenProps> = ({ onOpenMap }) => {
  const { employee } = useAuth();
  const [history, setHistory] = useState<Attendance[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchHistory = async () => {
    if (!employee?.id) return;
    setIsLoading(true);
    try {
      const res = await fetch(`/api/attendance/my?employee_id=${employee.id}`);
      if (res.ok) {
        const data = await res.json();
        setHistory(data.attendance || []);
      }
    } catch {
      // Offline fallback if needed
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [employee?.id]);

  return (
    <div className="flex flex-col h-full space-y-4 pb-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-100">My Attendance History</h2>
          <p className="text-xs text-slate-400">All recorded work sessions for {employee?.name}</p>
        </div>
        <button
          onClick={fetchHistory}
          disabled={isLoading}
          className="p-2 text-slate-400 hover:text-slate-200 bg-slate-900 border border-slate-800 rounded-xl transition-colors"
          title="Refresh History"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* List Content */}
      <div className="flex-1 overflow-y-auto space-y-3">
        {isLoading ? (
          <div className="py-12 text-center text-slate-500 text-xs">Loading attendance history...</div>
        ) : history.length === 0 ? (
          <div className="p-8 text-center bg-slate-900/60 border border-slate-800 rounded-2xl text-xs text-slate-400 space-y-2">
            <Calendar className="w-8 h-8 mx-auto text-slate-600" />
            <p className="font-semibold text-slate-300">No attendance sessions recorded yet.</p>
            <p className="text-[11px]">When you check in and check out, your records will appear here.</p>
          </div>
        ) : (
          history.map((att) => {
            const checkInDate = new Date(att.check_in);
            const isCompleted = att.status === 'COMPLETED';

            return (
              <div
                key={att.id}
                className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-md space-y-3 relative overflow-hidden"
              >
                {/* Top Row: Date & Status */}
                <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-blue-400" />
                    <span className="font-bold text-xs text-slate-200">
                      {checkInDate.toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        isCompleted
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                      }`}
                    >
                      {att.status}
                    </span>
                    <button
                      onClick={() => onOpenMap(att)}
                      className="p-1 text-slate-400 hover:text-blue-400 hover:bg-slate-800 rounded"
                      title="View on Map"
                    >
                      <Map className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Timing & Duration Grid */}
                <div className="grid grid-cols-3 gap-2 text-xs text-center bg-slate-950/40 p-2.5 rounded-xl border border-slate-800/60">
                  <div>
                    <span className="text-[10px] text-slate-500 block">Check-In</span>
                    <span className="font-bold text-slate-200 font-mono">
                      {checkInDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block">Check-Out</span>
                    <span className="font-bold text-slate-200 font-mono">
                      {att.check_out
                        ? new Date(att.check_out).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                        : '—'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block">Worked</span>
                    <span className="font-bold text-emerald-400 font-mono">
                      {att.worked_duration ? `${att.worked_duration}h` : 'Active'}
                    </span>
                  </div>
                </div>

                {/* Locations */}
                <div className="space-y-1.5 text-[11px]">
                  <div className="flex items-start gap-2 text-slate-300">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0 mt-1" />
                    <span className="truncate">{att.check_in_location_address}</span>
                  </div>
                  {att.check_out_location_address && (
                    <div className="flex items-start gap-2 text-slate-300">
                      <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0 mt-1" />
                      <span className="truncate">{att.check_out_location_address}</span>
                    </div>
                  )}
                </div>

                {/* Odometer Summary */}
                <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs font-mono text-slate-400">
                  <div className="flex items-center gap-1.5">
                    <Gauge className="w-3.5 h-3.5 text-blue-400" />
                    <span>
                      {att.starting_odometer} KM → {att.ending_odometer ? `${att.ending_odometer} KM` : '...'}
                    </span>
                  </div>
                  {att.calculated_distance !== null && att.calculated_distance !== undefined && (
                    <span className="font-bold text-slate-200 bg-blue-500/10 px-2 py-0.5 rounded text-[11px] border border-blue-500/20">
                      {att.calculated_distance} KM Driven
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
