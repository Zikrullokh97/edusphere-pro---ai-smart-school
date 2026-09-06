import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import {
  Users,
  UserCheck,
  Sparkles,
  Flame,
  Trophy,
  Award,
  CalendarCheck,
  Calendar,
  Clock,
  Send,
  MessageSquare,
  ChevronRight,
  CheckCircle2,
  AlertCircle,
  QrCode,
  Download,
  Bot,
  GraduationCap,
  FileSpreadsheet,
  BookOpen,
  ArrowRight,
  TrendingUp,
  ShieldCheck,
  X,
  Phone,
  Layers,
  HeartHandshake,
  Star,
  Zap,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { AppLanguage, ScheduleSlot, StudentRecord, UserRole } from '../../types';
import { useI18n } from '../../lib/i18n';
import { MOCK_STUDENTS, MOCK_HOMEWORKS, MOCK_SCHEDULE, MOCK_TEACHERS } from '../../data/mockData';
import { GateMovementTimeline } from '../attendance/GateMovementTimeline';

interface StudentParentPortalProps {
  language: AppLanguage;
  currentRole?: UserRole;
  onNavigate?: (tabId: string) => void;
  masterSchedule?: ScheduleSlot[];
  initialActiveSubTab?: 'all_in_one' | 'student' | 'parent';
}

export const StudentParentPortal: React.FC<StudentParentPortalProps> = ({
  language,
  currentRole = 'parent_student',
  onNavigate,
  masterSchedule,
  initialActiveSubTab,
}) => {
  const t = useI18n(language);

  // Available children in the family
  const familyChildren: StudentRecord[] = MOCK_STUDENTS.slice(0, 4);
  const [selectedChildId, setSelectedChildId] = useState<string>(familyChildren[0]?.id || 'std-01');

  const selectedChild =
    familyChildren.find((c) => c.id === selectedChildId) || familyChildren[0];

  // Active perspective inside the unified portal:
  // 'all_in_one': Unified Family & Student Overview
  // 'student': Student Workspace (XP, Games, Homework, Schedule, AI Tutor)
  // 'parent': Parent Monitoring (AI Digest, Biometric Attendance, Teacher Chat, Risk Flags)
  const [activePortalTab, setActivePortalTab] = useState<'all_in_one' | 'student' | 'parent'>(
    initialActiveSubTab || 'all_in_one'
  );

  // Teacher messaging state
  const [selectedTeacherRecipient, setSelectedTeacherRecipient] = useState<string>(
    MOCK_TEACHERS[0].name + ' (Sinf rahbari - 7-A)'
  );
  const [messageText, setMessageText] = useState('');
  const [messageSent, setMessageSent] = useState(false);

  // QR Code Pass state
  const [showQRModal, setShowQRModal] = useState(false);
  const [studentQRUrl, setStudentQRUrl] = useState<string | null>(null);

  // Today's schedule for selected child
  const allSlots = masterSchedule && masterSchedule.length > 0 ? masterSchedule : MOCK_SCHEDULE;
  const todayClasses = allSlots.filter(
    (s) => s.day === 'MON' && s.className === selectedChild.grade
  );

  useEffect(() => {
    const genQR = async () => {
      const payload = JSON.stringify({
        type: 'EDUSPHERE_FAMILY_STUDENT_PASS',
        studentId: selectedChild.studentId,
        systemId: selectedChild.id,
        name: selectedChild.name,
        grade: selectedChild.grade,
        parentName: selectedChild.parentName,
        parentPhone: selectedChild.parentPhone,
        schoolId: 'sch-001',
        generatedAt: Date.now(),
      });
      try {
        const url = await QRCode.toDataURL(payload, {
          width: 320,
          margin: 2,
          color: { dark: '#1e1b4b', light: '#ffffff' },
        });
        setStudentQRUrl(url);
      } catch (err) {
        console.error(err);
      }
    };
    genQR();
  }, [selectedChild]);

  const handleSendMessage = () => {
    if (!messageText.trim()) return;
    setMessageSent(true);
    setMessageText('');
    setTimeout(() => setMessageSent(false), 3500);
  };

  const handleClaimStreak = () => {
    confetti({
      particleCount: 75,
      spread: 70,
      origin: { y: 0.6 },
    });
  };

  return (
    <div id="student-parent-unified-portal" className="space-y-6 pb-14">
      {/* ========================================================================= */}
      {/* UNIFIED TOP BAR: CHILD SELECTOR & PERSPECTIVE SWITCHER */}
      {/* ========================================================================= */}
      <div className="flex flex-col justify-between gap-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900 lg:flex-row lg:items-center">
        {/* Portal Title & Child Selector */}
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-linear-to-tr from-indigo-600 to-purple-600 text-white shadow-md">
            <HeartHandshake className="h-6 w-6" />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-black tracking-tight text-slate-900 dark:text-white sm:text-xl">
                {language === 'uz'
                  ? 'Ota-ona va O‘quvchi Yagona Portali'
                  : 'Student & Parent Unified Portal'}
              </h1>
              <span className="rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-black text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300">
                Oila & Ta’lim
              </span>
            </div>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              O‘quvchi darslari, AI repetitori, ota-ona monitoringi va davomat xulosasi bitta joyda
            </p>
          </div>
        </div>

        {/* Family Child Selector Tabs */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold text-slate-400 dark:text-slate-500">
            {language === 'uz' ? 'O‘quvchi:' : 'Child:'}
          </span>
          {familyChildren.map((child) => {
            const isSelected = child.id === selectedChild.id;
            return (
              <button
                key={child.id}
                type="button"
                onClick={() => setSelectedChildId(child.id)}
                className={`flex items-center gap-2 rounded-2xl px-3 py-1.5 text-xs font-bold transition-all ${
                  isSelected
                    ? 'bg-indigo-600 text-white shadow-xs scale-[1.02]'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
                }`}
              >
                <img
                  src={child.avatar}
                  alt={child.name}
                  className="h-5 w-5 rounded-full object-cover ring-1 ring-white"
                />
                <span>{child.name.split(' ')[0]}</span>
                <span
                  className={`rounded-md px-1.5 py-0.2 text-[10px] ${
                    isSelected ? 'bg-white/25 text-white' : 'bg-slate-200 dark:bg-slate-700'
                  }`}
                >
                  {child.grade}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3-WAY PERSPECTIVE TABS */}
      {/* ========================================================================= */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3 dark:border-slate-800">
        <div className="flex items-center gap-1.5 rounded-2xl bg-slate-100 p-1 dark:bg-slate-800">
          <button
            type="button"
            onClick={() => setActivePortalTab('all_in_one')}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all ${
              activePortalTab === 'all_in_one'
                ? 'bg-white text-indigo-700 shadow-xs dark:bg-slate-900 dark:text-indigo-400'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-400'
            }`}
          >
            <Layers className="h-4 w-4" />
            <span>{language === 'uz' ? 'Oila Umumiy Markazi' : 'Family & Student Hub'}</span>
          </button>

          <button
            type="button"
            onClick={() => setActivePortalTab('student')}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all ${
              activePortalTab === 'student'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-400'
            }`}
          >
            <Flame className="h-4 w-4 text-amber-300" />
            <span>{language === 'uz' ? 'O‘quvchi Kabineti (Darslar & XP)' : 'Student Workspace'}</span>
          </button>

          <button
            type="button"
            onClick={() => setActivePortalTab('parent')}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all ${
              activePortalTab === 'parent'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-400'
            }`}
          >
            <UserCheck className="h-4 w-4" />
            <span>{language === 'uz' ? 'Ota-ona Nazorati (AI Tahlil & Davomat)' : 'Parent Monitoring'}</span>
          </button>
        </div>

        {/* Quick Quick Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowQRModal(true)}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
          >
            <QrCode className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
            <span>{language === 'uz' ? 'Raqamli O‘quvchi Guvohnomasi' : 'Student Digital Pass'}</span>
          </button>

          {onNavigate && (
            <button
              type="button"
              onClick={() => onNavigate('ai-tutor')}
              className="flex items-center gap-1.5 rounded-xl bg-linear-to-r from-indigo-600 to-purple-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-xs hover:opacity-90"
            >
              <Bot className="h-4 w-4" />
              <span>AI Sokrat Tyutor</span>
            </button>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: UNIFIED FAMILY & STUDENT ALL-IN-ONE OVERVIEW */}
      {/* ========================================================================= */}
      {(activePortalTab === 'all_in_one' || activePortalTab === 'student') && (
        <div className="space-y-6">
          {/* Gamified Hero + Child Profile Banner */}
          <div className="relative overflow-hidden rounded-3xl border border-indigo-200/80 bg-linear-to-r from-indigo-900 via-indigo-800 to-purple-900 p-6 text-white shadow-lg">
            <div className="relative z-10 flex flex-col justify-between gap-5 md:flex-row md:items-center">
              <div className="flex items-start gap-4">
                <img
                  src={selectedChild.avatar}
                  alt={selectedChild.name}
                  className="h-16 w-16 rounded-2xl object-cover ring-4 ring-white/20 shadow-md"
                />
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-amber-400/20 px-2.5 py-0.5 text-xs font-bold text-amber-300 backdrop-blur-xs">
                      ⭐ {selectedChild.grade} Sinf O‘quvchisi
                    </span>
                    <span className="flex items-center gap-1 text-xs text-amber-300 font-bold">
                      <Flame className="h-4 w-4 fill-amber-400 text-amber-400" /> {selectedChild.streakDays || 7} Kunlik Ketma-ketlik!
                    </span>
                  </div>

                  <h2 className="mt-1.5 text-xl font-black tracking-tight sm:text-2xl">
                    {selectedChild.name}
                  </h2>
                  <p className="text-xs text-indigo-100/90 sm:text-sm">
                    Daraja {selectedChild.level || 12} Bilimdon • Keyingi darajagacha yana <b>50 XP</b> qoldi!
                  </p>
                </div>
              </div>

              {/* XP Progress & Streak Claim Button */}
              <div className="flex flex-wrap items-center gap-3">
                <div className="rounded-2xl bg-white/10 p-3.5 backdrop-blur-md border border-white/10 text-center min-w-[130px]">
                  <div className="text-[10px] uppercase font-bold text-indigo-200">Gamifikatsiya</div>
                  <div className="text-xl font-black text-amber-300 mt-0.5">{selectedChild.xp} XP</div>
                  <div className="text-[10px] text-indigo-200 mt-0.5">Top 3 o‘rinda 🏆</div>
                </div>

                <button
                  type="button"
                  onClick={handleClaimStreak}
                  className="flex items-center gap-2 rounded-2xl bg-linear-to-r from-amber-400 to-amber-500 px-4 py-3 text-xs font-black text-indigo-950 shadow-md transition-all hover:scale-105 active:scale-95"
                >
                  <Zap className="h-4 w-4 fill-indigo-950" />
                  <span>Kunlik Bonusni Olish (+50 XP)</span>
                </button>
              </div>
            </div>

            {/* Quick Metrics Bar */}
            <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4 border-t border-white/10 pt-4 text-xs">
              <div>
                <span className="text-indigo-200">GPA O‘rtacha Baho:</span>
                <div className="text-lg font-black text-white">{selectedChild.avgGrade}% (A'lo)</div>
              </div>
              <div>
                <span className="text-indigo-200">Davomat Ko‘rsatkichi:</span>
                <div className="text-lg font-black text-emerald-300">{selectedChild.attendanceRate}%</div>
              </div>
              <div>
                <span className="text-indigo-200">Vazifalar Bajarilishi:</span>
                <div className="text-lg font-black text-amber-300">{selectedChild.homeworkCompletionRate}%</div>
              </div>
              <div>
                <span className="text-indigo-200">Biometrik FaceID:</span>
                <div className="text-lg font-black text-emerald-300">✅ 08:14 da kirdi</div>
              </div>
            </div>
          </div>

          {/* Core Content Grid: Left Column (Schedule & Homeworks) + Right Column (AI Digest & Teacher Chat) */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {/* LEFT 2 COLS: Academic & Student Daily Flow */}
            <div className="space-y-6 lg:col-span-2">
              {/* Today's Classes */}
              <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      Bugungi Dars Jadvali ({selectedChild.grade} Sinf)
                    </h3>
                  </div>
                  {onNavigate && (
                    <button
                      type="button"
                      onClick={() => onNavigate('schedule')}
                      className="text-xs font-bold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 flex items-center gap-1"
                    >
                      <span>To‘liq Jadval</span>
                      <ChevronRight className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>

                <div className="mt-4 space-y-2.5">
                  {todayClasses.slice(0, 4).map((slot, index) => (
                    <div
                      key={slot.id || index}
                      className="flex items-center justify-between rounded-2xl bg-slate-50 p-3.5 transition-all hover:bg-slate-100/80 dark:bg-slate-800/60 dark:hover:bg-slate-800 border border-slate-100 dark:border-slate-800"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100 font-black text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 text-xs">
                          {slot.period}-soat
                        </div>
                        <div>
                          <div className="text-xs font-bold text-slate-900 dark:text-white">
                            {slot.subject}
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400">
                            {slot.teacherName} • Xona: {slot.room}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="rounded-full bg-slate-200/80 px-2.5 py-0.5 text-[10px] font-bold text-slate-700 dark:bg-slate-700 dark:text-slate-300">
                          {slot.time}
                        </span>
                        {index === 0 && (
                          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-black text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                            Tugallangan
                          </span>
                        )}
                        {index === 1 && (
                          <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-black text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300 animate-pulse">
                            Hozir darsda
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Active Homeworks with AI Grading */}
              <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    <BookOpen className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      Topshirilishi Kerak Bo‘lgan Uy Vazifalari
                    </h3>
                  </div>
                  {onNavigate && (
                    <button
                      type="button"
                      onClick={() => onNavigate('homework')}
                      className="text-xs font-bold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 flex items-center gap-1"
                    >
                      <span>Barcha Vazifalar</span>
                      <ChevronRight className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>

                <div className="mt-4 space-y-3">
                  {MOCK_HOMEWORKS.slice(0, 3).map((hw) => (
                    <div
                      key={hw.id}
                      className="rounded-2xl border border-slate-100 bg-slate-50 p-4 transition-all hover:border-indigo-200 dark:border-slate-800 dark:bg-slate-800/60"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="rounded-md bg-indigo-100 px-2 py-0.5 text-[10px] font-black text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300">
                              {hw.subject}
                            </span>
                            <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                              {hw.title}
                            </h4>
                          </div>
                          <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
                            {hw.description}
                          </p>
                        </div>

                        <span className="text-[11px] font-bold text-rose-600">
                          Muddat: {hw.dueDate}
                        </span>
                      </div>

                      <div className="mt-3 flex items-center justify-between border-t border-slate-200/60 pt-2.5 dark:border-slate-700 text-xs">
                        <span className="text-slate-400">Mukofot: +{hw.xpReward || 30} XP</span>
                        {onNavigate && (
                          <button
                            type="button"
                            onClick={() => onNavigate('homework')}
                            className="flex items-center gap-1 rounded-xl bg-indigo-600 px-3 py-1 text-[11px] font-bold text-white shadow-2xs hover:bg-indigo-700"
                          >
                            <span>Topshirish & AI Baholash</span>
                            <ArrowRight className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Turnstile Face ID Timeline */}
              <GateMovementTimeline
                studentId={selectedChild.studentId || selectedChild.id}
                studentName={selectedChild.name}
              />
            </div>

            {/* RIGHT COLUMN: AI Pedagogical Digest & Teacher Communication */}
            <div className="space-y-6">
              {/* AI Weekly Pedagogical Digest for Parents */}
              <div className="rounded-3xl border border-indigo-200/90 bg-linear-to-b from-indigo-50/80 via-white to-purple-50/40 p-5 shadow-xs dark:border-indigo-900/60 dark:from-indigo-950/40 dark:via-slate-900 dark:to-slate-900">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-600 text-white">
                    <Sparkles className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-300">
                      AI Pedagogik Xulosa
                    </h3>
                    <div className="text-xs text-slate-500">Haftalik monitoring hisoboti</div>
                  </div>
                </div>

                <div className="mt-4 rounded-2xl bg-white p-4 text-xs leading-relaxed text-slate-800 shadow-2xs dark:bg-slate-800/90 dark:text-slate-200 border border-indigo-100 dark:border-indigo-900/40">
                  <p className="font-semibold text-slate-900 dark:text-white">
                    Hurmatli {selectedChild.parentName},
                  </p>
                  <p className="mt-1 text-slate-600 dark:text-slate-300">
                    <strong>{selectedChild.name}</strong> ushbu haftada Matematika va Ingliz tili fanlaridan a'lo natija ko‘rsatdi. Kasrlar va tenglamalar mavzusidagi tushunish darajasi <strong>94%</strong> ga yetdi.
                  </p>

                  <div className="mt-3 space-y-2">
                    <div className="rounded-xl bg-emerald-50 p-2 text-[11px] text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300">
                      <strong>✅ Kuchli tomoni:</strong> Topshiriqlarni vaqtida bajarish va jamoaviy bellashuvlarda faollik.
                    </div>
                    <div className="rounded-xl bg-indigo-50 p-2 text-[11px] text-indigo-800 dark:bg-indigo-950/50 dark:text-indigo-300">
                      <strong>💡 Tavsiya:</strong> Fizika laboratoriya darslari uchun qo‘shimcha 2 ta amaliy masalani AI repetitor bilan mashq qilish tavsiya etiladi.
                    </div>
                  </div>
                </div>

                {onNavigate && (
                  <button
                    type="button"
                    onClick={() => onNavigate('gradebook')}
                    className="mt-3 w-full rounded-2xl border border-indigo-200 bg-white py-2.5 text-center text-xs font-bold text-indigo-700 shadow-2xs hover:bg-indigo-50 dark:border-indigo-800 dark:bg-slate-800 dark:text-indigo-300"
                  >
                    Barcha Baholar va Choraklik Hisobot
                  </button>
                )}
              </div>

              {/* Direct Teacher Chat Box */}
              <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
                <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
                  <MessageSquare className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    O‘qituvchi Bilan Aloqa
                  </h3>
                </div>

                <div className="mt-3.5 space-y-3">
                  <div>
                    <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                      Qabul qiluvchi o‘qituvchi:
                    </label>
                    <select
                      value={selectedTeacherRecipient}
                      onChange={(e) => setSelectedTeacherRecipient(e.target.value)}
                      className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-2 text-xs font-semibold text-slate-900 dark:border-slate-800 dark:bg-slate-800 dark:text-white"
                    >
                      {MOCK_TEACHERS.map((tch) => (
                        <option key={tch.id} value={`${tch.name} (${tch.subject})`}>
                          {tch.name} — {tch.subject} {tch.homeroomClass ? `(Sinf rahbari ${tch.homeroomClass})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <textarea
                      rows={3}
                      value={messageText}
                      onChange={(e) => setMessageText(e.target.value)}
                      placeholder="O‘qituvchiga savol yoki murojaatingizni yozing..."
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs text-slate-900 focus:outline-hidden dark:border-slate-800 dark:bg-slate-800 dark:text-white"
                    />
                  </div>

                  {messageSent ? (
                    <div className="flex items-center gap-2 rounded-xl bg-emerald-50 p-2.5 text-xs font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                      <CheckCircle2 className="h-4 w-4" />
                      <span>Xabaringiz o‘qituvchiga yetkazildi!</span>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={handleSendMessage}
                      className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-indigo-700 transition-all"
                    >
                      <Send className="h-3.5 w-3.5" />
                      <span>Xabarni Yuborish</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: DETAILED PARENT MONITORING & ATTENDANCE AUDIT */}
      {/* ========================================================================= */}
      {activePortalTab === 'parent' && (
        <div className="space-y-6">
          {/* Biometric Attendance & Security Log */}
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900">
            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-600 text-white">
                  <CalendarCheck className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Biometrik FaceID & SMS Davomat Jurnali
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Maktab turniketidan kirish-chiqish vaqtining real-vaqtdagi tasdig‘i
                  </p>
                </div>
              </div>

              <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-black text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                Oylik Davomat: {selectedChild.attendanceRate}% (Namunali)
              </span>
            </div>

            <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { date: 'Bugun (21-Avgust)', timeIn: '08:14', timeOut: '13:45', status: 'present', note: 'FaceID 99.4% ishonchlilik' },
                { date: 'Kecha (20-Avgust)', timeIn: '08:18', timeOut: '14:00', status: 'present', note: 'Vaqtida kelgan' },
                { date: '19-Avgust', timeIn: '08:10', timeOut: '13:30', status: 'present', note: 'Vaqtida kelgan' },
                { date: '18-Avgust', timeIn: '08:22', timeOut: '13:30', status: 'present', note: 'Vaqtida kelgan' },
              ].map((log, i) => (
                <div
                  key={i}
                  className="rounded-2xl border border-slate-100 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800/50"
                >
                  <div className="flex items-center justify-between text-xs font-bold text-slate-900 dark:text-white">
                    <span>{log.date}</span>
                    <span className="text-emerald-600">✅ Kelgan</span>
                  </div>
                  <div className="mt-3 space-y-1 text-xs">
                    <div className="flex justify-between text-slate-600 dark:text-slate-300">
                      <span>Kirish:</span>
                      <strong className="text-emerald-700 dark:text-emerald-400">{log.timeIn}</strong>
                    </div>
                    <div className="flex justify-between text-slate-600 dark:text-slate-300">
                      <span>Chiqish:</span>
                      <strong className="text-slate-700 dark:text-slate-300">{log.timeOut}</strong>
                    </div>
                  </div>
                  <div className="mt-2 text-[10px] text-slate-400">{log.note}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Academic Mastery & Knowledge Graph for Parent */}
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center gap-2 pb-4 border-b border-slate-100 dark:border-slate-800">
              <GraduationCap className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Fanlar Bo‘yicha O‘zlashtirish va GPA Dinamikasi
              </h3>
            </div>

            <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[
                { subject: 'Matematika & Algebra', grade: 94, teacher: 'Aygul Sadykova', status: "A'lo" },
                { subject: 'Fizika & Dinamika', grade: 82, teacher: 'Erkin Beishenaliev', status: 'Yaxshi' },
                { subject: 'Kompyuter Savodxonligi', grade: 98, teacher: 'Timur Batyrov', status: "A'lo" },
                { subject: 'Ingliz Tili', grade: 91, teacher: 'Nargiza Umarova', status: "A'lo" },
                { subject: 'Ona Tili & Adabiyot', grade: 88, teacher: 'Gulira Toktobaeva', status: 'Yaxshi' },
                { subject: 'Biologiya & Kimyo', grade: 86, teacher: 'Malika Karimova', status: 'Yaxshi' },
              ].map((sub, idx) => (
                <div
                  key={idx}
                  className="rounded-2xl border border-slate-100 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800/60"
                >
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white">{sub.subject}</h4>
                    <span className="rounded-md bg-indigo-100 px-2 py-0.5 text-xs font-black text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300">
                      {sub.grade}%
                    </span>
                  </div>
                  <div className="mt-2 text-[11px] text-slate-500">O‘qituvchi: {sub.teacher}</div>
                  <div className="mt-2.5 h-2 w-full rounded-full bg-slate-200 dark:bg-slate-700">
                    <div
                      className={`h-full rounded-full ${
                        sub.grade >= 90 ? 'bg-emerald-500' : 'bg-indigo-600'
                      }`}
                      style={{ width: `${sub.grade}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* DIGITAL STUDENT PASS / QR MODAL */}
      {/* ========================================================================= */}
      {showQRModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900 text-center">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-indigo-600" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  EduSphere Raqamli Pasport
                </h3>
              </div>
              <button
                onClick={() => setShowQRModal(false)}
                className="rounded-xl p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4 flex flex-col items-center">
              <img
                src={selectedChild.avatar}
                alt={selectedChild.name}
                className="h-16 w-16 rounded-2xl object-cover ring-2 ring-indigo-500/20 shadow-md"
              />
              <h4 className="mt-2 text-base font-black text-slate-900 dark:text-white">
                {selectedChild.name}
              </h4>
              <p className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold">
                ID: {selectedChild.studentId} • {selectedChild.grade} Sinf
              </p>

              {studentQRUrl && (
                <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-3 shadow-inner dark:border-slate-700">
                  <img src={studentQRUrl} alt="QR Code Pass" className="h-44 w-44 object-contain" />
                </div>
              )}

              <p className="mt-3 text-[11px] text-slate-500">
                Maktab turniketi, oshxona va kutubxonada ushbu QR kod orqali bir zumda kirish mumkin.
              </p>

              <button
                onClick={() => setShowQRModal(false)}
                className="mt-4 w-full rounded-xl bg-slate-900 py-2 text-xs font-bold text-white dark:bg-white dark:text-slate-950"
              >
                Yopish
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
