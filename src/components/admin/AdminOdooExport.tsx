import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import type { OdooExportValidationResult, Employee } from '../../types';
import {
  FileSpreadsheet,
  Download,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Layers,
  Info,
  Calendar,
  X,
} from 'lucide-react';
import confetti from 'canvas-confetti';

export const AdminOdooExport: React.FC = () => {
  const { showToast } = useAuth();
  const [validationData, setValidationData] = useState<OdooExportValidationResult | null>(null);
  const [drivers, setDrivers] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const [selectedDriverId, setSelectedDriverId] = useState<string>('ALL');
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');

  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  const fetchValidation = async (overrideFrom = fromDate, overrideTo = toDate, overrideDriver = selectedDriverId) => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (overrideDriver !== 'ALL') params.append('employee_id', overrideDriver);
      if (overrideFrom) params.append('startDate', overrideFrom);
      if (overrideTo) params.append('endDate', overrideTo);

      const [valRes, drvRes] = await Promise.all([
        fetch(`/api/export/odoo19-validate?${params.toString()}`),
        fetch('/api/admin/drivers'),
      ]);

      if (valRes.ok) {
        setValidationData(await valRes.json());
      }
      if (drvRes.ok) {
        const dData = await drvRes.json();
        setDrivers(dData.drivers || []);
      }
    } catch {
      showToast('error', 'Error', 'Failed to validate export data');
    } finally {
      setIsLoading(false);
    }
  };

  // Trigger fetch with debounce to prevent interrupting manual typing
  const triggerDebouncedFetch = (newFrom: string, newTo: string, newDriver: string) => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    // Only auto-query if empty or standard 10-char YYYY-MM-DD
    const isValidOrEmptyFrom = !newFrom || newFrom.length === 10;
    const isValidOrEmptyTo = !newTo || newTo.length === 10;

    if (isValidOrEmptyFrom && isValidOrEmptyTo) {
      debounceTimerRef.current = setTimeout(() => {
        fetchValidation(newFrom, newTo, newDriver);
      }, 350);
    }
  };

  useEffect(() => {
    fetchValidation();
    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, []);

  const handleDriverChange = (driverId: string) => {
    setSelectedDriverId(driverId);
    fetchValidation(fromDate, toDate, driverId);
  };

  const handleFromDateChange = (val: string) => {
    setFromDate(val);
    triggerDebouncedFetch(val, toDate, selectedDriverId);
  };

  const handleToDateChange = (val: string) => {
    setToDate(val);
    triggerDebouncedFetch(fromDate, val, selectedDriverId);
  };

  // Quick Date Presets
  const setPreset = (preset: 'TODAY' | 'YESTERDAY' | 'THIS_WEEK' | 'THIS_MONTH' | 'ALL') => {
    const today = new Date();
    const toISO = (d: Date) => d.toISOString().split('T')[0];

    let start = '';
    let end = '';

    if (preset === 'TODAY') {
      start = toISO(today);
      end = toISO(today);
    } else if (preset === 'YESTERDAY') {
      const y = new Date();
      y.setDate(today.getDate() - 1);
      start = toISO(y);
      end = toISO(y);
    } else if (preset === 'THIS_WEEK') {
      const day = today.getDay(); // 0 is Sunday
      const diff = today.getDate() - day + (day === 0 ? -6 : 1); // Monday
      const mon = new Date(today.setDate(diff));
      start = toISO(mon);
      end = toISO(new Date());
    } else if (preset === 'THIS_MONTH') {
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
      start = toISO(firstDay);
      end = toISO(new Date());
    } else if (preset === 'ALL') {
      start = '';
      end = '';
    }

    setFromDate(start);
    setToDate(end);
    fetchValidation(start, end, selectedDriverId);
  };

  const handleDownloadOdooCSV = () => {
    const params = new URLSearchParams();
    if (selectedDriverId !== 'ALL') params.append('employee_id', selectedDriverId);
    if (fromDate) params.append('startDate', fromDate);
    if (toDate) params.append('endDate', toDate);

    confetti({ particleCount: 50, spread: 60, origin: { y: 0.6 } });
    window.location.href = `/api/export/odoo19-csv?${params.toString()}`;
    showToast('success', 'Exporting CSV', 'Downloading Odoo 19 hr.attendance import CSV file.');
  };

  const handleDownloadFullCSV = () => {
    const params = new URLSearchParams();
    if (selectedDriverId !== 'ALL') params.append('employee_id', selectedDriverId);
    if (fromDate) params.append('startDate', fromDate);
    if (toDate) params.append('endDate', toDate);

    window.location.href = `/api/export/attendance-csv?${params.toString()}`;
    showToast('info', 'Exporting Master CSV', 'Downloading full attendance & GPS report.');
  };

  const invalidItems = validationData?.items.filter((item) => !item.is_valid) || [];

  return (
    <div className="space-y-6">
      {/* Hero Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
            <h2 className="text-xl font-bold text-slate-100">Odoo 19 Attendance Export Pipeline</h2>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Strict pre-export validation and direct CSV generation compatible with Odoo 19 <code>hr.attendance</code>.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleDownloadOdooCSV}
            disabled={!validationData || validationData.ready_records === 0}
            className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold py-2.5 px-4 rounded-xl text-xs flex items-center gap-2 shadow-lg shadow-emerald-900/40 transition-all cursor-pointer"
          >
            <Download className="w-4 h-4" /> DOWNLOAD ODOO 19 CSV ({validationData?.ready_records || 0})
          </button>
          <button
            onClick={handleDownloadFullCSV}
            className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold py-2.5 px-3.5 rounded-xl text-xs flex items-center gap-2 transition-all cursor-pointer"
          >
            <Layers className="w-4 h-4 text-blue-400" /> Master Audit CSV
          </button>
        </div>
      </div>

      {/* Date & Driver Filter Bar with Quick Presets */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 space-y-3 text-xs">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Driver Selector */}
          <div className="flex items-center gap-2">
            <span className="text-slate-400 font-medium">Driver:</span>
            <select
              value={selectedDriverId}
              onChange={(e) => handleDriverChange(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 text-xs cursor-pointer"
            >
              <option value="ALL">All Drivers</option>
              {drivers.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} ({d.employee_code})
                </option>
              ))}
            </select>
          </div>

          {/* Date Inputs */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5">
              <span className="text-slate-500 text-[11px]">From:</span>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => handleFromDateChange(e.target.value)}
                className="bg-transparent text-slate-200 text-xs focus:outline-none cursor-pointer"
              />
              {fromDate && (
                <button
                  onClick={() => handleFromDateChange('')}
                  className="text-slate-500 hover:text-slate-300 p-0.5 cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            <span className="text-slate-500">to</span>

            <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5">
              <span className="text-slate-500 text-[11px]">To:</span>
              <input
                type="date"
                value={toDate}
                onChange={(e) => handleToDateChange(e.target.value)}
                className="bg-transparent text-slate-200 text-xs focus:outline-none cursor-pointer"
              />
              {toDate && (
                <button
                  onClick={() => handleToDateChange('')}
                  className="text-slate-500 hover:text-slate-300 p-0.5 cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            <button
              onClick={() => fetchValidation(fromDate, toDate, selectedDriverId)}
              className="p-2 bg-blue-600/20 hover:bg-blue-600 text-blue-300 hover:text-white border border-blue-500/30 rounded-xl transition-colors cursor-pointer"
              title="Apply Filter / Re-validate"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* 1-Click Quick Date Range Presets */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-slate-800/80">
          <span className="text-[11px] text-slate-500 flex items-center gap-1 mr-1">
            <Calendar className="w-3 h-3" /> Presets:
          </span>
          <button
            onClick={() => setPreset('TODAY')}
            className="px-2.5 py-1 bg-slate-800/80 hover:bg-slate-700 text-slate-300 rounded-lg text-[11px] font-medium transition-colors cursor-pointer"
          >
            Today
          </button>
          <button
            onClick={() => setPreset('YESTERDAY')}
            className="px-2.5 py-1 bg-slate-800/80 hover:bg-slate-700 text-slate-300 rounded-lg text-[11px] font-medium transition-colors cursor-pointer"
          >
            Yesterday
          </button>
          <button
            onClick={() => setPreset('THIS_WEEK')}
            className="px-2.5 py-1 bg-slate-800/80 hover:bg-slate-700 text-slate-300 rounded-lg text-[11px] font-medium transition-colors cursor-pointer"
          >
            This Week
          </button>
          <button
            onClick={() => setPreset('THIS_MONTH')}
            className="px-2.5 py-1 bg-slate-800/80 hover:bg-slate-700 text-slate-300 rounded-lg text-[11px] font-medium transition-colors cursor-pointer"
          >
            This Month
          </button>
          <button
            onClick={() => setPreset('ALL')}
            className="px-2.5 py-1 bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-slate-200 rounded-lg text-[11px] font-medium transition-colors cursor-pointer"
          >
            All Time
          </button>
        </div>
      </div>

      {/* Pre-Export Validation Status Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
        {/* Total Examined */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
          <span className="text-slate-400 block mb-1">Total Attendance Examined</span>
          <div className="text-2xl font-black font-mono text-slate-100">
            {validationData ? validationData.total_records : '—'}
          </div>
          <span className="text-[10px] text-slate-500 mt-1 block">Within active filters</span>
        </div>

        {/* Ready to Export */}
        <div className="bg-slate-900 border border-emerald-800/40 rounded-2xl p-4 bg-emerald-950/10">
          <div className="flex items-center justify-between text-emerald-400 mb-1">
            <span>Ready for Odoo 19 Import</span>
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <div className="text-2xl font-black font-mono text-emerald-400">
            {validationData ? validationData.ready_records : '—'}
          </div>
          <span className="text-[10px] text-slate-400 mt-1 block">Valid Check-In, Check-Out &amp; Odoo ID</span>
        </div>

        {/* Action Needed / Excluded */}
        <div className="bg-slate-900 border border-amber-800/40 rounded-2xl p-4 bg-amber-950/10">
          <div className="flex items-center justify-between text-amber-400 mb-1">
            <span>Excluded / Action Needed</span>
            <AlertTriangle className="w-4 h-4" />
          </div>
          <div className="text-2xl font-black font-mono text-amber-300">
            {validationData ? validationData.error_records : '—'}
          </div>
          <span className="text-[10px] text-slate-400 mt-1 block">In-progress or missing parameters</span>
        </div>
      </div>

      {/* Odoo Format Documentation Banner */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 text-xs space-y-2">
        <div className="flex items-center gap-2 text-slate-300 font-semibold">
          <Info className="w-4 h-4 text-blue-400" /> Odoo 19 <code>hr.attendance</code> Format Specifications
        </div>
        <p className="text-slate-400 text-[11px] leading-relaxed">
          The generated CSV adheres strictly to Odoo 19 import structure. Timestamps are converted to standard UTC+05:30 (Asia/Kolkata) format
          (<code>YYYY-MM-DD HH:MM:SS</code>). External Employee ID mappings allow 1-click reconciliation in Odoo Attendance module.
        </p>
      </div>

      {/* Validation Issues Table if any */}
      {invalidItems.length > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-3">
          <h3 className="font-bold text-sm text-slate-100 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400" /> Pre-Export Exclusions &amp; Recommendations
          </h3>
          <div className="space-y-2">
            {invalidItems.map((item, idx) => (
              <div
                key={idx}
                className="p-3 bg-slate-950/60 border border-amber-900/30 rounded-xl text-xs flex items-start justify-between gap-3"
              >
                <div>
                  <span className="font-bold text-slate-200">{item.employee_name}</span>{' '}
                  <span className="text-slate-500 font-mono">({item.employee_code} &bull; {item.attendance_id})</span>
                  <p className="text-amber-300/90 text-[11px] mt-0.5">{item.validation_errors.join('; ')}</p>
                </div>
                <span className="text-[10px] font-semibold bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full shrink-0">
                  Needs Attention
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

