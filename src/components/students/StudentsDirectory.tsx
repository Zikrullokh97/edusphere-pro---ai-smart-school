import React, { useState, useMemo, useEffect } from 'react';
import {
  Users,
  Search,
  Filter,
  Sparkles,
  Award,
  CalendarCheck,
  ChevronRight,
  X,
  Phone,
  GraduationCap,
  AlertTriangle,
  User,
  BookOpen,
  ArrowUpDown,
  FileText,
  Download,
  ShieldCheck,
  UserPlus,
  Calendar,
  CheckCircle2,
  XCircle,
  Clock,
  HelpCircle,
  Eye,
  Edit2,
  ChevronLeft,
  ScanFace,
  Upload,
  ArrowRightLeft,
  Trash2,
} from 'lucide-react';
import { AppLanguage, StudentRecord, TeacherRecord, UserRole, UserProfile } from '../../types';
import { useI18n } from '../../lib/i18n';
import { MOCK_STUDENTS, MOCK_TEACHERS } from '../../data/mockData';
import { listSchoolData, createSchoolData, updateSchoolData, archiveSchoolData } from '../../lib/schoolRepository';
import { authenticatedFetch } from '../../lib/api';
import { KyrgyzTabelDocument } from '../../lib/kyrgyzstanEdu';
import { StudentEditModal } from './StudentEditModal';
import { AddStudentModal } from './AddStudentModal';
import { StudentFaceEnrollModal } from './StudentFaceEnrollModal';

interface StudentsDirectoryProps {
  language: AppLanguage;
  currentRole?: UserRole;
  teachers?: TeacherRecord[];
  activeTeacherId?: string;
  currentUser?: UserProfile;
  onNavigateTab?: (tabId: string) => void;
}

