import React, { useState, useEffect, useMemo } from 'react';
import {
  FileText,
  Search,
  Filter,
  Download,
  ShieldCheck,
  RefreshCw,
  Clock,
  User,
  ChevronRight,
  AlertCircle,
  Eye,
  X,
  Layers,
  Database,
  Lock,
} from 'lucide-react';
import { authenticatedFetch } from '../../lib/api';
import type { AuditLogEntry } from '../../types';

export const AuditLogsViewer: React.FC = () => {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedActionFilter, setSelectedActionFilter] = useState('ALL');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState('ALL');
  const [activeLogDetail, setActiveLogDetail] = useState<AuditLogEntry | null>(null);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await authenticatedFetch('/api/admin/audit-logs?limit=100');
      const data = await res.json();
      if (data.success && Array.isArray(data.logs)) {
        setLogs(data.logs);
      }
    } catch (err) {
      console.error('Audit jurnallarini yuklashda xatolik:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const matchesSearch =
        !search ||
        (log.actorUid && log.actorUid.toLowerCase().includes(search.toLowerCase())) ||
        (log.action && log.action.toLowerCase().includes(search.toLowerCase())) ||
        (log.entity && log.entity.toLowerCase().includes(search.toLowerCase())) ||
        (log.entityId && log.entityId.toLowerCase().includes(search.toLowerCase()));

      const matchesAction = selectedActionFilter === 'ALL' || log.action === selectedActionFilter;
      const matchesRole = selectedRoleFilter === 'ALL' || log.actorRole === selectedRoleFilter;

      return matchesSearch && matchesAction && matchesRole;
    });
  }, [logs, search, selectedActionFilter, selectedRoleFilter]);

  const exportCSV = () => {
    const headers = ['ID', 'Sana/Vaqt', 'Foydalanuvchi', 'Rol', 'Amal', 'Obyekt', 'Obyekt ID'];
    const rows = filteredLogs.map((l) => [
      l.id,
      l.timestamp,
      l.actorUid,
      l.actorRole,
      l.action,
      l.entity,
      l.entityId,
    ]);
    const csvContent = [headers.join(','), ...rows.map((r) => r.map((c) => `"${c || ''}"`).join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `edusphere_audit_logs_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getActionBadge = (action: string) => {
    if (action.includes('CREATE') || action.includes('ENROLLED')) {
      return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300';
    }
    if (action.includes('UPDATE') || action.includes('CHANGE')) {
      return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300';
    }
    if (action.includes('DELETE') || action.includes('ARCHIVE') || action.includes('LOGOUT')) {
      return 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300';
    }
    return 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300';
  };

  return (
    <div className="space-y-6 font-sans pb-10">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center gap-3.5">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-600/30">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                Tizim Audit Jurnali (Audit Logs)
              </h1>
              <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-[11px] font-bold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                Append-Only Immutable
              </span>
            </div>
            <p className="text-xs text-slate-400 font-semibold mt-0.5">
              Barcha o‘zgarishlar, baho tahrirlashlari, davomat va akkaunt faolliklari tarixi
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={fetchLogs}
            disabled={loading}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 cursor-pointer shadow-2xs"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Yangilash</span>
          </button>

          <button
            type="button"
            onClick={exportCSV}
            disabled={filteredLogs.length === 0}
            className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-indigo-600/30 hover:bg-indigo-700 cursor-pointer"
          >
            <Download className="h-4 w-4" />
            <span>CSV Eksport</span>
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <div className="relative">
          <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Foydalanuvchi, amal yoki ID bo‘yicha qidirish..."
            className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 py-2 text-xs text-slate-900 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          />
        </div>

        <div>
          <select
            value={selectedActionFilter}
            onChange={(e) => setSelectedActionFilter(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          >
            <option value="ALL">Barcha amallar</option>
            <option value="LOGIN">LOGIN</option>
            <option value="GRADE_CHANGE">GRADE_CHANGE</option>
            <option value="ATTENDANCE_CHANGE">ATTENDANCE_CHANGE</option>
            <option value="FACE_ID_AUTO_ATTENDANCE">FACE_ID_AUTO_ATTENDANCE</option>
            <option value="STUDENT_FACE_EMBEDDING_ENROLLED">FACE_EMBEDDING_ENROLLED</option>
            <option value="ANNOUNCEMENT_CREATED">ANNOUNCEMENT_CREATED</option>
            <option value="FORCE_LOGOUT_ALL_SESSIONS">FORCE_LOGOUT_ALL_SESSIONS</option>
          </select>
        </div>

        <div>
          <select
            value={selectedRoleFilter}
            onChange={(e) => setSelectedRoleFilter(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          >
            <option value="ALL">Barcha rollar</option>
            <option value="ADMIN">ADMIN</option>
            <option value="TEACHER">TEACHER</option>
            <option value="PARENT_STUDENT">PARENT_STUDENT</option>
            <option value="SYSTEM_CAMERA">SYSTEM_CAMERA</option>
          </select>
        </div>
      </div>

      {/* Logs Table */}
      <div className="rounded-3xl border border-slate-200/80 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-100 bg-slate-50/70 text-slate-400 dark:border-slate-800 dark:bg-slate-800/40 uppercase font-bold text-[10px]">
              <tr>
                <th className="p-4">Sana va Vaqt</th>
                <th className="p-4">Foydalanuvchi / Actor</th>
                <th className="p-4">Roli</th>
                <th className="p-4">Harakat (Action)</th>
                <th className="p-4">Obyekt & ID</th>
                <th className="p-4 text-right">Batafsil</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={6} className="p-12 text-center text-xs text-slate-400">
                    Audit jurnallari yuklanmoqda...
                  </td>
                </tr>
              ) : filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-12 text-center text-xs text-slate-400">
                    Mos keluvchi audit yozuvlari topilmadi.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="p-4 font-mono text-[11px] text-slate-500 dark:text-slate-400">
                      {new Date(log.timestamp).toLocaleString('uz-UZ')}
                    </td>
                    <td className="p-4 font-bold text-slate-900 dark:text-white">
                      {log.actorName || log.actorUid}
                    </td>
                    <td className="p-4">
                      <span className="rounded-md bg-slate-100 dark:bg-slate-800 px-2 py-0.5 font-mono text-[10px] font-bold text-slate-700 dark:text-slate-300">
                        {log.actorRole}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className={`inline-flex rounded-lg px-2.5 py-1 text-[11px] font-bold ${getActionBadge(log.action)}`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="p-4 text-slate-600 dark:text-slate-300 font-mono text-[11px]">
                      {log.entity}: {log.entityId}
                    </td>
                    <td className="p-4 text-right">
                      <button
                        type="button"
                        onClick={() => setActiveLogDetail(log)}
                        className="rounded-xl border border-slate-200 bg-white p-1.5 text-indigo-600 hover:bg-indigo-50 dark:border-slate-700 dark:bg-slate-800 dark:text-indigo-400 transition-colors cursor-pointer"
                        title="Tafsilotlarni ko‘rish"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail Modal */}
      {activeLogDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-xs">
          <div className="w-full max-w-xl rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-indigo-600" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Audit Yozuvi Tafsiloti
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setActiveLogDetail(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4 space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800">
                  <span className="text-slate-400">Actor UID:</span>
                  <div className="font-bold font-mono mt-0.5 text-slate-900 dark:text-white">{activeLogDetail.actorUid}</div>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800">
                  <span className="text-slate-400">Amal:</span>
                  <div className="font-bold mt-0.5 text-indigo-600">{activeLogDetail.action}</div>
                </div>
              </div>

              {activeLogDetail.oldValue && (
                <div>
                  <span className="font-bold text-slate-500">Oldingi Qiymat (Old Value):</span>
                  <pre className="mt-1 p-3 rounded-xl bg-slate-100 dark:bg-slate-950 font-mono text-[11px] overflow-x-auto text-slate-800 dark:text-slate-200">
                    {JSON.stringify(activeLogDetail.oldValue, null, 2)}
                  </pre>
                </div>
              )}

              {activeLogDetail.newValue && (
                <div>
                  <span className="font-bold text-emerald-600">Yangi Qiymat (New Value):</span>
                  <pre className="mt-1 p-3 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900 font-mono text-[11px] overflow-x-auto text-emerald-900 dark:text-emerald-200">
                    {JSON.stringify(activeLogDetail.newValue, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

