// PWA, Service Worker & IndexedDB Synchronization Engine for EduSphere Pro
import { offlineDB, DBAttendanceRecord, DBGradeEntry, DBSyncAction } from './indexedDB';
import { AttendanceRecord, GradeEntry } from '../types';
import { auth } from './firebase';
import { authenticatedFetch } from './api';

export interface PWAStats {
  attendanceCount: number;
  gradesCount: number;
  pendingSyncCount: number;
  isOnline: boolean;
  isSimulatedOffline: boolean;
  isServiceWorkerReady: boolean;
  lastSyncedAt?: string;
}

class PWAOfflineManager {
  private onlineListeners: Set<(isOnline: boolean) => void> = new Set();
  private syncListeners: Set<(isSyncing: boolean, count: number, lastSyncTime?: string) => void> = new Set();
  private statsListeners: Set<(stats: PWAStats) => void> = new Set();

  private installPromptEvent: any = null;
  private isOnline: boolean = typeof navigator !== 'undefined' ? navigator.onLine : true;
  private isSimulatedOffline: boolean = false;
  private isSyncing: boolean = false;
  private isSWReady: boolean = false;
  private lastSyncedTime: string = '';
  private retryBackoffMap: Map<string, number> = new Map();
  private readonly MAX_RETRIES: number = 5;

  constructor() {
    if (typeof window !== 'undefined') {
      // 1. Initialize IndexedDB
      offlineDB.getDB().catch((err) => {
        console.warn('[PWA] IndexedDB Init Warning:', err);
      });

      // 2. Register Service Worker
      this.initServiceWorker();

      // 3. Setup Hardware Network Listeners
      window.addEventListener('online', () => {
        this.handleNetworkStatusChange(true);
      });

      window.addEventListener('offline', () => {
        this.handleNetworkStatusChange(false);
      });

      // 4. PWA Install Prompt Listener
      window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        this.installPromptEvent = e;
      });

      // 5. Initial stats calculation & check if pending syncs exist
      setTimeout(() => {
        this.refreshStats();
        if (this.effectiveOnlineStatus()) {
          this.processSyncQueue();
        }
      }, 1000);

