import React, { useState, useMemo, useEffect } from 'react';
import {
  Calendar,
  Clock,
  Users,
  CheckCircle2,
  AlertCircle,
  FileText,
  BookOpen,
  Award,
  Plus,
  ArrowRight,
  Sparkles,
  Download,
  Upload,
  Check,
  X,
  Send,
  CalendarCheck,
  FolderKanban,
  FileSpreadsheet,
  GraduationCap,
  ChevronRight,
  Filter,
  Eye,
  MessageSquare,
  Phone,
  ShieldCheck,
  Lock,
} from 'lucide-react';
import { AppLanguage, ScheduleSlot, StudentRecord, TeacherRecord, UserProfile, HomeworkAssignment } from '../../types';
import { useI18n } from '../../lib/i18n';
import { authenticatedFetch, saveLessonSession } from '../../lib/api';
import {
  SEED_KTP_DOCUMENTS,
  resolveNextLessonContext,
  isKTPApproved,
  getKTPStatusLabel,
} from '../../lib/ktpEngine';

import { listSchoolData } from '../../lib/schoolRepository';

interface TeacherDashboardProps {
  language: AppLanguage;
  onNavigate: (tabId: string) => void;
  onSelectClassWorkspace?: (className: string) => void;
  masterSchedule?: ScheduleSlot[];
  teachers?: TeacherRecord[];
  currentUser?: UserProfile;
}

interface QuickAttendanceItem {
  id: string;
  studentName: string;
  status: 'present' | 'absent' | 'excused' | 'late';
  note?: string;
}

interface TeacherHomeworkItem {
  id: string;
  className: string;
  subject: string;
  topic: string;
  deadline: string;
  assignedDate: string;
  totalAssigned: number;
  submittedCount: number;
  description: string;
}

interface SubmittedHomeworkReview {
  id: string;
  homeworkId: string;
  studentName: string;
  className: string;
  submittedAt: string;
  status: 'pending' | 'graded';
  score?: number;
  feedback?: string;
  fileAttachment?: string;
}

interface LessonPlanItem {
  id: string;
  lessonNumber: number;
  week: number;
  topic: string;
  date: string;
  status: 'completed' | 'current' | 'planned';
  hasPresentation?: boolean;
  hasWorksheet?: boolean;
  hasTest?: boolean;
}

