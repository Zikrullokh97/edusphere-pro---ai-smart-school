// IndexedDB Local Storage & Offline Persistence Engine for EduSphere Pro
import { AttendanceRecord, GradeEntry } from '../types';
import { MOCK_ATTENDANCE, MOCK_GRADES } from '../data/mockData';

const DB_NAME = 'EduSphere_Pro_DB';
const DB_VERSION = 2;

export interface DBAttendanceRecord extends AttendanceRecord {
  syncStatus?: 'synced' | 'pending';
  lastModified?: number;
}

export interface DBGradeEntry extends GradeEntry {
  id: string;
  syncStatus?: 'synced' | 'pending';
  lastModified?: number;
}

export interface DBSyncAction {
  id: string;
  type: 'attendance_update' | 'attendance_batch' | 'grade_update' | 'grade_batch' | 'homework_created' | 'homework_submitted' | 'homework_grade_approved';
  payload: any;
  timestamp: number;
  status: 'pending' | 'syncing' | 'synced' | 'failed';
  retryCount: number;
  userId?: string;
  schoolId?: string;
  deviceId?: string;
  version?: number;
}

class EduSphereIndexedDB {
  private dbPromise: Promise<IDBDatabase> | null = null;

  // Open & Initialize IndexedDB
  public async getDB(): Promise<IDBDatabase> {
    if (typeof window === 'undefined' || !('indexedDB' in window)) {
      throw new Error('IndexedDB is not supported in this environment');
    }

    if (this.dbPromise) {
      return this.dbPromise;
    }

    this.dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // 1. Attendance Object Store
        if (!db.objectStoreNames.contains('attendance')) {
          const attendanceStore = db.createObjectStore('attendance', { keyPath: 'id' });
          attendanceStore.createIndex('by_class_date', ['className', 'date'], { unique: false });
          attendanceStore.createIndex('by_class', 'className', { unique: false });
          attendanceStore.createIndex('by_date', 'date', { unique: false });
          attendanceStore.createIndex('by_student', 'studentId', { unique: false });
          attendanceStore.createIndex('by_syncStatus', 'syncStatus', { unique: false });
        }

        // 2. Grades Object Store
        if (!db.objectStoreNames.contains('grades')) {
          const gradesStore = db.createObjectStore('grades', { keyPath: 'id' });
          gradesStore.createIndex('by_class_subject', ['className', 'subject'], { unique: false });
          gradesStore.createIndex('by_class', 'className', { unique: false });
          gradesStore.createIndex('by_subject', 'subject', { unique: false });
          gradesStore.createIndex('by_student', 'studentId', { unique: false });
          gradesStore.createIndex('by_syncStatus', 'syncStatus', { unique: false });
        }

        // 3. Sync Queue Object Store
        if (!db.objectStoreNames.contains('sync_queue')) {
          const syncStore = db.createObjectStore('sync_queue', { keyPath: 'id' });
          syncStore.createIndex('by_status', 'status', { unique: false });
          syncStore.createIndex('by_timestamp', 'timestamp', { unique: false });
        }

        // 4. Metadata Store (Key-Value)
        if (!db.objectStoreNames.contains('metadata')) {
          db.createObjectStore('metadata', { keyPath: 'key' });
        }
      };

      request.onsuccess = async (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        // Check if initial seeding is needed
        await this.seedInitialData(db);
        resolve(db);
      };

