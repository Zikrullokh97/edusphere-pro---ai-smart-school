import React, { useEffect, useMemo, useState } from 'react';
import {
  BookOpen,
  Plus,
  Search,
  Layers,
  Clock,
  Edit2,
  Trash2,
  Check,
  X,
  AlertCircle,
  GraduationCap,
  Sparkles,
  Users,
  UserPlus,
  UserMinus,
  Briefcase,
  Award,
  ExternalLink,
} from 'lucide-react';
import { AppLanguage, EducationSystemId, KAOSourceProvenance, SubjectItem, TeacherRecord } from '../../types';
import { useI18n } from '../../lib/i18n';
import {
  listSchoolData,
  createSchoolData,
  updateSchoolData,
  archiveSchoolData,
  assignTeacherToSubject,
  removeTeacherFromSubject,
} from '../../lib/schoolRepository';
import { KAO_CURRICULUM_SUBJECTS, KAOSubjectDefinition } from '../../lib/kyrgyzstanEdu';
import { MOCK_TEACHERS } from '../../data/mockData';

interface SubjectsDirectoryProps {
  language: AppLanguage;
  teachers?: TeacherRecord[];
  onNavigateTab?: (tabId: string) => void;
}

export interface SubjectTeacherInfo {
  id: string;
  name: string;
  avatar?: string;
  position?: string;
  weeklyHours?: number;
}

export interface ExtendedSubject {
  id: string;
  name: string;
  nameKy?: string;
  nameRu?: string;
  nameUz?: string;
  localizedNames?: { ky: string; ru: string; uz: string };
  code: string;
  department:
    | 'Тил жана адабият'
    | 'Математика жана IT'
    | 'Табигый-илимий'
    | 'Коомдук-гуманитардык'
    | 'Көркөм өнөр, технология жана спорт'
    | 'Aniq fanlar'
    | 'Tabiiy fanlar'
    | 'Gumanitar'
    | 'Tillar'
    | 'San’at va sport';
  hoursPerWeek: number;
  annualHours?: number;
  educationSystem?: EducationSystemId;
  gradeLevels: string[];
  gradeRange?: string;
  headTeacher?: string;
  headTeacherId?: string;
  description?: string;
  schoolId?: string;
  source?: KAOSourceProvenance;
  teacherIds?: string[];
  teachers?: Array<SubjectTeacherInfo | string>;
}

const DEFAULT_SUBJECTS: ExtendedSubject[] = KAO_CURRICULUM_SUBJECTS.map((kao) => ({
  id: kao.id,
  name: kao.name,
  nameKy: kao.nameKy,
  nameRu: kao.nameRu,
  nameUz: kao.nameUz,
  localizedNames: kao.localizedNames,
  code: kao.code,
  department: kao.department,
  hoursPerWeek: kao.hoursPerWeek,
  annualHours: kao.annualHours,
  educationSystem: kao.educationSystem,
  gradeLevels: kao.gradeLevels,
  gradeRange: kao.gradeRange,
  description: kao.description,
  source: kao.source,
  teacherIds: [],
  teachers: [],
}));

