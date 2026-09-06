import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import {
  Flame,
  Trophy,
  Zap,
  BookOpen,
  CalendarCheck,
  Award,
  Sparkles,
  ArrowRight,
  Bot,
  CheckCircle2,
  Clock,
  ChevronRight,
  TrendingUp,
  QrCode,
  X,
  ShieldCheck,
  Download,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { AppLanguage, ScheduleSlot } from '../../types';
import { useI18n } from '../../lib/i18n';
import { MOCK_STUDENTS, MOCK_HOMEWORKS, MOCK_SCHEDULE } from '../../data/mockData';

interface StudentDashboardProps {
  language: AppLanguage;
  onNavigate: (tabId: string) => void;
  masterSchedule?: ScheduleSlot[];
}

export const StudentDashboard: React.FC<StudentDashboardProps> = ({
  language,
  onNavigate,
  masterSchedule,
}) => {
  const t = useI18n(language);
  const currentStudent = MOCK_STUDENTS[0]; // Ali Nurdinov
  const studentHomeworks = MOCK_HOMEWORKS;
  const allSlots = masterSchedule && masterSchedule.length > 0 ? masterSchedule : MOCK_SCHEDULE;
  const todayClasses = allSlots.filter((s) => s.day === 'MON' && s.className === '7-A');

  const [showQRModal, setShowQRModal] = useState(false);
  const [studentQRUrl, setStudentQRUrl] = useState<string | null>(null);

  useEffect(() => {
    const genQR = async () => {
      const payload = JSON.stringify({
        type: 'EDUSPHERE_STUDENT_PASS',
        studentId: currentStudent.studentId,
        systemId: currentStudent.id,
        name: currentStudent.name,
        grade: currentStudent.grade,
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
  }, [currentStudent]);

  const handleClaimStreakReward = () => {
    confetti({
      particleCount: 70,
      spread: 60,
      origin: { y: 0.6 },
    });
  };

  return (
    <div id="student-dashboard-view" className="space-y-6 pb-12">
      {/* Gamified Hero Banner */}
      <div className="relative overflow-hidden rounded-2xl border border-indigo-200/80 bg-linear-to-r from-indigo-900 via-indigo-800 to-purple-900 p-6 text-white shadow-lg">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-amber-400/20 px-2.5 py-0.5 text-xs font-bold text-amber-300 backdrop-blur-xs">
                ⭐ Grade 7-A Explorer
              </span>
              <span className="flex items-center gap-1 text-xs text-amber-300 font-semibold">
                <Flame className="h-4 w-4 fill-amber-400 text-amber-400" /> 7 Day Streak!
              </span>
            </div>
            <h1 className="mt-2 text-xl font-bold tracking-tight sm:text-2xl">
              Welcome back, {currentStudent.name} 🚀
            </h1>
            <p className="mt-1 text-xs text-indigo-100/90 sm:text-sm">
              Level 12 Math Master • You are only <b>50 XP</b> away from unlocking <b>Level 13 Wizard</b>!
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setShowQRModal(true)}
              className="flex items-center gap-1.5 rounded-xl bg-white/20 hover:bg-white/30 backdrop-blur-md px-3.5 py-2.5 text-xs font-bold text-white shadow-xs transition-all border border-white/30"
              style={{ minHeight: '44px' }}
            >
              <QrCode className="h-4 w-4" />
              <span>Show My QR Pass</span>
            </button>

            <button
              onClick={() => onNavigate('ai-tutor')}
              className="flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-xs font-bold text-indigo-900 shadow-md transition-transform hover:scale-105"
              style={{ minHeight: '44px' }}
            >
              <Bot className="h-4 w-4 text-indigo-600" />
              <span>Ask Socratic AI Tutor</span>
            </button>
          </div>
        </div>

        {/* XP Progress Bar */}
        <div className="mt-6 rounded-xl bg-black/20 p-3.5 backdrop-blur-xs">
          <div className="flex justify-between text-xs font-bold">
            <span className="flex items-center gap-1.5 text-amber-300">
              <Trophy className="h-4 w-4 text-amber-400" /> Level 12 (1,450 XP)
            </span>
            <span className="text-indigo-200">Next: Level 13 (1,500 XP)</span>
          </div>
          <div className="mt-2 h-3 w-full overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full bg-linear-to-r from-amber-400 via-yellow-300 to-emerald-400 rounded-full transition-all duration-1000"
              style={{ width: '96.6%' }}
            />
          </div>
        </div>
      </div>

      {/* 4 Gamification & Achievement Badges */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {currentStudent.badges.map((badge, idx) => (
          <div
            key={idx}
            className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3.5 shadow-xs dark:border-slate-800 dark:bg-slate-900"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400">
              <Award className="h-5 w-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-900 dark:text-white">{badge}</div>
              <div className="text-[10px] text-slate-400">Verified Achievement</div>
            </div>
          </div>
        ))}
      </div>

      {/* Two Column Grid: Leaderboard & Pending Homework */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Class Leaderboard (1 Col) */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Trophy className="h-4 w-4 text-amber-500" />
              <h3 className="font-bold text-slate-900 dark:text-white">{t('leaderboard')} (7-A)</h3>
            </div>
            <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">Term 2</span>
          </div>

          <div className="mt-4 space-y-2.5">
            {[
              { rank: 1, name: 'Sara Amanova', xp: '1,620 XP', medal: '🥇', isYou: false },
              { rank: 2, name: 'Ali Nurdinov', xp: '1,450 XP', medal: '🥈', isYou: true },
              { rank: 3, name: 'Timur Asanov', xp: '1,380 XP', medal: '🥉', isYou: false },
              { rank: 4, name: 'Dinara Kasymova', xp: '1,310 XP', medal: '4', isYou: false },
              { rank: 5, name: 'Bekzod Rakhimov', xp: '1,120 XP', medal: '5', isYou: false },
            ].map((p) => (
              <div
                key={p.name}
                className={`flex items-center justify-between rounded-xl p-2.5 text-xs transition-all ${
                  p.isYou
                    ? 'border border-indigo-300 bg-indigo-50/80 font-bold text-indigo-900 dark:border-indigo-900 dark:bg-indigo-950/60 dark:text-indigo-200'
                    : 'bg-slate-50 text-slate-700 dark:bg-slate-800/60 dark:text-slate-300'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-sm">{p.medal}</span>
                  <div>
                    <span>{p.name}</span>
                    {p.isYou && <span className="ml-1.5 text-[10px] text-indigo-600">(You)</span>}
                  </div>
                </div>
                <span className="font-mono font-bold">{p.xp}</span>
              </div>
            ))}
          </div>

          <div className="mt-4 border-t border-slate-100 pt-3 dark:border-slate-800">
            <button
              onClick={handleClaimStreakReward}
              className="w-full flex items-center justify-center gap-1.5 rounded-xl bg-indigo-50 py-2 text-xs font-bold text-indigo-700 hover:bg-indigo-100 dark:bg-indigo-950 dark:text-indigo-300"
            >
              <Flame className="h-3.5 w-3.5 text-amber-500 fill-amber-500" />
              <span>Claim Daily Streak Bonus (+20 XP)</span>
            </button>
          </div>
        </div>

        {/* Pending Homework & Today's Schedule (2 Cols) */}
        <div className="space-y-6 lg:col-span-2">
          {/* Pending Assignments */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-900 dark:text-white">My Assignments & Tasks</h3>
              <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">1 Due Tomorrow</span>
            </div>

            <div className="mt-4 space-y-3">
              {studentHomeworks.map((hw) => (
                <div
                  key={hw.id}
                  className="flex flex-col justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50/70 p-4 sm:flex-row sm:items-center dark:border-slate-800 dark:bg-slate-800/40"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="rounded bg-indigo-100 px-2 py-0.5 text-[10px] font-bold text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300">
                        {hw.subject}
                      </span>
                      <span className="text-xs text-slate-400">Due {hw.dueDate}</span>
                    </div>
                    <h4 className="mt-1.5 text-xs font-bold text-slate-900 dark:text-white">{hw.title}</h4>
                    <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">{hw.description}</p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onNavigate('ai-tutor')}
                      className="flex items-center gap-1 rounded-xl border border-indigo-200 bg-white px-3 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-50 dark:border-indigo-800 dark:bg-slate-800 dark:text-indigo-300"
                    >
                      <Sparkles className="h-3.5 w-3.5" />
                      <span>Get Hint</span>
                    </button>

                    <button
                      onClick={() => onNavigate('homework')}
                      className="rounded-xl bg-indigo-600 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-indigo-700 dark:bg-indigo-500"
                    >
                      Submit
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Today's Classes */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
            <h3 className="font-bold text-slate-900 dark:text-white">Today's Class Schedule (Grade 7-A)</h3>
            <div className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              {todayClasses.map((cls) => (
                <div
                  key={cls.id}
                  className="rounded-xl border border-slate-100 bg-slate-50 p-3 text-xs dark:border-slate-800 dark:bg-slate-800/60"
                >
                  <div className="flex items-center justify-between font-semibold text-slate-900 dark:text-white">
                    <span>{cls.subject}</span>
                    <span className="text-[10px] text-slate-400">{cls.time}</span>
                  </div>
                  <div className="mt-1 text-[11px] text-slate-500">
                    👨‍🏫 {cls.teacherName} • 📍 {cls.room}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Student QR Modal */}
      {showQRModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs"
            onClick={() => setShowQRModal(false)}
          />

          <div className="relative w-full max-w-sm rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900 z-10 text-center animate-scaleUp">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                <h3 className="font-bold text-slate-900 dark:text-white text-sm">
                  My Digital Attendance Pass
                </h3>
              </div>
              <button
                onClick={() => setShowQRModal(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500 dark:bg-slate-800"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="my-5 p-4 rounded-2xl bg-gradient-to-b from-indigo-50/80 to-white dark:from-indigo-950/40 dark:to-slate-900 border border-indigo-100 dark:border-indigo-900/60">
              <div className="h-16 w-16 rounded-full overflow-hidden mx-auto ring-4 ring-indigo-500/20 shadow-md mb-2">
                <img
                  src={
                    currentStudent.avatar ||
                    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
                  }
                  alt={currentStudent.name}
                  className="h-full w-full object-cover"
                />
              </div>
              <h4 className="text-base font-bold text-slate-900 dark:text-white">
                {currentStudent.name}
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Grade {currentStudent.grade} • ID: {currentStudent.studentId}
              </p>

              {/* Scannable QR Code */}
              <div className="my-4 p-2 bg-white rounded-2xl shadow-inner inline-block border border-slate-200">
                {studentQRUrl ? (
                  <img
                    src={studentQRUrl}
                    alt="My QR Code"
                    className="h-44 w-44 object-contain mx-auto"
                  />
                ) : (
                  <div className="h-44 w-44 flex items-center justify-center text-xs text-slate-400">
                    Generating QR...
                  </div>
                )}
              </div>

              <p className="text-[10px] font-mono text-slate-400">
                Present this QR code to teacher or smart turnstile
              </p>
            </div>

            <button
              onClick={() => {
                if (studentQRUrl) {
                  const link = document.createElement('a');
                  link.download = `${currentStudent.name}-Student-QR.png`;
                  link.href = studentQRUrl;
                  link.click();
                }
              }}
              className="flex items-center justify-center gap-1.5 w-full rounded-xl bg-indigo-600 py-3 text-xs font-bold text-white shadow-md hover:bg-indigo-700 dark:bg-indigo-500"
              style={{ minHeight: '44px' }}
            >
              <Download className="h-4 w-4" />
              <span>Save Pass to Gallery</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