      request.onerror = (event) => {
        console.error('IndexedDB open error:', (event.target as IDBOpenDBRequest).error);
        reject((event.target as IDBOpenDBRequest).error);
      };
    });

    return this.dbPromise;
  }

  // Pre-populate IndexedDB with standard school baseline if empty
  private async seedInitialData(db: IDBDatabase): Promise<void> {
    try {
      const tx = db.transaction(['attendance', 'grades', 'metadata'], 'readwrite');
      const attendanceStore = tx.objectStore('attendance');
      const gradesStore = tx.objectStore('grades');
      const metaStore = tx.objectStore('metadata');

      const countReq = attendanceStore.count();
      countReq.onsuccess = () => {
        if (countReq.result === 0) {
          // Seed Attendance
          MOCK_ATTENDANCE.forEach((rec) => {
            const item: DBAttendanceRecord = {
              ...rec,
              id: rec.id || `att-${rec.studentId}-${rec.date || '2026-08-20'}`,
              syncStatus: 'synced',
              lastModified: Date.now(),
            };
            attendanceStore.put(item);
          });

          // Seed Grades for various classes
          const classes = ['7-A', '8-B', '9-A', '10-B'];
          const subjects = ['Mathematics', 'Physics', 'Computer Science', 'English'];

          classes.forEach((cls) => {
            subjects.forEach((subj) => {
              MOCK_GRADES.forEach((g) => {
                const gradeId = `grd-${g.studentId}-${cls}-${subj.replace(/\s+/g, '')}`;
                const item: DBGradeEntry = {
                  ...g,
                  id: gradeId,
                  className: cls,
                  subject: subj,
                  syncStatus: 'synced',
                  lastModified: Date.now(),
                };
                gradesStore.put(item);
              });
            });
          });

          // Metadata initialized
          metaStore.put({
            key: 'last_seed_time',
            value: Date.now(),
            version: '2.0.0',
          });
        }
      };
    } catch (err) {
      console.warn('Seed initial data error (non-fatal):', err);
    }
  }

  // ==================== ATTENDANCE METHODS ====================

  public async getAttendanceRecords(className?: string, date?: string): Promise<DBAttendanceRecord[]> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('attendance', 'readonly');
      const store = tx.objectStore('attendance');
      const request = store.getAll();

      request.onsuccess = () => {
        let results = request.result as DBAttendanceRecord[];
        if (className) {
          results = results.filter((r) => r.className === className);
        }
        if (date) {
          results = results.filter((r) => r.date === date);
        }
        resolve(results);
      };

      request.onerror = () => reject(request.error);
    });
  }

  public async saveAttendanceRecord(
    record: AttendanceRecord,
    syncStatus: 'synced' | 'pending' = 'pending'
  ): Promise<DBAttendanceRecord> {
    const db = await this.getDB();
    const dbItem: DBAttendanceRecord = {
      ...record,
      id: record.id || `att-${record.studentId}-${record.date}-${record.className}`,
      syncStatus,
      lastModified: Date.now(),
    };

    return new Promise((resolve, reject) => {
      const tx = db.transaction('attendance', 'readwrite');
      const store = tx.objectStore('attendance');
      const req = store.put(dbItem);

      req.onsuccess = () => resolve(dbItem);
      req.onerror = () => reject(req.error);
    });
  }

  public async saveBatchAttendance(
    records: AttendanceRecord[],
    syncStatus: 'synced' | 'pending' = 'pending'
  ): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('attendance', 'readwrite');
      const store = tx.objectStore('attendance');

      records.forEach((rec) => {
        const item: DBAttendanceRecord = {
          ...rec,
          id: rec.id || `att-${rec.studentId}-${rec.date}-${rec.className}`,
          syncStatus,
          lastModified: Date.now(),
        };
        store.put(item);
      });

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  // ==================== GRADES METHODS ====================

  public async getGradeEntries(className = '7-A', subject = 'Mathematics'): Promise<DBGradeEntry[]> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('grades', 'readonly');
      const store = tx.objectStore('grades');
      const request = store.getAll();

      request.onsuccess = () => {
        let results = request.result as DBGradeEntry[];
        results = results.filter(
          (g) => (g.className || '7-A') === className && (g.subject || 'Mathematics') === subject
        );

        // Fallback: If no records yet for this combo, populate from base mock
        if (results.length === 0) {
          const seeded = MOCK_GRADES.map((g) => ({
            ...g,
            id: `grd-${g.studentId}-${className}-${subject.replace(/\s+/g, '')}`,
            className,
            subject,
            syncStatus: 'synced' as const,
            lastModified: Date.now(),
          }));
          this.saveBatchGrades(seeded, 'synced').catch(console.warn);
          resolve(seeded);
          return;
        }

        resolve(results);
      };

      request.onerror = () => reject(request.error);
    });
  }

  public async saveGradeEntry(
    entry: GradeEntry,
    syncStatus: 'synced' | 'pending' = 'pending'
  ): Promise<DBGradeEntry> {
    const db = await this.getDB();
    const className = entry.className || '7-A';
    const subject = entry.subject || 'Mathematics';
    const id = entry.id || `grd-${entry.studentId}-${className}-${subject.replace(/\s+/g, '')}`;

    const dbItem: DBGradeEntry = {
      ...entry,
      id,
      className,
      subject,
      syncStatus,
      lastModified: Date.now(),
    };

    return new Promise((resolve, reject) => {
      const tx = db.transaction('grades', 'readwrite');
      const store = tx.objectStore('grades');
      const req = store.put(dbItem);

      req.onsuccess = () => resolve(dbItem);
      req.onerror = () => reject(req.error);
    });
  }

  public async saveBatchGrades(
    entries: GradeEntry[],
    syncStatus: 'synced' | 'pending' = 'pending'
  ): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('grades', 'readwrite');
      const store = tx.objectStore('grades');

      entries.forEach((g) => {
        const className = g.className || '7-A';
        const subject = g.subject || 'Mathematics';
        const id = g.id || `grd-${g.studentId}-${className}-${subject.replace(/\s+/g, '')}`;
        const item: DBGradeEntry = {
          ...g,
          id,
          className,
          subject,
          syncStatus,
          lastModified: Date.now(),
        };
        store.put(item);
      });

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  // ==================== SYNC QUEUE METHODS ====================

  public async enqueueSyncAction(
    type: DBSyncAction['type'],
    payload: any
  ): Promise<DBSyncAction> {
    const db = await this.getDB();
    const action: DBSyncAction = {
      id: `sync-${Date.now()}-${Math.random().toString(36).substr(2, 7)}`,
      type,
      payload,
      timestamp: Date.now(),
      status: 'pending',
      retryCount: 0,
      userId: undefined,
      schoolId: undefined,
      deviceId: typeof navigator !== 'undefined' ? navigator.userAgent.slice(0, 120) : 'server',
      version: typeof payload.version === 'number' ? payload.version : 0,
    };

    return new Promise((resolve, reject) => {
      const tx = db.transaction('sync_queue', 'readwrite');
      const store = tx.objectStore('sync_queue');
      const req = store.put(action);

      req.onsuccess = () => resolve(action);
      req.onerror = () => reject(req.error);
    });
  }

  public async markSyncActionsFailed(actionIds: string[]): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('sync_queue', 'readwrite');
      const store = tx.objectStore('sync_queue');
      actionIds.forEach((id) => {
        const request = store.get(id);
        request.onsuccess = () => {
          const action = request.result as DBSyncAction | undefined;
          if (action) store.put({ ...action, status: 'failed', retryCount: action.retryCount + 1 });
        };
      });
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  public async getPendingSyncActions(): Promise<DBSyncAction[]> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('sync_queue', 'readonly');
      const store = tx.objectStore('sync_queue');
      const req = store.getAll();

      req.onsuccess = () => {
        const all = req.result as DBSyncAction[];
        resolve(all.filter((a) => a.status === 'pending' || a.status === 'failed'));
      };

      req.onerror = () => reject(req.error);
    });
  }

  public async markSyncActionsDone(actionIds: string[]): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(['sync_queue', 'attendance', 'grades'], 'readwrite');
      const syncStore = tx.objectStore('sync_queue');
      const attStore = tx.objectStore('attendance');
      const grdStore = tx.objectStore('grades');

      actionIds.forEach((id) => {
        syncStore.delete(id);
      });

      // Mark all attendance as synced
      const attReq = attStore.getAll();
      attReq.onsuccess = () => {
        (attReq.result as DBAttendanceRecord[]).forEach((rec) => {
          if (rec.syncStatus === 'pending') {
            attStore.put({ ...rec, syncStatus: 'synced' });
          }
        });
      };

      // Mark all grades as synced
      const grdReq = grdStore.getAll();
      grdReq.onsuccess = () => {
        (grdReq.result as DBGradeEntry[]).forEach((g) => {
          if (g.syncStatus === 'pending') {
            grdStore.put({ ...g, syncStatus: 'synced' });
          }
        });
      };

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  // Diagnostics & Status
  public async getStorageStats(): Promise<{
    attendanceCount: number;
    gradesCount: number;
    pendingSyncCount: number;
    dbName: string;
    version: number;
    supported: boolean;
    lastSyncedAt?: string;
  }> {
    if (typeof window === 'undefined' || !('indexedDB' in window)) {
      return {
        attendanceCount: 0,
        gradesCount: 0,
        pendingSyncCount: 0,
        dbName: DB_NAME,
        version: DB_VERSION,
        supported: false,
      };
    }

    try {
      const db = await this.getDB();
      const tx = db.transaction(['attendance', 'grades', 'sync_queue', 'metadata'], 'readonly');
      const attStore = tx.objectStore('attendance');
      const grdStore = tx.objectStore('grades');
      const syncStore = tx.objectStore('sync_queue');
      const metaStore = tx.objectStore('metadata');

      const [attCount, grdCount, syncCount, lastSyncMeta] = await Promise.all([
        new Promise<number>((res) => {
          const r = attStore.count();
          r.onsuccess = () => res(r.result);
          r.onerror = () => res(0);
        }),
        new Promise<number>((res) => {
          const r = grdStore.count();
          r.onsuccess = () => res(r.result);
          r.onerror = () => res(0);
        }),
        new Promise<number>((res) => {
          const r = syncStore.count();
          r.onsuccess = () => res(r.result);
          r.onerror = () => res(0);
        }),
        new Promise<string | undefined>((res) => {
          const r = metaStore.get('last_successful_sync');
          r.onsuccess = () => res(r.result?.value);
          r.onerror = () => res(undefined);
        }),
      ]);

      return {
        attendanceCount: attCount,
        gradesCount: grdCount,
        pendingSyncCount: syncCount,
        dbName: DB_NAME,
        version: DB_VERSION,
        supported: true,
        lastSyncedAt: lastSyncMeta,
      };
    } catch (e) {
      return {
        attendanceCount: 0,
        gradesCount: 0,
        pendingSyncCount: 0,
        dbName: DB_NAME,
        version: DB_VERSION,
        supported: true,
      };
    }
  }

  public async setLastSyncTime(): Promise<void> {
    const db = await this.getDB();
    const tx = db.transaction('metadata', 'readwrite');
    const metaStore = tx.objectStore('metadata');
    metaStore.put({
      key: 'last_successful_sync',
      value: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      timestamp: Date.now(),
    });
  }

  public async clearSessionData(): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(['attendance', 'grades', 'sync_queue'], 'readwrite');
      tx.objectStore('attendance').clear();
      tx.objectStore('grades').clear();
      tx.objectStore('sync_queue').clear();
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }
}

export const offlineDB = new EduSphereIndexedDB();
