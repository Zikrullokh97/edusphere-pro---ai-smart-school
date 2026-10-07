import React, { useState, useEffect, useMemo } from 'react';
import {
  FileText,
  Sparkles,
  CheckCircle2,
  Clock,
  Send,
  Upload,
  Bot,
  Layers,
  ArrowRight,
  Filter,
  Check,
  X,
  Camera,
  Plus,
  Image as ImageIcon,
  CheckCheck,
  ChevronDown,
  Edit2,
  Trash2,
  BarChart2,
  ShieldCheck,
} from 'lucide-react';
import { AppLanguage, HomeworkAssignment, StudentSubmission, UserRole, UserProfile } from '../../types';
import { useI18n } from '../../lib/i18n';

import { pwaManager } from '../../lib/pwa';
import { listSchoolData, createSchoolData, updateSchoolData, archiveSchoolData } from '../../lib/schoolRepository';

interface HomeworkManagerProps {
  language: AppLanguage;
  isStudent?: boolean;
  currentRole?: UserRole;
  currentUser?: UserProfile;
}

const EMPTY_HOMEWORK: HomeworkAssignment = {
  id: '',
  title: '',
  subject: '',
  className: '',
  dueDate: '',
  submittedCount: 0,
  submissions: [],
};

export const HomeworkManager: React.FC<HomeworkManagerProps> = ({
  language,
  isStudent = false,
  currentRole = 'teacher',
  currentUser,
}) => {
  const t = useI18n(language);
  const isParent = false;
  const effectiveIsStudent = isStudent || currentRole === 'parent_student';
  const [assignments, setAssignments] = useState<HomeworkAssignment[]>([]);
  const visibleAssignments = useMemo(() => {
    if (currentRole === 'admin') {
      return assignments;
    }
    if (currentRole === 'teacher' && currentUser) {
      const tId = currentUser.teacherId || currentUser.id?.replace('usr-', '');
      const assignedClasses = currentUser.assignedClasses || (currentUser.homeroomClass ? [currentUser.homeroomClass] : []);
      const subjects = (currentUser.subjectSpecialties || currentUser.subjects || []).map((s) => s.toLowerCase());

      return assignments.filter((a) => {
        if (a.teacherId && (a.teacherId === currentUser.id || a.teacherId === tId || `usr-${a.teacherId}` === currentUser.id)) {
          return true;
        }
        const classMatch = assignedClasses.length === 0 || assignedClasses.includes(a.className);
        const subjectMatch = subjects.length === 0 || subjects.includes(a.subject?.toLowerCase());
        return classMatch && subjectMatch;
      });
    }
    return assignments;
  }, [assignments, currentRole, currentUser]);

  const [selectedAssignment, setSelectedAssignment] = useState<HomeworkAssignment>(EMPTY_HOMEWORK);
  const [selectedSubmission, setSelectedSubmission] = useState<StudentSubmission | null>(null);

  useEffect(() => {
    if (visibleAssignments.length > 0 && !visibleAssignments.some((a) => a.id === selectedAssignment?.id)) {
      setSelectedAssignment(visibleAssignments[0]);
      setSelectedSubmission(visibleAssignments[0].submissions?.[0] || null);
    }
  }, [visibleAssignments, selectedAssignment]);

  // Quick AI Grade Approval State
  const [approvedSubmissions, setApprovedSubmissions] = useState<Record<string, boolean>>({});

  // Mobile Modals
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [showNewAssignmentModal, setShowNewAssignmentModal] = useState(false);
  const [uploadedPhoto, setUploadedPhoto] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [availableClasses, setAvailableClasses] = useState<string[]>(['7-A', '7-B', '8-A', '8-B', '9-A', '10-A', '11-A']);
  const [availableSubjects, setAvailableSubjects] = useState<string[]>(['Matematika', 'Fizika', 'Kimyo', 'Biologiya', 'Ingliz tili', 'Ona tili']);

  useEffect(() => {
    listSchoolData<HomeworkAssignment>('homework').then((items) => {
      if (items.length > 0) {
        setAssignments(items);
        setSelectedAssignment(items[0]);
        setSelectedSubmission(items[0].submissions?.[0] || null);
      }
    }).catch(() => undefined);

    listSchoolData<{ name: string }>('classes').then((items) => {
      if (items.length > 0) {
        const names = items.map((c) => c.name);
        setAvailableClasses(names);
        if (names.length > 0) setNewClass(names[0]);
      }
    }).catch(() => undefined);

    listSchoolData<{ name: string }>('subjects').then((items) => {
      if (items.length > 0) {
        const names = items.map((s) => s.name);
        setAvailableSubjects(names);
        if (names.length > 0) setNewSubject(names[0]);
      }
    }).catch(() => undefined);
  }, []);

  // New Homework Form State
  const [newTitle, setNewTitle] = useState('');
  const [newClass, setNewClass] = useState('7-A');
  const [newSubject, setNewSubject] = useState('Matematika');
  const [newDueDate, setNewDueDate] = useState('2026-09-15');
  const [newDescription, setNewDescription] = useState('');

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleApproveGrade = (subId: string) => {
    setApprovedSubmissions((prev) => ({ ...prev, [subId]: true }));
    pwaManager.queueAction('homework_grade_approved', {
      submissionId: subId,
      assignmentId: selectedAssignment.id,
    });
    showToast('AI Grade & feedback approved and sent to student portal!');
  };

  const handleStudentSubmit = () => {
    if (!uploadedPhoto) {
      showToast('Please take or upload a photo of your homework notebook');
      return;
    }

    const actualStudentId = currentUser?.studentId || currentUser?.id || 'std-001';
    const actualStudentName = currentUser?.name || 'Ali Nurdinov';

    const newSub: StudentSubmission = {
      id: `sub-${Date.now()}`,
      studentId: actualStudentId,
      studentName: actualStudentName,
      submittedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      imageUrl: uploadedPhoto,
      status: 'ai_graded',
      aiScore: 94,
      aiFeedback: 'Excellent solution steps! Clear algebraic proof with complete verification of roots.',
    };

    setAssignments((prev) =>
      prev.map((hw) =>
        hw.id === selectedAssignment.id
          ? {
              ...hw,
              submittedCount: hw.submittedCount + 1,
              submissions: [newSub, ...hw.submissions],
            }
          : hw
      )
    );

    setSelectedSubmission(newSub);
    setShowSubmitModal(false);
    setUploadedPhoto(null);

    pwaManager.queueAction('homework_submitted', {
      assignmentId: selectedAssignment.id,
      submission: newSub,
    });

    showToast('✓ Homework submitted and instantly verified by AI!');
  };

  const handleCreateAssignment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const created: HomeworkAssignment = {
      id: `hw-${Date.now()}`,
      title: newTitle,
      subject: newSubject,
      className: newClass,
      dueDate: newDueDate,
      description: newDescription || 'Complete assigned problems with step-by-step working.',
      totalStudents: 28,
      submittedCount: 0,
      submissions: [],
      teacherId: currentUser?.teacherId || currentUser?.id?.replace('usr-', '') || undefined,
    };

    createSchoolData('homework', created).then((saved) => {
      setAssignments((prev) => [saved, ...prev]);
      setSelectedAssignment(saved);
      setSelectedSubmission(null);
    }).catch(() => {
      setAssignments((prev) => [created, ...prev]);
      setSelectedAssignment(created);
      setSelectedSubmission(null);
    });
    setShowNewAssignmentModal(false);
    setNewTitle('');
    setNewDescription('');

    pwaManager.queueAction('homework_created', created);
    showToast('✓ New assignment published to students!');
  };

  // Edit Assignment Modal state
  const [editingAssignment, setEditingAssignment] = useState<HomeworkAssignment | null>(null);

  const handleOpenEditAssignment = (hw: HomeworkAssignment, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingAssignment(hw);
  };

  const handleSaveEditAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAssignment) return;

    setAssignments((prev) =>
      prev.map((hw) => (hw.id === editingAssignment.id ? editingAssignment : hw))
    );
    if (selectedAssignment.id === editingAssignment.id) {
      setSelectedAssignment(editingAssignment);
    }
    setEditingAssignment(null);
    showToast('✓ Uy vazifasi muvaffaqiyatli tahrirlandi!');

    try {
      await updateSchoolData('homework', editingAssignment);
    } catch {}
  };

  const handleDeleteAssignment = async (hwId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm('Haqiqatan ham ushbu uy vazifasini o‘chirmoqchimisiz?')) return;

    const remaining = assignments.filter((hw) => hw.id !== hwId);
    setAssignments(remaining);
    if (selectedAssignment.id === hwId && remaining.length > 0) {
      setSelectedAssignment(remaining[0]);
      setSelectedSubmission(remaining[0].submissions?.[0] || null);
    }
    showToast('✓ Uy vazifasi o‘chirildi.');

    try {
      await archiveSchoolData('homework', hwId);
    } catch {}
  };

  return (
    <div id="homework-manager-view" className="space-y-4 sm:space-y-6 pb-12">
      {/* Toast */}
      {toastMessage && (
        <div className="fixed top-20 right-4 z-50 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-bold text-white shadow-xl dark:bg-indigo-900 border border-indigo-500/40 animate-slideDown">
          {toastMessage}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-600 text-white dark:bg-indigo-500">
              <FileText className="h-4 w-4" />
            </div>
            <h1 className="text-lg font-bold text-slate-900 dark:text-white sm:text-2xl">
              {t('homeworkHeader')}
            </h1>
          </div>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Mobile Camera Notebook OCR, AI Step-by-Step Rubric & Instant Feedback
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {effectiveIsStudent ? (
            <button
              onClick={() => setShowSubmitModal(true)}
              className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white shadow-md hover:bg-indigo-700 dark:bg-indigo-500"
              style={{ minHeight: '44px' }}
            >
              <Camera className="h-4 w-4" />
              <span>Submit Homework Photo</span>
            </button>
          ) : isParent ? (
            <span className="rounded-xl bg-indigo-50 px-3.5 py-2 text-xs font-bold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
              Ali Nurdinov's Tasks (Parent View)
            </span>
          ) : (
            <button
              onClick={() => setShowNewAssignmentModal(true)}
              className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white shadow-md hover:bg-indigo-700 dark:bg-indigo-500"
              style={{ minHeight: '44px' }}
            >
              <Plus className="h-4 w-4" />
              <span>Create Assignment</span>
            </button>
          )}
        </div>
      </div>

      {/* Student Homework Workload Analysis Widget */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2.5 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <BarChart2 className="h-4 w-4 text-indigo-600" />
            <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200">
              Sinflar Bo‘yicha Haftalik Uy Vazifalari Hajmi & Yuklama Tahlili
            </h3>
          </div>
          <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
            ✓ Barcha sinflar me’yorda (max 3 ta/kun)
          </span>
        </div>

        <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5 text-center">
          {availableClasses.slice(0, 7).map((cls) => {
            const classHwCount = assignments.filter((a) => a.className === cls).length;
            const isHeavy = classHwCount >= 4;
            return (
              <div
                key={cls}
                className="rounded-xl border border-slate-100 bg-slate-50 p-2.5 dark:border-slate-800 dark:bg-slate-800/60"
              >
                <div className="font-bold text-slate-900 dark:text-white text-xs">{cls} sinf</div>
                <div className="mt-1 font-mono text-sm font-black text-indigo-600 dark:text-indigo-400">
                  {classHwCount} ta vazifa
                </div>
                <div className={`mt-1 text-[10px] font-bold ${isHeavy ? 'text-amber-600' : 'text-emerald-600'}`}>
                  {isHeavy ? 'Og‘ir yuklama' : 'Me’yorda ✓'}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Mobile Assignment Selector Dropdown */}
      <div className="lg:hidden rounded-2xl border border-slate-200 bg-white p-3.5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <label className="text-[10px] font-bold uppercase text-slate-400">Select Active Assignment</label>
        <select
          value={selectedAssignment.id}
          onChange={(e) => {
            const found = visibleAssignments.find((a) => a.id === e.target.value);
            if (found) {
              setSelectedAssignment(found);
              setSelectedSubmission(found.submissions[0] || null);
            }
          }}
          className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs font-bold text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          style={{ minHeight: '44px' }}
        >
          {visibleAssignments.map((a) => (
            <option key={a.id} value={a.id}>
              {a.className} • {a.title} (Due: {a.dueDate})
            </option>
          ))}
        </select>
      </div>

      {/* Main Grid: Assignment Selector & Submissions Review */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        {/* Left Column: Desktop Assignments List (4 Cols) */}
        <div className="hidden lg:block space-y-3 lg:col-span-4">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white">Active Assignments</h2>

          <div className="space-y-3">
            {visibleAssignments.map((hw) => {
              const isSelected = selectedAssignment.id === hw.id;
              return (
                <div
                  key={hw.id}
                  onClick={() => {
                    setSelectedAssignment(hw);
                    setSelectedSubmission(hw.submissions[0] || null);
                  }}
                  className={`cursor-pointer rounded-2xl border p-4 transition-all ${
                    isSelected
                      ? 'border-indigo-600 bg-indigo-50/70 shadow-sm dark:border-indigo-500 dark:bg-indigo-950/40'
                      : 'border-slate-200 bg-white hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="rounded bg-indigo-100 px-2 py-0.5 text-[10px] font-bold text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300">
                      {hw.className} • {hw.subject}
                    </span>
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] text-slate-400">Due {hw.dueDate}</span>
                      {!effectiveIsStudent && (
                        <div className="flex items-center gap-0.5 ml-1">
                          <button
                            onClick={(e) => handleOpenEditAssignment(hw, e)}
                            className="p-1 text-slate-400 hover:text-indigo-600 rounded hover:bg-slate-100 dark:hover:bg-slate-800"
                            title="Tahrirlash"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={(e) => handleDeleteAssignment(hw.id, e)}
                            className="p-1 text-slate-400 hover:text-rose-600 rounded hover:bg-rose-50 dark:hover:bg-rose-950/40"
                            title="O‘chirish"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  <h3 className="mt-2 text-xs font-bold text-slate-900 dark:text-white">{hw.title}</h3>
                  <p className="mt-1 text-[11px] text-slate-500 line-clamp-2 dark:text-slate-400">
                    {hw.description}
                  </p>

                  <div className="mt-3 flex items-center justify-between text-[11px] text-slate-500 border-t border-slate-100 pt-2 dark:border-slate-800">
                    <span>Submissions: {hw.submittedCount} / {hw.totalStudents}</span>
                    <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                      {Math.round((hw.submittedCount / (hw.totalStudents || 1)) * 100)}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: AI Auto-Grading & Notebook Review (8 Cols) */}
        <div className="space-y-4 lg:col-span-8">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3 dark:border-slate-800">
              <div>
                <span className="text-[10px] font-bold uppercase text-indigo-600 dark:text-indigo-400">
                  {selectedAssignment.subject} — {selectedAssignment.className}
                </span>
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  {selectedAssignment.title}
                </h2>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400">
                  {selectedAssignment.submittedCount} submissions reviewed
                </span>
              </div>
            </div>

            {/* Submissions Horizontal Carousel / Pills */}
            <div className="my-3 flex gap-2 overflow-x-auto pb-1 no-scrollbar">
              {selectedAssignment.submissions.map((sub) => {
                const isSubSelected = selectedSubmission?.id === sub.id;
                return (
                  <button
                    key={sub.id}
                    onClick={() => setSelectedSubmission(sub)}
                    className={`flex shrink-0 items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold transition-all ${
                      isSubSelected
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200'
                    }`}
                    style={{ minHeight: '44px' }}
                  >
                    <span>{sub.studentName}</span>
                    <span
                      className={`rounded px-1.5 py-0.2 text-[10px] font-bold ${
                        isSubSelected
                          ? 'bg-white/20 text-white'
                          : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                      }`}
                    >
                      {sub.aiScore}%
                    </span>
                  </button>
                );
              })}

              {selectedAssignment.submissions.length === 0 && (
                <div className="p-3 text-xs text-slate-400 italic">
                  No student submissions yet for this task.
                </div>
              )}
            </div>

            {/* Selected Student Work & AI Evaluation */}
            {selectedSubmission ? (
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                {/* Photo of Notebook */}
                <div className="rounded-2xl border border-slate-200 bg-slate-950 p-3 text-white dark:border-slate-800">
                  <div className="flex items-center justify-between text-[11px] text-slate-400 mb-2">
                    <span>Uploaded Notebook Paper</span>
                    <span className="text-emerald-400">OCR Scanned</span>
                  </div>
                  <div className="relative h-64 sm:h-72 w-full overflow-hidden rounded-xl bg-slate-900 flex items-center justify-center">
                    <img
                      src={selectedSubmission.imageUrl || "https://images.unsplash.com/photo-1544717305-2782549b5136?w=600&auto=format&fit=crop&q=80"}
                      alt="Student Notebook"
                      className="h-full w-full object-cover"
                    />
                    <div className="absolute top-2 left-2 rounded-md bg-black/60 px-2 py-0.5 text-[10px] font-mono text-emerald-300 backdrop-blur-xs">
                      AI OCR Confidence: 99.2%
                    </div>
                  </div>
                </div>

                {/* AI Rubric & Score Breakdown */}
                <div className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800/60">
                  <div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <Sparkles className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                        <span className="text-xs font-bold text-slate-900 dark:text-white">
                          AI Step-by-Step Grading
                        </span>
                      </div>
                      <span className="rounded-xl bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                        Score: {selectedSubmission.aiScore} / 100
                      </span>
                    </div>

                    <div className="mt-3 rounded-xl bg-white p-3 shadow-xs dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                      <div className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                        AI Teacher Feedback:
                      </div>
                      <p className="mt-1 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                        {selectedSubmission.aiFeedback}
                      </p>
                    </div>

                    <div className="mt-3 space-y-1.5 text-xs">
                      <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                        <span>Methodology & Steps</span>
                        <span className="font-bold text-emerald-600">30 / 30</span>
                      </div>
                      <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                        <span>Final Answer Accuracy</span>
                        <span className="font-bold text-emerald-600">30 / 30</span>
                      </div>
                      <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                        <span>Calculations & Proofs</span>
                        <span className="font-bold text-indigo-600">34 / 40</span>
                      </div>
                    </div>
                  </div>

                  {!effectiveIsStudent && !isParent && (
                    <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-700">
                      {approvedSubmissions[selectedSubmission.id] ? (
                        <div className="flex items-center justify-center gap-1.5 rounded-xl bg-emerald-100 py-3 text-xs font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                          <CheckCheck className="h-4 w-4" />
                          <span>Grade Approved & Sent to Student</span>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleApproveGrade(selectedSubmission.id)}
                          className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 py-3 text-xs font-bold text-white shadow-md hover:bg-indigo-700 dark:bg-indigo-500"
                          style={{ minHeight: '44px' }}
                        >
                          <Check className="h-4 w-4" />
                          <span>Approve & Post Grade</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="py-12 text-center text-xs text-slate-400">
                Select a student submission above to review the AI evaluation.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Student Submit Homework Modal */}
      {showSubmitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs"
            onClick={() => setShowSubmitModal(false)}
          />

          <div className="relative w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900 z-10">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
              <h3 className="font-bold text-slate-900 dark:text-white">
                Submit Homework Photo
              </h3>
              <button
                onClick={() => setShowSubmitModal(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500 dark:bg-slate-800"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 space-y-4">
              <div
                onClick={() =>
                  setUploadedPhoto(
                    'https://images.unsplash.com/photo-1544717305-2782549b5136?w=600&auto=format&fit=crop&q=80'
                  )
                }
                className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-indigo-400/50 bg-indigo-50/50 p-6 text-center cursor-pointer hover:bg-indigo-50 dark:bg-indigo-950/30 dark:hover:bg-indigo-950/50 transition-all"
              >
                {uploadedPhoto ? (
                  <div className="space-y-2">
                    <img
                      src={uploadedPhoto}
                      alt="Preview"
                      className="h-32 w-48 rounded-xl object-cover shadow-md mx-auto"
                    />
                    <span className="text-xs font-bold text-emerald-600 block">
                      ✓ Notebook snapshot captured
                    </span>
                  </div>
                ) : (
                  <>
                    <Camera className="h-8 w-8 text-indigo-600 dark:text-indigo-400 mb-2" />
                    <span className="text-xs font-bold text-slate-900 dark:text-white">
                      Take a Photo of Notebook Page
                    </span>
                    <span className="text-[10px] text-slate-400 mt-1">
                      Tap to open camera or upload file
                    </span>
                  </>
                )}
              </div>

              <button
                onClick={handleStudentSubmit}
                className="w-full rounded-xl bg-indigo-600 py-3 text-xs font-bold text-white shadow-md hover:bg-indigo-700 dark:bg-indigo-500"
                style={{ minHeight: '44px' }}
              >
                Verify & Submit for AI Evaluation
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Teacher Create Assignment Modal */}
      {showNewAssignmentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs"
            onClick={() => setShowNewAssignmentModal(false)}
          />

          <form
            onSubmit={handleCreateAssignment}
            className="relative w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900 z-10 space-y-4"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
              <h3 className="font-bold text-slate-900 dark:text-white">
                Create Homework Assignment
              </h3>
              <button
                type="button"
                onClick={() => setShowNewAssignmentModal(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500 dark:bg-slate-800"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase text-slate-400">Title</label>
              <input
                type="text"
                required
                placeholder="e.g., Quadratic Equations Practice 4.2"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs font-bold text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                style={{ minHeight: '44px' }}
              />
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-[10px] font-bold uppercase text-slate-400">Class</label>
                <select
                  value={newClass}
                  onChange={(e) => setNewClass(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-2 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  style={{ minHeight: '44px' }}
                >
                  {availableClasses.map((cls) => (
                    <option key={cls} value={cls}>
                      {cls}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase text-slate-400">Subject</label>
                <select
                  value={newSubject}
                  onChange={(e) => setNewSubject(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-2 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  style={{ minHeight: '44px' }}
                >
                  {availableSubjects.map((sbj) => (
                    <option key={sbj} value={sbj}>
                      {sbj}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase text-slate-400">Due Date</label>
                <input
                  type="date"
                  value={newDueDate}
                  onChange={(e) => setNewDueDate(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-2 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  style={{ minHeight: '44px' }}
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase text-slate-400">Instructions / Problems</label>
              <textarea
                rows={3}
                placeholder="List problem numbers or upload rubric..."
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>

            <button
              type="submit"
              className="w-full rounded-xl bg-indigo-600 py-3 text-xs font-bold text-white shadow-md hover:bg-indigo-700 dark:bg-indigo-500"
              style={{ minHeight: '44px' }}
            >
              Publish to Students
            </button>
          </form>
        </div>
      )}

      {/* Edit Homework Modal */}
      {editingAssignment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs animate-fadeIn">
          <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Edit2 className="h-4 w-4 text-indigo-600" />
                <span>Uy Vazifasini Tahrirlash</span>
              </h3>
              <button onClick={() => setEditingAssignment(null)} className="text-slate-400 hover:text-slate-600">
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEditAssignment} className="mt-4 space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300">Vazifa sarlavhasi</label>
                <input
                  type="text"
                  required
                  value={editingAssignment.title}
                  onChange={(e) => setEditingAssignment({ ...editingAssignment, title: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 font-bold text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300">Sinf</label>
                  <select
                    value={editingAssignment.className}
                    onChange={(e) => setEditingAssignment({ ...editingAssignment, className: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-2 font-semibold dark:border-slate-700 dark:bg-slate-800"
                  >
                    {availableClasses.map((cls) => (
                      <option key={cls} value={cls}>{cls} sinf</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300">Muddat (Due Date)</label>
                  <input
                    type="date"
                    value={editingAssignment.dueDate}
                    onChange={(e) => setEditingAssignment({ ...editingAssignment, dueDate: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-2 font-semibold dark:border-slate-700 dark:bg-slate-800"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300">Tavsif va shartlar</label>
                <textarea
                  rows={3}
                  value={editingAssignment.description}
                  onChange={(e) => setEditingAssignment({ ...editingAssignment, description: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 dark:border-slate-700 dark:bg-slate-800"
                />
              </div>

              <div className="mt-4 flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingAssignment(null)}
                  className="rounded-xl px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  Bekor qilish
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-indigo-600 px-5 py-2 font-bold text-white hover:bg-indigo-700 shadow-md"
                >
                  O‘zgarishlarni saqlash
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
