import React, { useState, useEffect, useMemo } from 'react';
import {
  GraduationCap,
  Sparkles,
  BookOpen,
  Award,
  Search,
  Star,
  Plus,
  Clock,
  Building,
  DoorClosed,
  Phone,
  Mail,
  UserCheck,
  Calendar,
  Layers,
  ChevronRight,
  Filter,
  CheckCircle2,
  Briefcase,
  Sliders,
  Users,
  FileText,
  Download,
  Eye,
  FolderArchive,
  User,
} from 'lucide-react';
import { AppLanguage, TeacherRecord, ScheduleSlot, StudentRecord } from '../../types';
import { useI18n } from '../../lib/i18n';
import { MOCK_TEACHERS, MOCK_STUDENTS, MOCK_DOCUMENTS } from '../../data/mockData';
import { TeacherWorkload, INITIAL_TEACHER_WORKLOADS } from '../../lib/scheduleGenerator';
import { AddTeacherWizardModal } from './AddTeacherWizardModal';
import { TeacherEditModal } from './TeacherEditModal';
import { listSchoolData, createSchoolData } from '../../lib/schoolRepository';


interface TeachersDirectoryProps {
  language: AppLanguage;
  teachers?: TeacherRecord[];
  onAddTeacher?: (newTeacher: TeacherRecord, newWorkload: TeacherWorkload, shouldRegenerateSchedule: boolean) => void;
  onUpdateTeacher?: (teacher: TeacherRecord) => void;
  onNavigateTab?: (tabId: string) => void;
  workloads?: TeacherWorkload[];
}

export function sortTeachersNaturally(teachers: TeacherRecord[]): TeacherRecord[] {
  return [...teachers].sort((a, b) => {
    const getParts = (t: TeacherRecord) => {
      const parts = t.name.trim().split(/\s+/);
      if (parts.length >= 2) return { last: parts.slice(1).join(' '), first: parts[0] };
      return { last: parts[0] || '', first: '' };
    };
    const pA = getParts(a);
    const pB = getParts(b);
    const cmp = pA.last.localeCompare(pB.last);
    if (cmp !== 0) return cmp;
    return pA.first.localeCompare(pB.first);
  });
}

export function getTeacherInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2 && parts[0] && parts[1]) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return (name[0] || 'T').toUpperCase();
}

