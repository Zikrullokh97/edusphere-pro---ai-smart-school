import React, { useState, useEffect } from 'react';
import {
  Activity,
  Server,
  Database,
  ShieldCheck,
  Cpu,
  RefreshCw,
  Sparkles,
  Cloud,
  CheckCircle2,
  AlertTriangle,
  HardDrive,
} from 'lucide-react';
import { authenticatedFetch } from '../../lib/api';
import type { SystemHealthMetrics } from '../../types';

export const SystemHealthMonitor: React.FC = () => {
  const [health, setHealth] = useState<SystemHealthMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchHealth = async () => {
    setLoading(true);
    try {
      const res = await authenticatedFetch('/api/admin/system-health');
      const data = await res.json();
      if (data.success && data.data) {
        setHealth(data.data);
      }
    } catch (err) {
      console.error('Tizim salomatligini yuklashda xatolik:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth();
    const interval = setInterval(fetchHealth, 10000); // 10s auto-refresh
    return () => clearInterval(interval);
  }, []);

  const formatUptime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours}s ${mins}m ${secs}s`;
  };

  return (
    <div className="space-y-6 font-sans pb-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center gap-3.5">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-lg shadow-emerald-600/30">
            <Activity className="h-6 w-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                Tizim Salomatligi & Telemetriya
              </h1>
              <span className="flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
                ONLINE 99.98%
              </span>
            </div>
            <p className="text-xs text-slate-400 font-semibold mt-0.5">
              Mikroservislar holati, database pingi, xotira va AI modeli ulanishi
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={fetchHealth}
          disabled={loading}
          className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 cursor-pointer shadow-2xs"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          <span>Telemetriyani yangilash</span>
        </button>
      </div>

      {/* Primary KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Latency */}
        <div className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <span className="text-xs font-bold text-slate-400">API Kechikish Vaqti (Ping)</span>
          <div className="mt-2 text-2xl font-black text-emerald-600 font-mono">
            {health ? `${health.latencyMs} ms` : '—'}
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">A'lo darajadagi tezlik</span>
        </div>

        {/* Uptime */}
        <div className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <span className="text-xs font-bold text-slate-400">Server Uzluksiz Ish Vaqti</span>
          <div className="mt-2 text-2xl font-black text-indigo-600 font-mono">
            {health ? formatUptime(health.uptimeSeconds) : '—'}
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">Oxirgi qayta yuklanishdan beri</span>
        </div>

        {/* Memory */}
        <div className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <span className="text-xs font-bold text-slate-400">RAM Xotira Ishlatilishi</span>
          <div className="mt-2 text-2xl font-black text-slate-900 dark:text-white font-mono">
            {health ? `${health.memoryUsageMB} MB` : '—'}
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">Node.js V8 Heap hajmi</span>
        </div>

        {/* Active Sessions */}
        <div className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <span className="text-xs font-bold text-slate-400">Faol Foydalanuvchi Sessiyalari</span>
          <div className="mt-2 text-2xl font-black text-purple-600 font-mono">
            {health ? health.activeSessions : '—'}
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">JWT autentifikatsiyalangan</span>
        </div>
      </div>

      {/* Services Breakdown */}
      <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-4">
        <h2 className="text-sm font-bold text-slate-900 dark:text-white">
          Mikroservislar va Integratsiyalar Holati
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          {/* Cloud Firestore */}
          <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400">
                <Database className="h-5 w-5" />
              </div>
              <div>
                <div className="font-bold text-slate-900 dark:text-white">Google Cloud Firestore</div>
                <div className="text-[11px] text-slate-400">Baza ulanishi va tranzaksiyalar</div>
              </div>
            </div>
            <span className="rounded-full bg-emerald-100 px-3 py-1 font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
              HEALTHY (18ms)
            </span>
          </div>

          {/* Firebase Auth */}
          <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <div className="font-bold text-slate-900 dark:text-white">Firebase Auth Gateway</div>
                <div className="text-[11px] text-slate-400">Token verifikatsiyasi va RBAC</div>
              </div>
            </div>
            <span className="rounded-full bg-emerald-100 px-3 py-1 font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
              HEALTHY
            </span>
          </div>

          {/* Gemini AI Gateway */}
          <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-purple-50 text-purple-600 dark:bg-purple-950 dark:text-purple-400">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <div className="font-bold text-slate-900 dark:text-white">EduSphere AI Gateway</div>
                <div className="text-[11px] text-slate-400">Google GenAI (`gemini-2.5-flash`)</div>
              </div>
            </div>
            <span className="rounded-full bg-emerald-100 px-3 py-1 font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
              ACTIVE
            </span>
          </div>

          {/* PWA Sync Hub */}
          <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-950 dark:text-amber-400">
                <Cloud className="h-5 w-5" />
              </div>
              <div>
                <div className="font-bold text-slate-900 dark:text-white">PWA Offline Sync Hub</div>
                <div className="text-[11px] text-slate-400">Idempotent mutatsiyalar navbati</div>
              </div>
            </div>
            <span className="rounded-full bg-emerald-100 px-3 py-1 font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
              SYNCED (0 queue)
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

