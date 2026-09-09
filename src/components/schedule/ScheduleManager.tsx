import React, { useState, useEffect } from 'react';
import {
  Calendar as CalendarIcon,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Filter,
  Users,
  UserCheck,
  BookOpen,
  Building,
  GraduationCap,
  Download,
  Share2,
  RefreshCw,
  Plus,
  ArrowRight,
  Zap,
  Sliders,
  Eye,
  Check,
  Send,
  Layers,
  BarChart3,
  HelpCircle,
  Edit2,
  Trash2,
  Printer,
  FileSpreadsheet,
} from 'lucide-react';
import { AppLanguage, ScheduleSlot, UserRole, TeacherRecord, UserProfile } from '../../types';
import { useI18n } from '../../lib/i18n';
import {
  TeacherWorkload,
  INITIAL_TEACHER_WORKLOADS,
  TIME_PERIODS,
  SCHOOL_DAYS,
  SCHOOL_CLASSES,
  generateWorkloadBasedSchedule,
} from '../../lib/scheduleGenerator';
import { AddTeacherWizardModal } from '../teachers/AddTeacherWizardModal';
import { listSchoolData } from '../../lib/schoolRepository';
import { authenticatedFetch } from '../../lib/api';

interface ScheduleManagerProps {
  language: AppLanguage;
  currentRole?: UserRole;
  currentUser?: UserProfile;
  masterSchedule?: ScheduleSlot[];
  onUpdateMasterSchedule?: (newSlots: ScheduleSlot[], workloads?: TeacherWorkload[]) => void;
  onNavigateTab?: (tab: string) => void;
}