export const TeachersDirectory: React.FC<TeachersDirectoryProps> = ({
  language,
  teachers: propTeachers,
  onAddTeacher: propOnAddTeacher,
  onUpdateTeacher: propOnUpdateTeacher,
  onNavigateTab,
  workloads: propWorkloads,
}) => {
  const t = useI18n(language);
  const [internalTeachers, setInternalTeachers] = useState<TeacherRecord[]>([]);
  const [schedules, setSchedules] = useState<ScheduleSlot[]>([]);
  const teachers = useMemo(() => {
    return sortTeachersNaturally(propTeachers || internalTeachers);
  }, [propTeachers, internalTeachers]);

  useEffect(() => {
    if (!propTeachers) {
      listSchoolData<TeacherRecord>('teachers').then((items) => {
        if (items.length > 0) setInternalTeachers(sortTeachersNaturally(items));
      }).catch(() => undefined);
    }
    listSchoolData<ScheduleSlot>('schedules').then((slots) => {
      if (slots && slots.length > 0) setSchedules(slots);
    }).catch(() => undefined);
  }, [propTeachers]);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('ALL');
  const [selectedPositionFilter, setSelectedPositionFilter] = useState<string>('ALL');
  const [isAddWizardOpen, setIsAddWizardOpen] = useState(false);
  const [selectedTeacherForDetail, setSelectedTeacherForDetail] = useState<TeacherRecord | null>(null);
  const [editingTeacher, setEditingTeacher] = useState<TeacherRecord | null>(null);
  const [modalTab, setModalTab] = useState<'profile' | 'students' | 'documents'>('profile');
  const [modalClassFilter, setModalClassFilter] = useState<string>('');

  const handleTeacherSaved = (saved: TeacherRecord) => {
    if (propOnUpdateTeacher) {
      propOnUpdateTeacher(saved);
    }
    setInternalTeachers((prev) => prev.map((t) => (t.id === saved.id ? saved : t)));
  };

  const handleOpenDetailModal = (tc: TeacherRecord) => {
    setSelectedTeacherForDetail(tc);
    setModalTab('profile');
    if (tc.homeroomClass && tc.homeroomClass !== 'none') {
      setModalClassFilter(tc.homeroomClass);
    } else if (tc.assignedClasses.length > 0) {
      setModalClassFilter(tc.assignedClasses[0]);
    } else {
      setModalClassFilter('7-A');
    }
  };

  const handleCreateTeacher = (
    newTeacher: TeacherRecord,
    newWorkload: TeacherWorkload,
    shouldRegenerate: boolean
  ) => {
    if (propOnAddTeacher) {
      propOnAddTeacher(newTeacher, newWorkload, shouldRegenerate);
    } else {
      createSchoolData('teachers', newTeacher).then((saved) => {
        setInternalTeachers((current) => [saved, ...current]);
      }).catch(() => setInternalTeachers((current) => [newTeacher, ...current]));
    }
  };

  const filteredTeachers = teachers.filter((tc) => {
    const matchesSearch =
      tc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (tc.subject && tc.subject.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (tc.position && tc.position.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (tc.room && tc.room.toLowerCase().includes(searchQuery.toLowerCase())) ||
      tc.assignedClasses.some((c) => c.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesDept =
      selectedDepartment === 'ALL' || tc.department === selectedDepartment;

    const matchesPos =
      selectedPositionFilter === 'ALL' ||
      (selectedPositionFilter === 'HOD' && tc.position?.includes('Kafedra')) ||
      (selectedPositionFilter === 'SENIOR' && tc.position?.includes('Bosh')) ||
      (selectedPositionFilter === 'HOMEROOM' && tc.homeroomClass && tc.homeroomClass !== 'none');

    return matchesSearch && matchesDept && matchesPos;
  });

  const totalHours = teachers.reduce((acc, curr) => acc + (curr.totalLessonsWeekly || 18), 0);
  const avgHours = teachers.length > 0 ? (totalHours / teachers.length).toFixed(1) : '18.0';

  const handleExportCSV = () => {
    const headers = ['ID', 'F.I.SH', 'Fan / Mutaxassislik', 'Kafedra', 'Lavozim', 'Haftalik soat', 'Xona', 'Sinf rahbarlik', 'Telefon', 'Email'];
    const rows = filteredTeachers.map((t) => [
      t.id || t.employeeId,
      t.name,
      t.subject || t.specialization,
      t.department,
      t.position,
      t.totalLessonsWeekly || 18,
      t.room || '—',
      t.homeroomClass || '—',
      t.phone || '',
      t.email || '',
    ]);
    const csvContent = [headers.join(','), ...rows.map((r) => r.map((c) => `"${c || ''}"`).join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `edusphere_teachers_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div id="teachers-directory-view" className="space-y-6 pb-16">
      {/* Top Banner with Stats & Primary Action */}
      <div className="flex flex-col justify-between gap-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-xs dark:bg-indigo-500">
              <GraduationCap className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 dark:text-white sm:text-2xl">
                {language === 'uz' ? "Pedagogik Tarkib & O'qituvchilar Yuklamasi" : "Faculty Staff & Workload Directory"}
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 sm:text-sm mt-0.5">
                {language === 'uz'
                  ? "Lavozimlar, haftalik dars stavkalari, biriktirilgan sinflar va dars jadvali ko'rsatkichlari"
                  : "Teacher positions, weekly lesson rates, assigned classrooms, and automated timetable synchronization"}
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 shadow-2xs"
          >
            <Download className="h-4 w-4 text-slate-500" />
            <span>{language === 'uz' ? 'Eksport (CSV)' : 'Export CSV'}</span>
          </button>

          {onNavigateTab && (
            <button
              onClick={() => onNavigateTab('schedule')}
              className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            >
              <Calendar className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
              <span>{language === 'uz' ? 'Dars Jadvalini Ko‘rish' : 'View Timetable'}</span>
            </button>
          )}

          <button
            onClick={() => setIsAddWizardOpen(true)}
            className="flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-bold text-white shadow-md hover:bg-indigo-700 dark:bg-indigo-500 transition-all hover:scale-[1.02]"
          >
            <Plus className="h-4 w-4" />
            <span>{language === 'uz' ? 'O‘qituvchi Qo‘shish (Yuklama & Lavozim)' : 'Add Teacher & Assign Workload'}</span>
          </button>
        </div>
      </div>

      {/* Metrics Summary Strip */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-bold uppercase">{language === 'uz' ? 'Jami O‘qituvchilar' : 'Total Faculty'}</span>
            <GraduationCap className="h-4 w-4 text-indigo-600" />
          </div>
          <div className="mt-2 text-2xl font-black text-slate-900 dark:text-white">
            {teachers.length} <span className="text-xs font-normal text-slate-500">nafar</span>
          </div>
          <p className="text-[11px] text-emerald-600 font-semibold mt-0.5">100% tasdiqlangan shtat</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-bold uppercase">{language === 'uz' ? 'O‘rtacha Stavka' : 'Avg Workload'}</span>
            <Clock className="h-4 w-4 text-cyan-600" />
          </div>
          <div className="mt-2 text-2xl font-black text-slate-900 dark:text-white">
            {avgHours} <span className="text-xs font-normal text-slate-500">soat/hafta</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">~1.0 stavka ekvivalent</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-bold uppercase">{language === 'uz' ? 'Sinf Rahbarlari' : 'Homeroom Masters'}</span>
            <UserCheck className="h-4 w-4 text-amber-600" />
          </div>
          <div className="mt-2 text-2xl font-black text-slate-900 dark:text-white">
            {teachers.filter((t) => t.homeroomClass && t.homeroomClass !== 'none').length}{' '}
            <span className="text-xs font-normal text-slate-500">sinfda</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">Sinflarga biriktirilgan</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-bold uppercase">{language === 'uz' ? 'AI Dars Rejalari' : 'AI Lesson Plans'}</span>
            <Sparkles className="h-4 w-4 text-purple-600" />
          </div>
          <div className="mt-2 text-2xl font-black text-slate-900 dark:text-white">
            {teachers.reduce((acc, curr) => acc + (curr.aiPlansGenerated || 0), 0)}{' '}
            <span className="text-xs font-normal text-slate-500">generatsiya</span>
          </div>
          <p className="text-[11px] text-purple-600 font-semibold mt-0.5">Dars sifatini oshirish</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900 md:flex-row md:items-center md:justify-between">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={
              language === 'uz'
                ? "Ism, fan, lavozim, sinf yoki xona bo‘yicha qidirish..."
                : "Search by teacher name, subject, position, class or room..."
            }
            className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 py-2.5 text-xs font-medium text-slate-900 focus:border-indigo-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          />
        </div>

        {/* Department Chips */}
        <div className="flex flex-wrap items-center gap-1.5">
          {[
            { id: 'ALL', label: language === 'uz' ? 'Barchasi' : 'All' },
            { id: 'STEM', label: 'STEM' },
            { id: 'Science', label: 'Science' },
            { id: 'Humanities', label: 'Humanities' },
            { id: 'Technology', label: 'Technology' },
            { id: 'Sports', label: 'Sports' },
          ].map((dept) => {
            const isSel = selectedDepartment === dept.id;
            return (
              <button
                key={dept.id}
                type="button"
                onClick={() => setSelectedDepartment(dept.id)}
                className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-all ${
                  isSel
                    ? 'bg-indigo-600 text-white shadow-2xs dark:bg-indigo-500'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
                }`}
              >
                {dept.label}
              </button>
            );
          })}
        </div>

        {/* Position Filter */}
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-slate-400" />
          <select
            value={selectedPositionFilter}
            onChange={(e) => setSelectedPositionFilter(e.target.value)}
            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-700 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
          >
            <option value="ALL">{language === 'uz' ? 'Barcha lavozimlar' : 'All Positions'}</option>
            <option value="HOD">{language === 'uz' ? 'Kafedra mudirlari' : 'Heads of Dept'}</option>
            <option value="SENIOR">{language === 'uz' ? 'Bosh o‘qituvchilar' : 'Senior Teachers'}</option>
            <option value="HOMEROOM">{language === 'uz' ? 'Sinf rahbarlari' : 'Homeroom Masters'}</option>
          </select>
        </div>
      </div>

      {/* Teachers Cards Grid */}
      {filteredTeachers.length === 0 ? (
        <div className="rounded-3xl border border-slate-200 bg-white p-12 text-center dark:border-slate-800 dark:bg-slate-900 shadow-xs">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400">
            <GraduationCap className="h-7 w-7" />
          </div>
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-200 mt-4">
            {searchQuery ? 'Qidiruv bo‘yicha o‘qituvchilar topilmadi.' : 'Hozircha o‘qituvchilar mavjud emas.'}
          </h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            {searchQuery
              ? 'Qidiruv so‘zini o‘zgartirib ko‘ring yoki filtrni tozalang.'
              : 'Yangi o‘qituvchi profilini yaratish uchun quyidagi tugmani bosing.'}
          </p>
          {!searchQuery && (
            <button
              onClick={() => setIsAddWizardOpen(true)}
              className="mt-5 inline-flex items-center gap-1.5 rounded-2xl bg-indigo-600 px-5 py-2.5 text-xs font-bold text-white shadow-md hover:bg-indigo-700 active:scale-95 transition-all"
            >
              <Plus className="h-4 w-4" />
              <span>+ Yangi o‘qituvchi qo‘shish</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredTeachers.map((tc) => {
          const rateHours = tc.workloadHours || tc.totalLessonsWeekly || 18;
          const initials = getTeacherInitials(tc.name);
          const scheduledCount = schedules.filter(
            (s) => s.teacherId === tc.id || (s.teacherName && (s.teacherName.toLowerCase() === tc.name.toLowerCase() || tc.name.toLowerCase().includes(s.teacherName.toLowerCase().split(' ')[0])))
          ).length;
          const isOverload = scheduledCount > rateHours;
          const isFull = scheduledCount === rateHours;

          return (
            <div
              key={tc.id}
              className="group relative flex flex-col justify-between rounded-3xl border border-slate-200 bg-white p-5 shadow-xs transition-all duration-200 hover:-translate-y-1 hover:border-indigo-300 hover:shadow-xl dark:border-slate-800 dark:bg-slate-900"
            >
              <div>
                {/* Header Profile Row */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="relative h-14 w-14 shrink-0">
                      {tc.avatar ? (
                        <img
                          src={tc.avatar}
                          alt={tc.name}
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                            const fallback = e.currentTarget.nextElementSibling as HTMLElement;
                            if (fallback) fallback.style.display = 'flex';
                          }}
                          className="h-14 w-14 rounded-2xl object-cover ring-2 ring-indigo-500/10 shadow-sm"
                        />
                      ) : null}
                      <div
                        style={{ display: tc.avatar ? 'none' : 'flex' }}
                        className="h-14 w-14 items-center justify-center rounded-2xl bg-linear-to-br from-indigo-500 to-purple-600 font-bold text-white shadow-sm text-sm"
                      >
                        {initials}
                      </div>
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white line-clamp-1 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                        {tc.name}
                      </h3>
                      <p className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 line-clamp-1">
                        {tc.subject || 'Subject Teacher'}
                      </p>
                      <p className="text-[10px] text-slate-400 truncate">{tc.email}</p>
                    </div>
                  </div>
                </div>

                {/* Badges: Position & Department */}
                <div className="mt-3 flex flex-wrap items-center gap-1.5">
                  {tc.position && (
                    <span className="inline-flex items-center gap-1 rounded-lg bg-indigo-50 px-2 py-0.5 text-[10px] font-bold text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-200/50 dark:border-indigo-900">
                      {tc.position.includes('Kafedra') ? '👑 ' : tc.position.includes('Bosh') ? '⭐ ' : tc.position.includes('Metod') ? '📝 ' : '🎓 '}
                      {tc.position.split('(')[0].trim()}
                    </span>
                  )}
                  {tc.department && (
                    <span className="rounded-lg bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                      {tc.department}
                    </span>
                  )}
                  {tc.homeroomClass && tc.homeroomClass !== 'none' && (
                    <span className="rounded-lg bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                      🏫 {tc.homeroomClass} rahbari
                    </span>
                  )}
                </div>

                {/* Workload & Timetable Details Matrix */}
                <div className="mt-4 space-y-2 rounded-2xl bg-slate-50 p-3.5 text-xs dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5 text-[11px]">
                      <Clock className="h-3.5 w-3.5 text-indigo-500" />
                      {language === 'uz' ? 'Dars Yuklamasi (Stavka):' : 'Workload Rate:'}
                    </span>
                    <span className="font-bold text-indigo-600 dark:text-indigo-400 text-xs">
                      {tc.rateType ? tc.rateType : `${rateHours} soat / hafta`}
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-slate-200/60 dark:border-slate-700/60">
                    <span className="text-slate-500 dark:text-slate-400 text-[11px]">
                      {language === 'uz' ? 'Jadvaldagi Darslar:' : 'Scheduled Hours:'}
                    </span>
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold ${
                      isOverload
                        ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-300'
                        : isFull
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300'
                        : 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-900'
                    }`}>
                      {isOverload
                        ? `⚠️ ${scheduledCount}/${rateHours} (+${scheduledCount - rateHours} soat ortiq)`
                        : isFull
                        ? `✓ ${scheduledCount}/${rateHours} soat (To‘liq)`
                        : `📊 ${scheduledCount}/${rateHours} soat (${rateHours - scheduledCount} soat bo‘sh)`}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5 text-[11px]">
                      <DoorClosed className="h-3.5 w-3.5 text-slate-400" />
                      {language === 'uz' ? 'Asosiy Xona:' : 'Cabinet Room:'}
                    </span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200 text-xs truncate max-w-[130px]">
                      {tc.room || 'Room 304'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 dark:text-slate-400 text-[11px]">
                      {language === 'uz' ? 'Biriktirilgan Sinflar:' : 'Assigned Classes:'}
                    </span>
                    <div className="flex flex-wrap justify-end gap-1">
                      {tc.assignedClasses && tc.assignedClasses.length > 0 ? (
                        tc.assignedClasses.map((cls) => (
                          <span
                            key={cls}
                            className="rounded bg-white px-1.5 py-0.5 text-[10px] font-bold text-slate-700 shadow-2xs dark:bg-slate-700 dark:text-slate-200"
                          >
                            {cls}
                          </span>
                        ))
                      ) : (
                        <span className="text-[10px] text-slate-400">7-A, 8-B</span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-slate-200/60 dark:border-slate-700/60">
                    <span className="text-slate-500 dark:text-slate-400 text-[11px]">
                      {language === 'uz' ? 'Reyting & Baholar:' : 'Rating & Quality:'}
                    </span>
                    <span className="flex items-center gap-1 font-bold text-amber-600 dark:text-amber-400 text-xs">
                      <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" /> {tc.rating || 4.9} / 5.0
                    </span>
                  </div>
                </div>
              </div>

              {/* Card Footer Actions */}
              <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingTeacher(tc)}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 shadow-2xs"
                >
                  Tahrirlash
                </button>

                <button
                  onClick={() => handleOpenDetailModal(tc)}
                  className="flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400"
                >
                  <span>{language === 'uz' ? 'Batafsil & O‘quvchilar' : 'View & Students'}</span>
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
      )}

      {/* Detail Modal with 3 Tabs: Profile, Students (Homeroom / Subject Classes), and Documents */}
      {selectedTeacherForDetail && (() => {
        const isHomeroom = Boolean(
          selectedTeacherForDetail.homeroomClass &&
          selectedTeacherForDetail.homeroomClass !== 'none'
        );

        // Compute students to display
        let displayedStudents: StudentRecord[] = [];
        if (isHomeroom && modalClassFilter === selectedTeacherForDetail.homeroomClass) {
          displayedStudents = MOCK_STUDENTS.filter(
            (s) => s.grade === selectedTeacherForDetail.homeroomClass
          );
        } else {
          const targetClass = modalClassFilter || selectedTeacherForDetail.assignedClasses[0] || '7-A';
          displayedStudents = MOCK_STUDENTS.filter((s) => s.grade === targetClass);
        }

        // Relevant documents
        const teacherDocs = MOCK_DOCUMENTS.filter(
          (d) =>
            (d.gradeLevel && (d.gradeLevel === selectedTeacherForDetail.homeroomClass || selectedTeacherForDetail.assignedClasses.includes(d.gradeLevel))) ||
            (d.subject && d.subject.toLowerCase() === selectedTeacherForDetail.subject?.toLowerCase()) ||
            d.category === 'regulatory'
        );

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
            <div className="w-full max-w-2xl rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900 max-h-[90vh] overflow-y-auto">
              {/* Header */}
              <div className="flex items-start justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
                <div className="flex items-center gap-3.5">
                  <div className="relative h-16 w-16 shrink-0">
                    {selectedTeacherForDetail.avatar ? (
                      <img
                        src={selectedTeacherForDetail.avatar}
                        alt={selectedTeacherForDetail.name}
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                          const fallback = e.currentTarget.nextElementSibling as HTMLElement;
                          if (fallback) fallback.style.display = 'flex';
                        }}
                        className="h-16 w-16 rounded-2xl object-cover ring-4 ring-indigo-500/10 shadow-md"
                      />
                    ) : null}
                    <div
                      style={{ display: selectedTeacherForDetail.avatar ? 'none' : 'flex' }}
                      className="h-16 w-16 items-center justify-center rounded-2xl bg-linear-to-br from-indigo-500 to-purple-600 font-bold text-white shadow-md text-lg"
                    >
                      {getTeacherInitials(selectedTeacherForDetail.name)}
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-black text-slate-900 dark:text-white">
                        {selectedTeacherForDetail.name}
                      </h3>
                      {isHomeroom ? (
                        <span className="rounded-full bg-amber-400 px-2.5 py-0.5 text-[10px] font-black text-slate-950">
                          🏫 {selectedTeacherForDetail.homeroomClass} Sinf Rahbari
                        </span>
                      ) : (
                        <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                          📚 Fan O‘qituvchisi
                        </span>
                      )}
                    </div>
                    <p className="text-xs font-bold text-indigo-600 dark:text-indigo-400 mt-0.5">
                      {selectedTeacherForDetail.position || `${selectedTeacherForDetail.subject} o‘qituvchisi`}
                    </p>
                    <p className="text-[11px] text-slate-400">
                      {selectedTeacherForDetail.qualification || 'Oliy toifali pedagog'} • {selectedTeacherForDetail.department || 'Kafedra'}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setSelectedTeacherForDetail(null)}
                  className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  ✕
                </button>
              </div>

              {/* Navigation Tabs */}
              <div className="mt-4 flex border-b border-slate-100 text-xs font-bold dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setModalTab('profile')}
                  className={`border-b-2 px-4 py-2.5 transition-all ${
                    modalTab === 'profile'
                      ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400'
                      : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400'
                  }`}
                >
                  👤 {language === 'uz' ? 'Profil & Yuklama' : 'Profile & Workload'}
                </button>

                <button
                  type="button"
                  onClick={() => setModalTab('students')}
                  className={`border-b-2 px-4 py-2.5 transition-all ${
                    modalTab === 'students'
                      ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400'
                      : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400'
                  }`}
                >
                  👥 {isHomeroom
                    ? `${selectedTeacherForDetail.homeroomClass} Sinf O‘quvchilari (${displayedStudents.length})`
                    : `Dars Sinflari O‘quvchilari (${displayedStudents.length})`}
                </button>

                <button
                  type="button"
                  onClick={() => setModalTab('documents')}
                  className={`border-b-2 px-4 py-2.5 transition-all ${
                    modalTab === 'documents'
                      ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400'
                      : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400'
                  }`}
                >
                  📑 {language === 'uz' ? 'Hujjatlar & KTM' : 'Documents & KTM'} ({teacherDocs.length})
                </button>
              </div>

              {/* TAB 1: Profile & Workload Details */}
              {modalTab === 'profile' && (
                <div className="mt-4 space-y-3">
                  <div className="rounded-2xl bg-slate-50 p-4 text-xs dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 space-y-2.5">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Elektron pochta:</span>
                      <span className="font-semibold text-slate-900 dark:text-white">{selectedTeacherForDetail.email}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Telefon:</span>
                      <span className="font-semibold text-slate-900 dark:text-white">{selectedTeacherForDetail.phone}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Haftalik Stavka (Yuklama):</span>
                      <span className="font-bold text-indigo-600 dark:text-indigo-400">
                        {selectedTeacherForDetail.rateType || `${selectedTeacherForDetail.totalLessonsWeekly || 20} soat`}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Biriktirilgan Sinflar:</span>
                      <span className="font-semibold text-slate-900 dark:text-white">
                        {selectedTeacherForDetail.assignedClasses.join(', ')}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Asosiy Dars Xonasi:</span>
                      <span className="font-semibold text-slate-900 dark:text-white">
                        {selectedTeacherForDetail.room}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Sinf Rahbarligi:</span>
                      <span className="font-bold text-slate-900 dark:text-white">
                        {isHomeroom ? (
                          <span className="text-amber-600 dark:text-amber-400">
                            🏫 {selectedTeacherForDetail.homeroomClass} sinf (Faol rahbariyat)
                          </span>
                        ) : (
                          <span className="text-slate-400 font-normal">
                            Biriktirilmagan (Faqat fan o‘qituvchisi)
                          </span>
                        )}
                      </span>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-indigo-100 bg-indigo-50/50 p-4 dark:border-indigo-900/40 dark:bg-indigo-950/20">
                    <div className="flex items-center gap-2 text-xs font-bold text-indigo-900 dark:text-indigo-300">
                      <Sparkles className="h-4 w-4 text-indigo-600" />
                      <span>Avtomatlashtirilgan Dars Jadvali Sinxronizatsiyasi</span>
                    </div>
                    <p className="mt-1 text-[11px] text-slate-600 dark:text-slate-400">
                      Ushbu o‘qituvchi haftasiga {selectedTeacherForDetail.assignedClasses.length} ta sinfda dars beradi. Dars jadvali generatori ushbu o‘qituvchining yuklamasini avtomatik hisoblab, to‘qnashuvsiz (0-conflict) jadval tuzadi.
                    </p>
                  </div>
                </div>
              )}

              {/* TAB 2: Students Roster (Conditional: Homeroom vs Subject Teaching) */}
              {modalTab === 'students' && (
                <div className="mt-4 space-y-3">
                  {/* Status announcement */}
                  {isHomeroom ? (
                    <div className="flex flex-col justify-between gap-2 rounded-2xl bg-amber-50 p-3 text-xs text-amber-900 dark:bg-amber-950/50 dark:text-amber-200 border border-amber-200 dark:border-amber-900 sm:flex-row sm:items-center">
                      <div className="flex items-center gap-2 font-bold">
                        <span className="text-base">🏫</span>
                        <span>{selectedTeacherForDetail.homeroomClass} Sinf Rahbari O‘quvchilari Ro‘yxati</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-[11px] font-normal">Sinfni almashtirish:</span>
                        {[selectedTeacherForDetail.homeroomClass, ...selectedTeacherForDetail.assignedClasses.filter(c => c !== selectedTeacherForDetail.homeroomClass)]
                          .filter((cls): cls is string => Boolean(cls))
                          .map((cls) => (
                          <button
                            key={cls}
                            type="button"
                            onClick={() => setModalClassFilter(cls)}
                            className={`rounded-lg px-2 py-0.5 text-[10px] font-bold ${
                              modalClassFilter === cls
                                ? 'bg-amber-500 text-white'
                                : 'bg-white text-slate-700 border border-slate-200 dark:bg-slate-800 dark:text-slate-300'
                            }`}
                          >
                            {cls}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col justify-between gap-2 rounded-2xl bg-slate-50 p-3 text-xs text-slate-700 dark:bg-slate-800/60 dark:text-slate-300 border border-slate-200 dark:border-slate-700 sm:flex-row sm:items-center">
                      <div className="flex items-center gap-2">
                        <span className="text-base">📚</span>
                        <span>Faqat fan darsi o‘tiladigan sinflar ({selectedTeacherForDetail.subject}):</span>
                      </div>
                      <div className="flex items-center gap-1">
                        {selectedTeacherForDetail.assignedClasses.map((cls) => (
                          <button
                            key={cls}
                            type="button"
                            onClick={() => setModalClassFilter(cls)}
                            className={`rounded-lg px-2.5 py-1 text-[10px] font-bold ${
                              modalClassFilter === cls
                                ? 'bg-indigo-600 text-white'
                                : 'bg-white text-slate-700 border border-slate-200 dark:bg-slate-800 dark:text-slate-300'
                            }`}
                          >
                            {cls} Sinf
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Student list */}
                  <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-[300px] overflow-y-auto rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
                    {displayedStudents.length > 0 ? (
                      displayedStudents.map((stu) => (
                        <div
                          key={stu.id}
                          className="flex items-center justify-between p-3 text-xs hover:bg-slate-50 dark:hover:bg-slate-800/50"
                        >
                          <div className="flex items-center gap-2.5">
                            <img
                              src={stu.avatar}
                              alt={stu.name}
                              className="h-8 w-8 rounded-xl object-cover"
                            />
                            <div>
                              <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                                <span>{stu.name}</span>
                                <span className="rounded bg-slate-100 px-1 py-0.2 text-[9px] text-slate-500 dark:bg-slate-800">
                                  {stu.grade}
                                </span>
                              </div>
                              <div className="text-[10px] text-slate-400">
                                Ota-onasi: {stu.parentName} ({stu.parentPhone})
                              </div>
                            </div>
                          </div>

                          <div className="text-right">
                            <div className="font-bold text-indigo-600 dark:text-indigo-400">
                              GPA: {stu.avgGrade}%
                            </div>
                            <div className="text-[10px] text-emerald-600 font-semibold">
                              Davomat: {stu.attendanceRate}%
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="p-6 text-center text-xs text-slate-400">
                        Ushbu sinfda o‘quvchilar ro‘yxati topilmadi.
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 3: Documents & KTMs */}
              {modalTab === 'documents' && (
                <div className="mt-4 space-y-2.5">
                  <p className="text-xs text-slate-500">
                    Ushbu o‘qituvchi va biriktirilgan fanlar bo‘yicha tasdiqlangan rasmiy hujjatlar:
                  </p>
                  <div className="space-y-2 max-h-[300px] overflow-y-auto">
                    {teacherDocs.map((doc) => (
                      <div
                        key={doc.id}
                        className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-3 shadow-2xs dark:border-slate-800 dark:bg-slate-900"
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400">
                            <FileText className="h-4 w-4" />
                          </div>
                          <div>
                            <h5 className="font-bold text-slate-900 dark:text-white text-xs line-clamp-1">
                              {doc.title}
                            </h5>
                            <div className="text-[10px] text-slate-400">
                              {doc.author} • {doc.date} • {doc.format} ({doc.fileSize})
                            </div>
                          </div>
                        </div>

                        <span className="rounded-lg bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                          {doc.format}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Modal Footer */}
              <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-4 dark:border-slate-800">
                <div className="text-xs text-slate-400">
                  ID: #{selectedTeacherForDetail.id}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setSelectedTeacherForDetail(null)}
                    className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                  >
                    Yopish
                  </button>
                  {onNavigateTab && (
                    <button
                      onClick={() => {
                        setSelectedTeacherForDetail(null);
                        onNavigateTab('schedule');
                      }}
                      className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-700 dark:bg-indigo-500 shadow-md"
                    >
                      Dars Jadvalini Ko‘rish
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Add Teacher Multi-Step Wizard Modal */}
      <AddTeacherWizardModal
        isOpen={isAddWizardOpen}
        onClose={() => setIsAddWizardOpen(false)}
        language={language}
        onAddTeacher={handleCreateTeacher}
      />
      {editingTeacher && <TeacherEditModal teacher={editingTeacher} onClose={() => setEditingTeacher(null)} onSaved={(saved) => {
        setInternalTeachers((current) => current.map((teacher) => teacher.id === saved.id ? saved : teacher));
        propOnUpdateTeacher?.(saved);
      }} />}
    </div>
  );
};

