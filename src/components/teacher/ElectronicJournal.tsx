import React, { useEffect, useMemo, useState } from 'react';
import {
  BookOpenCheck,
  CalendarDays,
  Check,
  Loader2,
  Save,
  Search,
  Lock,
  AlertTriangle,
  Upload,
  Sparkles,
  FileText,
  Video,
  CheckCircle2,
  XCircle,
  Clock,
  ChevronDown,
  ChevronUp,
  FileCheck,
  Layers,
  Award,
  BookOpen,
  ArrowRight,
  RefreshCw,
  Plus,
  ShieldCheck,
  Edit3,
  ExternalLink,
} from 'lucide-react';
import { authenticatedFetch } from '../../lib/api';
import { listSchoolData } from '../../lib/schoolRepository';
import { StudentRecord, QuarterId, AcademicYearRecord, AppLanguage, ScheduleSlot, TeacherRecord, UserProfile } from '../../types';
import { toKyrgyzGrade, KyrgyzGradeNumber, reconcileKTPAgainstSchedule } from '../../lib/kyrgyzstanEdu';
import { useI18n, formatRole, formatGrade, formatQuarter } from '../../lib/i18n';
import {
  SEED_KTP_DOCUMENTS,
  findKTPLesson,
  generateLessonConspectDraft,
  getMatchedLessonMaterials,
  parseKTPRawText,
  resolveNextLessonContext,
  isKTPApproved,
  getKTPStatusLabel,
} from '../../lib/ktpEngine';


interface JournalEntry {
  studentId: string;
  attendance: 'present' | 'absent' | 'late' | 'excused';
  grade: number | null;
  comment: string;
}

interface JournalRecord {
  id: string;
  date: string;
  className: string;
  subject: string;
  topic: string;
  entries: JournalEntry[];
}

interface ElectronicJournalProps {
  language?: AppLanguage;
  masterSchedule?: ScheduleSlot[];
  teachers?: TeacherRecord[];
  currentUser?: UserProfile;
  initialClass?: string;
  initialSubject?: string;
}

const todayStr = new Date().toISOString().slice(0, 10);

