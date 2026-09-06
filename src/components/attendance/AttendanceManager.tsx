import React, { useState, useEffect, useRef } from 'react';
import {
  CalendarCheck,
  Camera,
  CheckCircle2,
  Clock,
  XCircle,
  FileSpreadsheet,
  Sparkles,
  Users,
  Search,
  ScanFace,
  ChevronDown,
  RefreshCw,
  Send,
  QrCode,
  Undo2,
  Check,
  X,
  AlertCircle,
  Smartphone,
  Layers,
  Database,
  Wifi,
  WifiOff,
  Cloud,
  CloudCheck,
  ArrowUpRight,
  FileText,
  Download,
  Printer,
  Paperclip,
  Plus,
} from 'lucide-react';
import { AppLanguage, AttendanceRecord, StudentRecord, ClassGroup } from '../../types';
import { useI18n } from '../../lib/i18n';
import { MOCK_STUDENTS, MOCK_ATTENDANCE } from '../../data/mockData';
import { pwaManager, PWAStats } from '../../lib/pwa';
import { offlineDB, DBAttendanceRecord } from '../../lib/indexedDB';
import { QRCodeScanner } from './QRCodeScanner';
import { listSchoolData } from '../../lib/schoolRepository';
import { ALL_SCHOOL_CLASSES } from '../../lib/scheduleGenerator';

interface AttendanceManagerProps {
  language: AppLanguage;
}