      // Periodic auto-sync checker (every 30s when online)
      setInterval(() => {
        if (this.effectiveOnlineStatus() && !this.isSyncing) {
          this.processSyncQueue();
        }
      }, 30000);
    }
  }

  // Register Service Worker and listen for worker messages
  private async initServiceWorker() {
    if ('serviceWorker' in navigator) {
      try {
        const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
        this.isSWReady = true;

        // Listen for messages from Service Worker (e.g. background sync triggers)
        navigator.serviceWorker.addEventListener('message', (event) => {
          if (event.data?.type === 'TRIGGER_BACKGROUND_SYNC') {
            console.log('[PWA] ServiceWorker requested background sync');
            this.processSyncQueue();
          }
        });

        // Request Background Sync registration if supported
        if ('sync' in reg) {
          try {
            await (reg as any).sync.register('edusphere-sync');
          } catch (e) {
            // sync register optional
          }
        }
      } catch (err) {
        console.warn('[PWA] Service Worker registration failed:', err);
      }
    }
  }

  private effectiveOnlineStatus(): boolean {
    if (this.isSimulatedOffline) return false;
    return this.isOnline;
  }

  public getIsOnline(): boolean {
    return this.effectiveOnlineStatus();
  }

  public getIsSimulatedOffline(): boolean {
    return this.isSimulatedOffline;
  }

  public setSimulatedOffline(simulated: boolean) {
    this.isSimulatedOffline = simulated;
    const currentEffective = this.effectiveOnlineStatus();
    this.notifyOnlineState(currentEffective);
    this.refreshStats();

    if (currentEffective) {
      this.processSyncQueue();
    }
  }

  private handleNetworkStatusChange(online: boolean) {
    this.isOnline = online;
    const effective = this.effectiveOnlineStatus();
    this.notifyOnlineState(effective);
    this.refreshStats();

    if (effective) {
      this.processSyncQueue();
    }
  }

  // ==================== ATTENDANCE OFFLINE PERSISTENCE ====================

  public async recordAttendance(
    record: AttendanceRecord,
    studentName?: string
  ): Promise<DBAttendanceRecord> {
    const isOnline = this.effectiveOnlineStatus();
    const syncStatus = isOnline ? 'pending' : 'pending';

    // 1. Immediately store in IndexedDB
    const saved = await offlineDB.saveAttendanceRecord(record, syncStatus);

    // 2. Enqueue action in IndexedDB sync queue
    await offlineDB.enqueueSyncAction('attendance_update', {
      studentId: record.studentId,
      studentName: studentName || record.studentName,
      status: record.status,
      date: record.date,
      className: record.className,
      lessonId: record.lessonId,
      classId: record.classId,
      subjectId: record.subjectId,
      time: record.time || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      method: record.method || 'manual',
    });

    this.refreshStats();

    // 3. If online, trigger immediate synchronization
    if (isOnline) {
      this.processSyncQueue();
    }

    return saved;
  }

  public async recordBatchAttendance(
    records: AttendanceRecord[],
    className: string,
    date: string
  ): Promise<void> {
    const isOnline = this.effectiveOnlineStatus();

    // 1. Save all to IndexedDB
    await offlineDB.saveBatchAttendance(records, 'pending');

    // 2. Enqueue batch sync action
    await offlineDB.enqueueSyncAction('attendance_batch', {
      className,
      date,
      records: records.map((r) => ({
        studentId: r.studentId,
        studentName: r.studentName,
        status: r.status,
        date: r.date,
        className: r.className,
        lessonId: r.lessonId,
        classId: r.classId,
        subjectId: r.subjectId,
      })),
    });

    this.refreshStats();

    if (isOnline) {
      this.processSyncQueue();
    }
  }

  // ==================== GRADES OFFLINE PERSISTENCE ====================

  public async recordGrade(
    entry: GradeEntry,
    field: 'homework' | 'quizzes' | 'midterm' | 'finalExam',
    indexOrValue: number,
    value?: number
  ): Promise<DBGradeEntry> {
    const isOnline = this.effectiveOnlineStatus();

    // 1. Save to IndexedDB
    const saved = await offlineDB.saveGradeEntry(entry, 'pending');

    // 2. Enqueue grade update
    await offlineDB.enqueueSyncAction('grade_update', {
      studentId: entry.studentId,
      studentName: entry.studentName,
      className: entry.className || '7-A',
      subject: entry.subject || 'Mathematics',
      field,
      indexOrValue,
      value,
      updatedAverage: entry.average,
    });

    this.refreshStats();

    if (isOnline) {
      this.processSyncQueue();
    }

    return saved;
  }

  // ==================== AUTOMATIC & MANUAL SYNC ENGINE ====================

  public async processSyncQueue(): Promise<{ success: boolean; syncedCount: number }> {
    if (!this.effectiveOnlineStatus() || this.isSyncing) {
      return { success: false, syncedCount: 0 };
    }

    const pendingActions = await offlineDB.getPendingSyncActions();
    if (pendingActions.length === 0) {
      return { success: true, syncedCount: 0 };
    }

    const now = Date.now();
    const eligibleActions = pendingActions.filter((action) => {
      if ((action.retryCount || 0) >= this.MAX_RETRIES) return false;
      const nextRetry = this.retryBackoffMap.get(action.id) || 0;
      return now >= nextRetry;
    });

    if (eligibleActions.length === 0) {
      return { success: true, syncedCount: 0 };
    }

    this.isSyncing = true;
    this.notifySyncState(true, eligibleActions.length);

    try {
      // Send batch of eligible pending actions to backend server
      const res = await authenticatedFetch('/api/sync', {
        method: 'POST',
        body: JSON.stringify({
          actions: eligibleActions,
          clientTimestamp: Date.now(),
        }),
      });

      if (res.ok) {
        const actionIds = eligibleActions.map((a) => a.id);
        actionIds.forEach((id) => this.retryBackoffMap.delete(id));

        // Mark all these actions as synced and clean IndexedDB queue
        await offlineDB.markSyncActionsDone(actionIds);
        await offlineDB.setLastSyncTime();

        this.lastSyncedTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        this.isSyncing = false;
        this.notifySyncState(false, 0, this.lastSyncedTime);
        this.refreshStats();

        // Notify Service Worker of completed sync
        if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
          navigator.serviceWorker.controller.postMessage({
            type: 'SYNC_COMPLETED',
            count: eligibleActions.length,
          });
        }

        return { success: true, syncedCount: eligibleActions.length };
      }

      await offlineDB.markSyncActionsFailed(eligibleActions.map((a) => a.id));

      if (res.status >= 400 && res.status < 500 && res.status !== 429) {
        // Permanent client error: do not repeatedly retry invalid payloads
        eligibleActions.forEach((a) => this.retryBackoffMap.set(a.id, Date.now() + 86400000));
        if (res.status === 409) console.warn('[PWA Sync] Server conflict; mutation preserved.');
      } else {
        // 5xx / 429 server error: exponential backoff with jitter
        eligibleActions.forEach((a) => {
          const nextRetry = (a.retryCount || 0) + 1;
          const backoffDelay = Math.min(30000, 1000 * Math.pow(2, nextRetry)) + Math.floor(Math.random() * 500);
          this.retryBackoffMap.set(a.id, Date.now() + backoffDelay);
        });
      }
    } catch (err) {
      console.warn('[PWA Sync] Network sync attempt failed, scheduled exponential retry:', err);
      await offlineDB.markSyncActionsFailed(eligibleActions.map((a) => a.id));
      eligibleActions.forEach((a) => {
        const nextRetry = (a.retryCount || 0) + 1;
        const backoffDelay = Math.min(30000, 1000 * Math.pow(2, nextRetry)) + Math.floor(Math.random() * 500);
        this.retryBackoffMap.set(a.id, Date.now() + backoffDelay);
      });
    }

    this.isSyncing = false;
    this.notifySyncState(false, pendingActions.length);
    this.refreshStats();
    return { success: false, syncedCount: 0 };
  }

  // ==================== SUBSCRIPTIONS & EVENT EMITTERS ====================

  public subscribeOnlineState(callback: (isOnline: boolean) => void) {
    this.onlineListeners.add(callback);
    callback(this.effectiveOnlineStatus());
    return () => this.onlineListeners.delete(callback);
  }

  public subscribeSync(callback: (isSyncing: boolean, count: number, lastSync?: string) => void) {
    this.syncListeners.add(callback);
    this.getPendingSyncCount().then((count) => {
      callback(this.isSyncing, count, this.lastSyncedTime);
    });
    return () => this.syncListeners.delete(callback);
  }

  public subscribeStats(callback: (stats: PWAStats) => void) {
    this.statsListeners.add(callback);
    this.getStats().then(callback);
    return () => this.statsListeners.delete(callback);
  }

  public async getPendingSyncCount(): Promise<number> {
    const actions = await offlineDB.getPendingSyncActions();
    return actions.length;
  }

  public async getStats(): Promise<PWAStats> {
    const dbStats = await offlineDB.getStorageStats();
    return {
      attendanceCount: dbStats.attendanceCount,
      gradesCount: dbStats.gradesCount,
      pendingSyncCount: dbStats.pendingSyncCount,
      isOnline: this.effectiveOnlineStatus(),
      isSimulatedOffline: this.isSimulatedOffline,
      isServiceWorkerReady: this.isSWReady,
      lastSyncedAt: dbStats.lastSyncedAt || this.lastSyncedTime,
    };
  }

  public async clearSessionData(): Promise<void> {
    await offlineDB.clearSessionData();
    this.refreshStats();
  }

  private async refreshStats() {
    const stats = await this.getStats();
    this.statsListeners.forEach((cb) => cb(stats));
  }

  private notifyOnlineState(online: boolean) {
    this.onlineListeners.forEach((cb) => cb(online));
  }

  private notifySyncState(syncing: boolean, count: number, lastSyncTime?: string) {
    this.syncListeners.forEach((cb) => cb(syncing, count, lastSyncTime || this.lastSyncedTime));
  }

  // Compatibility helper
  public queueAction(type: string, payload: any) {
    const actionTypes: Record<string, DBSyncAction['type']> = {
      attendance: 'attendance_update',
      attendance_update: 'attendance_update',
      grade_update: 'grade_update',
      homework_created: 'homework_created',
      homework_submitted: 'homework_submitted',
      homework_grade_approved: 'homework_grade_approved',
    };
    const actionType = actionTypes[type];
    if (actionType) {
      offlineDB.enqueueSyncAction(actionType, payload).then(() => {
        this.refreshStats();
        if (this.effectiveOnlineStatus()) this.processSyncQueue();
      });
    }
  }

  // PWA Install API
  public canInstallPWA(): boolean {
    return Boolean(this.installPromptEvent);
  }

  public async promptInstall(): Promise<boolean> {
    if (!this.installPromptEvent) return false;
    this.installPromptEvent.prompt();
    const choice = await this.installPromptEvent.userChoice;
    this.installPromptEvent = null;
    return choice.outcome === 'accepted';
  }
}

export const pwaManager = new PWAOfflineManager();
