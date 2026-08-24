import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import type { Attendance } from '../../types';
import { Gauge, Sparkles, Edit2, Calendar, Eye, X } from 'lucide-react';

export const DriverOdometerScreen: React.FC = () => {
  const { employee } = useAuth();
  const [records, setRecords] = useState<Attendance[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  useEffect(() => {
    if (!employee?.id) return;
    setIsLoading(true);
    fetch(`/api/attendance/my?employee_id=${employee.id}`)
      .then((res) => res.json())
      .then((data) => {
        setRecords(data.attendance || []);
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, [employee?.id]);

  const totalDistance = records.reduce((sum, a) => sum + (a.calculated_distance || 0), 0);

  return (
    <div className="flex flex-col h-full space-y-4 pb-4">
      {/* Header & Stats Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-3">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Odometer Logs</span>
          <h2 className="text-lg font-bold text-slate-100">Distance & Readings</h2>
        </div>

        <div className="grid grid-cols-2 gap-3 pt-1 text-xs">
          <div className="bg-slate-950/60 p-3 rounded-2xl border border-slate-800">
            <span className="text-slate-500 text-[10px] block font-medium">Total Distance Driven</span>
            <span className="text-xl font-bold font-mono text-blue-400">{totalDistance} KM</span>
          </div>
          <div className="bg-slate-950/60 p-3 rounded-2xl border border-slate-800">
            <span className="text-slate-500 text-[10px] block font-medium">Logged Sessions</span>
            <span className="text-xl font-bold font-mono text-slate-200">{records.length}</span>
          </div>
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto space-y-3">
        {isLoading ? (
          <div className="py-12 text-center text-slate-500 text-xs">Loading odometer logs...</div>
        ) : records.length === 0 ? (
          <div className="p-8 text-center bg-slate-900/60 border border-slate-800 rounded-2xl text-xs text-slate-400">
            <Gauge className="w-8 h-8 mx-auto text-slate-600 mb-2" />
            <p className="font-semibold text-slate-300">No odometer records yet.</p>
          </div>
        ) : (
          records.map((att) => {
            const dateStr = new Date(att.check_in).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            });

            return (
              <div
                key={att.id}
                className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-md space-y-3"
              >
                <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                  <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-blue-400" /> {dateStr}
                  </span>
                  {att.calculated_distance !== null && att.calculated_distance !== undefined && (
                    <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                      +{att.calculated_distance} KM
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs font-mono">
                  {/* Start Reading */}
                  <div className="bg-slate-950/40 p-2.5 rounded-xl border border-slate-800/60 space-y-1.5">
                    <div className="flex items-center justify-between text-[10px] text-slate-500">
                      <span>STARTING</span>
                      <span
                        className={`px-1.5 py-0.2 rounded font-sans font-bold text-[9px] ${
                          att.starting_odometer_input_method === 'OCR'
                            ? 'bg-blue-500/20 text-blue-300'
                            : 'bg-amber-500/20 text-amber-300'
                        }`}
                      >
                        {att.starting_odometer_input_method}
                      </span>
                    </div>
                    <div className="text-base font-bold text-slate-200">{att.starting_odometer} KM</div>
                    {att.starting_odometer_image && (
                      <button
                        onClick={() => setPreviewImage(att.starting_odometer_image!)}
                        className="text-[10px] text-blue-400 hover:underline flex items-center gap-1 font-sans"
                      >
                        <Eye className="w-3 h-3" /> View Photo
                      </button>
                    )}
                  </div>

                  {/* End Reading */}
                  <div className="bg-slate-950/40 p-2.5 rounded-xl border border-slate-800/60 space-y-1.5">
                    <div className="flex items-center justify-between text-[10px] text-slate-500">
                      <span>ENDING</span>
                      {att.ending_odometer_input_method && (
                        <span
                          className={`px-1.5 py-0.2 rounded font-sans font-bold text-[9px] ${
                            att.ending_odometer_input_method === 'OCR'
                              ? 'bg-blue-500/20 text-blue-300'
                              : 'bg-amber-500/20 text-amber-300'
                          }`}
                        >
                          {att.ending_odometer_input_method}
                        </span>
                      )}
                    </div>
                    <div className="text-base font-bold text-slate-200">
                      {att.ending_odometer ? `${att.ending_odometer} KM` : '—'}
                    </div>
                    {att.ending_odometer_image && (
                      <button
                        onClick={() => setPreviewImage(att.ending_odometer_image!)}
                        className="text-[10px] text-blue-400 hover:underline flex items-center gap-1 font-sans"
                      >
                        <Eye className="w-3 h-3" /> View Photo
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Image Preview Modal */}
      {previewImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl p-4 max-w-sm w-full space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-sm text-slate-100">Odometer Photo</h4>
              <button
                onClick={() => setPreviewImage(null)}
                className="p-1 text-slate-400 hover:text-slate-200 rounded-lg hover:bg-slate-800"
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