export const SubjectsDirectory: React.FC<SubjectsDirectoryProps> = ({
  language,
  teachers: propTeachers,
  onNavigateTab,
}) => {
  const t = useI18n(language);
  const [subjects, setSubjects] = useState<ExtendedSubject[]>(DEFAULT_SUBJECTS);
  const [teachersList, setTeachersList] = useState<TeacherRecord[]>(propTeachers || MOCK_TEACHERS);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('ALL');
  const [selectedSystem, setSelectedSystem] = useState<string>('ALL');

  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<ExtendedSubject | null>(null);
  const [assigningSubject, setAssigningSubject] = useState<ExtendedSubject | null>(null);
  const [selectedTeacherIdToAssign, setSelectedTeacherIdToAssign] = useState<string>('');
  const [assignHoursInput, setAssignHoursInput] = useState<number>(2);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Form states for Add/Edit
  const [nameInput, setNameInput] = useState('');
  const [codeInput, setCodeInput] = useState('');
  const [departmentInput, setDepartmentInput] = useState<ExtendedSubject['department']>('Математика жана IT');
  const [hoursInput, setHoursInput] = useState(3);
  const [annualHoursInput, setAnnualHoursInput] = useState(102);
  const [systemInput, setSystemInput] = useState<EducationSystemId>('11_YEAR');
  const [headTeacherInput, setHeadTeacherInput] = useState('');
  const [gradeRangeInput, setGradeRangeInput] = useState('7–11-класстар');
  const [descriptionInput, setDescriptionInput] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const [items, teachersRes] = await Promise.allSettled([
        listSchoolData<ExtendedSubject>('subjects'),
        listSchoolData<TeacherRecord>('teachers'),
      ]);

      if (items.status === 'fulfilled' && items.value && items.value.length > 0) {
        setSubjects(items.value);
      }
      if (teachersRes.status === 'fulfilled' && teachersRes.value && teachersRes.value.length > 0) {
        setTeachersList(teachersRes.value);
      }
    } catch {
      // Use defaults
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const departments: Array<ExtendedSubject['department']> = [
    'Тил жана адабият',
    'Математика жана IT',
    'Табигый-илимий',
    'Коомдук-гуманитардык',
    'Көркөм өнөр, технология жана спорт',
  ];

  const getTeachersForSubject = (sbj: ExtendedSubject): TeacherRecord[] => {
    return teachersList.filter((tc) => {
      const isAssignedById = sbj.teacherIds?.includes(tc.id);
      const isSpecializedByName =
        tc.subject === sbj.name ||
        tc.subjects?.includes(sbj.name) ||
        tc.subjectSpecialties?.includes(sbj.name);
      return isAssignedById || isSpecializedByName;
    });
  };

  const filteredSubjects = useMemo(() => {
    return subjects.filter((s) => {
      const matchesSearch =
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (s.headTeacher && s.headTeacher.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (s.description && s.description.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesDept = selectedDepartment === 'ALL' || s.department === selectedDepartment;
      const matchesSystem =
        selectedSystem === 'ALL' ||
        !s.educationSystem ||
        s.educationSystem === 'BOTH' ||
        s.educationSystem === selectedSystem;
      return matchesSearch && matchesDept && matchesSystem;
    });
  }, [subjects, searchQuery, selectedDepartment, selectedSystem]);

  const handleOpenAddModal = () => {
    setNameInput('');
    setCodeInput(`SBJ-${Math.floor(10 + Math.random() * 90)}`);
    setDepartmentInput('Математика жана IT');
    setHoursInput(3);
    setAnnualHoursInput(102);
    setSystemInput('11_YEAR');
    setGradeRangeInput('5–11-класстар');
    setHeadTeacherInput(teachersList[0]?.name || '');
    setDescriptionInput('');
    setIsAddModalOpen(true);
  };

  const handleOpenEditModal = (sbj: ExtendedSubject) => {
    setEditingSubject(sbj);
    setNameInput(sbj.name);
    setCodeInput(sbj.code);
    setDepartmentInput(sbj.department);
    setHoursInput(sbj.hoursPerWeek);
    setAnnualHoursInput(sbj.annualHours || sbj.hoursPerWeek * 34);
    setSystemInput(sbj.educationSystem || '11_YEAR');
    setGradeRangeInput(sbj.gradeRange || '5–11-класстар');
    setHeadTeacherInput(sbj.headTeacher || '');
    setDescriptionInput(sbj.description || '');
  };

  const handleOpenAssignModal = (sbj: ExtendedSubject) => {
    setAssigningSubject(sbj);
    setAssignHoursInput(sbj.hoursPerWeek || 2);
    const assignedTeachers = getTeachersForSubject(sbj);
    const unassigned = teachersList.filter((t) => !assignedTeachers.some((at) => at.id === t.id));
    setSelectedTeacherIdToAssign(unassigned[0]?.id || '');
  };

  const handleSaveEditSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSubject) return;
    if (!nameInput.trim()) {
      setFeedbackMsg({ type: 'error', text: 'Сабактын аталышын жазыңыз.' });
      return;
    }

    const updated: ExtendedSubject = {
      ...editingSubject,
      name: nameInput.trim(),
      code: codeInput.trim() || editingSubject.code,
      department: departmentInput,
      hoursPerWeek: Number(hoursInput) || 2,
      annualHours: Number(annualHoursInput) || Number(hoursInput) * 34,
      educationSystem: systemInput,
      gradeRange: gradeRangeInput,
      headTeacher: headTeacherInput || 'Бириктирилген эмес',
      description: descriptionInput.trim(),
    };

    setSubjects((prev) => prev.map((s) => (s.id === editingSubject.id ? updated : s)));
    setEditingSubject(null);
    setFeedbackMsg({ type: 'success', text: 'Сабактын маалыматтары ийгиликтүү жаңыртылды!' });
    setTimeout(() => setFeedbackMsg(null), 3500);

    try {
      await updateSchoolData('subjects', updated);
    } catch {}
  };

  const handleSaveNewSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameInput.trim()) {
      setFeedbackMsg({ type: 'error', text: 'Сабактын аталышын жазыңыз.' });
      return;
    }

    const newObj: ExtendedSubject = {
      id: `sbj-${Date.now()}`,
      name: nameInput.trim(),
      code: codeInput.trim() || `SBJ-${Date.now().toString().slice(-4)}`,
      department: departmentInput,
      hoursPerWeek: Number(hoursInput) || 2,
      annualHours: Number(annualHoursInput) || Number(hoursInput) * 34,
      educationSystem: systemInput,
      gradeLevels: ['5-A', '6-A', '7-A', '8-B', '9-A', '10-B', '11-A'],
      gradeRange: gradeRangeInput,
      headTeacher: headTeacherInput || 'Бириктирилген эмес',
      description: descriptionInput.trim(),
      source: {
        organization: 'Кыргыз билим берүү академиясы (КББА / КАО)',
        url: 'https://kao.kg/',
        documentTitle: 'Мамлекеттик билим берүү стандарты жана БУП',
        documentYear: '2026',
        verifiedAt: new Date().toISOString(),
        status: 'VERIFIED',
      },
      teacherIds: [],
      teachers: [],
    };

    setSubjects((prev) => [newObj, ...prev]);
    setIsAddModalOpen(false);
    setFeedbackMsg({ type: 'success', text: 'Жаңы сабак КАО базасына ийгиликтүү кошулду!' });
    setTimeout(() => setFeedbackMsg(null), 3500);

    try {
      await createSchoolData('subjects', newObj);
    } catch {}
  };

  const handleDeleteSubject = async (id: string) => {
    if (!window.confirm('Бул сабакты өчүрүүнү каалайсызбы?')) return;
    setSubjects((prev) => prev.filter((s) => s.id !== id));
    setFeedbackMsg({ type: 'success', text: 'Сабак өчүрүлдү.' });
    setTimeout(() => setFeedbackMsg(null), 3000);
    try {
      await archiveSchoolData('subjects', id);
    } catch {}
  };

  const handleAssignTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assigningSubject || !selectedTeacherIdToAssign) return;

    const teacher = teachersList.find((t) => t.id === selectedTeacherIdToAssign);
    if (!teacher) return;

    const updatedSubject: ExtendedSubject = {
      ...assigningSubject,
      teacherIds: Array.from(new Set([...(assigningSubject.teacherIds || []), teacher.id])),
      teachers: [
        ...(Array.isArray(assigningSubject.teachers) ? assigningSubject.teachers : []),
        {
          id: teacher.id,
          name: teacher.name,
          avatar: teacher.avatar,
          position: teacher.position || 'Сабактын мугалими',
          weeklyHours: assignHoursInput,
        },
      ],
    };

    setSubjects((prev) => prev.map((s) => (s.id === assigningSubject.id ? updatedSubject : s)));
    setAssigningSubject(updatedSubject);

    setTeachersList((prev) =>
      prev.map((t) => {
        if (t.id === teacher.id) {
          const specialties = Array.from(new Set([...(t.subjectSpecialties || []), assigningSubject.name]));
          return { ...t, subjectSpecialties: specialties, subjects: specialties };
        }
        return t;
      })
    );

    setFeedbackMsg({ type: 'success', text: `${teacher.name} сабакка ийгиликтүү бекитилди!` });
    setTimeout(() => setFeedbackMsg(null), 3500);

    try {
      await assignTeacherToSubject(assigningSubject.id, teacher.id);
    } catch {
      await updateSchoolData('subjects', updatedSubject).catch(() => undefined);
    }
  };

  const handleRemoveTeacher = async (teacherId: string) => {
    if (!assigningSubject) return;
    const teacher = teachersList.find((t) => t.id === teacherId);
    if (!window.confirm(`Чын эле ${teacher?.name || 'мугалимди'} бул сабактан ажыраткыңыз келеби?`)) return;

    const updatedTeacherIds = (assigningSubject.teacherIds || []).filter((id) => id !== teacherId);
    const updatedTeachers = (assigningSubject.teachers || []).filter((t) =>
      typeof t === 'string' ? t !== teacher?.name : t.id !== teacherId
    );

    const updatedSubject: ExtendedSubject = {
      ...assigningSubject,
      teacherIds: updatedTeacherIds,
      teachers: updatedTeachers,
    };

    setSubjects((prev) => prev.map((s) => (s.id === assigningSubject.id ? updatedSubject : s)));
    setAssigningSubject(updatedSubject);

    if (teacher) {
      setTeachersList((prev) =>
        prev.map((t) => {
          if (t.id === teacherId) {
            const specialties = (t.subjectSpecialties || []).filter((s) => s !== assigningSubject.name);
            return { ...t, subjectSpecialties: specialties };
          }
          return t;
        })
      );
    }

    setFeedbackMsg({ type: 'success', text: 'Мугалим сабактан ажыратылды.' });
    setTimeout(() => setFeedbackMsg(null), 3000);

    try {
      await removeTeacherFromSubject(assigningSubject.id, teacherId);
    } catch {
      await updateSchoolData('subjects', updatedSubject).catch(() => undefined);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-3xl border border-slate-200/80 bg-white p-5 sm:p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-700 dark:bg-indigo-950/70 dark:text-indigo-300 mb-2">
            <Award className="h-3.5 w-3.5" />
            <span>КАО (Кыргыз билим берүү академиясы) Базистик окуу планы</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2.5">
            <BookOpen className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
            <span>
              {language === 'ky'
                ? 'Мектеп Сабактары жана Окуу Программасы (1–11-класстар)'
                : language === 'ru'
                ? 'Школьные Предметы и Учебный План КАО (1–11 классы)'
                : 'Maktab Fanlari va O‘quv Dasturlari (KAO Standarti)'}
            </span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {language === 'ky'
              ? 'Мамлекеттик стандарт боюнча 1–11-класстардын сабактары, жумалык саат ченеми жана мугалимдер'
              : 'Государственный стандарт КАО КР: предметы, недельная нагрузка и закрепленные учителя'}
          </p>
        </div>

        <button
          onClick={handleOpenAddModal}
          className="flex min-h-[44px] items-center gap-2 rounded-2xl bg-indigo-600 px-5 py-2.5 text-xs font-bold text-white shadow-lg shadow-indigo-600/30 hover:bg-indigo-700 active:scale-95 transition-all"
        >
          <Plus className="h-4 w-4" />
          <span>{language === 'ky' ? '+ Жаңы сабак кошуу' : '+ Yangi fan qo‘shish'}</span>
        </button>
      </div>

      {/* Inline Feedback Alerts */}
      {feedbackMsg && (
        <div
          className={`flex items-center gap-2 rounded-2xl p-3.5 text-xs font-bold ${
            feedbackMsg.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300'
              : 'bg-rose-50 text-rose-800 border border-rose-200 dark:bg-rose-950/50 dark:text-rose-300'
          }`}
        >
          {feedbackMsg.type === 'success' ? <Check className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
          <span>{feedbackMsg.text}</span>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Сабактын аты, коду же мугалим боюнча издөө..."
              className="w-full rounded-2xl border border-slate-200 bg-white pl-10 pr-4 py-2.5 text-xs font-medium text-slate-900 focus:ring-2 focus:ring-indigo-500 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
            />
          </div>

          {/* Education System Filter Tabs */}
          <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-slate-100 dark:bg-slate-800 text-xs font-bold w-full sm:w-auto">
            <button
              onClick={() => setSelectedSystem('ALL')}
              className={`rounded-xl px-3 py-1.5 transition-all ${
                selectedSystem === 'ALL'
                  ? 'bg-white text-indigo-700 shadow-xs dark:bg-slate-900 dark:text-indigo-400'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400'
              }`}
            >
              Бардык системалар
            </button>
            <button
              onClick={() => setSelectedSystem('11_YEAR')}
              className={`rounded-xl px-3 py-1.5 transition-all ${
                selectedSystem === '11_YEAR'
                  ? 'bg-white text-indigo-700 shadow-xs dark:bg-slate-900 dark:text-indigo-400'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400'
              }`}
            >
              11 жылдык мектеп
            </button>
            <button
              onClick={() => setSelectedSystem('12_YEAR')}
              className={`rounded-xl px-3 py-1.5 transition-all ${
                selectedSystem === '12_YEAR'
                  ? 'bg-white text-indigo-700 shadow-xs dark:bg-slate-900 dark:text-indigo-400'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400'
              }`}
            >
              12 жылдык мектеп
            </button>
          </div>
        </div>

        {/* Department Filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full pb-1">
          <button
            onClick={() => setSelectedDepartment('ALL')}
            className={`rounded-xl px-3.5 py-2 text-xs font-bold whitespace-nowrap transition-all ${
              selectedDepartment === 'ALL'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-300'
            }`}
          >
            Бардык бөлүмдөр ({subjects.length})
          </button>
          {departments.map((dept) => {
            const count = subjects.filter((s) => s.department === dept).length;
            return (
              <button
                key={dept}
                onClick={() => setSelectedDepartment(dept)}
                className={`rounded-xl px-3.5 py-2 text-xs font-bold whitespace-nowrap transition-all ${
                  selectedDepartment === dept
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-300'
                }`}
              >
                {dept} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* Grid of Subjects */}
      {filteredSubjects.length === 0 ? (
        <div className="rounded-3xl border border-slate-200 bg-white p-12 text-center dark:border-slate-800 dark:bg-slate-900">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400">
            <BookOpen className="h-7 w-7" />
          </div>
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-200 mt-4">
            Издөө боюнча сабактар табылган жок
          </h3>
          <button
            onClick={handleOpenAddModal}
            className="mt-4 inline-flex items-center gap-1.5 rounded-2xl bg-indigo-600 px-5 py-2 text-xs font-bold text-white shadow-md hover:bg-indigo-700"
          >
            <Plus className="h-4 w-4" />
            <span>Жаңы сабак кошуу</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredSubjects.map((sbj) => {
            const assignedTeachers = getTeachersForSubject(sbj);
            const annualHrs = sbj.annualHours || (sbj.hoursPerWeek ? sbj.hoursPerWeek * 34 : 68);

            return (
              <div
                key={sbj.id}
                className="group rounded-3xl border border-slate-200/80 bg-white p-5 shadow-xs hover:border-indigo-300 hover:shadow-md transition-all dark:border-slate-800 dark:bg-slate-900 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 font-black text-sm dark:bg-indigo-950/60 dark:text-indigo-400">
                        {sbj.name.charAt(0)}
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white leading-tight">
                          {sbj.name}
                        </h3>
                        <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400">
                          {sbj.code}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100">
                      <button
                        onClick={() => handleOpenEditModal(sbj)}
                        className="text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 p-1.5 rounded-lg transition-colors"
                        title="Түзөтүү"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteSubject(sbj.id)}
                        className="text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 p-1.5 rounded-lg transition-colors"
                        title="Өчүрүү"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-1.5">
                    <span className="inline-block rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                      {sbj.department}
                    </span>
                    <span className="inline-block rounded-full bg-indigo-50 px-2.5 py-0.5 text-[10px] font-bold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                      {sbj.hoursPerWeek} саат/жума
                    </span>
                    <span className="inline-block rounded-full bg-blue-50 px-2.5 py-0.5 text-[10px] font-bold text-blue-700 dark:bg-blue-950/60 dark:text-blue-300">
                      {annualHrs} саат/жыл
                    </span>
                    {sbj.gradeRange && (
                      <span className="inline-block rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                        {sbj.gradeRange}
                      </span>
                    )}
                    {sbj.educationSystem && sbj.educationSystem !== 'BOTH' && (
                      <span className="inline-block rounded-full bg-purple-50 px-2.5 py-0.5 text-[10px] font-bold text-purple-700 dark:bg-purple-950/60 dark:text-purple-300">
                        {sbj.educationSystem === '12_YEAR' ? '12-жылдык' : '11-жылдык'}
                      </span>
                    )}
                    {sbj.source?.url && (
                      <a
                        href={sbj.source.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-800 hover:bg-amber-100 hover:text-amber-900 dark:bg-amber-950/60 dark:text-amber-300 transition-colors"
                        title={`${sbj.source.documentTitle} (${sbj.source.organization})`}
                      >
                        <ExternalLink className="h-2.5 w-2.5" />
                        <span>КАО: {sbj.source.documentYear || '2026'}</span>
                      </a>
                    )}
                  </div>

                  {sbj.description && (
                    <p className="mt-2.5 text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                      {sbj.description}
                    </p>
                  )}

                  {/* Specialized Teachers Block */}
                  <div className="mt-4 rounded-2xl bg-slate-50/80 p-3 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                        <Users className="h-3.5 w-3.5 text-indigo-600" />
                        <span>Бекитилген мугалимдер ({assignedTeachers.length})</span>
                      </span>
                    </div>

                    {assignedTeachers.length === 0 ? (
                      <p className="text-[11px] text-slate-400 italic">Азырынча мугалим бекитиле элек</p>
                    ) : (
                      <div className="space-y-1.5">
                        {assignedTeachers.slice(0, 3).map((teacher) => (
                          <div key={teacher.id} className="flex items-center justify-between text-xs">
                            <div className="flex items-center gap-2">
                              {teacher.avatar ? (
                                <img src={teacher.avatar} alt={teacher.name} className="h-6 w-6 rounded-full object-cover" />
                              ) : (
                                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-100 font-bold text-[10px] text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300">
                                  {teacher.name.charAt(0)}
                                </div>
                              )}
                              <div>
                                <div className="font-bold text-slate-900 dark:text-white truncate max-w-[140px]">{teacher.name}</div>
                                <div className="text-[9px] text-slate-400">{teacher.position || 'Сабактын мугалими'}</div>
                              </div>
                            </div>
                            <span className="text-[10px] font-semibold text-indigo-600 dark:text-indigo-400">
                              {teacher.totalLessonsWeekly || 18} саат
                            </span>
                          </div>
                        ))}
                        {assignedTeachers.length > 3 && (
                          <p className="text-[10px] text-slate-400 font-semibold pt-1">
                            +{assignedTeachers.length - 3} башка мугалим
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2 text-xs">
                  <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
                    <span className="flex items-center gap-1 text-slate-400">
                      <GraduationCap className="h-3.5 w-3.5" /> Кафедра башчысы:
                    </span>
                    <span className="font-semibold truncate max-w-[130px]">{sbj.headTeacher || 'Бириктирилген эмес'}</span>
                  </div>

                  <button
                    onClick={() => handleOpenAssignModal(sbj)}
                    className="w-full flex items-center justify-center gap-1.5 rounded-xl bg-indigo-50 py-2 text-xs font-bold text-indigo-600 hover:bg-indigo-100 hover:text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 dark:hover:bg-indigo-900/60 transition-colors"
                  >
                    <UserPlus className="h-3.5 w-3.5" />
                    <span>Мугалимди бекитүү / Башкаруу</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Manage / Assign Teachers Modal */}
      {assigningSubject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl dark:bg-slate-900 border border-slate-100 dark:border-slate-800 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
              <div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-indigo-600" />
                  <span>{assigningSubject.name} — Мугалимдер</span>
                </h3>
                <p className="text-xs text-slate-400">КАО стандарты боюнча сабакка адистешкен мугалимдерди бекитүү</p>
              </div>
              <button onClick={() => setAssigningSubject(null)} className="text-slate-400 hover:text-slate-600">
                ✕
              </button>
            </div>

            {/* List of currently assigned teachers */}
            <div className="mt-4">
              <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
                Бекитилген Мугалимдер:
              </h4>
              {getTeachersForSubject(assigningSubject).length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 p-4 text-center text-xs text-slate-400 dark:border-slate-800">
                  Азырынча эч кандай мугалим бекитиле элек.
                </div>
              ) : (
                <div className="max-h-52 overflow-y-auto space-y-2 pr-1">
                  {getTeachersForSubject(assigningSubject).map((tc) => (
                    <div
                      key={tc.id}
                      className="flex items-center justify-between rounded-xl bg-slate-50 p-2.5 text-xs dark:bg-slate-800/60"
                    >
                      <div className="flex items-center gap-2.5">
                        {tc.avatar ? (
                          <img src={tc.avatar} alt={tc.name} className="h-8 w-8 rounded-full object-cover" />
                        ) : (
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 font-bold text-indigo-700">
                            {tc.name.charAt(0)}
                          </div>
                        )}
                        <div>
                          <div className="font-bold text-slate-900 dark:text-white">{tc.name}</div>
                          <div className="text-[10px] text-slate-400">
                            {tc.position || 'Мугалим'} • {tc.rateType || `${tc.totalLessonsWeekly || 18} саат`}
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRemoveTeacher(tc.id)}
                        className="flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-bold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                        title="Сабактан ажыратуу"
                      >
                        <UserMinus className="h-3.5 w-3.5" />
                        <span>Ажыратуу</span>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Assign new teacher form */}
            <form onSubmit={handleAssignTeacher} className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800 space-y-3">
              <h4 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <UserPlus className="h-4 w-4 text-indigo-600" />
                <span>+ Жаңы Мугалимди Бекитүү</span>
              </h4>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 text-xs">Мугалимди тандаңыз</label>
                <select
                  value={selectedTeacherIdToAssign}
                  onChange={(e) => setSelectedTeacherIdToAssign(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs font-semibold dark:border-slate-700 dark:bg-slate-800"
                  required
                >
                  <option value="">Тандаңыз...</option>
                  {teachersList.map((tc) => (
                    <option key={tc.id} value={tc.id}>
                      {tc.name} ({tc.subject || 'Мугалим'}) — {tc.rateType || `${tc.totalLessonsWeekly || 18} саат`}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-between gap-3">
                <div className="flex-1">
                  <label className="font-bold text-slate-700 dark:text-slate-300 text-xs">Жумалык окутуу сааты</label>
                  <input
                    type="number"
                    min={1}
                    max={20}
                    value={assignHoursInput}
                    onChange={(e) => setAssignHoursInput(Number(e.target.value))}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-2 text-xs font-bold dark:border-slate-700 dark:bg-slate-800"
                  />
                </div>

                <div className="self-end">
                  <button
                    type="submit"
                    disabled={!selectedTeacherIdToAssign}
                    className="rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-indigo-700 disabled:opacity-50 transition-all shadow-md"
                  >
                    Бекитүү
                  </button>
                </div>
              </div>
            </form>

            <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end">
              <button
                onClick={() => setAssigningSubject(null)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300"
              >
                Жабуу
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Subject Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl dark:bg-slate-900 border border-slate-100 dark:border-slate-800 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
              <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-indigo-600" />
                <span>Жаңы Сабак Кошуу (КАО)</span>
              </h3>
              <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveNewSubject} className="mt-4 space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300">Сабактын аталышы</label>
                <input
                  type="text"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  placeholder="Мисалы: Мекен таануу же Физика"
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 font-bold focus:bg-white focus:ring-2 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300">Сабактын коду</label>
                  <input
                    type="text"
                    value={codeInput}
                    onChange={(e) => setCodeInput(e.target.value)}
                    placeholder="KYR-LANG"
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 font-bold focus:bg-white dark:border-slate-700 dark:bg-slate-800"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300">Жумалык сааты</label>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={hoursInput}
                    onChange={(e) => setHoursInput(Number(e.target.value))}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 font-bold focus:bg-white dark:border-slate-700 dark:bg-slate-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300">Багыты / Кафедра</label>
                  <select
                    value={departmentInput}
                    onChange={(e) => setDepartmentInput(e.target.value as any)}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 font-semibold dark:border-slate-700 dark:bg-slate-800"
                  >
                    {departments.map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300">Класстар деңгээли</label>
                  <input
                    type="text"
                    value={gradeRangeInput}
                    onChange={(e) => setGradeRangeInput(e.target.value)}
                    placeholder="7–11-класстар"
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 font-bold dark:border-slate-700 dark:bg-slate-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300">Билим берүү системасы</label>
                  <select
                    value={systemInput}
                    onChange={(e) => setSystemInput(e.target.value as EducationSystemId)}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 font-semibold dark:border-slate-700 dark:bg-slate-800"
                  >
                    <option value="11_YEAR">11 жылдык мектеп</option>
                    <option value="12_YEAR">12 жылдык мектеп</option>
                    <option value="BOTH">Эки системага тең (11 & 12)</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300">Жылдык сааты (БУП)</label>
                  <input
                    type="number"
                    min={1}
                    max={340}
                    value={annualHoursInput}
                    onChange={(e) => setAnnualHoursInput(Number(e.target.value))}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 font-bold focus:bg-white dark:border-slate-700 dark:bg-slate-800"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300">Кафедра башчысы / Жооптуу мугалим</label>
                <select
                  value={headTeacherInput}
                  onChange={(e) => setHeadTeacherInput(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 font-semibold dark:border-slate-700 dark:bg-slate-800"
                >
                  <option value="">Тандалган эмес</option>
                  {teachersList.map((tc) => (
                    <option key={tc.id} value={tc.name}>{tc.name} ({tc.subject || 'Мугалим'})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300">Кыскача түшүндүрмө</label>
                <textarea
                  rows={2}
                  value={descriptionInput}
                  onChange={(e) => setDescriptionInput(e.target.value)}
                  placeholder="Сабактын максаты жана КАО мамлекеттик стандарты боюнча түшүндүрмө..."
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 font-medium focus:bg-white dark:border-slate-700 dark:bg-slate-800"
                />
              </div>

              <div className="mt-5 flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  Жокко чыгаруу
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-indigo-600 px-5 py-2 text-xs font-bold text-white hover:bg-indigo-700 active:scale-95 transition-all shadow-md"
                >
                  Сактоо
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Subject Modal */}
      {editingSubject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl dark:bg-slate-900 border border-slate-100 dark:border-slate-800 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
              <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Edit2 className="h-5 w-5 text-indigo-600" />
                <span>Сабакты Түзөтүү (КАО)</span>
              </h3>
              <button onClick={() => setEditingSubject(null)} className="text-slate-400 hover:text-slate-600">
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEditSubject} className="mt-4 space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300">Сабактын аталышы</label>
                <input
                  type="text"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 font-bold focus:bg-white focus:ring-2 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300">Сабактын коду</label>
                  <input
                    type="text"
                    value={codeInput}
                    onChange={(e) => setCodeInput(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 font-bold focus:bg-white dark:border-slate-700 dark:bg-slate-800"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300">Жумалык сааты</label>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={hoursInput}
                    onChange={(e) => setHoursInput(Number(e.target.value))}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 font-bold focus:bg-white dark:border-slate-700 dark:bg-slate-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300">Багыты / Кафедра</label>
                  <select
                    value={departmentInput}
                    onChange={(e) => setDepartmentInput(e.target.value as any)}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 font-semibold dark:border-slate-700 dark:bg-slate-800"
                  >
                    {departments.map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300">Класстар деңгээли</label>
                  <input
                    type="text"
                    value={gradeRangeInput}
                    onChange={(e) => setGradeRangeInput(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 font-bold dark:border-slate-700 dark:bg-slate-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300">Билим берүү системасы</label>
                  <select
                    value={systemInput}
                    onChange={(e) => setSystemInput(e.target.value as EducationSystemId)}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 font-semibold dark:border-slate-700 dark:bg-slate-800"
                  >
                    <option value="11_YEAR">11 жылдык мектеп</option>
                    <option value="12_YEAR">12 жылдык мектеп</option>
                    <option value="BOTH">Эки системага тең (11 & 12)</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300">Жылдык сааты (БУП)</label>
                  <input
                    type="number"
                    min={1}
                    max={340}
                    value={annualHoursInput}
                    onChange={(e) => setAnnualHoursInput(Number(e.target.value))}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 font-bold focus:bg-white dark:border-slate-700 dark:bg-slate-800"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300">Кафедра башчысы / Жооптуу мугалим</label>
                <select
                  value={headTeacherInput}
                  onChange={(e) => setHeadTeacherInput(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 font-semibold dark:border-slate-700 dark:bg-slate-800"
                >
                  <option value="">Тандалган эмес</option>
                  {teachersList.map((tc) => (
                    <option key={tc.id} value={tc.name}>{tc.name} ({tc.subject || 'Мугалим'})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300">Кыскача түшүндүрмө</label>
                <textarea
                  rows={2}
                  value={descriptionInput}
                  onChange={(e) => setDescriptionInput(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 font-medium focus:bg-white dark:border-slate-700 dark:bg-slate-800"
                />
              </div>

              <div className="mt-5 flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingSubject(null)}
                  className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  Жокко чыгаруу
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-indigo-600 px-5 py-2 text-xs font-bold text-white hover:bg-indigo-700 active:scale-95 transition-all shadow-md"
                >
                  Өзгөртүүлөрдү сактоо
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
