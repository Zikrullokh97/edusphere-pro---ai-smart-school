import React, { useState, useEffect } from 'react';
import {
  CloudCheck,
  Wifi,
  WifiOff,
  RefreshCw,
  Database,
  CheckCircle2,
  AlertCircle,
  Clock,
  HardDrive,
  Activity,
  Layers,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Check,
  FileSpreadsheet,
  UserCheck,
  Trash2,
  Send,
  Zap,
} from 'lucide-react';
import { AppLanguage } from '../../types';
import { useI18n } from '../../lib/i18n';
import { pwaManager, PWAStats } from '../../lib/pwa';
import { offlineDB, DBSyncAction } from '../../lib/indexedDB';

interface SyncStatusViewProps {
  language: AppLanguage;
}

export const SyncStatusView: React.FC<SyncStatusViewProps> = ({ language }) => {
  const t = useI18n(language);
  const [isOnline, setIsOnline] = useState<boolean>(pwaManager.getIsOnline());
  const [isSimulatedOffline, setIsSimulatedOffline] = useState<boolean>(
    pwaManager.getIsSimulatedOffline()
  );
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [pendingActions, setPendingActions] = useState<DBSyncAction[]>([]);
  const [stats, setStats] = useState<PWAStats | null>(null);
  const [lastSyncTime, setLastSyncTime] = useState<string | undefined>();
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'info' | 'warning' } | null>(null);
  const [syncHistory, setSyncHistory] = useState<Array<{ id: string; time: string; count: number; status: 'success' | 'failed' }>>([
    { id: 'h-1', time: '10:45:12 AM', count: 4, status: 'success' },
    { id: 'h-2', time: '09:30:00 AM', count: 12, status: 'success' },
  ]);

  const showToast = (text: string, type: 'success' | 'info' | 'warning' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Load pending actions and stats from IndexedDB
  const refreshData = async () => {
    try {
      const actions = await offlineDB.getPendingSyncActions();
      setPendingActions(actions);
      setPendingCount(actions.length);

      const dbStats = await pwaManager.getStats();
      setStats(dbStats);
      if (dbStats.lastSyncedAt) {
        setLastSyncTime(dbStats.lastSyncedAt);
      }
    } catch (err) {
      console.warn('Failed to fetch offline sync status:', err);
    }
  };

  useEffect(() => {
    refreshData();

    const unsubOnline = pwaManager.subscribeOnlineState((online) => {
      setIsOnline(online);
      setIsSimulatedOffline(pwaManager.getIsSimulatedOffline());
      refreshData();
    });

    const unsubSync = (syncing: boolean, count: number, lastSync?: string) => {
      setIsSyncing(syncing);
      setPendingCount(count);
      if (lastSync) setLastSyncTime(lastSync);
      refreshData();
    };
    const unsubSyncListener = pwaManager.subscribeSync(unsubSync);

    const unsubStats = pwaManager.subscribeStats((newStats) => {
      setStats(newStats);
      setPendingCount(newStats.pendingSyncCount);
      setIsOnline(newStats.isOnline);
      setIsSimulatedOffline(newStats.isSimulatedOffline);
      if (newStats.lastSyncedAt) setLastSyncTime(newStats.lastSyncedAt);
    });

    // Polling interval for live sync monitor
    const interval = setInterval(refreshData, 3000);

    return () => {
      unsubOnline();
      unsubSyncListener();
      unsubStats();
      clearInterval(interval);
    };
  }, []);

  // Force Manual Synchronization
  const handleForceManualSync = async () => {
    if (!isOnline) {
      showToast('Cannot synchronize while offline. Please connect or disable simulation.', 'warning');
      return;
    }

    setIsSyncing(true);
    try {
      const result = await pwaManager.processSyncQueue();
      setIsSyncing(false);

      if (result.success) {
        const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        setLastSyncTime(timeStr);
        setSyncHistory((prev) => [
          { id: `h-${Date.now()}`, time: timeStr, count: result.syncedCount || 1, status: 'success' },
          ...prev.slice(0, 4),
        ]);
        showToast(`✓ Successfully synchronized ${result.syncedCount} offline record(s) with EduSphere Cloud!`, 'success');
      } else {
        showToast('Sync completed. No outstanding actions in IndexedDB queue.', 'info');
      }
      await refreshData();
    } catch (err) {
      setIsSyncing(false);
      showToast('Synchronization error. Changes remain safe in local IndexedDB.', 'warning');
    }
  };

  // Toggle Simulated Offline Mode
  const handleToggleSimulatedOffline = () => {
    const nextState = !isSimulatedOffline;
    pwaManager.setSimulatedOffline(nextState);
    if (nextState) {
      showToast('📴 Offline simulation mode enabled. App is now operating in offline-first IndexedDB mode.', 'info');
    } else {
      showToast('🌐 Network simulation restored. Auto-syncing pending queue to cloud...', 'success');
    }
    refreshData();
  };

  // Create Sample Offline Entries for Testing
  const handleCreateTestOfflineEntries = async () => {
    try {
      const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      // 1. Queue an attendance action
      await pwaManager.recordAttendance(
        {
          id: `att-demo-${Date.now()}`,
          studentId: 'std-104',
          studentName: 'Madina Karimova',
          className: '7-A',
          date: new Date().toISOString().split('T')[0],
          status: 'present',
          time: timestamp,
          checkInTime: timestamp,
          method: 'nfc',
          confidence: 99.4,
        },
        'Madina Karimova'
      );

      // 2. Queue a grade action
      await pwaManager.recordGrade(
        {
          id: `grd-demo-${Date.now()}`,
          studentId: 'std-104',
          studentName: 'Madina Karimova',
          className: '7-A',
          subject: 'Mathematics',
          homework: [95, 98],
          quizzes: [92, 96],
          midterm: 94,
          finalExam: 95,
          average: 95,
        },
        'homework',
        1,
        98
      );

      await refreshData();
      showToast('✓ 2 demo offline records added to IndexedDB sync queue!', 'success');
    } catch (e) {
      showToast('Failed to create demo entries', 'warning');
    }
  };

  // Format Action Display
  const renderActionDetails = (action: DBSyncAction) => {
    const timeFormatted = new Date(action.timestamp).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });

    if (action.type === 'attendance_update') {
      return (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
              <UserCheck className="h-4 w-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-900 dark:text-white text-xs">
                  {action.payload.studentName || 'Student'}
                </span>
                <span className="rounded-md bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 capitalize">
                  {action.payload.status || 'Present'}
                </span>
                <span className="text-[10px] text-slate-400 font-mono">
                  {action.payload.className || '7-A'}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                Attendance Check-in • Method: <span className="capitalize">{action.payload.method || 'manual'}</span> • {action.payload.date || 'Today'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 self-end sm:self-center">
            <div className="text-right">
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold text-amber-700 dark:text-amber-300">
                <Database className="h-2.5 w-2.5" />
                <span>Queued (IndexedDB)</span>
              </span>
              <div className="text-[10px] text-slate-400 mt-0.5">{timeFormatted}</div>
            </div>
          </div>
        </div>
      );
    }

    if (action.type === 'grade_update') {
      return (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
              <FileSpreadsheet className="h-4 w-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-900 dark:text-white text-xs">
                  {action.payload.studentName || 'Student'}
                </span>
                <span className="rounded-md bg-indigo-100 px-1.5 py-0.5 text-[10px] font-bold text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300">
                  {action.payload.subject || 'Math'}
                </span>
                <span className="text-[10px] text-slate-400 font-mono">
                  {action.payload.className || '7-A'}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                Grade Score Updated: <strong className="text-slate-800 dark:text-slate-200 capitalize">{action.payload.field}</strong> • New Avg: <strong>{action.payload.updatedAverage}%</strong>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 self-end sm:self-center">
            <div className="text-right">
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold text-amber-700 dark:text-amber-300">
                <Database className="h-2.5 w-2.5" />
                <span>Queued (IndexedDB)</span>
              </span>
              <div className="text-[10px] text-slate-400 mt-0.5">{timeFormatted}</div>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="flex items-center justify-between p-3.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 text-xs">
        <div className="flex items-center gap-2.5">
          <Database className="h-4 w-4 text-slate-400" />
          <span className="font-bold capitalize">{action.type.replace('_', ' ')}</span>
        </div>
        <span className="text-[10px] text-slate-400">{timeFormatted}</span>
      </div>
    );
  };

  return (
    <div id="sync-status-view-section" className="space-y-6">
      {/* Toast Alert */}
      {toastMessage && (
        <div
          className={`fixed top-20 right-4 z-50 rounded-2xl px-4 py-3 text-xs font-bold text-white shadow-2xl backdrop-blur-md border animate-slideDown flex items-center gap-2 ${
            toastMessage.type === 'success'
              ? 'bg-emerald-900/95 border-emerald-500/50'
              : toastMessage.type === 'warning'
              ? 'bg-amber-900/95 border-amber-500/50'
              : 'bg-slate-900/95 border-indigo-500/50'
          }`}
        >
          {toastMessage.type === 'success' && <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />}
          {toastMessage.type === 'warning' && <AlertCircle className="h-4 w-4 text-amber-400 shrink-0" />}
          {toastMessage.type === 'info' && <Sparkles className="h-4 w-4 text-indigo-400 shrink-0" />}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Primary Cloud & Hardware Connection Banner */}
      <div
        id="sync-status-hero-card"
        className={`rounded-2xl border p-5 sm:p-6 transition-all shadow-md ${
          isOnline
            ? 'border-emerald-500/30 bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white'
            : 'border-amber-500/40 bg-gradient-to-br from-amber-950 via-slate-900 to-slate-950 text-white'
        }`}
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3.5">
            <div
              className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border shadow-inner ${
                isOnline
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/40'
                  : 'bg-amber-500/20 text-amber-300 border-amber-400/40 animate-pulse'
              }`}
            >
              {isOnline ? <Wifi className="h-6 w-6" /> : <WifiOff className="h-6 w-6" />}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-white">
                  {isOnline ? 'Connected to EduSphere Cloud' : 'Network Disconnected / Offline Mode'}
                </h2>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold flex items-center gap-1 ${
                    isOnline
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/30'
                      : 'bg-amber-500/20 text-amber-300 border border-amber-400/30'
                  }`}
                >
                  <span className={`h-1.5 w-1.5 rounded-full ${isOnline ? 'bg-emerald-400 animate-ping' : 'bg-amber-400'}`} />
                  {isOnline ? 'Online (Real-time Sync)' : 'IndexedDB Local Only'}
                </span>
                {isSimulatedOffline && (
                  <span className="rounded-full bg-indigo-500/30 text-indigo-200 border border-indigo-400/40 px-2 py-0.5 text-[10px] font-bold">
                    Simulation Active
                  </span>
                )}
              </div>
              <p className="mt-1 text-xs text-slate-300 max-w-xl leading-relaxed">
                {isOnline
                  ? 'All local classroom changes are actively synchronized with school servers. Offline records queue automatically in IndexedDB when disconnected.'
                  : 'Operating in offline mode. Attendance and grade updates are safely stored in browser IndexedDB and will auto-sync upon reconnection.'}
              </p>
            </div>
          </div>

          {/* Action Buttons: Force Sync & Simulation Toggle */}
          <div className="flex flex-wrap items-center gap-2.5 shrink-0 self-start sm:self-auto">
            <button
              id="btn-toggle-offline-simulation"
              onClick={handleToggleSimulatedOffline}
              className={`flex items-center gap-1.5 rounded-xl px-3.5 py-2.5 text-xs font-bold transition-all border ${
                isSimulatedOffline
                  ? 'bg-amber-500 text-slate-950 border-amber-300 shadow-md hover:bg-amber-400'
                  : 'bg-white/10 text-white border-white/20 hover:bg-white/20'
              }`}
              style={{ minHeight: '44px' }}
              title="Toggle network disconnect simulation"
            >
              {isSimulatedOffline ? <WifiOff className="h-4 w-4" /> : <Wifi className="h-4 w-4 text-emerald-400" />}
              <span>{isSimulatedOffline ? 'Resume Online' : 'Simulate Offline'}</span>
            </button>

            <button
              id="btn-force-manual-sync"
              onClick={handleForceManualSync}
              disabled={isSyncing || (!isOnline && pendingCount === 0)}
              className="flex items-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white px-4 py-2.5 text-xs font-bold shadow-lg shadow-indigo-600/30 transition-all border border-indigo-400/30"
              style={{ minHeight: '44px' }}
            >
              <RefreshCw className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>
                {isSyncing
                  ? 'Synchronizing Cloud...'
                  : pendingCount > 0
                  ? `Force Sync (${pendingCount} Pending)`
                  : 'Force Manual Sync'}
              </span>
            </button>
          </div>
        </div>

        {/* Status Bar Telemetry */}
        <div className="mt-4 flex flex-wrap items-center justify-between border-t border-white/10 pt-3 text-xs text-slate-300 gap-2">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <Database className="h-3.5 w-3.5 text-indigo-400" />
              <span>Database: <strong>EduSphere_Pro_DB (v2)</strong></span>
            </span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <Layers className="h-3.5 w-3.5 text-emerald-400" />
              <span>Pending Queue: <strong className={pendingCount > 0 ? 'text-amber-400' : 'text-emerald-400'}>{pendingCount} items</strong></span>
            </span>
          </div>

          <div className="flex items-center gap-1.5 text-slate-300">
            <Clock className="h-3.5 w-3.5 text-indigo-300" />
            <span>Last Cloud Sync: <strong>{lastSyncTime || 'Ready'}</strong></span>
          </div>
        </div>
      </div>

      {/* 4 Storage & Diagnostics KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* 1. Pending Queue */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Pending Queue</span>
            <Database className="h-4 w-4 text-amber-500" />
          </div>
          <div className="mt-2 text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
            {pendingCount}
          </div>
          <div className={`mt-1 text-[11px] font-semibold ${pendingCount > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
            {pendingCount > 0 ? `${pendingCount} changes waiting to sync` : '✓ All changes synchronized'}
          </div>
        </div>

        {/* 2. Cached Attendance Records */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Cached Attendance</span>
            <UserCheck className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="mt-2 text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
            {stats?.attendanceCount || 0}
          </div>
          <div className="mt-1 text-[11px] text-slate-400">
            Local records in IndexedDB
          </div>
        </div>

        {/* 3. Cached Grade Entries */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Cached Gradebooks</span>
            <FileSpreadsheet className="h-4 w-4 text-indigo-500" />
          </div>
          <div className="mt-2 text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
            {stats?.gradesCount || 0}
          </div>
          <div className="mt-1 text-[11px] text-slate-400">
            Weighted assessment entries
          </div>
        </div>

        {/* 4. Background Sync Service Worker */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Service Worker</span>
            <ShieldCheck className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="mt-2 text-base sm:text-lg font-bold text-emerald-600 dark:text-emerald-400">
            Active & Ready
          </div>
          <div className="mt-1 text-[11px] text-slate-400">
            Background Sync API Enabled
          </div>
        </div>
      </div>

      {/* Main Container: Pending Queue Table & Diagnostics */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-6">
        {/* Header with Title and Demo Generator */}
        <div className="flex flex-col justify-between gap-3 border-b border-slate-100 pb-4 dark:border-slate-800 sm:flex-row sm:items-center">
          <div>
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400">
                <Database className="h-4 w-4" />
              </div>
              <h3 className="font-bold text-slate-900 dark:text-white text-base">
                Pending Offline Changes Queue ({pendingActions.length})
              </h3>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Live queue of local mutations awaiting transmission to school database
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              id="btn-create-test-offline-data"
              onClick={handleCreateTestOfflineEntries}
              className="flex items-center gap-1.5 rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-2 text-xs font-bold text-indigo-700 hover:bg-indigo-100 dark:border-indigo-900/50 dark:bg-indigo-950/60 dark:text-indigo-300"
              style={{ minHeight: '40px' }}
              title="Add 2 sample changes to test offline sync behavior"
            >
              <Zap className="h-3.5 w-3.5 text-indigo-500" />
              <span>Simulate 2 Offline Changes</span>
            </button>

            <button
              onClick={refreshData}
              className="flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-300"
              style={{ minHeight: '40px' }}
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* List of Pending Items */}
        {pendingActions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 px-4 text-center rounded-xl bg-slate-50/60 dark:bg-slate-800/30 border border-dashed border-slate-200 dark:border-slate-800">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400 mb-3 shadow-inner">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <h4 className="font-bold text-slate-900 dark:text-white text-sm">
              All Offline Data is Fully Synchronized
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-md">
              There are no pending attendance or gradebook records in local storage. Any new changes made while offline will appear here automatically.
            </p>
            <button
              onClick={handleCreateTestOfflineEntries}
              className="mt-4 flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-indigo-700"
              style={{ minHeight: '38px' }}
            >
              <Zap className="h-3.5 w-3.5" />
              <span>Test Queue with Demo Offline Entry</span>
            </button>
          </div>
        ) : (
          <div className="space-y-2.5">
            {pendingActions.map((action) => (
              <div key={action.id}>{renderActionDetails(action)}</div>
            ))}
          </div>
        )}

        {/* Detailed Storage Engine Specifications & Diagnostics */}
        <div className="border-t border-slate-100 pt-5 dark:border-slate-800 space-y-3">
          <h4 className="font-bold text-xs uppercase tracking-wider text-slate-400">
            IndexedDB Engine Specifications & Protocol
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            <div className="flex justify-between rounded-xl bg-slate-50 p-3 dark:bg-slate-800/60">
              <span className="text-slate-500 dark:text-slate-400">Storage Backend:</span>
              <span className="font-mono font-bold text-slate-900 dark:text-white">IndexedDB (W3C Standard)</span>
            </div>

            <div className="flex justify-between rounded-xl bg-slate-50 p-3 dark:bg-slate-800/60">
              <span className="text-slate-500 dark:text-slate-400">Auto-Sync Protocol:</span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400">Every 30s + Immediate on Reconnect</span>
            </div>

            <div className="flex justify-between rounded-xl bg-slate-50 p-3 dark:bg-slate-800/60">
              <span className="text-slate-500 dark:text-slate-400">Conflict Resolution:</span>
              <span className="font-bold text-slate-900 dark:text-white">Client-Timestamp Vector (LWW)</span>
            </div>

            <div className="flex justify-between rounded-xl bg-slate-50 p-3 dark:bg-slate-800/60">
              <span className="text-slate-500 dark:text-slate-400">Encryption & Safety:</span>
              <span className="font-bold text-indigo-600 dark:text-indigo-400">Local Sandbox Isolated</span>
            </div>
          </div>
        </div>

        {/* Recent Synchronization Audit History */}
        <div className="border-t border-slate-100 pt-5 dark:border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-bold text-xs uppercase tracking-wider text-slate-400">
              Recent Sync Log
            </h4>
            <span className="text-[11px] text-slate-400">Latest 5 events</span>
          </div>

          <div className="space-y-2">
            {syncHistory.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between rounded-xl border border-slate-100 dark:border-slate-800 p-2.5 text-xs bg-slate-50/50 dark:bg-slate-800/30"
              >
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                  <span className="text-slate-700 dark:text-slate-300">
                    Synchronized <strong>{item.count} items</strong> to EduSphere server
                  </span>
                </div>
                <div className="text-[11px] text-slate-400 font-mono">{item.time}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
