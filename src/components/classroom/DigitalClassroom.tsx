import React, { useState, useRef, useEffect } from 'react';
import {
  ScreenShare,
  Users,
  Sparkles,
  Play,
  Pause,
  RotateCcw,
  Square,
  Circle,
  Type,
  Eraser,
  Pen,
  Highlighter,
  Trash2,
  Send,
  Loader2,
  CheckCircle2,
  Trophy,
  Zap,
  Bot,
  HelpCircle,
   Swords,
  Grid,
  Check,
  X,
  Volume2,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { AppLanguage, StudentRecord } from '../../types';
import { useI18n } from '../../lib/i18n';
import { listSchoolData } from '../../lib/schoolRepository';
import { authenticatedFetch } from '../../lib/api';

interface DigitalClassroomProps {
  language: AppLanguage;
  currentClass?: string;
  onEndLesson: () => void;
}

export const DigitalClassroom: React.FC<DigitalClassroomProps> = ({
  language,
  currentClass = '7-A',
  onEndLesson,
}) => {
  const t = useI18n(language);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Lesson timer state
  const [seconds, setSeconds] = useState(45 * 60 - 15 * 60); // 30 min remaining
  const [isActiveTimer, setIsActiveTimer] = useState(true);

  // Whiteboard drawing tools state
  const [tool, setTool] = useState<'pen' | 'highlighter' | 'eraser' | 'rect' | 'circle' | 'line'>('pen');
  const [strokeColor, setStrokeColor] = useState('#4F46E5');
  const [strokeWidth, setStrokeWidth] = useState(3);
  const [isDrawing, setIsDrawing] = useState(false);
  const [showGrid, setShowGrid] = useState(true);
  const [activeDiagram, setActiveDiagram] = useState<string | null>('linear_balance');

  // Students live presence
  const [students, setStudents] = useState<StudentRecord[]>([]);

  useEffect(() => {
    let active = true;
    listSchoolData<StudentRecord>('students')
      .then((items) => {
        if (active) setStudents(items.filter((student) => student.grade === currentClass));
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [currentClass]);
  const [raisedHands, setRaisedHands] = useState<Record<string, boolean>>({
    'stu-01': true, // Ali raised hand
    'stu-03': false,
  });

  // AI Assistant Chat & Actions
  const [aiChatMessages, setAiChatMessages] = useState<{ sender: 'ai' | 'user'; text: string }[]>([
    {
      sender: 'ai',
      text: `✨ **EduSphere AI Teacher Assistant Ready**\nTopic: *Linear Equations & Fractions*\n\nClick any shortcut above or ask for instant in-class analogies, diagrams, or team challenges!`,
    },
  ]);
  const [aiInput, setAiInput] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);

  // Interactive Live Quiz Modal / State
  const [showQuizModal, setShowQuizModal] = useState(false);
  const [quizActive, setQuizActive] = useState(false);
  const [quizResponses, setQuizResponses] = useState<{ optionA: number; optionB: number; optionC: number; total: number }>({
    optionA: 4,
    optionB: 21,
    optionC: 3,
    total: 28,
  });

  // Team Battle Generator Modal
  const [showTeamsModal, setShowTeamsModal] = useState(false);

  // Timer loop
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isActiveTimer && seconds > 0) {
      interval = setInterval(() => setSeconds((s) => s - 1), 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isActiveTimer, seconds]);

  const formatTimer = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Canvas setup
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas dimensions
    canvas.width = canvas.parentElement?.clientWidth || 800;
    canvas.height = canvas.parentElement?.clientHeight || 500;

    // Clear with white
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }, []);

  // Drawing Handlers
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (tool === 'eraser') {
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = strokeWidth * 6;
      ctx.globalAlpha = 1.0;
    } else if (tool === 'highlighter') {
      ctx.strokeStyle = '#FBBF24';
      ctx.lineWidth = strokeWidth * 4;
      ctx.globalAlpha = 0.35;
    } else {
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = strokeWidth;
      ctx.globalAlpha = 1.0;
    }

    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const startDrawingTouch = (e: React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || !e.touches[0]) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.touches[0].clientX - rect.left;
    const y = e.touches[0].clientY - rect.top;

    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
  };

  const drawTouch = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas || !e.touches[0]) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.touches[0].clientX - rect.left;
    const y = e.touches[0].clientY - rect.top;

    if (tool === 'eraser') {
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = strokeWidth * 6;
      ctx.globalAlpha = 1.0;
    } else if (tool === 'highlighter') {
      ctx.strokeStyle = '#FBBF24';
      ctx.lineWidth = strokeWidth * 4;
      ctx.globalAlpha = 0.35;
    } else {
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = strokeWidth;
      ctx.globalAlpha = 1.0;
    }

    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    setActiveDiagram(null);
  };

  // AI Assistant Quick Actions
  const handleAiAction = async (action: string) => {
    setIsAiLoading(true);
    try {
      const res = await authenticatedFetch('/api/ai/teacher-assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          topic: 'Linear Equations with Fractions',
          subject: 'Mathematics',
          grade: '7-A',
          language,
        }),
      });
      const data = await res.json();
      if (data.text) {
        setAiChatMessages((prev) => [
          ...prev,
          { sender: 'user', text: `Action: ${action.replace('_', ' ').toUpperCase()}` },
          { sender: 'ai', text: data.text },
        ]);
      }
    } catch {
      setAiChatMessages((prev) => [
        ...prev,
        { sender: 'ai', text: '💡 **Pedagogical Tip:** Use the visual balance scale analogy. Ask students: "If you multiply the left basket by 6, what must you do to the right basket?"' },
      ]);
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleSendAiMessage = async () => {
    if (!aiInput.trim()) return;
    const userMsg = aiInput;
    setAiInput('');
    setAiChatMessages((prev) => [...prev, { sender: 'user', text: userMsg }]);
    setIsAiLoading(true);

    try {
      const res = await authenticatedFetch('/api/ai/teacher-assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'custom_query',
          topic: 'Linear Equations & Algebra',
          context: userMsg,
          subject: 'Mathematics',
          grade: '7-A',
          language,
        }),
      });
      const data = await res.json();
      if (data.text) {
        setAiChatMessages((prev) => [...prev, { sender: 'ai', text: data.text }]);
      }
    } catch {
      setAiChatMessages((prev) => [
        ...prev,
        { sender: 'ai', text: '✨ For this question, guide the student to identify the LCM of denominators first before rearranging terms.' },
      ]);
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleRewardStudent = (student: StudentRecord) => {
    confetti({
      particleCount: 50,
      spread: 60,
      origin: { y: 0.7 },
    });
    setStudents((prev) =>
      prev.map((s) => (s.id === student.id ? { ...s, xp: s.xp + 25 } : s))
    );
    setAiChatMessages((prev) => [
      ...prev,
      { sender: 'ai', text: `🎉 **+25 XP Awarded** to **${student.name}** for outstanding reasoning in class!` },
    ]);
  };

  const handleToggleHand = (studentId: string) => {
    setRaisedHands((prev) => ({ ...prev, [studentId]: !prev[studentId] }));
  };

  return (
    <div id="digital-classroom-studio" className="flex flex-col h-[calc(100vh-5.5rem)] space-y-3">
      {/* Top Classroom Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-white dark:bg-indigo-500 shadow-sm shadow-indigo-500/30">
            <ScreenShare className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white sm:text-base">
                Mathematics — Linear Equations with Fractions
              </h2>
              <span className="rounded-md bg-indigo-100 px-2 py-0.5 text-xs font-bold text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300">
                Grade {currentClass}
              </span>
              <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" /> Live Room 304
              </span>
            </div>
            <p className="text-[11px] text-slate-400">Lesson 14 of 32 • Curriculum Aligned (Central Asian Standard)</p>
          </div>
        </div>

        {/* Center: Timer & Controls */}
        <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 dark:border-slate-800 dark:bg-slate-800">
          <div className="flex items-center gap-1.5 text-sm font-mono font-bold text-slate-900 dark:text-white">
            <span>⏱️</span>
            <span>{formatTimer(seconds)}</span>
          </div>
          <div className="flex items-center gap-1 border-l border-slate-200 pl-2 dark:border-slate-700">
            <button
              onClick={() => setIsActiveTimer(!isActiveTimer)}
              className="rounded p-1 text-slate-500 hover:bg-slate-200 dark:text-slate-400 dark:hover:bg-slate-700"
              title={isActiveTimer ? 'Pause' : 'Resume'}
            >
              {isActiveTimer ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5 text-emerald-600" />}
            </button>
            <button
              onClick={() => setSeconds(45 * 60)}
              className="rounded p-1 text-slate-500 hover:bg-slate-200 dark:text-slate-400 dark:hover:bg-slate-700"
              title="Reset Timer"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Right Actions: Quiz Launcher, Team Battle, End Lesson */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowQuizModal(true)}
            className="flex items-center gap-1.5 rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-bold text-indigo-700 hover:bg-indigo-100 dark:border-indigo-900 dark:bg-indigo-950 dark:text-indigo-300"
          >
            <Trophy className="h-3.5 w-3.5 text-indigo-600" />
            <span>Launch Quiz Battle</span>
          </button>

          <button
            onClick={() => setShowTeamsModal(true)}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
          >
            <Swords className="h-3.5 w-3.5 text-slate-500" />
            <span>Teams</span>
          </button>

          <button
            onClick={onEndLesson}
            className="flex items-center gap-1.5 rounded-xl bg-rose-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-rose-700 dark:bg-rose-500"
          >
            <span>{t('endLesson')}</span>
          </button>
        </div>
      </div>

      {/* 3-Column Workspace */}
      <div className="grid flex-1 grid-cols-1 gap-3 overflow-hidden lg:grid-cols-12">
        {/* Left Column: Students Live Participation Roster (2.5 Cols) */}
        <div className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-3.5 shadow-xs dark:border-slate-800 dark:bg-slate-900 lg:col-span-3">
          <div>
            <div className="flex items-center justify-between border-b border-slate-100 pb-2 dark:border-slate-800">
              <div className="flex items-center gap-1.5">
                <Users className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                <span className="text-xs font-bold text-slate-900 dark:text-white">Active Students</span>
              </div>
              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                28 / 28 Present
              </span>
            </div>

            {/* Students List */}
            <div className="mt-2.5 space-y-2 overflow-y-auto max-h-[calc(100vh-17rem)]">
              {students.map((st) => {
                const isHandRaised = raisedHands[st.id];
                return (
                  <div
                    key={st.id}
                    className={`flex items-center justify-between rounded-xl p-2 text-xs transition-all ${
                      isHandRaised
                        ? 'border border-amber-300 bg-amber-50/80 dark:border-amber-900 dark:bg-amber-950/40'
                        : 'bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/60 dark:hover:bg-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div className="relative">
                        <img src={st.avatar} alt={st.name} className="h-7 w-7 rounded-full object-cover" />
                        <span className="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-slate-900" />
                      </div>
                      <div>
                        <div className="font-semibold text-slate-900 dark:text-white">{st.name}</div>
                        <div className="flex items-center gap-1 text-[10px] text-slate-400">
                          <span>⚡ {st.xp} XP</span>
                          <span>•</span>
                          <span>Avg {st.avgGrade}%</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleToggleHand(st.id)}
                        className={`rounded-lg p-1 text-xs transition-colors ${
                          isHandRaised
                            ? 'bg-amber-200 text-amber-900 dark:bg-amber-800 dark:text-amber-100 animate-bounce'
                            : 'text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                        }`}
                        title={isHandRaised ? 'Hand raised!' : 'Simulate Raise Hand'}
                      >
                        ✋
                      </button>
                      <button
                        onClick={() => handleRewardStudent(st)}
                        className="flex items-center gap-0.5 rounded-lg bg-indigo-100 px-1.5 py-1 text-[10px] font-bold text-indigo-700 hover:bg-indigo-200 dark:bg-indigo-950 dark:text-indigo-300"
                        title="Award +25 XP"
                      >
                        <Zap className="h-3 w-3" />
                        <span>+25</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="border-t border-slate-100 pt-2 text-[11px] text-slate-400 dark:border-slate-800">
            <span>Face ID Verified • Continuous engagement AI active</span>
          </div>
        </div>

        {/* Center Column: Interactive Whiteboard Studio (6.5 Cols) */}
        <div className="relative flex flex-col justify-between overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900 lg:col-span-6">
          {/* Whiteboard Toolbar Header */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-slate-50/90 px-3.5 py-2 dark:border-slate-800 dark:bg-slate-800/80">
            <div className="flex items-center gap-1">
              <button
                onClick={() => setTool('pen')}
                className={`rounded-lg p-1.5 text-xs transition-colors ${
                  tool === 'pen' ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-200 dark:text-slate-300'
                }`}
                title="Pen"
              >
                <Pen className="h-4 w-4" />
              </button>

              <button
                onClick={() => setTool('highlighter')}
                className={`rounded-lg p-1.5 text-xs transition-colors ${
                  tool === 'highlighter' ? 'bg-amber-500 text-white' : 'text-slate-600 hover:bg-slate-200 dark:text-slate-300'
                }`}
                title="Highlighter"
              >
                <Highlighter className="h-4 w-4" />
              </button>

              <button
                onClick={() => setTool('eraser')}
                className={`rounded-lg p-1.5 text-xs transition-colors ${
                  tool === 'eraser' ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-950' : 'text-slate-600 hover:bg-slate-200 dark:text-slate-300'
                }`}
                title="Eraser"
              >
                <Eraser className="h-4 w-4" />
              </button>

              {/* Color Swatches */}
              <div className="flex items-center gap-1 border-l border-slate-200 pl-1.5 ml-1 dark:border-slate-700">
                {['#4F46E5', '#2563EB', '#059669', '#DC2626', '#111827'].map((c) => (
                  <button
                    key={c}
                    onClick={() => {
                      setStrokeColor(c);
                      setTool('pen');
                    }}
                    className={`h-5 w-5 rounded-full border-2 transition-transform ${
                      strokeColor === c && tool === 'pen' ? 'scale-125 border-indigo-400' : 'border-transparent'
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>

              {/* Grid toggle */}
              <button
                onClick={() => setShowGrid(!showGrid)}
                className={`rounded-lg p-1.5 ml-1.5 text-xs ${
                  showGrid ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300' : 'text-slate-400'
                }`}
                title="Toggle Coordinate Grid"
              >
                <Grid className="h-4 w-4" />
              </button>
            </div>

            {/* AI Diagram Quick Selector */}
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400">✨ AI Diagrams:</span>
              <button
                onClick={() => setActiveDiagram('linear_balance')}
                className={`rounded-lg px-2 py-1 text-[10px] font-semibold transition-colors ${
                  activeDiagram === 'linear_balance'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200'
                }`}
              >
                Balance Scale
              </button>
              <button
                onClick={() => setActiveDiagram('coordinate_plane')}
                className={`rounded-lg px-2 py-1 text-[10px] font-semibold transition-colors ${
                  activeDiagram === 'coordinate_plane'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200'
                }`}
              >
                Plot Graph
              </button>
              <button
                onClick={clearCanvas}
                className="rounded-lg p-1.5 text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/40"
                title="Clear Whiteboard"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Whiteboard Interactive Canvas Area */}
          <div className="relative flex-1 bg-white cursor-crosshair overflow-hidden">
            {/* Optional Grid Background */}
            {showGrid && (
              <div
                className="absolute inset-0 pointer-events-none opacity-15"
                style={{
                  backgroundImage: 'radial-gradient(circle, #4F46E5 1px, transparent 1px)',
                  backgroundSize: '24px 24px',
                }}
              />
            )}

            {/* AI Preset Interactive Diagram Overlay */}
            {activeDiagram === 'linear_balance' && (
              <div className="absolute inset-0 p-6 pointer-events-none flex flex-col items-center justify-center">
                <div className="rounded-2xl border border-indigo-200 bg-white/90 p-5 shadow-lg backdrop-blur-xs text-center max-w-md pointer-events-auto">
                  <div className="flex items-center justify-between text-xs text-indigo-600 font-bold">
                    <span>✨ AI Interactive Demonstration</span>
                    <button onClick={() => setActiveDiagram(null)} className="text-slate-400 hover:text-slate-600">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <h3 className="mt-1 text-sm font-bold text-slate-900">
                    {'Equation: (2x - 1)/2 = (x + 5)/3'}
                  </h3>

                  {/* Visual SVG Scale */}
                  <div className="my-3 flex justify-center">
                    <svg width="280" height="100" viewBox="0 0 280 100">
                      {/* Pivot */}
                      <polygon points="140,40 130,80 150,80" fill="#4F46E5" />
                      <line x1="40" y1="40" x2="240" y2="40" stroke="#1E293B" strokeWidth="4" strokeLinecap="round" />
                      {/* Left pan */}
                      <line x1="50" y1="40" x2="50" y2="65" stroke="#64748B" strokeWidth="2" />
                      <path d="M 30 65 Q 50 80, 70 65 Z" fill="#EEF2FF" stroke="#4F46E5" strokeWidth="2" />
                      <text x="50" y="60" textAnchor="middle" fontSize="10" fontWeight="bold" fill="#4F46E5">
                        3(2x - 1)
                      </text>
                      {/* Right pan */}
                      <line x1="230" y1="40" x2="230" y2="65" stroke="#64748B" strokeWidth="2" />
                      <path d="M 210 65 Q 230 80, 250 65 Z" fill="#EEF2FF" stroke="#4F46E5" strokeWidth="2" />
                      <text x="230" y="60" textAnchor="middle" fontSize="10" fontWeight="bold" fill="#4F46E5">
                        2(x + 5)
                      </text>
                    </svg>
                  </div>

                  <p className="text-[11px] text-slate-600">
                    Multiply both sides by <b>LCM(2, 3) = 6</b> to clear denominators: <br />
                    <span className="font-mono font-bold text-indigo-700">$6x - 3 = 2x + 10 \implies 4x = 13 \implies x = 3.25$</span>
                  </p>
                </div>
              </div>
            )}

            {/* Coordinate Plane Diagram */}
            {activeDiagram === 'coordinate_plane' && (
              <div className="absolute inset-0 p-4 pointer-events-none flex items-center justify-center">
                <div className="rounded-xl border border-indigo-200 bg-white/95 p-4 shadow-md pointer-events-auto">
                  <div className="flex justify-between items-center text-xs font-bold text-indigo-600 mb-1">
                    <span>Linear Graph: $y = 2x - 1$</span>
                    <button onClick={() => setActiveDiagram(null)}><X className="h-3.5 w-3.5 text-slate-400" /></button>
                  </div>
                  <svg width="220" height="150" viewBox="0 0 220 150">
                    <line x1="20" y1="75" x2="200" y2="75" stroke="#94A3B8" strokeWidth="2" />
                    <line x1="110" y1="10" x2="110" y2="140" stroke="#94A3B8" strokeWidth="2" />
                    <line x1="40" y1="130" x2="180" y2="20" stroke="#4F46E5" strokeWidth="3" strokeLinecap="round" />
                    <circle cx="110" cy="85" r="4" fill="#DC2626" />
                    <text x="120" y="90" fontSize="9" fill="#DC2626">(0, -1)</text>
                    <circle cx="130" cy="55" r="4" fill="#10B981" />
                    <text x="140" y="55" fontSize="9" fill="#10B981">(1, 1)</text>
                  </svg>
                </div>
              </div>
            )}

            {/* User Drawing Canvas */}
            <canvas
              ref={canvasRef}
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
              onTouchStart={startDrawingTouch}
              onTouchMove={drawTouch}
              onTouchEnd={stopDrawing}
              className="absolute inset-0 h-full w-full touch-none"
            />
          </div>

          {/* Whiteboard Footer Status */}
          <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/80 px-4 py-1.5 text-[11px] text-slate-500 dark:border-slate-800 dark:bg-slate-800/80">
            <span>Draw with cursor / touch • Canvas auto-synced to student screens</span>
            <span>Tool: <b className="capitalize text-slate-800 dark:text-slate-200">{tool}</b></span>
          </div>
        </div>

        {/* Right Column: AI Teacher Assistant Panel (3 Cols) */}
        <div className="flex flex-col justify-between rounded-2xl border border-indigo-200/80 bg-white p-3.5 shadow-xs dark:border-indigo-900/60 dark:bg-slate-900 lg:col-span-3">
          <div>
            <div className="flex items-center justify-between border-b border-indigo-100 pb-2 dark:border-indigo-900/60">
              <div className="flex items-center gap-1.5">
                <div className="flex h-5 w-5 items-center justify-center rounded-md bg-indigo-600 text-white">
                  <Sparkles className="h-3 w-3" />
                </div>
                <span className="text-xs font-bold text-slate-900 dark:text-white">AI Teacher Assistant</span>
              </div>
              <span className="rounded bg-indigo-100 px-1.5 py-0.5 text-[9px] font-bold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                Gemini 3.7
              </span>
            </div>

            {/* Quick Action Shortcuts */}
            <div className="mt-2 grid grid-cols-2 gap-1.5 text-[10px]">
              <button
                onClick={() => handleAiAction('explain_differently')}
                disabled={isAiLoading}
                className="rounded-lg border border-slate-200 bg-slate-50 p-1.5 text-left font-medium text-slate-700 hover:border-indigo-300 hover:bg-indigo-50/50 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-300"
              >
                💡 Explain Differently
              </button>
              <button
                onClick={() => handleAiAction('generate_quiz')}
                disabled={isAiLoading}
                className="rounded-lg border border-slate-200 bg-slate-50 p-1.5 text-left font-medium text-slate-700 hover:border-indigo-300 hover:bg-indigo-50/50 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-300"
              >
                🎯 3-Question Quiz
              </button>
              <button
                onClick={() => handleAiAction('create_game')}
                disabled={isAiLoading}
                className="rounded-lg border border-slate-200 bg-slate-50 p-1.5 text-left font-medium text-slate-700 hover:border-indigo-300 hover:bg-indigo-50/50 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-300"
              >
                🎮 Team Battle
              </button>
              <button
                onClick={() => handleAiAction('make_harder')}
                disabled={isAiLoading}
                className="rounded-lg border border-slate-200 bg-slate-50 p-1.5 text-left font-medium text-slate-700 hover:border-indigo-300 hover:bg-indigo-50/50 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-300"
              >
                ⚡ Olympiad Challenge
              </button>
            </div>

            {/* AI Chat History */}
            <div className="mt-2.5 space-y-2 overflow-y-auto max-h-[calc(100vh-21rem)] pr-1">
              {aiChatMessages.map((msg, i) => (
                <div
                  key={i}
                  className={`rounded-xl p-2.5 text-xs leading-relaxed ${
                    msg.sender === 'user'
                      ? 'ml-4 bg-indigo-600 text-white'
                      : 'bg-indigo-50/80 text-slate-800 dark:bg-indigo-950/50 dark:text-slate-200'
                  }`}
                >
                  <div className="whitespace-pre-wrap">{msg.text}</div>
                </div>
              ))}
              {isAiLoading && (
                <div className="flex items-center gap-2 rounded-xl bg-indigo-50 p-2.5 text-xs text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>AI is formulating classroom recommendation...</span>
                </div>
              )}
            </div>
          </div>

          {/* AI Input */}
          <div className="mt-2 flex gap-1.5 border-t border-slate-100 pt-2 dark:border-slate-800">
            <input
              type="text"
              placeholder="Ask AI assistant anything..."
              value={aiInput}
              onChange={(e) => setAiInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendAiMessage()}
              className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:border-indigo-500 focus:outline-hidden dark:border-slate-800 dark:bg-slate-800 dark:text-white"
            />
            <button
              onClick={handleSendAiMessage}
              disabled={isAiLoading || !aiInput.trim()}
              className="rounded-xl bg-indigo-600 p-2 text-white hover:bg-indigo-700 disabled:opacity-50 dark:bg-indigo-500"
            >
              <Send className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Live Quiz Battle Modal */}
      {showQuizModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-amber-500" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Live Classroom Quiz Battle</h3>
              </div>
              <button onClick={() => setShowQuizModal(false)} className="rounded p-1 text-slate-400 hover:text-slate-600">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 rounded-xl border border-indigo-100 bg-indigo-50/60 p-4 dark:border-indigo-900/60 dark:bg-indigo-950/40">
              <span className="text-[10px] font-bold text-indigo-700 dark:text-indigo-300 uppercase">Question 1 of 3</span>
              <p className="mt-1 text-sm font-bold text-slate-900 dark:text-white">
                If $3(x - 2) = 15$, what is the value of $x$?
              </p>
            </div>

            {/* Live Student Responses */}
            <div className="mt-4 space-y-2 text-xs">
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span className="font-semibold text-slate-700 dark:text-slate-300">A) $x = 5$</span>
                  <span className="text-slate-500">{quizResponses.optionA} students (14%)</span>
                </div>
                <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800">
                  <div className="h-full bg-slate-400 rounded-full" style={{ width: '14%' }} />
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between">
                  <span className="font-bold text-emerald-700 dark:text-emerald-400">B) $x = 7$ (Correct) ✓</span>
                  <span className="font-bold text-emerald-600">{quizResponses.optionB} students (75%)</span>
                </div>
                <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800">
                  <div className="h-full bg-emerald-500 rounded-full" style={{ width: '75%' }} />
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between">
                  <span className="font-semibold text-slate-700 dark:text-slate-300">C) $x = 3$</span>
                  <span className="text-slate-500">{quizResponses.optionC} students (11%)</span>
                </div>
                <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800">
                  <div className="h-full bg-slate-400 rounded-full" style={{ width: '11%' }} />
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={() => {
                  confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
                  setShowQuizModal(false);
                }}
                className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700"
              >
                Award +50 XP to Winning Students
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Team Battle Generator Modal */}
      {showTeamsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Swords className="h-5 w-5 text-indigo-600" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Classroom Teams (3 Groups)</h3>
              </div>
              <button onClick={() => setShowTeamsModal(false)}><X className="h-4 w-4 text-slate-400" /></button>
            </div>

            <div className="mt-4 space-y-3">
              <div className="rounded-xl border border-indigo-200 bg-indigo-50/60 p-3 text-xs dark:border-indigo-900/60 dark:bg-indigo-950/40">
                <span className="font-bold text-indigo-800 dark:text-indigo-300">🏔️ Team Barskoon (9 Students)</span>
                <p className="mt-1 text-slate-600 dark:text-slate-300">Ali Nurdinov (Captain), Sara Amanova, Timur A., ...</p>
              </div>

              <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-3 text-xs dark:border-emerald-900/60 dark:bg-emerald-950/40">
                <span className="font-bold text-emerald-800 dark:text-emerald-300">🌲 Team Ala-Archa (10 Students)</span>
                <p className="mt-1 text-slate-600 dark:text-slate-300">Bekzod Rakhimov (Captain), Dinara K., Malika Y., ...</p>
              </div>

              <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-3 text-xs dark:border-amber-900/60 dark:bg-amber-950/40">
                <span className="font-bold text-amber-800 dark:text-amber-300">⛰️ Team Sulaiman-Too (9 Students)</span>
                <p className="mt-1 text-slate-600 dark:text-slate-300">Azamat Toktoev (Captain), Eldar M., Kamila S., ...</p>
              </div>
            </div>

            <div className="mt-5 flex justify-end">
              <button
                onClick={() => setShowTeamsModal(false)}
                className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-700"
              >
                Start 5-Minute Team Challenge
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
