import React, { useState, useMemo } from 'react';
import {
  Award,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Filter,
  BarChart3,
  Layers,
  Sparkles,
  Users,
  Download,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react';
import { AppLanguage, ClassGroup, StudentRecord, ClassLOMasteryOverview } from '../../types';
import { calculateClassLOMastery, CANONICAL_LEARNING_OUTCOMES } from '../../lib/standardsRegistry';

interface Props {
  classes: ClassGroup[];
  students: StudentRecord[];
  language: AppLanguage;
}

export const StandardsMasteryAnalytics: React.FC<Props> = ({
  classes = [],
  students = [],
  language,
}) => {
  const [selectedClass, setSelectedClass] = useState<string>(classes[0]?.name || '7-A');
  const [selectedSubject, setSelectedSubject] = useState<string>('ALG-01');

  // Filter students belonging to selected class
  const classStudents = useMemo(() => {
    return students.filter((s) => (s.grade || s.classId) === selectedClass);
  }, [students, selectedClass]);

  // Compute Class LO Mastery Overview
  const classMastery = useMemo(() => {
    return calculateClassLOMastery(selectedClass, selectedSubject, classStudents);
  }, [selectedClass, selectedSubject, classStudents]);

  const statusBadge = (status: ClassLOMasteryOverview['status']) => {
    switch (status) {
      case 'proficient':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
            A’lo darajada (Proficient)
          </span>
        );
      case 'satisfactory':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-200">
            Qoniqarli (Satisfactory)
          </span>
        );
      case 'needs_attention':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
            E’tibor talab (Needs Attention)
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-200">
            Kritik (At Risk)
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                <ShieldCheck className="w-3.5 h-3.5" />
                KAO Davlat Standartlari Monitoringi
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Real-Time Analitika
              </span>
            </div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight mt-2">
              {language === 'uz'
                ? 'Sinflar Bo‘yicha O‘quv Natijalari (LO) O‘zlashtirish Xaritasi'
                : 'Аналитика Освоения Результатов Обучения (LO) по Классам'}
            </h2>
            <p className="text-sm text-slate-600 mt-1">
              Har bir sinf va fan bo‘yicha davlat standartlari o‘zlashtirilish darajasi va qiyinchilik tug‘dirayotgan mavzular diagnostikasi.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Class Selector */}
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase">Sinf:</label>
              <select
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                className="text-xs font-bold p-2 rounded-xl border border-slate-200 bg-white"
              >
                {classes.map((c) => (
                  <option key={c.id || c.name} value={c.name}>
                    {c.name} ({c.studentCount || 0} o‘quvchi)
                  </option>
                ))}
              </select>
            </div>

            {/* Subject Selector */}
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase">Fan:</label>
              <select
                value={selectedSubject}
                onChange={(e) => setSelectedSubject(e.target.value)}
                className="text-xs font-bold p-2 rounded-xl border border-slate-200 bg-white"
              >
                <option value="ALG-01">Algebra (7–11)</option>
                <option value="MATH-01">Matematika (1–6)</option>
                <option value="GEOM-01">Geometriya (7–11)</option>
                <option value="KYR-LANG">Qirg‘iz tili</option>
                <option value="PHYS-01">Fizika</option>
                <option value="CS-01">Informatika</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Mastery Grid Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {classMastery.map((item) => (
          <div
            key={item.learningOutcomeId}
            className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm hover:shadow-md transition space-y-4 flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold px-2.5 py-1 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200">
                  {item.learningOutcomeCode}
                </span>
                {statusBadge(item.status)}
              </div>

              <h3 className="text-sm font-bold text-slate-900 mt-3 line-clamp-2">{item.learningOutcomeTitle}</h3>

              {/* Progress and Stats */}
              <div className="mt-4 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">O‘rtacha o‘zlashtirish:</span>
                  <span className="font-mono font-bold text-slate-900">{item.averageMasteryScore}%</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      item.averageMasteryScore >= 80
                        ? 'bg-emerald-500'
                        : item.averageMasteryScore >= 65
                        ? 'bg-blue-500'
                        : item.averageMasteryScore >= 50
                        ? 'bg-amber-500'
                        : 'bg-rose-500'
                    }`}
                    style={{ width: `${item.averageMasteryScore}%` }}
                  />
                </div>
              </div>

              {/* Student Distribution Breakdown */}
              <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-slate-100 text-center">
                <div className="p-2 rounded-xl bg-emerald-50 text-emerald-800">
                  <div className="text-xs font-black">{item.masteredCount}</div>
                  <div className="text-[10px] font-medium">O‘zlashtirdi</div>
                </div>
                <div className="p-2 rounded-xl bg-amber-50 text-amber-800">
                  <div className="text-xs font-black">{item.developingCount}</div>
                  <div className="text-[10px] font-medium">O‘rtacha</div>
                </div>
                <div className="p-2 rounded-xl bg-rose-50 text-rose-800">
                  <div className="text-xs font-black">{item.atRiskCount}</div>
                  <div className="text-[10px] font-medium">Qoloq</div>
                </div>
              </div>
            </div>

            {item.atRiskCount > 0 && (
              <div className="text-[11px] text-rose-700 bg-rose-50 p-2.5 rounded-xl border border-rose-100 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                <span>Ushbu mavzu bo‘yicha takrorlash darsi tavsiya etiladi.</span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

