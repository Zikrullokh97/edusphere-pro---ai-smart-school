import React, { useState, useEffect } from 'react';
import {
  BookOpen,
  CheckCircle2,
  XCircle,
  Clock,
  RotateCcw,
  Search,
  Filter,
  Eye,
  MessageSquare,
  Sparkles,
  ChevronRight,
  ShieldCheck,
  User,
  Upload,
  FileCheck,
  Layers,
  BarChart2,
  Plus,
} from 'lucide-react';
import { authenticatedFetch } from '../../lib/api';
import type { LessonPlanApprovalItem } from '../../types';

export const LessonPlanReviewer: React.FC = () => {
  const [plans, setPlans] = useState<LessonPlanApprovalItem[]>([
    {
      id: 'lp-1',
      teacherId: 'tch-001',
      teacherName: 'Karimov Jasur',
      className: '7-A',
      subject: 'Matematika',
      topic: 'Birhadlar va ko‘phadlar ustida amallar (45-daqiqa KTP)',
      date: '2026-09-02',
      status: 'SUBMITTED',
      createdAt: '2026-09-01T08:30:00Z',
    },
    {
      id: 'lp-2',
      teacherId: 'tch-002',
      teacherName: 'Rahimova Madina',
      className: '8-B',
      subject: 'Informatika',
      topic: 'Python dasturlash tili: Mantiqiy ifodalar va shart operatorlari',
      date: '2026-09-02',
      status: 'APPROVED',
      reviewedBy: 'Admin',
      reviewedAt: '2026-09-01T10:15:00Z',
      createdAt: '2026-08-31T14:20:00Z',
    },
    {
      id: 'lp-3',
      teacherId: 'tch-003',
      teacherName: 'Valiyev Bobur',
      className: '9-A',
      subject: 'Fizika',
      topic: 'Nyutonning ikkinchi qonuni va inersiya tajribalari',
      date: '2026-09-03',
      status: 'SUBMITTED',
      createdAt: '2026-09-01T11:00:00Z',
    },
  ]);

  const [loading, setLoading] = useState(false);
  const [activePlan, setActivePlan] = useState<LessonPlanApprovalItem | null>(null);
  const [reviewComment, setReviewComment] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Template Import Modal
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importSubject, setImportSubject] = useState('Matematika');
  const [importGrade, setImportGrade] = useState('7-A');
  const [importText, setImportText] = useState('');
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  // Curriculum Pacing stats
  const pacingStats = [
    { subject: 'Matematika (7-A)', completed: 14, total: 68, teacher: 'Jasur Karimov' },
    { subject: 'Informatika (8-B)', completed: 16, total: 68, teacher: 'Madina Rahimova' },
    { subject: 'Fizika (9-A)', completed: 12, total: 68, teacher: 'Bobur Valiyev' },
    { subject: 'Ona tili (5-A)', completed: 18, total: 68, teacher: 'Nargiza Ergasheva' },
  ];

  const fetchPlans = async () => {
    setLoading(true);
    try {
      const [plansRes, ktpRes] = await Promise.allSettled([
        authenticatedFetch('/api/admin/lesson-plans'),
        authenticatedFetch('/api/ktp'),
      ]);

      const merged: LessonPlanApprovalItem[] = [];

      if (plansRes.status === 'fulfilled' && plansRes.value.ok) {
        const data = await plansRes.value.json();
        if (data.success && Array.isArray(data.items)) {
          merged.push(...data.items);
        }
      }

      if (ktpRes.status === 'fulfilled' && ktpRes.value.ok) {
        const ktpData = await ktpRes.value.json();
        if (Array.isArray(ktpData.items)) {
          ktpData.items.forEach((k: any) => {
            if (!merged.some((p) => p.id === k.id)) {
              merged.push({
                id: k.id,
                teacherId: k.teacherId || 'tch-001',
                teacherName: k.teacherName || 'O‘qituvchi',
                className: k.className,
                subject: k.subject,
                topic: `${k.subject} (${k.className}) — 68 soatlik KTP Rejasi (${k.lessons?.length || 68} ta mavzu)`,
                date: k.uploadedAt?.slice(0, 10) || new Date().toISOString().slice(0, 10),
                status: (k.status || 'SUBMITTED').toUpperCase(),
                reviewedBy: k.reviewedBy,
                reviewedAt: k.reviewedAt,
                createdAt: k.uploadedAt || new Date().toISOString(),
              });
            }
          });
        }
      }

      if (merged.length > 0) {
        setPlans(merged);
      }
    } catch {
      // Keep baseline
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlans();
  }, []);

  const handleUpdateStatus = async (planId: string, newStatus: 'APPROVED' | 'REVISION_REQUESTED' | 'REJECTED') => {
    setIsProcessing(true);
    try {
      const endpoint = planId.startsWith('ktp-') ? `/api/ktp/${planId}/status` : `/api/admin/lesson-plans/${planId}/status`;
      const res = await authenticatedFetch(endpoint, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus, reviewerComment: reviewComment }),
      });
      const data = await res.json();
      if (data.success) {
        setPlans((prev) =>
          prev.map((p) =>
            p.id === planId
              ? {
                  ...p,
                  status: newStatus,
                  reviewerComment: reviewComment || undefined,
                  reviewedBy: 'Admin',
                  reviewedAt: new Date().toISOString(),
                }
              : p
          )
        );
        setActivePlan(null);
        setReviewComment('');
      }
    } catch (err) {
      console.error('Dars rejasini tasdiqlashda xatolik:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSaveImportTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!importText.trim()) return;

    const newPlan: LessonPlanApprovalItem = {
      id: `lp-${Date.now()}`,
      teacherId: 'tch-admin',
      teacherName: 'Davlat Standarti / Admin',
      className: importGrade,
      subject: importSubject,
      topic: importText.split('\n')[0] || `${importSubject} - Namunaviy KTP Reja`,
      date: new Date().toISOString().slice(0, 10),
      status: 'APPROVED',
      reviewedBy: 'Vazirlik Standarti',
      reviewedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };

    setPlans((prev) => [newPlan, ...prev]);
    setIsImportModalOpen(false);
    setImportText('');
    setFeedbackMsg('✓ Davlat standarti KTP shabloni muvaffaqiyatli import qilindi va tasdiqlandi!');
    setTimeout(() => setFeedbackMsg(null), 3500);

    try {
      await authenticatedFetch('/api/ktp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newPlan),
      });
    } catch {}
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300';
      case 'REVISION_REQUESTED':
        return 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300';
      case 'REJECTED':
        return 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300';
      default:
        return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300';
    }
  };

  return (
    <div className="space-y-6 font-sans pb-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center gap-3.5">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-600/30">
            <BookOpen className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                Dars Rejalari & KTP Ekspertizasi
              </h1>
              <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-[11px] font-bold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                Pedagogik Nazorat
              </span>
            </div>
            <p className="text-xs text-slate-400 font-semibold mt-0.5">
              O‘qituvchilarning dars ishlanmalari va 45-daqiqalik KTP rejalari ekspertizasi
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsImportModalOpen(true)}
          className="flex min-h-[44px] items-center gap-2 rounded-2xl bg-indigo-600 px-5 py-2.5 text-xs font-bold text-white shadow-lg shadow-indigo-600/30 hover:bg-indigo-700 active:scale-95 transition-all"
        >
          <Upload className="h-4 w-4" />
          <span>Davlat KTP Shablonini Yuklash (Import)</span>
        </button>
      </div>

      {/* Feedback Toast */}
      {feedbackMsg && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3.5 text-xs font-bold text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4" />
          <span>{feedbackMsg}</span>
        </div>
      )}

      {/* Curriculum Pacing Progress Tracker Bar */}
      <div className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <BarChart2 className="h-4 w-4 text-indigo-600" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              O‘quv Dasturi Rejasi Bo‘yicha O‘tish Sur’ati (Pacing Tracker)
            </h3>
          </div>
          <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
            Yillik reja: 68 soat / fan
          </span>
        </div>

        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {pacingStats.map((item) => {
            const pct = Math.round((item.completed / item.total) * 100);
            return (
              <div
                key={item.subject}
                className="rounded-2xl border border-slate-100 bg-slate-50 p-3.5 dark:border-slate-800 dark:bg-slate-800/60"
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-800 dark:text-slate-200">{item.subject}</span>
                  <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">{pct}%</span>
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">{item.teacher}</div>

                <div className="mt-2.5 w-full bg-slate-200 h-2 rounded-full overflow-hidden dark:bg-slate-700">
                  <div
                    className="bg-indigo-600 h-full rounded-full transition-all duration-500"
                    style={{ width: `${pct}%` }}
                  />
                </div>

                <div className="mt-1.5 flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400">
                  <span>{item.completed} soat o‘tildi</span>
                  <span>{item.total - item.completed} soat qoldi</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Plans List */}
      <div className="grid grid-cols-1 gap-4">
        {plans.map((plan) => (
          <div
            key={plan.id}
            className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900 flex flex-col md:flex-row md:items-center justify-between gap-4"
          >
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className={`rounded-md px-2.5 py-0.5 text-[10px] font-black uppercase ${getStatusBadge(plan.status)}`}>
                  {plan.status === 'SUBMITTED' ? 'Tekshiruv kutilmoqda' : plan.status}
                </span>
                <span className="rounded-md bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-bold px-2 py-0.5 text-[11px]">
                  {plan.className} • {plan.subject}
                </span>
                <span className="text-[11px] text-slate-400 font-mono">
                  Sana: {plan.date}
                </span>
              </div>

              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {plan.topic}
              </h3>

              <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 font-medium">
                <User className="h-3.5 w-3.5" />
                <span>O‘qituvchi: <strong>{plan.teacherName}</strong></span>
                {plan.reviewerComment && (
                  <span className="text-amber-600 dark:text-amber-400 pl-3">
                    Izoh: "{plan.reviewerComment}"
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {plan.status === 'SUBMITTED' ? (
                <>
                  <button
                    type="button"
                    onClick={() => handleUpdateStatus(plan.id, 'APPROVED')}
                    className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-bold text-white shadow-lg shadow-emerald-600/30 hover:bg-emerald-700 transition-all cursor-pointer"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    <span>Tasdiqlash</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setActivePlan(plan);
                      setReviewComment('');
                    }}
                    className="flex items-center gap-1.5 rounded-xl bg-amber-500 px-3.5 py-2 text-xs font-bold text-white shadow-lg shadow-amber-500/30 hover:bg-amber-600 transition-all cursor-pointer"
                  >
                    <RotateCcw className="h-4 w-4" />
                    <span>Qayta ishlash</span>
                  </button>
                </>
              ) : (
                <span className="text-xs font-bold text-slate-400">
                  {plan.reviewedBy} tomonidan tasdiqlangan
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* KTP Template Import Modal */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-xs">
          <div className="w-full max-w-xl rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white">
                  <Upload className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Davlat Standarti KTP Shablonini Yuklash
                  </h3>
                  <p className="text-xs text-slate-400">
                    Fan va sinf bo‘yicha 68 soatlik namunaviy dars rejasini import qilish
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsImportModalOpen(false)}
                className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <XCircle className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveImportTemplate} className="mt-4 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Fan</label>
                  <select
                    value={importSubject}
                    onChange={(e) => setImportSubject(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs text-slate-900 font-bold dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  >
                    <option value="Matematika">Matematika</option>
                    <option value="Informatika">Informatika</option>
                    <option value="Fizika">Fizika</option>
                    <option value="Kimyo">Kimyo</option>
                    <option value="Biologiya">Biologiya</option>
                    <option value="Ona tili">Ona tili</option>
                    <option value="Ingliz tili">Ingliz tili</option>
                    <option value="Tarix">Tarix</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Sinf</label>
                  <select
                    value={importGrade}
                    onChange={(e) => setImportGrade(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs text-slate-900 font-bold dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  >
                    <option value="5-A">5-A</option>
                    <option value="5-B">5-B</option>
                    <option value="6-A">6-A</option>
                    <option value="7-A">7-A</option>
                    <option value="8-B">8-B</option>
                    <option value="9-A">9-A</option>
                    <option value="10-A">10-A</option>
                    <option value="11-A">11-A</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Namunaviy KTP Reja Matni yoki Mavzular Ro‘yxati (Har bir qatorda bitta mavzu)
                </label>
                <textarea
                  rows={6}
                  required
                  value={importText}
                  onChange={(e) => setImportText(e.target.value)}
                  placeholder="1-dars: Kirish va xavfsizlik qoidalari&#10;2-dars: Asosiy tushunchalar va formulalar&#10;3-dars: Amaliy laboratoriya ishi..."
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs font-mono text-slate-900 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsImportModalOpen(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300"
                >
                  Bekor qilish
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-lg shadow-indigo-600/30 hover:bg-indigo-700 active:scale-95 transition-all"
                >
                  <FileCheck className="h-4 w-4" />
                  <span>KTP Shablonini Saqlash</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Revision Modal */}
      {activePlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900 animate-in zoom-in-95">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Qayta ishlashga yuborish izohi
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              {activePlan.teacherName} ga qaysi qismlarni to‘g‘rilash kerakligini ko‘rsating:
            </p>

            <textarea
              rows={4}
              value={reviewComment}
              onChange={(e) => setReviewComment(e.target.value)}
              placeholder="Masalan: Uyga vazifa qismida amaliy mashqlar soni yetarli emas..."
              className="mt-3 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs text-slate-900 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />

            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setActivePlan(null)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300"
              >
                Bekor qilish
              </button>
              <button
                type="button"
                disabled={isProcessing}
                onClick={() => handleUpdateStatus(activePlan.id, 'REVISION_REQUESTED')}
                className="rounded-xl bg-amber-600 px-4 py-2 text-xs font-bold text-white shadow-lg shadow-amber-600/30 hover:bg-amber-700 cursor-pointer"
              >
                {isProcessing ? 'Yuborilmoqda...' : 'Yuborish'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