export function sortStudentsNaturally(students: StudentRecord[]): StudentRecord[] {
  return [...students].sort((a, b) => {
    const getParts = (s: StudentRecord) => {
      if (s.lastName && s.firstName) return { last: s.lastName, first: s.firstName };
      const parts = s.name.trim().split(/\s+/);
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

export const StudentsDirectory: React.FC<StudentsDirectoryProps> = ({
  language,
  currentRole = 'admin',
  teachers = MOCK_TEACHERS,
  activeTeacherId,
  currentUser,
  onNavigateTab,
}) => {
  const t = useI18n(language);
  const [schoolStudents, setSchoolStudents] = useState<StudentRecord[]>(() => sortStudentsNaturally(MOCK_STUDENTS));
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    listSchoolData<StudentRecord>('students')
      .then((items) => {
        if (active && items.length > 0) {
          setSchoolStudents(sortStudentsNaturally(items));
        }
      })
      .catch(() => undefined)
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const currentTeacher = useMemo(() => {
    if (activeTeacherId) {
      return teachers.find((t) => t.id === activeTeacherId || `usr-${t.id}` === activeTeacherId);
    }
    if (currentUser && currentRole === 'teacher') {
      return (
        teachers.find(
          (t) =>
            (currentUser.email && t.email?.toLowerCase() === currentUser.email.toLowerCase()) ||
            (currentUser.id && (t.id === currentUser.id || `usr-${t.id}` === currentUser.id)) ||
            (currentUser.teacherId && t.id === currentUser.teacherId) ||
            (currentUser.name && t.name.toLowerCase() === currentUser.name.toLowerCase())
        ) || {
          id: currentUser.teacherId || currentUser.id?.replace('usr-', '') || '',
          name: currentUser.name || 'O‘qituvchi',
          email: currentUser.email || '',
          phone: currentUser.phoneNumber || '',
          avatar: currentUser.avatar || '',
          subject: currentUser.subjectSpecialties?.[0] || 'Fan',
          subjects: currentUser.subjectSpecialties || [],
          role: 'O‘qituvchi',
          totalLessonsWeekly: currentUser.workloadHours || 0,
          rating: 5.0,
          room: '101-kabinet',
          assignedClasses: currentUser.assignedClasses || (currentUser.homeroomClass ? [currentUser.homeroomClass] : []),
          homeroomClass: currentUser.homeroomClass || '',
          workloadHours: currentUser.workloadHours || 0,
        }
      );
    }
    return undefined;
  }, [teachers, activeTeacherId, currentUser, currentRole]);

  // Filters state
  const [selectedClass, setSelectedClass] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [genderFilter, setGenderFilter] = useState<'ALL' | 'male' | 'female'>('ALL');
  const [riskFilter, setRiskFilter] = useState<'ALL' | 'risk_only' | 'safe'>('ALL');
  const [attendanceFilter, setAttendanceFilter] = useState<'ALL' | 'high' | 'medium' | 'low'>('ALL');
  const [sortBy, setSortBy] = useState<'name' | 'grade' | 'attendance' | 'studentId'>('name');

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(10);

  // Modals state
  const [activeStudentModal, setActiveStudentModal] = useState<StudentRecord | null>(null);
  const [profileModalTab, setProfileModalTab] = useState<'personal' | 'academic' | 'attendance' | 'discipline'>('personal');
  const [selectedCalendarDay, setSelectedCalendarDay] = useState<{ day: number; date: string; status: string; subject: string; teacher: string; time: string } | null>(null);
  const [editingStudent, setEditingStudent] = useState<StudentRecord | null>(null);
  const [enrollingFaceStudent, setEnrollingFaceStudent] = useState<StudentRecord | null>(null);
  const [isAddStudentOpen, setIsAddStudentOpen] = useState(false);
  const [generatedTabel, setGeneratedTabel] = useState<KyrgyzTabelDocument | null>(null);
  const [isGeneratingTabel, setIsGeneratingTabel] = useState(false);
  const [tabelError, setTabelError] = useState<string | null>(null);

  // Bulk Import state
  const [isBulkImportOpen, setIsBulkImportOpen] = useState(false);
  const [bulkImportText, setBulkImportText] = useState('');
  const [bulkImporting, setBulkImporting] = useState(false);

  // Transfer Student state
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [studentToTransfer, setStudentToTransfer] = useState<StudentRecord | null>(null);
  const [transferTargetClass, setTransferTargetClass] = useState<string>('');
  const [transferReason, setTransferReason] = useState<string>('Ota-onasi arizasiga binoan');

  // Feedback toast
  const [feedbackToast, setFeedbackToast] = useState<string | null>(null);

  // Base list based on RBAC
  const baseStudentList = useMemo(() => {
    if (currentRole === 'admin') {
      return schoolStudents;
    }
    // For teacher: strictly filter to assigned classes
    if (currentRole === 'teacher') {
      const allowedClasses = currentTeacher?.assignedClasses || (currentTeacher?.homeroomClass ? [currentTeacher.homeroomClass] : []);
      if (allowedClasses.length > 0) {
        return schoolStudents.filter((s) => allowedClasses.includes(s.grade));
      }
      return [];
    }
    return schoolStudents;
  }, [currentRole, schoolStudents, currentTeacher]);

  // Available classes list
  const availableClasses = useMemo(() => {
    const set = new Set<string>();
    schoolStudents.forEach((s) => {
      if (s.grade) set.add(s.grade);
    });
    return Array.from(set).sort();
  }, [schoolStudents]);

  // Filtered & Sorted student list
  const filteredStudents = useMemo(() => {
    return baseStudentList
      .filter((s) => {
        // Class
        if (selectedClass !== 'ALL' && s.grade !== selectedClass) return false;

        // Gender
        if (genderFilter !== 'ALL' && s.gender && s.gender !== genderFilter) return false;

        // Search
        const q = searchQuery.toLowerCase().trim();
        if (q) {
          const matchName = s.name.toLowerCase().includes(q);
          const matchId = (s.studentId || s.id).toLowerCase().includes(q);
          const matchIin = s.iin ? s.iin.includes(q) : false;
          const matchParent = s.parentName ? s.parentName.toLowerCase().includes(q) : false;
          const matchPhone = s.parentPhone ? s.parentPhone.includes(q) : false;
          if (!matchName && !matchId && !matchIin && !matchParent && !matchPhone) {
            return false;
          }
        }

        // Risk status
        if (riskFilter === 'risk_only') {
          if (s.riskStatus !== 'critical' && s.riskStatus !== 'warning' && s.riskStatus !== 'medium_risk') {
            return false;
          }
        } else if (riskFilter === 'safe') {
          if (s.riskStatus === 'critical' || s.riskStatus === 'warning' || s.riskStatus === 'medium_risk') {
            return false;
          }
        }

        // Attendance health
        if (attendanceFilter === 'high' && s.attendanceRate < 95) return false;
        if (attendanceFilter === 'medium' && (s.attendanceRate < 85 || s.attendanceRate >= 95)) return false;
        if (attendanceFilter === 'low' && s.attendanceRate >= 85) return false;

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'grade') return (b.avgGrade || 0) - (a.avgGrade || 0);
        if (sortBy === 'attendance') return (b.attendanceRate || 0) - (a.attendanceRate || 0);
        if (sortBy === 'studentId') return (a.studentId || a.id).localeCompare(b.studentId || b.id);
        return a.name.localeCompare(b.name);
      });
  }, [baseStudentList, selectedClass, genderFilter, searchQuery, riskFilter, attendanceFilter, sortBy]);

  // Statistics calculation
  const stats = useMemo(() => {
    const total = filteredStudents.length;
    if (total === 0) {
      return {
        total: 0,
        avgGpa: '—',
        avgAtt: '—',
        atRiskCount: 0,
        hasData: false,
      };
    }

    const sumGpa = filteredStudents.reduce((acc, s) => acc + (s.avgGrade || 0), 0);
    const sumAtt = filteredStudents.reduce((acc, s) => acc + (s.attendanceRate || 0), 0);
    const atRisk = filteredStudents.filter(
      (s) => s.riskStatus === 'critical' || s.riskStatus === 'warning' || s.riskStatus === 'medium_risk'
    ).length;

    return {
      total,
      avgGpa: (sumGpa / total).toFixed(2),
      avgAtt: `${(sumAtt / total).toFixed(1)}%`,
      atRiskCount: atRisk,
      hasData: true,
    };
  }, [filteredStudents]);

  // Pagination calculation
  const totalPages = Math.ceil(filteredStudents.length / pageSize) || 1;
  const paginatedStudents = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredStudents.slice(start, start + pageSize);
  }, [filteredStudents, currentPage, pageSize]);

  const handleGenerateTabel = async (student: StudentRecord) => {
    setIsGeneratingTabel(true);
    setTabelError(null);
    try {
      const res = await authenticatedFetch('/api/kyrgyz/tabel/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: student.id,
          academicYear: '2026-2027',
        }),
      });
      const data = await res.json();
      if (data.success && data.tabel) {
        setGeneratedTabel(data.tabel);
      } else {
        setTabelError(data.error || 'Tabel yaratishda xatolik yuz berdi');
      }
    } catch {
      setTabelError('Serverga ulanishda xatolik yuz berdi');
    } finally {
      setIsGeneratingTabel(false);
    }
  };

  const handleExportCSV = () => {
    const headers = ['ID', 'F.I.SH', 'Sinf', 'Jinsi', 'IIN', 'Ota-onasi', 'Telefon', 'Davomat (%)', 'GPA', 'Holati'];
    const rows = filteredStudents.map((s) => [
      s.id || s.studentId,
      s.name,
      s.grade,
      s.gender === 'female' ? 'Qiz' : 'O‘g‘il',
      s.iin || '',
      s.parentName || '',
      s.parentPhone || '',
      s.attendanceRate || 0,
      s.avgGrade || 5,
      s.riskStatus || 'normal',
    ]);
    const csvContent = [headers.join(','), ...rows.map((r) => r.map((c) => `"${c}"`).join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `edusphere_students_${selectedClass}_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setFeedbackToast('✓ O‘quvchilar ro‘yxati CSV formatida yuklab olindi!');
    setTimeout(() => setFeedbackToast(null), 3000);
  };

  const handleBulkImportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bulkImportText.trim()) return;
    setBulkImporting(true);
    try {
      const lines = bulkImportText.trim().split('\n').filter((l) => l.trim().length > 0);
      const newStudents: StudentRecord[] = [];
      for (const line of lines) {
        // Format: F.I.Sh, Sinf, IIN, Jinsi, Ota-onasi, Telefon
        const parts = line.split(',').map((p) => p.trim());
        if (parts.length >= 2) {
          const name = parts[0];
          const grade = parts[1];
          const iin = parts[2] || `5${Date.now().toString().slice(-12)}0`;
          const gender = parts[3]?.toLowerCase().includes('qiz') || parts[3]?.toLowerCase().includes('female') ? 'female' : 'male';
          const parentName = parts[4] || '';
          const parentPhone = parts[5] || '+998 90 000 00 00';
          const newStudent: StudentRecord = {
            id: `stu-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            studentId: `STU-${Math.floor(1000 + Math.random() * 9000)}`,
            name,
            grade,
            iin,
            gender,
            parentName,
            parentPhone,
            attendanceRate: 100,
            avgGrade: 5,
            homeworkCompletionRate: 100,
            xp: 0,
            level: 1,
            streakDays: 0,
            riskStatus: 'safe',
            strengths: ['Boshlang‘ich moslashuv'],
            weaknesses: [],
            badges: ['Yangi o‘quvchi'],
            avatar: gender === 'female'
              ? 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80'
              : 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=100&auto=format&fit=crop&q=80',
            status: 'active',
            email: `${name.toLowerCase().replace(/[^a-z0-9]/g, '.')}@edusphere.school`,
            schoolId: 'school-71-tashkent',
          };
          newStudents.push(newStudent);
          await createSchoolData('students', newStudent).catch(() => undefined);
        }
      }
      if (newStudents.length > 0) {
        setSchoolStudents((prev) => sortStudentsNaturally([...newStudents, ...prev]));
        setIsBulkImportOpen(false);
        setBulkImportText('');
        setFeedbackToast(`✓ ${newStudents.length} nafar o‘quvchi muvaffaqiyatli import qilindi!`);
        setTimeout(() => setFeedbackToast(null), 4000);
      }
    } catch {
      setFeedbackToast('Import jarayonida xatolik yuz berdi');
      setTimeout(() => setFeedbackToast(null), 4000);
    } finally {
      setBulkImporting(false);
    }
  };

  const handleTransferStudentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentToTransfer || !transferTargetClass || transferTargetClass === studentToTransfer.grade) return;
    const oldGrade = studentToTransfer.grade;
    const updated = {
      ...studentToTransfer,
      grade: transferTargetClass,
      previousSchool: `${oldGrade} sinfidan ko‘chirilgan (${transferReason})`,
    };
    try {
      await updateSchoolData('students', updated);
      setSchoolStudents((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
      if (activeStudentModal && activeStudentModal.id === updated.id) {
        setActiveStudentModal(updated);
      }
      setIsTransferModalOpen(false);
      setStudentToTransfer(null);
      setFeedbackToast(`✓ ${studentToTransfer.name} ${oldGrade} sinfidan ${transferTargetClass} sinfiga muvaffaqiyatli o‘tkazildi!`);
      setTimeout(() => setFeedbackToast(null), 4000);
    } catch (err) {
      console.error('Transfer xatosi:', err);
    }
  };

  const handleDeleteStudent = async (student: StudentRecord) => {
    if (!window.confirm(`Haqiqatan ham ${student.name} o‘quvchi hisobini o‘chirmoqchimisiz?`)) return;
    try {
      await archiveSchoolData('students', student.id);
      setSchoolStudents((prev) => prev.filter((s) => s.id !== student.id));
      if (activeStudentModal?.id === student.id) setActiveStudentModal(null);
      setFeedbackToast(`✓ ${student.name} o‘quvchi bazadan o‘chirildi`);
      setTimeout(() => setFeedbackToast(null), 3500);
    } catch (err) {
      console.error('O‘chirishda xatolik:', err);
    }
  };

  // Mock attendance days for student detail calendar (30 days)
  const studentAttendanceDays = useMemo(() => {
    if (!activeStudentModal) return [];
    return Array.from({ length: 30 }, (_, i) => {
      const dayNum = i + 1;
      const statuses = ['present', 'present', 'present', 'present', 'present', 'late', 'absent', 'excused'];
      const status = statuses[((activeStudentModal.name.charCodeAt(0) + dayNum) % statuses.length)];
      return {
        day: dayNum,
        date: `2026-09-${dayNum < 10 ? '0' : ''}${dayNum}`,
        status,
        subject: dayNum % 2 === 0 ? 'Matematika' : 'Informatika',
        teacher: 'Aigul Sadykova',
        time: '08:30 - 09:15',
      };
    });
  }, [activeStudentModal]);

  return (
    <div id="students-directory-view" className="space-y-6 pb-14 font-sans">
      {/* Header Banner */}
      <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-md shadow-indigo-600/30">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                  O‘quvchilar Ro‘yxati va Pasporti
                </h1>
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-0.5">
                  Barcha sinflar kesimida o‘quvchilar ma’lumotlari, davomati va akademik nazorati
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleExportCSV}
              className="flex items-center gap-1.5 rounded-2xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 shadow-2xs transition-all"
            >
              <Download className="h-4 w-4 text-slate-500" />
              <span>Eksport (CSV)</span>
            </button>

            {currentRole === 'admin' && (
              <>
                <button
                  type="button"
                  onClick={() => setIsBulkImportOpen(true)}
                  className="flex items-center gap-1.5 rounded-2xl border border-indigo-200 bg-indigo-50/70 px-3.5 py-2.5 text-xs font-bold text-indigo-700 hover:bg-indigo-100 dark:border-indigo-800 dark:bg-indigo-950/50 dark:text-indigo-300 shadow-2xs transition-all"
                >
                  <Upload className="h-4 w-4" />
                  <span>Ommaviy Yuklash (CSV)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsAddStudentOpen(true)}
                  className="flex items-center gap-1.5 rounded-2xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-indigo-600/30 hover:bg-indigo-700 active:scale-95 transition-all"
                >
                  <UserPlus className="h-4 w-4" />
                  <span>+ Yangi O‘quvchi Qo‘shish</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Feedback Toast */}
        {feedbackToast && (
          <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-bold text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>{feedbackToast}</span>
          </div>
        )}

        {/* Real Statistics Strip */}
        <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-800/50">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Jami O‘quvchilar</div>
            <div className="mt-1 text-2xl font-black text-slate-900 dark:text-white">
              {stats.hasData ? `${stats.total} nafar` : '—'}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-800/50">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">O‘rtacha Baho / GPA</div>
            <div className="mt-1 text-2xl font-black text-indigo-600 dark:text-indigo-400">
              {stats.hasData ? stats.avgGpa : '—'}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-800/50">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">O‘rtacha Davomat</div>
            <div className="mt-1 text-2xl font-black text-emerald-600 dark:text-emerald-400">
              {stats.hasData ? stats.avgAtt : '—'}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-800/50">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Diqqat Talab / Xavf</div>
            <div className="mt-1 text-2xl font-black text-amber-600 dark:text-amber-400">
              {stats.hasData ? `${stats.atRiskCount} nafar` : '—'}
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="rounded-3xl border border-slate-200/80 bg-white p-4 sm:p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="O‘quvchi ismi, ID raqami, IIN, ota-onasi yoki telefon raqami bo‘yicha qidiruv..."
              className="w-full rounded-2xl border border-slate-200 bg-slate-50/80 pl-10 pr-4 py-2.5 text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Quick Selectors */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Class Filter */}
            <select
              value={selectedClass}
              onChange={(e) => {
                setSelectedClass(e.target.value);
                setCurrentPage(1);
              }}
              className="rounded-2xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs font-bold text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            >
              <option value="ALL">Barcha sinflar</option>
              {availableClasses.map((cls) => (
                <option key={cls} value={cls}>
                  {cls} sinfi
                </option>
              ))}
            </select>

            {/* Risk Filter */}
            <select
              value={riskFilter}
              onChange={(e) => {
                setRiskFilter(e.target.value as any);
                setCurrentPage(1);
              }}
              className="rounded-2xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs font-bold text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            >
              <option value="ALL">Barcha holatlar</option>
              <option value="safe">Xavfsiz (Faol)</option>
              <option value="risk_only">Xavf guruhida</option>
            </select>

            {/* Sorting */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="rounded-2xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs font-bold text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            >
              <option value="name">Alifbo bo‘yicha (A-Z)</option>
              <option value="grade">O‘zlashtirish (Yuqori)</option>
              <option value="attendance">Davomat (Yuqori)</option>
              <option value="studentId">ID raqami bo‘yicha</option>
            </select>

            {/* Page Size */}
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs font-bold text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            >
              <option value={10}>10 tadan</option>
              <option value={25}>25 tadan</option>
              <option value={50}>50 tadan</option>
              <option value={100}>100 tadan</option>
            </select>
          </div>
        </div>
      </div>

      {/* Students Table */}
      <div className="rounded-3xl border border-slate-200/80 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-100 bg-slate-50/70 text-slate-400 dark:border-slate-800 dark:bg-slate-800/40 uppercase font-bold text-[10px]">
              <tr>
                <th className="p-4">№</th>
                <th className="p-4">O‘quvchi F.I.SH</th>
                <th className="p-4">Sinf</th>
                <th className="p-4">ID / IIN</th>
                <th className="p-4">Ota-onasi & Aloqa</th>
                <th className="p-4 text-center">Davomat</th>
                <th className="p-4 text-center">O‘rtacha Baho</th>
                <th className="p-4 text-center">Holat</th>
                <th className="p-4 text-right">Amallar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {paginatedStudents.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-12 text-center">
                    <Users className="h-10 w-10 text-slate-300 dark:text-slate-600 mx-auto" />
                    <div className="mt-3 text-sm font-bold text-slate-900 dark:text-white">
                      Hozircha o‘quvchilar mavjud emas
                    </div>
                    <p className="mt-1 text-xs text-slate-400">
                      {searchQuery
                        ? 'Qidiruv so‘zini o‘zgartiring yoki filtrlarni tozalang.'
                        : 'Yangi o‘quvchi qo‘shish uchun yuqoridagi tugmadan foydalaning.'}
                    </p>
                  </td>
                </tr>
              ) : (
                paginatedStudents.map((student, idx) => {
                  const itemIndex = (currentPage - 1) * pageSize + idx + 1;
                  const isRisk = student.riskStatus === 'critical' || student.riskStatus === 'warning' || student.riskStatus === 'medium_risk';

                  return (
                    <tr
                      key={student.id}
                      className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="p-4 text-slate-400 font-semibold">{itemIndex}</td>

                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <img
                            src={
                              student.avatar ||
                              'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
                            }
                            alt={student.name}
                            className="h-9 w-9 rounded-2xl object-cover ring-2 ring-slate-100 shadow-xs"
                          />
                          <div>
                            <button
                              type="button"
                              onClick={() => setActiveStudentModal(student)}
                              className="font-bold text-slate-900 dark:text-white hover:text-indigo-600 text-left transition-colors"
                            >
                              {student.name}
                            </button>
                            <div className="text-[10px] text-slate-400">{student.email || '—'}</div>
                          </div>
                        </div>
                      </td>

                      <td className="p-4">
                        <span className="rounded-xl bg-indigo-50 px-2.5 py-1 text-xs font-bold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                          {student.grade}
                        </span>
                      </td>

                      <td className="p-4 font-mono text-xs">
                        <div className="font-bold text-slate-700 dark:text-slate-300">{student.studentId || student.id}</div>
                        {student.iin && (
                          <div className="text-[10px] text-slate-400">IIN: {student.iin}</div>
                        )}
                      </td>

                      <td className="p-4">
                        <div className="font-semibold text-slate-800 dark:text-slate-200">
                          {student.parentName || '—'}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          {student.parentPhone || '—'}
                        </div>
                      </td>

                      <td className="p-4 text-center">
                        <span
                          className={`inline-flex items-center rounded-xl px-2.5 py-1 text-xs font-black ${
                            student.attendanceRate >= 95
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                              : student.attendanceRate >= 85
                              ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300'
                              : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                          }`}
                        >
                          {student.attendanceRate}%
                        </span>
                      </td>

                      <td className="p-4 text-center">
                        <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-slate-100 font-black text-slate-900 dark:bg-slate-800 dark:text-white shadow-2xs">
                          {student.avgGrade || student.currentQuarterGrade || 5}
                        </span>
                      </td>

                      <td className="p-4 text-center">
                        {isRisk ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2.5 py-0.5 text-[10px] font-bold text-rose-800 dark:bg-rose-950 dark:text-rose-300">
                            <AlertTriangle className="h-3 w-3" />
                            Xavf guruhi
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                            <CheckCircle2 className="h-3 w-3" />
                            Faol
                          </span>
                        )}
                      </td>

                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => setActiveStudentModal(student)}
                            className="flex items-center gap-1 rounded-xl bg-indigo-50 px-2.5 py-1.5 text-xs font-bold text-indigo-700 hover:bg-indigo-100 dark:bg-indigo-950 dark:text-indigo-300 transition-colors"
                            title="Profilni ko‘rish"
                          >
                            <Eye className="h-3.5 w-3.5" />
                            <span>Profil</span>
                          </button>

                          {(currentRole === 'admin' || currentRole === 'teacher') && (
                            <button
                              type="button"
                              onClick={() => setEnrollingFaceStudent(student)}
                              className="rounded-xl border border-indigo-200 bg-indigo-50/50 p-1.5 text-indigo-600 hover:bg-indigo-100 dark:border-indigo-800 dark:bg-indigo-950/50 dark:text-indigo-300 transition-colors"
                              title="Face ID biometriyasini biriktirish"
                            >
                              <ScanFace className="h-3.5 w-3.5" />
                            </button>
                          )}

                          {currentRole === 'admin' && (
                            <>
                              <button
                                type="button"
                                onClick={() => {
                                  setStudentToTransfer(student);
                                  setTransferTargetClass(availableClasses.find((c) => c !== student.grade) || '');
                                  setIsTransferModalOpen(true);
                                }}
                                className="rounded-xl border border-slate-200 bg-white p-1.5 text-indigo-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-indigo-400"
                                title="Boshqa sinfga o‘tkazish (Transfer)"
                              >
                                <ArrowRightLeft className="h-3.5 w-3.5" />
                              </button>

                              <button
                                type="button"
                                onClick={() => setEditingStudent(student)}
                                className="rounded-xl border border-slate-200 bg-white p-1.5 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                                title="Tahrirlash"
                              >
                                <Edit2 className="h-3.5 w-3.5" />
                              </button>

                              <button
                                type="button"
                                onClick={() => handleDeleteStudent(student)}
                                className="rounded-xl border border-rose-200 bg-rose-50/60 p-1.5 text-rose-600 hover:bg-rose-100 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-400"
                                title="O‘quvchini o‘chirish"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {filteredStudents.length > 0 && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-slate-100 p-4 dark:border-slate-800">
            <div className="text-xs font-medium text-slate-500">
              Jami <strong>{filteredStudents.length}</strong> ta o‘quvchidan{' '}
              <strong>{(currentPage - 1) * pageSize + 1}</strong>–
              <strong>{Math.min(currentPage * pageSize, filteredStudents.length)}</strong> ko‘rsatilmoqda
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                <span>Oldingi</span>
              </button>

              <span className="px-2 text-xs font-bold text-slate-900 dark:text-white">
                {currentPage} / {totalPages}
              </span>

              <button
                type="button"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
              >
                <span>Keyingi</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Detailed Student Profile Modal */}
      {activeStudentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-xs">
          <div className="w-full max-w-3xl rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900 max-h-[90vh] overflow-y-auto">
            {/* Top Modal Bar */}
            <div className="flex items-start justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
              <div className="flex items-center gap-3.5">
                <img
                  src={activeStudentModal.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
                  alt={activeStudentModal.name}
                  className="h-14 w-14 rounded-2xl object-cover ring-4 ring-indigo-500/10 shadow-md"
                />
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
                      {activeStudentModal.name}
                    </h2>
                    <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-bold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                      {activeStudentModal.grade} sinf
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5 font-mono">
                    ID: {activeStudentModal.studentId || activeStudentModal.id} • IIN: {activeStudentModal.iin || '—'}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setActiveStudentModal(null)}
                className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Profile Navigation Tabs */}
            <div className="mt-4 flex items-center gap-2 border-b border-slate-100 pb-2 dark:border-slate-800 overflow-x-auto text-xs font-bold">
              <button
                onClick={() => setProfileModalTab('personal')}
                className={`rounded-xl px-3.5 py-2 transition-all ${
                  profileModalTab === 'personal'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800'
                }`}
              >
                Shaxsiy va Oila
              </button>

              <button
                onClick={() => setProfileModalTab('academic')}
                className={`rounded-xl px-3.5 py-2 transition-all ${
                  profileModalTab === 'academic'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800'
                }`}
              >
                Akademik & Baholar
              </button>

              <button
                onClick={() => setProfileModalTab('attendance')}
                className={`rounded-xl px-3.5 py-2 transition-all ${
                  profileModalTab === 'attendance'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800'
                }`}
              >
                Davomat Tarixi & Taqvim
              </button>

              <button
                onClick={() => setProfileModalTab('discipline')}
                className={`rounded-xl px-3.5 py-2 transition-all ${
                  profileModalTab === 'discipline'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800'
                }`}
              >
                Intizom & Eslatmalar
              </button>
            </div>

            {/* Tab 1: Personal & Family Info */}
            {profileModalTab === 'personal' && (
              <div className="mt-4 space-y-4 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4 dark:border-slate-800 dark:bg-slate-800/40 space-y-2">
                    <h3 className="font-bold text-slate-900 dark:text-white uppercase text-[10px] tracking-wider text-indigo-600">
                      O‘quvchi Shaxsiy Ma’lumotlari
                    </h3>
                    <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                      <span className="text-slate-400">To‘liq F.I.SH:</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">{activeStudentModal.name}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                      <span className="text-slate-400">Tug‘ilgan sana:</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">{activeStudentModal.birthDate || activeStudentModal.dateOfBirth || '2012-05-15'}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                      <span className="text-slate-400">Jinsi:</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">{activeStudentModal.gender === 'female' ? 'Ayol / Qiz' : 'Erkak / O‘g‘il'}</span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-slate-400">Yashash manzili:</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">{activeStudentModal.address || 'Toshkent sh., Yunusobod tumani'}</span>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4 dark:border-slate-800 dark:bg-slate-800/40 space-y-2">
                    <h3 className="font-bold text-slate-900 dark:text-white uppercase text-[10px] tracking-wider text-indigo-600">
                      Ota-ona va Bog‘lanish
                    </h3>
                    <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                      <span className="text-slate-400">Ota-ona F.I.SH:</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">{activeStudentModal.parentName || '—'}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                      <span className="text-slate-400">Telefon raqami:</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200 font-mono">{activeStudentModal.parentPhone || '—'}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                      <span className="text-slate-400">Qarindoshligi:</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">Otasi / Onasi</span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-slate-400">Favqulodda aloqa:</span>
                      <span className="font-bold text-emerald-600">Tasdiqlangan</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Tab 2: Academic & Grades */}
            {profileModalTab === 'academic' && (
              <div className="mt-4 space-y-4 text-xs">
                <div className="grid grid-cols-3 gap-3">
                  <div className="rounded-2xl bg-indigo-50/80 p-3 text-center dark:bg-indigo-950/40">
                    <div className="text-slate-400 font-bold">O‘rtacha GPA</div>
                    <div className="mt-1 text-2xl font-black text-indigo-600">{activeStudentModal.avgGrade || 88}</div>
                  </div>
                  <div className="rounded-2xl bg-emerald-50/80 p-3 text-center dark:bg-emerald-950/40">
                    <div className="text-slate-400 font-bold">Choraklik Baho</div>
                    <div className="mt-1 text-2xl font-black text-emerald-600">{activeStudentModal.currentQuarterGrade || 5} (A'lo)</div>
                  </div>
                  <div className="rounded-2xl bg-purple-50/80 p-3 text-center dark:bg-purple-950/40">
                    <div className="text-slate-400 font-bold">Topshiriqlar %</div>
                    <div className="mt-1 text-2xl font-black text-purple-600">{activeStudentModal.homeworkCompletionRate || 92}%</div>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-100 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 space-y-3">
                  <h4 className="font-bold text-slate-900 dark:text-white">Fanlar Bo‘yicha Joriy O‘zlashtirish</h4>
                  <div className="space-y-2">
                    {[
                      { subject: 'Matematika & Algebra', grade: 5, score: 94, teacher: 'Aigul Sadykova' },
                      { subject: 'Informatika & AI', grade: 5, score: 96, teacher: 'Timur Batyrov' },
                      { subject: 'Fizika', grade: 4, score: 84, teacher: 'Erkin Beishenaliev' },
                      { subject: 'Ingliz Tili', grade: 5, score: 92, teacher: 'Nargiza Umarova' },
                    ].map((f) => (
                      <div key={f.subject} className="flex items-center justify-between p-2 rounded-xl bg-slate-50 dark:bg-slate-800">
                        <div>
                          <div className="font-bold text-slate-900 dark:text-white">{f.subject}</div>
                          <div className="text-[10px] text-slate-400">{f.teacher}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-600 dark:text-slate-300">{f.score} ball</span>
                          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-600 text-white font-bold text-xs">
                            {f.grade}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Tab 3: Attendance History & Calendar */}
            {profileModalTab === 'attendance' && (
              <div className="mt-4 space-y-4 text-xs">
                <div className="flex items-center justify-between rounded-2xl bg-slate-50 p-3.5 dark:bg-slate-800">
                  <div>
                    <span className="text-slate-400">Umumiy Davomat:</span>
                    <span className="ml-2 font-black text-base text-emerald-600">{activeStudentModal.attendanceRate}%</span>
                  </div>
                  <div className="flex items-center gap-3 text-[11px] font-bold">
                    <span className="flex items-center gap-1 text-emerald-600">🟢 Kelgan</span>
                    <span className="flex items-center gap-1 text-rose-600">🔴 Kelmagan</span>
                    <span className="flex items-center gap-1 text-amber-600">🟡 Kechikkan</span>
                    <span className="flex items-center gap-1 text-blue-600">🔵 Sababli</span>
                  </div>
                </div>

                {/* 30-Day Interactive Attendance Grid */}
                <div className="rounded-2xl border border-slate-100 p-4 dark:border-slate-800">
                  <div className="text-[11px] font-bold text-slate-500 mb-2">Sentabr oyi davomat taqvimi (Kun ustiga bosing):</div>
                  <div className="grid grid-cols-6 sm:grid-cols-10 gap-2">
                    {studentAttendanceDays.map((d) => (
                      <button
                        key={d.day}
                        type="button"
                        onClick={() => setSelectedCalendarDay(d)}
                        className={`flex flex-col items-center justify-center rounded-xl p-2 font-bold transition-all border ${
                          selectedCalendarDay?.day === d.day ? 'ring-2 ring-indigo-500' : ''
                        } ${
                          d.status === 'present'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300'
                            : d.status === 'absent'
                            ? 'bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950 dark:text-rose-300'
                            : d.status === 'late'
                            ? 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950 dark:text-amber-300'
                            : 'bg-blue-50 text-blue-800 border-blue-200 dark:bg-blue-950 dark:text-blue-300'
                        }`}
                      >
                        <span className="text-[10px]">{d.day}</span>
                        <span className="text-xs">
                          {d.status === 'present' ? '🟢' : d.status === 'absent' ? '🔴' : d.status === 'late' ? '🟡' : '🔵'}
                        </span>
                      </button>
                    ))}
                  </div>

                  {/* Selected Day Drill-down */}
                  {selectedCalendarDay && (
                    <div className="mt-3.5 rounded-xl bg-indigo-50/80 p-3 dark:bg-indigo-950/40 flex items-center justify-between animate-in zoom-in-95">
                      <div>
                        <div className="font-bold text-slate-900 dark:text-white">
                          {selectedCalendarDay.date} • {selectedCalendarDay.subject} ({selectedCalendarDay.time})
                        </div>
                        <div className="text-[11px] text-slate-500">
                          O‘qituvchi: <strong>{selectedCalendarDay.teacher}</strong>
                        </div>
                      </div>
                      <span className="font-black text-xs uppercase px-2.5 py-1 rounded-lg bg-white dark:bg-slate-900 shadow-2xs">
                        Holat: {selectedCalendarDay.status === 'present' ? 'Kelgan' : selectedCalendarDay.status === 'absent' ? 'Kelmagan' : selectedCalendarDay.status === 'late' ? 'Kechikkan' : 'Sababli'}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Tab 4: Discipline & Notes */}
            {profileModalTab === 'discipline' && (
              <div className="mt-4 space-y-3 text-xs">
                <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4 dark:border-slate-800 dark:bg-slate-800/40 space-y-2">
                  <h4 className="font-bold text-slate-900 dark:text-white">Sinf Rahbari va O‘qituvchi Eslatmalari</h4>
                  <p className="text-slate-600 dark:text-slate-300">
                    O‘quvchi darslarga o‘z vaqtida qatnashadi. Matematika olimpiadasiga tayyorgarlik ko‘rmoqda. Darslarda faol va tartibli.
                  </p>
                </div>
              </div>
            )}

            {/* Bottom Actions */}
            <div className="mt-6 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-4 dark:border-slate-800">
              <div className="flex flex-wrap items-center gap-2">
                <a
                  href={`tel:${activeStudentModal.parentPhone}`}
                  className="flex items-center gap-1.5 rounded-xl bg-emerald-50 px-3.5 py-2 text-xs font-bold text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950 dark:text-emerald-300"
                >
                  <Phone className="h-3.5 w-3.5" />
                  <span>Ota-onasiga qo‘ng‘iroq</span>
                </a>

                <button
                  type="button"
                  disabled={isGeneratingTabel}
                  onClick={() => handleGenerateTabel(activeStudentModal)}
                  className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 py-2 text-xs font-bold text-white shadow-xs hover:bg-indigo-700 disabled:opacity-60"
                >
                  <FileText className="h-3.5 w-3.5" />
                  <span>{isGeneratingTabel ? 'Yaratilmoqda...' : 'Rasmiy Tabel (PDF)'}</span>
                </button>
              </div>

              <button
                onClick={() => setActiveStudentModal(null)}
                className="rounded-xl bg-slate-900 px-5 py-2 text-xs font-bold text-white dark:bg-white dark:text-slate-950"
              >
                Yopish
              </button>
            </div>
            {tabelError && <p className="mt-2 text-xs text-rose-500 font-semibold">{tabelError}</p>}
          </div>
        </div>
      )}

      {/* Add Student Modal */}
      <AddStudentModal
        language={language}
        isOpen={isAddStudentOpen}
        onClose={() => setIsAddStudentOpen(false)}
        onStudentAdded={(newStudent) => {
          setSchoolStudents((prev) => [newStudent, ...prev]);
          setIsAddStudentOpen(false);
        }}
      />

      {/* Edit Student Modal */}
      {editingStudent && (
        <StudentEditModal
          student={editingStudent}
          onClose={() => setEditingStudent(null)}
          onSaved={(updatedStudent) => {
            setSchoolStudents((prev) =>
              prev.map((s) => (s.id === updatedStudent.id ? updatedStudent : s))
            );
            setEditingStudent(null);
          }}
        />
      )}

      {/* Face ID Enrollment Modal */}
      {enrollingFaceStudent && (
        <StudentFaceEnrollModal
          isOpen={Boolean(enrollingFaceStudent)}
          studentId={enrollingFaceStudent.studentId || enrollingFaceStudent.id}
          studentName={enrollingFaceStudent.name}
          className={enrollingFaceStudent.grade}
          currentPhotoUrl={enrollingFaceStudent.avatar}
          onClose={() => setEnrollingFaceStudent(null)}
          onSuccess={(embedding, photoUrl) => {
            setSchoolStudents((prev) =>
              prev.map((s) =>
                s.id === enrollingFaceStudent.id
                  ? { ...s, avatar: photoUrl, hasFaceEmbedding: true }
                  : s
              )
            );
            setEnrollingFaceStudent(null);
          }}
        />
      )}

      {/* Official Kyrgyz Tabel Modal */}
      {generatedTabel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-xs">
          <div className="w-full max-w-3xl rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900 max-h-[92vh] overflow-y-auto">
            <div className="flex items-start justify-between border-b border-slate-200 pb-4 dark:border-slate-800">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-6 w-6 text-emerald-600" />
                  <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-[11px] font-extrabold uppercase text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                    O‘quvchining Rasmiy Tabeli (МОН КР)
                  </span>
                </div>
                <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">
                  O‘QUVCHINING O‘ZLASHTIRISH TABELI
                </h2>
                <p className="text-xs text-slate-500">
                  {generatedTabel.schoolName} · {generatedTabel.academicYear} o‘quv yili
                </p>
              </div>

              <button
                onClick={() => setGeneratedTabel(null)}
                className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3 rounded-2xl bg-slate-50 p-3 text-xs dark:bg-slate-800/50">
              <div>
                <span className="text-slate-400">O‘quvchi:</span>
                <div className="font-bold text-slate-900 dark:text-white">{generatedTabel.studentName}</div>
              </div>
              <div>
                <span className="text-slate-400">IIN:</span>
                <div className="font-bold text-slate-900 dark:text-white font-mono">{generatedTabel.studentIIN}</div>
              </div>
              <div>
                <span className="text-slate-400">Sinf:</span>
                <div className="font-bold text-slate-900 dark:text-white">{generatedTabel.className}</div>
              </div>
              <div>
                <span className="text-slate-400">Sinf rahbari:</span>
                <div className="font-bold text-slate-900 dark:text-white">{generatedTabel.homeroomTeacherName}</div>
              </div>
            </div>

            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-left text-xs border border-slate-200 dark:border-slate-800">
                <thead className="bg-slate-100 dark:bg-slate-800 font-bold uppercase text-[10px]">
                  <tr>
                    <th className="p-2.5 border">Fan nomi</th>
                    <th className="p-2.5 border text-center">1-ch</th>
                    <th className="p-2.5 border text-center">2-ch</th>
                    <th className="p-2.5 border text-center">3-ch</th>
                    <th className="p-2.5 border text-center">4-ch</th>
                    <th className="p-2.5 border text-center">Yillik</th>
                    <th className="p-2.5 border text-center">Yakuniy</th>
                  </tr>
                </thead>
                <tbody>
                  {generatedTabel.subjects.map((s, idx) => (
                    <tr key={idx} className="border-b dark:border-slate-800">
                      <td className="p-2.5 border font-semibold">{s.subjectNameRu || s.subjectNameKy}</td>
                      <td className="p-2.5 border text-center font-bold">{s.q1 || '—'}</td>
                      <td className="p-2.5 border text-center font-bold">{s.q2 || '—'}</td>
                      <td className="p-2.5 border text-center font-bold">{s.q3 || '—'}</td>
                      <td className="p-2.5 border text-center font-bold">{s.q4 || '—'}</td>
                      <td className="p-2.5 border text-center font-bold">{s.annual || '—'}</td>
                      <td className="p-2.5 border text-center font-bold text-indigo-600">{s.final || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setGeneratedTabel(null)}
                className="rounded-xl bg-slate-900 px-5 py-2 text-xs font-bold text-white dark:bg-white dark:text-slate-950"
              >
                Yopish
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Import Modal */}
      {isBulkImportOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-xs">
          <div className="w-full max-w-xl rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-md shadow-indigo-600/30">
                  <Upload className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    O‘quvchilarni Ommaviy Yuklash (CSV Import)
                  </h3>
                  <p className="text-xs text-slate-400">
                    CSV yoki matn shaklida o‘quvchilar ro‘yxatini bazaga biriktirish
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsBulkImportOpen(false)}
                className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleBulkImportSubmit} className="mt-4 space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Format: <code>F.I.SH, Sinf, IIN, Jinsi (erkak/ayol), Ota-onasi, Telefon</code>
                </label>
                <textarea
                  rows={8}
                  required
                  value={bulkImportText}
                  onChange={(e) => setBulkImportText(e.target.value)}
                  placeholder="Aliyev Vali, 7-A, 50101051234567, erkak, Aliyev Sardor, +998 90 123 45 67&#10;Karimova Madina, 7-A, 60202057654321, ayol, Karimova Nargiza, +998 93 987 65 43"
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-3 font-mono text-xs text-slate-900 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsBulkImportOpen(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300"
                >
                  Bekor qilish
                </button>
                <button
                  type="submit"
                  disabled={bulkImporting}
                  className="rounded-xl bg-indigo-600 px-5 py-2 font-bold text-white shadow-lg shadow-indigo-600/30 hover:bg-indigo-700 disabled:opacity-50 transition-all"
                >
                  {bulkImporting ? 'Yuklanmoqda...' : 'Import qilish'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Transfer Student Modal */}
      {isTransferModalOpen && studentToTransfer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-white">
                  <ArrowRightLeft className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    O‘quvchini Boshqa Sinfga O‘tkazish
                  </h3>
                  <p className="text-[11px] text-slate-400 font-semibold">
                    {studentToTransfer.name} ({studentToTransfer.grade} sinfi)
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsTransferModalOpen(false)}
                className="rounded-xl p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleTransferStudentSubmit} className="mt-4 space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Yangi biriktiriladigan sinf:
                </label>
                <select
                  value={transferTargetClass}
                  onChange={(e) => setTransferTargetClass(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 font-bold text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                >
                  {availableClasses.map((cls) => (
                    <option key={cls} value={cls}>
                      {cls} sinfi {cls === studentToTransfer.grade ? '(Hozirgi)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  O‘tkazish sababi / Asoslovchi hujjat:
                </label>
                <input
                  type="text"
                  required
                  value={transferReason}
                  onChange={(e) => setTransferReason(e.target.value)}
                  placeholder="Masalan: Ota-onasi arizasiga binoan yoki yashash joyi o‘zgarishi"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsTransferModalOpen(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300"
                >
                  Bekor qilish
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-indigo-600 px-5 py-2 font-bold text-white shadow-lg shadow-indigo-600/30 hover:bg-indigo-700 transition-all"
                >
                  Sinfni Ko‘chirish
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
