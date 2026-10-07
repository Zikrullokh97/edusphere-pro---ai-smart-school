import React, { useEffect, useMemo, useState } from 'react';
import {
  FolderKanban,
  Plus,
  Search,
  Users,
  GraduationCap,
  DoorOpen,
  Clock,
  Globe,
  Edit2,
  Trash2,
  Check,
  X,
  AlertCircle,
  BookOpen,
  Phone,
  UserCheck,
  Award,
  ExternalLink,
} from 'lucide-react';
import { AppLanguage, ClassGroup, ScheduleSlot, StudentRecord, TeacherRecord, UserProfile, UserRole, WeeklyScheduleDraft } from '../../types';
import { useI18n } from '../../lib/i18n';
import {
  listSchoolData,
  createClassWithSchedule,
  updateSchoolData,
  archiveSchoolData,
  setHomeroomTeacher,
} from '../../lib/schoolRepository';
import {
  validateGradeWorkload,
  validateClassWeeklyWorkload,
  getGradeWorkloadStage,
  KAO_GRADE_WORKLOAD_LIMITS,
} from '../../lib/kyrgyzstanEdu';


interface ClassesDirectoryProps {
  language: AppLanguage;
  teachers?: TeacherRecord[];
  students?: StudentRecord[];
  currentRole?: UserRole;
  currentUser?: UserProfile;
  onNavigateTab?: (tabId: string) => void;
}

export function sortClassesNaturally(classes: ClassGroup[]): ClassGroup[] {
  return [...classes].sort((a, b) => {
    const numA = parseInt(a.name, 10) || 0;
    const numB = parseInt(b.name, 10) || 0;
    if (numA !== numB) return numA - numB;
    return a.name.localeCompare(b.name);
  });
}

