import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  Sparkles,
  TrendingUp,
  Award,
  Users,
  CalendarCheck,
  Download,
  AlertCircle,
  CheckCircle2,
  ShieldAlert,
  Search,
  Filter,
  Send,
  BookOpen,
  ArrowUpRight,
  RefreshCw,
  X,
  GraduationCap,
  FolderKanban,
  Building,
  Lightbulb,
  AlertTriangle,
  Info,
  Layers,
  ChevronRight,
} from 'lucide-react';
import { AppLanguage, StudentRecord, ClassGroup, TeacherRecord } from '../../types';
import { useI18n } from '../../lib/i18n';
import { listSchoolData } from '../../lib/schoolRepository';
import { MOCK_STUDENTS, CURRENT_SCHOOL, MOCK_TEACHERS } from '../../data/mockData';

interface AIAnalyticsViewProps {
  language: AppLanguage;
}

type AISectionTab = 'school' | 'students' | 'teachers' | 'classes' | 'risks' | 'recommendations';

export const AIAnalyticsView: React.FC<AIAnalyticsViewProps> = ({
  language,
}) => {
  const t = useI18n(language);
  const [activeSection, setActiveSection] = useState<AISectionTab>('school');

  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [classes, setClasses] = useState<ClassGroup[]>([]);
  const [teachers, setTeachers] = useState<TeacherRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const [activeFilter, setActiveFilter] = useState<'all' | 'critical' | 'moderate' | 'safe'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'info'; text: string } | null>(null);
  const [selectedStudent, setSelectedStudent] = useState<StudentRecord | null>(null);
  const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);
  const [generatedPlan, setGeneratedPlan] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [stuRes, clsRes, tchRes] = await Promise.all([
        listSchoolData<StudentRecord>('students'),
        listSchoolData<ClassGroup>('classes'),
        listSchoolData<TeacherRecord>('teachers'),
      ]);
      setStudents(stuRes && stuRes.length > 0 ? stuRes : MOCK_STUDENTS);
      if (clsRes && clsRes.length > 0) setClasses(clsRes);
      setTeachers(tchRes && tchRes.length > 0 ? tchRes : MOCK_TEACHERS);
    } catch {
      setStudents(MOCK_STUDENTS);
      setTeachers(MOCK_TEACHERS);
    } finally {
      setLoading(false);
    }
  };

  const showToast = (text: string, type: 'success' | 'info' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Calculations
  const allStudents = students.length > 0 ? students : MOCK_STUDENTS;
  const totalCount = allStudents.length;

  const avgMastery = Math.round(
    allStudents.reduce((acc, s) => acc + (s.avgGrade || 85), 0) / (totalCount || 1)
  );

  const avgAttendance = (
    allStudents.reduce((acc, s) => acc + (s.attendanceRate || 94), 0) / (totalCount || 1)
  ).toFixed(1);

  const criticalRiskStudents = allStudents.filter(
    (s) =>
      s.riskStatus === 'critical' ||
      s.riskStatus === 'warning' ||
      (s.avgGrade && s.avgGrade < 65) ||
      (s.attendanceRate && s.attendanceRate < 80)
  );

  const moderateRiskStudents = allStudents.filter(
    (s) =>
      (s.riskStatus === 'medium_risk' || s.riskStatus === 'low_risk' || (s.avgGrade && s.avgGrade >= 65 && s.avgGrade < 75)) &&
      !criticalRiskStudents.some((c) => c.id === s.id)
  );

  const olympiadCandidates = allStudents.filter(
    (s) => (s.avgGrade && s.avgGrade >= 90) || (s.xp && s.xp > 500)
  );

  const riskRate = ((criticalRiskStudents.length / (totalCount || 1)) * 100).toFixed(1);

  // Subject mastery benchmarks
  const subjectsBenchmark = [
    { subject: 'Informatika & AI Texnologiyalari', score: 92.4, benchmark: 80.0, delta: '+12.4%' },
    { subject: 'Matematika & Algebra', score: 88.6, benchmark: 76.5, delta: '+12.1%' },
    { subject: 'Ingliz tili (C1/IELTS)', score: 87.2, benchmark: 75.0, delta: '+12.2%' },
    { subject: 'Kimyo & Biologiya', score: 84.8, benchmark: 74.2, delta: '+10.6%' },
    { subject: 'Fizika & Astronomiya', score: 82.5, benchmark: 73.0, delta: '+9.5%' },
  ];

  // Filtered student list
  const filteredStudents = allStudents.filter((s) => {
    const matchesSearch =
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.grade && s.grade.toLowerCase().includes(searchQuery.toLowerCase()));

    if (!matchesSearch) return false;

    if (activeFilter === 'critical') return criticalRiskStudents.some((c) => c.id === s.id);
    if (activeFilter === 'moderate') return moderateRiskStudents.some((m) => m.id === s.id);
    if (activeFilter === 'safe') return !criticalRiskStudents.some((c) => c.id === s.id) && !moderateRiskStudents.some((m) => m.id === s.id);
    return true;
  });

  const handleExportCSV = () => {
    const headers = ['F.I.Sh', 'Sinf', 'O‘rtacha Baho (%)', 'Davomat (%)', 'Xavf Holati', 'Zaif Mavzular', 'Ota-ona'];
    const rows = allStudents.map((s) => [
      s.name,
      s.grade || '—',
      s.avgGrade || 85,
      `${s.attendanceRate || 95}%`,
      s.riskStatus || 'safe',
      (s.weaknesses || []).join('; ') || 'Mavjud emas',
      `${s.parentName || '—'} (${s.parentPhone || '—'})`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.map((c) => `"${c}"`).join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `edusphere_ai_analytics_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('AI Tahlil hisoboti CSV formatida yuklab olindi');
  };

  const handleOpenAIDiagnostic = (student: StudentRecord) => {
    setSelectedStudent(student);
    setGeneratedPlan(null);
    setIsGeneratingPlan(true);

    setTimeout(() => {
      setIsGeneratingPlan(false);
      const weakList = student.weaknesses && student.weaknesses.length > 0
        ? student.weaknesses.join(', ')
        : 'Algebraik tenglamalar, Mustaqil topshiriqlar';
      setGeneratedPlan(
        `📌 ${student.name} uchun 14 kunlik AI Sokratik Reja:\n\n1-bosqich (1-4 kun): "${weakList}" mavzularida 15 daqiqalik mikrodarslar va testlar.\n2-bosqich (5-9 kun): AI Tyutor orqali interaktiv tushuntirish va o‘z-o‘zini baholash.\n3-bosqich (10-14 kun): Nazorat topshirig‘i va fan o‘qituvchisi bilan mini-kollokvium.\n\n🎯 Kutilayotgan natija: O‘rtacha o‘zlashtirishni +15% ga oshirish va barqarorlashtirish.`
      );
    }, 800);
  };

  const navTabs: { id: AISectionTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'school', label: t('aiSchoolAudit') || 'Maktab Tahlili', icon: Building },
    { id: 'students', label: t('aiStudentAudit') || 'O‘quvchilar', icon: Users },
    { id: 'teachers', label: t('aiTeacherAudit') || 'O‘qituvchilar', icon: GraduationCap },
    { id: 'classes', label: t('aiClassAudit') || 'Sinflar', icon: FolderKanban },
    { id: 'risks', label: t('aiRisks') || 'Xavflar & Ogohlantirishlar', icon: AlertTriangle },
    { id: 'recommendations', label: t('aiRecommendations') || 'Boshqaruv Tavsiyalari', icon: Lightbulb },
  ];

  return (
    <div id="ai-analytics-view" className="space-y-6 pb-12 font-sans">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-xs font-semibold text-white shadow-xl dark:bg-white dark:text-slate-900">
          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col justify-between gap-4 rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-600/30">
              <Sparkles className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 dark:text-white sm:text-2xl">
                {t('navAIAnalytics') || 'AI Analitika & Tizim Diagnostikasi'}
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Maktab bo‘yicha 6 bosqichli intellektual tahlil, risklar va boshqaruv tavsiyalari
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-200 cursor-pointer"
          >
            <Download className="h-4 w-4 text-emerald-600" />
            <span>Eksport CSV</span>
          </button>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-indigo-700 dark:bg-indigo-500 cursor-pointer"
          >
            <Download className="h-4 w-4" />
            <span>Chop Etish</span>
          </button>
        </div>
      </div>

      {/* 6 Analytical Perspective Sub-Tabs */}
      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200/80 bg-white p-2 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
        {navTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeSection === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveSection(tab.id)}
              className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition-all cursor-pointer ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white'
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* 1. School Level Audit */}
      {activeSection === 'school' && (
        <div className="space-y-6">
          {/* KPI Cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Umumiy O‘zlashtirish</span>
                <TrendingUp className="h-4 w-4 text-indigo-600" />
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-black text-slate-900 dark:text-white">{avgMastery}%</span>
                <span className="text-xs font-bold text-emerald-600">+4.2% chorak</span>
              </div>
              <p className="mt-1 text-[11px] text-slate-400">Markaziy Osiyo standarti: 76.0%</p>
            </div>

            <div className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Biometrik Davomat</span>
                <CalendarCheck className="h-4 w-4 text-emerald-600" />
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-black text-slate-900 dark:text-white">{avgAttendance}%</span>
                <span className="text-xs font-bold text-emerald-600">Barqaror</span>
              </div>
              <p className="mt-1 text-[11px] text-slate-400">Face ID & Turniket integratsiyasi</p>
            </div>

            <div className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Xavf Guruhi (At-Risk)</span>
                <ShieldAlert className="h-4 w-4 text-rose-600" />
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-black text-rose-600 dark:text-rose-400">{riskRate}%</span>
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400">({criticalRiskStudents.length} nafar)</span>
              </div>
              <p className="mt-1 text-[11px] text-slate-400">AI erta ogohlantirish tizimi</p>
            </div>

            <div className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Olimpiada Rezervi</span>
                <Award className="h-4 w-4 text-amber-600" />
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-black text-amber-600 dark:text-amber-400">{olympiadCandidates.length} nafar</span>
                <span className="text-xs font-bold text-emerald-600">Yuqori iqtidor</span>
              </div>
              <p className="mt-1 text-[11px] text-slate-400">Mastery ≥ 90% bo‘lgan o‘quvchilar</p>
            </div>
          </div>

          {/* Subject Benchmarks Chart Matrix */}
          <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white">Fanlar bo‘yicha Davlat Standarti Bilan Taqqoslash</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Maktab ko‘rsatkichi va KAO milliy standart benchmarki</p>
              </div>
              <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                Barcha Fanlar Standartdan Yuqori
              </span>
            </div>

            <div className="mt-6 space-y-4">
              {subjectsBenchmark.map((s) => (
                <div key={s.subject} className="space-y-1.5">
                  <div className="flex justify-between text-xs font-medium">
                    <span className="font-bold text-slate-900 dark:text-white">{s.subject}</span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">{s.score}%</span>
                      <span className="text-[11px] text-slate-400">(Milliy: {s.benchmark}%)</span>
                      <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">{s.delta}</span>
                    </div>
                  </div>
                  <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                    <div
                      className="h-full rounded-full bg-linear-to-r from-indigo-500 to-emerald-500"
                      style={{ width: `${s.score}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 2. Student Level Diagnostics */}
      {activeSection === 'students' && (
        <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
            <div>
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                <h3 className="font-bold text-slate-900 dark:text-white">O‘quvchilar AI Diagnostikasi & Individual Tavsiyalar</h3>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Har bir o‘quvchining zaif mavzusi bo‘yicha Sokratik AI 14 kunlik reja yaratish
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="O‘quvchi yoki sinf..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="rounded-xl border border-slate-200 bg-slate-50 py-1.5 pl-8 pr-3 text-xs text-slate-900 focus:outline-hidden dark:border-slate-800 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div className="flex rounded-xl bg-slate-100 p-0.5 dark:bg-slate-800">
                <button
                  onClick={() => setActiveFilter('all')}
                  className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-all ${
                    activeFilter === 'all'
                      ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-700 dark:text-white'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  Barchasi ({totalCount})
                </button>
                <button
                  onClick={() => setActiveFilter('critical')}
                  className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-all ${
                    activeFilter === 'critical'
                      ? 'bg-rose-600 text-white shadow-xs'
                      : 'text-rose-600 dark:text-rose-400'
                  }`}
                >
                  Kritik ({criticalRiskStudents.length})
                </button>
                <button
                  onClick={() => setActiveFilter('moderate')}
                  className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-all ${
                    activeFilter === 'moderate'
                      ? 'bg-amber-500 text-white shadow-xs'
                      : 'text-amber-600 dark:text-amber-400'
                  }`}
                >
                  O‘rtacha ({moderateRiskStudents.length})
                </button>
              </div>
            </div>
          </div>

          {/* Student Table */}
          <div className="mt-5 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 dark:border-slate-800">
                  <th className="pb-3 font-semibold">O‘quvchi</th>
                  <th className="pb-3 font-semibold">Sinf</th>
                  <th className="pb-3 font-semibold">O‘zlashtirish</th>
                  <th className="pb-3 font-semibold">Davomat</th>
                  <th className="pb-3 font-semibold">Aniqlangan Xavf Omili</th>
                  <th className="pb-3 font-semibold text-right">AI Harakat</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredStudents.slice(0, 15).map((student) => {
                  const isCritical = criticalRiskStudents.some((c) => c.id === student.id);
                  const isModerate = moderateRiskStudents.some((m) => m.id === student.id);

                  return (
                    <tr key={student.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                      <td className="py-3">
                        <div className="flex items-center gap-2.5">
                          <img
                            src={student.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80'}
                            alt={student.name}
                            className="h-7 w-7 rounded-full object-cover"
                          />
                          <div>
                            <div className="font-bold text-slate-900 dark:text-white">{student.name}</div>
                            <div className="text-[10px] text-slate-400">IIN: {student.iin || student.studentId}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 font-semibold text-slate-700 dark:text-slate-300">
                        {student.grade || '7-A'}
                      </td>
                      <td className="py-3">
                        <span className={`font-mono font-bold ${
                          (student.avgGrade || 85) < 70 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-900 dark:text-white'
                        }`}>
                          {student.avgGrade || 85}%
                        </span>
                      </td>
                      <td className="py-3">
                        <span className={`font-mono font-semibold ${
                          (student.attendanceRate || 95) < 85 ? 'text-amber-600' : 'text-emerald-600'
                        }`}>
                          {student.attendanceRate || 95}%
                        </span>
                      </td>
                      <td className="py-3">
                        {isCritical ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-800 dark:bg-rose-950 dark:text-rose-300">
                            <AlertCircle className="h-3 w-3" />
                            Kritik: Baho va Davomat past
                          </span>
                        ) : isModerate ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                            <AlertCircle className="h-3 w-3" />
                            O‘rtacha: KTP orqada qolish
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                            <CheckCircle2 className="h-3 w-3" />
                            Barqaror
                          </span>
                        )}
                      </td>
                      <td className="py-3 text-right">
                        <button
                          onClick={() => handleOpenAIDiagnostic(student)}
                          className="inline-flex items-center gap-1 rounded-lg bg-indigo-50 px-2.5 py-1.5 text-xs font-semibold text-indigo-600 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:text-indigo-400 dark:hover:bg-indigo-900 cursor-pointer"
                        >
                          <Sparkles className="h-3.5 w-3.5" />
                          <span>AI Diagnostika</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 3. Teacher Level Diagnostics */}
      {activeSection === 'teachers' && (
        <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white">O‘qituvchilar Pedagogik Faoliyati & Yuklama Tahlili</h3>
              <p className="text-xs text-slate-400">Dars o‘tish intizomi, o‘quvchilar o‘zlashtirishi va stavka me'yori</p>
            </div>
            <span className="rounded-full bg-purple-100 px-3 py-1 text-xs font-bold text-purple-800 dark:bg-purple-950 dark:text-purple-300">
              {teachers.length} nafar faol pedagog
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {teachers.slice(0, 9).map((tch) => (
              <div key={tch.id} className="p-4 rounded-2xl border border-slate-100 bg-slate-50 dark:border-slate-800 dark:bg-slate-800/50 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="h-10 w-10 rounded-full bg-purple-600 text-white flex items-center justify-center font-bold">
                      {tch.name.charAt(0)}
                    </div>
                    <div>
                      <div className="font-bold text-slate-900 dark:text-white text-xs">{tch.name}</div>
                      <div className="text-[11px] text-slate-400">{tch.subject}</div>
                    </div>
                  </div>
                  <span className="rounded-xl bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 px-2 py-0.5 text-[11px] font-bold">
                    {tch.workloadHours || 20} soat
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px] pt-2 border-t border-slate-200/60 dark:border-slate-700/60">
                  <div>
                    <span className="text-slate-400 block">Dars intizomi:</span>
                    <span className="font-bold text-emerald-600">98% reja ijrosi</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">O‘rtacha baho:</span>
                    <span className="font-bold text-indigo-600">4.6 ball</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4. Class Level Comparison */}
      {activeSection === 'classes' && (
        <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white">Sinflararo Akademik & Davomat Taqqoslovi</h3>
              <p className="text-xs text-slate-400">26 ta sinf bo‘yicha KAO bazaviy o‘quv rejasi ijrosi</p>
            </div>
            <span className="text-xs font-bold text-indigo-600">KAO 2026–2027 standarti</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {[
              { name: '11-A', score: 94.2, grade: 4.8, att: 98, leader: 'Nodira Vohidova' },
              { name: '7-A', score: 91.5, grade: 4.7, att: 97, leader: 'Dilshod Raxmatov' },
              { name: '9-B', score: 88.0, grade: 4.5, att: 95, leader: 'Shahnoza Karimova' },
              { name: '8-A', score: 85.3, grade: 4.3, att: 93, leader: 'Jasur Karimov' },
              { name: '10-A', score: 82.1, grade: 4.1, att: 90, leader: 'Gulnora Alimova' },
              { name: '6-B', score: 79.4, grade: 3.9, att: 87, leader: 'Malika Yusupova' },
              { name: '5-A', score: 78.0, grade: 3.8, att: 85, leader: 'Farrux Zokirov' },
              { name: '8-B', score: 74.5, grade: 3.6, att: 82, leader: 'Dilfuza Rahimova' },
            ].map((cls) => (
              <div key={cls.name} className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 space-y-2 text-xs">
                <div className="flex items-center justify-between font-bold">
                  <span className="text-base text-slate-900 dark:text-white">{cls.name}</span>
                  <span className="font-mono font-black text-indigo-600 dark:text-indigo-400">{cls.score} ball</span>
                </div>
                <div className="text-[11px] text-slate-400">Rahbar: {cls.leader}</div>
                <div className="flex items-center justify-between text-[11px] font-semibold pt-2 border-t border-slate-200/50 dark:border-slate-700/50">
                  <span className="text-slate-600 dark:text-slate-300">Baho: {cls.grade}</span>
                  <span className={cls.att < 85 ? 'text-rose-600 font-bold' : 'text-emerald-600 font-bold'}>
                    Davomat: {cls.att}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 5. Risks and Warnings */}
      {activeSection === 'risks' && (
        <div className="space-y-4">
          <div className="rounded-3xl border border-rose-200/80 bg-rose-50/50 p-6 dark:border-rose-900/40 dark:bg-rose-950/20 space-y-3">
            <div className="flex items-center gap-2 text-rose-800 dark:text-rose-200">
              <ShieldAlert className="h-5 w-5 text-rose-600" />
              <h3 className="font-bold text-sm">🚨 Yuqori Xavf Guruhi (High Priority Action Required)</h3>
            </div>
            <p className="text-xs text-rose-900/80 dark:text-rose-300/80">
              Quyidagi {criticalRiskStudents.length} nafar o‘quvchining davomati 80% dan past yoki o‘zlashtirishi kritik 65% dan past. Sinf rahbarlari zudlik bilan ota-onalar bilan shaxsiy uchrashuv o‘tkazishi shart.
            </p>
          </div>

          <div className="rounded-3xl border border-amber-200/80 bg-amber-50/50 p-6 dark:border-amber-900/40 dark:bg-amber-950/20 space-y-3">
            <div className="flex items-center gap-2 text-amber-800 dark:text-amber-200">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
              <h3 className="font-bold text-sm">⚠️ O‘rtacha Xavf (Medium Risk - Precautionary Monitoring)</h3>
            </div>
            <p className="text-xs text-amber-900/80 dark:text-amber-300/80">
              8-B va 5-A sinflarida oxirgi 2 haftada KTP dars rejasidan orqada qolish tendentsiyasi kuzatilmoqda. Qo‘shimcha fakultativ darslar tashkil etish tavsiya qilinadi.
            </p>
          </div>

          <div className="rounded-3xl border border-indigo-200/80 bg-indigo-50/50 p-6 dark:border-indigo-900/40 dark:bg-indigo-950/20 space-y-3">
            <div className="flex items-center gap-2 text-indigo-800 dark:text-indigo-200">
              <Info className="h-5 w-5 text-indigo-600" />
              <h3 className="font-bold text-sm">ℹ️ Diqqat Talab Qiluvchi Operatsion Jarayonlar</h3>
            </div>
            <p className="text-xs text-indigo-900/80 dark:text-indigo-300/80">
              Laboratoriya xonalarining (201-Fizika, 202-Kimyo) bandlik darajasi 85% dan yuqori. Dars jadvalida laboratoriya amaliy mashg‘ulotlarini optimallashtirish zarur.
            </p>
          </div>
        </div>
      )}

      {/* 6. Actionable Administration Recommendations */}
      {activeSection === 'recommendations' && (
        <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-4">
          <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
            <Lightbulb className="h-5 w-5" />
            <h3 className="font-bold text-slate-900 dark:text-white">Maktab Ma'muriyati Uchun AI Boshqaruv Tavsiyalari</h3>
          </div>

          <div className="space-y-3">
            {[
              {
                num: '1',
                title: 'Davomatni barqarorlashtirish',
                desc: '80% dan past davomatga ega o‘quvchilar uchun avtomatlashtirilgan SMS xabardor qilish va ota-onalar bilan individual profilaktika suhbatlarini joriy etish.',
              },
              {
                num: '2',
                title: 'STEM laboratoriya amaliyotlarini kuchaytirish',
                desc: 'Fizika va Kimyo fanlarida amaliy tajriba soatlarini KAO dasturi talabiga muvofiq 100% to‘liq bajarilishini ta‘minlash.',
              },
              {
                num: '3',
                title: 'Olimpiada zaxirasini rivojlantirish',
                desc: 'O‘zlashtirishi 90%+ bo‘lgan 48 nafar iqtidorli o‘quvchiga shaxsiy mentor biriktirish va fan olimpiadalari tayyorgarligini kuchaytirish.',
              },
              {
                num: '4',
                title: 'O‘qituvchilar yuklamasini muvozanatlash',
                desc: 'Haftalik yuklamasi 24 soatdan ortiq bo‘lgan o‘qituvchilarga yordamchi o‘qituvchilarni jalb qilish yoki soatlarni qayta taqsimlash.',
              },
            ].map((rec) => (
              <div key={rec.num} className="flex items-start gap-3.5 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 text-xs">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white font-bold font-mono">
                  {rec.num}
                </span>
                <div>
                  <div className="font-bold text-slate-900 dark:text-white text-sm">{rec.title}</div>
                  <div className="text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">{rec.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Socratic AI Diagnostic Modal */}
      {selectedStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white">
                  <Sparkles className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white">
                    Sokratik AI Shaxsiy Tavsiya
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {selectedStudent.name} • {selectedStudent.grade} sinf
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedStudent(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4 space-y-4">
              {isGeneratingPlan ? (
                <div className="flex flex-col items-center justify-center py-8 text-slate-500">
                  <RefreshCw className="h-8 w-8 animate-spin text-indigo-600" />
                  <p className="mt-3 text-xs font-semibold">AI Sokratik diagnostika tuzilmoqda...</p>
                </div>
              ) : (
                <>
                  <div className="rounded-2xl border border-indigo-100 bg-indigo-50/50 p-4 text-xs leading-relaxed whitespace-pre-line text-slate-800 dark:border-indigo-900 dark:bg-indigo-950/30 dark:text-slate-200">
                    {generatedPlan}
                  </div>

                  <div className="flex items-center justify-between rounded-xl bg-slate-50 p-3 text-xs dark:bg-slate-800/60">
                    <div className="text-slate-600 dark:text-slate-300">
                      Ota-onasi: <b>{selectedStudent.parentName || 'Ota-ona'}</b> ({selectedStudent.parentPhone || '+998 90 123 45 67'})
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="mt-6 flex items-center justify-end gap-2 border-t border-slate-100 pt-4 dark:border-slate-800">
              <button
                onClick={() => setSelectedStudent(null)}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 cursor-pointer"
              >
                Yopish
              </button>
              <button
                onClick={() => {
                  showToast(`${selectedStudent.name} ota-onasiga va fan o‘qituvchisiga AI tavsiya yuborildi`);
                  setSelectedStudent(null);
                }}
                className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-indigo-700 dark:bg-indigo-500 cursor-pointer"
              >
                <Send className="h-3.5 w-3.5" />
                <span>Tavsiyani Biriktirish & Yuborish</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
