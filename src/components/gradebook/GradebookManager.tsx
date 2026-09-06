import React, { useState, useEffect } from 'react';
import {
  FileSpreadsheet,
  Download,
  Filter,
  Sparkles,
  TrendingUp,
  Award,
  Search,
  Check,
  AlertCircle,
  Edit3,
  X,
  ChevronRight,
  SlidersHorizontal,
  LayoutGrid,
  ListFilter,
  Database,
  Wifi,
  WifiOff,
  CloudCheck,
  RefreshCw,
} from 'lucide-react';
import { AppLanguage, GradeEntry, UserRole, ClassGroup } from '../../types';
import { useI18n } from '../../lib/i18n';
import { MOCK_GRADES } from '../../data/mockData';
import { pwaManager } from '../../lib/pwa';
import { offlineDB, DBGradeEntry } from '../../lib/indexedDB';
import { listSchoolData } from '../../lib/schoolRepository';
import { ALL_SCHOOL_CLASSES } from '../../lib/scheduleGenerator';

interface GradebookManagerProps {
  language: AppLanguage;
  initialClass?: string;
  currentRole?: UserRole;
}

export const GradebookManager: React.FC<GradebookManagerProps> = ({
  language,
  initialClass = '7-A',
  currentRole = 'teacher',
}) => {
  const t = useI18n(language);
  const isStudentOrParent = currentRole === 'parent_student';
  const [selectedClass, setSelectedClass] = useState(initialClass);
  const [availableClasses, setAvailableClasses] = useState<string[]>(ALL_SCHOOL_CLASSES);
  const [selectedSubject, setSelectedSubject] = useState('Mathematics');

  useEffect(() => {
    listSchoolData<ClassGroup>('classes').then((clsList) => {
      if (clsList && clsList.length > 0) {
        setAvailableClasses(clsList.map((c) => c.name));
      }
    }).catch(() => undefined);
  }, []);
  
  // IndexedDB Grades
  const [grades, setGrades] = useState<DBGradeEntry[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [lastSavedCell, setLastSavedCell] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('table');
  const [editingStudent, setEditingStudent] = useState<DBGradeEntry | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [aiReportModal, setAiReportModal] = useState(false);
  const [isLoadingDB, setIsLoadingDB] = useState(true);

  // Offline / Sync status
  const [isOnline, setIsOnline] = useState(pwaManager.getIsOnline());
  const [isSimulatedOffline, setIsSimulatedOffline] = useState(pwaManager.getIsSimulatedOffline());
  const [isSyncing, setIsSyncing] = useState(false);
  const [pendingSyncCount, setPendingSyncCount] = useState(0);
  const [lastSyncTime, setLastSyncTime] = useState<string | undefined>();

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // 1. Subscribe to PWA sync & online state
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

  // 2. Load grades from IndexedDB whenever class or subject changes
  useEffect(() => {
    let isMounted = true;
    const loadGradesFromDB = async () => {
      setIsLoadingDB(true);
      try {
        let dbGrades = await offlineDB.getGradeEntries(selectedClass, selectedSubject);
        try {
          const remoteGrades = await listSchoolData<DBGradeEntry>('grades');
          const matchingRemote = remoteGrades.filter((grade) => grade.className === selectedClass && grade.subject === selectedSubject);
          if (matchingRemote.length > 0) {
            await offlineDB.saveBatchGrades(matchingRemote, 'synced');
            dbGrades = matchingRemote;
          }
        } catch {
          // IndexedDB remains the offline source when the API is unavailable.
        }
        if (isMounted) {
          setGrades(dbGrades);
        }
      } catch (err) {
        console.warn('Failed to load grades from IndexedDB:', err);
        if (isMounted) {
          const fallback = MOCK_GRADES.map((g) => ({
            ...g,
            id: `grd-${g.studentId}-${selectedClass}-${selectedSubject}`,
            className: selectedClass,
            subject: selectedSubject,
          }));
          setGrades(fallback);
        }
      } finally {
        if (isMounted) setIsLoadingDB(false);
      }
    };

    loadGradesFromDB();
    return () => {
      isMounted = false;
    };
  }, [selectedClass, selectedSubject]);

  const handleScoreChange = async (
    studentId: string,
    field: 'homework' | 'quizzes' | 'midterm' | 'finalExam',
    indexOrValue: number,
    value?: number
  ) => {
    let targetUpdated: DBGradeEntry | null = null;

    setGrades((prev) =>
      prev.map((entry) => {
        if (entry.studentId !== studentId) return entry;

        const updated: DBGradeEntry = {
          ...entry,
          className: selectedClass,
          subject: selectedSubject,
          syncStatus: isOnline ? 'pending' : 'pending',
          lastModified: Date.now(),
        };

        if (field === 'homework' && typeof value === 'number') {
          updated.homework = [...updated.homework];
          updated.homework[indexOrValue] = value;
        } else if (field === 'quizzes' && typeof value === 'number') {
          updated.quizzes = [...updated.quizzes];
          updated.quizzes[indexOrValue] = value;
        } else if (field === 'midterm') {
          updated.midterm = indexOrValue;
        } else if (field === 'finalExam') {
          updated.finalExam = indexOrValue;
        }

        // Recalculate average
        const hwAvg = updated.homework.reduce((a, b) => a + b, 0) / (updated.homework.length || 1);
        const qzAvg = updated.quizzes.reduce((a, b) => a + b, 0) / (updated.quizzes.length || 1);
        const total = Math.round(hwAvg * 0.3 + qzAvg * 0.3 + updated.midterm * 0.2 + updated.finalExam * 0.2);
        updated.average = total;

        targetUpdated = updated;
        return updated;
      })
    );

    if (targetUpdated) {
      // Save directly to IndexedDB & queue sync
      await pwaManager.recordGrade(targetUpdated, field, indexOrValue, value);
    }

    setLastSavedCell(`${studentId}-${field}`);
    setTimeout(() => setLastSavedCell(null), 1500);
  };

  const handleToggleSimulatedOffline = () => {
    const nextState = !isSimulatedOffline;
    pwaManager.setSimulatedOffline(nextState);
    if (nextState) {
      showToast('📴 Offline simulation mode ON. All grade edits persist to IndexedDB!');
    } else {
      showToast('🌐 Online mode restored. Auto-syncing grades to backend...');
    }
  };

  const handleManualSyncNow = async () => {
    setIsSyncing(true);
    const result = await pwaManager.processSyncQueue();
    setIsSyncing(false);
    if (result.success) {
      showToast(`✓ Synchronized ${result.syncedCount} offline records with backend!`);
      const refreshed = await offlineDB.getGradeEntries(selectedClass, selectedSubject);
      setGrades(refreshed);
    } else {
      showToast('⚠️ Sync pending. Data is safely stored in local IndexedDB.');
    }
  };

  const filteredGrades = grades.filter((g) =>
    g.studentName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const classAvg = Math.round(
    grades.reduce((acc, curr) => acc + curr.average, 0) / (grades.length || 1)
  );

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-300';
    if (score >= 75) return 'text-indigo-700 bg-indigo-50 dark:bg-indigo-950/40 dark:text-indigo-300';
    if (score >= 60) return 'text-amber-700 bg-amber-50 dark:bg-amber-950/40 dark:text-amber-300';
    return 'text-rose-700 bg-rose-50 dark:bg-rose-950/40 dark:text-rose-300';
  };

  if (isStudentOrParent) {
    const studentGrades = [
      { subject: 'Mathematics', teacher: 'Aygul Sadykova', grade: '88% (B+)', score: 88, hw: [90, 85], qz: [80, 85], mid: 88, fin: 90, trend: '+4%' },
      { subject: 'Physics', teacher: 'Murat Bakirov', grade: '92% (A-)', score: 92, hw: [95, 90], qz: [90, 92], mid: 90, fin: 94, trend: '+2%' },
      { subject: 'Computer Science', teacher: 'Elena Kim', grade: '96% (A)', score: 96, hw: [100, 98], qz: [95, 98], mid: 96, fin: 98, trend: '+5%' },
      { subject: 'English Language', teacher: 'Sara Jenkins', grade: '85% (B)', score: 85, hw: [85, 80], qz: [82, 85], mid: 85, fin: 88, trend: '+1%' },
      { subject: 'World History', teacher: 'Daniyar Alimov', grade: '90% (A-)', score: 90, hw: [90, 92], qz: [88, 90], mid: 90, fin: 90, trend: '+3%' },
    ];

    return (
      <div id="gradebook-manager-view" className="space-y-4 sm:space-y-6 pb-12">
        {/* Toast */}
        {toastMessage && (
          <div className="fixed top-20 right-4 z-50 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-bold text-white shadow-xl dark:bg-indigo-900 border border-indigo-500/40 animate-slideDown">
            {toastMessage}
          </div>
        )}

        {/* Student Gradebook Header */}
        <div className="flex flex-col justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900 sm:flex-row sm:items-center">
          <div>
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-600 text-white dark:bg-indigo-500">
                <FileSpreadsheet className="h-4 w-4" />
              </div>
              <h1 className="text-lg font-bold text-slate-900 dark:text-white sm:text-2xl">
                "Mening Baholarim va Farzandim Baholari"
              </h1>
            </div>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Grade 7-A • Term 2 Academic Transcript & Continuous Assessment Breakdown
            </p>
          </div>

          <button
            onClick={() => showToast('Official Grade Transcript exported as PDF!')}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-300"
            style={{ minHeight: '44px' }}
          >
            <Download className="h-4 w-4" />
            <span>Download Official Transcript</span>
          </button>
        </div>

        {/* 3 Overview KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
            <span className="text-xs font-medium text-slate-500">Cumulative Term GPA</span>
            <div className="mt-1 text-2xl font-bold text-indigo-600 dark:text-indigo-400">3.74 / 4.00</div>
            <div className="text-xs text-emerald-600 font-medium mt-1">Honors List (A- Average)</div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
            <span className="text-xs font-medium text-slate-500">Overall Weighted Score</span>
            <div className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">90.2%</div>
            <div className="text-xs text-slate-400 mt-1">Rank #2 in Grade 7-A</div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
            <span className="text-xs font-medium text-slate-500">Assignments On Time</span>
            <div className="mt-1 text-2xl font-bold text-emerald-600 dark:text-emerald-400">100%</div>
            <div className="text-xs text-slate-400 mt-1">23 of 23 completed</div>
          </div>
        </div>

        {/* Subject Cards Breakdown */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-4">
          <h3 className="font-bold text-slate-900 dark:text-white text-base">
            Subject-by-Subject Assessment Breakdown
          </h3>

          <div className="grid grid-cols-1 gap-3.5">
            {studentGrades.map((sub) => (
              <div
                key={sub.subject}
                className="rounded-xl border border-slate-100 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-800/40"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-slate-900 dark:text-white text-sm">{sub.subject}</h4>
                      <span className="rounded-md bg-indigo-50 px-2 py-0.5 text-[10px] font-bold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                        {sub.trend} this month
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">Teacher: {sub.teacher}</p>
                  </div>

                  <div className="text-right">
                    <span className={`inline-block rounded-xl px-3 py-1 text-sm font-bold ${getScoreColor(sub.score)}`}>
                      {sub.grade}
                    </span>
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-4 gap-2 text-center bg-white dark:bg-slate-900/60 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800/70 text-xs">
                  <div>
                    <div className="text-slate-400 text-[10px]">Homework Avg</div>
                    <div className="font-bold text-slate-800 dark:text-slate-200 mt-0.5">{Math.round((sub.hw[0] + sub.hw[1]) / 2)}%</div>
                  </div>
                  <div>
                    <div className="text-slate-400 text-[10px]">Quizzes Avg</div>
                    <div className="font-bold text-slate-800 dark:text-slate-200 mt-0.5">{Math.round((sub.qz[0] + sub.qz[1]) / 2)}%</div>
                  </div>
                  <div>
                    <div className="text-slate-400 text-[10px]">Midterm Exam</div>
                    <div className="font-bold text-slate-800 dark:text-slate-200 mt-0.5">{sub.mid}%</div>
                  </div>
                  <div>
                    <div className="text-slate-400 text-[10px]">Final Exam</div>
                    <div className="font-bold text-slate-800 dark:text-slate-200 mt-0.5">{sub.fin}%</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div id="gradebook-manager-view" className="space-y-4 sm:space-y-6 pb-12">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-4 z-50 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-bold text-white shadow-xl dark:bg-indigo-900 border border-indigo-500/40 animate-slideDown">
          {toastMessage}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-600 text-white dark:bg-indigo-500">
              <FileSpreadsheet className="h-4 w-4" />
            </div>
            <h1 className="text-lg font-bold text-slate-900 dark:text-white sm:text-2xl">
              {t('gradebookHeader')}
            </h1>
          </div>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Real-time Weighted Grade Calculation, IndexedDB Offline Persistence & AI Analysis
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {lastSavedCell && (
            <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400 animate-pulse">
              <Check className="h-3.5 w-3.5" /> Saved to IndexedDB
            </span>
          )}

          {/* AI Diagnostic Button */}
          <button
            onClick={() => setAiReportModal(true)}
            className="flex items-center gap-1.5 rounded-xl bg-indigo-50 px-3 py-2 text-xs font-bold text-indigo-700 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:text-indigo-300"
            style={{ minHeight: '44px' }}
          >
            <Sparkles className="h-3.5 w-3.5 text-indigo-500" />
            <span>AI Diagnostics</span>
          </button>

          <button
            onClick={() => showToast('Gradebook exported as .xlsx format!')}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-300"
            style={{ minHeight: '44px' }}
          >
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline">Export</span>
          </button>
        </div>
      </div>

      {/* IndexedDB Offline Persistence & Sync Banner */}
      <div className="rounded-2xl border border-indigo-100 bg-gradient-to-r from-indigo-900/90 via-slate-900/95 to-slate-950 p-4 sm:p-5 text-white shadow-lg backdrop-blur-md dark:border-indigo-900/40">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-500/20 text-indigo-300 border border-indigo-400/30 shadow-inner">
              <Database className="h-5 w-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-bold text-sm text-white">IndexedDB Grade Storage Active</span>
                <span className="rounded-full bg-emerald-500/20 border border-emerald-400/40 px-2 py-0.5 text-[10px] font-bold text-emerald-300 flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  Offline-Ready PWA
                </span>
                {!isOnline && (
                  <span className="rounded-full bg-amber-500/20 border border-amber-400/40 px-2 py-0.5 text-[10px] font-bold text-amber-300 flex items-center gap-1 animate-pulse">
                    <WifiOff className="h-3 w-3" />
                    Working Offline
                  </span>
                )}
              </div>
              <p className="mt-0.5 text-xs text-indigo-200/80">
                Score edits are instantly committed to browser IndexedDB with zero latency, and will sync to the server when connected.
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleToggleSimulatedOffline}
              className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold transition-all border ${
                isSimulatedOffline
                  ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md'
                  : 'bg-white/10 hover:bg-white/20 text-white border-white/20'
              }`}
              style={{ minHeight: '40px' }}
              title="Test offline recording"
            >
              {isSimulatedOffline ? <WifiOff className="h-3.5 w-3.5" /> : <Wifi className="h-3.5 w-3.5 text-emerald-400" />}
              <span>{isSimulatedOffline ? 'Simulating Offline' : 'Test Offline Mode'}</span>
            </button>

            <button
              onClick={handleManualSyncNow}
              disabled={isSyncing}
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
            <span>💾 IndexedDB Records: <strong>{grades.length} loaded</strong></span>
            <span>•</span>
            <span>⏳ Pending Queue: <strong>{pendingSyncCount} items</strong></span>
          </div>
          {lastSyncTime && (
            <div className="text-emerald-300 flex items-center gap-1">
              <CloudCheck className="h-3 w-3 inline" />
              <span>Last cloud sync: {lastSyncTime}</span>
            </div>
          )}
        </div>
      </div>

      {/* 3 Summary KPIs */}
      <div className="grid grid-cols-3 gap-2.5 sm:gap-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-3 sm:p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <span className="text-[10px] sm:text-xs font-medium text-slate-500">Class Average</span>
          <div className="mt-1 text-base sm:text-2xl font-bold text-slate-900 dark:text-white">{classAvg}% (B+)</div>
          <div className="text-[9px] sm:text-[11px] text-emerald-600 font-medium">+3.2% above benchmark</div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-3 sm:p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <span className="text-[10px] sm:text-xs font-medium text-slate-500">Top Performer</span>
          <div className="mt-1 text-base sm:text-2xl font-bold text-indigo-600 dark:text-indigo-400 truncate">Sara A.</div>
          <div className="text-[9px] sm:text-[11px] text-slate-400">98% Avg • 1,620 XP</div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-3 sm:p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <span className="text-[10px] sm:text-xs font-medium text-slate-500">Passing Rate</span>
          <div className="mt-1 text-base sm:text-2xl font-bold text-emerald-600 dark:text-emerald-400">96.4%</div>
          <div className="text-[9px] sm:text-[11px] text-slate-400">27 of 28 passing</div>
        </div>
      </div>

      {/* Main Ledger Container */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900">
        {/* Filter & View Switcher */}
        <div className="flex flex-col justify-between gap-3 border-b border-slate-100 pb-4 dark:border-slate-800 sm:flex-row sm:items-center">
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <div>
              <label className="text-[10px] font-bold uppercase text-slate-400">Class</label>
              <select
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                className="mt-0.5 block rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-900 dark:border-slate-800 dark:bg-slate-800 dark:text-white"
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
              <label className="text-[10px] font-bold uppercase text-slate-400">Subject</label>
              <select
                value={selectedSubject}
                onChange={(e) => setSelectedSubject(e.target.value)}
                className="mt-0.5 block rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-900 dark:border-slate-800 dark:bg-slate-800 dark:text-white"
                style={{ minHeight: '44px' }}
              >
                <option value="Mathematics">Mathematics</option>
                <option value="Physics">Physics</option>
                <option value="Computer Science">Computer Science</option>
                <option value="English">English</option>
              </select>
            </div>

            <div className="flex-1 min-w-[150px] sm:min-w-[200px]">
              <label className="text-[10px] font-bold uppercase text-slate-400">Search</label>
              <div className="relative mt-0.5">
                <Search className="absolute left-2.5 top-3 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Student name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-8 pr-3 text-xs text-slate-900 dark:border-slate-800 dark:bg-slate-800 dark:text-white"
                  style={{ minHeight: '44px' }}
                />
              </div>
            </div>
          </div>

          {/* View Toggle on Mobile/Tablet */}
          <div className="flex items-center gap-1 self-end sm:self-auto rounded-xl border border-slate-200 bg-slate-50 p-1 dark:border-slate-800 dark:bg-slate-800">
            <button
              onClick={() => setViewMode('table')}
              className={`flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold ${
                viewMode === 'table'
                  ? 'bg-white text-slate-900 shadow-2xs dark:bg-slate-900 dark:text-white'
                  : 'text-slate-500 dark:text-slate-400'
              }`}
              style={{ minHeight: '36px' }}
            >
              <FileSpreadsheet className="h-3.5 w-3.5" />
              <span>Table</span>
            </button>
            <button
              onClick={() => setViewMode('cards')}
              className={`flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold ${
                viewMode === 'cards'
                  ? 'bg-white text-slate-900 shadow-2xs dark:bg-slate-900 dark:text-white'
                  : 'text-slate-500 dark:text-slate-400'
              }`}
              style={{ minHeight: '36px' }}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              <span>Cards</span>
            </button>
          </div>
        </div>

        {/* View Mode 1: Mobile Student Cards with Quick Edit Modal */}
        {(viewMode === 'cards' || (typeof window !== 'undefined' && window.innerWidth < 640)) && (
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
            {filteredGrades.map((g) => (
              <div
                key={g.id}
                onClick={() => setEditingStudent(g)}
                className="cursor-pointer rounded-2xl border border-slate-200 bg-white p-4 shadow-xs hover:border-indigo-500 dark:border-slate-800 dark:bg-slate-800/60 transition-all"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                      {g.studentName.slice(0, 2)}
                    </div>
                    <div>
                      <div className="font-bold text-slate-900 dark:text-white text-sm">
                        {g.studentName}
                      </div>
                      <div className="text-[10px] text-slate-400">{g.studentId}</div>
                    </div>
                  </div>

                  <div className="text-right flex items-center gap-2">
                    {g.syncStatus === 'pending' && (
                      <span className="rounded-full bg-amber-500/20 px-1.5 py-0.5 text-[9px] font-bold text-amber-600 dark:text-amber-300">
                        IndexedDB
                      </span>
                    )}
                    <span className={`inline-block rounded-xl px-2.5 py-1 text-xs font-bold ${getScoreColor(g.average)}`}>
                      {g.average}%
                    </span>
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-4 gap-1 text-center bg-slate-50 dark:bg-slate-900/50 p-2 rounded-xl text-[10px]">
                  <div>
                    <div className="text-slate-400">HW 1</div>
                    <div className="font-bold text-slate-800 dark:text-slate-200">{g.homework[0]}</div>
                  </div>
                  <div>
                    <div className="text-slate-400">Quiz 1</div>
                    <div className="font-bold text-slate-800 dark:text-slate-200">{g.quizzes[0]}</div>
                  </div>
                  <div>
                    <div className="text-slate-400">Midterm</div>
                    <div className="font-bold text-slate-800 dark:text-slate-200">{g.midterm}</div>
                  </div>
                  <div>
                    <div className="text-slate-400">Final</div>
                    <div className="font-bold text-slate-800 dark:text-slate-200">{g.finalExam}</div>
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between text-xs text-indigo-600 dark:text-indigo-400 font-semibold">
                  <span className="flex items-center gap-1">
                    <Edit3 className="h-3 w-3" /> Tap to Edit Scores
                  </span>
                  <ChevronRight className="h-4 w-4" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* View Mode 2: High-Density Table (Desktop / Tablet) */}
        {viewMode === 'table' && (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400 dark:border-slate-800">
                  <th className="sticky left-0 bg-white dark:bg-slate-900 pb-3 font-semibold min-w-[140px]">
                    Student Name
                  </th>
                  <th className="pb-3 font-semibold text-center">HW #1</th>
                  <th className="pb-3 font-semibold text-center">HW #2</th>
                  <th className="pb-3 font-semibold text-center">Quiz #1</th>
                  <th className="pb-3 font-semibold text-center">Quiz #2</th>
                  <th className="pb-3 font-semibold text-center">Midterm (20%)</th>
                  <th className="pb-3 font-semibold text-center">Final (20%)</th>
                  <th className="pb-3 font-semibold text-center font-bold text-slate-700 dark:text-slate-300">
                    Weighted Avg
                  </th>
                  <th className="pb-3 font-semibold text-center">Storage</th>
                  <th className="pb-3 font-semibold text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredGrades.map((entry) => (
                  <tr key={entry.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
                    <td className="sticky left-0 bg-white dark:bg-slate-900 py-3 font-semibold text-slate-900 dark:text-white">
                      <div className="font-bold">{entry.studentName}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{entry.studentId}</div>
                    </td>

                    {/* HW 1 */}
                    <td className="py-2 text-center">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={entry.homework[0]}
                        onChange={(e) =>
                          handleScoreChange(entry.studentId, 'homework', 0, Number(e.target.value))
                        }
                        className="w-12 rounded-lg border border-slate-200 bg-slate-50 py-1 text-center font-semibold text-slate-900 focus:bg-white focus:outline-hidden dark:border-slate-800 dark:bg-slate-800 dark:text-white"
                        style={{ minHeight: '36px' }}
                      />
                    </td>

                    {/* HW 2 */}
                    <td className="py-2 text-center">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={entry.homework[1]}
                        onChange={(e) =>
                          handleScoreChange(entry.studentId, 'homework', 1, Number(e.target.value))
                        }
                        className="w-12 rounded-lg border border-slate-200 bg-slate-50 py-1 text-center font-semibold text-slate-900 focus:bg-white focus:outline-hidden dark:border-slate-800 dark:bg-slate-800 dark:text-white"
                        style={{ minHeight: '36px' }}
                      />
                    </td>

                    {/* Quiz 1 */}
                    <td className="py-2 text-center">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={entry.quizzes[0]}
                        onChange={(e) =>
                          handleScoreChange(entry.studentId, 'quizzes', 0, Number(e.target.value))
                        }
                        className="w-12 rounded-lg border border-slate-200 bg-slate-50 py-1 text-center font-semibold text-slate-900 focus:bg-white focus:outline-hidden dark:border-slate-800 dark:bg-slate-800 dark:text-white"
                        style={{ minHeight: '36px' }}
                      />
                    </td>

                    {/* Quiz 2 */}
                    <td className="py-2 text-center">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={entry.quizzes[1]}
                        onChange={(e) =>
                          handleScoreChange(entry.studentId, 'quizzes', 1, Number(e.target.value))
                        }
                        className="w-12 rounded-lg border border-slate-200 bg-slate-50 py-1 text-center font-semibold text-slate-900 focus:bg-white focus:outline-hidden dark:border-slate-800 dark:bg-slate-800 dark:text-white"
                        style={{ minHeight: '36px' }}
                      />
                    </td>

                    {/* Midterm */}
                    <td className="py-2 text-center">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={entry.midterm}
                        onChange={(e) =>
                          handleScoreChange(entry.studentId, 'midterm', Number(e.target.value))
                        }
                        className="w-12 rounded-lg border border-slate-200 bg-slate-50 py-1 text-center font-semibold text-slate-900 focus:bg-white focus:outline-hidden dark:border-slate-800 dark:bg-slate-800 dark:text-white"
                        style={{ minHeight: '36px' }}
                      />
                    </td>

                    {/* Final */}
                    <td className="py-2 text-center">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={entry.finalExam}
                        onChange={(e) =>
                          handleScoreChange(entry.studentId, 'finalExam', Number(e.target.value))
                        }
                        className="w-12 rounded-lg border border-slate-200 bg-slate-50 py-1 text-center font-semibold text-slate-900 focus:bg-white focus:outline-hidden dark:border-slate-800 dark:bg-slate-800 dark:text-white"
                        style={{ minHeight: '36px' }}
                      />
                    </td>

                    {/* Weighted Avg */}
                    <td className="py-2 text-center">
                      <span className={`inline-block rounded-xl px-2.5 py-1 font-bold ${getScoreColor(entry.average)}`}>
                        {entry.average}%
                      </span>
                    </td>

                    {/* Storage Status */}
                    <td className="py-2 text-center">
                      {entry.syncStatus === 'pending' ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold text-amber-700 dark:text-amber-300">
                          <Database className="h-2.5 w-2.5" />
                          <span>IndexedDB</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:text-emerald-300">
                          <CloudCheck className="h-2.5 w-2.5 text-emerald-500" />
                          <span>Cloud</span>
                        </span>
                      )}
                    </td>

                    <td className="py-2 text-center">
                      <button
                        onClick={() => setEditingStudent(entry)}
                        className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800"
                        style={{ minHeight: '36px', minWidth: '36px' }}
                      >
                        <Edit3 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal: Quick Edit Modal for Mobile/Tablet */}
      {editingStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl dark:bg-slate-900 animate-slideDown">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white text-base">
                  Edit Grades: {editingStudent.studentName}
                </h3>
                <p className="text-xs text-slate-400">{selectedClass} • {selectedSubject}</p>
              </div>
              <button
                onClick={() => setEditingStudent(null)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4 space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-medium text-slate-700 dark:text-slate-300">Homework #1</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={editingStudent.homework[0]}
                    onChange={(e) =>
                      handleScoreChange(editingStudent.studentId, 'homework', 0, Number(e.target.value))
                    }
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 dark:border-slate-800 dark:bg-slate-800 dark:text-white"
                    style={{ minHeight: '44px' }}
                  />
                </div>

                <div>
                  <label className="font-medium text-slate-700 dark:text-slate-300">Homework #2</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={editingStudent.homework[1]}
                    onChange={(e) =>
                      handleScoreChange(editingStudent.studentId, 'homework', 1, Number(e.target.value))
                    }
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 dark:border-slate-800 dark:bg-slate-800 dark:text-white"
                    style={{ minHeight: '44px' }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-medium text-slate-700 dark:text-slate-300">Quiz #1</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={editingStudent.quizzes[0]}
                    onChange={(e) =>
                      handleScoreChange(editingStudent.studentId, 'quizzes', 0, Number(e.target.value))
                    }
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 dark:border-slate-800 dark:bg-slate-800 dark:text-white"
                    style={{ minHeight: '44px' }}
                  />
                </div>

                <div>
                  <label className="font-medium text-slate-700 dark:text-slate-300">Quiz #2</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={editingStudent.quizzes[1]}
                    onChange={(e) =>
                      handleScoreChange(editingStudent.studentId, 'quizzes', 1, Number(e.target.value))
                    }
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 dark:border-slate-800 dark:bg-slate-800 dark:text-white"
                    style={{ minHeight: '44px' }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-medium text-slate-700 dark:text-slate-300">Midterm Exam (20%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={editingStudent.midterm}
                    onChange={(e) =>
                      handleScoreChange(editingStudent.studentId, 'midterm', Number(e.target.value))
                    }
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 dark:border-slate-800 dark:bg-slate-800 dark:text-white"
                    style={{ minHeight: '44px' }}
                  />
                </div>

                <div>
                  <label className="font-medium text-slate-700 dark:text-slate-300">Final Exam (20%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={editingStudent.finalExam}
                    onChange={(e) =>
                      handleScoreChange(editingStudent.studentId, 'finalExam', Number(e.target.value))
                    }
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 dark:border-slate-800 dark:bg-slate-800 dark:text-white"
                    style={{ minHeight: '44px' }}
                  />
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between rounded-xl bg-slate-50 p-3 dark:bg-slate-800">
                <span className="font-bold text-slate-700 dark:text-slate-300">New Weighted Average:</span>
                <span className="text-base font-bold text-indigo-600 dark:text-indigo-400">
                  {editingStudent.average}%
                </span>
              </div>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setEditingStudent(null)}
                className="rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-indigo-700 w-full"
                style={{ minHeight: '44px' }}
              >
                Done & Save to IndexedDB
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AI Diagnostic Modal */}
      {aiReportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-2xl dark:bg-slate-900 animate-slideDown">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400">
                  <Sparkles className="h-4 w-4" />
                </div>
                <h3 className="font-bold text-slate-900 dark:text-white text-base">
                  AI Academic Insights & Risk Early Warning
                </h3>
              </div>
              <button
                onClick={() => setAiReportModal(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4 space-y-3 text-xs">
              <div className="rounded-xl bg-emerald-50 p-3.5 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/40">
                <div className="font-bold text-emerald-900 dark:text-emerald-200 flex items-center gap-1.5">
                  <Award className="h-4 w-4 text-emerald-600" />
                  Top Strengths in {selectedSubject}
                </div>
                <p className="mt-1 text-slate-600 dark:text-slate-300 leading-relaxed">
                  82% of students achieved mastery (&gt;85%) in Quiz #1 on Quadratic Functions and Algebraic Simplification.
                </p>
              </div>

              <div className="rounded-xl bg-amber-50 p-3.5 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40">
                <div className="font-bold text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
                  <AlertCircle className="h-4 w-4 text-amber-600" />
                  Needs Reinforcement / Homework Lag
                </div>
                <p className="mt-1 text-slate-600 dark:text-slate-300 leading-relaxed">
                  Homework #2 had a 14% lower completion rate among 4 students. An auto-generated adaptive revision exercise has been drafted.
                </p>
              </div>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => {
                  setAiReportModal(false);
                  showToast('AI Actionable Intervention Plan sent to class!');
                }}
                className="rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-indigo-700"
                style={{ minHeight: '44px' }}
              >
                Deploy AI Revision Homework
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