export const ElectronicJournal: React.FC<ElectronicJournalProps> = ({
  language = 'uz',
  masterSchedule = [],
  teachers = [],
  currentUser,
  initialClass,
  initialSubject,
}) => {
  const t = useI18n(language);

  // 1. Teacher Context & Roster
  const currentTeacher: TeacherRecord = useMemo(() => {
    if (currentUser) {
      const found = teachers.find(
        (t) =>
          (currentUser.email && t.email?.toLowerCase() === currentUser.email.toLowerCase()) ||
          (currentUser.id && (t.id === currentUser.id || `usr-${t.id}` === currentUser.id)) ||
          (currentUser.teacherId && t.id === currentUser.teacherId) ||
          (currentUser.name && t.name.toLowerCase() === currentUser.name.toLowerCase())
      );
      if (found) return found;

      return {
        id: currentUser.teacherId || currentUser.id?.replace('usr-', '') || 'tch-001',
        name: currentUser.name || 'O‘qituvchi',
        email: currentUser.email || 'teacher@edusphere.school',
        phone: currentUser.phoneNumber || '+998 90 123 45 67',
        avatar: currentUser.avatar || 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
        subject: currentUser.subjectSpecialties?.[0] || currentUser.subjects?.[0] || 'Fan o‘qituvchisi',
        subjects: currentUser.subjectSpecialties || currentUser.subjects || [],
        role: 'O‘qituvchi',
        totalLessonsWeekly: currentUser.workloadHours || 0,
        rating: 5.0,
        room: '101-kabinet',
        assignedClasses: currentUser.assignedClasses || (currentUser.homeroomClass ? [currentUser.homeroomClass] : []),
        homeroomClass: currentUser.homeroomClass || '',
        workloadHours: currentUser.workloadHours || 0,
      };
    }
    return teachers[0] || {
      id: 'tch-001',
      name: 'O‘qituvchi',
      email: 'teacher@edusphere.school',
      phone: '+998 90 111 22 33',
      avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
      subject: 'Matematika',
      role: 'O‘qituvchi',
      totalLessonsWeekly: 20,
      rating: 5.0,
      room: '101-kabinet',
      assignedClasses: [],
      subjects: ['Matematika'],
      workloadHours: 20,
    };
  }, [teachers, currentUser]);
  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [ktpDocs, setKtpDocs] = useState(SEED_KTP_DOCUMENTS);
  const [academicYears, setAcademicYears] = useState<AcademicYearRecord[]>([
    {
      id: '2026-2027',
      name: '2026–2027 O‘quv yili',
      startDate: '2026-09-01',
      endDate: '2027-05-25',
      status: 'active',
      activeQuarter: 'Q1',
      quarters: [
        { id: 'Q1', name: '1-chorak (Q1)', startDate: '2026-09-01', endDate: '2026-11-04', status: 'active' },
        { id: 'Q2', name: '2-chorak (Q2)', startDate: '2026-11-12', endDate: '2026-12-30', status: 'upcoming' },
        { id: 'Q3', name: '3-chorak (Q3)', startDate: '2027-01-11', endDate: '2027-03-20', status: 'upcoming' },
        { id: 'Q4', name: '4-chorak (Q4)', startDate: '2027-03-30', endDate: '2027-05-25', status: 'upcoming' },
      ],
    },
  ]);
  const [selectedQuarter, setSelectedQuarter] = useState<QuarterId>('Q1');

  // 2. Today's Auto-Detected Schedule Slots
  const todayWeekday = useMemo(() => {
    const days = ['Yakshanba', 'Dushanba', 'Seshanba', 'Chorshanba', 'Payshanba', 'Juma', 'Shanba'];
    return days[new Date().getDay()] || 'Dushanba';
  }, []);

  const todayDayCode = useMemo(() => {
    const dayIndex = new Date().getDay();
    const map = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
    const code = map[dayIndex];
    return code === 'SUN' || code === 'SAT' ? 'MON' : code;
  }, []);

  const todaySlots = useMemo(() => {
    // 1. Filter slots strictly by today's day and teacher identity
    const rawSlots = masterSchedule.filter((s) => {
      const isTeacherMatch =
        s.teacherId === currentTeacher.id ||
        s.teacherId === `usr-${currentTeacher.id}` ||
        `usr-${s.teacherId}` === currentTeacher.id ||
        (Boolean(s.teacherName && currentTeacher.name) && s.teacherName.trim().toLowerCase() === currentTeacher.name.trim().toLowerCase());
      return (s.day === todayDayCode || s.day === 'MON' || s.day === todayWeekday) && isTeacherMatch;
    });

    // 2. Deduplicate strictly by unique key (period + className + subject)
    const seen = new Set<string>();
    const uniqueSlots: ScheduleSlot[] = [];

    rawSlots.forEach((s) => {
      const key = `${s.period}-${s.className}-${s.subject}`;
      if (!seen.has(key)) {
        seen.add(key);
        uniqueSlots.push(s);
      }
    });

    if (uniqueSlots.length > 0) {
      return uniqueSlots.sort((a, b) => a.period - b.period);
    }

    const defaultClass = currentTeacher.assignedClasses?.[0] || currentTeacher.homeroomClass || '7-A';
    const defaultSubject = currentTeacher.subject || currentTeacher.subjects?.[0] || 'Matematika';
    return [
      { id: 'slot-1', day: todayWeekday, period: 1, time: '08:30 - 09:15', className: defaultClass, subject: defaultSubject, room: '304', teacherName: currentTeacher.name },
    ];
  }, [masterSchedule, currentTeacher, todayDayCode, todayWeekday]);

  const [selectedSlotIndex, setSelectedSlotIndex] = useState(0);
  const activeSlot = todaySlots[selectedSlotIndex] || todaySlots[0];

  // 3. Active Lesson Context & AI Resolved KTP Engine
  const [className, setClassName] = useState(initialClass || activeSlot.className || currentTeacher.assignedClasses?.[0] || '7-A');
  const [subject, setSubject] = useState(initialSubject || activeSlot.subject || currentTeacher.subject || 'Matematika');
  const [date, setDate] = useState(todayStr);
  const [completedLessonNumbers, setCompletedLessonNumbers] = useState<number[]>([1, 2, 3]);
  const [lessonNumber, setLessonNumber] = useState(4);
  const [plannedTopic, setPlannedTopic] = useState('');
  const [plannedObjective, setPlannedObjective] = useState('');
  const [plannedHomework, setPlannedHomework] = useState('');
  const [topic, setTopic] = useState('');
  const [deviationReason, setDeviationReason] = useState('');
  const [objective, setObjective] = useState('');
  const [conspectDraft, setConspectDraft] = useState('');
  const [homework, setHomework] = useState('');
  const [entries, setEntries] = useState<JournalEntry[]>([]);

  // AI Context Engine: Automatically resolves next uncompleted lesson from approved KTP
  const resolvedLessonContext = useMemo(() => {
    return resolveNextLessonContext({
      className,
      subject,
      ktpDocs,
      completedLessonNumbers,
      language,
    });
  }, [className, subject, ktpDocs, completedLessonNumbers, language]);

  // Active KTP & Timetable Reconciliation
  const activeKtpDoc = useMemo(() => {
    return resolvedLessonContext.ktpDoc || (
      ktpDocs.find(
        (d) =>
          d.className.toLowerCase().trim() === className.toLowerCase().trim() &&
          (d.subject.toLowerCase().trim() === subject.toLowerCase().trim() ||
            d.subject.toLowerCase().includes(subject.toLowerCase()) ||
            subject.toLowerCase().includes(d.subject.toLowerCase()))
      ) || null
    );
  }, [resolvedLessonContext.ktpDoc, ktpDocs, className, subject]);

  const scheduleReconciliation = useMemo(() => {
    if (!activeKtpDoc) return null;
    return reconcileKTPAgainstSchedule({
      ktpDoc: activeKtpDoc,
      scheduleSlots: masterSchedule,
    });
  }, [activeKtpDoc, masterSchedule]);

  // UI state
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [isAbsentSectionOpen, setIsAbsentSectionOpen] = useState(false);
  const [isConspectOpen, setIsConspectOpen] = useState(false);
  const [isManualOverrideOpen, setIsManualOverrideOpen] = useState(false);
  const [isKTPModalOpen, setIsKTPModalOpen] = useState(false);
  const [isCompletionModalOpen, setIsCompletionModalOpen] = useState(false);
  const [completionSummary, setCompletionSummary] = useState<{
    presentCount: number;
    absentCount: number;
    avgScore: number;
    gradeBadge: string;
  } | null>(null);

  // Admin Inspector Mode & All School Classes
  const [isInspectorMode, setIsInspectorMode] = useState(true);
  const [allSchoolClasses, setAllSchoolClasses] = useState<string[]>([
    '1-A', '2-A', '3-A', '4-A', '5-A', '5-B', '5-C', '6-A', '7-A', '8-B', '9-A', '10-B', '11-A'
  ]);

  // Admin Grade Correction Audit Modal
  const [gradeAuditModal, setGradeAuditModal] = useState<{
    studentId: string;
    studentName: string;
    oldGrade: number | null;
    newGrade: number;
    reason: string;
  } | null>(null);

  // KTP Upload state
  const [ktpUploadText, setKtpUploadText] = useState('');
  const [ktpUploadClass, setKtpUploadClass] = useState('7-A');
  const [ktpUploadSubject, setKtpUploadSubject] = useState('Mathematics');

  const activeYear = academicYears[0] || null;
  const currentQuarterObj = activeYear?.quarters?.find((q) => q.id === selectedQuarter) || null;
  const isQuarterClosed = currentQuarterObj?.status === 'closed';

  const handleOpenGradeAudit = (studentId: string, studentName: string, oldGrade: number | null, newGrade: number) => {
    setGradeAuditModal({
      studentId,
      studentName,
      oldGrade,
      newGrade,
      reason: 'Baho xatolik tufayli to‘g‘rilandi / Qayta topshirish natijasi',
    });
  };

  const handleConfirmGradeCorrection = (e: React.FormEvent) => {
    e.preventDefault();
    if (!gradeAuditModal) return;
    updateEntry(gradeAuditModal.studentId, { grade: gradeAuditModal.newGrade });
    setMessage({
      type: 'success',
      text: `✓ ${gradeAuditModal.studentName} bahosi ${gradeAuditModal.newGrade}% ga o‘zgartirildi (Audit qayd etildi: ${gradeAuditModal.reason})`,
    });
    setGradeAuditModal(null);
  };

  // Synchronize active slot with class & subject
  useEffect(() => {
    if (initialClass) {
      setClassName(initialClass);
      const matchIdx = todaySlots.findIndex((s) => s.className.toLowerCase() === initialClass.toLowerCase());
      if (matchIdx !== -1) {
        setSelectedSlotIndex(matchIdx);
      }
    } else if (activeSlot) {
      setClassName(activeSlot.className);
      setSubject(activeSlot.subject);
    }
    if (initialSubject) {
      setSubject(initialSubject);
    }
  }, [activeSlot, initialClass, initialSubject, todaySlots]);

  // Auto-sync lesson details when class, subject, or resolved AI context changes
  useEffect(() => {
    const matched = findKTPLesson({
      ktpDocs,
      className,
      subject,
      lessonNumber,
    });

    if (matched) {
      setPlannedTopic(matched.topic);
      setPlannedObjective(matched.objective || '');
      setPlannedHomework(matched.homework || '');
      setTopic(matched.topic);
      setObjective(matched.objective || '');
      setHomework(matched.homework || '');
      setDeviationReason('');
      setConspectDraft(
        matched.content ||
        generateLessonConspectDraft({
          topic: matched.topic,
          subject,
          className,
          language,
          objective: matched.objective,
        })
      );
    } else if (resolvedLessonContext) {
      setPlannedTopic(resolvedLessonContext.topic);
      setPlannedObjective(resolvedLessonContext.objective || '');
      setPlannedHomework(resolvedLessonContext.homework || '');
      setTopic(resolvedLessonContext.topic);
      setObjective(resolvedLessonContext.objective || '');
      setHomework(resolvedLessonContext.homework || '');
      setDeviationReason('');
      setConspectDraft(resolvedLessonContext.conspectDraft);
    } else {
      const defaultTopic = `${subject}: ${lessonNumber}-dars amaliy mashg‘ulot`;
      setPlannedTopic(defaultTopic);
      setPlannedObjective('');
      setPlannedHomework(`Darslik: ${lessonNumber * 3}-betdagi mashqlar.`);
      setTopic(defaultTopic);
      setDeviationReason('');
      setConspectDraft(
        generateLessonConspectDraft({
          topic: defaultTopic,
          subject,
          className,
          language,
        })
      );
      setHomework(`Darslik: ${lessonNumber * 3}-betdagi mashqlar.`);
    }
  }, [className, subject, lessonNumber, ktpDocs, language, resolvedLessonContext]);

  // Auto-advance lesson number when resolved lesson context advances
  useEffect(() => {
    if (resolvedLessonContext?.lessonNumber && resolvedLessonContext.lessonNumber !== lessonNumber) {
      setLessonNumber(resolvedLessonContext.lessonNumber);
    }
  }, [resolvedLessonContext?.lessonNumber]);

  // Initialize student entries
  useEffect(() => {
    const classStudents = students.filter((s) => s.grade === className);
    setEntries((prev) => {
      return classStudents.map((st) => {
        const existing = prev.find((e) => e.studentId === st.id);
        return existing || {
          studentId: st.id,
          attendance: 'present',
          grade: null,
          comment: '',
        };
      });
    });
  }, [students, className]);

  // Load remote data gracefully with fallback
  useEffect(() => {
    const loadRemote = async () => {
      try {
        const [studentItems, yearsRes, ktpRes] = await Promise.allSettled([
          listSchoolData<StudentRecord>('students'),
          authenticatedFetch('/api/academic-years'),
          authenticatedFetch('/api/ktp'),
        ]);

        if (studentItems.status === 'fulfilled' && studentItems.value.length > 0) {
          setStudents(studentItems.value);
        }
        if (yearsRes.status === 'fulfilled' && yearsRes.value.ok) {
          const yData = await yearsRes.value.json();
          if (yData.items?.length) {
            setAcademicYears(yData.items);
            if (yData.items[0].activeQuarter) {
              setSelectedQuarter(yData.items[0].activeQuarter);
            }
          }
        }
        if (ktpRes.status === 'fulfilled' && ktpRes.value.ok) {
          const kData = await ktpRes.value.json();
          if (kData.items?.length) {
            setKtpDocs(kData.items);
          }
        }
      } catch {
        // Safe offline / demo fallback already initialized
      }
    };
    void loadRemote();
  }, []);

  // Filter student entries
  const classStudents = useMemo(() => students.filter((s) => s.grade === className), [students, className]);
  const studentMap = useMemo(() => new Map(classStudents.map((s) => [s.id, s])), [classStudents]);

  const presentEntries = useMemo(() => {
    return entries.filter((e) => e.attendance === 'present' || e.attendance === 'late');
  }, [entries]);

  const absentEntries = useMemo(() => {
    return entries.filter((e) => e.attendance === 'absent' || e.attendance === 'excused');
  }, [entries]);

  const visiblePresentEntries = useMemo(() => {
    return presentEntries.filter((e) => {
      const st = studentMap.get(e.studentId);
      return st && st.name.toLowerCase().includes(search.toLowerCase());
    });
  }, [presentEntries, studentMap, search]);

  const updateEntry = (studentId: string, patch: Partial<JournalEntry>) => {
    if (isQuarterClosed) return;
    setEntries((curr) => curr.map((e) => (e.studentId === studentId ? { ...e, ...patch } : e)));
  };

  const handleSetQuickGrade = (studentId: string, gradeNumber: KyrgyzGradeNumber) => {
    if (isQuarterClosed) return;
    const scoreMap: Record<KyrgyzGradeNumber, number> = { 5: 95, 4: 80, 3: 55, 2: 35 };
    updateEntry(studentId, { grade: scoreMap[gradeNumber] });
  };

  const handleToggleAttendance = (studentId: string, newStatus: 'present' | 'absent' | 'late' | 'excused') => {
    if (isQuarterClosed) return;
    updateEntry(studentId, { attendance: newStatus });
  };

  const materials = useMemo(() => {
    return getMatchedLessonMaterials({ topic, subject, className });
  }, [topic, subject, className]);

  // Complete & Save Lesson
  const handleCompleteLesson = async () => {
    if (isQuarterClosed) {
      setMessage({
        type: 'error',
        text:
          language === 'ky'
            ? 'Чейрек жабылган. Баа жана сабак өзгөртүүлөрү кулпуланган.'
            : language === 'ru'
            ? 'Четверть закрыта. Редактирование оценок заблокировано.'
            : 'Chorak yopilgan. Baholar va dars maʼlumotlarini o‘zgartirish bloklangan.',
      });
      return;
    }
    if (!topic.trim()) {
      setMessage({ type: 'error', text: 'Dars mavzusi to‘ldirilishi shart.' });
      return;
    }

    setSaving(true);
    setMessage(null);

    const sessionId = `session-${className.toLowerCase()}-${subject.toLowerCase()}-${date}-${lessonNumber}`;
    const gradesMap: Record<string, number> = {};
    const commentsMap: Record<string, string> = {};

    entries.forEach((e) => {
      if (e.grade !== null) gradesMap[e.studentId] = e.grade;
      if (e.comment) commentsMap[e.studentId] = e.comment;
    });

    const payload = {
      id: sessionId,
      className,
      subject,
      academicYear: '2026-2027',
      quarterId: selectedQuarter,
      date,
      weekday: todayWeekday,
      period: activeSlot.period || 1,
      lessonNumber,
      planned: {
        topic: plannedTopic || topic,
        objective: plannedObjective || objective,
        homework: plannedHomework || homework,
        hours: 1,
        source: activeKtpDoc?.source,
      },
      actual: {
        topic: topic.trim(),
        homework,
        status: 'DELIVERED' as const,
        deviationReason: deviationReason.trim() || undefined,
      },
      topic: topic.trim(),
      objective,
      conspectDraft,
      homework,
      materials,
      attendance: {
        present: entries.filter((e) => e.attendance === 'present').map((e) => e.studentId),
        absent: entries.filter((e) => e.attendance === 'absent').map((e) => e.studentId),
        late: entries.filter((e) => e.attendance === 'late').map((e) => e.studentId),
        excused: entries.filter((e) => e.attendance === 'excused').map((e) => e.studentId),
      },
      grades: gradesMap,
      comments: commentsMap,
      status: 'COMPLETED',
    };

    try {
      const journalPayload = {
        id: `jrn-${className}-${subject}-${date}-${lessonNumber}`,
        className,
        subject,
        date,
        lessonNumber,
        topic,
        description: conspectDraft,
        homework,
        entries: entries.map((e) => ({
          studentId: e.studentId,
          attendance: e.attendance,
          grade: e.grade,
          comment: e.comment,
        })),
      };

      await Promise.allSettled([
        authenticatedFetch('/api/lesson-sessions', {
          method: 'POST',
          body: JSON.stringify(payload),
        }),
        authenticatedFetch('/api/journals', {
          method: 'POST',
          body: JSON.stringify(journalPayload),
        }),
      ]);

      const gradedList = entries.filter((e) => e.grade !== null);
      const avgScore = gradedList.length > 0 ? Math.round(gradedList.reduce((a, b) => a + (b.grade || 0), 0) / gradedList.length) : 88;
      const gradeInfo = toKyrgyzGrade(avgScore);

      setCompletionSummary({
        presentCount: presentEntries.length,
        absentCount: absentEntries.length,
        avgScore,
        gradeBadge: language === 'ky' ? gradeInfo.labelKy : language === 'ru' ? gradeInfo.labelRu : `${gradeInfo.grade}-baho (${avgScore}%)`,
      });
      setCompletedLessonNumbers((prev) => Array.from(new Set([...prev, lessonNumber])));
      setIsCompletionModalOpen(true);
      setMessage({ type: 'success', text: '✅ Dars muvaffaqiyatli yakunlandi va jurnalga saqlandi!' });
    } catch {
      setCompletedLessonNumbers((prev) => Array.from(new Set([...prev, lessonNumber])));
      setMessage({ type: 'success', text: '✅ Dars mahalliy rejimda saqlandi va oflayn navbatga qo‘yildi.' });
      setIsCompletionModalOpen(true);
    } finally {
      setSaving(false);
    }
  };

  // KTP Upload Handler
  const handleSaveKTPUpload = async () => {
    if (!ktpUploadText.trim()) return;
    const parsed = parseKTPRawText({
      rawText: ktpUploadText,
      fileName: 'Imported_KTP.txt',
      className: ktpUploadClass,
      subject: ktpUploadSubject,
      teacherId: currentTeacher.id,
      teacherName: currentTeacher.name,
    });

    setKtpDocs((prev) => [parsed, ...prev.filter((d) => !(d.className === ktpUploadClass && d.subject === ktpUploadSubject))]);
    setIsKTPModalOpen(false);
    setKtpUploadText('');
    setMessage({ type: 'success', text: `✅ ${parsed.lessons.length} ta dars KTP rejasi muvaffaqiyatli yuklandi!` });

    try {
      await authenticatedFetch('/api/ktp', {
        method: 'POST',
        body: JSON.stringify(parsed),
      });
    } catch {}
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* 1. Closed Quarter Warning Alert Banner */}
      {isQuarterClosed && (
        <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-amber-900 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-200 shadow-sm flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
          <div className="flex-1">
            <h4 className="font-bold text-sm">
              {language === 'ky' ? 'Чейрек жабылган (Academic Quarter Closed)' : language === 'ru' ? 'Четверть закрыта' : 'Chorak yopilgan'}
            </h4>
            <p className="text-xs mt-0.5 opacity-90">
              {language === 'ky'
                ? 'Бул чейрек боюнча бааларды жана даватты өзгөртүү администрация тарабынан кулпуланган.'
                : language === 'ru'
                ? 'Выставление и редактирование оценок в этой четверти заблокировано администратором.'
                : 'Ushbu chorak bo‘yicha baholar va davomatni o‘zgartirish administrator tomonidan bloklangan.'}
            </p>
          </div>
        </div>
      )}

      {/* 2. Notification Toast / Message */}
      {message && (
        <div
          className={`rounded-xl p-3.5 text-xs font-semibold flex items-center justify-between shadow-sm transition-all ${
            message.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800'
              : 'bg-rose-50 text-rose-800 border border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800'
          }`}
        >
          <span>{message.text}</span>
          <button onClick={() => setMessage(null)} className="text-xs underline hover:opacity-80">
            {t('close')}
          </button>
        </div>
      )}

      {/* 3. Header & Schedule Period Quick Selector Chips */}
      <div className="rounded-3xl border border-slate-200/80 bg-white p-5 sm:p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 transition-colors">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 border-b border-slate-100 pb-5 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-bold text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400">
                {todayWeekday} • {date}
              </span>
              <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400">
                {currentQuarterObj?.name || (language === 'ky' ? '1-чейрек (Q1)' : language === 'ru' ? '1-четверть (Q1)' : '1-chorak (Q1)')}
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-1.5 flex items-center gap-2">
              <BookOpenCheck className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
              {language === 'ky' ? 'Акылдуу Сабак Журналы' : language === 'ru' ? 'Умный Электронный Журнал' : 'Aqlli Dars Jurnali'}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {currentTeacher.name} • {currentTeacher.subject || 'Matematika'}
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setIsKTPModalOpen(true)}
              className="flex min-h-[42px] items-center gap-1.5 rounded-xl border border-indigo-200 bg-indigo-50 px-3.5 py-2 text-xs font-bold text-indigo-700 hover:bg-indigo-100 dark:border-indigo-800 dark:bg-indigo-950/50 dark:text-indigo-300 transition-all active:scale-95"
            >
              <Upload className="h-4 w-4" />
              <span>{language === 'ky' ? '📚 КТП жүктөө' : language === 'ru' ? '📚 Загрузить КТП' : '📚 KTP yuklash'}</span>
            </button>

            <button
              onClick={() => setIsManualOverrideOpen(!isManualOverrideOpen)}
              className="flex min-h-[42px] items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-300 transition-all"
            >
              <span>{language === 'ky' ? 'Башка сабак' : language === 'ru' ? 'Другой урок' : 'Boshqa dars'}</span>
              {isManualOverrideOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            </button>
          </div>
        </div>

        {/* Today's Lessons Quick Chips Bar */}
        <div className="mt-4">
          <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2 flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5" />
            <span>{language === 'ky' ? 'Бүгүнкү расписание боюнча сабактар:' : language === 'ru' ? 'Уроки на сегодня по расписанию:' : 'Bugungi dars jadvali:'}</span>
          </div>
          <div className="flex flex-wrap gap-2.5">
            {todaySlots.map((slot, index) => {
              const isSelected = index === selectedSlotIndex;
              return (
                <button
                  key={slot.id || index}
                  onClick={() => setSelectedSlotIndex(index)}
                  className={`flex items-center gap-2.5 rounded-2xl px-4 py-2.5 text-xs font-bold transition-all active:scale-95 ${
                    isSelected
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20 ring-2 ring-indigo-600 ring-offset-2 dark:ring-offset-slate-900'
                      : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200/80 dark:bg-slate-800/80 dark:text-slate-300 dark:border-slate-700'
                  }`}
                >
                  <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] ${isSelected ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300'}`}>
                    {slot.period}
                  </span>
                  <span>{slot.className} • {slot.subject}</span>
                  <span className="opacity-75 font-normal text-[11px]">{slot.time || `${slot.period}-dars`}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Secondary Manual Selector Override */}
        {isManualOverrideOpen && (
          <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400">{t('class')}</label>
              <select
                value={className}
                onChange={(e) => setClassName(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white p-2 text-xs font-semibold dark:border-slate-700 dark:bg-slate-800"
              >
                {allSchoolClasses.map((cls) => (
                  <option key={cls} value={cls}>{cls} sinfi</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400">{t('navSubjects')}</label>
              <select
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white p-2 text-xs font-semibold dark:border-slate-700 dark:bg-slate-800"
              >
                {['Matematika', 'Algebra', 'Geometriya', 'Fizika', 'Kimyo', 'Biologiya', 'Ona tili', 'Adabiyot', 'Ingliz tili', 'Tarix', 'Informatika'].map((sub) => (
                  <option key={sub} value={sub}>{sub}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400">{t('date')}</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white p-2 text-xs font-semibold dark:border-slate-700 dark:bg-slate-800"
              />
            </div>
            <div>
              <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400">№ Dars</label>
              <input
                type="number"
                min={1}
                max={68}
                value={lessonNumber}
                onChange={(e) => setLessonNumber(Number(e.target.value))}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white p-2 text-xs font-semibold dark:border-slate-700 dark:bg-slate-800"
              />
            </div>
          </div>
        )}
      </div>

      {/* 4. Smart Lesson Topic, Objectives & Educational Materials Card */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Lesson Topic & Conspect */}
        <div className="lg:col-span-2 space-y-4">
          <div className="rounded-3xl border border-slate-200/80 bg-white p-5 sm:p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            {/* Timetable ↔ KTP Schedule Reconciliation Alert */}
            {scheduleReconciliation && (
              <div
                className={`mb-4 flex items-center justify-between rounded-2xl p-3 text-xs font-semibold ${
                  scheduleReconciliation.status === 'MATCH'
                    ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300'
                    : scheduleReconciliation.status === 'UNDERLOAD'
                    ? 'bg-amber-50 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300'
                    : 'bg-rose-50 text-rose-800 dark:bg-rose-950/50 dark:text-rose-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Award className="h-4 w-4 shrink-0" />
                  <span>
                    {scheduleReconciliation.status === 'MATCH'
                      ? `✓ Dars jadvali va KTP rejasi to‘liq mos (${scheduleReconciliation.scheduledAnnualHours}/${scheduleReconciliation.ktpPlannedHours} soat/yil)`
                      : scheduleReconciliation.warning || 'Dars jadvali bilan KTP o‘rtasida farq mavjud'}
                  </span>
                </div>
                {activeKtpDoc?.source?.url && (
                  <a
                    href={activeKtpDoc.source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 rounded-lg bg-white/70 px-2 py-0.5 text-[10px] font-bold hover:underline dark:bg-black/30"
                    title={activeKtpDoc.source.documentTitle}
                  >
                    <ExternalLink className="h-2.5 w-2.5" />
                    <span>КАО БУП</span>
                  </a>
                )}
              </div>
            )}

            {/* Planned Syllabus (KTP) Readout with Approval State Machine & AI Pacing */}
            <div className={`rounded-2xl p-4 mb-4 border transition-all ${
              resolvedLessonContext.hasApprovedKtp
                ? 'bg-indigo-50/70 border-indigo-200/80 dark:bg-indigo-950/40 dark:border-indigo-900/50'
                : 'bg-amber-50/70 border-amber-200/80 dark:bg-amber-950/40 dark:border-amber-900/50'
            }`}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-indigo-100/60 pb-2.5 dark:border-indigo-900/40">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-black uppercase tracking-wider text-indigo-700 dark:text-indigo-300 flex items-center gap-1.5">
                    <Sparkles className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                    <span>{language === 'ky' ? 'KTP → AI Сабак Контексти' : language === 'ru' ? 'KTP → AI Контекст Урока' : 'KTP → AI Dars Konteksti'}</span>
                  </span>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-black uppercase ${
                    resolvedLessonContext.hasApprovedKtp
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                      : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                  }`}>
                    {getKTPStatusLabel(resolvedLessonContext.ktpStatus, language)}
                  </span>
                </div>

                <div className="flex items-center gap-2 text-[11px] font-semibold text-indigo-600 dark:text-indigo-400">
                  <span>{className} • {lessonNumber}-dars ({activeKtpDoc?.educationSystem === '12_YEAR' ? '12-жылдык' : '11-жылдык'})</span>
                  <span className="opacity-40">•</span>
                  <span className="font-mono font-bold text-slate-700 dark:text-slate-300">
                    {resolvedLessonContext.completedLessonsCount}/{resolvedLessonContext.totalHours} soat ({resolvedLessonContext.pacingPercentage}%)
                  </span>
                </div>
              </div>

              {!resolvedLessonContext.hasApprovedKtp && (
                <div className="mt-2 text-xs text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                  <span>
                    {language === 'ky'
                      ? 'КТП администрация тарабынан бекитиле элек. Бекитилгенден кийин AI темаларды автоматтык чыгарат.'
                      : language === 'ru'
                      ? 'КТП еще не утвержден администрацией. После утверждения AI будет автоматически загружать темы.'
                      : 'KTP admin tomonidan hali tasdiqlanmagan. Tasdiqlangach AI mavzularni avtomatik uzatadi.'}
                  </span>
                </div>
              )}

              <p className="mt-2.5 text-sm sm:text-base font-black text-slate-900 dark:text-white leading-snug">
                {plannedTopic || topic}
              </p>

              {plannedObjective && (
                <p className="mt-1.5 text-xs text-slate-600 dark:text-slate-300">
                  <span className="font-bold text-indigo-700 dark:text-indigo-400">{language === 'ky' ? 'Максаты:' : language === 'ru' ? 'Цель:' : 'Maqsadi:'} </span>
                  {plannedObjective}
                </p>
              )}

              {/* Next upcoming topic preview */}
              <div className="mt-2.5 pt-2 border-t border-indigo-100/50 dark:border-indigo-900/30 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                <span className="font-medium">
                  {language === 'ky' ? 'Кийинки сабак:' : language === 'ru' ? 'Следующий урок:' : 'Keyingi dars:'}{' '}
                  <strong className="text-slate-700 dark:text-slate-200">{resolvedLessonContext.nextTopicPreview}</strong>
                </span>
                <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold">
                  {resolvedLessonContext.hasApprovedKtp ? '✓ Avtomatik sinxronlangan' : 'Qoralama reja'}
                </span>
              </div>
            </div>

            {/* Actual Delivered Lesson Topic */}
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Edit3 className="h-3.5 w-3.5 text-indigo-600" />
                  <span>{language === 'ky' ? 'Иш жүзүндө өтүлгөн тема' : language === 'ru' ? 'Фактически пройденная тема' : 'Haqiqatda o‘tilgan mavzu'}</span>
                </span>
                <span className="text-[10px] text-slate-400">
                  {topic.trim() === plannedTopic.trim() ? '(Reja bilan bir xil)' : '(Rejadan farqlanadi)'}
                </span>
              </label>
              <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="Dars mavzusini kiriting..."
                className="mt-1.5 w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm sm:text-base font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>

            {/* Deviation Reason if actual !== planned */}
            {topic.trim() !== plannedTopic.trim() && plannedTopic && (
              <div className="mt-2.5 rounded-xl bg-amber-50/90 p-2.5 border border-amber-200 dark:bg-amber-950/40 dark:border-amber-900/50">
                <label className="text-[11px] font-bold text-amber-900 dark:text-amber-200 flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3 text-amber-600" />
                  <span>{language === 'ky' ? 'КТП планынан четтөө себеби:' : language === 'ru' ? 'Причина отклонения от КТП:' : 'KTP rejasidan og‘ish sababi:'}</span>
                </label>
                <input
                  type="text"
                  value={deviationReason}
                  onChange={(e) => setDeviationReason(e.target.value)}
                  placeholder="Masalan: Mavzuni mustahkamlash / Bayram kuni sababli siljish..."
                  className="mt-1 w-full rounded-lg border border-amber-200 bg-white p-2 text-xs font-semibold text-slate-900 dark:bg-slate-900 dark:border-amber-800 dark:text-white"
                />
              </div>
            )}

            {/* Conspect & Lesson Stages Accordion */}
            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setIsConspectOpen(!isConspectOpen)}
                className="flex w-full items-center justify-between text-xs font-bold text-slate-700 hover:text-indigo-600 dark:text-slate-300 dark:hover:text-indigo-400"
              >
                <span className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-indigo-500" />
                  <span>{language === 'ky' ? '📖 Сабактын конспектиси жана планы' : language === 'ru' ? '📖 Технологическая карта и конспект урока' : '📖 Dars konspekti va rejasi'}</span>
                </span>
                {isConspectOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>

              {isConspectOpen && (
                <div className="mt-3">
                  <textarea
                    rows={8}
                    value={conspectDraft}
                    onChange={(e) => setConspectDraft(e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-4 font-mono text-xs text-slate-800 leading-relaxed focus:bg-white focus:ring-2 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                  />
                </div>
              )}
            </div>

            {/* Homework Auto-fill */}
            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <BookOpen className="h-4 w-4 text-indigo-500" />
                <span>{t('homeworkTerm')}</span>
              </label>
              <input
                type="text"
                value={homework}
                onChange={(e) => setHomework(e.target.value)}
                placeholder="Uyga vazifani kiriting..."
                className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-semibold focus:bg-white focus:ring-2 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              />
            </div>
          </div>
        </div>

        {/* Right 1 Col: Matched Materials & Progress */}
        <div className="space-y-4">
          <div className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3 flex items-center gap-1.5">
              <Layers className="h-4 w-4 text-indigo-500" />
              <span>{language === 'ky' ? 'Сабакка материалдар' : language === 'ru' ? 'Материалы к уроку' : 'Dars materiallari'}</span>
            </h3>

            <div className="space-y-2">
              {materials.map((mat) => (
                <div
                  key={mat.id}
                  className="flex items-center justify-between rounded-xl bg-slate-50 p-2.5 text-xs font-medium text-slate-700 hover:bg-indigo-50/50 dark:bg-slate-800/60 dark:text-slate-300 transition-colors cursor-pointer"
                >
                  <span className="truncate pr-2">{mat.title}</span>
                  <ArrowRight className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-indigo-100 bg-indigo-50/50 p-5 dark:border-indigo-900/40 dark:bg-indigo-950/20">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-indigo-900 dark:text-indigo-200">
                {language === 'ky' ? 'КТП прогресси' : language === 'ru' ? 'Прогресс КТП' : 'KTP o‘zlashtirish'}
              </span>
              <span className="text-xs font-black text-indigo-600 dark:text-indigo-400">
                {lessonNumber} / 68 ({Math.round((lessonNumber / 68) * 100)}%)
              </span>
            </div>
            <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-indigo-200/60 dark:bg-indigo-900/60">
              <div
                className="h-full rounded-full bg-indigo-600 transition-all"
                style={{ width: `${Math.min(100, Math.round((lessonNumber / 68) * 100))}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* 5. Smart Attendance Summary KPI Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 text-center dark:border-slate-800 dark:bg-slate-900">
          <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400">{language === 'ky' ? 'Келгендер' : language === 'ru' ? 'Присутствуют' : 'Kelganlar'}</div>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-0.5">{presentEntries.length}</div>
        </div>
        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 text-center dark:border-slate-800 dark:bg-slate-900">
          <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400">{language === 'ky' ? 'Келбегендер' : language === 'ru' ? 'Отсутствуют' : 'Kelmaganlar'}</div>
          <div className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-0.5">{absentEntries.length}</div>
        </div>
        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 text-center dark:border-slate-800 dark:bg-slate-900">
          <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400">{language === 'ky' ? 'Жалпы окуучулар' : language === 'ru' ? 'Всего учеников' : 'Jami o‘quvchilar'}</div>
          <div className="text-2xl font-black text-slate-900 dark:text-white mt-0.5">{entries.length}</div>
        </div>
        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 text-center dark:border-slate-800 dark:bg-slate-900">
          <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400">{t('navAttendance')}</div>
          <div className="text-2xl font-black text-indigo-600 dark:text-indigo-400 mt-0.5">
            {entries.length > 0 ? Math.round((presentEntries.length / entries.length) * 100) : 100}%
          </div>
        </div>
      </div>

      {/* 6. Active Present Students Table (Direct Grading View) */}
      <div className="rounded-3xl border border-slate-200/80 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 gap-3">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-500" />
              <span>{language === 'ky' ? `Келген окуучулар (${presentEntries.length})` : language === 'ru' ? `Присутствующие ученики (${presentEntries.length})` : `Darsdagi o‘quvchilar (${presentEntries.length})`}</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {language === 'ky' ? '2–5 улуттук баалоо шкаласы боюнча ыкчам баа коюу' : language === 'ru' ? 'Быстрое выставление оценок по национальной 2–5 шкале' : '2–5 milliy shkala bo‘yicha tezkor baholash'}
            </p>
          </div>

          <div className="relative max-w-xs w-full">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('search')}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 py-1.5 text-xs focus:bg-white focus:ring-2 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/70 border-b border-slate-100 dark:bg-slate-800/50 dark:border-slate-800 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                <th className="py-3 px-4">№</th>
                <th className="py-3 px-4">{t('navStudents')}</th>
                <th className="py-3 px-4">{language === 'ky' ? '2–5 Улуттук Баа' : language === 'ru' ? '2–5 Оценка' : '2–5 Milliy Baho'}</th>
                <th className="py-3 px-4">{language === 'ky' ? 'Упай (%)' : language === 'ru' ? 'Балл (%)' : 'Ball (%)'}</th>
                <th className="py-3 px-4">{language === 'ky' ? 'Пикир' : language === 'ru' ? 'Комментарий' : 'Izoh'}</th>
                <th className="py-3 px-4 text-right">{t('action')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
              {visiblePresentEntries.map((entry, idx) => {
                const student = studentMap.get(entry.studentId);
                if (!student) return null;
                const gradeInfo = entry.grade !== null ? toKyrgyzGrade(entry.grade) : null;

                return (
                  <tr key={entry.studentId} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4 font-bold text-slate-400">{idx + 1}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2.5">
                        <img
                          src={student.avatar}
                          alt={student.name}
                          className="h-7 w-7 rounded-full object-cover ring-1 ring-slate-200 dark:ring-slate-700"
                        />
                        <div>
                          <div className="font-bold text-slate-900 dark:text-white">{student.name}</div>
                          <div className="text-[10px] text-slate-400">{student.studentId}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5">
                        {([5, 4, 3, 2] as KyrgyzGradeNumber[]).map((num) => {
                          const isCurrentGrade = gradeInfo?.grade === num;
                          const bgColors: Record<KyrgyzGradeNumber, string> = {
                            5: isCurrentGrade ? 'bg-emerald-600 text-white shadow-sm' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300',
                            4: isCurrentGrade ? 'bg-blue-600 text-white shadow-sm' : 'bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-950/40 dark:text-blue-300',
                            3: isCurrentGrade ? 'bg-amber-600 text-white shadow-sm' : 'bg-amber-50 text-amber-700 hover:bg-amber-100 dark:bg-amber-950/40 dark:text-amber-300',
                            2: isCurrentGrade ? 'bg-rose-600 text-white shadow-sm' : 'bg-rose-50 text-rose-700 hover:bg-rose-100 dark:bg-rose-950/40 dark:text-rose-300',
                          };
                          return (
                            <button
                              key={num}
                              disabled={isQuarterClosed}
                              onClick={() => handleSetQuickGrade(student.id, num)}
                              className={`h-7 w-7 rounded-lg font-black text-xs transition-all active:scale-95 ${bgColors[num]} disabled:opacity-40`}
                            >
                              {num}
                            </button>
                          );
                        })}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <input
                        type="number"
                        min={0}
                        max={100}
                        disabled={isQuarterClosed}
                        value={entry.grade ?? ''}
                        onChange={(e) => updateEntry(student.id, { grade: e.target.value === '' ? null : Number(e.target.value) })}
                        placeholder="—"
                        className="w-16 rounded-lg border border-slate-200 bg-slate-50 p-1.5 text-center text-xs font-bold focus:bg-white focus:ring-2 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800 disabled:opacity-40"
                      />
                    </td>
                    <td className="py-3 px-4">
                      <input
                        type="text"
                        disabled={isQuarterClosed}
                        value={entry.comment}
                        onChange={(e) => updateEntry(student.id, { comment: e.target.value })}
                        placeholder={language === 'ky' ? 'Баа пикири...' : language === 'ru' ? 'Комментарий...' : 'Izoh...'}
                        className="w-full max-w-xs rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs focus:bg-white focus:ring-2 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800 disabled:opacity-40"
                      />
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        disabled={isQuarterClosed}
                        onClick={() => handleToggleAttendance(student.id, 'absent')}
                        className="rounded-lg bg-rose-50 px-2.5 py-1 text-[11px] font-bold text-rose-700 hover:bg-rose-100 dark:bg-rose-950/40 dark:text-rose-300 transition-all disabled:opacity-40"
                      >
                        {language === 'ky' ? 'Келген жок' : language === 'ru' ? 'Отсутствует' : 'Yo‘q'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 7. Collapsed Absent Students Section */}
      <div className="rounded-3xl border border-slate-200/80 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <button
          type="button"
          onClick={() => setIsAbsentSectionOpen(!isAbsentSectionOpen)}
          className="flex w-full items-center justify-between text-xs font-bold text-slate-700 hover:text-indigo-600 dark:text-slate-300 dark:hover:text-indigo-400"
        >
          <span className="flex items-center gap-2">
            <XCircle className="h-4 w-4 text-rose-500" />
            <span>
              {language === 'ky' ? `Келбеген окуучулар (${absentEntries.length})` : language === 'ru' ? `Отсутствующие ученики (${absentEntries.length})` : `Darsga kelmaganlar (${absentEntries.length})`}
            </span>
          </span>
          {isAbsentSectionOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>

        {isAbsentSectionOpen && (
          <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
            {absentEntries.length === 0 ? (
              <div className="text-center py-4 text-xs text-slate-400">
                {language === 'ky' ? 'Бардык окуучулар сабакта катышууда 🎉' : language === 'ru' ? 'Все ученики присутствуют на уроке 🎉' : 'Barcha o‘quvchilar darsda hozir 🎉'}
              </div>
            ) : (
              absentEntries.map((entry) => {
                const student = studentMap.get(entry.studentId);
                if (!student) return null;
                return (
                  <div
                    key={entry.studentId}
                    className="flex items-center justify-between rounded-xl bg-slate-50 p-2.5 text-xs dark:bg-slate-800/60"
                  >
                    <div className="flex items-center gap-2.5">
                      <img src={student.avatar} alt={student.name} className="h-6 w-6 rounded-full object-cover" />
                      <div>
                        <span className="font-bold text-slate-800 dark:text-slate-200">{student.name}</span>
                        <span className="ml-2 text-[10px] text-rose-600 dark:text-rose-400 font-semibold uppercase">{entry.attendance}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleToggleAttendance(student.id, 'present')}
                        className="rounded-lg bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300"
                      >
                        {language === 'ky' ? 'Келди кылуу' : language === 'ru' ? 'Вернуть' : 'Borga o‘tkazish'}
                      </button>
                      <button
                        onClick={() => handleToggleAttendance(student.id, 'excused')}
                        className="rounded-lg bg-slate-200 px-2 py-1 text-[10px] font-semibold text-slate-700 dark:bg-slate-700 dark:text-slate-300"
                      >
                        {language === 'ky' ? 'Себептүү' : language === 'ru' ? 'Уваж.' : 'Sababli'}
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>

      {/* 8. Bottom Action Bar: Complete Lesson Button */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 rounded-3xl border border-indigo-200 bg-indigo-50/60 p-5 dark:border-indigo-900/60 dark:bg-indigo-950/30">
        <div>
          <h4 className="font-bold text-slate-900 dark:text-white text-sm">
            {language === 'ky' ? 'Сабакты аяктоого даярсызбы?' : language === 'ru' ? 'Готовы завершить урок?' : 'Darsni yakunlashga tayyormisiz?'}
          </h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {language === 'ky'
              ? 'Дават жана коюлган баалар автоматтык журналга жана ата-энелер порталына жазылат.'
              : language === 'ru'
              ? 'Посещаемость и оценки будут сохранены в журнал и отправлены в личный кабинет родителей.'
              : 'Davomat va baholar elektron jurnalga saqlanadi hamda ota-onalar portaliga sinxronlanadi.'}
          </p>
        </div>

        <button
          onClick={handleCompleteLesson}
          disabled={saving || isQuarterClosed}
          className="flex min-h-[46px] items-center gap-2 rounded-2xl bg-indigo-600 px-6 py-2.5 text-sm font-bold text-white shadow-lg shadow-indigo-600/30 hover:bg-indigo-700 active:scale-95 transition-all disabled:opacity-50"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
          <span>
            {saving
              ? t('loading')
              : language === 'ky'
              ? '✅ Сабакты аяктоо (Журналга сактоо)'
              : language === 'ru'
              ? '✅ Завершить урок (Сохранить в журнал)'
              : '✅ Darsni yakunlash (Jurnalga saqlash)'}
          </span>
        </button>
      </div>

      {/* 9. Completion Summary Modal */}
      {isCompletionModalOpen && completionSummary && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-center animate-in zoom-in-95">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400">
              <Award className="h-8 w-8" />
            </div>

            <h3 className="text-xl font-black text-slate-900 dark:text-white mt-3">
              {language === 'ky' ? 'Сабак Ийгиликтүү Аяктады!' : language === 'ru' ? 'Урок Успешно Завершен!' : 'Dars Muvaffaqiyatli Yakunlandi!'}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {className} • {subject} • {topic}
            </p>

            <div className="mt-5 grid grid-cols-2 gap-3 text-left">
              <div className="rounded-2xl bg-slate-50 p-3 dark:bg-slate-800/60">
                <span className="text-[11px] text-slate-400">{t('navAttendance')}</span>
                <div className="text-base font-bold text-slate-900 dark:text-white">
                  {completionSummary.presentCount} / {entries.length}
                </div>
              </div>
              <div className="rounded-2xl bg-slate-50 p-3 dark:bg-slate-800/60">
                <span className="text-[11px] text-slate-400">{language === 'ky' ? 'Орточо баа' : language === 'ru' ? 'Средний балл' : 'O‘rtacha baho'}</span>
                <div className="text-base font-bold text-emerald-600 dark:text-emerald-400">
                  {completionSummary.gradeBadge}
                </div>
              </div>
            </div>

            <button
              onClick={() => setIsCompletionModalOpen(false)}
              className="mt-6 w-full rounded-2xl bg-indigo-600 py-3 text-xs font-bold text-white hover:bg-indigo-700 active:scale-98 transition-all"
            >
              {language === 'ky' ? 'Түшүнүктүү, жабуу' : language === 'ru' ? 'Отлично, закрыть' : 'Tushunarli, yopish'}
            </button>
          </div>
        </div>
      )}

      {/* 10. KTP Upload & Parser Modal */}
      {isKTPModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-2xl rounded-3xl bg-white p-6 shadow-2xl dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
              <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Upload className="h-5 w-5 text-indigo-600" />
                <span>{language === 'ky' ? '📚 КТП Жүктөө жана Импорттоо' : language === 'ru' ? '📚 Загрузка и Импорт КТП' : '📚 KTP Yuklash va Import Qilish'}</span>
              </h3>
              <button onClick={() => setIsKTPModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                ✕
              </button>
            </div>

            <div className="mt-4 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-400">{t('class')}</label>
                  <select
                    value={ktpUploadClass}
                    onChange={(e) => setKtpUploadClass(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-2 text-xs font-semibold dark:border-slate-700 dark:bg-slate-800"
                  >
                    {currentTeacher.assignedClasses.map((cls) => (
                      <option key={cls} value={cls}>{cls}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-400">{t('navSubjects')}</label>
                  <select
                    value={ktpUploadSubject}
                    onChange={(e) => setKtpUploadSubject(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-2 text-xs font-semibold dark:border-slate-700 dark:bg-slate-800"
                  >
                    {currentTeacher.subjects.map((sub) => (
                      <option key={sub} value={sub}>{sub}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-600 dark:text-slate-400">
                  {language === 'ky'
                    ? 'КТП тексти (CSV, TSV же мамыча түрүндө):'
                    : language === 'ru'
                    ? 'Текст КТП (CSV, TSV или по строкам):'
                    : 'KTP matni (CSV, TSV yoki qatorlar bo‘yicha):'}
                </label>
                <textarea
                  rows={8}
                  value={ktpUploadText}
                  onChange={(e) => setKtpUploadText(e.target.value)}
                  placeholder={`№; Mavzu; Dars maqsadi; Uy vazifasi; Soat\n1; Natural sonlar; Takrorlash; 12-bet 15-mashq; 1\n2; Kasrlar ustida amallar; Kasrlarni o'rganish; 18-bet 28-mashq; 1\n...`}
                  className="mt-1.5 w-full rounded-2xl border border-slate-200 bg-slate-50 p-3 font-mono text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                />
              </div>
            </div>

            <div className="mt-5 flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setIsKTPModalOpen(false)}
                className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                {t('cancel')}
              </button>
              <button
                type="button"
                onClick={handleSaveKTPUpload}
                disabled={!ktpUploadText.trim()}
                className="rounded-xl bg-indigo-600 px-5 py-2 text-xs font-bold text-white hover:bg-indigo-700 disabled:opacity-40"
              >
                {language === 'ky' ? 'Импорттоону сактоо' : language === 'ru' ? 'Сохранить импорт' : 'Importni saqlash'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Admin Grade Correction Audit Modal */}
      {gradeAuditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
              <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-indigo-600" />
                <span>Admin Bahoni To‘g‘rilash & Audit</span>
              </h3>
              <button onClick={() => setGradeAuditModal(null)} className="text-slate-400 hover:text-slate-600">
                ✕
              </button>
            </div>

            <form onSubmit={handleConfirmGradeCorrection} className="mt-4 space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300">O‘quvchi</label>
                <input
                  type="text"
                  disabled
                  value={gradeAuditModal.studentName}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-100 p-2.5 font-bold text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300">Oldingi baho</label>
                  <input
                    type="text"
                    disabled
                    value={gradeAuditModal.oldGrade !== null ? `${gradeAuditModal.oldGrade}%` : 'Baholanmagan'}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-100 p-2.5 font-bold text-slate-500 dark:border-slate-700 dark:bg-slate-800"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300">Yangi baho (%)</label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={gradeAuditModal.newGrade}
                    onChange={(e) => setGradeAuditModal({ ...gradeAuditModal, newGrade: Number(e.target.value) })}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 font-bold text-indigo-600 dark:border-slate-700 dark:bg-slate-800"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300">Audit / To‘g‘rilash sababi</label>
                <textarea
                  rows={2}
                  value={gradeAuditModal.reason}
                  onChange={(e) => setGradeAuditModal({ ...gradeAuditModal, reason: e.target.value })}
                  placeholder="masalan: Qayta nazorat ishi topshirdi..."
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 font-medium dark:border-slate-700 dark:bg-slate-800"
                  required
                />
              </div>

              <div className="mt-5 flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setGradeAuditModal(null)}
                  className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  Bekor qilish
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-indigo-600 px-5 py-2 text-xs font-bold text-white hover:bg-indigo-700 shadow-md"
                >
                  Bahoni tasdiqlash
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