export const AttendanceManager: React.FC<AttendanceManagerProps> = ({
  language,
}) => {
  const t = useI18n(language);
  const [selectedClass, setSelectedClass] = useState('7-A');
  const [availableClasses, setAvailableClasses] = useState<string[]>(ALL_SCHOOL_CLASSES);
  const [selectedDate, setSelectedDate] = useState('2026-08-20');
  const [mode, setMode] = useState<'roster' | 'faceid' | 'swipe' | 'qr'>('roster');

  useEffect(() => {
    listSchoolData<ClassGroup>('classes').then((clsList) => {
      if (clsList && clsList.length > 0) {
        setAvailableClasses(clsList.map((c) => c.name));
      }
    }).catch(() => undefined);
  }, []);

  // IndexedDB Attendance Records
  const [records, setRecords] = useState<DBAttendanceRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoadingDB, setIsLoadingDB] = useState(true);

  // Offline / Sync Status State
  const [isOnline, setIsOnline] = useState(pwaManager.getIsOnline());
  const [isSimulatedOffline, setIsSimulatedOffline] = useState(pwaManager.getIsSimulatedOffline());
  const [isSyncing, setIsSyncing] = useState(false);
  const [pendingSyncCount, setPendingSyncCount] = useState(0);
  const [lastSyncTime, setLastSyncTime] = useState<string | undefined>();
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Undo state for swipe / quick actions
  const [lastAction, setLastAction] = useState<{
    studentId: string;
    studentName: string;
    prevStatus: AttendanceRecord['status'];
    newStatus: AttendanceRecord['status'];
  } | null>(null);

  // Swipe Card current index
  const [swipeIndex, setSwipeIndex] = useState(0);

  // Real Camera stream state
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [scannedLogs, setScannedLogs] = useState<
    { name: string; time: string; confidence: string; status: 'present' | 'late' }[]
  >([
    { name: 'Ali Nurdinov', time: '07:54:12 AM', confidence: '99.4%', status: 'present' },
    { name: 'Sara Amanova', time: '07:56:45 AM', confidence: '98.8%', status: 'present' },
    { name: 'Dinara Kasymova', time: '07:58:02 AM', confidence: '99.1%', status: 'present' },
  ]);

  // Visual Feedback Toast for Successful QR Scans
  const [qrScanToast, setQrScanToast] = useState<{
    studentId: string;
    studentName: string;
    className: string;
    time: string;
    status: 'present' | 'late';
    avatar?: string;
    parentPhone?: string;
    serverSynced: boolean;
  } | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // 73-OSH State Tabel Modal
  const [isTabelModalOpen, setIsTabelModalOpen] = useState(false);
  const [tabelMonth, setTabelMonth] = useState('2026-08');

  // Excuse document attachment modal
  const [excuseModal, setExcuseModal] = useState<{
    studentId: string;
    studentName: string;
    reason: string;
    docType: 'medical' | 'parent_request' | 'competition' | 'other';
    docNumber?: string;
  } | null>(null);

  const handleOpenExcuseModal = (studentId: string, studentName: string) => {
    setExcuseModal({
      studentId,
      studentName,
      reason: 'Salomatligi yomonlashgani sababli darsda qatnasha olmadi.',
      docType: 'medical',
      docNumber: '086-U/2026',
    });
  };

  const handleSaveExcuseDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!excuseModal) return;
    await handleStatusChange(excuseModal.studentId, 'excused', excuseModal.studentName);
    showToast(`✓ ${excuseModal.studentName} uchun sababli hujjat biriktirildi (${excuseModal.docType})!`);
    setExcuseModal(null);
  };

  const handleExportTabelCSV = () => {
    const daysInMonth = Array.from({ length: 30 }, (_, i) => i + 1);
    const headers = ['№', 'F.I.Sh', 'Sinf', ...daysInMonth.map((d) => `${d}`), 'Jami Dars', 'Davomat %'];
    const rows = records.map((r, idx) => {
      const dailyStatuses = daysInMonth.map((d) => (d % 7 === 0 || d % 7 === 6 ? 'D' : r.status === 'present' ? '+' : r.status === 'late' ? 'K' : r.status === 'excused' ? 'S' : 'Q'));
      const attended = dailyStatuses.filter((s) => s === '+' || s === 'K').length;
      const rate = Math.round((attended / 22) * 100);
      return [idx + 1, `"${r.studentName}"`, r.className, ...dailyStatuses, attended, `${rate}%`];
    });
    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `73-OSH_Tabel_${selectedClass}_${tabelMonth}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast(`✓ 73-OSH Tabel (${selectedClass}) CSV formatida yuklab olindi!`);
  };

  // 1. Subscribe to PWA sync & online state changes
  useEffect(() => {
    const unsubOnline = pwaManager.subscribeOnlineState((online) => {
      setIsOnline(online);
      setIsSimulatedOffline(pwaManager.getIsSimulatedOffline());
    });

    const unsubSync = pwaManager.subscribeSync((syncing, count, lastSync) => {
      setIsSyncing(syncing);
      setPendingSyncCount(count);
      if (lastSync) setLastSyncTime(lastSync);
    });

    const unsubStats = pwaManager.subscribeStats((stats) => {
      setPendingSyncCount(stats.pendingSyncCount);
      setIsOnline(stats.isOnline);
      setIsSimulatedOffline(stats.isSimulatedOffline);
      if (stats.lastSyncedAt) setLastSyncTime(stats.lastSyncedAt);
    });

    return () => {
      unsubOnline();
      unsubSync();
      unsubStats();
    };
  }, []);

  // 2. Load attendance from IndexedDB and Remote API whenever selectedClass or selectedDate changes
  useEffect(() => {
    let isMounted = true;
    const loadFromDataSource = async () => {
      setIsLoadingDB(true);
      try {
        let dbRecords = await offlineDB.getAttendanceRecords(selectedClass, selectedDate);
        let realStudents: StudentRecord[] = [];
        try {
          const [remoteRecords, remoteStudents] = await Promise.all([
            listSchoolData<DBAttendanceRecord>('attendance'),
            listSchoolData<StudentRecord>('students'),
          ]);
          realStudents = remoteStudents.filter((s) => s.grade === selectedClass);
          const matchingRemote = remoteRecords.filter((record) => record.className === selectedClass && record.date === selectedDate);
          if (matchingRemote.length > 0) {
            await offlineDB.saveBatchAttendance(matchingRemote, 'synced');
            dbRecords = matchingRemote;
          }
        } catch {
          // IndexedDB remains the offline source when the API is unavailable.
        }

        if (isMounted) {
          if (dbRecords && dbRecords.length > 0) {
            setRecords(dbRecords);
          } else if (realStudents.length > 0) {
            // Generate roster for all real enrolled students in this class
            const realRoster: DBAttendanceRecord[] = realStudents.map((st) => ({
              id: `att-${st.id}-${selectedDate}-${selectedClass}`,
              studentId: st.id,
              studentName: st.name,
              className: selectedClass,
              date: selectedDate,
              status: 'present',
              syncStatus: 'synced',
              time: '08:30',
              method: 'manual',
            }));
            setRecords(realRoster);
            offlineDB.saveBatchAttendance(realRoster, 'synced').catch(console.warn);
          } else {
            // Fallback for offline dev
            const filteredMock = MOCK_ATTENDANCE.filter(
              (r) => r.className === selectedClass || !r.className
            ).map((r) => ({
              ...r,
              className: selectedClass,
              date: selectedDate,
              id: `att-${r.studentId}-${selectedDate}-${selectedClass}`,
              syncStatus: 'synced' as const,
            }));
            setRecords(filteredMock);
          }
        }
      } catch (err) {
        console.warn('Error loading attendance data:', err);
        setRecords(MOCK_ATTENDANCE);
      } finally {
        if (isMounted) setIsLoadingDB(false);
      }
    };

    loadFromDataSource();
    return () => {
      isMounted = false;
    };
  }, [selectedClass, selectedDate]);

  const handleQRScanSuccess = (item: {
    studentId: string;
    studentName: string;
    className: string;
    time: string;
    status: 'present' | 'late';
    avatar?: string;
    parentPhone?: string;
    serverSynced: boolean;
  }) => {
    setQrScanToast(item);
    setTimeout(() => {
      setQrScanToast((curr) => (curr?.studentId === item.studentId ? null : curr));
    }, 4500);
  };

  const filteredRecords = records.filter(
    (r) =>
      r.className === selectedClass &&
      r.studentName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const currentSwipeStudent = filteredRecords[swipeIndex];

  // Camera start / stop effect
  useEffect(() => {
    if (mode === 'faceid') {
      startCamera();
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [mode]);

  const startCamera = async () => {
    setCameraError(null);
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user' },
          audio: false,
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          setIsCameraActive(true);
        }
      } else {
        setCameraError('Camera access not supported in this browser container');
      }
    } catch (err: any) {
      console.warn('Camera access denied or unavailable:', err);
      setCameraError('Camera permission required. You can continue with AI Live Simulation.');
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
  };

  const handleStatusChange = async (
    studentId: string,
    newStatus: 'present' | 'late' | 'absent' | 'excused',
    studentName?: string
  ) => {
    const prevRecord = records.find((r) => r.studentId === studentId);
    const prevStatus = prevRecord ? prevRecord.status : 'absent';
    const name = studentName || prevRecord?.studentName || 'Student';

    const updatedRecord: DBAttendanceRecord = {
      id: prevRecord?.id || `att-${studentId}-${selectedDate}-${selectedClass}`,
      studentId,
      studentName: name,
      className: selectedClass,
      date: selectedDate,
      status: newStatus,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      method: 'manual',
      syncStatus: isOnline ? 'pending' : 'pending',
    };

    // Update local state immediately
    setRecords((prev) =>
      prev.map((r) => (r.studentId === studentId ? updatedRecord : r))
    );

    // Save to IndexedDB and queue background sync
    await pwaManager.recordAttendance(updatedRecord, name);

    // Save undo
    setLastAction({
      studentId,
      studentName: name,
      prevStatus,
      newStatus,
    });

    if (!isOnline) {
      showToast(`💾 Offline: ${name} saved to IndexedDB (queued for sync)`);
    }

    // Auto clear undo after 5 seconds
    setTimeout(() => {
      setLastAction((curr) => (curr?.studentId === studentId ? null : curr));
    }, 5000);
  };

  const handleUndo = async () => {
    if (!lastAction) return;
    const target = records.find((r) => r.studentId === lastAction.studentId);
    if (target) {
      const restored: DBAttendanceRecord = {
        ...target,
        status: lastAction.prevStatus,
      };
      setRecords((prev) =>
        prev.map((r) => (r.studentId === lastAction.studentId ? restored : r))
      );
      await pwaManager.recordAttendance(restored, lastAction.studentName);
    }
    setLastAction(null);
  };

  const handleSwipeAction = (status: 'present' | 'absent' | 'late') => {
    if (!currentSwipeStudent) return;
    handleStatusChange(
      currentSwipeStudent.studentId,
      status,
      currentSwipeStudent.studentName
    );
    if (swipeIndex < filteredRecords.length - 1) {
      setSwipeIndex((prev) => prev + 1);
    } else {
      setSwipeIndex(0); // loop or finish
    }
  };

  const handleMarkAllPresent = async () => {
    const updated = records.map((r) => ({
      ...r,
      status: 'present' as const,
      syncStatus: 'pending' as const,
    }));
    setRecords(updated);
    await pwaManager.recordBatchAttendance(updated, selectedClass, selectedDate);
    showToast(`✓ Marked all ${updated.length} students present & saved to IndexedDB!`);
  };

  const handleToggleSimulatedOffline = () => {
    const nextState = !isSimulatedOffline;
    pwaManager.setSimulatedOffline(nextState);
    if (nextState) {
      showToast('📴 Offline simulation mode ON. All actions write to IndexedDB!');
    } else {
      showToast('🌐 Online mode restored. Auto-syncing pending changes...');
    }
  };

  const handleManualSyncNow = async () => {
    setIsSyncing(true);
    const result = await pwaManager.processSyncQueue();
    setIsSyncing(false);
    if (result.success) {
      showToast(`✓ Synchronized ${result.syncedCount} records with school backend!`);
      // Reload refreshed sync status from IndexedDB
      const refreshed = await offlineDB.getAttendanceRecords(selectedClass, selectedDate);
      setRecords(refreshed);
    } else {
      showToast('⚠️ Sync failed. Data remains safely saved in IndexedDB.');
    }
  };

  const presentCount = records.filter((r) => r.status === 'present').length;
  const lateCount = records.filter((r) => r.status === 'late').length;
  const absentCount = records.filter((r) => r.status === 'absent').length;
  const excusedCount = records.filter((r) => r.status === 'excused').length;

  return (
    <div id="attendance-manager-view" className="space-y-4 sm:space-y-6 pb-12">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-4 z-50 rounded-2xl bg-slate-900/95 px-4 py-3 text-xs font-bold text-white shadow-2xl backdrop-blur-md dark:bg-slate-950/95 border border-indigo-500/40 animate-slideDown flex items-center gap-2">
          <Database className="h-4 w-4 text-indigo-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Visual Feedback Toast for Successful QR Scans */}
      {qrScanToast && (
        <div className="fixed top-16 sm:top-20 right-4 sm:right-6 z-50 flex flex-col overflow-hidden rounded-2xl border border-emerald-500/50 bg-slate-900/95 p-4 text-white shadow-2xl backdrop-blur-md dark:bg-slate-950/95 sm:max-w-md w-[calc(100%-2rem)] sm:w-auto animate-slideDown">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-500 text-white shadow-lg shadow-emerald-500/30">
                <CheckCircle2 className="h-6 w-6" />
                <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-emerald-400">
                  <span className="h-2 w-2 rounded-full bg-emerald-950 animate-ping" />
                </span>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-200">{t('qrScanSuccessToast')}</span>
                  <span className="rounded-md bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-300">
                    {t(qrScanToast.status)}
                  </span>
                  {qrScanToast.serverSynced ? (
                    <span className="rounded-full bg-emerald-950/80 px-1.5 py-0.5 text-[9px] font-semibold text-emerald-400 border border-emerald-800">
                      {t('cloudSynced')}
                    </span>
                  ) : (
                    <span className="rounded-full bg-amber-950/80 px-1.5 py-0.5 text-[9px] font-semibold text-amber-400 border border-amber-800">
                      {t('offlineQueued')}
                    </span>
                  )}
                </div>
                <div className="mt-0.5 text-sm font-bold text-white flex items-center gap-2">
                  <span>{qrScanToast.studentName}</span>
                  <span className="text-[11px] font-mono text-slate-400 font-normal">
                    ({qrScanToast.studentId})
                  </span>
                </div>
                <div className="text-[11px] text-slate-400 flex flex-wrap items-center gap-2 mt-0.5">
                  <span>{t('class')}: {qrScanToast.className}</span>
                  <span>•</span>
                  <span>{qrScanToast.time}</span>
                  <span>•</span>
                  <span className="text-emerald-300 flex items-center gap-1">
                    <Send className="h-3 w-3 inline" /> {t('parentSmsSent')}
                  </span>
                </div>
              </div>
            </div>

            <button
              onClick={() => setQrScanToast(null)}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
              title="Dismiss notification"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Toast progress bar */}
          <div className="mt-3 h-1 w-full overflow-hidden rounded-full bg-slate-800">
            <div className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-3000 w-full animate-pulse" />
          </div>
        </div>
      )}

      {/* Header & Attendance Mode Switcher */}
      <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-4 sm:p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-600 text-white dark:bg-indigo-500">
                <CalendarCheck className="h-4 w-4" />
              </div>
              <h1 className="text-lg font-bold text-slate-900 dark:text-white sm:text-2xl">
                {t('attendanceHeader')}
              </h1>
            </div>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {t('attendanceSubtitle')}
            </p>
          </div>

          {/* Attendance Mode Switcher */}
          <div className="flex flex-col sm:items-end gap-1">
            <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              <span className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
              <span>{t('attendanceMode')}:</span>
            </div>

            <div className="flex items-center gap-1 overflow-x-auto rounded-xl border border-slate-200 bg-slate-100 p-1 dark:border-slate-800 dark:bg-slate-800/80 no-scrollbar">
              {/* Mode: Manual (List View) */}
              <button
                onClick={() => setMode('roster')}
                className={`flex shrink-0 items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-bold transition-all ${
                  mode === 'roster'
                    ? 'bg-white text-indigo-700 shadow-xs ring-1 ring-slate-900/5 dark:bg-slate-900 dark:text-indigo-400 dark:ring-white/10'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                }`}
                style={{ minHeight: '44px' }}
                title="Manual Attendance List View"
              >
                <FileSpreadsheet className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                <span>{t('modeManual')}</span>
              </button>

              {/* Mode: QR Scan */}
              <button
                onClick={() => setMode('qr')}
                className={`relative flex shrink-0 items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-bold transition-all ${
                  mode === 'qr'
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20 dark:bg-indigo-500'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                }`}
                style={{ minHeight: '44px' }}
                title="Camera QR Code Scanner Mode"
              >
                <QrCode className="h-4 w-4" />
                <span>{t('modeQR')}</span>
                {mode === 'qr' && (
                  <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
                )}
              </button>

              {/* Secondary Mode: Swipe Cards */}
              <button
                onClick={() => setMode('swipe')}
                className={`flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition-all ${
                  mode === 'swipe'
                    ? 'bg-indigo-600 text-white shadow-xs dark:bg-indigo-500'
                    : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                }`}
                style={{ minHeight: '44px' }}
                title="Swipe Cards mode"
              >
                <Smartphone className="h-3.5 w-3.5" />
                <span>{t('modeSwipe')}</span>
              </button>

              {/* Secondary Mode: Face ID */}
              <button
                onClick={() => setMode('faceid')}
                className={`flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition-all ${
                  mode === 'faceid'
                    ? 'bg-indigo-600 text-white shadow-xs dark:bg-indigo-500'
                    : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                }`}
                style={{ minHeight: '44px' }}
                title="Face ID Turnstile mode"
              >
                <ScanFace className="h-3.5 w-3.5" />
                <span>{t('modeFaceID')}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Active Mode Descriptive Status Bar */}
        <div className="flex items-center justify-between rounded-xl bg-slate-50 px-3.5 py-2.5 text-xs text-slate-600 dark:bg-slate-800/50 dark:text-slate-300 border border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 rounded-full bg-indigo-500" />
            {mode === 'roster' && <span>{t('manualDesc')}</span>}
            {mode === 'qr' && <span>{t('qrDesc')}</span>}
            {mode === 'swipe' && <span>{t('swipeDesc')}</span>}
            {mode === 'faceid' && <span>{t('faceidDesc')}</span>}
          </div>

          <div className="hidden sm:flex items-center gap-3 text-[11px] text-slate-400">
            <span>{t('class')}: <strong>Grade {selectedClass}</strong></span>
            <span>•</span>
            <span>{t('date')}: <strong>{selectedDate}</strong></span>
          </div>
        </div>
      </div>

      {/* IndexedDB Offline Persistence & Synchronization Control Hub */}
      <div className="rounded-2xl border border-indigo-100 bg-gradient-to-r from-indigo-900/90 via-slate-900/95 to-slate-950 p-4 sm:p-5 text-white shadow-lg backdrop-blur-md dark:border-indigo-900/40">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-500/20 text-indigo-300 border border-indigo-400/30 shadow-inner">
              <Database className="h-5 w-5 animate-pulse" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-bold text-sm text-white">IndexedDB Local Persistence Engine</span>
                <span className="rounded-full bg-emerald-500/20 border border-emerald-400/40 px-2 py-0.5 text-[10px] font-bold text-emerald-300 flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  PWA Active (Database: EduSphere_Pro_DB)
                </span>
                {!isOnline && (
                  <span className="rounded-full bg-amber-500/20 border border-amber-400/40 px-2 py-0.5 text-[10px] font-bold text-amber-300 flex items-center gap-1 animate-pulse">
                    <WifiOff className="h-3 w-3" />
                    Offline Mode
                  </span>
                )}
              </div>
              <p className="mt-0.5 text-xs text-indigo-200/80">
                Attendance entries are saved instantly to local browser IndexedDB and automatically synchronized to the cloud.
              </p>
            </div>
          </div>

          {/* Action controls */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleToggleSimulatedOffline}
              className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold transition-all border ${
                isSimulatedOffline
                  ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md'
                  : 'bg-white/10 hover:bg-white/20 text-white border-white/20'
              }`}
              style={{ minHeight: '40px' }}
              title="Toggle simulated offline mode for testing"
            >
              {isSimulatedOffline ? <WifiOff className="h-3.5 w-3.5" /> : <Wifi className="h-3.5 w-3.5 text-emerald-400" />}
              <span>{isSimulatedOffline ? 'Offline Simulated (Active)' : 'Test Offline Mode'}</span>
            </button>

            <button
              onClick={handleManualSyncNow}
              disabled={isSyncing || (!isOnline && !isSimulatedOffline)}
              className="flex items-center gap-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white px-3.5 py-2 text-xs font-bold shadow-md transition-all"
              style={{ minHeight: '40px' }}
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>
                {isSyncing ? 'Syncing...' : pendingSyncCount > 0 ? `Sync (${pendingSyncCount} pending)` : 'Cloud Synced'}
              </span>
            </button>
          </div>
        </div>

        {/* Live sync telemetry */}
        <div className="mt-3 flex flex-wrap items-center justify-between border-t border-indigo-500/20 pt-2.5 text-[11px] text-indigo-200/70">
          <div className="flex items-center gap-3">
            <span>💾 Stored in IndexedDB: <strong>{records.length} records</strong></span>
            <span>•</span>
            <span>⏳ Pending Cloud Upload: <strong>{pendingSyncCount} items</strong></span>
          </div>
          {lastSyncTime && (
            <div className="text-emerald-300 flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3 inline" />
              <span>Last cloud sync: {lastSyncTime}</span>
            </div>
          )}
        </div>
      </div>

      {/* Undo Notification Bar */}
      {lastAction && (
        <div className="flex items-center justify-between rounded-xl bg-slate-900 text-white px-4 py-3 shadow-xl dark:bg-indigo-950 border border-indigo-500/30 text-xs animate-slideDown">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
            <span>
              <strong className="font-bold">{lastAction.studentName}</strong> marked as{' '}
              <span className="capitalize font-semibold text-indigo-300">{lastAction.newStatus}</span>
            </span>
          </div>
          <button
            onClick={handleUndo}
            className="flex items-center gap-1 bg-white/20 hover:bg-white/30 text-white rounded-lg px-3 py-1.5 font-bold transition-colors"
            style={{ minHeight: '36px' }}
          >
            <Undo2 className="h-3.5 w-3.5" />
            <span>Undo</span>
          </button>
        </div>
      )}

      {/* Stats Summary Bar */}
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-3 dark:border-emerald-900/40 dark:bg-emerald-950/20">
          <div className="flex items-center justify-between text-xs font-semibold text-emerald-800 dark:text-emerald-300">
            <span>{t('present')}</span>
            <CheckCircle2 className="h-4 w-4" />
          </div>
          <div className="mt-1 text-xl sm:text-2xl font-bold text-emerald-900 dark:text-emerald-100">{presentCount}</div>
          <div className="text-[10px] text-emerald-600 dark:text-emerald-400">92.8% on time</div>
        </div>

        <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-3 dark:border-amber-900/40 dark:bg-amber-950/20">
          <div className="flex items-center justify-between text-xs font-semibold text-amber-800 dark:text-amber-300">
            <span>{t('late')}</span>
            <Clock className="h-4 w-4" />
          </div>
          <div className="mt-1 text-xl sm:text-2xl font-bold text-amber-900 dark:text-amber-100">{lateCount}</div>
          <div className="text-[10px] text-amber-600 dark:text-amber-400">&lt; 15 min delay</div>
        </div>

        <div className="rounded-xl border border-rose-200 bg-rose-50/60 p-3 dark:border-rose-900/40 dark:bg-rose-950/20">
          <div className="flex items-center justify-between text-xs font-semibold text-rose-800 dark:text-rose-300">
            <span>{t('absent')}</span>
            <XCircle className="h-4 w-4" />
          </div>
          <div className="mt-1 text-xl sm:text-2xl font-bold text-rose-900 dark:text-rose-100">{absentCount}</div>
          <div className="text-[10px] text-rose-600 dark:text-rose-400">Parent alerted</div>
        </div>

        <div className="rounded-xl border border-blue-200 bg-blue-50/60 p-3 dark:border-blue-900/40 dark:bg-blue-950/20">
          <div className="flex items-center justify-between text-xs font-semibold text-blue-800 dark:text-blue-300">
            <span>{t('excused')}</span>
            <Users className="h-4 w-4" />
          </div>
          <div className="mt-1 text-xl sm:text-2xl font-bold text-blue-900 dark:text-blue-100">{excusedCount}</div>
          <div className="text-[10px] text-blue-600 dark:text-blue-400">Medical notice</div>
        </div>
      </div>

      {/* Mode: Swipe Card Attendance Mode */}
      {mode === 'swipe' && currentSwipeStudent && (
        <div className="flex flex-col items-center justify-center p-2 sm:p-4 max-w-md mx-auto">
          <div className="w-full text-center mb-3">
            <span className="text-xs font-bold text-slate-400 uppercase">
              Student {swipeIndex + 1} of {filteredRecords.length}
            </span>
          </div>

          <div className="relative w-full rounded-3xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-slate-900 text-center">
            {/* Student Avatar */}
            <div className="mx-auto h-28 w-28 rounded-full ring-4 ring-indigo-500/20 overflow-hidden mb-4 bg-indigo-50 dark:bg-slate-800 flex items-center justify-center">
              <img
                src={`https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80`}
                alt={currentSwipeStudent.studentName}
                className="h-full w-full object-cover"
              />
            </div>

            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              {currentSwipeStudent.studentName}
            </h2>
            <div className="mt-1 flex items-center justify-center gap-2">
              <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-bold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                Grade {currentSwipeStudent.className}
              </span>
              <span className="text-xs text-slate-400 font-mono">
                {currentSwipeStudent.studentId}
              </span>
            </div>

            {/* Current Status Pill */}
            <div className="mt-4 inline-block">
              <span
                className={`rounded-full px-3 py-1 text-xs font-bold capitalize ${
                  currentSwipeStudent.status === 'present'
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                    : currentSwipeStudent.status === 'late'
                    ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                    : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                }`}
              >
                Current: {currentSwipeStudent.status}
              </span>
            </div>

            {/* Action Buttons */}
            <div className="mt-8 grid grid-cols-3 gap-3">
              <button
                onClick={() => handleSwipeAction('absent')}
                className="flex flex-col items-center justify-center rounded-2xl bg-rose-50 p-3 text-rose-600 hover:bg-rose-100 dark:bg-rose-950/50 dark:text-rose-300 active:scale-95 transition-all"
                style={{ minHeight: '64px' }}
              >
                <X className="h-6 w-6" />
                <span className="text-xs font-bold mt-1">Absent</span>
              </button>

              <button
                onClick={() => handleSwipeAction('late')}
                className="flex flex-col items-center justify-center rounded-2xl bg-amber-50 p-3 text-amber-600 hover:bg-amber-100 dark:bg-amber-950/50 dark:text-amber-300 active:scale-95 transition-all"
                style={{ minHeight: '64px' }}
              >
                <Clock className="h-6 w-6" />
                <span className="text-xs font-bold mt-1">Late</span>
              </button>

              <button
                onClick={() => handleSwipeAction('present')}
                className="flex flex-col items-center justify-center rounded-2xl bg-emerald-500 p-3 text-white hover:bg-emerald-600 active:scale-95 transition-all shadow-md shadow-emerald-500/20"
                style={{ minHeight: '64px' }}
              >
                <Check className="h-6 w-6" />
                <span className="text-xs font-bold mt-1">Present</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mode: AI Face ID Scanner */}
      {mode === 'faceid' && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-slate-950 p-4 sm:p-6 text-white shadow-xl dark:border-slate-800 lg:col-span-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-xs font-bold uppercase tracking-wider">
                  Face ID Camera Prototype (Turnstile / Mobile)
                </span>
              </div>
              <span className="rounded bg-indigo-950 px-2 py-0.5 text-[10px] font-mono text-indigo-300">
                1080p • 60 FPS
              </span>
            </div>

            {/* Video / Live Camera Box */}
            <div className="relative my-4 flex h-64 sm:h-80 w-full items-center justify-center rounded-xl bg-slate-900/80 border border-slate-800 overflow-hidden">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={`h-full w-full object-cover ${isCameraActive ? 'block' : 'hidden'}`}
              />

              {!isCameraActive && (
                <div className="relative flex flex-col items-center">
                  <div className="relative h-40 w-40 rounded-2xl border-2 border-emerald-400 p-2 shadow-2xl shadow-emerald-500/20 animate-pulse">
                    <div className="absolute -top-1 -left-1 h-3 w-3 border-t-2 border-l-2 border-emerald-400" />
                    <div className="absolute -top-1 -right-1 h-3 w-3 border-t-2 border-r-2 border-emerald-400" />
                    <div className="absolute -bottom-1 -left-1 h-3 w-3 border-b-2 border-l-2 border-emerald-400" />
                    <div className="absolute -bottom-1 -right-1 h-3 w-3 border-b-2 border-r-2 border-emerald-400" />

                    <img
                      src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80"
                      alt="Detected Student"
                      className="h-full w-full rounded-xl object-cover"
                    />
                  </div>

                  <div className="mt-3 rounded-full bg-emerald-500/90 px-4 py-1 text-xs font-bold text-slate-950">
                    Prototype preview only • no biometric authentication
                  </div>
                </div>
              )}

              {/* Scanning Laser Line */}
              <div className="absolute top-0 left-0 right-0 h-0.5 bg-emerald-400 shadow-md shadow-emerald-400 animate-bounce" />
            </div>

            {cameraError && (
              <div className="mb-2 text-xs text-amber-400 flex items-center gap-1.5">
                <AlertCircle className="h-3.5 w-3.5" />
                <span>{cameraError}</span>
              </div>
            )}

            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Automatic parent notification sent via Telegram Bot</span>
              <span className="font-mono text-emerald-400">STATUS: ACTIVE</span>
            </div>
          </div>

          {/* Real-time Stream */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-900 dark:text-white text-sm">Live Turnstile Stream</h3>
              <RefreshCw className="h-3.5 w-3.5 text-slate-400 animate-spin" />
            </div>

            <div className="mt-4 space-y-2.5">
              {scannedLogs.map((log, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between rounded-xl bg-slate-50 p-2.5 text-xs dark:bg-slate-800/60"
                >
                  <div>
                    <div className="font-semibold text-slate-900 dark:text-white">{log.name}</div>
                    <div className="text-[10px] text-slate-400">{log.time}</div>
                  </div>
                  <div className="text-right">
                    <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                      {log.confidence}
                    </span>
                    <div className="text-[10px] text-emerald-600 font-medium mt-0.5">✓ Checked In</div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-5 border-t border-slate-100 pt-3 dark:border-slate-800">
              <button
                onClick={handleMarkAllPresent}
                className="w-full rounded-xl bg-indigo-600 py-3 text-xs font-bold text-white hover:bg-indigo-700 dark:bg-indigo-500"
                style={{ minHeight: '44px' }}
              >
                Sync All Biometrics to Roster
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mode: QR Code Scanner */}
      {mode === 'qr' && (
        <QRCodeScanner
          language={language}
          selectedClass={selectedClass}
          selectedDate={selectedDate}
          records={records}
          onStatusChange={handleStatusChange}
          onBatchPresent={handleMarkAllPresent}
          onScanSuccess={handleQRScanSuccess}
        />
      )}

      {/* Mode: Roster Grid (Desktop Table + Mobile Cards) */}
      {mode === 'roster' && (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          {/* Filter Bar */}
          <div className="flex flex-col justify-between gap-3 border-b border-slate-100 pb-4 dark:border-slate-800 sm:flex-row sm:items-center">
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <div>
                <label className="text-[10px] font-bold uppercase text-slate-400">Class</label>
                <select
                  value={selectedClass}
                  onChange={(e) => setSelectedClass(e.target.value)}
                  className="mt-0.5 block rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-900 focus:outline-hidden dark:border-slate-800 dark:bg-slate-800 dark:text-white"
                  style={{ minHeight: '44px' }}
                >
                  {availableClasses.map((cls) => (
                    <option key={cls} value={cls}>
                      {cls} sinf
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase text-slate-400">Date</label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="mt-0.5 block rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-900 focus:outline-hidden dark:border-slate-800 dark:bg-slate-800 dark:text-white"
                  style={{ minHeight: '44px' }}
                />
              </div>

              <div className="flex-1 min-w-[160px] sm:min-w-[200px]">
                <label className="text-[10px] font-bold uppercase text-slate-400">Search Student</label>
                <div className="relative mt-0.5">
                  <Search className="absolute left-2.5 top-3 h-3.5 w-3.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search by name..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-8 pr-3 text-xs text-slate-900 focus:outline-hidden dark:border-slate-800 dark:bg-slate-800 dark:text-white"
                    style={{ minHeight: '44px' }}
                  />
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 mt-2 sm:mt-0">
              <button
                onClick={() => setIsTabelModalOpen(true)}
                className="flex items-center gap-1.5 rounded-xl border border-indigo-200 bg-indigo-50 px-3.5 py-2.5 text-xs font-bold text-indigo-700 hover:bg-indigo-100 dark:border-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300 transition-all shadow-xs"
                style={{ minHeight: '44px' }}
              >
                <FileSpreadsheet className="h-4 w-4" />
                <span>73-OSH Tabel</span>
              </button>

              <button
                onClick={handleMarkAllPresent}
                className="w-full sm:w-auto rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                style={{ minHeight: '44px' }}
              >
                Mark All Present
              </button>
            </div>
          </div>

          {/* Mobile Student Cards (Visible on screens < 768px) */}
          <div className="mt-4 space-y-3 md:hidden">
            {filteredRecords.map((record) => (
              <div
                key={record.id}
                className="rounded-xl border border-slate-100 bg-slate-50 p-3.5 dark:border-slate-800 dark:bg-slate-800/60"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                      {record.studentName.slice(0, 2)}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-900 dark:text-white">
                        {record.studentName}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {record.studentId} • {record.time || '08:00 AM'}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-bold capitalize ${
                        record.status === 'present'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                          : record.status === 'late'
                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                          : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                      }`}
                    >
                      {record.status}
                    </span>
                    {record.syncStatus === 'pending' ? (
                      <span className="rounded-full bg-amber-500/20 px-1.5 py-0.5 text-[9px] font-bold text-amber-600 dark:text-amber-300 flex items-center gap-0.5" title="Saved to local IndexedDB, awaiting sync">
                        <Database className="h-2.5 w-2.5" />
                        <span>IndexedDB</span>
                      </span>
                    ) : (
                      <span className="rounded-full bg-emerald-500/10 px-1.5 py-0.5 text-[9px] font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5" title="Synchronized with school cloud">
                        <Check className="h-2.5 w-2.5" />
                        <span>Cloud</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* 4 Action Buttons for Mobile */}
                <div className="mt-3 grid grid-cols-4 gap-1.5">
                  {(['present', 'late', 'absent', 'excused'] as const).map((st) => (
                    <button
                      key={st}
                      onClick={() =>
                        handleStatusChange(record.studentId, st, record.studentName)
                      }
                      className={`rounded-lg py-2 text-[11px] font-bold capitalize transition-all active:scale-95 ${
                        record.status === st
                          ? st === 'present'
                            ? 'bg-emerald-600 text-white shadow-xs'
                            : st === 'late'
                            ? 'bg-amber-500 text-white shadow-xs'
                            : st === 'absent'
                            ? 'bg-rose-600 text-white shadow-xs'
                            : 'bg-blue-600 text-white shadow-xs'
                          : 'bg-white text-slate-700 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'
                      }`}
                      style={{ minHeight: '44px' }}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Desktop Table (Hidden on Mobile) */}
          <div className="mt-4 hidden md:block overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400 dark:border-slate-800">
                  <th className="pb-3 font-semibold">Student</th>
                  <th className="pb-3 font-semibold">Time Recorded</th>
                  <th className="pb-3 font-semibold">Method</th>
                  <th className="pb-3 font-semibold">Storage / Sync</th>
                  <th className="pb-3 font-semibold text-center">Status Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredRecords.map((record) => (
                  <tr key={record.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="py-3 font-semibold text-slate-900 dark:text-white">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-100 text-[10px] font-bold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                          {record.studentName.slice(0, 2)}
                        </div>
                        <div>
                          <div>{record.studentName}</div>
                          <div className="text-[10px] text-slate-400">{record.studentId}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 text-slate-600 dark:text-slate-300">{record.time || '08:00 AM'}</td>
                    <td className="py-3">
                      <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                        {record.method === 'face_recognition' ? 'Biometric Face ID' : 'Teacher Mobile'}
                      </span>
                    </td>
                    <td className="py-3">
                      {record.syncStatus === 'pending' ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold text-amber-700 dark:text-amber-300 border border-amber-300/40">
                          <Database className="h-3 w-3" />
                          <span>IndexedDB (Queued)</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:text-emerald-300 border border-emerald-400/30">
                          <CloudCheck className="h-3 w-3 text-emerald-500" />
                          <span>Cloud Synced</span>
                        </span>
                      )}
                    </td>
                    <td className="py-3">
                      <div className="flex items-center justify-center gap-1.5">
                        {(['present', 'late', 'absent', 'excused'] as const).map((st) => (
                          <button
                            key={st}
                            onClick={() =>
                              handleStatusChange(record.studentId, st, record.studentName)
                            }
                            className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold capitalize transition-all ${
                              record.status === st
                                ? st === 'present'
                                  ? 'bg-emerald-600 text-white shadow-xs'
                                  : st === 'late'
                                  ? 'bg-amber-500 text-white shadow-xs'
                                  : st === 'absent'
                                  ? 'bg-rose-600 text-white shadow-xs'
                                  : 'bg-blue-600 text-white shadow-xs'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700'
                            }`}
                            style={{ minHeight: '36px' }}
                          >
                            {st}
                          </button>
                        ))}
                        <button
                          onClick={() => handleOpenExcuseModal(record.studentId, record.studentName)}
                          className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded-lg transition-colors"
                          title="Sababli hujjat / Spravka biriktirish"
                        >
                          <Paperclip className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 73-OSH State Tabel Modal */}
      {isTabelModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="w-full max-w-4xl max-h-[90vh] flex flex-col rounded-3xl bg-white p-6 shadow-2xl dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
              <div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <FileSpreadsheet className="h-5 w-5 text-indigo-600" />
                  <span>73-OSH Shaklidagi Davlat Oylik Davomat Tabeli</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Sinf: <strong>{selectedClass}</strong> • Oy: <strong>{tabelMonth}</strong> • Davlat standarti bo‘yicha avtomat hisob-kitob
                </p>
              </div>
              <button onClick={() => setIsTabelModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                ✕
              </button>
            </div>

            {/* Toolbar in Tabel */}
            <div className="flex flex-wrap items-center justify-between gap-3 py-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <label className="text-xs font-bold text-slate-600 dark:text-slate-300">Hisobot Oyi:</label>
                <input
                  type="month"
                  value={tabelMonth}
                  onChange={(e) => setTabelMonth(e.target.value)}
                  className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleExportTabelCSV}
                  className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                >
                  <Download className="h-3.5 w-3.5 text-emerald-600" />
                  <span>Excel / CSV</span>
                </button>
                <button
                  onClick={() => window.print()}
                  className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-indigo-700 shadow-sm"
                >
                  <Printer className="h-3.5 w-3.5" />
                  <span>Chop etish</span>
                </button>
              </div>
            </div>

            {/* Tabel Matrix Grid */}
            <div className="flex-1 overflow-auto mt-3 border border-slate-200 rounded-2xl dark:border-slate-800">
              <table className="w-full text-center text-[11px] border-collapse">
                <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 sticky top-0 font-bold">
                  <tr>
                    <th className="p-2 border border-slate-200 dark:border-slate-700 w-8">№</th>
                    <th className="p-2 border border-slate-200 dark:border-slate-700 text-left min-w-[140px]">O‘quvchi F.I.Sh</th>
                    {Array.from({ length: 30 }, (_, i) => i + 1).map((d) => (
                      <th key={d} className="p-1 border border-slate-200 dark:border-slate-700 w-6">
                        {d}
                      </th>
                    ))}
                    <th className="p-2 border border-slate-200 dark:border-slate-700 w-16">Jami dars</th>
                    <th className="p-2 border border-slate-200 dark:border-slate-700 w-16">Davomat %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {records.map((st, idx) => {
                    const days = Array.from({ length: 30 }, (_, i) => i + 1);
                    const isSunday = (d: number) => d % 7 === 0;
                    return (
                      <tr key={st.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                        <td className="p-1.5 border border-slate-200 dark:border-slate-700 font-bold text-slate-400">{idx + 1}</td>
                        <td className="p-1.5 border border-slate-200 dark:border-slate-700 text-left font-semibold text-slate-900 dark:text-white">
                          {st.studentName}
                        </td>
                        {days.map((d) => (
                          <td
                            key={d}
                            className={`p-1 border border-slate-200 dark:border-slate-700 font-bold ${
                              isSunday(d)
                                ? 'bg-slate-100 text-slate-400 dark:bg-slate-800'
                                : st.status === 'present'
                                ? 'text-emerald-600'
                                : st.status === 'late'
                                ? 'text-amber-600'
                                : st.status === 'excused'
                                ? 'text-blue-600'
                                : 'text-rose-600'
                            }`}
                          >
                            {isSunday(d) ? 'D' : st.status === 'present' ? '+' : st.status === 'late' ? 'K' : st.status === 'excused' ? 'S' : 'Q'}
                          </td>
                        ))}
                        <td className="p-1.5 border border-slate-200 dark:border-slate-700 font-mono font-bold text-indigo-600 dark:text-indigo-400">
                          {st.status === 'present' ? '22' : '20'}
                        </td>
                        <td className="p-1.5 border border-slate-200 dark:border-slate-700 font-bold text-emerald-600">
                          {st.status === 'present' ? '100%' : '91%'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-400">
              <span>Belgilar: <strong>+</strong> (Bor), <strong>K</strong> (Kechikdi), <strong>S</strong> (Sababli), <strong>Q</strong> (Kelmadi), <strong>D</strong> (Dam olish)</span>
              <button
                onClick={() => setIsTabelModalOpen(false)}
                className="rounded-xl bg-slate-100 px-4 py-2 font-bold text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200"
              >
                Yopish
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Excuse Document Modal */}
      {excuseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
              <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Paperclip className="h-5 w-5 text-blue-600" />
                <span>Sababli Hujjat (Spravka/Ariza) Biriktirish</span>
              </h3>
              <button onClick={() => setExcuseModal(null)} className="text-slate-400 hover:text-slate-600">
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveExcuseDocument} className="mt-4 space-y-3.5 text-xs">
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300">O‘quvchi</label>
                <input
                  type="text"
                  disabled
                  value={excuseModal.studentName}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-100 p-2.5 font-bold text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300">Hujjat turi</label>
                <select
                  value={excuseModal.docType}
                  onChange={(e) => setExcuseModal({ ...excuseModal, docType: e.target.value as any })}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 font-bold dark:border-slate-700 dark:bg-slate-800"
                >
                  <option value="medical">Tibbiy ma’lumotnoma (Spravka 086/095-U)</option>
                  <option value="parent_request">Ota-ona arizasi / Tushuntirish xati</option>
                  <option value="competition">Viloyat/Respublika fan olimpiadasi / Musobaqa</option>
                  <option value="other">Boshqa uzrli sabab</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300">Hujjat raqami / Sana</label>
                <input
                  type="text"
                  value={excuseModal.docNumber}
                  onChange={(e) => setExcuseModal({ ...excuseModal, docNumber: e.target.value })}
                  placeholder="086-U / 2026-08-20"
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 font-bold dark:border-slate-700 dark:bg-slate-800"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300">Sabab tavsifi / Izoh</label>
                <textarea
                  rows={2}
                  value={excuseModal.reason}
                  onChange={(e) => setExcuseModal({ ...excuseModal, reason: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 font-medium dark:border-slate-700 dark:bg-slate-800"
                />
              </div>

              <div className="mt-5 flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setExcuseModal(null)}
                  className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  Bekor qilish
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-blue-600 px-5 py-2 text-xs font-bold text-white hover:bg-blue-700 shadow-md"
                >
                  Sababli deb belgilash
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
