import React, { useState, useEffect } from 'react';
import type { AuditLog } from '../../types';
import { ShieldCheck, Search, Filter, RefreshCw, Eye, X } from 'lucide-react';

export const AdminAuditLogs: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  const fetchLogs = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/admin/audit-logs');
      if (res.ok) {
        const data = await res.json();
        setLogs(data.audit_logs || []);
      }
    } catch {
      // Ignored
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const filteredLogs = logs.filter((l) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      l.action.toLowerCase().includes(term) ||
      l.username.toLowerCase().includes(term) ||
      l.description.toLowerCase().includes(term) ||
      l.entity.toLowerCase().includes(term)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <h2 className="text-xl font-bold text-slate-100">System Audit Trail & Security Logs</h2>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Immutable log of all administrative actions, driver creations, attendance overrides, and approval authorizations.
          </p>
        </div>

        <button
          onClick={fetchLogs}
          className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs flex items-center gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} /> Refresh Trail
        </button>
      </div>

      {/* Search */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4 flex items-center gap-3 text-xs">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search audit actions, usernames, records..."
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-slate-100 focus:outline-none focus:border-blue-500"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 text-slate-400 font-semibold border-b border-slate-800">
              <tr>
                <th className="py-3.5 px-4">Timestamp</th>
                <th className="py-3.5 px-4">Actor</th>
                <th className="py-3.5 px-4">Action</th>
                <th className="py-3.5 px-4">Target Entity</th>
                <th className="py-3.5 px-4">Description</th>
                <th className="py-3.5 px-4 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500">
                    Loading audit trail...
                  </td>
                </tr>
              ) : filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500">
                    No audit records matching search.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3.5 px-4 font-mono text-slate-400">
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-slate-200">{log.username}</td>
                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 rounded font-mono text-[10px] font-bold bg-slate-800 text-blue-300 border border-slate-700">
                        {log.action}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-400">
                      {log.entity} <span className="text-[10px] text-slate-500">({log.entity_id.slice(0, 8)}...)</span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-300 max-w-md truncate">{log.description}</td>
                    <td className="py-3.5 px-4 text-right">
                      {log.details ? (
                        <button
                          onClick={() => setSelectedLog(log)}
                          className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs"
                          title="Inspect raw payload diff"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                      ) : (
                        <span className="text-slate-600 text-[10px]">—</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Payload Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-lg shadow-2xl p-5 space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="font-bold text-sm text-slate-100">{selectedLog.action} Audit Details</h3>
                <p className="text-[11px] text-slate-400 font-mono">By {selectedLog.username} &bull; {new Date(selectedLog.created_at).toLocaleString()}</p>
              </div>
              <button onClick={() => setSelectedLog(null)} className="p-1 text-slate-400 hover:text-slate-200">
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-slate-300">{selectedLog.description}</p>

            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 font-mono text-[11px] overflow-x-auto text-emerald-400 max-h-60">
              <pre>{JSON.stringify(selectedLog.details, null, 2)}</pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
