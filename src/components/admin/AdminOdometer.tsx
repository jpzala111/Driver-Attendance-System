import React, { useState, useEffect } from 'react';
import type { Attendance, Employee } from '../../types';
import { Gauge, Sparkles, Edit2, Eye, Calendar, Search, RefreshCw, X } from 'lucide-react';

export const AdminOdometer: React.FC = () => {
  const [records, setRecords] = useState<Attendance[]>([]);
  const [drivers, setDrivers] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [selectedDriverId, setSelectedDriverId] = useState<string>('ALL');
  const [methodFilter, setMethodFilter] = useState<string>('ALL');
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [attRes, drvRes] = await Promise.all([
        fetch('/api/admin/attendance'),
        fetch('/api/admin/drivers'),
      ]);
      if (attRes.ok) {
        const aData = await attRes.json();
        setRecords(aData.attendance || []);
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
    fetchData();
  }, []);

  const filtered = records.filter((r) => {
    if (selectedDriverId !== 'ALL' && r.employee_id !== selectedDriverId) return false;
    if (methodFilter === 'OCR') {
      return r.starting_odometer_input_method === 'OCR' || r.ending_odometer_input_method === 'OCR';
    }
    if (methodFilter === 'MANUAL') {
      return r.starting_odometer_input_method === 'MANUAL' || r.ending_odometer_input_method === 'MANUAL';
    }
    return true;
  });

  const totalKm = filtered.reduce((sum, r) => sum + (r.calculated_distance || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Gauge className="w-5 h-5 text-amber-400" />
            <h2 className="text-xl font-bold text-slate-100">Odometer & Distance Registry</h2>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Audit OCR recognition vs manual odometer inputs, photographic proof, and fleet mileage.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="bg-slate-950 px-4 py-2 rounded-2xl border border-slate-800 text-xs">
            <span className="text-slate-500 block text-[10px]">Filtered Distance</span>
            <span className="text-lg font-black font-mono text-amber-300">{totalKm} KM</span>
          </div>
          <button
            onClick={fetchData}
            className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4 flex flex-wrap items-center gap-3 text-xs">
        <select
          value={selectedDriverId}
          onChange={(e) => setSelectedDriverId(e.target.value)}
          className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200"
        >
          <option value="ALL">All Drivers</option>
          {drivers.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name} ({d.employee_code})
            </option>
          ))}
        </select>

        <select
          value={methodFilter}
          onChange={(e) => setMethodFilter(e.target.value)}
          className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200"
        >
          <option value="ALL">All Input Methods</option>
          <option value="OCR">Includes OCR</option>
          <option value="MANUAL">Includes Manual Entry</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 text-slate-400 font-semibold border-b border-slate-800">
              <tr>
                <th className="py-3.5 px-4">Date</th>
                <th className="py-3.5 px-4">Driver</th>
                <th className="py-3.5 px-4">Start Reading</th>
                <th className="py-3.5 px-4">Start Photo & Method</th>
                <th className="py-3.5 px-4">End Reading</th>
                <th className="py-3.5 px-4">End Photo & Method</th>
                <th className="py-3.5 px-4">Distance Driven</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    Loading odometer entries...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    No odometer logs found.
                  </td>
                </tr>
              ) : (
                filtered.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3.5 px-4 text-slate-300 font-mono">
                      {new Date(r.check_in).toLocaleDateString()}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="font-bold text-slate-200 block">{r.employee_name}</span>
                      <span className="text-[10px] font-mono text-slate-400">{r.employee_code}</span>
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-200">
                      {r.starting_odometer} KM
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            r.starting_odometer_input_method === 'OCR'
                              ? 'bg-blue-500/20 text-blue-300'
                              : 'bg-amber-500/20 text-amber-300'
                          }`}
                        >
                          {r.starting_odometer_input_method}
                        </span>
                        {r.starting_odometer_image && (
                          <button
                            onClick={() => setPreviewImage(r.starting_odometer_image!)}
                            className="text-blue-400 hover:text-blue-300 underline text-[11px] flex items-center gap-1"
                          >
                            <Eye className="w-3 h-3" /> Photo
                          </button>
                        )}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-200">
                      {r.ending_odometer ? `${r.ending_odometer} KM` : '—'}
                    </td>
                    <td className="py-3.5 px-4">
                      {r.ending_odometer_input_method ? (
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                              r.ending_odometer_input_method === 'OCR'
                                ? 'bg-blue-500/20 text-blue-300'
                                : 'bg-amber-500/20 text-amber-300'
                            }`}
                          >
                            {r.ending_odometer_input_method}
                          </span>
                          {r.ending_odometer_image && (
                            <button
                              onClick={() => setPreviewImage(r.ending_odometer_image!)}
                              className="text-blue-400 hover:text-blue-300 underline text-[11px] flex items-center gap-1"
                            >
                              <Eye className="w-3 h-3" /> Photo
                            </button>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-500">—</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold text-emerald-400">
                      {r.calculated_distance !== null ? `+${r.calculated_distance} KM` : '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Image Preview Modal */}
      {previewImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl p-4 max-w-md w-full space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-sm text-slate-100">Odometer Proof Photo</h4>
              <button
                onClick={() => setPreviewImage(null)}
                className="p-1 text-slate-400 hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <img src={previewImage} alt="Odometer" className="w-full rounded-2xl border border-slate-700 aspect-[4/3] object-contain bg-black" />
          </div>
        </div>
      )}
    </div>
  );
};
