import React, { useState, useEffect } from 'react';
import {
  WifiOff,
  Wifi,
  RefreshCw,
  Download,
  CheckCircle2,
  X,
  Database,
  CloudCheck,
  HardDrive,
  Info,
} from 'lucide-react';
import { pwaManager, PWAStats } from '../../lib/pwa';

export const PWAStatusBanner: React.FC = () => {
  const [isOnline, setIsOnline] = useState<boolean>(pwaManager.getIsOnline());
  const [isSimulatedOffline, setIsSimulatedOffline] = useState<boolean>(pwaManager.getIsSimulatedOffline());
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [stats, setStats] = useState<PWAStats | null>(null);
  const [canInstall, setCanInstall] = useState<boolean>(false);
  const [showInstallBanner, setShowInstallBanner] = useState<boolean>(true);
  const [showSuccessToast, setShowSuccessToast] = useState<boolean>(false);
  const [showDetailsModal, setShowDetailsModal] = useState<boolean>(false);

  useEffect(() => {
    const unsubOnline = pwaManager.subscribeOnlineState((online) => {
      setIsOnline(online);
      setIsSimulatedOffline(pwaManager.getIsSimulatedOffline());
    });

    const unsubSync = pwaManager.subscribeSync((syncing, count) => {
      setIsSyncing(syncing);
      setPendingCount(count);
      if (!syncing && count === 0 && pendingCount > 0) {
        setShowSuccessToast(true);
        setTimeout(() => setShowSuccessToast(false), 4000);
      }
    });

    const unsubStats = pwaManager.subscribeStats((st) => {
      setStats(st);
      setPendingCount(st.pendingSyncCount);
      setIsOnline(st.isOnline);
      setIsSimulatedOffline(st.isSimulatedOffline);
    });

    // Check installability periodically
    const timer = setInterval(() => {
      setCanInstall(pwaManager.canInstallPWA());
    }, 2500);

    return () => {
      unsubOnline();
      unsubSync();
      unsubStats();
      clearInterval(timer);
    };
  }, [pendingCount]);

  const handleInstall = async () => {
    const installed = await pwaManager.promptInstall();
    if (installed) {
      setCanInstall(false);
      setShowInstallBanner(false);
    }
  };

  const handleManualSync = () => {
    pwaManager.processSyncQueue();
  };

  const handleToggleOffline = () => {
    pwaManager.setSimulatedOffline(!isSimulatedOffline);
  };

  return (
    <>
      <div className="fixed bottom-18 md:bottom-4 left-4 right-4 z-50 pointer-events-none flex flex-col items-center gap-2 max-w-lg mx-auto">
        {/* Offline Alert Bar */}
        {!isOnline && (
          <div className="pointer-events-auto w-full flex items-center justify-between rounded-2xl bg-amber-500/95 text-slate-950 px-4 py-2.5 shadow-2xl backdrop-blur-md text-xs font-semibold border border-amber-400">
            <div className="flex items-center gap-2.5">
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-slate-950 text-amber-400">
                <WifiOff className="h-3.5 w-3.5" />
              </div>
              <div>
                <div className="font-bold">
                  {isSimulatedOffline ? 'Simulated Offline Mode' : 'Network Disconnected'}
                </div>
                <div className="text-[11px] text-slate-900/80 font-medium">
                  {pendingCount > 0
                    ? `${pendingCount} changes saved to IndexedDB (auto-syncs on connect)`
                    : 'IndexedDB active. Record attendance & grades safely.'}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                onClick={handleToggleOffline}
                className="rounded-lg bg-slate-950/20 hover:bg-slate-950/30 px-2.5 py-1 text-[11px] font-bold text-slate-950 transition-colors"
                title="Toggle offline test mode"
              >
                {isSimulatedOffline ? 'Go Online' : 'Inspect'}
              </button>
              <button
                onClick={handleManualSync}
                className="flex items-center gap-1 bg-slate-950 text-white rounded-lg px-2.5 py-1 text-[11px] font-bold hover:bg-slate-900 shadow-xs"
              >
                <RefreshCw className={`h-3 w-3 ${isSyncing ? 'animate-spin' : ''}`} />
                Sync
              </button>
            </div>
          </div>
        )}

        {/* Sync In Progress */}
        {isSyncing && isOnline && (
          <div className="pointer-events-auto flex items-center gap-2.5 rounded-2xl bg-indigo-900/95 border border-indigo-500/50 text-white px-4 py-2.5 shadow-2xl backdrop-blur-md text-xs font-semibold animate-slideDown">
            <RefreshCw className="h-4 w-4 animate-spin text-indigo-300 shrink-0" />
            <span>Synchronizing {pendingCount} offline records to EduSphere Cloud...</span>
          </div>
        )}

        {/* Sync Success Toast */}
        {showSuccessToast && isOnline && (
          <div className="pointer-events-auto flex items-center gap-2 rounded-2xl bg-emerald-700/95 border border-emerald-500/50 text-white px-4 py-2.5 shadow-2xl backdrop-blur-md text-xs font-semibold animate-slideDown">
            <CheckCircle2 className="h-4 w-4 text-emerald-300 shrink-0" />
            <span>✓ All offline attendance & grades synchronized to backend database!</span>
          </div>
        )}

        {/* PWA Install Promotion Banner */}
        {canInstall && showInstallBanner && (
          <div className="pointer-events-auto w-full flex items-center justify-between rounded-2xl bg-slate-900/95 text-white border border-indigo-500/40 p-3 shadow-2xl backdrop-blur-md text-xs">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-md">
                <Download className="h-4 w-4" />
              </div>
              <div>
                <div className="font-bold text-slate-100">Install EduSphere PWA</div>
                <div className="text-[11px] text-indigo-300">Fast offline recording for teachers & parents</div>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                onClick={handleInstall}
                className="rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 font-bold text-xs shadow-md transition-colors"
              >
                Install
              </button>
              <button
                onClick={() => setShowInstallBanner(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* IndexedDB Details Inspector Modal */}
      {showDetailsModal && stats && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl dark:bg-slate-900 animate-slideDown">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400">
                  <Database className="h-4 w-4" />
                </div>
                <h3 className="font-bold text-slate-900 dark:text-white text-base">
                  IndexedDB Storage Diagnostics
                </h3>
              </div>
              <button
                onClick={() => setShowDetailsModal(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4 space-y-2.5 text-xs">
              <div className="flex justify-between rounded-xl bg-slate-50 p-3 dark:bg-slate-800">
                <span className="text-slate-500 dark:text-slate-400">Database Name:</span>
                <span className="font-mono font-bold text-slate-900 dark:text-white">EduSphere_Pro_DB</span>
              </div>
              <div className="flex justify-between rounded-xl bg-slate-50 p-3 dark:bg-slate-800">
                <span className="text-slate-500 dark:text-slate-400">Stored Attendance Records:</span>
                <span className="font-bold text-slate-900 dark:text-white">{stats.attendanceCount}</span>
              </div>
              <div className="flex justify-between rounded-xl bg-slate-50 p-3 dark:bg-slate-800">
                <span className="text-slate-500 dark:text-slate-400">Stored Grade Entries:</span>
                <span className="font-bold text-slate-900 dark:text-white">{stats.gradesCount}</span>
              </div>
              <div className="flex justify-between rounded-xl bg-slate-50 p-3 dark:bg-slate-800">
                <span className="text-slate-500 dark:text-slate-400">Pending Sync Queue:</span>
                <span className={`font-bold ${stats.pendingSyncCount > 0 ? 'text-amber-500' : 'text-emerald-500'}`}>
                  {stats.pendingSyncCount} items
                </span>
              </div>
              <div className="flex justify-between rounded-xl bg-slate-50 p-3 dark:bg-slate-800">
                <span className="text-slate-500 dark:text-slate-400">Service Worker Status:</span>
                <span className="font-bold text-emerald-500">Active (Background Sync enabled)</span>
              </div>
              {stats.lastSyncedAt && (
                <div className="flex justify-between rounded-xl bg-slate-50 p-3 dark:bg-slate-800">
                  <span className="text-slate-500 dark:text-slate-400">Last Synced to Cloud:</span>
                  <span className="font-bold text-indigo-500">{stats.lastSyncedAt}</span>
                </div>
              )}
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => {
                  pwaManager.processSyncQueue();
                  setShowDetailsModal(false);
                }}
                className="w-full rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-indigo-700"
                style={{ minHeight: '44px' }}
              >
                Trigger Immediate Cloud Sync
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