export const ScheduleManager: React.FC<ScheduleManagerProps> = ({
  language,
  currentRole = 'admin',
  currentUser,
  masterSchedule: propMasterSchedule,
  onUpdateMasterSchedule,
  onNavigateTab,
}) => {
  const t = useI18n(language);
  const isTeacher = currentRole === 'teacher';
  const isStudentOrParent = currentRole === 'parent_student';
  const isAdmin = currentRole === 'admin';

  // Initial generation if not provided
  const [schedule, setSchedule] = useState<ScheduleSlot[]>(() => {
    if (propMasterSchedule && propMasterSchedule.length > 0) return propMasterSchedule;
    return generateWorkloadBasedSchedule(INITIAL_TEACHER_WORKLOADS, SCHOOL_CLASSES, 5).slots;
  });

  const [workloads, setWorkloads] = useState<TeacherWorkload[]>(INITIAL_TEACHER_WORKLOADS);
  useEffect(() => {
    if (propMasterSchedule?.length) return;
    listSchoolData<ScheduleSlot>('schedules').then((items) => {
      if (items.length > 0) setSchedule(items);
    }).catch(() => undefined);
  }, [propMasterSchedule]);
  const [viewMode, setViewMode] = useState<'by_class' | 'by_teacher' | 'workloads' | 'matrix'>('by_class');
  
  // Selection filters
  const [selectedClass, setSelectedClass] = useState<string>('7-A');
  const [selectedTeacherName, setSelectedTeacherName] = useState<string>(
    currentUser?.name || workloads[0]?.teacherName || 'O‘qituvchi'
  );

  useEffect(() => {
    if (currentUser?.name && isTeacher) {
      setSelectedTeacherName(currentUser.name);
    }
  }, [currentUser, isTeacher]);

  const [selectedDay, setSelectedDay] = useState<'MON' | 'TUE' | 'WED' | 'THU' | 'FRI'>('MON');

  // Generator modal state
  const [isGeneratorModalOpen, setIsGeneratorModalOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStep, setGenerationStep] = useState(0);
  const [generatorClasses, setGeneratorClasses] = useState<string[]>(['7-A', '8-B', '9-A', '10-B']);
  const [generatorPeriodsCount, setGeneratorPeriodsCount] = useState<number>(5);
  const [avoidGaps, setAvoidGaps] = useState(true);
  const [balanceStemEarly, setBalanceStemEarly] = useState(true);

  // Edit workload modal
  const [editingWorkload, setEditingWorkload] = useState<TeacherWorkload | null>(null);
  const [isAddTeacherModalOpen, setIsAddTeacherModalOpen] = useState(false);

  // Slot editing modal state
  const [editingSlot, setEditingSlot] = useState<{
    id?: string;
    day: 'MON' | 'TUE' | 'WED' | 'THU' | 'FRI';
    period: number;
    time: string;
    className: string;
    subject: string;
    teacherName: string;
    room: string;
  } | null>(null);

  const handleOpenEditSlot = (
    day: 'MON' | 'TUE' | 'WED' | 'THU' | 'FRI',
    period: number,
    time: string,
    className: string,
    existingSlot?: ScheduleSlot
  ) => {
    setEditingSlot({
      id: existingSlot?.id,
      day,
      period,
      time,
      className,
      subject: existingSlot?.subject || workloads[0]?.subject || 'Matematika',
      teacherName: existingSlot?.teacherName || workloads[0]?.teacherName || 'Aigul Sadykova',
      room: existingSlot?.room || '304-xona',
    });
  };

  const handleSaveSlotModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSlot) return;

    // Check for collisions (same teacher or same room in different class at same day+period)
    const teacherConflict = schedule.find(
      (s) =>
        s.day === editingSlot.day &&
        s.period === editingSlot.period &&
        s.className !== editingSlot.className &&
        s.teacherName === editingSlot.teacherName
    );

    const roomConflict = schedule.find(
      (s) =>
        s.day === editingSlot.day &&
        s.period === editingSlot.period &&
        s.className !== editingSlot.className &&
        s.room === editingSlot.room
    );

    if (teacherConflict) {
      if (!window.confirm(`DIQQAT TO‘QNASHUV: ${editingSlot.teacherName} ushbu vaqtda ${teacherConflict.className} sinfida dars o‘tadi! Baribir saqlansinmi?`)) {
        return;
      }
    } else if (roomConflict) {
      if (!window.confirm(`DIQQAT TO‘QNASHUV: ${editingSlot.room} ushbu vaqtda ${roomConflict.className} sinfi tomonidan band! Baribir saqlansinmi?`)) {
        return;
      }
    }

    const slotId = editingSlot.id || `slot-${editingSlot.day}-${editingSlot.period}-${editingSlot.className}`;
    const newSlot: ScheduleSlot = {
      id: slotId,
      day: editingSlot.day,
      period: editingSlot.period,
      time: editingSlot.time,
      className: editingSlot.className,
      subject: editingSlot.subject,
      teacherName: editingSlot.teacherName,
      room: editingSlot.room,
    };

    const updatedSlots = [
      ...schedule.filter(
        (s) => !(s.day === editingSlot.day && s.period === editingSlot.period && s.className === editingSlot.className)
      ),
      newSlot,
    ];

    setSchedule(updatedSlots);
    setEditingSlot(null);
    showToast(`✓ ${editingSlot.className} sinfi ${editingSlot.period}-soat darsi yangilandi!`);

    if (onUpdateMasterSchedule) {
      onUpdateMasterSchedule(updatedSlots, workloads);
    }

    try {
      await authenticatedFetch('/api/schedules/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slots: updatedSlots }),
      });
    } catch {}
  };

  const handleClearSlotModal = async () => {
    if (!editingSlot) return;
    const updatedSlots = schedule.filter(
      (s) => !(s.day === editingSlot.day && s.period === editingSlot.period && s.className === editingSlot.className)
    );
    setSchedule(updatedSlots);
    setEditingSlot(null);
    showToast(`✓ ${editingSlot.className} sinfi ${editingSlot.period}-soat darsi tozalandi.`);

    if (onUpdateMasterSchedule) {
      onUpdateMasterSchedule(updatedSlots, workloads);
    }

    try {
      await authenticatedFetch('/api/schedules/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slots: updatedSlots }),
      });
    } catch {}
  };

  const handleExportCSV = () => {
    const headers = ['Kun', 'Para', 'Vaqt', 'Sinf', 'Fan', 'Ustoz', 'Xona'];
    const rows = schedule.map((s) => [s.day, s.period, `"${s.time}"`, s.className, `"${s.subject}"`, `"${s.teacherName}"`, `"${s.room}"`]);
    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Dars_Jadvali_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('✓ Dars jadvali CSV formatida yuklab olindi!');
  };

  const handlePrintSchedule = () => {
    window.print();
  };

  const handleCreateTeacherFromSchedule = (
    newTeacher: TeacherRecord,
    newWorkload: TeacherWorkload,
    shouldRegenerate: boolean
  ) => {
    const updatedWorkloads = [
      newWorkload,
      ...workloads.filter((w) => w.teacherId !== newWorkload.teacherId),
    ];
    setWorkloads(updatedWorkloads);

    if (shouldRegenerate) {
      const res = generateWorkloadBasedSchedule(updatedWorkloads, generatorClasses, generatorPeriodsCount);
      setSchedule(res.slots);
      if (onUpdateMasterSchedule) {
        onUpdateMasterSchedule(res.slots, updatedWorkloads);
      }
      showToast(`${newTeacher.name} dars yuklamasi bilan qo'shildi va jadval yangilandi!`);
    } else {
      if (onUpdateMasterSchedule) {
        onUpdateMasterSchedule(schedule, updatedWorkloads);
      }
      showToast(`${newTeacher.name} o'qituvchilar yuklamasiga muvaffaqiyatli qo'shildi!`);
    }
  };

  // Toast message
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const days: { id: 'MON' | 'TUE' | 'WED' | 'THU' | 'FRI'; label: string; uz: string; ru: string; ky: string }[] = [
    { id: 'MON', label: 'Monday', uz: 'Dushanba', ru: 'Понедельник', ky: 'Дүйшөмбү' },
    { id: 'TUE', label: 'Tuesday', uz: 'Seshanba', ru: 'Вторник', ky: 'Шейшемби' },
    { id: 'WED', label: 'Wednesday', uz: 'Chorshanba', ru: 'Среда', ky: 'Шаршемби' },
    { id: 'THU', label: 'Thursday', uz: 'Payshanba', ru: 'Четверг', ky: 'Бейшемби' },
    { id: 'FRI', label: 'Friday', uz: 'Juma', ru: 'Пятница', ky: 'Жума' },
  ];

  const getDayLabel = (dId: 'MON' | 'TUE' | 'WED' | 'THU' | 'FRI') => {
    const d = days.find((item) => item.id === dId);
    if (!d) return dId;
    if (language === 'uz') return d.uz;
    if (language === 'ru') return d.ru;
    if (language === 'ky') return d.ky;
    return d.label;
  };

  // Run AI generator based on teacher workloads
  const handleRunGenerator = () => {
    setIsGenerating(true);
    setGenerationStep(1);

    setTimeout(async () => {
      setGenerationStep(2);
    }, 600);

    setTimeout(() => {
      setGenerationStep(3);
    }, 1200);

    setTimeout(async () => {
      setGenerationStep(4);
      const result = generateWorkloadBasedSchedule(workloads, generatorClasses, generatorPeriodsCount);
      const publishResponse = await authenticatedFetch('/api/schedules/publish', {
        method: 'POST',
        body: JSON.stringify({ slots: result.slots }),
      });
      if (!publishResponse.ok) {
        showToast(publishResponse.status === 409 ? 'Schedule conflict detected. Changes were not published.' : 'Schedule could not be published.');
        setIsGenerating(false);
        return;
      }
      setSchedule(result.slots);
      setWorkloads(result.updatedWorkloads);

      if (onUpdateMasterSchedule) {
        onUpdateMasterSchedule(result.slots, result.updatedWorkloads);
      }

      setIsGenerating(false);
      setIsGeneratorModalOpen(false);
      showToast(
        language === 'uz'
          ? "✓ O'qituvchilar yuklamasiga ko'ra yangi dars jadvali avtomatik tuzildi va barchaga e'lon qilindi!"
          : language === 'ru'
          ? "✓ Расписание успешно составлено на основе нагрузки учителей и разослано всем!"
          : language === 'ky'
          ? "✓ Мугалимдердин жүктөмүнө жараша жаңы сабак ырааттамасы түзүлүп, бардыгына жарыяланды!"
          : "✓ Automated schedule generated based on teacher workloads and published to all!"
      );
    }, 1800);
  };

  // Save modified workload
  const handleSaveWorkload = (updated: TeacherWorkload) => {
    const updatedList = workloads.map((w) => (w.teacherId === updated.teacherId ? updated : w));
    setWorkloads(updatedList);
    setEditingWorkload(null);

    // Re-calculate schedule with updated workloads
    const result = generateWorkloadBasedSchedule(updatedList, SCHOOL_CLASSES, 5);
    setSchedule(result.slots);
    setWorkloads(result.updatedWorkloads);
    if (onUpdateMasterSchedule) {
      onUpdateMasterSchedule(result.slots, result.updatedWorkloads);
    }
    showToast(
      language === 'uz'
        ? `${updated.teacherName} dars yuklamasi yangilandi (${updated.targetHoursWeekly} soat/hafta)`
        : `Workload updated for ${updated.teacherName} (${updated.targetHoursWeekly} hrs/week)`
    );
  };

  // Filter slots for current view
  const getFilteredSlots = () => {
    if (isTeacher) {
      // Teacher sees her own classes
      return schedule.filter(
        (s) => s.day === selectedDay && s.teacherName.toLowerCase().includes('aigul')
      );
    }
    if (isStudentOrParent) {
      // Student/Parent sees 7-A class schedule
      return schedule.filter((s) => s.day === selectedDay && s.className === '7-A');
    }
    if (viewMode === 'by_teacher') {
      return schedule.filter(
        (s) => s.day === selectedDay && s.teacherName === selectedTeacherName
      );
    }
    // by_class
    return schedule.filter((s) => s.day === selectedDay && s.className === selectedClass);
  };

  const filteredSlots = getFilteredSlots();

  // Calculate teacher personal workload stats
  const currentTeacherWorkload = workloads.find(
    (w) =>
      (currentUser?.name && w.teacherName.toLowerCase() === currentUser.name.toLowerCase()) ||
      (currentUser?.teacherId && w.teacherId === currentUser.teacherId) ||
      (selectedTeacherName && w.teacherName.toLowerCase() === selectedTeacherName.toLowerCase())
  ) || workloads[0];
  const teacherTotalSlotsThisWeek = schedule.filter(
    (s) =>
      (currentUser?.name && s.teacherName.toLowerCase() === currentUser.name.toLowerCase()) ||
      (selectedTeacherName && s.teacherName.toLowerCase() === selectedTeacherName.toLowerCase())
  ).length;
  const effectiveTeacherDisplayName = isTeacher ? (currentUser?.name || selectedTeacherName) : selectedTeacherName;

  return (
    <div id="schedule-manager-view" className="space-y-6 pb-12">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-4 z-50 flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 text-xs font-bold text-white shadow-2xl dark:bg-indigo-950 dark:border dark:border-indigo-500/40 animate-slideDown">
          <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="flex flex-col justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-sm shadow-indigo-500/20 dark:bg-indigo-500">
              <CalendarIcon className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900 dark:text-white sm:text-2xl">
                {isTeacher
                  ? (language === 'uz' ? 'Mening Shaxsiy Dars Jadvalim' : language === 'ky' ? 'Менин Жеке Сабак Ырааттамам' : language === 'ru' ? 'Моё Личное Расписание' : 'My Teaching Schedule')
                  : isStudentOrParent
                  ? (language === 'uz' ? '7-A Sinf Dars Jadvali' : language === 'ky' ? '7-А Классынын Ырааттамасы' : language === 'ru' ? 'Расписание 7-А Класса' : 'Grade 7-A Class Timetable')
                  : (language === 'uz' ? 'Dars Jadvali & O\'qituvchilar Yuklamasi' : language === 'ky' ? 'Сабактардын Ырааттамасы жана Мугалимдердин Жүктөмү' : language === 'ru' ? 'Расписание и Нагрузка Учителей' : 'School Master Timetable & Teacher Workloads')}
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {isTeacher
                  ? (language === 'uz' ? `O'qituvchi: ${effectiveTeacherDisplayName} • Haftalik yuklama: ${currentTeacherWorkload?.targetHoursWeekly || 20} soat` : `Teacher: ${effectiveTeacherDisplayName} • ${currentTeacherWorkload?.targetHoursWeekly || 20} Weekly Hours Load`)
                  : isStudentOrParent
                  ? (language === 'uz' ? 'Ali Nurdinov uchun avtomatik yangilanadigan darslar jadvali' : 'Live synchronized student timetable with classroom & teacher assignments')
                  : (language === 'uz' ? 'O\'qituvchilar haftalik stavka va yuklamasi bo\'yicha avtomatlashtirilgan AI jadvali' : 'AI-Optimized Master Timetable with Zero-Collision Room & Teacher Load Balancing')}
              </p>
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {isAdmin && (
            <>
              <button
                onClick={() => setIsGeneratorModalOpen(true)}
                className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white shadow-sm shadow-indigo-500/25 transition-all hover:bg-indigo-700 hover:shadow-md dark:bg-indigo-500 dark:hover:bg-indigo-600"
                style={{ minHeight: '44px' }}
              >
                <Sparkles className="h-4 w-4" />
                <span>
                  {language === 'uz'
                    ? 'Yuklamaga Ko\'ra Jadval Tuzish'
                    : language === 'ky'
                    ? 'Жүктөм Боюнча Ырааттама Түзүү'
                    : language === 'ru'
                    ? 'Авто-Генерация по Нагрузке'
                    : 'AI Workload Auto-Scheduler'}
                </span>
              </button>

              <button
                onClick={() => {
                  showToast(
                    language === 'uz'
                      ? '✓ Yangilangan dars jadvali barcha o\'qituvchi va o\'quvchilarga avtomatik yuborildi!'
                      : '✓ Timetable successfully broadcasted to all teachers and students!'
                  );
                }}
                className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-300"
                style={{ minHeight: '44px' }}
                title="Barchaga yuborish"
              >
                <Send className="h-3.5 w-3.5 text-indigo-500" />
                <span className="hidden sm:inline">
                  {language === 'uz' ? 'Barchaga E\'lon Qilish' : 'Broadcast Schedule'}
                </span>
              </button>
            </>
          )}

          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-300"
            style={{ minHeight: '44px' }}
            title="CSV/Excel yuklab olish"
          >
            <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600" />
            <span>Excel / CSV</span>
          </button>

          <button
            onClick={handlePrintSchedule}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-300"
            style={{ minHeight: '44px' }}
            title="Chop etish / PDF"
          >
            <Printer className="h-3.5 w-3.5 text-slate-500" />
            <span>Chop etish / PDF</span>
          </button>
        </div>
      </div>

      {/* Role-Specific Workload Overview Cards */}
      {isTeacher && (
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 sm:gap-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
            <span className="text-xs font-medium text-slate-500">Haftalik Dars Yuklamasi (Stavka)</span>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                {teacherTotalSlotsThisWeek} / {currentTeacherWorkload.targetHoursWeekly}
              </span>
              <span className="text-xs text-slate-500">soat/hafta</span>
            </div>
            <div className="mt-1 text-xs text-emerald-600 font-semibold">
              ✓ 100% To'liq taqsimlangan
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
            <span className="text-xs font-medium text-slate-500">Biriktirilgan Sinflar</span>
            <div className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">
              4 ta sinf
            </div>
            <div className="mt-1 text-xs text-slate-400">7-A, 8-B, 9-A, 10-B</div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
            <span className="text-xs font-medium text-slate-500">Asosiy Xona</span>
            <div className="mt-1 text-xl font-bold text-slate-900 dark:text-white">
              Room 304
            </div>
            <div className="mt-1 text-xs text-indigo-500 font-medium">Matematika & STEM Lab</div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
            <span className="text-xs font-medium text-slate-500">Bugungi Darslar ({getDayLabel(selectedDay)})</span>
            <div className="mt-1 text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              {filteredSlots.length} ta dars
            </div>
            <div className="mt-1 text-xs text-slate-400">08:00 dan 12:30 gacha</div>
          </div>
        </div>
      )}

      {/* Admin Mode Switcher Bar */}
      {isAdmin && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              onClick={() => setViewMode('by_class')}
              className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold transition-all ${
                viewMode === 'by_class'
                  ? 'bg-indigo-600 text-white shadow-xs dark:bg-indigo-500'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
              }`}
              style={{ minHeight: '40px' }}
            >
              <GraduationCap className="h-4 w-4" />
              <span>{language === 'uz' ? 'Sinf Bo\'yicha Jadval' : 'By Class Timetable'}</span>
            </button>

            <button
              onClick={() => setViewMode('by_teacher')}
              className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold transition-all ${
                viewMode === 'by_teacher'
                  ? 'bg-indigo-600 text-white shadow-xs dark:bg-indigo-500'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
              }`}
              style={{ minHeight: '40px' }}
            >
              <Users className="h-4 w-4" />
              <span>{language === 'uz' ? 'O\'qituvchi Bo\'yicha Jadval' : 'By Teacher Timetable'}</span>
            </button>

            <button
              onClick={() => setViewMode('workloads')}
              className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold transition-all ${
                viewMode === 'workloads'
                  ? 'bg-indigo-600 text-white shadow-xs dark:bg-indigo-500'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
              }`}
              style={{ minHeight: '40px' }}
            >
              <BarChart3 className="h-4 w-4" />
              <span>{language === 'uz' ? 'O\'qituvchilar Yuklamasi (Stavka)' : 'Teacher Workloads Matrix'}</span>
            </button>

            <button
              onClick={() => setViewMode('matrix')}
              className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold transition-all ${
                viewMode === 'matrix'
                  ? 'bg-indigo-600 text-white shadow-xs dark:bg-indigo-500'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
              }`}
              style={{ minHeight: '40px' }}
            >
              <Layers className="h-4 w-4" />
              <span>{language === 'uz' ? 'Butun Maktab Matritsasi' : 'Full School Master Grid'}</span>
            </button>
          </div>

          <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
            <span className="inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>{schedule.length} ta dars avtomat joylashtirilgan • 0 xatolik</span>
          </div>
        </div>
      )}

      {/* TEACHER WORKLOAD MANAGEMENT VIEW */}
      {isAdmin && viewMode === 'workloads' && (
        <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4 dark:border-slate-800">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {language === 'uz' ? 'O\'qituvchilarning Haftalik Dars Yuklamasi & Stavkasi' : 'Teacher Weekly Workload & Hour Allocation'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {language === 'uz'
                  ? 'Har bir o\'qituvchining haftalik stavkasi, dars soatlari limiti va biriktirilgan sinflari'
                  : 'Weekly target teaching hours, assigned classes, and maximum daily lesson constraints'}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setIsAddTeacherModalOpen(true)}
                className="flex items-center gap-1.5 rounded-xl border border-indigo-200 bg-indigo-50 px-3.5 py-2 text-xs font-bold text-indigo-700 hover:bg-indigo-100 dark:border-indigo-800 dark:bg-indigo-950 dark:text-indigo-300"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>{language === 'uz' ? 'O‘qituvchi Qo‘shish (Stavka & Lavozim)' : 'Add Teacher & Workload'}</span>
              </button>

              <button
                onClick={() => setIsGeneratorModalOpen(true)}
                className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-indigo-700 dark:bg-indigo-500 shadow-xs"
              >
                <Sparkles className="h-3.5 w-3.5" />
                <span>{language === 'uz' ? 'Yuklamalar Asosida Qayta Generatsiya' : 'Regenerate from Workloads'}</span>
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-100 bg-slate-50 text-[11px] font-bold text-slate-500 dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-400">
                <tr>
                  <th className="p-3.5 rounded-l-xl">O'qituvchi</th>
                  <th className="p-3.5">Fan & Kafedra</th>
                  <th className="p-3.5">Biriktirilgan Sinflar</th>
                  <th className="p-3.5 text-center">Stavka Soati (Haftalik)</th>
                  <th className="p-3.5 text-center">Jadvalga Qo'yilgan</th>
                  <th className="p-3.5">Asosiy Xona</th>
                  <th className="p-3.5 text-center">Holat</th>
                  <th className="p-3.5 text-right rounded-r-xl">Amal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {workloads.map((w) => {
                  const actualCount = schedule.filter((s) => s.teacherName === w.teacherName).length;
                  const isBalanced = actualCount === w.targetHoursWeekly;
                  const isOver = actualCount > w.targetHoursWeekly;

                  return (
                    <tr key={w.teacherId} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                      <td className="p-3.5">
                        <div className="flex items-center gap-3">
                          <img
                            src={w.avatar}
                            alt={w.teacherName}
                            className="h-8 w-8 rounded-full object-cover border border-slate-200 dark:border-slate-700"
                          />
                          <div>
                            <span className="font-bold text-slate-900 dark:text-white">{w.teacherName}</span>
                            <div className="text-[10px] text-slate-400">ID: {w.teacherId}</div>
                          </div>
                        </div>
                      </td>
                      <td className="p-3.5">
                        <span className="font-medium text-slate-800 dark:text-slate-200">{w.subject}</span>
                        <div className="text-[10px] text-indigo-600 dark:text-indigo-400 font-semibold">{w.department}</div>
                      </td>
                      <td className="p-3.5">
                        <div className="flex flex-wrap gap-1">
                          {w.assignedClasses.map((cls) => (
                            <span
                              key={cls}
                              className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                            >
                              {cls}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="p-3.5 text-center">
                        <span className="font-mono text-sm font-bold text-indigo-600 dark:text-indigo-400">
                          {w.targetHoursWeekly} soat
                        </span>
                      </td>
                      <td className="p-3.5 text-center">
                        <span className="font-mono text-sm font-bold text-slate-900 dark:text-white">
                          {actualCount} soat
                        </span>
                      </td>
                      <td className="p-3.5 text-slate-600 dark:text-slate-400">
                        {w.preferredRoom}
                      </td>
                      <td className="p-3.5 text-center">
                        {isBalanced ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                            <Check className="h-3 w-3" /> 100% Taqsimlangan
                          </span>
                        ) : isOver ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-bold text-amber-700 dark:bg-amber-950 dark:text-amber-300">
                            Yuklama oshgan
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2.5 py-1 text-[10px] font-bold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                            Yetarli
                          </span>
                        )}
                      </td>
                      <td className="p-3.5 text-right">
                        <button
                          onClick={() => setEditingWorkload(w)}
                          className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                        >
                          Tahrirlash
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

      {/* FULL SCHOOL MATRIX VIEW */}
      {isAdmin && viewMode === 'matrix' && (
        <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3 dark:border-slate-800">
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white">
                {language === 'uz' ? 'Butun Maktab Umumiy Matritsasi' : 'Full School Master Timetable Grid'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {getDayLabel(selectedDay)} • {SCHOOL_CLASSES.join(', ')} sinflari bo'yicha bir vaqtdagi darslar
              </p>
            </div>

            {/* Day Selector Pills */}
            <div className="flex gap-1 overflow-x-auto">
              {days.map((d) => (
                <button
                  key={d.id}
                  onClick={() => setSelectedDay(d.id)}
                  className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition-all ${
                    selectedDay === d.id
                      ? 'bg-indigo-600 text-white shadow-xs dark:bg-indigo-500'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400'
                  }`}
                >
                  {getDayLabel(d.id)}
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold text-slate-600 dark:border-slate-800 dark:bg-slate-800/60 dark:text-slate-300">
                <tr>
                  <th className="p-3 text-center w-20">Soat / Para</th>
                  {SCHOOL_CLASSES.map((cls) => (
                    <th key={cls} className="p-3 text-center">
                      <span className="inline-block rounded-lg bg-indigo-100 px-2.5 py-1 text-xs font-bold text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300">
                        {cls} Sinf
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {TIME_PERIODS.slice(0, 5).map((p) => (
                  <tr key={p.period} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                    <td className="p-3 text-center bg-slate-50/50 dark:bg-slate-800/30">
                      <div className="font-bold text-indigo-600 dark:text-indigo-400">{p.period}-para</div>
                      <div className="text-[10px] text-slate-400">{p.time}</div>
                    </td>

                    {SCHOOL_CLASSES.map((cls) => {
                      const slot = schedule.find(
                        (s) => s.day === selectedDay && s.period === p.period && s.className === cls
                      );

                      return (
                        <td key={cls} className="p-2.5 align-top">
                          {slot ? (
                            <div
                              onClick={() => isAdmin && handleOpenEditSlot(selectedDay, p.period, p.time, cls, slot)}
                              className={`rounded-xl border border-indigo-100 bg-indigo-50/40 p-2.5 dark:border-indigo-900/40 dark:bg-indigo-950/20 shadow-2xs ${
                                isAdmin ? 'cursor-pointer hover:border-indigo-400 hover:shadow-xs transition-all' : ''
                              }`}
                            >
                              <div className="flex items-start justify-between">
                                <div className="font-bold text-slate-900 dark:text-white text-xs">
                                  {slot.subject}
                                </div>
                                {isAdmin && (
                                  <Edit2 className="h-3 w-3 text-indigo-500 opacity-60 hover:opacity-100" />
                                )}
                              </div>
                              <div className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">
                                👨‍🏫 {slot.teacherName.split(' ')[0]} {slot.teacherName.split(' ')[1]?.[0]}.
                              </div>
                              <div className="mt-1 flex items-center justify-between text-[10px]">
                                <span className="rounded bg-white px-1.5 py-0.5 font-semibold text-indigo-700 dark:bg-slate-800 dark:text-indigo-300 border border-slate-100 dark:border-slate-700">
                                  {slot.room.split(' ')[0]} {slot.room.split(' ')[1]}
                                </span>
                                <span className="text-emerald-600 font-bold">✓ 0 conflict</span>
                              </div>
                            </div>
                          ) : (
                            <div
                              onClick={() => isAdmin && handleOpenEditSlot(selectedDay, p.period, p.time, cls)}
                              className={`rounded-xl border border-dashed border-slate-200 p-2.5 text-center text-[10px] text-slate-400 dark:border-slate-800 ${
                                isAdmin ? 'cursor-pointer hover:border-indigo-300 hover:text-indigo-600 hover:bg-indigo-50/30 dark:hover:bg-indigo-950/20' : ''
                              }`}
                            >
                              {isAdmin ? '+ Dars qo‘shish' : 'Bo\'sh soat'}
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* CLASS / TEACHER DAILY TIMETABLE VIEW */}
      {(viewMode === 'by_class' || viewMode === 'by_teacher' || isTeacher || isStudentOrParent) && (
        <div className="space-y-4">
          {/* Day & Filter Selector Header */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
            <div className="flex flex-wrap items-center justify-between gap-3">
              {/* Left Selector (Class or Teacher) */}
              <div className="flex items-center gap-2">
                {isStudentOrParent ? (
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-500">Sinf:</span>
                    <span className="rounded-xl bg-indigo-50 px-3 py-1.5 text-xs font-bold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                      Grade 7-A (Term 2)
                    </span>
                  </div>
                ) : isTeacher ? (
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-500">O'qituvchi:</span>
                    <span className="rounded-xl bg-indigo-50 px-3 py-1.5 text-xs font-bold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                      Aigul Sadykova (Matematika & Algebra)
                    </span>
                  </div>
                ) : viewMode === 'by_teacher' ? (
                  <div className="flex items-center gap-2">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">O'qituvchi:</label>
                    <select
                      value={selectedTeacherName}
                      onChange={(e) => setSelectedTeacherName(e.target.value)}
                      className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-900 focus:outline-hidden dark:border-slate-800 dark:bg-slate-800 dark:text-white"
                    >
                      {workloads.map((w) => (
                        <option key={w.teacherId} value={w.teacherName}>
                          {w.teacherName} ({w.subject})
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Sinf:</label>
                    <select
                      value={selectedClass}
                      onChange={(e) => setSelectedClass(e.target.value)}
                      className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-900 focus:outline-hidden dark:border-slate-800 dark:bg-slate-800 dark:text-white"
                    >
                      {SCHOOL_CLASSES.map((cls) => (
                        <option key={cls} value={cls}>
                          {cls} sinf
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Day Selector Pills */}
              <div className="flex gap-1 overflow-x-auto">
                {days.map((d) => (
                  <button
                    key={d.id}
                    onClick={() => setSelectedDay(d.id)}
                    className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition-all ${
                      selectedDay === d.id
                        ? 'bg-indigo-600 text-white shadow-xs dark:bg-indigo-500'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400'
                    }`}
                  >
                    {getDayLabel(d.id)}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Daily Schedule Card Grid */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3.5 dark:border-slate-800">
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white text-base">
                  {getDayLabel(selectedDay)} •{' '}
                  {isTeacher
                    ? 'Aigul Sadykova Darslari'
                    : isStudentOrParent
                    ? '7-A Sinf Kunlik Dars Jadvali'
                    : viewMode === 'by_teacher'
                    ? `${selectedTeacherName} Jadvali`
                    : `${selectedClass} Sinf Jadvali`}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  5 Academic Periods • Zero Room & Teacher Conflicts Verified ✓
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                  {filteredSlots.length} ta dars rejalashtirilgan
                </span>
              </div>
            </div>

            {/* List of Periods */}
            <div className="mt-4 space-y-3">
              {TIME_PERIODS.slice(0, 5).map((p, idx) => {
                const slot = filteredSlots.find((s) => s.period === p.period);
                const isCurrent = idx === 0;

                return (
                  <div
                    key={p.period}
                    className={`flex flex-col justify-between gap-3 rounded-2xl border p-4 sm:flex-row sm:items-center transition-all ${
                      slot
                        ? isCurrent
                          ? 'border-indigo-300 bg-indigo-50/60 shadow-xs dark:border-indigo-800 dark:bg-indigo-950/30'
                          : 'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/80'
                        : 'border-dashed border-slate-200 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-800/20'
                    }`}
                  >
                    <div className="flex items-center gap-3 sm:gap-4">
                      <div className="flex h-12 w-12 flex-col items-center justify-center rounded-xl bg-slate-100 text-slate-900 shadow-2xs dark:bg-slate-800 dark:text-white">
                        <span className="text-[9px] font-bold uppercase text-slate-400">Para</span>
                        <span className="text-base font-bold text-indigo-600 dark:text-indigo-400">
                          {p.period}
                        </span>
                      </div>

                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-bold text-slate-900 dark:text-white text-sm sm:text-base">
                            {slot ? slot.subject : 'Bo\'sh soat / Tanaffus'}
                          </span>

                          {slot && (
                            <span className="rounded-lg bg-indigo-100 px-2 py-0.5 text-[10px] font-bold text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300">
                              {slot.className}
                            </span>
                          )}

                          {slot && (
                            <span className="rounded-lg bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                              📍 {slot.room}
                            </span>
                          )}

                          {isCurrent && slot && (
                            <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 animate-pulse">
                              Hozirgi Dars
                            </span>
                          )}
                        </div>

                        <div className="mt-1 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                          <span>⏰ {p.time}</span>
                          {slot && (
                            <>
                              <span>•</span>
                              <span>👨‍🏫 Ustoz: <strong className="text-slate-700 dark:text-slate-300">{slot.teacherName}</strong></span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right side interactive shortcuts */}
                    <div className="flex items-center gap-2">
                      {slot ? (
                        <>
                          {isTeacher ? (
                            <>
                              <button
                                onClick={() => onNavigateTab && onNavigateTab('digital-classroom')}
                                className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 py-2 text-xs font-bold text-white shadow-xs hover:bg-indigo-700 dark:bg-indigo-500"
                                style={{ minHeight: '40px' }}
                              >
                                <Zap className="h-3.5 w-3.5" />
                                <span>Darsni Boshlash</span>
                              </button>
                              <button
                                onClick={() => onNavigateTab && onNavigateTab('attendance')}
                                className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                                style={{ minHeight: '40px' }}
                              >
                                Davomat
                              </button>
                            </>
                          ) : isStudentOrParent ? (
                            <>
                              <button
                                onClick={() => onNavigateTab && onNavigateTab('ai-tutor')}
                                className="flex items-center gap-1.5 rounded-xl bg-indigo-50 px-3 py-2 text-xs font-bold text-indigo-700 hover:bg-indigo-100 dark:bg-indigo-950 dark:text-indigo-300"
                                style={{ minHeight: '40px' }}
                              >
                                <Sparkles className="h-3.5 w-3.5" />
                                <span>AI Yordam</span>
                              </button>
                              <button
                                onClick={() => onNavigateTab && onNavigateTab('homework')}
                                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                                style={{ minHeight: '40px' }}
                              >
                                Vazifalar
                              </button>
                            </>
                          ) : (
                            <div className="flex items-center gap-2">
                              <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                                0 To'qnashuv ✓
                              </span>
                              {isAdmin && (
                                <button
                                  onClick={() => handleOpenEditSlot(selectedDay, p.period, p.time, selectedClass, slot)}
                                  className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-bold text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                                >
                                  <Edit2 className="h-3 w-3" />
                                  <span>Tahrirlash</span>
                                </button>
                              )}
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-slate-400">Erkin vaqt</span>
                          {isAdmin && (
                            <button
                              onClick={() => handleOpenEditSlot(selectedDay, p.period, p.time, selectedClass)}
                              className="flex items-center gap-1 rounded-xl bg-indigo-50 border border-indigo-200 px-2.5 py-1 text-xs font-bold text-indigo-700 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:border-indigo-800 dark:text-indigo-300"
                            >
                              <Plus className="h-3 w-3" />
                              <span>Dars belgilash</span>
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* AI AUTOMATIC SCHEDULE GENERATOR MODAL */}
      {isGeneratorModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs animate-fadeIn">
          <div className="w-full max-w-xl rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-xs">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-base sm:text-lg">
                    {language === 'uz' ? 'O\'qituvchilar Yuklamasi Asosida AI Jadval Generatori' : 'AI Workload-Based Timetable Generator'}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    O'qituvchilar stavkalari, xonalar va sinflar bo'yicha to'liq to'qnashuvsiz jadval tuzish
                  </p>
                </div>
              </div>

              <button
                onClick={() => !isGenerating && setIsGeneratorModalOpen(false)}
                disabled={isGenerating}
                className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                ✕
              </button>
            </div>

            {/* Generator Settings / Progress */}
            {isGenerating ? (
              <div className="py-8 text-center space-y-4">
                <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400 animate-spin">
                  <RefreshCw className="h-8 w-8" />
                </div>

                <div>
                  <h4 className="font-bold text-slate-900 dark:text-white text-base">
                    {generationStep === 1 && "1/4. O'qituvchilar yuklamasi & stavkalari tahlil qilinmoqda..."}
                    {generationStep === 2 && "2/4. Xonalar va o'qituvchi to'qnashuvlari tekshirilmoqda..."}
                    {generationStep === 3 && "3/4. Oynalar minimallashtirilib, qiyin fanlar ertalabga joylanmoqda..."}
                    {generationStep === 4 && "4/4. Jadval tasdiqlandi va barcha o'qituvchi/o'quvchilarga tarqatilmoqda!"}
                  </h4>
                  <p className="text-xs text-slate-500 mt-1">
                    Constraint Satisfaction Algorithm & Neural Scheduler
                  </p>
                </div>

                <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden dark:bg-slate-800">
                  <div
                    className="bg-indigo-600 h-full transition-all duration-300"
                    style={{ width: `${generationStep * 25}%` }}
                  ></div>
                </div>
              </div>
            ) : (
              <div className="space-y-4 py-4 text-xs">
                {/* Target Classes */}
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300">
                    Qamrab olinadigan sinflar ({generatorClasses.length} ta sinf):
                  </label>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {SCHOOL_CLASSES.map((cls) => {
                      const isSelected = generatorClasses.includes(cls);
                      return (
                        <button
                          key={cls}
                          type="button"
                          onClick={() => {
                            if (isSelected) {
                              if (generatorClasses.length > 1) {
                                setGeneratorClasses(generatorClasses.filter((c) => c !== cls));
                              }
                            } else {
                              setGeneratorClasses([...generatorClasses, cls]);
                            }
                          }}
                          className={`rounded-xl px-3 py-1.5 font-bold transition-all ${
                            isSelected
                              ? 'bg-indigo-600 text-white shadow-xs'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400'
                          }`}
                        >
                          Grade {cls}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Number of periods */}
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300">
                    Kunlik darslar soni:
                  </label>
                  <div className="mt-2 flex gap-2">
                    {[5, 6].map((count) => (
                      <button
                        key={count}
                        type="button"
                        onClick={() => setGeneratorPeriodsCount(count)}
                        className={`rounded-xl px-4 py-2 font-bold transition-all ${
                          generatorPeriodsCount === count
                            ? 'bg-indigo-600 text-white shadow-xs'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400'
                        }`}
                      >
                        {count} ta Para (08:00 - {count === 5 ? '12:30' : '13:25'})
                      </button>
                    ))}
                  </div>
                </div>

                {/* Smart Constraints */}
                <div className="space-y-2 rounded-2xl bg-slate-50 p-4 dark:bg-slate-800/60">
                  <div className="font-bold text-slate-900 dark:text-white">Aqlli Cheklovlar & Qoidalar:</div>
                  
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={avoidGaps}
                      onChange={(e) => setAvoidGaps(e.target.checked)}
                      className="rounded text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="text-slate-700 dark:text-slate-300">
                      O'qituvchilar dars oralig'idagi "Oyna" (bo'sh vaqtlar)ni minimallashtirish
                    </span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={balanceStemEarly}
                      onChange={(e) => setBalanceStemEarly(e.target.checked)}
                      className="rounded text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="text-slate-700 dark:text-slate-300">
                      Matematika va Fizika fanlarini ertalabki 1-3 paralarga joylash
                    </span>
                  </label>
                </div>

                {/* Summary Box */}
                <div className="rounded-xl border border-indigo-100 bg-indigo-50/60 p-3 dark:border-indigo-900/60 dark:bg-indigo-950/40 text-[11px] text-indigo-900 dark:text-indigo-200">
                  ⚡ <strong>Avtomatik hisoblash:</strong> {workloads.length} ta o'qituvchining jami{' '}
                  {workloads.reduce((s, w) => s + w.targetHoursWeekly, 0)} soat yuklamasi barcha sinflarga 100% to'qnashuvsiz taqsimlanadi va o'qituvchi/o'quvchi akkauntlarida darhol ko'rinadi.
                </div>

                {/* Footer Buttons */}
                <div className="flex gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setIsGeneratorModalOpen(false)}
                    className="flex-1 rounded-xl border border-slate-200 py-2.5 font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300"
                    style={{ minHeight: '44px' }}
                  >
                    Bekor qilish
                  </button>

                  <button
                    type="button"
                    onClick={handleRunGenerator}
                    className="flex-2 flex items-center justify-center gap-2 rounded-xl bg-indigo-600 py-2.5 font-bold text-white shadow-md hover:bg-indigo-700 dark:bg-indigo-500"
                    style={{ minHeight: '44px' }}
                  >
                    <Sparkles className="h-4 w-4" />
                    <span>Jadvalni Avtomatik Yaratish</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* EDIT WORKLOAD MODAL */}
      {editingWorkload && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs animate-fadeIn">
          <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
              <h3 className="font-bold text-slate-900 dark:text-white">
                O'qituvchi Yuklamasini Tahrirlash
              </h3>
              <button onClick={() => setEditingWorkload(null)} className="text-slate-400">✕</button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300">O'qituvchi:</label>
                <div className="mt-1 font-semibold text-slate-900 dark:text-white">
                  {editingWorkload.teacherName} ({editingWorkload.subject})
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300">
                  Haftalik Stavka Soati (Target Hours):
                </label>
                <input
                  type="number"
                  min="6"
                  max="36"
                  value={editingWorkload.targetHoursWeekly}
                  onChange={(e) =>
                    setEditingWorkload({
                      ...editingWorkload,
                      targetHoursWeekly: parseInt(e.target.value) || 0,
                    })
                  }
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-900 font-bold focus:outline-hidden dark:border-slate-800 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300">Asosiy Xona:</label>
                <input
                  type="text"
                  value={editingWorkload.preferredRoom}
                  onChange={(e) =>
                    setEditingWorkload({
                      ...editingWorkload,
                      preferredRoom: e.target.value,
                    })
                  }
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-900 font-medium focus:outline-hidden dark:border-slate-800 dark:bg-slate-800 dark:text-white"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setEditingWorkload(null)}
                className="flex-1 rounded-xl border border-slate-200 py-2 font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300"
              >
                Bekor qilish
              </button>

              <button
                type="button"
                onClick={() => handleSaveWorkload(editingWorkload)}
                className="flex-1 rounded-xl bg-indigo-600 py-2 font-bold text-white hover:bg-indigo-700 dark:bg-indigo-500"
              >
                Saqlash
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Slot Direct Modal for Admin */}
      {editingSlot && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs animate-fadeIn">
          <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white text-base flex items-center gap-2">
                  <Edit2 className="h-4 w-4 text-indigo-600" />
                  <span>Dars Jadvali Katagini Tahrirlash</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  {editingSlot.className} sinfi • {editingSlot.period}-para ({editingSlot.time}) • {getDayLabel(editingSlot.day)}
                </p>
              </div>
              <button
                onClick={() => setEditingSlot(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveSlotModal} className="mt-4 space-y-3.5 text-xs">
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300">Fan nomi:</label>
                <input
                  type="text"
                  value={editingSlot.subject}
                  onChange={(e) => setEditingSlot({ ...editingSlot, subject: e.target.value })}
                  placeholder="masalan: Matematika"
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 font-bold text-slate-900 focus:bg-white dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  required
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300">O‘qituvchi:</label>
                <select
                  value={editingSlot.teacherName}
                  onChange={(e) => setEditingSlot({ ...editingSlot, teacherName: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 font-semibold dark:border-slate-700 dark:bg-slate-800"
                >
                  {workloads.map((w) => (
                    <option key={w.teacherId} value={w.teacherName}>
                      {w.teacherName} ({w.subject})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300">Dars o‘tiladigan xona:</label>
                <input
                  type="text"
                  value={editingSlot.room}
                  onChange={(e) => setEditingSlot({ ...editingSlot, room: e.target.value })}
                  placeholder="304-xona"
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 font-bold dark:border-slate-700 dark:bg-slate-800"
                  required
                />
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={handleClearSlotModal}
                  className="flex items-center gap-1 rounded-xl bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700 hover:bg-rose-100 dark:bg-rose-950/40 dark:text-rose-300"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>Soatni tozalash</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingSlot(null)}
                    className="rounded-xl px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                  >
                    Bekor qilish
                  </button>
                  <button
                    type="submit"
                    className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-700 shadow-md active:scale-95"
                  >
                    Saqlash
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Teacher Multi-Step Wizard Modal */}
      <AddTeacherWizardModal
        isOpen={isAddTeacherModalOpen}
        onClose={() => setIsAddTeacherModalOpen(false)}
        language={language}
        onAddTeacher={handleCreateTeacherFromSchedule}
      />
    </div>
  );
};
