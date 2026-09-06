import React, { useEffect, useState } from 'react';
import {
  CalendarRange,
  Calendar,
  Lock,
  Unlock,
  CheckCircle2,
  AlertCircle,
  Clock,
  ChevronRight,
  ShieldCheck,
  RefreshCw,
  Edit2,
  Plus,
} from 'lucide-react';
import { AppLanguage, AcademicYearRecord, QuarterPeriod } from '../../types';
import { useI18n } from '../../lib/i18n';
import { authenticatedFetch } from '../../lib/api';

interface AcademicYearsManagerProps {
  language: AppLanguage;
  onNavigateTab?: (tabId: string) => void;
}

const DEFAULT_ACADEMIC_YEARS: AcademicYearRecord[] = [
  {
    id: '2026-2027',
    name: "2026-2027 o'quv yili",
    startDate: '2026-09-01',
    endDate: '2027-05-25',
    status: 'active',
    activeQuarter: 'Q1',
    quarters: [
      {
        id: 'Q1',
        name: '1-chorak',
        startDate: '2026-09-01',
        endDate: '2026-10-31',
        status: 'active',
      },
      {
        id: 'Q2',
        name: '2-chorak',
        startDate: '2026-11-12',
        endDate: '2026-12-30',
        status: 'upcoming',
      },
      {
        id: 'Q3',
        name: '3-chorak',
        startDate: '2027-01-11',
        endDate: '2027-03-20',
        status: 'upcoming',
      },
      {
        id: 'Q4',
        name: '4-chorak',
        startDate: '2027-04-01',
        endDate: '2027-05-25',
        status: 'upcoming',
      },
    ],
  },
  {
    id: '2025-2026',
    name: "2025-2026 o'quv yili",
    startDate: '2025-09-01',
    endDate: '2026-05-25',
    status: 'archived',
    activeQuarter: 'Q4',
    quarters: [
      {
        id: 'Q1',
        name: '1-chorak',
        startDate: '2025-09-01',
        endDate: '2025-10-31',
        status: 'closed',
      },
      {
        id: 'Q2',
        name: '2-chorak',
        startDate: '2025-11-12',
        endDate: '2025-12-30',
        status: 'closed',
      },
      {
        id: 'Q3',
        name: '3-chorak',
        startDate: '2026-01-11',
        endDate: '2026-03-20',
        status: 'closed',
      },
      {
        id: 'Q4',
        name: '4-chorak',
        startDate: '2026-04-01',
        endDate: '2026-05-25',
        status: 'closed',
      },
    ],
  },
];

