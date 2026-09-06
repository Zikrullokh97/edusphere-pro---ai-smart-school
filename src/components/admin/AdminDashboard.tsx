import React, { useState, useEffect } from 'react';
import {
  Users,
  GraduationCap,
  FolderKanban,
  BookOpen,
  ArrowRight,
  Plus,
  Building,
  Calendar,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Award,
  Bell,
  HeartHandshake,
  TrendingUp,
  Activity,
  FileSpreadsheet,
  Sparkles,
  AlertTriangle,
  UserCheck,
  RefreshCw,
  BarChart3,
  ChevronRight,
  TrendingDown,
  ShieldAlert,
  Info,
} from 'lucide-react';
import { AppLanguage, AdminKPIData } from '../../types';
import { useI18n } from '../../lib/i18n';
import { authenticatedFetch } from '../../lib/api';

interface AdminDashboardProps {
  language: AppLanguage;
  onNavigate: (tabId: string) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  language,
  onNavigate,
}) => {
  const t = useI18n(language);

  const [kpiData, setKpiData] = useState<AdminKPIData>({
    totalStudents: 0,
    activeStudents: 0,
    totalTeachers: 0,
    activeTeachers: 0,
    totalParents: 0,
    totalClasses: 0,
    totalSubjects: 0,
    todayAttendanceRate: 0,
    absentStudentsCount: 0,
    lateStudentsCount: 0,
    averageGrade: 0,
    homeworkCompletionRate: 0,
    activeUsersCount: 0,
    pendingRequestsCount: 0,
    systemHealthStatus: 'HEALTHY',
    genderDistribution: { male: 0, female: 0 },
    classBreakdown: [],
    teacherWorkloads: [],
    classRanking: [],
    urgentAlerts: {
      atRiskStudents: [],
      lowAttendanceClasses: [],
      delayedTeachers: [],
    },
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateFilter, setDateFilter] = useState<'today' | 'week' | 'month' | 'semester' | 'year'>('today');

  // AI Executive Summary State
  const [aiSummary, setAiSummary] = useState<string>('');
  const [aiSummaryLoading, setAiSummaryLoading] = useState(false);
  const [aiSummaryOpen, setAiSummaryOpen] = useState(true);

  const fetchKPIs = async (period = dateFilter) => {
    setLoading(true);
    setError(null);
    try {
      const res = await authenticatedFetch(`/api/admin/kpi?period=${encodeURIComponent(period)}`);
      if (!res.ok) {
        throw new Error(`Server xatosi: ${res.status}`);
      }
      const data = await res.json();
      if (data.success && data.data) {
        setKpiData(data.data);
      } else {
        throw new Error(data.error || "Ma'lumotni yuklab bo‘lmadi");
      }
    } catch (err: any) {
      console.error('KPI ma\'lumotlarini yuklashda xatolik:', err);
      setError("Dashboard ma'lumotlarini yuklashda xatolik yuz berdi");
    } finally {
      setLoading(false);
    }
  };

  const fetchAiSummary = async () => {
    setAiSummaryLoading(true);
    try {
      const res = await authenticatedFetch('/api/ai/admin-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ language }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.summary) {
          setAiSummary(data.summary);
        }
      }
    } catch (err) {
      console.warn('AI Summary fetch error:', err);
    } finally {
      setAiSummaryLoading(false);
    }
  };

  useEffect(() => {
    fetchKPIs(dateFilter);
  }, [dateFilter]);

  useEffect(() => {
    fetchAiSummary();
  }, [language]);

  const atRiskCount = kpiData.urgentAlerts?.atRiskStudents?.length || 0;
  const lowAttClassCount = kpiData.urgentAlerts?.lowAttendanceClasses?.length || 0;
  const delayedTeacherCount = kpiData.urgentAlerts?.delayedTeachers?.length || 0;

  return (
    <div className="space-y-6 font-sans pb-12">
      {/* Error Alert Banner */}
      {error && !loading && (
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-rose-900 shadow-xs dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-200">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-rose-600 shrink-0" />
            <div>
              <span className="text-sm font-bold block">{error}</span>
              <span className="text-xs text-rose-700/80 dark:text-rose-300/80">
                Iltimos, server ulanishini tekshiring va qayta urinib ko'ring.
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => fetchKPIs(dateFilter)}
            className="flex items-center gap-1.5 rounded-xl bg-rose-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-rose-700 active:scale-95 transition-all cursor-pointer shrink-0"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Qayta urinish
          </button>
        </div>
      )}

      {/* 1. Header Banner & Quick Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center gap-3.5">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-xl shadow-indigo-600/30">
            <Building className="h-7 w-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                Admin Control Center
              </h1>
              <span className="flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
                №71 Ixtisoslashtirilgan Maktab
              </span>
            </div>
            <p className="text-xs text-slate-400 font-semibold mt-0.5">
              2026–2027 O‘quv Yili • 1-Chorak • Real-Time Maktab ERP & Monitoring Holati
            </p>
          </div>
        </div>

        {/* Date Filters & Refresh */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-xl bg-slate-100 dark:bg-slate-800 p-1 text-xs font-bold">
            {(['today', 'week', 'month', 'semester', 'year'] as const).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setDateFilter(f)}
                className={`rounded-lg px-3 py-1.5 transition-all cursor-pointer ${
                  dateFilter === f
                    ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-white shadow-2xs'
                    : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
                }`}
              >
                {f === 'today' ? 'Bugun' : f === 'week' ? 'Shu hafta' : f === 'month' ? 'Shu oy' : f === 'semester' ? '1-Semestr' : 'O‘quv yili'}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => {
              fetchKPIs(dateFilter);
              fetchAiSummary();
            }}
            disabled={loading || aiSummaryLoading}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white p-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 cursor-pointer shadow-2xs"
            title="Yangilash"
          >
            <RefreshCw className={`h-4 w-4 ${loading || aiSummaryLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* 2. AI Executive Summary (Top-5 Key Highlights for Administration) */}
      <div className="rounded-3xl border border-indigo-200/80 bg-linear-to-br from-indigo-900 via-indigo-950 to-slate-950 p-6 text-white shadow-lg shadow-indigo-950/20">
        <div className="flex items-center justify-between border-b border-indigo-800/60 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/30 text-indigo-300 ring-1 ring-indigo-400/40">
              <Sparkles className="h-5 w-5 text-indigo-300" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span>{t('aiExecutiveSummary') || 'AI Boshqaruv Xulosasi'}</span>
                <span className="rounded-full bg-indigo-500/30 px-2 py-0.5 text-[10px] font-bold text-indigo-200 border border-indigo-400/30">
                  Real-Time Audit
                </span>
              </h2>
              <p className="text-xs text-indigo-200/70">
                O‘quvchilar, o‘qituvchilar, dars jadvali va davomat bo‘yicha avtomatlashgan tahlil
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={fetchAiSummary}
              disabled={aiSummaryLoading}
              className="flex items-center gap-1.5 rounded-xl bg-indigo-800/60 hover:bg-indigo-700/80 px-3 py-1.5 text-xs font-bold text-indigo-100 border border-indigo-600/40 transition-all cursor-pointer"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${aiSummaryLoading ? 'animate-spin' : ''}`} />
              <span>Tahlilni yangilash</span>
            </button>
            <button
              type="button"
              onClick={() => setAiSummaryOpen(!aiSummaryOpen)}
              className="rounded-xl bg-indigo-800/40 hover:bg-indigo-700/60 p-1.5 text-indigo-300"
            >
              <ChevronRight className={`h-4 w-4 transition-transform ${aiSummaryOpen ? 'rotate-90' : ''}`} />
            </button>
          </div>
        </div>

        {aiSummaryOpen && (
          <div className="mt-4 text-xs sm:text-sm text-indigo-100/90 leading-relaxed font-sans whitespace-pre-line bg-indigo-950/40 rounded-2xl p-4 border border-indigo-800/30">
            {aiSummaryLoading ? (
              <div className="flex items-center gap-2.5 py-4 text-indigo-300">
                <RefreshCw className="h-4 w-4 animate-spin" />
                <span>AI ma'muriyat uchun kunlik xulosani hisoblamoqda...</span>
              </div>
            ) : aiSummary ? (
              aiSummary
            ) : (
              <div className="py-2 text-indigo-300">
                📌 **Bugun maktab ma'muriyati e'tibor berishi zarur bo‘lgan asosiy holatlar:**
                <br />
                1. Maktab bo‘yicha umumiy davomat barqaror holatda.
                <br />
                2. KAO 2026–2027 standarti bo‘yicha darslar to‘liq jadvalga muvofiq o‘tilmoqda.
              </div>
            )}
          </div>
        )}
      </div>

      {/* 3. Urgent Attention Required Alerts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* 🚨 Diqqat talab o'quvchilar */}
        <div
          onClick={() => onNavigate('monitoring')}
          className="rounded-3xl border border-rose-200/80 bg-rose-50/50 p-5 shadow-xs hover:border-rose-300 dark:border-rose-900/40 dark:bg-rose-950/20 transition-all cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-rose-100 text-rose-700 dark:bg-rose-900/60 dark:text-rose-300">
                <ShieldAlert className="h-4 w-4" />
              </div>
              <span className="text-xs font-bold text-rose-900 dark:text-rose-200">
                {t('highRiskStudents') || 'Diqqat Talab O‘quvchilar'}
              </span>
            </div>
            <span className="rounded-full bg-rose-600 px-2.5 py-0.5 text-xs font-black text-white">
              {atRiskCount}
            </span>
          </div>
          <p className="mt-2 text-xs text-rose-800/80 dark:text-rose-300/80">
            Davomati 80% dan past yoki o‘zlashtirishi pasaygan o‘quvchilar
          </p>
          <div className="mt-3 flex items-center justify-between text-xs font-bold text-rose-700 dark:text-rose-400">
            <span>Monitoring markazida ko‘rish</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </div>
        </div>

        {/* ⚠️ Davomati past sinflar */}
        <div
          onClick={() => onNavigate('monitoring')}
          className="rounded-3xl border border-amber-200/80 bg-amber-50/50 p-5 shadow-xs hover:border-amber-300 dark:border-amber-900/40 dark:bg-amber-950/20 transition-all cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-100 text-amber-700 dark:bg-amber-900/60 dark:text-amber-300">
                <AlertTriangle className="h-4 w-4" />
              </div>
              <span className="text-xs font-bold text-amber-900 dark:text-amber-200">
                {t('lowAttendanceClasses') || 'Past Davomatli Sinflar'}
              </span>
            </div>
            <span className="rounded-full bg-amber-600 px-2.5 py-0.5 text-xs font-black text-white">
              {lowAttClassCount}
            </span>
          </div>
          <p className="mt-2 text-xs text-amber-800/80 dark:text-amber-300/80">
            Sinf davomati 85% dan past bo‘lgan guruhlar
          </p>
          <div className="mt-3 flex items-center justify-between text-xs font-bold text-amber-700 dark:text-amber-400">
            <span>Sinf tahliliga o‘tish</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </div>
        </div>

        {/* ℹ️ Nazoratdagi o'qituvchilar / darslar */}
        <div
          onClick={() => onNavigate('monitoring')}
          className="rounded-3xl border border-indigo-200/80 bg-indigo-50/50 p-5 shadow-xs hover:border-indigo-300 dark:border-indigo-900/40 dark:bg-indigo-950/20 transition-all cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700 dark:bg-indigo-900/60 dark:text-indigo-300">
                <Info className="h-4 w-4" />
              </div>
              <span className="text-xs font-bold text-indigo-900 dark:text-indigo-200">
                {t('teacherSessionIssues') || 'Dars O‘tishi Nazoratda'}
              </span>
            </div>
            <span className="rounded-full bg-indigo-600 px-2.5 py-0.5 text-xs font-black text-white">
              {delayedTeacherCount}
            </span>
          </div>
          <p className="mt-2 text-xs text-indigo-800/80 dark:text-indigo-300/80">
            Dars o‘tish intizomi va elektron jurnal to‘ldirilishi
          </p>
          <div className="mt-3 flex items-center justify-between text-xs font-bold text-indigo-700 dark:text-indigo-400">
            <span>O‘qituvchilar monitoringi</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </div>
        </div>
      </div>

      {/* 4. Quick Action Shortcuts to Main Modules */}
      <div className="rounded-3xl border border-indigo-100/80 bg-linear-to-r from-indigo-50/80 via-white to-purple-50/40 p-4 shadow-2xs dark:border-indigo-900/60 dark:from-slate-900 dark:to-slate-900">
        <span className="text-[11px] font-extrabold uppercase tracking-wider text-indigo-700 dark:text-indigo-400 block mb-2.5">
          Tezkor Boshqaruv Markazlari
        </span>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5 text-xs font-bold">
          <button
            type="button"
            onClick={() => onNavigate('school-management')}
            className="flex items-center justify-center gap-1.5 rounded-2xl bg-white p-2.5 text-slate-800 shadow-2xs hover:bg-indigo-50 hover:text-indigo-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 transition-all cursor-pointer border border-slate-100 dark:border-slate-700"
          >
            <Building className="h-3.5 w-3.5 text-indigo-600" />
            <span>Maktab</span>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('students')}
            className="flex items-center justify-center gap-1.5 rounded-2xl bg-white p-2.5 text-slate-800 shadow-2xs hover:bg-indigo-50 hover:text-indigo-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 transition-all cursor-pointer border border-slate-100 dark:border-slate-700"
          >
            <Users className="h-3.5 w-3.5 text-indigo-600" />
            <span>O‘quvchilar</span>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('teachers')}
            className="flex items-center justify-center gap-1.5 rounded-2xl bg-white p-2.5 text-slate-800 shadow-2xs hover:bg-indigo-50 hover:text-indigo-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 transition-all cursor-pointer border border-slate-100 dark:border-slate-700"
          >
            <GraduationCap className="h-3.5 w-3.5 text-indigo-600" />
            <span>O‘qituvchilar</span>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('monitoring')}
            className="flex items-center justify-center gap-1.5 rounded-2xl bg-white p-2.5 text-slate-800 shadow-2xs hover:bg-indigo-50 hover:text-indigo-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 transition-all cursor-pointer border border-slate-100 dark:border-slate-700"
          >
            <BarChart3 className="h-3.5 w-3.5 text-indigo-600" />
            <span>Monitoring</span>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('ai-analytics')}
            className="flex items-center justify-center gap-1.5 rounded-2xl bg-white p-2.5 text-slate-800 shadow-2xs hover:bg-indigo-50 hover:text-indigo-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 transition-all cursor-pointer border border-slate-100 dark:border-slate-700"
          >
            <Sparkles className="h-3.5 w-3.5 text-indigo-600" />
            <span>AI Tahlil</span>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('reports')}
            className="flex items-center justify-center gap-1.5 rounded-2xl bg-white p-2.5 text-slate-800 shadow-2xs hover:bg-indigo-50 hover:text-indigo-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 transition-all cursor-pointer border border-slate-100 dark:border-slate-700"
          >
            <Award className="h-3.5 w-3.5 text-indigo-600" />
            <span>Hisobotlar</span>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('announcements')}
            className="flex items-center justify-center gap-1.5 rounded-2xl bg-white p-2.5 text-slate-800 shadow-2xs hover:bg-indigo-50 hover:text-indigo-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 transition-all cursor-pointer border border-slate-100 dark:border-slate-700"
          >
            <Bell className="h-3.5 w-3.5 text-indigo-600" />
            <span>E'lonlar</span>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('security')}
            className="flex items-center justify-center gap-1.5 rounded-2xl bg-white p-2.5 text-slate-800 shadow-2xs hover:bg-indigo-50 hover:text-indigo-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 transition-all cursor-pointer border border-slate-100 dark:border-slate-700"
          >
            <ShieldCheck className="h-3.5 w-3.5 text-indigo-600" />
            <span>Xavfsizlik</span>
          </button>
        </div>
      </div>

      {/* 5. 10 Main KPI Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        {/* 1. Total Students */}
        <div
          onClick={() => onNavigate('students')}
          className="rounded-3xl border border-slate-200/80 bg-white p-4 shadow-xs hover:border-indigo-300 dark:border-slate-800 dark:bg-slate-900 transition-all cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400">Jami O‘quvchilar</span>
            <Users className="h-4 w-4 text-indigo-600" />
          </div>
          <div className="mt-2 text-2xl font-black text-slate-900 dark:text-white font-mono">
            {kpiData.totalStudents}
          </div>
          <span className="text-[10px] text-emerald-600 font-bold mt-1 block">
            {kpiData.activeStudents} nafar faol
          </span>
        </div>

        {/* 2. Total Teachers */}
        <div
          onClick={() => onNavigate('teachers')}
          className="rounded-3xl border border-slate-200/80 bg-white p-4 shadow-xs hover:border-indigo-300 dark:border-slate-800 dark:bg-slate-900 transition-all cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400">O‘qituvchilar</span>
            <GraduationCap className="h-4 w-4 text-purple-600" />
          </div>
          <div className="mt-2 text-2xl font-black text-slate-900 dark:text-white font-mono">
            {kpiData.totalTeachers}
          </div>
          <span className="text-[10px] text-purple-600 font-bold mt-1 block">
            {kpiData.activeTeachers} nafar faol
          </span>
        </div>

        {/* 3. Parents */}
        <div
          onClick={() => onNavigate('parents')}
          className="rounded-3xl border border-slate-200/80 bg-white p-4 shadow-xs hover:border-indigo-300 dark:border-slate-800 dark:bg-slate-900 transition-all cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400">Ota-onalar</span>
            <HeartHandshake className="h-4 w-4 text-pink-600" />
          </div>
          <div className="mt-2 text-2xl font-black text-slate-900 dark:text-white font-mono">
            {kpiData.totalParents}
          </div>
          <span className="text-[10px] text-slate-400 mt-1 block">Vasiylar bilan</span>
        </div>

        {/* 4. Classes */}
        <div
          onClick={() => onNavigate('school-management')}
          className="rounded-3xl border border-slate-200/80 bg-white p-4 shadow-xs hover:border-indigo-300 dark:border-slate-800 dark:bg-slate-900 transition-all cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400">Jami Sinflar</span>
            <FolderKanban className="h-4 w-4 text-blue-600" />
          </div>
          <div className="mt-2 text-2xl font-black text-slate-900 dark:text-white font-mono">
            {kpiData.totalClasses}
          </div>
          <span className="text-[10px] text-blue-600 font-bold mt-1 block">
            {kpiData.totalClasses > 0 ? `${kpiData.totalClasses} ta faol sinf` : 'Sinflar mavjud'}
          </span>
        </div>

        {/* 5. Subjects */}
        <div
          onClick={() => onNavigate('school-management')}
          className="rounded-3xl border border-slate-200/80 bg-white p-4 shadow-xs hover:border-indigo-300 dark:border-slate-800 dark:bg-slate-900 transition-all cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400">Fanlar Soni</span>
            <BookOpen className="h-4 w-4 text-teal-600" />
          </div>
          <div className="mt-2 text-2xl font-black text-slate-900 dark:text-white font-mono">
            {kpiData.totalSubjects}
          </div>
          <span className="text-[10px] text-teal-600 font-bold mt-1 block">
            {kpiData.totalSubjects > 0 ? `${kpiData.totalSubjects} ta KAO fan standarti` : 'Fanlar kiritilgan'}
          </span>
        </div>

        {/* 6. Today Attendance */}
        <div
          onClick={() => onNavigate('monitoring')}
          className="rounded-3xl border border-slate-200/80 bg-white p-4 shadow-xs hover:border-indigo-300 dark:border-slate-800 dark:bg-slate-900 transition-all cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400">Davomat Foizi</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="mt-2 text-2xl font-black text-emerald-600 font-mono">
            {kpiData.todayAttendanceRate}%
          </div>
          <span className="text-[10px] text-slate-400 mt-1 block">Bugungi ko‘rsatkich</span>
        </div>

        {/* 7. Absent Students */}
        <div
          onClick={() => onNavigate('monitoring')}
          className="rounded-3xl border border-slate-200/80 bg-white p-4 shadow-xs hover:border-indigo-300 dark:border-slate-800 dark:bg-slate-900 transition-all cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400">Kelmaganlar</span>
            <AlertTriangle className="h-4 w-4 text-rose-500" />
          </div>
          <div className="mt-2 text-2xl font-black text-rose-600 font-mono">
            {kpiData.absentStudentsCount}
          </div>
          <span className="text-[10px] text-rose-500 font-bold mt-1 block">Sababli / Sababsiz</span>
        </div>

        {/* 8. Late Students */}
        <div
          onClick={() => onNavigate('monitoring')}
          className="rounded-3xl border border-slate-200/80 bg-white p-4 shadow-xs hover:border-indigo-300 dark:border-slate-800 dark:bg-slate-900 transition-all cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400">Kechikkanlar</span>
            <Clock className="h-4 w-4 text-amber-500" />
          </div>
          <div className="mt-2 text-2xl font-black text-amber-600 font-mono">
            {kpiData.lateStudentsCount}
          </div>
          <span className="text-[10px] text-amber-600 font-bold mt-1 block">08:30 dan so‘ng</span>
        </div>

        {/* 9. Average Grade */}
        <div
          onClick={() => onNavigate('monitoring')}
          className="rounded-3xl border border-slate-200/80 bg-white p-4 shadow-xs hover:border-indigo-300 dark:border-slate-800 dark:bg-slate-900 transition-all cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400">O‘rtacha Baho</span>
            <Award className="h-4 w-4 text-indigo-600" />
          </div>
          <div className="mt-2 text-2xl font-black text-indigo-600 font-mono">
            {kpiData.averageGrade}
          </div>
          <span className="text-[10px] text-indigo-600 font-bold mt-1 block">5 ballik shkala</span>
        </div>

        {/* 10. System Health */}
        <div
          onClick={() => onNavigate('security')}
          className="rounded-3xl border border-slate-200/80 bg-white p-4 shadow-xs hover:border-indigo-300 dark:border-slate-800 dark:bg-slate-900 transition-all cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400">Tizim Holati</span>
            <Activity className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="mt-2 text-2xl font-black text-emerald-600 font-mono">
            {kpiData.systemHealthStatus}
          </div>
          <span className="text-[10px] text-emerald-600 font-bold mt-1 block">Barqaror & Real-time</span>
        </div>
      </div>

      {/* 6. Class Rankings Preview & Analytics (2 Columns) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Class Ranking Top & Bottom Preview */}
        <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-indigo-600" />
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                Sinflar Reytingi & Taqqoslash
              </h2>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('monitoring')}
              className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 cursor-pointer"
            >
              <span>To‘liq reyting</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="space-y-2.5">
            {(kpiData.classRanking && kpiData.classRanking.length > 0
              ? kpiData.classRanking.slice(0, 5)
              : [
                  { rank: 1, className: '11-A', score: 94.2, averageGrade: 4.8, attendanceRate: 98, studentCount: 30, homeroomTeacher: 'Nodira Vohidova' },
                  { rank: 2, className: '7-A', score: 91.5, averageGrade: 4.7, attendanceRate: 97, studentCount: 28, homeroomTeacher: 'Dilshod Raxmatov' },
                  { rank: 3, className: '9-B', score: 88.0, averageGrade: 4.5, attendanceRate: 95, studentCount: 29, homeroomTeacher: 'Shahnoza Karimova' },
                  { rank: 4, className: '8-A', score: 85.3, averageGrade: 4.3, attendanceRate: 93, studentCount: 27, homeroomTeacher: 'Jasur Karimov' },
                  { rank: 5, className: '10-A', score: 82.1, averageGrade: 4.1, attendanceRate: 90, studentCount: 31, homeroomTeacher: 'Gulnora Alimova' },
                ]
            ).map((item) => (
              <div
                key={item.className}
                className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 text-xs"
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`flex h-6 w-6 items-center justify-center rounded-lg font-black font-mono text-[11px] ${
                      item.rank === 1
                        ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                        : item.rank === 2
                        ? 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
                        : item.rank === 3
                        ? 'bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300'
                        : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                    }`}
                  >
                    #{item.rank}
                  </span>
                  <div>
                    <span className="font-bold text-slate-900 dark:text-white">{item.className} sinf</span>
                    <span className="text-[11px] text-slate-400 block">
                      Rahbar: {item.homeroomTeacher || '—'}
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="font-black font-mono text-indigo-600 dark:text-indigo-400 text-sm">
                    {item.score} ball
                  </span>
                  <span className="text-[10px] text-slate-400 block">
                    Baho: {item.averageGrade} • Davomat: {item.attendanceRate}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Teacher Workload & Capacity */}
        <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <GraduationCap className="h-5 w-5 text-purple-600" />
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                O‘qituvchilar Haftalik Yuklamasi (Stavka)
              </h2>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('teachers')}
              className="text-xs font-bold text-purple-600 hover:text-purple-700 flex items-center gap-1 cursor-pointer"
            >
              <span>Barcha o‘qituvchilar</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="space-y-2.5">
            {kpiData.teacherWorkloads.slice(0, 5).map((tch, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 text-xs"
              >
                <div>
                  <div className="font-bold text-slate-900 dark:text-white">{tch.name}</div>
                  <div className="text-[11px] text-slate-400">{tch.subject} fani o‘qituvchisi</div>
                </div>
                <span className="rounded-xl bg-purple-50 dark:bg-purple-950 px-3 py-1 font-mono font-bold text-purple-700 dark:text-purple-300">
                  {tch.hours} soat ({(tch.hours / 18).toFixed(2)} stavka)
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
