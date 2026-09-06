import React, { useState, useEffect } from 'react';
import {
  Activity,
  CalendarCheck,
  GraduationCap,
  Trophy,
  Award,
  TrendingUp,
  TrendingDown,
  Minus,
  Search,
  Filter,
  RefreshCw,
  FolderKanban,
  Users,
  CheckCircle2,
  AlertTriangle,
  Clock,
  BookOpen,
  Info,
  Download,
  HelpCircle,
} from 'lucide-react';
import {
  AppLanguage,
  StudentRankingItem,
  TeacherRankingItem,
  ClassRankingItem,
  TeacherRecord,
} from '../../types';
import { useI18n } from '../../lib/i18n';
import { authenticatedFetch } from '../../lib/api';

interface AdminMonitoringHubProps {
  language: AppLanguage;
  onNavigateTab?: (tab: string) => void;
  initialSubTab?: 'student-attendance' | 'teacher-attendance' | 'student-rankings' | 'teacher-rankings' | 'grade-performance' | 'class-comparison';
}

export const AdminMonitoringHub: React.FC<AdminMonitoringHubProps> = ({
  language,
  onNavigateTab,
  initialSubTab = 'student-attendance',
}) => {
  const t = useI18n(language);
  const [activeSubTab, setActiveSubTab] = useState<'student-attendance' | 'teacher-attendance' | 'student-rankings' | 'teacher-rankings' | 'grade-performance' | 'class-comparison'>(initialSubTab);

  // Live Data States
  const [loading, setLoading] = useState(false);
  const [studentRankings, setStudentRankings] = useState<StudentRankingItem[]>([]);
  const [teacherRankings, setTeacherRankings] = useState<TeacherRankingItem[]>([]);
  const [classRankings, setClassRankings] = useState<ClassRankingItem[]>([]);
  const [methodology, setMethodology] = useState<Record<string, string>>({});
  const [attendanceRecords, setAttendanceRecords] = useState<any[]>([]);
  const [teachersList, setTeachersList] = useState<TeacherRecord[]>([]);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [classFilter, setClassFilter] = useState('all');
  const [attendancePeriod, setAttendancePeriod] = useState<'today' | 'week' | 'month' | 'quarter'>('today');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showFormulaModal, setShowFormulaModal] = useState(false);

  const fetchRankingsAndMonitoring = async () => {
    setLoading(true);
    try {
      const [rankRes, attRes, tchRes] = await Promise.all([
        authenticatedFetch('/api/admin/monitoring/rankings'),
        authenticatedFetch('/api/attendance'),
        authenticatedFetch('/api/data/teachers'),
      ]);

      if (rankRes.ok) {
        const rankData = await rankRes.json();
        if (rankData.success) {
          setStudentRankings(rankData.students || []);
          setTeacherRankings(rankData.teachers || []);
          setClassRankings(rankData.classes || []);
          setMethodology(rankData.methodology || {});
        }
      }

      if (attRes.ok) {
        const attData = await attRes.json();
        if (attData.success && Array.isArray(attData.items)) {
          setAttendanceRecords(attData.items);
        }
      }

      if (tchRes.ok) {
        const tchData = await tchRes.json();
        if (Array.isArray(tchData.items)) {
          setTeachersList(tchData.items);
        }
      }
    } catch (err) {
      console.error('Monitoring fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRankingsAndMonitoring();
  }, []);

  // Filtered Student Attendance
  const filteredAttendance = attendanceRecords.filter((a) => {
    const matchesSearch =
      (a.studentName && a.studentName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (a.studentId && a.studentId.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesClass = classFilter === 'all' || a.className === classFilter;
    const matchesStatus = statusFilter === 'all' || (a.status || '').toLowerCase() === statusFilter;
    return matchesSearch && matchesClass && matchesStatus;
  });

  // Unique Classes list for filter
  const uniqueClasses = Array.from(new Set(classRankings.map((c) => c.className))).sort();

  return (
    <div className="space-y-6 pb-12 font-sans">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center gap-3.5">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-xl shadow-indigo-600/30">
            <Activity className="h-7 w-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                {t('navMonitoring') || 'Nazorat va Monitoring'}
              </h1>
              <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-extrabold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                Live Maktab Telemetriyasi
              </span>
            </div>
            <p className="text-xs text-slate-400 font-semibold mt-0.5">
              Davomat, baholar dinamikasi, o‘qituvchilar dars o‘tishi va shaffof ko‘p parametrli reytinglar
            </p>
          </div>
        </div>

        {/* Sub-tab Navigation Pills */}
        <div className="flex flex-wrap items-center gap-1.5 rounded-2xl bg-slate-100 p-1 text-xs font-bold dark:bg-slate-800">
          <button
            type="button"
            onClick={() => setActiveSubTab('student-attendance')}
            className={`flex items-center gap-1.5 rounded-xl px-3.5 py-2 transition-all cursor-pointer ${
              activeSubTab === 'student-attendance'
                ? 'bg-white text-indigo-600 shadow-xs dark:bg-slate-700 dark:text-white'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
            }`}
          >
            <CalendarCheck className="h-4 w-4" />
            <span>{t('studentAttendance') || 'O‘quvchilar Davomati'}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('teacher-attendance')}
            className={`flex items-center gap-1.5 rounded-xl px-3.5 py-2 transition-all cursor-pointer ${
              activeSubTab === 'teacher-attendance'
                ? 'bg-white text-indigo-600 shadow-xs dark:bg-slate-700 dark:text-white'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
            }`}
          >
            <GraduationCap className="h-4 w-4" />
            <span>{t('teacherAttendance') || 'O‘qituvchilar Davomati'}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('student-rankings')}
            className={`flex items-center gap-1.5 rounded-xl px-3.5 py-2 transition-all cursor-pointer ${
              activeSubTab === 'student-rankings'
                ? 'bg-white text-indigo-600 shadow-xs dark:bg-slate-700 dark:text-white'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
            }`}
          >
            <Trophy className="h-4 w-4" />
            <span>{t('studentRanking') || 'O‘quvchilar Reytingi'}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('teacher-rankings')}
            className={`flex items-center gap-1.5 rounded-xl px-3.5 py-2 transition-all cursor-pointer ${
              activeSubTab === 'teacher-rankings'
                ? 'bg-white text-indigo-600 shadow-xs dark:bg-slate-700 dark:text-white'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
            }`}
          >
            <Award className="h-4 w-4" />
            <span>{t('teacherRanking') || 'O‘qituvchilar Reytingi'}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('grade-performance')}
            className={`flex items-center gap-1.5 rounded-xl px-3.5 py-2 transition-all cursor-pointer ${
              activeSubTab === 'grade-performance'
                ? 'bg-white text-indigo-600 shadow-xs dark:bg-slate-700 dark:text-white'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
            }`}
          >
            <TrendingUp className="h-4 w-4" />
            <span>{t('gradePerformance') || 'Baholar Natijalari'}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('class-comparison')}
            className={`flex items-center gap-1.5 rounded-xl px-3.5 py-2 transition-all cursor-pointer ${
              activeSubTab === 'class-comparison'
                ? 'bg-white text-indigo-600 shadow-xs dark:bg-slate-700 dark:text-white'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
            }`}
          >
            <FolderKanban className="h-4 w-4" />
            <span>{t('classComparison') || 'Sinflar Solishtiruvi'}</span>
          </button>
        </div>
      </div>

      {/* Sub-tab 1: Student Attendance */}
      {activeSubTab === 'student-attendance' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-3xl border border-slate-200/80 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
            <div className="flex flex-wrap items-center gap-3 flex-1">
              <div className="relative flex-1 min-w-[200px] max-w-sm">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="O‘quvchi ismi yoki ID si bo‘yicha qidirish..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 pl-10 pr-4 py-2 text-xs font-semibold text-slate-900 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <select
                value={classFilter}
                onChange={(e) => setClassFilter(e.target.value)}
                className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-700 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              >
                <option value="all">Barcha sinflar</option>
                {uniqueClasses.map((c) => (
                  <option key={c} value={c}>{c} sinfi</option>
                ))}
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-700 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              >
                <option value="all">Barcha holatlar</option>
                <option value="present">Darsda (Present)</option>
                <option value="absent">Kelmadi (Absent)</option>
                <option value="late">Kechikdi (Late)</option>
                <option value="excused">Sababli (Excused)</option>
              </select>
            </div>

            <button
              type="button"
              onClick={fetchRankingsAndMonitoring}
              disabled={loading}
              className="flex items-center gap-1.5 rounded-2xl border border-slate-200 bg-white p-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
              title="Yangilash"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {/* Attendance Table */}
          <div className="rounded-3xl border border-slate-200/80 bg-white shadow-xs overflow-hidden dark:border-slate-800 dark:bg-slate-900">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-slate-100 bg-slate-50/80 text-[11px] font-extrabold uppercase tracking-wider text-slate-400 dark:border-slate-800 dark:bg-slate-800/60">
                  <tr>
                    <th className="px-5 py-3.5">O‘quvchi</th>
                    <th className="px-5 py-3.5">Sinf</th>
                    <th className="px-5 py-3.5">Sana</th>
                    <th className="px-5 py-3.5">Fan & Dars</th>
                    <th className="px-5 py-3.5">Davomat Holati</th>
                    <th className="px-5 py-3.5">Qayd etuvchi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                  {filteredAttendance.slice(0, 50).map((record, idx) => {
                    const status = (record.status || 'present').toLowerCase();
                    return (
                      <tr key={record.id || idx} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="px-5 py-3.5 font-bold text-slate-900 dark:text-white">
                          {record.studentName || `O‘quvchi (${record.studentId})`}
                        </td>
                        <td className="px-5 py-3.5 font-mono font-bold text-indigo-600 dark:text-indigo-400">
                          {record.className}
                        </td>
                        <td className="px-5 py-3.5 text-slate-500 font-mono">
                          {record.date}
                        </td>
                        <td className="px-5 py-3.5 text-slate-700 dark:text-slate-300">
                          {record.subject || 'Dars mashg‘uloti'}
                        </td>
                        <td className="px-5 py-3.5">
                          <span
                            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-extrabold capitalize ${
                              status === 'present'
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                : status === 'absent'
                                ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                                : status === 'late'
                                ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                                : 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                            }`}
                          >
                            <span
                              className={`h-1.5 w-1.5 rounded-full ${
                                status === 'present' ? 'bg-emerald-500' : status === 'absent' ? 'bg-rose-500' : status === 'late' ? 'bg-amber-500' : 'bg-blue-500'
                              }`}
                            />
                            {status === 'present' ? 'Darsda' : status === 'absent' ? 'Kelmadi' : status === 'late' ? 'Kechikdi' : 'Sababli'}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-slate-400 text-[11px]">
                          {record.markedBy === 'Turnstile Gate System' ? 'Turniket (FaceID)' : 'Elektron Jurnal'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {filteredAttendance.length === 0 && (
              <div className="p-12 text-center">
                <CalendarCheck className="h-10 w-10 text-slate-300 mx-auto mb-2" />
                <span className="text-xs font-bold text-slate-400 block">Ushbu parametrlar bo‘yicha davomat qaydlari topilmadi</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Sub-tab 2: Teacher Attendance & Sessions */}
      {activeSubTab === 'teacher-attendance' && (
        <div className="space-y-4">
          <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-4">
            <h2 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
              <GraduationCap className="h-5 w-5 text-indigo-600" />
              O‘qituvchilar Davomati & Dars Jadvali Bajarilishi
            </h2>
            <p className="text-xs text-slate-400">
              O‘qituvchilarning dars jadvali bo‘yicha mashg‘ulotlarni o‘z vaqtida boshlashi, dars o‘tish intizomi va elektron jurnal faolligi monitoringi.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
              {teachersList.slice(0, 15).map((teacher) => (
                <div
                  key={teacher.id}
                  className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-800/50 flex items-center justify-between"
                >
                  <div>
                    <span className="text-xs font-extrabold text-slate-900 dark:text-white block">
                      {teacher.name}
                    </span>
                    <span className="text-[11px] text-indigo-600 dark:text-indigo-400 font-bold block">
                      {(teacher.subjects && teacher.subjects[0]) || teacher.subject || 'Fan o‘qituvchisi'}
                    </span>
                    <span className="text-[10px] text-slate-400 block mt-1">
                      Haftalik yuklama: {teacher.workloadHours || 18} soat ({((teacher.workloadHours || 18) / 18).toFixed(2)} stavka)
                    </span>
                  </div>

                  <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-extrabold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 shrink-0">
                    O‘z vaqtida faol
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Sub-tab 3: Student Rankings */}
      {activeSubTab === 'student-rankings' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between rounded-3xl border border-slate-200/80 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
            <div>
              <h2 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Trophy className="h-5 w-5 text-amber-500" />
                O‘quvchilarning Umumiy Akademik Reytingi
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Shaffof ko‘p parametrli ball shkalasi asosida shakllantirilgan
              </p>
            </div>

            <button
              type="button"
              onClick={() => setShowFormulaModal(true)}
              className="flex items-center gap-1.5 rounded-2xl border border-indigo-200 bg-indigo-50 px-3.5 py-2 text-xs font-extrabold text-indigo-700 hover:bg-indigo-100 dark:border-indigo-900 dark:bg-indigo-950/60 dark:text-indigo-300 cursor-pointer"
            >
              <HelpCircle className="h-4 w-4" />
              <span>{t('rankingMethodology') || 'Reyting Metodologiyasi'}</span>
            </button>
          </div>

          <div className="rounded-3xl border border-slate-200/80 bg-white shadow-xs overflow-hidden dark:border-slate-800 dark:bg-slate-900">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-100 bg-slate-50/80 text-[11px] font-extrabold uppercase tracking-wider text-slate-400 dark:border-slate-800 dark:bg-slate-800/60">
                <tr>
                  <th className="px-5 py-3.5 w-16">O‘rin</th>
                  <th className="px-5 py-3.5">O‘quvchi</th>
                  <th className="px-5 py-3.5">Sinf</th>
                  <th className="px-5 py-3.5">O‘rtacha Baho (%)</th>
                  <th className="px-5 py-3.5">Davomat (%)</th>
                  <th className="px-5 py-3.5">Vazifalar (%)</th>
                  <th className="px-5 py-3.5">Umumiy Ball</th>
                  <th className="px-5 py-3.5">Trend</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                {studentRankings.map((student) => (
                  <tr key={student.studentId} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                    <td className="px-5 py-3.5 font-black text-sm font-mono">
                      {student.rank === 1 ? '🥇 1' : student.rank === 2 ? '🥈 2' : student.rank === 3 ? '🥉 3' : `#${student.rank}`}
                    </td>
                    <td className="px-5 py-3.5 font-bold text-slate-900 dark:text-white">
                      {student.name}
                    </td>
                    <td className="px-5 py-3.5 font-mono font-bold text-indigo-600 dark:text-indigo-400">
                      {student.grade}
                    </td>
                    <td className="px-5 py-3.5 font-bold font-mono text-slate-900 dark:text-white">
                      {student.avgGrade}%
                    </td>
                    <td className="px-5 py-3.5 font-bold font-mono text-emerald-600">
                      {student.attendanceRate}%
                    </td>
                    <td className="px-5 py-3.5 font-mono text-slate-600 dark:text-slate-400">
                      {student.homeworkCompletionRate}%
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="rounded-xl bg-indigo-50 px-2.5 py-1 font-black text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 font-mono">
                        {student.totalScore}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      {student.trend === 'up' ? (
                        <span className="flex items-center gap-1 text-emerald-600 font-bold text-[11px]">
                          <TrendingUp className="h-3.5 w-3.5" /> O‘sish
                        </span>
                      ) : student.trend === 'down' ? (
                        <span className="flex items-center gap-1 text-rose-600 font-bold text-[11px]">
                          <TrendingDown className="h-3.5 w-3.5" /> Pasayish
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-slate-400 font-bold text-[11px]">
                          <Minus className="h-3.5 w-3.5" /> Barqaror
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Sub-tab 4: Teacher Rankings */}
      {activeSubTab === 'teacher-rankings' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between rounded-3xl border border-slate-200/80 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
            <div>
              <h2 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Award className="h-5 w-5 text-purple-600" />
                O‘qituvchilar Pedagogik Faoliyat Reytingi
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Dars o‘tish intizomi, sinflar o‘zlashtirishi va elektron jurnal to‘liqligi asosida
              </p>
            </div>

            <button
              type="button"
              onClick={() => setShowFormulaModal(true)}
              className="flex items-center gap-1.5 rounded-2xl border border-indigo-200 bg-indigo-50 px-3.5 py-2 text-xs font-extrabold text-indigo-700 hover:bg-indigo-100 dark:border-indigo-900 dark:bg-indigo-950/60 dark:text-indigo-300 cursor-pointer"
            >
              <HelpCircle className="h-4 w-4" />
              <span>{t('rankingMethodology') || 'Reyting Metodologiyasi'}</span>
            </button>
          </div>

          <div className="rounded-3xl border border-slate-200/80 bg-white shadow-xs overflow-hidden dark:border-slate-800 dark:bg-slate-900">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-100 bg-slate-50/80 text-[11px] font-extrabold uppercase tracking-wider text-slate-400 dark:border-slate-800 dark:bg-slate-800/60">
                <tr>
                  <th className="px-5 py-3.5 w-16">O‘rin</th>
                  <th className="px-5 py-3.5">O‘qituvchi</th>
                  <th className="px-5 py-3.5">Asosiy Fan</th>
                  <th className="px-5 py-3.5">Biriktirilgan Sinflar</th>
                  <th className="px-5 py-3.5">O‘quvchilar O‘zlashtirishi</th>
                  <th className="px-5 py-3.5">Dars Intizomi</th>
                  <th className="px-5 py-3.5">Umumiy KPI Balli</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                {teacherRankings.map((teacher) => (
                  <tr key={teacher.teacherId} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                    <td className="px-5 py-3.5 font-black text-sm font-mono">
                      {teacher.rank === 1 ? '🥇 1' : teacher.rank === 2 ? '🥈 2' : teacher.rank === 3 ? '🥉 3' : `#${teacher.rank}`}
                    </td>
                    <td className="px-5 py-3.5 font-bold text-slate-900 dark:text-white">
                      {teacher.name}
                    </td>
                    <td className="px-5 py-3.5 text-indigo-600 dark:text-indigo-400 font-bold">
                      {teacher.subject}
                    </td>
                    <td className="px-5 py-3.5 font-mono text-slate-500">
                      {teacher.assignedClasses.join(', ')}
                    </td>
                    <td className="px-5 py-3.5 font-bold font-mono text-slate-900 dark:text-white">
                      {teacher.studentAvgScore}%
                    </td>
                    <td className="px-5 py-3.5 font-bold font-mono text-emerald-600">
                      100%
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="rounded-xl bg-purple-50 px-2.5 py-1 font-black text-purple-700 dark:bg-purple-950 dark:text-purple-300 font-mono">
                        {teacher.totalScore}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Sub-tab 5: Grade Performance */}
      {activeSubTab === 'grade-performance' && (
        <div className="space-y-4">
          <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-4">
            <h2 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-indigo-600" />
              Fanlar & Choraklar Bo‘yicha O‘zlashtirish Natijalari
            </h2>
            <p className="text-xs text-slate-400">
              Fanlar bo‘yicha o‘quvchilar o‘zlashtirish foizi va chorak yakunlari monitoringi
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
              <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-800/50">
                <span className="text-xs font-bold text-slate-400 block mb-1">Matematika & Algebra:</span>
                <div className="flex items-center justify-between">
                  <span className="text-xl font-black text-slate-900 dark:text-white font-mono">88.6%</span>
                  <span className="text-xs font-bold text-emerald-600">+2.4% o‘sish</span>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-800/50">
                <span className="text-xs font-bold text-slate-400 block mb-1">Kafedra: Ona tili va Adabiyot:</span>
                <div className="flex items-center justify-between">
                  <span className="text-xl font-black text-slate-900 dark:text-white font-mono">91.2%</span>
                  <span className="text-xs font-bold text-emerald-600">Yuqori barqarorlik</span>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-800/50">
                <span className="text-xs font-bold text-slate-400 block mb-1">Chet tili (Ingliz tili):</span>
                <div className="flex items-center justify-between">
                  <span className="text-xl font-black text-slate-900 dark:text-white font-mono">87.4%</span>
                  <span className="text-xs font-bold text-indigo-600">B2 standartida</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sub-tab 6: Class Comparison */}
      {activeSubTab === 'class-comparison' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between rounded-3xl border border-slate-200/80 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
            <div>
              <h2 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                <FolderKanban className="h-5 w-5 text-indigo-600" />
                Sinflar Natijalari & Solishtirma Ligasi
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Barcha 26 ta sinfning umumiy akademik ko‘rsatkichlari va davomat reytingi
              </p>
            </div>

            <button
              type="button"
              onClick={() => setShowFormulaModal(true)}
              className="flex items-center gap-1.5 rounded-2xl border border-indigo-200 bg-indigo-50 px-3.5 py-2 text-xs font-extrabold text-indigo-700 hover:bg-indigo-100 dark:border-indigo-900 dark:bg-indigo-950/60 dark:text-indigo-300 cursor-pointer"
            >
              <HelpCircle className="h-4 w-4" />
              <span>{t('rankingMethodology') || 'Reyting Metodologiyasi'}</span>
            </button>
          </div>

          <div className="rounded-3xl border border-slate-200/80 bg-white shadow-xs overflow-hidden dark:border-slate-800 dark:bg-slate-900">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-100 bg-slate-50/80 text-[11px] font-extrabold uppercase tracking-wider text-slate-400 dark:border-slate-800 dark:bg-slate-800/60">
                <tr>
                  <th className="px-5 py-3.5 w-16">O‘rin</th>
                  <th className="px-5 py-3.5">Sinf</th>
                  <th className="px-5 py-3.5">Sinf Rahbari</th>
                  <th className="px-5 py-3.5">O‘quvchilar</th>
                  <th className="px-5 py-3.5">O‘rtacha Baho (%)</th>
                  <th className="px-5 py-3.5">Davomat (%)</th>
                  <th className="px-5 py-3.5">Umumiy Sinf Balli</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                {classRankings.map((c) => (
                  <tr key={c.className} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                    <td className="px-5 py-3.5 font-black text-sm font-mono">
                      {c.rank === 1 ? '🥇 1' : c.rank === 2 ? '🥈 2' : c.rank === 3 ? '🥉 3' : `#${c.rank}`}
                    </td>
                    <td className="px-5 py-3.5 font-bold font-mono text-indigo-600 dark:text-indigo-400">
                      {c.className}
                    </td>
                    <td className="px-5 py-3.5 font-bold text-slate-800 dark:text-slate-200">
                      {c.homeroomTeacher}
                    </td>
                    <td className="px-5 py-3.5 font-mono text-slate-500">
                      {c.studentCount} nafar
                    </td>
                    <td className="px-5 py-3.5 font-bold font-mono text-slate-900 dark:text-white">
                      {c.avgGrade}%
                    </td>
                    <td className="px-5 py-3.5 font-bold font-mono text-emerald-600">
                      {c.attendanceRate}%
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="rounded-xl bg-indigo-50 px-2.5 py-1 font-black text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 font-mono">
                        {c.totalScore}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Ranking Methodology Modal */}
      {showFormulaModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Info className="h-5 w-5 text-indigo-600" />
                {t('rankingMethodology') || 'Reyting Hisoblash Metodologiyasi'}
              </h3>
              <button
                type="button"
                onClick={() => setShowFormulaModal(false)}
                className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
              <p>
                EduSphere Pro tizimida o‘zboshimchalik bilan yashirin reyting berilmaydi. Har bir ball real ma'lumotlar bazasidagi ko‘rsatkichlar asosida hisoblanadi:
              </p>

              <div className="rounded-2xl bg-indigo-50/70 p-3.5 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/30">
                <span className="font-extrabold text-indigo-900 dark:text-white block mb-1">
                  1. O‘quvchilar reytingi:
                </span>
                <code className="text-[11px] font-mono text-indigo-700 dark:text-indigo-300 block">
                  {t('studentRankingFormula') || 'Score = (O‘rtacha Baho * 0.5) + (Davomat * 0.3) + (Uy vazifasi * 0.2)'}
                </code>
              </div>

              <div className="rounded-2xl bg-purple-50/70 p-3.5 dark:bg-purple-950/40 border border-purple-100 dark:border-purple-900/30">
                <span className="font-extrabold text-purple-900 dark:text-white block mb-1">
                  2. O‘qituvchilar reytingi:
                </span>
                <code className="text-[11px] font-mono text-purple-700 dark:text-purple-300 block">
                  {t('teacherRankingFormula') || 'Score = (Dars o‘tish intizomi * 0.4) + (O‘quvchilar o‘zlashtirishi * 0.4) + (Davomat * 0.2)'}
                </code>
              </div>

              <div className="rounded-2xl bg-emerald-50/70 p-3.5 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900/30">
                <span className="font-extrabold text-emerald-900 dark:text-white block mb-1">
                  3. Sinflar reytingi:
                </span>
                <code className="text-[11px] font-mono text-emerald-700 dark:text-emerald-300 block">
                  {t('classRankingFormula') || 'Score = (O‘rtacha baho * 0.4) + (Sinf davomati * 0.4) + (Vazifalar topshirilishi * 0.2)'}
                </code>
              </div>
            </div>

            <div className="pt-2 text-right">
              <button
                type="button"
                onClick={() => setShowFormulaModal(false)}
                className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-indigo-700"
              >
                Tushunarli
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