export const AcademicYearsManager: React.FC<AcademicYearsManagerProps> = ({
  language,
}) => {
  const t = useI18n(language);
  const [academicYears, setAcademicYears] = useState<AcademicYearRecord[]>(DEFAULT_ACADEMIC_YEARS);
  const [selectedYearId, setSelectedYearId] = useState('2026-2027');
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Modal states
  const [isAddYearModalOpen, setIsAddYearModalOpen] = useState(false);
  const [editingQuarter, setEditingQuarter] = useState<{ yearId: string; quarter: QuarterPeriod } | null>(null);

  // Form states
  const [newYearName, setNewYearName] = useState('2027-2028');
  const [newYearStartDate, setNewYearStartDate] = useState('2027-09-01');
  const [newYearEndDate, setNewYearEndDate] = useState('2028-05-25');

  const [quarterStartDate, setQuarterStartDate] = useState('');
  const [quarterEndDate, setQuarterEndDate] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await authenticatedFetch('/api/academic-years');
      if (res.ok) {
        const data = await res.json();
        if (data.items && data.items.length > 0) {
          setAcademicYears(data.items);
        }
      }
    } catch {
      // fallback to state
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const activeYear = academicYears.find((y) => y.id === selectedYearId) || academicYears[0];

  const handleCreateYear = (e: React.FormEvent) => {
    e.preventDefault();
    const id = newYearName.trim();
    if (!id) return;

    const newYear: AcademicYearRecord = {
      id,
      name: `${id} o'quv yili`,
      startDate: newYearStartDate,
      endDate: newYearEndDate,
      status: 'planned',
      activeQuarter: 'Q1',
      quarters: [
        { id: 'Q1', name: '1-chorak', startDate: `${id.split('-')[0]}-09-01`, endDate: `${id.split('-')[0]}-10-31`, status: 'upcoming' },
        { id: 'Q2', name: '2-chorak', startDate: `${id.split('-')[0]}-11-12`, endDate: `${id.split('-')[0]}-12-30`, status: 'upcoming' },
        { id: 'Q3', name: '3-chorak', startDate: `${id.split('-')[1]}-01-11`, endDate: `${id.split('-')[1]}-03-20`, status: 'upcoming' },
        { id: 'Q4', name: '4-chorak', startDate: `${id.split('-')[1]}-04-01`, endDate: `${id.split('-')[1]}-05-25`, status: 'upcoming' },
      ],
    };

    setAcademicYears((prev) => [newYear, ...prev]);
    setSelectedYearId(id);
    setIsAddYearModalOpen(false);
    setFeedback({ type: 'success', message: `${id} o‘quv yili muvaffaqiyatli yaratildi!` });
    setTimeout(() => setFeedback(null), 3500);
  };

  const handleOpenEditQuarterModal = (quarter: QuarterPeriod) => {
    setEditingQuarter({ yearId: selectedYearId, quarter });
    setQuarterStartDate(quarter.startDate);
    setQuarterEndDate(quarter.endDate);
  };

  const handleSaveQuarterDates = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingQuarter) return;

    setAcademicYears((prev) =>
      prev.map((yr) => {
        if (yr.id !== editingQuarter.yearId) return yr;
        return {
          ...yr,
          quarters: yr.quarters.map((q) =>
            q.id === editingQuarter.quarter.id
              ? { ...q, startDate: quarterStartDate, endDate: quarterEndDate }
              : q
          ),
        };
      })
    );

    setEditingQuarter(null);
    setFeedback({ type: 'success', message: 'Chorak muddatlari yangilandi!' });
    setTimeout(() => setFeedback(null), 3500);
  };

  const handleToggleQuarterStatus = async (quarterId: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'active' ? 'closed' : 'active';
    setAcademicYears((prev) =>
      prev.map((yr) => {
        if (yr.id !== selectedYearId) return yr;
        return {
          ...yr,
          quarters: yr.quarters.map((q) => (q.id === quarterId ? { ...q, status: nextStatus as any } : q)),
        };
      })
    );

    setFeedback({
      type: 'success',
      message: `${quarterId} holati muvaffaqiyatli o‘zgartirildi: ${nextStatus === 'active' ? 'FAOL' : 'YOPILGAN'}`,
    });
    setTimeout(() => setFeedback(null), 3500);

    try {
      await authenticatedFetch(`/api/academic-years/${encodeURIComponent(selectedYearId)}/quarters/${encodeURIComponent(quarterId)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      });
    } catch {}
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            FAOL (OCHIQ)
          </span>
        );
      case 'closed':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-400">
            <Lock className="h-3 w-3" />
            YOPILGAN (MUTATSIYA TAQIQLANGAN)
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
            <Clock className="h-3 w-3" />
            KUTILAYOTGAN
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-3xl border border-slate-200/80 bg-white p-5 sm:p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2.5">
            <CalendarRange className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
            <span>O‘quv Yili va Choraklar Nazorati</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Choraklarni boshqarish, baholar va davomat muddatlarini yopish hamda arxivlash
          </p>
        </div>

        {/* Academic Year Switcher Tabs & Add Button */}
        <div className="flex flex-wrap items-center gap-2">
          {academicYears.map((yr) => (
            <button
              key={yr.id}
              onClick={() => setSelectedYearId(yr.id)}
              className={`rounded-2xl px-4 py-2 text-xs font-bold transition-all ${
                selectedYearId === yr.id
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300'
              }`}
            >
              {yr.name} {yr.status === 'active' && '★'}
            </button>
          ))}
          <button
            onClick={() => setIsAddYearModalOpen(true)}
            className="flex items-center gap-1.5 rounded-2xl bg-indigo-50 border border-indigo-200 px-3.5 py-2 text-xs font-bold text-indigo-700 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:border-indigo-800 dark:text-indigo-300 transition-all"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Yangi o‘quv yili</span>
          </button>
        </div>
      </div>

      {/* Alerts */}
      {feedback && (
        <div
          className={`flex items-center gap-2 rounded-2xl p-3.5 text-xs font-bold ${
            feedback.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300'
              : 'bg-rose-50 text-rose-800 border border-rose-200 dark:bg-rose-950/50 dark:text-rose-300'
          }`}
        >
          {feedback.type === 'success' ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Quarters Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {activeYear.quarters.map((q, idx) => (
          <div
            key={q.id}
            className={`rounded-3xl border p-6 transition-all shadow-xs flex flex-col justify-between ${
              q.status === 'active'
                ? 'border-indigo-300 bg-linear-to-br from-indigo-50/40 via-white to-white dark:border-indigo-800 dark:from-indigo-950/30 dark:to-slate-900'
                : 'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900'
            }`}
          >
            <div>
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-indigo-600 font-bold text-white text-xs">
                      {idx + 1}
                    </span>
                    <h3 className="text-lg font-black text-slate-900 dark:text-white">
                      {q.name}
                    </h3>
                  </div>
                  <div className="mt-2 flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
                    <Calendar className="h-3.5 w-3.5 text-indigo-600" />
                    <span>{q.startDate} — {q.endDate}</span>
                  </div>
                </div>

                <div>{getStatusBadge(q.status)}</div>
              </div>

              <div className="mt-5 rounded-2xl bg-slate-50/80 p-3.5 text-xs dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 space-y-1.5">
                <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
                  <span className="text-slate-400">Format:</span>
                  <span className="font-bold">40% Formativ + 60% Summativ</span>
                </div>
                <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
                  <span className="text-slate-400">Holat ta’siri:</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {q.status === 'active'
                      ? 'O‘qituvchilar baho va davomat kiritishi mumkin'
                      : 'O‘zgartirishlar muzlatilgan, tahrir taqiqlangan'}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <button
                onClick={() => handleOpenEditQuarterModal(q)}
                className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
              >
                <Edit2 className="h-3.5 w-3.5 text-slate-500" />
                <span>Muddatni o‘zgartirish</span>
              </button>

              <button
                onClick={() => handleToggleQuarterStatus(q.id, q.status)}
                className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all shadow-xs active:scale-95 ${
                  q.status === 'active'
                    ? 'bg-rose-50 text-rose-700 hover:bg-rose-100 dark:bg-rose-950/40 dark:text-rose-300'
                    : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-600/30'
                }`}
              >
                {q.status === 'active' ? (
                  <>
                    <Lock className="h-3.5 w-3.5" />
                    <span>Chorakni Yopish</span>
                  </>
                ) : (
                  <>
                    <Unlock className="h-3.5 w-3.5" />
                    <span>Chorakni Ochish</span>
                  </>
                )}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Add Academic Year Modal */}
      {isAddYearModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl dark:bg-slate-900 border border-slate-100 dark:border-slate-800 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
              <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                <CalendarRange className="h-5 w-5 text-indigo-600" />
                <span>Yangi O‘quv Yilini Yaratish</span>
              </h3>
              <button onClick={() => setIsAddYearModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateYear} className="mt-4 space-y-3.5 text-xs">
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300">O‘quv yili kodi/nomi</label>
                <input
                  type="text"
                  value={newYearName}
                  onChange={(e) => setNewYearName(e.target.value)}
                  placeholder="masalan: 2027-2028"
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 font-bold text-slate-900 focus:bg-white dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300">Boshlanish sanasi</label>
                  <input
                    type="date"
                    value={newYearStartDate}
                    onChange={(e) => setNewYearStartDate(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 font-bold dark:border-slate-700 dark:bg-slate-800"
                    required
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300">Tugash sanasi</label>
                  <input
                    type="date"
                    value={newYearEndDate}
                    onChange={(e) => setNewYearEndDate(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 font-bold dark:border-slate-700 dark:bg-slate-800"
                    required
                  />
                </div>
              </div>

              <p className="text-[11px] text-slate-400">
                Yangi yil yaratilganda 4 ta chorak (Q1, Q2, Q3, Q4) avtomatik taqsimlanadi.
              </p>

              <div className="mt-5 flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddYearModalOpen(false)}
                  className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  Bekor qilish
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-indigo-600 px-5 py-2 text-xs font-bold text-white hover:bg-indigo-700 active:scale-95 shadow-md"
                >
                  O‘quv yilini ochish
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Quarter Dates Modal */}
      {editingQuarter && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl dark:bg-slate-900 border border-slate-100 dark:border-slate-800 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
              <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Edit2 className="h-5 w-5 text-indigo-600" />
                <span>{editingQuarter.quarter.name} muddatini belgilash</span>
              </h3>
              <button onClick={() => setEditingQuarter(null)} className="text-slate-400 hover:text-slate-600">
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveQuarterDates} className="mt-4 space-y-3.5 text-xs">
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300">Chorak boshlanish sanasi</label>
                <input
                  type="date"
                  value={quarterStartDate}
                  onChange={(e) => setQuarterStartDate(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 font-bold dark:border-slate-700 dark:bg-slate-800"
                  required
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300">Chorak tugash sanasi</label>
                <input
                  type="date"
                  value={quarterEndDate}
                  onChange={(e) => setQuarterEndDate(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 font-bold dark:border-slate-700 dark:bg-slate-800"
                  required
                />
              </div>

              <div className="mt-5 flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingQuarter(null)}
                  className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  Bekor qilish
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-indigo-600 px-5 py-2 text-xs font-bold text-white hover:bg-indigo-700 active:scale-95 shadow-md"
                >
                  Saqlash
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