export const ClassesDirectory: React.FC<ClassesDirectoryProps> = ({
  language,
  teachers: propTeachers,
  students: propStudents,
  currentRole = 'admin',
  currentUser,
  onNavigateTab,
}) => {
  const t = useI18n(language);
  const [classes, setClasses] = useState<ClassGroup[]>([]);
  const [teachersList, setTeachersList] = useState<TeacherRecord[]>(propTeachers || []);
  const [students, setStudents] = useState<StudentRecord[]>(propStudents || []);
  const [scheduleSlots, setScheduleSlots] = useState<ScheduleSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedShift, setSelectedShift] = useState<string>('ALL');

  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<ClassGroup | null>(null);
  const [viewingClassStudents, setViewingClassStudents] = useState<ClassGroup | null>(null);

  // Form states
  const [classNameInput, setClassNameInput] = useState('');
  const [gradeLevelInput, setGradeLevelInput] = useState(1);
  const [sectionInput, setSectionInput] = useState('A');
  const [roomInput, setRoomInput] = useState('101');
  const [shiftInput, setShiftInput] = useState<'1-smena' | '2-smena'>('1-smena');
  const [weeklyHoursInput, setWeeklyHoursInput] = useState(24);
  const [academicYearInput, setAcademicYearInput] = useState('2026-2027');
  const [subjectInput, setSubjectInput] = useState('Matematika');
  const [weeklySchedule, setWeeklySchedule] = useState<WeeklyScheduleDraft[]>([]);
  const [homeroomTeacherId, setHomeroomTeacherId] = useState('');
  const [classLanguage, setClassLanguage] = useState<'uz' | 'ru' | 'ky'>('uz');
  const [formError, setFormError] = useState<string | null>(null);
  const [isSavingClass, setIsSavingClass] = useState(false);

  const scheduleDays: Array<{ day: ScheduleSlot['day']; label: string }> = [
    { day: 'MON', label: 'Dushanba' },
    { day: 'TUE', label: 'Seshanba' },
    { day: 'WED', label: 'Chorshanba' },
    { day: 'THU', label: 'Payshanba' },
    { day: 'FRI', label: 'Juma' },
    { day: 'SAT', label: 'Shanba' },
  ];

  const loadData = async () => {
    setLoading(true);
    try {
      const [classList, teacherList, studentList, scheduleList] = await Promise.allSettled([
        listSchoolData<ClassGroup>('classes'),
        listSchoolData<TeacherRecord>('teachers'),
        listSchoolData<StudentRecord>('students'),
        listSchoolData<ScheduleSlot>('schedules'),
      ]);

      if (classList.status === 'fulfilled' && classList.value.length > 0) {
        setClasses(sortClassesNaturally(classList.value));
      } else {
        setClasses([]);
      }

      if (teacherList.status === 'fulfilled' && teacherList.value.length > 0) {
        setTeachersList(teacherList.value);
      }

      if (studentList.status === 'fulfilled' && studentList.value.length > 0) {
        setStudents(studentList.value);
      }

      if (scheduleList.status === 'fulfilled') {
        setScheduleSlots(scheduleList.value);
      }
    } catch {
      setClasses([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  // Automatic natural sorting: 1-A, 1-B, 2-A, 7-A, 8-B, 9-A, 10-B, 11-A
  const sortedClasses = useMemo(() => {
    return sortClassesNaturally(classes);
  }, [classes]);

  const filteredClasses = useMemo(() => {
    return sortedClasses.filter((c) => {
      const matchesSearch =
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        (c.homeroomTeacher && c.homeroomTeacher.toLowerCase().includes(search.toLowerCase())) ||
        (c.room && c.room.toLowerCase().includes(search.toLowerCase()));
      const matchesShift = selectedShift === 'ALL' || c.shift === selectedShift;
      return matchesSearch && matchesShift;
    });
  }, [sortedClasses, search, selectedShift]);

  const handleOpenAddModal = () => {
    setFormError(null);
    setClassNameInput('1-A');
    setGradeLevelInput(1);
    setSectionInput('A');
    setRoomInput('101');
    setShiftInput('1-smena');
    setWeeklyHoursInput(24);
    setAcademicYearInput('2026-2027');
    setSubjectInput('Matematika');
    setWeeklySchedule([]);
    setHomeroomTeacherId(currentRole === 'teacher' ? (currentUser?.teacherId || '') : (teachersList[0]?.id || ''));
    setClassLanguage(language === 'ky' ? 'ky' : language === 'ru' ? 'ru' : 'uz');
    setIsAddModalOpen(true);
  };

  const toggleScheduleDay = (day: ScheduleSlot['day']) => {
    setWeeklySchedule((current) => {
      const existing = current.find((entry) => entry.day === day);
      if (existing) return current.filter((entry) => entry.day !== day);
      return [...current, { day, period: 1, startTime: '08:00', endTime: '08:45', room: roomInput || '101' }];
    });
  };

  const updateScheduleDay = (day: ScheduleSlot['day'], patch: Partial<WeeklyScheduleDraft>) => {
    setWeeklySchedule((current) => current.map((entry) => (entry.day === day ? { ...entry, ...patch } : entry)));
  };

  const handleOpenEditModal = (cls: ClassGroup) => {
    setFormError(null);
    setEditingClass(cls);
    setClassNameInput(cls.name);
    const gradeNum = cls.gradeNumber || parseInt(cls.name, 10) || 1;
    setGradeLevelInput(gradeNum);
    setSectionInput(cls.section || cls.name.split('-')[1] || 'A');
    setRoomInput(cls.room || '101');
    setShiftInput((cls.shift as any) || '1-smena');
    const defaultHours = gradeNum <= 4 ? 24 : gradeNum <= 9 ? 30 : 33;
    setWeeklyHoursInput(defaultHours);

    const matchedTeacher =
      (cls.homeroomTeacherId && teachersList.find((tc) => tc.id === cls.homeroomTeacherId)) ||
      teachersList.find((tc) => tc.name === cls.homeroomTeacher || tc.homeroomClass === cls.name);
    setHomeroomTeacherId(matchedTeacher?.id || '');
    setClassLanguage(cls.language === 'ru' || cls.language === 'ky' ? cls.language : 'uz');
  };

  const handleSaveEditClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingClass) return;
    const finalName = classNameInput.trim() || `${gradeLevelInput}-${sectionInput}`;
    if (!finalName) {
      setFormError(t('fieldRequired'));
      return;
    }

    const assignedTeacher = currentRole === 'teacher'
      ? (teachersList.find((teacher) => teacher.id === currentUser?.teacherId) || {
        id: currentUser?.teacherId || '',
        name: currentUser?.name || 'O‘qituvchi',
        phone: currentUser?.phoneNumber || '',
      } as TeacherRecord)
      : teachersList.find((tc) => tc.id === homeroomTeacherId);
    const updatedClass: ClassGroup = {
      ...editingClass,
      name: finalName,
      gradeNumber: gradeLevelInput,
      gradeLevel: gradeLevelInput,
      section: sectionInput,
      room: roomInput || '101',
      shift: shiftInput,
      homeroomTeacher: assignedTeacher?.name || 'Biriktirilmagan',
      homeroomTeacherId: assignedTeacher?.id,
      homeroomTeacherPhone: assignedTeacher?.phone || '',
      language: classLanguage,
    };

    setClasses((prev) => sortClassesNaturally(prev.map((c) => (c.id === editingClass.id ? updatedClass : c))));
    setEditingClass(null);

    // Sync homeroom teacher in local teachers state
    setTeachersList((prev) =>
      prev.map((t) => {
        if (assignedTeacher && t.id === assignedTeacher.id) {
          return { ...t, homeroomClass: finalName, homeroomClassId: editingClass.id };
        }
        if (t.homeroomClass === editingClass.name && t.id !== homeroomTeacherId) {
          return { ...t, homeroomClass: undefined, homeroomClassId: undefined };
        }
        return t;
      })
    );

    try {
      if (homeroomTeacherId) {
        await setHomeroomTeacher(editingClass.id, homeroomTeacherId);
      }
      await updateSchoolData('classes', updatedClass);
    } catch {}
  };

  const handleTransferStudent = async (studentId: string, targetClassName: string) => {
    if (!targetClassName) return;
    const student = students.find((s) => s.id === studentId);
    if (!student || student.grade === targetClassName) return;

    const oldGrade = student.grade;
    const updatedStudent: StudentRecord = { ...student, grade: targetClassName };

    setStudents((prev) => prev.map((s) => (s.id === studentId ? updatedStudent : s)));

    // Update student counts in classes state
    setClasses((prev) =>
      prev.map((c) => {
        if (c.name === oldGrade) {
          return { ...c, studentCount: Math.max(0, (c.studentCount || 1) - 1) };
        }
        if (c.name === targetClassName) {
          return { ...c, studentCount: (c.studentCount || 0) + 1 };
        }
        return c;
      })
    );

    try {
      await updateSchoolData('students', updatedStudent);
    } catch {}
  };

  const handleSaveNewClass = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalName = classNameInput.trim() || `${gradeLevelInput}-${sectionInput}`;
    if (!finalName) {
      setFormError(t('fieldRequired'));
      return;
    }

    if (classes.some((c) => c.name.toLowerCase() === finalName.toLowerCase())) {
      setFormError('Bunday nomli sinf allaqachon mavjud.');
      return;
    }

    if (weeklySchedule.length === 0) {
      setFormError('Kamida bitta hafta kuni va dars vaqti tanlanishi kerak.');
      return;
    }

    const assignedTeacher = currentRole === 'teacher'
      ? (teachersList.find((teacher) => teacher.id === currentUser?.teacherId) || {
        id: currentUser?.teacherId || '',
        name: currentUser?.name || 'O‘qituvchi',
        phone: currentUser?.phoneNumber || '',
      } as TeacherRecord)
      : teachersList.find((teacher) => teacher.id === homeroomTeacherId);
    try {
      setIsSavingClass(true);
      const result = await createClassWithSchedule({
        classData: {
          name: finalName,
          gradeNumber: gradeLevelInput,
          section: sectionInput,
          room: roomInput || '101',
          academicYear: academicYearInput,
          subject: subjectInput.trim(),
          language: classLanguage,
          teacherId: assignedTeacher?.id,
        },
        schedules: weeklySchedule,
      });
      setClasses((current) => sortClassesNaturally([...current, result.class]));
      setScheduleSlots((current) => [...current, ...result.schedules]);
      setIsAddModalOpen(false);
      if (assignedTeacher) {
        setTeachersList((current) =>
          current.map((teacher) => teacher.id === assignedTeacher.id
            ? { ...teacher, assignedClasses: [...new Set([...(teacher.assignedClasses || []), result.class.name])] }
            : teacher)
        );
      }
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Sinf va jadvalni saqlab bo‘lmadi.');
    } finally {
      setIsSavingClass(false);
    }
  };

  const handleDeleteClass = async (classId: string, studentCount = 0) => {
    if (studentCount > 0) {
      if (!window.confirm(`DIQQAT: Ushbu sinfda ${studentCount} nafar o‘quvchi mavjud! O‘chirishdan oldin ularni boshqa sinfga o‘tkazish tavsiya etiladi. Baribir o‘chirilsinmi?`)) {
        return;
      }
    } else {
      if (!window.confirm('Haqiqatan ham ushbu sinfni o‘chirmoqchimisiz?')) return;
    }
    setClasses((prev) => prev.filter((c) => c.id !== classId));
    try {
      await archiveSchoolData('classes', classId);
    } catch {}
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-3xl border border-slate-200/80 bg-white p-5 sm:p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-700 dark:bg-indigo-950/70 dark:text-indigo-300 mb-2">
            <Award className="h-3.5 w-3.5" />
            <span>КАО Базистик окуу планы: 1-4 (22–25с), 5-9 (28–33с), 10-11 (32–34с)</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2.5">
            <FolderKanban className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
            <span>{language === 'ky' ? 'Мектеп Класстары жана Базистик План' : language === 'ru' ? 'Классы Школы и Базисный План' : 'Maktab Sinflari va Bazis Rejasi'}</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {language === 'ky'
              ? 'Бардык класстарды башкаруу, класс жетекчилерин, бөлмөлөрдү жана КАО жумалык сааттарын көзөмөлдөө'
              : 'Управление всеми классами, закрепление классных руководителей и контроль недельной нагрузки КАО'}
          </p>
        </div>

        <button
          onClick={handleOpenAddModal}
          className="flex min-h-[44px] items-center gap-2 rounded-2xl bg-indigo-600 px-5 py-2.5 text-xs font-bold text-white shadow-lg shadow-indigo-600/30 hover:bg-indigo-700 active:scale-95 transition-all"
        >
          <Plus className="h-4 w-4" />
          <span>{language === 'ky' ? '+ Жаңы класс түзүү' : language === 'ru' ? '+ Создать новый класс' : '+ Yangi sinf ochish'}</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('search')}
            className="w-full rounded-2xl border border-slate-200 bg-white pl-10 pr-4 py-2.5 text-xs font-medium text-slate-900 focus:ring-2 focus:ring-indigo-500 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
          />
        </div>

        <select
          value={selectedShift}
          onChange={(e) => setSelectedShift(e.target.value)}
          className="min-h-[42px] rounded-2xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
        >
          <option value="ALL">Barcha smenalar</option>
          <option value="1-smena">1-smena</option>
          <option value="2-smena">2-smena</option>
        </select>
      </div>

      {/* Classes Grid */}
      {filteredClasses.length === 0 ? (
        <div className="rounded-3xl border border-slate-200 bg-white p-12 text-center dark:border-slate-800 dark:bg-slate-900">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400">
            <FolderKanban className="h-7 w-7" />
          </div>
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-200 mt-4">
            {language === 'ky' ? 'Азырынча класстар жок.' : language === 'ru' ? 'Пока нет классов.' : 'Hozircha sinflar mavjud emas.'}
          </h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            {language === 'ky'
              ? 'Биринчи классты түзүп, окуучуларды жана мугалимдерди кошуңуз.'
              : language === 'ru'
              ? 'Создайте первый класс и добавьте в него учеников и учителей.'
              : 'Yangi sinf ochib, o‘quvchilar va sinf rahbarini biriktiring.'}
          </p>
          <button
            onClick={handleOpenAddModal}
            className="mt-5 inline-flex items-center gap-1.5 rounded-2xl bg-indigo-600 px-5 py-2.5 text-xs font-bold text-white shadow-md hover:bg-indigo-700"
          >
            <Plus className="h-4 w-4" />
            <span>{language === 'ky' ? 'Класс түзүү' : language === 'ru' ? 'Создать класс' : 'Sinf ochish'}</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredClasses.map((cls) => {
            const classStudentList = students.filter((s) => s.grade === cls.name);
            const count = classStudentList.length || cls.studentCount || 0;
            const gradeNum = cls.gradeNumber || parseInt(cls.name, 10) || 7;

            // KAO Workload Validation Calculation
            const typicalHours = (cls as any).weeklyHours || (gradeNum <= 4 ? 24 : gradeNum <= 9 ? 30 : 33);
            const workloadAudit = validateClassWeeklyWorkload({
              gradeNumber: gradeNum,
              weeklyHours: typicalHours,
              educationSystem: (cls as any).educationSystem || '11_YEAR',
            });

            const matchedTeacher =
              (cls.homeroomTeacherId && teachersList.find((t) => t.id === cls.homeroomTeacherId)) ||
              teachersList.find((t) => t.name === cls.homeroomTeacher || t.homeroomClass === cls.name);

            const homeroomMaster =
              cls.homeroomTeacher && cls.homeroomTeacher !== 'Biriktirilmagan'
                ? cls.homeroomTeacher
                : matchedTeacher?.name || 'Biriktirilmagan';

            const teacherPhone = cls.homeroomTeacherPhone || matchedTeacher?.phone || '';
            const classSchedule = scheduleSlots
              .filter((slot) => slot.classId === cls.id || (slot.className === cls.name && (!cls.academicYear || slot.academicYear === cls.academicYear)))
              .sort((a, b) => a.day.localeCompare(b.day) || a.period - b.period);

            return (
              <div
                key={cls.id}
                className="group rounded-3xl border border-slate-200/80 bg-white p-5 shadow-xs hover:border-indigo-300 hover:shadow-md transition-all dark:border-slate-800 dark:bg-slate-900 dark:hover:border-indigo-800 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 font-black text-indigo-700 text-lg dark:bg-indigo-950/60 dark:text-indigo-300 shadow-xs">
                        {cls.name}
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-slate-900 dark:text-white">
                          {cls.name} {language === 'ky' ? 'классы' : language === 'ru' ? 'класс' : 'sinfi'}
                        </h3>
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                          <Clock className="h-3 w-3" /> {cls.shift || '1-smena'} • {cls.room || 'Xona-101'}
                        </span>
                      </div>
                    </div>

                    {currentRole === 'admin' && (
                      <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100">
                        <button
                          onClick={() => handleOpenEditModal(cls)}
                          className="flex h-8 w-8 items-center justify-center rounded-xl text-slate-400 hover:bg-indigo-50 hover:text-indigo-600 dark:hover:bg-indigo-950/40 transition-colors"
                          title="Sinfni tahrirlash"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteClass(cls.id, count)}
                          className="flex h-8 w-8 items-center justify-center rounded-xl text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40 transition-colors"
                          title="Sinfni o‘chirish"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* KAO Workload Matrix Badge with Official BUP Citation */}
                  <div className="mt-3 flex flex-wrap items-center gap-1.5">
                    <div
                      className={`inline-flex items-center gap-1.5 rounded-xl px-2.5 py-1 text-[11px] font-bold ${
                        workloadAudit.status === 'VALID'
                          ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300'
                          : workloadAudit.status === 'OVERLOAD'
                          ? 'bg-amber-50 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300'
                          : 'bg-blue-50 text-blue-800 dark:bg-blue-950/50 dark:text-blue-300'
                      }`}
                    >
                      <Award className="h-3.5 w-3.5" />
                      <span>{workloadAudit.message}</span>
                    </div>

                    {workloadAudit.source?.url && (
                      <a
                        href={workloadAudit.source.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 rounded-xl bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 transition-colors"
                        title={`${workloadAudit.normDocument} (${workloadAudit.source.organization})`}
                      >
                        <ExternalLink className="h-2.5 w-2.5" />
                        <span>БУП 2026</span>
                      </a>
                    )}
                  </div>

                  {/* Homeroom Teacher Details Card */}
                  <div className="mt-3.5 rounded-2xl bg-slate-50/80 p-3 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {matchedTeacher?.avatar ? (
                          <img src={matchedTeacher.avatar} alt={homeroomMaster} className="h-7 w-7 rounded-full object-cover" />
                        ) : (
                          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-100 font-bold text-xs text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300">
                            {homeroomMaster.charAt(0)}
                          </div>
                        )}
                        <div>
                          <div className="text-[10px] text-slate-400 font-medium">
                            {language === 'ky' ? 'Класс жетекчиси:' : 'Sinf Rahbari:'}
                          </div>
                          <div className="text-xs font-bold text-slate-900 dark:text-white truncate max-w-[150px]" title={homeroomMaster}>
                            {homeroomMaster}
                          </div>
                        </div>
                      </div>

                      {teacherPhone && (
                        <a
                          href={`tel:${teacherPhone}`}
                          className="flex items-center gap-1 rounded-lg bg-emerald-50 px-2 py-1 text-[10px] font-bold text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:text-emerald-300 transition-colors"
                          title="Qo'ng'iroq qilish"
                        >
                          <Phone className="h-3 w-3" />
                          <span className="hidden sm:inline">{teacherPhone}</span>
                        </a>
                      )}
                    </div>
                  </div>

                  <div className="mt-3 border-t border-slate-100 pt-3 dark:border-slate-800">
                    <div className="mb-1 text-[10px] font-bold uppercase text-slate-400">{cls.subject || 'Fan'} · {cls.academicYear || '2026-2027'}</div>
                    {classSchedule.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {classSchedule.map((slot) => (
                          <span key={slot.id} className="rounded-lg bg-indigo-50 px-2 py-1 text-[10px] font-bold text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300">
                            {scheduleDays.find((item) => item.day === slot.day)?.label || slot.day} · {slot.period}-para · {slot.time}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-[10px] font-semibold text-slate-400">Haftalik jadval kiritilmagan</span>
                    )}
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2 text-xs">
                  <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
                    <span className="flex items-center gap-1.5 text-slate-400">
                      <Users className="h-3.5 w-3.5" /> Jami o‘quvchilar:
                    </span>
                    <span className="font-bold text-indigo-600 dark:text-indigo-400">{count} nafar</span>
                  </div>

                  <button
                    onClick={() => setViewingClassStudents(cls)}
                    className="w-full rounded-2xl bg-indigo-50 py-2.5 text-xs font-bold text-indigo-600 hover:bg-indigo-100 hover:text-indigo-700 active:scale-98 transition-all dark:bg-slate-800/80 dark:text-indigo-400 dark:hover:bg-slate-800"
                  >
                    O‘quvchilar ro‘yxati ({count})
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Class Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl dark:bg-slate-900 border border-slate-100 dark:border-slate-800 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
              <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                <FolderKanban className="h-5 w-5 text-indigo-600" />
                <span>{language === 'ky' ? 'Жаңы класс кошуу (КАО)' : 'Yangi sinf ochish (KAO)'}</span>
              </h3>
              <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                ✕
              </button>
            </div>

            {formError && (
              <div className="mt-3 rounded-xl bg-rose-50 p-3 text-xs font-bold text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">
                {formError}
              </div>
            )}

            <form onSubmit={handleSaveNewClass} className="mt-4 space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300">Sinf raqami (1–11)</label>
                  <input
                    type="number"
                    min={1}
                    max={11}
                    value={gradeLevelInput}
                    onChange={(e) => {
                      const num = Number(e.target.value);
                      setGradeLevelInput(num);
                      setClassNameInput(`${num}-${sectionInput}`);
                    }}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 font-bold focus:bg-white focus:ring-2 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300">Parallel harfi</label>
                  <select
                    value={sectionInput}
                    onChange={(e) => {
                      setSectionInput(e.target.value);
                      setClassNameInput(`${gradeLevelInput}-${e.target.value}`);
                    }}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 font-bold focus:bg-white focus:ring-2 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800"
                  >
                    {['A', 'B', 'V', 'G', 'D', 'E'].map((letter) => (
                      <option key={letter} value={letter}>{letter}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* KAO Workload Info Note */}
              <div className="rounded-xl bg-indigo-50/70 p-2.5 text-[11px] font-semibold text-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-300">
                КАО Мамлекеттик стандарты: {gradeLevelInput <= 4 ? '1–4-класстар (Башталгыч) — 22–25 жумалык саат' : gradeLevelInput <= 9 ? '5–9-класстар (Негизги) — 28–33 жумалык саат' : '10–11-класстар (Жогорку) — 32–34 жумалык саат'}
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300">Sinf nomi</label>
                <input
                  type="text"
                  value={classNameInput}
                  onChange={(e) => setClassNameInput(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300">O‘quv yili</label>
                  <input
                    type="text"
                    value={academicYearInput}
                    onChange={(e) => setAcademicYearInput(e.target.value)}
                    placeholder="2026-2027"
                    pattern="20[0-9]{2}[-/]20[0-9]{2}"
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    required
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300">Fan</label>
                  <input
                    type="text"
                    value={subjectInput}
                    onChange={(e) => setSubjectInput(e.target.value)}
                    placeholder="Matematika"
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300">Sinf rahbari (O‘qituvchi)</label>
                <select
                  value={homeroomTeacherId}
                  onChange={(e) => setHomeroomTeacherId(e.target.value)}
                  disabled={currentRole === 'teacher'}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 font-semibold dark:border-slate-700 dark:bg-slate-800"
                >
                  {currentRole !== 'teacher' && <option value="">Tanlanmagan / Biriktirilmagan</option>}
                  {teachersList.map((tc) => (
                    <option key={tc.id} value={tc.id}>
                      {tc.name} ({tc.subject || 'O‘qituvchi'}) {tc.phone ? `— ${tc.phone}` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300">Xona</label>
                  <input
                    type="text"
                    value={roomInput}
                    onChange={(e) => setRoomInput(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 font-bold dark:border-slate-700 dark:bg-slate-800"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300">Smena</label>
                  <select
                    value={shiftInput}
                    onChange={(e) => setShiftInput(e.target.value as any)}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 font-semibold dark:border-slate-700 dark:bg-slate-800"
                  >
                    <option value="1-smena">1-smena</option>
                    <option value="2-smena">2-smena</option>
                  </select>
                </div>
              </div>

              <div className="border-t border-slate-100 pt-4 dark:border-slate-800">
                <div className="mb-3 flex items-center gap-2">
                  <Clock className="h-4 w-4 text-indigo-600" />
                  <h4 className="font-bold text-slate-900 dark:text-white">Haftalik dars jadvali</h4>
                </div>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {scheduleDays.map(({ day, label }) => {
                    const isSelected = weeklySchedule.some((entry) => entry.day === day);
                    return (
                      <label key={day} className={`flex min-h-10 cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-xs font-bold transition-colors ${isSelected ? 'border-indigo-500 bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300' : 'border-slate-200 text-slate-600 dark:border-slate-700 dark:text-slate-300'}`}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleScheduleDay(day)}
                          className="h-4 w-4 accent-indigo-600"
                        />
                        {label}
                      </label>
                    );
                  })}
                </div>

                {weeklySchedule.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {weeklySchedule.map((entry) => {
                      const label = scheduleDays.find((item) => item.day === entry.day)?.label || entry.day;
                      return (
                        <div key={entry.day} className="grid grid-cols-[minmax(84px,1fr)_72px_1fr_1fr_minmax(84px,1fr)] items-end gap-2 rounded-xl border border-slate-200 bg-slate-50 p-2.5 dark:border-slate-700 dark:bg-slate-800">
                          <div className="pb-2 text-xs font-bold text-slate-700 dark:text-slate-200">{label}</div>
                          <label className="text-[10px] font-bold text-slate-500">Para
                            <input type="number" min={1} max={12} value={entry.period} onChange={(e) => updateScheduleDay(entry.day, { period: Number(e.target.value) })} className="mt-1 w-full rounded-lg border border-slate-200 bg-white p-2 text-xs font-bold dark:border-slate-600 dark:bg-slate-900" />
                          </label>
                          <label className="text-[10px] font-bold text-slate-500">Boshlanish
                            <input type="time" value={entry.startTime} onChange={(e) => updateScheduleDay(entry.day, { startTime: e.target.value })} className="mt-1 w-full rounded-lg border border-slate-200 bg-white p-2 text-xs font-bold dark:border-slate-600 dark:bg-slate-900" />
                          </label>
                          <label className="text-[10px] font-bold text-slate-500">Tugash
                            <input type="time" value={entry.endTime} onChange={(e) => updateScheduleDay(entry.day, { endTime: e.target.value })} className="mt-1 w-full rounded-lg border border-slate-200 bg-white p-2 text-xs font-bold dark:border-slate-600 dark:bg-slate-900" />
                          </label>
                          <label className="text-[10px] font-bold text-slate-500">Xona
                            <input type="text" value={entry.room} onChange={(e) => updateScheduleDay(entry.day, { room: e.target.value })} className="mt-1 w-full rounded-lg border border-slate-200 bg-white p-2 text-xs font-bold dark:border-slate-600 dark:bg-slate-900" />
                          </label>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="mt-5 flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  disabled={isSavingClass}
                  className="rounded-xl bg-indigo-600 px-5 py-2 text-xs font-bold text-white hover:bg-indigo-700 active:scale-95 transition-all shadow-md"
                >
                  {isSavingClass ? 'Saqlanmoqda...' : t('create')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Class Modal */}
      {editingClass && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl dark:bg-slate-900 border border-slate-100 dark:border-slate-800 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
              <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Edit2 className="h-5 w-5 text-indigo-600" />
                <span>Sinf ma‘lumotlarini tahrirlash (КАО)</span>
              </h3>
              <button onClick={() => setEditingClass(null)} className="text-slate-400 hover:text-slate-600">
                ✕
              </button>
            </div>

            {formError && (
              <div className="mt-3 rounded-xl bg-rose-50 p-3 text-xs font-bold text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">
                {formError}
              </div>
            )}

            <form onSubmit={handleSaveEditClass} className="mt-4 space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300">Sinf raqami (1–11)</label>
                  <input
                    type="number"
                    min={1}
                    max={11}
                    value={gradeLevelInput}
                    onChange={(e) => {
                      const num = Number(e.target.value);
                      setGradeLevelInput(num);
                      setClassNameInput(`${num}-${sectionInput}`);
                    }}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 font-bold focus:bg-white focus:ring-2 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300">Parallel harfi</label>
                  <select
                    value={sectionInput}
                    onChange={(e) => {
                      setSectionInput(e.target.value);
                      setClassNameInput(`${gradeLevelInput}-${e.target.value}`);
                    }}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 font-bold focus:bg-white focus:ring-2 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800"
                  >
                    {['A', 'B', 'V', 'G', 'D', 'E'].map((letter) => (
                      <option key={letter} value={letter}>{letter}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300">Sinf nomi</label>
                <input
                  type="text"
                  value={classNameInput}
                  onChange={(e) => setClassNameInput(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300">Sinf rahbari (O‘qituvchi)</label>
                <select
                  value={homeroomTeacherId}
                  onChange={(e) => setHomeroomTeacherId(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 font-semibold dark:border-slate-700 dark:bg-slate-800"
                >
                  <option value="">Tanlanmagan / Biriktirilmagan</option>
                  {teachersList.map((tc) => (
                    <option key={tc.id} value={tc.id}>
                      {tc.name} ({tc.subject || 'O‘qituvchi'}) {tc.phone ? `— ${tc.phone}` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300">Xona</label>
                  <input
                    type="text"
                    value={roomInput}
                    onChange={(e) => setRoomInput(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 font-bold dark:border-slate-700 dark:bg-slate-800"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300">Smena</label>
                  <select
                    value={shiftInput}
                    onChange={(e) => setShiftInput(e.target.value as any)}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 font-semibold dark:border-slate-700 dark:bg-slate-800"
                  >
                    <option value="1-smena">1-smena</option>
                    <option value="2-smena">2-smena</option>
                  </select>
                </div>
              </div>

              <div className="mt-5 flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingClass(null)}
                  className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-indigo-600 px-5 py-2 text-xs font-bold text-white hover:bg-indigo-700 active:scale-95 transition-all shadow-md"
                >
                  Saqlash
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Class Students View & Transfer Modal */}
      {viewingClassStudents && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-2xl rounded-3xl bg-white p-6 shadow-2xl dark:bg-slate-900 border border-slate-100 dark:border-slate-800 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
              <div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <Users className="h-5 w-5 text-indigo-600" />
                  <span>{viewingClassStudents.name} sinfi o‘quvchilari ({students.filter((s) => s.grade === viewingClassStudents.name).length})</span>
                </h3>
                <p className="text-xs text-slate-400">Sinf rahbari: {viewingClassStudents.homeroomTeacher || 'Biriktirilmagan'}</p>
              </div>
              <button onClick={() => setViewingClassStudents(null)} className="text-slate-400 hover:text-slate-600">
                ✕
              </button>
            </div>

            <div className="mt-4 max-h-96 overflow-y-auto space-y-2">
              {students.filter((s) => s.grade === viewingClassStudents.name).length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-400">
                  Ushbu sinfda hali o‘quvchilar mavjud emas.
                </div>
              ) : (
                students
                  .filter((s) => s.grade === viewingClassStudents.name)
                  .sort((a, b) => a.name.localeCompare(b.name))
                  .map((st, i) => (
                    <div key={st.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-xl bg-slate-50 p-2.5 text-xs dark:bg-slate-800/60">
                      <div className="flex items-center gap-2.5">
                        <span className="font-bold text-slate-400 w-5">{i + 1}.</span>
                        <img src={st.avatar} alt={st.name} className="h-8 w-8 rounded-full object-cover" />
                        <div>
                          <div className="font-bold text-slate-900 dark:text-white">{st.name}</div>
                          <div className="text-[10px] text-slate-400">{st.studentId} • {st.attendanceRate || 95}% davomat</div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-auto">
                        <span className="text-[10px] text-slate-400">Sinfni almashtirish:</span>
                        <select
                          value={st.grade}
                          onChange={(e) => handleTransferStudent(st.id, e.target.value)}
                          className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] font-bold text-indigo-600 dark:border-slate-700 dark:bg-slate-900 dark:text-indigo-400 cursor-pointer hover:border-indigo-400"
                        >
                          <option value={st.grade}>{st.grade} (Joriy)</option>
                          {classes
                            .filter((c) => c.name !== st.grade)
                            .map((c) => (
                              <option key={c.id} value={c.name}>
                                ➜ {c.name} sinfiga o‘tkazish
                              </option>
                            ))}
                        </select>
                      </div>
                    </div>
                  ))
              )}
            </div>

            <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end">
              <button
                onClick={() => setViewingClassStudents(null)}
                className="rounded-xl bg-indigo-600 px-5 py-2 text-xs font-bold text-white hover:bg-indigo-700"
              >
                {t('close')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
