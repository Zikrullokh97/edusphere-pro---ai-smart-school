import React, { useState } from 'react';
import {
  Sparkles,
  BookOpen,
  Layers,
  CheckCircle2,
  Loader2,
  Copy,
  Download,
  ScreenShare,
  Sliders,
  ChevronRight,
  ArrowLeft,
  Flame,
  Check,
  RefreshCw,
  FileText,
} from 'lucide-react';
import { AppLanguage, LessonPlan } from '../../types';
import { useI18n } from '../../lib/i18n';
import { MOCK_LESSON_PLAN } from '../../data/mockData';
import { authenticatedFetch } from '../../lib/api';
import { ALL_SCHOOL_CLASSES } from '../../lib/scheduleGenerator';

interface AILessonGeneratorProps {
  language: AppLanguage;
  onSendToClassroom?: (lesson?: any) => void;
}

export const AILessonGenerator: React.FC<AILessonGeneratorProps> = ({
  language,
  onSendToClassroom,
}) => {
  const t = useI18n(language);

  // Wizard Steps
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  // Form State
  const [subject, setSubject] = useState('Mathematics');
  const [grade, setGrade] = useState('7-A');
  const [topic, setTopic] = useState('Linear Equations with Fractions and Unknowns');
  const [duration, setDuration] = useState('45 min');
  const [curriculumSource, setCurriculumSource] = useState('Central Asian National Standard (Kyrgyz/Uzbek 2026)');
  const [lessonFormat, setLessonFormat] = useState('Interactive + Team Battle + Visual Analogy');
  const [difficulty, setDifficulty] = useState<'standard' | 'simplified' | 'advanced'>('standard');

  // AI Output state
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedPlan, setGeneratedPlan] = useState<LessonPlan | null>(MOCK_LESSON_PLAN);
  const [copied, setCopied] = useState(false);

  const handleGenerate = async () => {
    setIsGenerating(true);
    setStep(4);

    try {
      const res = await authenticatedFetch('/api/ai/lesson-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject,
          grade,
          topic,
          duration,
          source: curriculumSource,
          lessonStyle: lessonFormat,
          language,
        }),
      });
      const data = await res.json();
      const plan = data.lessonPlan || data.lesson;
      if (plan) {
        setGeneratedPlan(plan);
      }
    } catch {
      // Fallback to rich mock plan
      setGeneratedPlan(MOCK_LESSON_PLAN);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = () => {
    if (!generatedPlan) return;
    const content = `EduSphere Pro AI Lesson Plan\nSubject: ${generatedPlan.subject} (${generatedPlan.grade})\nTopic: ${generatedPlan.topic}\n\nObjectives:\n${generatedPlan.objectives.join('\n')}\n\nCore Concept:\n${generatedPlan.coreConcept}`;
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div id="ai-lesson-generator-view" className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 rounded-2xl border border-indigo-200/80 bg-white p-6 shadow-xs dark:border-indigo-900/50 dark:bg-slate-900 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-600 text-white dark:bg-indigo-500">
              <Sparkles className="h-4 w-4" />
            </div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white sm:text-2xl">
              {t('lessonGenHeader')}
            </h1>
          </div>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 sm:text-sm">
            Generate 2026-standard structured lesson plans, interactive visual analogies, and differentiated homework in seconds.
          </p>
        </div>

        {/* Wizard Step Progress Pills */}
        <div className="flex items-center gap-2">
          {[
            { num: 1, label: 'Topic & Grade' },
            { num: 2, label: 'Curriculum' },
            { num: 3, label: 'Pedagogy' },
            { num: 4, label: 'Output Plan' },
          ].map((s) => (
            <button
              key={s.num}
              onClick={() => setStep(s.num as 1 | 2 | 3 | 4)}
              className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition-all ${
                step === s.num
                  ? 'bg-indigo-600 text-white shadow-xs dark:bg-indigo-500'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
              }`}
            >
              <span>{s.num}.</span>
              <span className="hidden md:inline">{s.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Step 1: Subject, Grade, Topic */}
      {step === 1 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <h2 className="text-base font-bold text-slate-900 dark:text-white">
            Step 1: Define Target Audience & Subject Topic
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Specify the grade level, duration, and core learning goals.
          </p>

          <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Subject
              </label>
              <select
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs font-medium text-slate-900 focus:border-indigo-500 focus:outline-hidden dark:border-slate-800 dark:bg-slate-800 dark:text-white"
              >
                <option value="Mathematics">Mathematics (Алгебра / Геометрия)</option>
                <option value="Physics">Physics (Физика)</option>
                <option value="Chemistry">Chemistry (Химия)</option>
                <option value="Computer Science">Computer Science & AI (Информатика)</option>
                <option value="English">English Language & Literature</option>
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Target Class
              </label>
              <select
                value={grade}
                onChange={(e) => setGrade(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs font-medium text-slate-900 focus:border-indigo-500 focus:outline-hidden dark:border-slate-800 dark:bg-slate-800 dark:text-white"
              >
                {ALL_SCHOOL_CLASSES.map((cls) => (
                  <option key={cls} value={cls}>
                    {cls} sinf
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Duration
              </label>
              <select
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs font-medium text-slate-900 focus:border-indigo-500 focus:outline-hidden dark:border-slate-800 dark:bg-slate-800 dark:text-white"
              >
                <option value="45 min">45 min (Standard Period)</option>
                <option value="90 min">90 min (Double Block)</option>
                <option value="30 min">30 min (Speed Workshop)</option>
              </select>
            </div>
          </div>

          <div className="mt-4">
            <label className="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Lesson Topic & Core Objective
            </label>
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g. Quadratic Equations, Newton's Third Law, Photosynthesis..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-900 focus:border-indigo-500 focus:outline-hidden dark:border-slate-800 dark:bg-slate-800 dark:text-white"
            />
          </div>

          <div className="mt-6 flex justify-end">
            <button
              onClick={() => setStep(2)}
              className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-indigo-700 dark:bg-indigo-500"
            >
              <span>Next: Curriculum Standards</span>
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Curriculum Source */}
      {step === 2 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <h2 className="text-base font-bold text-slate-900 dark:text-white">
            Step 2: Choose Curriculum Framework & Textbooks
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Ground the lesson plan in official national education standards.
          </p>

          <div className="mt-5 space-y-3">
            {[
              {
                id: 'national',
                title: 'Kyrgyz Republic & Central Asia Ministry of Education 2026 Curriculum',
                desc: 'Standardized national benchmarks, learning outcome criteria, and exam alignment.',
              },
              {
                id: 'cambridge',
                title: 'Cambridge International / STEAM Integrated Standard',
                desc: 'Inquiry-led pedagogy, hands-on lab experiments, and critical thinking rubrics.',
              },
              {
                id: 'custom',
                title: 'School Textbook PDF / Custom Teacher Syllabus',
                desc: 'Aligned directly with textbook Chapter 4: Linear Algebraic Transformations.',
              },
            ].map((c) => (
              <label
                key={c.id}
                onClick={() => setCurriculumSource(c.title)}
                className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition-all ${
                  curriculumSource.includes(c.title.slice(0, 15))
                    ? 'border-indigo-600 bg-indigo-50/70 dark:border-indigo-500 dark:bg-indigo-950/40'
                    : 'border-slate-200 bg-slate-50 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-800/60'
                }`}
              >
                <input
                  type="radio"
                  name="curriculum"
                  checked={curriculumSource.includes(c.title.slice(0, 15))}
                  onChange={() => setCurriculumSource(c.title)}
                  className="mt-1 text-indigo-600 focus:ring-indigo-500"
                />
                <div>
                  <div className="text-xs font-bold text-slate-900 dark:text-white">{c.title}</div>
                  <div className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">{c.desc}</div>
                </div>
              </label>
            ))}
          </div>

          <div className="mt-6 flex justify-between">
            <button
              onClick={() => setStep(1)}
              className="flex items-center gap-1 text-xs font-semibold text-slate-600 hover:text-slate-900 dark:text-slate-400"
            >
              <ArrowLeft className="h-4 w-4" /> Back
            </button>
            <button
              onClick={() => setStep(3)}
              className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-indigo-700 dark:bg-indigo-500"
            >
              <span>Next: Pedagogical Format</span>
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Pedagogical Format */}
      {step === 3 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <h2 className="text-base font-bold text-slate-900 dark:text-white">
            Step 3: Pedagogical Style & Student Engagement Format
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            How should the AI structure student participation and challenge tiers?
          </p>

          <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
            {[
              {
                title: 'Gamified Team Battle',
                desc: '3 Teams (Barskoon, Ala-Archa, Sulaiman-Too), speed quiz rounds with XP.',
                icon: Flame,
              },
              {
                title: 'Socratic Inquiry & Visual Analogy',
                desc: 'Guided step-by-step questions using balance scale visual diagrams.',
                icon: Sparkles,
              },
              {
                title: 'Differentiated Workshop',
                desc: 'Parallel tiers (Support / Core / Olympiad) with auto-assigned practice.',
                icon: Layers,
              },
            ].map((fmt) => {
              const Icon = fmt.icon;
              const isSelected = lessonFormat.includes(fmt.title.slice(0, 8));
              return (
                <button
                  key={fmt.title}
                  onClick={() => setLessonFormat(fmt.title)}
                  className={`flex flex-col justify-between rounded-xl border p-4 text-left transition-all ${
                    isSelected
                      ? 'border-indigo-600 bg-indigo-50/80 shadow-xs dark:border-indigo-500 dark:bg-indigo-950/50'
                      : 'border-slate-200 bg-slate-50 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-800/60'
                  }`}
                >
                  <div>
                    <Icon className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                    <div className="mt-2 text-xs font-bold text-slate-900 dark:text-white">{fmt.title}</div>
                    <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">{fmt.desc}</p>
                  </div>
                  {isSelected && (
                    <span className="mt-3 flex items-center gap-1 text-[10px] font-bold text-indigo-600 dark:text-indigo-400">
                      <Check className="h-3.5 w-3.5" /> Selected
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <div className="mt-6 flex justify-between">
            <button
              onClick={() => setStep(2)}
              className="flex items-center gap-1 text-xs font-semibold text-slate-600 hover:text-slate-900 dark:text-slate-400"
            >
              <ArrowLeft className="h-4 w-4" /> Back
            </button>
            <button
              onClick={handleGenerate}
              disabled={isGenerating}
              className="flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-2.5 text-xs font-bold text-white shadow-md hover:bg-indigo-700 disabled:opacity-50 dark:bg-indigo-500"
            >
              {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              <span>Generate AI Lesson Plan</span>
            </button>
          </div>
        </div>
      )}

      {/* Step 4: Full Generated Structured Plan */}
      {step === 4 && generatedPlan && (
        <div className="space-y-6">
          {/* Action Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                ✓ Ready for Classroom
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                {generatedPlan.subject} • Grade {generatedPlan.grade} • {generatedPlan.duration}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleCopy}
                className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
              >
                {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                <span>{copied ? 'Copied!' : 'Copy Plan'}</span>
              </button>

              <button
                onClick={() => onSendToClassroom && onSendToClassroom(generatedPlan)}
                className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-indigo-700 dark:bg-indigo-500"
              >
                <ScreenShare className="h-3.5 w-3.5" />
                <span>Launch in Digital Classroom</span>
              </button>

              <button
                onClick={handleGenerate}
                disabled={isGenerating}
                className="rounded-xl border border-slate-200 p-2 text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300"
                title="Regenerate with AI"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isGenerating ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {/* Structured Output Sections */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {/* Left 2 Cols: Main Plan */}
            <div className="space-y-4 lg:col-span-2">
              {/* Objectives */}
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
                <h3 className="font-bold text-slate-900 dark:text-white">1. Core Learning Objectives</h3>
                <ul className="mt-2.5 space-y-2 text-xs text-slate-700 dark:text-slate-300">
                  {generatedPlan.objectives.map((obj, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 text-indigo-600 shrink-0 dark:text-indigo-400" />
                      <span>{obj}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Warm-Up & Theoretical Concept */}
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-slate-900 dark:text-white">2. Lesson Flow & Visual Analogies</h3>
                  <span className="text-[10px] font-bold text-indigo-600 uppercase">45 min distribution</span>
                </div>

                <div className="mt-3 space-y-3 text-xs">
                  <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-3 dark:border-amber-900/50 dark:bg-amber-950/30">
                    <span className="font-bold text-amber-900 dark:text-amber-200">⏱️ Hook & Warm-up (5 min):</span>
                    <p className="mt-1 text-slate-700 dark:text-slate-300">{generatedPlan.warmupHook}</p>
                  </div>

                  <div className="rounded-xl border border-indigo-200 bg-indigo-50/60 p-3 dark:border-indigo-900/50 dark:bg-indigo-950/30">
                    <span className="font-bold text-indigo-900 dark:text-indigo-200">🧠 Core Theory & LCM Concept (15 min):</span>
                    <p className="mt-1 text-slate-700 dark:text-slate-300 whitespace-pre-wrap">{generatedPlan.coreConcept}</p>
                  </div>

                  <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-3 dark:border-emerald-900/50 dark:bg-emerald-950/30">
                    <span className="font-bold text-emerald-900 dark:text-emerald-200">⚔️ Guided Practice & Team Challenge (15 min):</span>
                    <p className="mt-1 text-slate-700 dark:text-slate-300">{generatedPlan.teamChallenge}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right 1 Col: Differentiated Homework & Quiz */}
            <div className="space-y-4">
              {/* Formative Quiz preview */}
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
                <h3 className="font-bold text-slate-900 dark:text-white">Formative In-Class Quiz</h3>
                <div className="mt-3 space-y-2 text-xs">
                  {generatedPlan.formativeQuiz.map((q, idx) => (
                    <div key={idx} className="rounded-lg bg-slate-50 p-2.5 dark:bg-slate-800/60">
                      <div className="font-semibold text-slate-900 dark:text-white">Q{idx + 1}: {q.question}</div>
                      <div className="mt-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                        Answer: {q.answer}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 3-Tier Differentiated Homework */}
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
                <h3 className="font-bold text-slate-900 dark:text-white">Differentiated Homework</h3>
                <div className="mt-3 space-y-2.5 text-xs">
                  <div className="rounded-xl border border-emerald-100 bg-emerald-50/70 p-3 dark:border-emerald-900/40 dark:bg-emerald-950/30">
                    <div className="font-bold text-emerald-800 dark:text-emerald-200">🟢 Tier 1: Foundation (Easy)</div>
                    <p className="mt-1 text-slate-600 dark:text-slate-300">{generatedPlan.differentiatedHomework.easy}</p>
                  </div>

                  <div className="rounded-xl border border-indigo-100 bg-indigo-50/70 p-3 dark:border-indigo-900/40 dark:bg-indigo-950/30">
                    <div className="font-bold text-indigo-800 dark:text-indigo-200">🔵 Tier 2: Standard Mastery (Medium)</div>
                    <p className="mt-1 text-slate-600 dark:text-slate-300">{generatedPlan.differentiatedHomework.medium}</p>
                  </div>

                  <div className="rounded-xl border border-purple-100 bg-purple-50/70 p-3 dark:border-purple-900/40 dark:bg-purple-950/30">
                    <div className="font-bold text-purple-800 dark:text-purple-200">🟣 Tier 3: Olympiad & Real-World (Hard)</div>
                    <p className="mt-1 text-slate-600 dark:text-slate-300">{generatedPlan.differentiatedHomework.hard}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