export const TeacherDashboard: React.FC<TeacherDashboardProps> = ({
  language,
  onNavigate,
  onSelectClassWorkspace,
  masterSchedule = [],
  teachers = [],
  currentUser,
}) => {
  const t = useI18n(language);

  const teacher: TeacherRecord = useMemo(() => {
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

  const assignedClassesList = useMemo(() => {
    if (teacher.assignedClasses && teacher.assignedClasses.length > 0) {
      return teacher.assignedClasses;
    }
    if (teacher.homeroomClass) {
      return [teacher.homeroomClass];
    }
    return [];
  }, [teacher]);

  // Live Database State
  const [allStudents, setAllStudents] = useState<StudentRecord[]>([]);
  const [liveDashboardMetrics, setLiveDashboardMetrics] = useState<any>(null);
  const [scheduleViewScope, setScheduleViewScope] = useState<'my' | 'school'>('my');

  // Active Main Sub-Tab in Teacher Workspace
  const [activeTab, setActiveTab] = useState<'schedule' | 'attendance' | 'gradebook' | 'homework' | 'lesson-plans' | 'homeroom'>('schedule');

  // Filter Selectors
  const [selectedClass, setSelectedClass] = useState<string>(assignedClassesList[0] || '7-A');
  const [selectedQuarter, setSelectedQuarter] = useState('1-chorak');

  useEffect(() => {
    if (assignedClassesList.length > 0 && !assignedClassesList.includes(selectedClass)) {
      setSelectedClass(assignedClassesList[0]);
    }
  }, [assignedClassesList, selectedClass]);

  // Toast Notification
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ type, text });
    setTimeout(() => setToastMessage(null), 4000);
  };

  // 1-Click Quick Attendance Trackers
  const [quickAttendanceRecorded, setQuickAttendanceRecorded] = useState<Record<string, boolean>>({});
  const [completedTopics, setCompletedTopics] = useState<Record<string, boolean>>({
    'slot-1': true,
  });

  // Calculate Today's Date & Day
  const todayFormatted = useMemo(() => {
    const d = new Date();
    const daysUz = ['Yakshanba', 'Dushanba', 'Seshanba', 'Chorshanba', 'Payshanba', 'Juma', 'Shanba'];
    const monthsUz = ['Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun', 'Iyul', 'Avgust', 'Sentabr', 'Oktabr', 'Noyabr', 'Dekabr'];
    return {
      dayName: daysUz[d.getDay()],
      dateStr: `${d.getDate()}-${monthsUz[d.getMonth()]}, ${d.getFullYear()}-yil`,
    };
  }, []);

  // Today's Day Code for Timetable
  const todayDayCode = useMemo(() => {
    const dayIndex = new Date().getDay();
    const map = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
    const code = map[dayIndex];
    return code === 'SUN' || code === 'SAT' ? 'MON' : code;
  }, []);

  // Check if current time falls in a slot's time window
  const isTimeInSlot = (timeRange: string) => {
    try {
      const now = new Date();
      const currentMin = now.getHours() * 60 + now.getMinutes();
      const [startStr, endStr] = timeRange.split('-').map((s) => s.trim());
      if (!startStr || !endStr) return false;
      const [sH, sM] = startStr.split(':').map(Number);
      const [eH, eM] = endStr.split(':').map(Number);
      const startMin = sH * 60 + sM;
      const endMin = eH * 60 + eM;
      return currentMin >= startMin && currentMin <= endMin;
    } catch {
      return false;
    }
  };

  const [ktpDocsList, setKtpDocsList] = useState(SEED_KTP_DOCUMENTS);

  // Fetch canonical live students & KTP from API and repository
  useEffect(() => {
    listSchoolData<StudentRecord>('students')
      .then((items) => {
        if (items && items.length > 0) {
          setAllStudents(items);
        }
      })
      .catch(() => undefined);

    authenticatedFetch('/api/teacher/dashboard')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) setLiveDashboardMetrics(data);
      })
      .catch(() => undefined);

    authenticatedFetch('/api/ktp')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.items?.length) setKtpDocsList(data.items);
      })
      .catch(() => undefined);
  }, [teacher.id]);

  // Derive Today's Lessons for this Teacher with AI-resolved KTP Topics
  const teacherSpecificSlots = useMemo(() => {
    const rawSlots = masterSchedule.filter((s) => {
      const isTeacherMatch =
        s.teacherId === teacher.id ||
        s.teacherId === `usr-${teacher.id}` ||
        `usr-${s.teacherId}` === teacher.id ||
        (Boolean(s.teacherName && teacher.name) && s.teacherName.trim().toLowerCase() === teacher.name.trim().toLowerCase());
      return (s.day === todayDayCode || s.day === 'MON' || s.day === todayFormatted.dayName) && isTeacherMatch;
    });

    const seen = new Set<string>();
    const uniqueSlots: ScheduleSlot[] = [];

    rawSlots.forEach((s) => {
      const key = `${s.period}-${s.className}-${s.subject}`;
      if (!seen.has(key)) {
        seen.add(key);
        uniqueSlots.push(s);
      }
    });

    return uniqueSlots.sort((a, b) => a.period - b.period);
  }, [masterSchedule, teacher, todayDayCode, todayFormatted.dayName]);

  // Whole-School Timetable Slots for Today (Strictly Read-Only)
  const wholeSchoolTodaySlots = useMemo(() => {
    return masterSchedule
      .filter((s) => s.day === todayDayCode || s.day === 'MON' || s.day === todayFormatted.dayName)
      .sort((a, b) => a.period - b.period || a.className.localeCompare(b.className));
  }, [masterSchedule, todayDayCode, todayFormatted.dayName]);

  const displayedSlots = scheduleViewScope === 'my' ? teacherSpecificSlots : wholeSchoolTodaySlots;

  const todayLessons = useMemo(() => {
    return displayedSlots.map((s, idx) => {
      const resolved = resolveNextLessonContext({
        className: s.className,
        subject: s.subject,
        ktpDocs: ktpDocsList,
        completedLessonNumbers: [],
        language,
      });

      return {
        id: s.id || `slot-${idx + 1}`,
        period: s.period,
        time: s.time || (idx === 0 ? '08:30 - 09:15' : idx === 1 ? '09:25 - 10:10' : idx === 2 ? '10:20 - 11:05' : '11:15 - 12:00'),
        className: s.className,
        room: s.room || '204-xona',
        subject: s.subject,
        topic: `${resolved.lessonNumber}-dars: ${resolved.topic}`,
        lessonNumber: resolved.lessonNumber,
        ktpStatus: resolved.ktpStatus,
        hasApprovedKtp: resolved.hasApprovedKtp,
        nextTopicPreview: resolved.nextTopicPreview,
        pacingPercentage: resolved.pacingPercentage,
        teacherName: s.teacherName,
        day: s.day,
      };
    });
  }, [displayedSlots, ktpDocsList, language]);

  // 1-Click Quick Attendance Action for Card
  const handleQuickMarkAllPresent = async (slot: { id: string; className: string }) => {
    setQuickAttendanceRecorded((prev) => ({ ...prev, [slot.id]: true }));
    try {
      const studentsInClass = allStudents.filter((s) => s.grade === slot.className);
      const today = new Date().toISOString().slice(0, 10);
      const scheduleSlot = displayedSlots.find((item) => item.id === slot.id);
      if (!scheduleSlot) throw new Error('Schedule slot not found');
      const sessionId = `session-${scheduleSlot.id}-${today}`;
      const classId = scheduleSlot.classId || (studentsInClass[0] as any)?.classId;
      if (!classId) throw new Error('Class ID is missing');
      await saveLessonSession({
        id: sessionId,
        slotId: scheduleSlot.id,
        classId,
        className: scheduleSlot.className,
        subject: scheduleSlot.subject,
        subjectId: scheduleSlot.subjectId,
        date: today,
        weekday: scheduleSlot.day,
        period: scheduleSlot.period,
        lessonNumber: scheduleSlot.lessonNumber || scheduleSlot.period,
        topic: slot.className === scheduleSlot.className ? (scheduleSlot as any).topic || scheduleSlot.subject : scheduleSlot.subject,
        status: 'COMPLETED',
        attendance: { present: studentsInClass.map((s) => s.id), absent: [], late: [], excused: [] },
        grades: {},
        comments: {},
      });
    } catch {
      setQuickAttendanceRecorded((prev) => ({ ...prev, [slot.id]: false }));
      showToast("Davomat saqlanmadi: lesson session/classId talab qilinadi.");
      return;
    }
    showToast(`${slot.className} sinfida barcha o‘quvchilar "Bor" deb qayd etildi va saqlandi!`);
  };

  // Toggle KTP Topic Completed
  const handleToggleTopicCompleted = (slotId: string, topicName: string) => {
    const isNowCompleted = !completedTopics[slotId];
    setCompletedTopics((prev) => ({ ...prev, [slotId]: isNowCompleted }));
    if (isNowCompleted) {
      showToast(`"${topicName}" mavzusi "O‘tildi" deb belgilandi!`);
    } else {
      showToast(`"${topicName}" mavzusi "Rejada" holatiga qaytarildi.`);
    }
  };

  // Filter real students by selected class
  const classStudents = useMemo(() => {
    return allStudents.filter((s) => s.grade === selectedClass);
  }, [allStudents, selectedClass]);

  // Filter homeroom students for Class Head
  const homeroomStudents = useMemo(() => {
    if (!teacher.homeroomClass) return [];
    return allStudents.filter((s) => s.grade === teacher.homeroomClass);
  }, [allStudents, teacher.homeroomClass]);

  // Attendance Roster bound to real students
  const [attendanceRoster, setAttendanceRoster] = useState<QuickAttendanceItem[]>([]);

  useEffect(() => {
    if (classStudents.length > 0) {
      setAttendanceRoster(
        classStudents.map((s) => ({
          id: s.id,
          studentName: s.name,
          status: 'present',
        }))
      );
    }
  }, [classStudents]);

  const handleToggleStatus = (studentId: string, status: QuickAttendanceItem['status']) => {
    setAttendanceRoster((prev) =>
      prev.map((item) => (item.id === studentId ? { ...item, status } : item))
    );
  };

  const handleMarkAllPresent = () => {
    setAttendanceRoster((prev) => prev.map((item) => ({ ...item, status: 'present' })));
    showToast('Barcha o‘quvchilar "Bor" deb belgilandi.');
  };

  const handleSaveAttendance = async () => {
    const today = new Date().toISOString().slice(0, 10);
    const slot = displayedSlots.find((item) => item.className === selectedClass);
    if (!slot?.id) {
      showToast('Davomat saqlanmadi: tanlangan sinf uchun lesson session topilmadi.');
      return;
    }
    try {
      const studentsWithClass = attendanceRoster.map((r) => ({ ...r, classId: (allStudents.find((s) => s.id === r.id) as any)?.classId }));
      const classId = slot.classId || studentsWithClass.find((r) => r.classId)?.classId;
      if (!classId) throw new Error('Class ID is missing');
      const sessionId = `session-${slot.id}-${today}`;
      const attendance = {
        present: studentsWithClass.filter((r) => r.status === 'present').map((r) => r.id),
        absent: studentsWithClass.filter((r) => r.status === 'absent').map((r) => r.id),
        late: studentsWithClass.filter((r) => r.status === 'late').map((r) => r.id),
        excused: studentsWithClass.filter((r) => r.status === 'excused').map((r) => r.id),
      };
      await saveLessonSession({
        id: sessionId,
        slotId: slot.id,
        classId,
        className: selectedClass,
        subject: slot.subject,
        subjectId: slot.subjectId,
        date: today,
        weekday: slot.day,
        period: slot.period,
        lessonNumber: slot.lessonNumber || slot.period,
        topic: slot.subject,
        status: 'COMPLETED',
        attendance,
        grades: {},
        comments: {},
      });
      showToast(`${selectedClass} sinfi uchun davomat muvaffaqiyatli saqlandi!`);
    } catch {
      showToast('Davomat saqlanmadi: lessonId va classId talab qilinadi.');
    }
  };

  // Gradebook State bound to real students
  const [gradesData, setGradesData] = useState<
    Array<{
      id: string;
      studentName: string;
      currentScores: number[];
      quarterGrade: number;
      comment: string;
    }>
  >([]);

  useEffect(() => {
    if (classStudents.length > 0) {
      setGradesData(
        classStudents.map((s) => ({
          id: s.id,
          studentName: s.name,
          currentScores: [5, 4, 5],
          quarterGrade: s.currentQuarterGrade || 5,
          comment: '',
        }))
      );
    }
  }, [classStudents]);

  const [selectedStudentForGrading, setSelectedStudentForGrading] = useState<{ id: string; name: string } | null>(null);
  const [newGradeScore, setNewGradeScore] = useState<number>(5);
  const [newGradeNote, setNewGradeNote] = useState('');

  const handleAddGrade = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudentForGrading) return;

    setGradesData((prev) =>
      prev.map((row) =>
        row.id === selectedStudentForGrading.id
          ? {
              ...row,
              currentScores: [...row.currentScores, newGradeScore],
              comment: newGradeNote.trim() || row.comment,
            }
          : row
      )
    );

    try {
      await authenticatedFetch('/api/grades/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: selectedStudentForGrading.id,
          className: selectedClass,
          subject: teacher.subject || 'Matematika',
          grade: newGradeScore,
          comment: newGradeNote.trim(),
          date: new Date().toISOString().slice(0, 10),
        }),
      });
    } catch {}

    showToast(`${selectedStudentForGrading.name} uchun "${newGradeScore}" bahosi qo‘yildi!`);
    setSelectedStudentForGrading(null);
    setNewGradeNote('');
  };

  // 3. Homework State
  const [homeworkList, setHomeworkList] = useState<TeacherHomeworkItem[]>([
    {
      id: 'hw-1',
      className: '7-A',
      subject: 'Matematika',
      topic: 'Bir noma’lumli chiziqli tenglamalar (14-mavzu, 45-48 mashqlar)',
      deadline: '2026-09-03',
      assignedDate: '2026-09-01',
      totalAssigned: 28,
      submittedCount: 16,
      description: 'Darslikdagi 45-mashqdan 48-mashqqacha yechish va tekshirish.',
    },
    {
      id: 'hw-2',
      className: '8-A',
      subject: 'Informatika',
      topic: 'Python Funksiyalari yordamida kalkulyator dasturi yaratish',
      deadline: '2026-09-04',
      assignedDate: '2026-09-01',
      totalAssigned: 26,
      submittedCount: 14,
      description: 'Funksiyalardan foydalanib sodda arifmetik amallarni bajaruvchi kod yozish.',
    },
  ]);

  const [isCreateHwOpen, setIsCreateHwOpen] = useState(false);
  const [hwClass, setHwClass] = useState(assignedClassesList[0] || '7-A');
  const [hwSubject, setHwSubject] = useState(teacher.subject || 'Matematika');
  const [hwTopic, setHwTopic] = useState('');
  const [hwDeadline, setHwDeadline] = useState('2026-09-05');
  const [hwDescription, setHwDescription] = useState('');

  const handleOpenQuickHwModal = (className?: string, subject?: string) => {
    if (className) setHwClass(className);
    if (subject) setHwSubject(subject);
    setIsCreateHwOpen(true);
  };

  const handleCreateHomework = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hwTopic.trim()) {
      showToast('Iltimos, vazifa mavzusini kiriting.', 'error');
      return;
    }

    const newHw: TeacherHomeworkItem = {
      id: `hw-${Date.now()}`,
      className: hwClass,
      subject: hwSubject,
      topic: hwTopic.trim(),
      deadline: hwDeadline,
      assignedDate: new Date().toISOString().slice(0, 10),
      totalAssigned: classStudents.length || 28,
      submittedCount: 0,
      description: hwDescription.trim(),
    };

    setHomeworkList([newHw, ...homeworkList]);
    setIsCreateHwOpen(false);
    setHwTopic('');
    setHwDescription('');

    try {
      await authenticatedFetch('/api/homework', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newHw),
      });
    } catch {}

    showToast(`${hwClass} sinfiga yangi uy vazifasi muvaffaqiyatli yuborildi!`);
  };

  const [submittedReviews, setSubmittedReviews] = useState<SubmittedHomeworkReview[]>([
    {
      id: 'sub-1',
      homeworkId: 'hw-1',
      studentName: 'Ali Valiyev',
      className: '7-A',
      submittedAt: 'Bugun, 14:30',
      status: 'graded',
      score: 5,
      feedback: 'A’lo bajarilgan!',
      fileAttachment: 'ali_valiyev_mashqlar.pdf',
    },
    {
      id: 'sub-2',
      homeworkId: 'hw-1',
      studentName: 'Madina Karimova',
      className: '7-A',
      submittedAt: 'Bugun, 15:10',
      status: 'pending',
      fileAttachment: 'madina_vazifa_foto.jpg',
    },
    {
      id: 'sub-3',
      homeworkId: 'hw-1',
      studentName: 'Sardorbek Toshmatov',
      className: '7-A',
      submittedAt: 'Bugun, 16:45',
      status: 'pending',
      fileAttachment: 'sardorbek_yechim.pdf',
    },
  ]);

  const pendingSubmissionsCount = useMemo(() => {
    return submittedReviews.filter((s) => s.status === 'pending').length;
  }, [submittedReviews]);

  const [reviewModalStudent, setReviewModalStudent] = useState<SubmittedHomeworkReview | null>(null);
  const [reviewScoreInput, setReviewScoreInput] = useState(5);
  const [reviewFeedbackInput, setReviewFeedbackInput] = useState('Topshiriq to‘liq va to‘g‘ri bajarilgan.');

  const handleGradeSubmission = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewModalStudent) return;

    setSubmittedReviews((prev) =>
      prev.map((s) =>
        s.id === reviewModalStudent.id
          ? {
              ...s,
              status: 'graded',
              score: reviewScoreInput,
              feedback: reviewFeedbackInput,
            }
          : s
      )
    );

    showToast(`${reviewModalStudent.studentName}ning vazifasi tekshirildi va "${reviewScoreInput}" baholandi.`);
    setReviewModalStudent(null);
  };

  // 4. Lesson Plans (KTP)
  const [lessonPlans] = useState<LessonPlanItem[]>([
    { id: 'lp-1', lessonNumber: 1, week: 1, topic: 'Kirish: Matematika va uning zamonaviy fanlardagi o‘rni', date: '2026-09-01', status: 'completed', hasPresentation: true, hasWorksheet: true },
    { id: 'lp-2', lessonNumber: 2, week: 1, topic: 'Bir noma’lumli chiziqli tenglamalar va xossalari', date: '2026-09-03', status: 'current', hasPresentation: true, hasWorksheet: true, hasTest: true },
    { id: 'lp-3', lessonNumber: 3, week: 2, topic: 'Murakkab tenglamalarni soddalashtirish usullari', date: '2026-09-08', status: 'planned', hasPresentation: true },
    { id: 'lp-4', lessonNumber: 4, week: 2, topic: 'Matnli masalalarni tenglamalar yordamida yechish', date: '2026-09-10', status: 'planned', hasWorksheet: true },
    { id: 'lp-5', lessonNumber: 5, week: 3, topic: '1-Nazorat ishi: Chiziqli tenglamalar', date: '2026-09-15', status: 'planned', hasTest: true },
  ]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 font-sans">
      {/* Toast Notification Banner */}
      {toastMessage && (
        <div
          className={`fixed top-20 right-6 z-50 flex items-center gap-2.5 rounded-2xl p-4 shadow-xl text-xs font-bold transition-all animate-in slide-in-from-top-4 ${
            toastMessage.type === 'success'
              ? 'bg-emerald-600 text-white shadow-emerald-600/30'
              : 'bg-rose-600 text-white shadow-rose-600/30'
          }`}
        >
          {toastMessage.type === 'success' ? <CheckCircle2 className="h-5 w-5" /> : <AlertCircle className="h-5 w-5" />}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* 1. Header & Quick Overview */}
      <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                Xush kelibsiz, {teacher.name}!
              </h1>
              <span className="rounded-full bg-indigo-50 px-3 py-1 text-[11px] font-bold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                O‘qituvchi Ish Joyi
              </span>
            </div>
            <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
              <span className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5 text-indigo-600" />
                {todayFormatted.dateStr} | {todayFormatted.dayName}
              </span>
              <span>•</span>
              <span className="text-indigo-600 dark:text-indigo-400 font-bold">
                {teacher.subject || 'Matematika & Informatika'} | {assignedClassesList.join(', ')} sinflar o‘qituvchisi
              </span>
            </div>
          </div>

          {/* Academic Term & Class Filter Controls */}
          <div className="flex items-center gap-2">
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            >
              {assignedClassesList.map((cls) => (
                <option key={cls} value={cls}>
                  {cls} sinf
                </option>
              ))}
            </select>

            <select
              value={selectedQuarter}
              onChange={(e) => setSelectedQuarter(e.target.value)}
              className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            >
              <option value="1-chorak">1-chorak</option>
              <option value="2-chorak">2-chorak</option>
              <option value="3-chorak">3-chorak</option>
              <option value="4-chorak">4-chorak</option>
            </select>
          </div>
        </div>

        {/* 4 Top Stat Cards */}
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Bugungi darslar soni */}
          <button
            type="button"
            onClick={() => setActiveTab('schedule')}
            className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50/80 p-4 text-left hover:border-indigo-200 transition-all dark:border-slate-800 dark:bg-slate-800/50"
          >
            <div>
              <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                Bugungi darslar
              </div>
              <div className="mt-1 text-2xl font-black text-slate-900 dark:text-white">
                {todayLessons.length} ta dars
              </div>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400">
              <Clock className="h-5 w-5" />
            </div>
          </button>

          {/* Card 2: Mening sinflarim */}
          <button
            type="button"
            onClick={() => onNavigate('my-classes')}
            className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50/80 p-4 text-left hover:border-emerald-200 transition-all dark:border-slate-800 dark:bg-slate-800/50"
          >
            <div>
              <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                Mening sinflarim
              </div>
              <div className="mt-1 text-2xl font-black text-slate-900 dark:text-white">
                {assignedClassesList.length} ta sinf
              </div>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400">
              <FolderKanban className="h-5 w-5" />
            </div>
          </button>

          {/* Card 3: Tekshirilishi kerak bo'lgan vazifalar */}
          <button
            type="button"
            onClick={() => onNavigate('homework')}
            className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50/80 p-4 text-left hover:border-amber-200 transition-all dark:border-slate-800 dark:bg-slate-800/50"
          >
            <div>
              <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                Tekshiriladigan vazifalar
              </div>
              <div className="mt-1 text-2xl font-black text-amber-600 dark:text-amber-400">
                {pendingSubmissionsCount > 0 ? `${pendingSubmissionsCount} ta` : '0 ta'}
              </div>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-100 text-amber-600 dark:bg-amber-950 dark:text-amber-400">
              <FileText className="h-5 w-5" />
            </div>
          </button>

          {/* Card 4: O'rtacha o'zlashtirish */}
          <div className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-800/50">
            <div>
              <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                O‘rtacha o‘zlashtirish
              </div>
              <div className="mt-1 text-2xl font-black text-slate-900 dark:text-white">
                86%
              </div>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-purple-100 text-purple-600 dark:bg-purple-950 dark:text-purple-400">
              <Award className="h-5 w-5" />
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto border-b border-slate-200/80 pb-2 dark:border-slate-800 scrollbar-thin">
        <button
          onClick={() => setActiveTab('schedule')}
          className={`flex items-center gap-2 rounded-2xl px-4 py-2.5 text-xs font-bold transition-all shrink-0 ${
            activeTab === 'schedule'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-300'
          }`}
        >
          <Clock className="h-4 w-4" />
          <span>Bugungi dars jadvali</span>
        </button>

        <button
          onClick={() => setActiveTab('attendance')}
          className={`flex items-center gap-2 rounded-2xl px-4 py-2.5 text-xs font-bold transition-all shrink-0 ${
            activeTab === 'attendance'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-300'
          }`}
        >
          <CalendarCheck className="h-4 w-4" />
          <span>Tezkor Davomat Moduli</span>
        </button>

        <button
          onClick={() => setActiveTab('gradebook')}
          className={`flex items-center gap-2 rounded-2xl px-4 py-2.5 text-xs font-bold transition-all shrink-0 ${
            activeTab === 'gradebook'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-300'
          }`}
        >
          <FileSpreadsheet className="h-4 w-4" />
          <span>Elektron Jurnal va Baholash</span>
        </button>

        <button
          onClick={() => setActiveTab('homework')}
          className={`flex items-center gap-2 rounded-2xl px-4 py-2.5 text-xs font-bold transition-all shrink-0 ${
            activeTab === 'homework'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-300'
          }`}
        >
          <FileText className="h-4 w-4" />
          <span>Uy Vazifalari Boshqaruvi</span>
        </button>

        <button
          onClick={() => setActiveTab('lesson-plans')}
          className={`flex items-center gap-2 rounded-2xl px-4 py-2.5 text-xs font-bold transition-all shrink-0 ${
            activeTab === 'lesson-plans'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-300'
          }`}
        >
          <BookOpen className="h-4 w-4" />
          <span>Dars Rejalari (KTP)</span>
        </button>

        {teacher.homeroomClass && (
          <button
            onClick={() => setActiveTab('homeroom')}
            className={`flex items-center gap-2 rounded-2xl px-4 py-2.5 text-xs font-bold transition-all shrink-0 ${
              activeTab === 'homeroom'
                ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-300'
            }`}
          >
            <ShieldCheck className="h-4 w-4 text-purple-400" />
            <span>Sinf Rahbari ({teacher.homeroomClass})</span>
          </button>
        )}
      </div>

      {/* 2. Core Functional Modules Content */}

      {/* A. Bugungi dars jadvali */}
      {activeTab === 'schedule' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>Darslar Ketma-ketligi ({todayFormatted.dayName})</span>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                  {todayLessons.length} ta dars
                </span>
              </h2>

              {/* Scope Switch: My Schedule vs Whole School Schedule */}
              <div className="flex items-center rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
                <button
                  type="button"
                  onClick={() => setScheduleViewScope('my')}
                  className={`rounded-lg px-2.5 py-1 text-xs font-bold transition-all ${
                    scheduleViewScope === 'my'
                      ? 'bg-white text-indigo-700 shadow-xs dark:bg-slate-700 dark:text-white'
                      : 'text-slate-500 hover:text-slate-900 dark:text-slate-400'
                  }`}
                >
                  Mening darslarim
                </button>
                <button
                  type="button"
                  onClick={() => setScheduleViewScope('school')}
                  className={`rounded-lg px-2.5 py-1 text-xs font-bold transition-all flex items-center gap-1 ${
                    scheduleViewScope === 'school'
                      ? 'bg-white text-indigo-700 shadow-xs dark:bg-slate-700 dark:text-white'
                      : 'text-slate-500 hover:text-slate-900 dark:text-slate-400'
                  }`}
                >
                  <Lock className="h-3 w-3" />
                  <span>Umumiy maktab (Faqat ko‘rish)</span>
                </button>
              </div>
            </div>

            <button
              onClick={() => onNavigate('electronic-journal')}
              className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400"
            >
              <span>To‘liq elektron jurnalga o‘tish</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>

          {scheduleViewScope === 'school' && (
            <div className="rounded-2xl bg-amber-50 p-3 border border-amber-200 text-xs font-bold text-amber-800 dark:bg-amber-950/40 dark:border-amber-900 dark:text-amber-300 flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 shrink-0" />
              <span>To‘liq maktab dars jadvali faqat ko‘rish rejimida. Dars jadvalini yaratish va tahrirlash huquqi faqat Maktab Administratoriga berilgan.</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {todayLessons.map((slot, idx) => {
              const isLive = isTimeInSlot(slot.time) || idx === 0;
              const isAttendanceDone = quickAttendanceRecorded[slot.id];
              const isTopicDone = completedTopics[slot.id];

              return (
                <div
                  key={slot.id}
                  className={`rounded-3xl border p-5 shadow-xs transition-all flex flex-col justify-between ${
                    isLive
                      ? 'border-emerald-400/80 bg-linear-to-br from-emerald-50/40 via-white to-white dark:border-emerald-700/80 dark:from-emerald-950/20 dark:to-slate-900 ring-2 ring-emerald-500/30 shadow-md'
                      : 'border-slate-200/80 bg-white dark:border-slate-800 dark:bg-slate-900'
                  }`}
                >
                  <div>
                    {/* Card Top: Period + Class + Room + Live Badge */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <span className={`flex h-9 w-9 items-center justify-center rounded-2xl font-black text-xs ${
                          isLive
                            ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                            : 'bg-indigo-600 text-white'
                        }`}>
                          {slot.period}
                        </span>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-base font-bold text-slate-900 dark:text-white">
                              {slot.className} sinf
                            </h3>
                            {isLive && (
                              <span className="flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-black text-emerald-800 animate-pulse dark:bg-emerald-950 dark:text-emerald-300">
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-600"></span>
                                HOZIR BO‘LMOQDA
                              </span>
                            )}
                          </div>
                          <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                            {slot.time} • {slot.room}
                          </div>
                        </div>
                      </div>

                      <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-[11px] font-bold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                        {slot.subject}
                      </span>
                    </div>

                    {/* KTP Topic & AI Pacing Status Toggle */}
                    <div className="mt-3.5 rounded-2xl bg-slate-50 p-3 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <Sparkles className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                            KTP Holati:
                          </span>
                          <span className={`rounded-full px-2 py-0.2 text-[9px] font-black uppercase ${
                            slot.hasApprovedKtp
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                              : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                          }`}>
                            {getKTPStatusLabel(slot.ktpStatus, language)}
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleToggleTopicCompleted(slot.id, slot.topic)}
                          className={`shrink-0 flex items-center gap-1 rounded-xl px-2.5 py-1 text-[11px] font-bold transition-all ${
                            isTopicDone
                              ? 'bg-emerald-600 text-white shadow-xs'
                              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100 dark:bg-slate-700 dark:border-slate-600 dark:text-slate-300'
                          }`}
                        >
                          {isTopicDone ? (
                            <>
                              <Check className="h-3 w-3" />
                              <span>Mavzu o‘tildi</span>
                            </>
                          ) : (
                            <span>Rejada</span>
                          )}
                        </button>
                      </div>

                      <div className="text-xs text-slate-900 dark:text-white font-bold">
                        {slot.topic}
                      </div>

                      {slot.nextTopicPreview && (
                        <div className="mt-1 text-[10px] text-slate-500 dark:text-slate-400 truncate">
                          Keyingi: <em>{slot.nextTopicPreview}</em>
                        </div>
                      )}
                    </div>

                    {/* Quick 1-Click Attendance Indicator & Homework Action */}
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleQuickMarkAllPresent(slot)}
                        className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition-all ${
                          isAttendanceDone
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800'
                            : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100 dark:bg-indigo-950 dark:text-indigo-300'
                        }`}
                      >
                        {isAttendanceDone ? (
                          <>
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                            <span>Davomat olindi (100% Bor)</span>
                          </>
                        ) : (
                          <>
                            <Sparkles className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
                            <span>1-bosishda davomat (Bor)</span>
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleOpenQuickHwModal(slot.className, slot.subject)}
                        className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 shadow-2xs"
                      >
                        <FileText className="h-3.5 w-3.5 text-indigo-600" />
                        <span>Uy vazifasi berish</span>
                      </button>
                    </div>
                  </div>

                  {/* Card Bottom: Navigation Actions */}
                  <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2.5">
                    <button
                      onClick={() => {
                        setSelectedClass(slot.className);
                        setActiveTab('attendance');
                      }}
                      className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 shadow-xs"
                    >
                      <CalendarCheck className="h-3.5 w-3.5 text-indigo-600" />
                      <span>Davomat olish</span>
                    </button>

                    <button
                      onClick={() => {
                        if (onSelectClassWorkspace) onSelectClassWorkspace(slot.className);
                        onNavigate('electronic-journal');
                      }}
                      className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-md shadow-indigo-600/30 hover:bg-indigo-700 active:scale-95 transition-all"
                    >
                      <BookOpen className="h-3.5 w-3.5" />
                      <span>Darsni Boshlash</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* B. Tezkor Davomat Moduli */}
      {activeTab === 'attendance' && (
        <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4 dark:border-slate-800">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <CalendarCheck className="h-5 w-5 text-indigo-600" />
                <span>{selectedClass} sinfi uchun davomat (Bugungi dars)</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Har bir o‘quvchining holatini 1 ta bosish orqali belgilang
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleMarkAllPresent}
                className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
              >
                Barchasini "Bor" qilish
              </button>

              <button
                type="button"
                onClick={handleSaveAttendance}
                className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-1.5 text-xs font-bold text-white shadow-md shadow-indigo-600/30 hover:bg-indigo-700 active:scale-95 transition-all"
              >
                <Check className="h-4 w-4" />
                <span>Davomatni saqlash</span>
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-100 bg-slate-50/70 text-slate-400 dark:border-slate-800 dark:bg-slate-800/40 uppercase font-bold text-[10px]">
                <tr>
                  <th className="p-3">O‘quvchi</th>
                  <th className="p-3 text-center">Davomat Holati</th>
                  <th className="p-3 text-right">Amal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {attendanceRoster.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                    <td className="p-3">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-50 font-bold text-indigo-600 text-xs dark:bg-indigo-950 dark:text-indigo-400">
                          {item.studentName.charAt(0)}
                        </div>
                        <span className="font-bold text-slate-900 dark:text-white">
                          {item.studentName}
                        </span>
                      </div>
                    </td>

                    <td className="p-3">
                      <div className="flex items-center justify-center gap-1.5">
                        {/* Bor */}
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(item.id, 'present')}
                          className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-all ${
                            item.status === 'present'
                              ? 'bg-emerald-600 text-white shadow-xs'
                              : 'bg-slate-50 text-slate-600 hover:bg-emerald-50 hover:text-emerald-700 dark:bg-slate-800 dark:text-slate-400'
                          }`}
                        >
                          Bor
                        </button>

                        {/* Kelmadi */}
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(item.id, 'absent')}
                          className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-all ${
                            item.status === 'absent'
                              ? 'bg-rose-600 text-white shadow-xs'
                              : 'bg-slate-50 text-slate-600 hover:bg-rose-50 hover:text-rose-700 dark:bg-slate-800 dark:text-slate-400'
                          }`}
                        >
                          Kelmadi
                        </button>

                        {/* Sababli */}
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(item.id, 'excused')}
                          className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-all ${
                            item.status === 'excused'
                              ? 'bg-amber-600 text-white shadow-xs'
                              : 'bg-slate-50 text-slate-600 hover:bg-amber-50 hover:text-amber-700 dark:bg-slate-800 dark:text-slate-400'
                          }`}
                        >
                          Sababli
                        </button>

                        {/* Kechikdi */}
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(item.id, 'late')}
                          className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-all ${
                            item.status === 'late'
                              ? 'bg-orange-600 text-white shadow-xs'
                              : 'bg-slate-50 text-slate-600 hover:bg-orange-50 hover:text-orange-700 dark:bg-slate-800 dark:text-slate-400'
                          }`}
                        >
                          Kechikdi
                        </button>
                      </div>
                    </td>

                    <td className="p-3 text-right">
                      <span className="text-slate-400 text-[11px] font-medium">Saqlashga tayyor</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* C. Elektron Jurnal va Baholash */}
      {activeTab === 'gradebook' && (
        <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4 dark:border-slate-800">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <FileSpreadsheet className="h-5 w-5 text-indigo-600" />
                <span>{selectedClass} Elektron Jurnali (1-Chorak Baholari)</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Davlat standarti (2–5 baholash tizimi) bo‘yicha joriy va oraliq baholar
              </p>
            </div>

            <button
              onClick={() => {
                if (onSelectClassWorkspace) onSelectClassWorkspace(selectedClass);
                onNavigate('electronic-journal');
              }}
              className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-md shadow-indigo-600/30 hover:bg-indigo-700"
            >
              <BookOpen className="h-4 w-4" />
              <span>To‘liq Jurnalga O‘tish</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-100 bg-slate-50/70 text-slate-400 dark:border-slate-800 dark:bg-slate-800/40 uppercase font-bold text-[10px]">
                <tr>
                  <th className="p-3">O‘quvchi F.I.SH</th>
                  <th className="p-3">Joriy Baholar (1-Chorak)</th>
                  <th className="p-3 text-center">Choraklik Baho</th>
                  <th className="p-3">O‘qituvchi Izohi</th>
                  <th className="p-3 text-right">Amal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {gradesData.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                    <td className="p-3 font-bold text-slate-900 dark:text-white">
                      {row.studentName}
                    </td>

                    <td className="p-3">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {row.currentScores.map((score, sIdx) => (
                          <span
                            key={sIdx}
                            className={`flex h-7 w-7 items-center justify-center rounded-lg font-black text-xs ${
                              score === 5
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                : score === 4
                                ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300'
                                : score === 3
                                ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                                : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                            }`}
                          >
                            {score}
                          </span>
                        ))}
                      </div>
                    </td>

                    <td className="p-3 text-center">
                      <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-600 font-black text-white text-xs shadow-xs">
                        {row.quarterGrade}
                      </span>
                    </td>

                    <td className="p-3 text-slate-500 dark:text-slate-400 font-medium">
                      {row.comment}
                    </td>

                    <td className="p-3 text-right">
                      <button
                        onClick={() => setSelectedStudentForGrading({ id: row.id, name: row.studentName })}
                        className="rounded-xl bg-indigo-50 px-3 py-1.5 text-xs font-bold text-indigo-700 hover:bg-indigo-100 dark:bg-indigo-950 dark:text-indigo-300"
                      >
                        + Baho qo‘yish
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* D. Uy Vazifalari Boshqaruvi */}
      {activeTab === 'homework' && (
        <div className="space-y-6">
          {/* Top: Active Assigned Homeworks */}
          <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4 dark:border-slate-800">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <FileText className="h-5 w-5 text-indigo-600" />
                  <span>Biriktirilgan Uy Vazifalari</span>
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Sinflar bo‘yicha topshirilgan va kutilayotgan uy vazifalar
                </p>
              </div>

              <button
                onClick={() => setIsCreateHwOpen(true)}
                className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-md shadow-indigo-600/30 hover:bg-indigo-700 active:scale-95 transition-all"
              >
                <Plus className="h-4 w-4" />
                <span>+ Yangi vazifa yaratish</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {homeworkList.map((hw) => (
                <div
                  key={hw.id}
                  className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-800/40 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between">
                      <span className="rounded-lg bg-indigo-100 px-2.5 py-0.5 text-xs font-bold text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300">
                        {hw.className} sinf • {hw.subject}
                      </span>
                      <span className="text-xs font-semibold text-rose-600 dark:text-rose-400">
                        Muddat: {hw.deadline}
                      </span>
                    </div>

                    <h3 className="text-sm font-bold text-slate-900 dark:text-white mt-2.5">
                      {hw.topic}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      {hw.description}
                    </p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-200/80 dark:border-slate-800 flex items-center justify-between text-xs">
                    <span className="text-slate-500 font-medium">
                      Topshirildi: <strong>{hw.submittedCount} / {hw.totalAssigned} nafar</strong>
                    </span>
                    <span className="text-indigo-600 dark:text-indigo-400 font-bold">Faol jarayon</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Bottom: Submissions to Review */}
          <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-4">
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-indigo-600" />
              <span>O‘quvchilar Topshirgan Vazifalarini Tekshirish</span>
            </h2>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-slate-100 bg-slate-50/70 text-slate-400 dark:border-slate-800 dark:bg-slate-800/40 uppercase font-bold text-[10px]">
                  <tr>
                    <th className="p-3">O‘quvchi</th>
                    <th className="p-3">Sinf</th>
                    <th className="p-3">Topshirilgan Vaqt</th>
                    <th className="p-3">Yuklangan Fayl</th>
                    <th className="p-3">Holat</th>
                    <th className="p-3 text-right">Tekshirish</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {submittedReviews.map((sub) => (
                    <tr key={sub.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                      <td className="p-3 font-bold text-slate-900 dark:text-white">
                        {sub.studentName}
                      </td>
                      <td className="p-3 font-semibold text-slate-600 dark:text-slate-300">
                        {sub.className}
                      </td>
                      <td className="p-3 text-slate-500 dark:text-slate-400">
                        {sub.submittedAt}
                      </td>
                      <td className="p-3">
                        <span className="inline-flex items-center gap-1 font-mono text-indigo-600 dark:text-indigo-400">
                          <Download className="h-3.5 w-3.5" />
                          {sub.fileAttachment}
                        </span>
                      </td>
                      <td className="p-3">
                        {sub.status === 'graded' ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                            Tekshirildi ({sub.score})
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-[10px] font-bold text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                            Kutilmoqda
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-right">
                        <button
                          onClick={() => {
                            setReviewModalStudent(sub);
                            setReviewScoreInput(sub.score || 5);
                            setReviewFeedbackInput(sub.feedback || 'Topshiriq to‘g‘ri bajarilgan.');
                          }}
                          className="rounded-xl bg-indigo-50 px-3 py-1.5 text-xs font-bold text-indigo-700 hover:bg-indigo-100 dark:bg-indigo-950 dark:text-indigo-300"
                        >
                          Baholash & Izoh
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* E. Dars Rejalari va Konspektlar */}
      {activeTab === 'lesson-plans' && (
        <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4 dark:border-slate-800">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-indigo-600" />
                <span>{selectedClass} Matematika KTP Rejasi va Konspektlar</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                O‘quv dasturi bo‘yicha mavzular ketma-ketligi va dars materiallari
              </p>
            </div>

            <button
              onClick={() => onNavigate('electronic-journal')}
              className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-md shadow-indigo-600/30 hover:bg-indigo-700"
            >
              <Sparkles className="h-4 w-4" />
              <span>AI Konspekt Yaratish</span>
            </button>
          </div>

          <div className="space-y-3">
            {lessonPlans.map((lp) => (
              <div
                key={lp.id}
                className={`rounded-2xl border p-4 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                  lp.status === 'current'
                    ? 'border-indigo-300 bg-indigo-50/40 dark:border-indigo-800 dark:bg-indigo-950/20'
                    : 'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-indigo-600 font-black text-white text-xs">
                    {lp.lessonNumber}
                  </span>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                        {lp.topic}
                      </h3>
                      {lp.status === 'completed' && (
                        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[9px] font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                          O‘tildi
                        </span>
                      )}
                      {lp.status === 'current' && (
                        <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[9px] font-bold text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300">
                          Keyingi dars
                        </span>
                      )}
                      {lp.status === 'planned' && (
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[9px] font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                          Rejada
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      {lp.week}-hafta • {lp.date}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {lp.hasPresentation && (
                    <button
                      onClick={() => showToast('Taqdimot (PPTX) yuklab olindi.')}
                      className="flex items-center gap-1 rounded-xl bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"
                    >
                      <Download className="h-3 w-3 text-indigo-600" />
                      <span>Prezentatsiya</span>
                    </button>
                  )}
                  {lp.hasWorksheet && (
                    <button
                      onClick={() => showToast('Mashqlar varaqasi (PDF) yuklab olindi.')}
                      className="flex items-center gap-1 rounded-xl bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"
                    >
                      <Download className="h-3 w-3 text-emerald-600" />
                      <span>Topshiriq</span>
                    </button>
                  )}
                  {lp.hasTest && (
                    <button
                      onClick={() => showToast('Nazorat testi yuklab olindi.')}
                      className="flex items-center gap-1 rounded-xl bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"
                    >
                      <Download className="h-3 w-3 text-amber-600" />
                      <span>Test</span>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* F. Sinf Rahbari (Class Head) Hub */}
      {activeTab === 'homeroom' && teacher.homeroomClass && (
        <div className="rounded-3xl border border-purple-200/80 bg-white p-6 shadow-xs dark:border-purple-900/50 dark:bg-slate-900 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4 dark:border-slate-800">
            <div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-6 w-6 text-purple-600" />
                <h2 className="text-lg font-black text-slate-900 dark:text-white">
                  Sinf Rahbari Paneli: {teacher.homeroomClass} Sinf
                </h2>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Sinf o‘quvchilari ro‘yxati, davomat statistikasi va ota-onalar bilan tezkor aloqa
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="rounded-xl bg-purple-50 px-3 py-1.5 text-xs font-bold text-purple-700 dark:bg-purple-950 dark:text-purple-300">
                Jami: {homeroomStudents.length} ta o‘quvchi
              </span>
            </div>
          </div>

          {/* Quick Metrics for Homeroom Class */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="rounded-2xl border border-slate-100 bg-purple-50/50 p-4 dark:border-slate-800 dark:bg-purple-950/20">
              <div className="text-xs font-bold text-purple-700 dark:text-purple-400">Sinf O‘quvchilari</div>
              <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">{homeroomStudents.length} nafar</div>
            </div>
            <div className="rounded-2xl border border-slate-100 bg-emerald-50/50 p-4 dark:border-slate-800 dark:bg-emerald-950/20">
              <div className="text-xs font-bold text-emerald-700 dark:text-emerald-400">Bugungi Davomat</div>
              <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">97.4%</div>
            </div>
            <div className="rounded-2xl border border-slate-100 bg-indigo-50/50 p-4 dark:border-slate-800 dark:bg-indigo-950/20">
              <div className="text-xs font-bold text-indigo-700 dark:text-indigo-400">Ota-onalar bilan aloqa</div>
              <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">100% bog‘langan</div>
            </div>
          </div>

          {/* Homeroom Student Table with Parent Contacts */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-100 bg-slate-50/70 text-slate-400 dark:border-slate-800 dark:bg-slate-800/40 uppercase font-bold text-[10px]">
                <tr>
                  <th className="p-3">O‘quvchi</th>
                  <th className="p-3">IIN / ID</th>
                  <th className="p-3">Ota-onasi</th>
                  <th className="p-3">Telefon</th>
                  <th className="p-3 text-center">Davomat</th>
                  <th className="p-3 text-right">Aloqa</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {homeroomStudents.map((student) => (
                  <tr key={student.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                    <td className="p-3">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-100 font-bold text-purple-700 text-xs dark:bg-purple-950 dark:text-purple-300">
                          {student.name.charAt(0)}
                        </div>
                        <div>
                          <div className="font-bold text-slate-900 dark:text-white">{student.name}</div>
                          <div className="text-[10px] text-slate-400">{student.email || `${student.id}@edusphere.school`}</div>
                        </div>
                      </div>
                    </td>
                    <td className="p-3 font-mono text-slate-600 dark:text-slate-400">{student.iin || student.studentId}</td>
                    <td className="p-3 font-medium text-slate-700 dark:text-slate-300">{student.parentName || 'Ota-ona'}</td>
                    <td className="p-3 font-mono text-slate-600 dark:text-slate-400">{student.parentPhone || '+998 90 123 45 67'}</td>
                    <td className="p-3 text-center">
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                        {student.attendanceRate || 96}%
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      <a
                        href={`tel:${student.parentPhone || '+998901234567'}`}
                        className="inline-flex items-center gap-1 rounded-xl bg-purple-50 px-2.5 py-1 text-xs font-bold text-purple-700 hover:bg-purple-100 dark:bg-purple-950 dark:text-purple-300"
                      >
                        <Phone className="h-3 w-3" />
                        <span>Qo‘ng‘iroq</span>
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 3. Interactive Modals */}

      {/* Add Grade Modal */}
      {selectedStudentForGrading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl dark:bg-slate-900 border border-slate-100 dark:border-slate-800 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
              <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Award className="h-5 w-5 text-indigo-600" />
                <span>Baho Qo‘yish</span>
              </h3>
              <button onClick={() => setSelectedStudentForGrading(null)} className="text-slate-400 hover:text-slate-600">
                ✕
              </button>
            </div>

            <form onSubmit={handleAddGrade} className="mt-4 space-y-3.5 text-xs">
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300">O‘quvchi</label>
                <div className="mt-1 font-bold text-sm text-slate-900 dark:text-white">
                  {selectedStudentForGrading.name} ({selectedClass})
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300">Baho (2–5 shkala)</label>
                <div className="mt-1.5 grid grid-cols-4 gap-2">
                  {[5, 4, 3, 2].map((mark) => (
                    <button
                      key={mark}
                      type="button"
                      onClick={() => setNewGradeScore(mark)}
                      className={`rounded-2xl py-3 text-base font-black transition-all ${
                        newGradeScore === mark
                          ? mark === 5
                            ? 'bg-emerald-600 text-white shadow-md'
                            : mark === 4
                            ? 'bg-indigo-600 text-white shadow-md'
                            : mark === 3
                            ? 'bg-amber-600 text-white shadow-md'
                            : 'bg-rose-600 text-white shadow-md'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
                      }`}
                    >
                      {mark}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300">Izoh yoki tavsiya</label>
                <input
                  type="text"
                  value={newGradeNote}
                  onChange={(e) => setNewGradeNote(e.target.value)}
                  placeholder="masalan: Darsda juda faol qatnashdi"
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 font-medium focus:bg-white focus:ring-2 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800"
                />
              </div>

              <div className="mt-5 flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setSelectedStudentForGrading(null)}
                  className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-300"
                >
                  Bekor qilish
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-indigo-600 px-5 py-2 text-xs font-bold text-white hover:bg-indigo-700 active:scale-95 transition-all shadow-md"
                >
                  Bahoni saqlash
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Homework Modal */}
      {isCreateHwOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl dark:bg-slate-900 border border-slate-100 dark:border-slate-800 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
              <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                <FileText className="h-5 w-5 text-indigo-600" />
                <span>Yangi Uy Vazifasi Yaratish</span>
              </h3>
              <button onClick={() => setIsCreateHwOpen(false)} className="text-slate-400 hover:text-slate-600">
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateHomework} className="mt-4 space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300">Sinfni tanlang</label>
                  <select
                    value={hwClass}
                    onChange={(e) => setHwClass(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 font-bold dark:border-slate-700 dark:bg-slate-800"
                  >
                    {assignedClassesList.map((cls) => (
                      <option key={cls} value={cls}>
                        {cls} sinf
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300">Topshirish muddati</label>
                  <input
                    type="date"
                    value={hwDeadline}
                    onChange={(e) => setHwDeadline(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 font-bold dark:border-slate-700 dark:bg-slate-800"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300">Fan</label>
                <input
                  type="text"
                  value={hwSubject}
                  onChange={(e) => setHwSubject(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 font-bold dark:border-slate-700 dark:bg-slate-800"
                  placeholder="masalan: Matematika"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300">Vazifa mavzusi</label>
                <input
                  type="text"
                  value={hwTopic}
                  onChange={(e) => setHwTopic(e.target.value)}
                  placeholder="masalan: 14-mavzu, 45–48 mashqlarni yechish"
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 font-bold focus:bg-white focus:ring-2 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800"
                  required
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300">Ko‘rsatma va izoh</label>
                <textarea
                  rows={3}
                  value={hwDescription}
                  onChange={(e) => setHwDescription(e.target.value)}
                  placeholder="O‘quvchilarga vazifani bajarish bo‘yicha qo‘shimcha yo‘riqnoma..."
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 font-medium focus:bg-white dark:border-slate-700 dark:bg-slate-800"
                />
              </div>

              <div className="mt-5 flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsCreateHwOpen(false)}
                  className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-300"
                >
                  Bekor qilish
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-indigo-600 px-5 py-2 text-xs font-bold text-white hover:bg-indigo-700 active:scale-95 transition-all shadow-md"
                >
                  Vazifani yuborish
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Review Submission Modal */}
      {reviewModalStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl dark:bg-slate-900 border border-slate-100 dark:border-slate-800 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
              <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-indigo-600" />
                <span>Vazifani Tekshirish va Baholash</span>
              </h3>
              <button onClick={() => setReviewModalStudent(null)} className="text-slate-400 hover:text-slate-600">
                ✕
              </button>
            </div>

            <form onSubmit={handleGradeSubmission} className="mt-4 space-y-3.5 text-xs">
              <div>
                <div className="text-slate-400">O‘quvchi:</div>
                <div className="font-bold text-sm text-slate-900 dark:text-white">
                  {reviewModalStudent.studentName} ({reviewModalStudent.className})
                </div>
              </div>

              <div>
                <div className="text-slate-400">Biriktirilgan fayl:</div>
                <div className="mt-1 flex items-center gap-2 rounded-xl bg-slate-50 p-2.5 font-mono text-indigo-600 dark:bg-slate-800 dark:text-indigo-400">
                  <Download className="h-4 w-4" />
                  <span>{reviewModalStudent.fileAttachment}</span>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300">Qo‘yiladigan baho (2–5)</label>
                <div className="mt-1.5 grid grid-cols-4 gap-2">
                  {[5, 4, 3, 2].map((mark) => (
                    <button
                      key={mark}
                      type="button"
                      onClick={() => setReviewScoreInput(mark)}
                      className={`rounded-2xl py-2.5 text-base font-black transition-all ${
                        reviewScoreInput === mark
                          ? 'bg-indigo-600 text-white shadow-md'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
                      }`}
                    >
                      {mark}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300">O‘qituvchi taqrizi / izoh</label>
                <textarea
                  rows={2}
                  value={reviewFeedbackInput}
                  onChange={(e) => setReviewFeedbackInput(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 font-medium focus:bg-white dark:border-slate-700 dark:bg-slate-800"
                />
              </div>

              <div className="mt-5 flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setReviewModalStudent(null)}
                  className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-300"
                >
                  Bekor qilish
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-indigo-600 px-5 py-2 text-xs font-bold text-white hover:bg-indigo-700 active:scale-95 transition-all shadow-md"
                >
                  Tasdiqlash & Saqlash
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
