import React, { useState, useMemo } from 'react';
import {
  Award,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  Sparkles,
  BookOpen,
  Filter,
  ChevronRight,
  ShieldCheck,
  Star,
  CheckCircle,
} from 'lucide-react';
import { AppLanguage, StudentRecord, StudentLOMastery } from '../../types';
import { calculateStudentSubjectMastery, CANONICAL_LEARNING_OUTCOMES } from '../../lib/standardsRegistry';

interface Props {
  student: StudentRecord;
  language: AppLanguage;
  grades?: any[];
}

export const ChildMasteryProgress: React.FC<Props> = ({
  student,
  language,
  grades = [],
}) => {
  const [selectedSubject, setSelectedSubject] = useState<string>('MATH-01');

  // Available subjects for student
  const subjectList = [
    { code: 'MATH-01', name: language === 'uz' ? 'Matematika / Algebra' : 'Математика' },
    { code: 'KYR-LANG', name: language === 'uz' ? 'Qirg‘iz tili' : 'Кыргыз тили' },
    { code: 'PHYS-01', name: language === 'uz' ? 'Fizika' : 'Физика' },
    { code: 'CS-01', name: language === 'uz' ? 'Informatika va Dasturlash' : 'Информатика' },
    { code: 'ENG-01', name: language === 'uz' ? 'Ingliz tili' : 'Английский язык' },
  ];

  // Calculate mastery items for active subject
  const masteryItems = useMemo(() => {
    return calculateStudentSubjectMastery(student.id || student.studentId, selectedSubject, grades);
  }, [student, selectedSubject, grades]);

  // Aggregated subject mastery score
  const overallSubjectMastery = useMemo(() => {
    if (masteryItems.length === 0) return 80;
    const sum = masteryItems.reduce((acc, item) => acc + item.masteryScore, 0);
    return Math.round(sum / masteryItems.length);
  }, [masteryItems]);

  const statusBadge = (status: StudentLOMastery['status']) => {
    switch (status) {
      case 'exceeded':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-purple-100 text-purple-800 border border-purple-200">
            <Star className="w-3 h-3 text-purple-600 fill-purple-600" />
            {language === 'uz' ? 'Yuqori daraja (A‘lo)' : language === 'ru' ? 'Превосходно' : 'Жогорку деңгээл'}
          </span>
        );
      case 'mastered':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            {language === 'uz' ? 'O‘zlashtirildi (Yaxshi)' : language === 'ru' ? 'Освоено' : 'Өздөштүрүлдү'}
          </span>
        );
      case 'developing':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
            <TrendingUp className="w-3 h-3 text-amber-600" />
            {language === 'uz' ? 'Rivojlanmoqda' : language === 'ru' ? 'В процессе' : 'Өнүгүүдө'}
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700">
            {language === 'uz' ? 'Boshlanmadi' : 'Не начато'}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-indigo-900 via-indigo-950 to-slate-900 text-white rounded-2xl p-6 border border-indigo-800 shadow-md">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-400/30">
                <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
                Davlat Standarti bo‘yicha O‘zlashtirish
              </span>
              <span className="text-xs text-indigo-200 font-semibold">{student.name} • {student.grade}</span>
            </div>
            <h2 className="text-2xl font-black tracking-tight mt-2">
              {language === 'uz'
                ? 'O‘quv Natijalari (Learning Outcomes) va Kompetensiyalar'
                : 'Результаты Обучения и Освоение Компетенций'}
            </h2>
            <p className="text-xs text-indigo-200 mt-1 max-w-xl">
              Farzandingizning davlat ta’lim standarti mezonlariga mos ko‘nikmalari va amaliy bilimlari tahlili.
            </p>
          </div>

          <div className="bg-indigo-900/60 p-4 rounded-xl border border-indigo-700 flex items-center gap-4">
            <div className="text-center">
              <div className="text-3xl font-black text-emerald-400">{overallSubjectMastery}%</div>
              <div className="text-[11px] text-indigo-200 font-semibold uppercase">O‘rtacha ko‘rsatkich</div>
            </div>
          </div>
        </div>

        {/* Subject Filter Tabs */}
        <div className="flex flex-wrap items-center gap-2 mt-6 pt-4 border-t border-indigo-800/80">
          {subjectList.map((s) => (
            <button
              key={s.code}
              onClick={() => setSelectedSubject(s.code)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
                selectedSubject === s.code
                  ? 'bg-white text-indigo-900 shadow-md'
                  : 'bg-indigo-800/50 text-indigo-200 hover:bg-indigo-800'
              }`}
            >
              {s.name}
            </button>
          ))}
        </div>
      </div>

      {/* Outcomes Mastery Cards */}
      <div className="space-y-4">
        {masteryItems.length === 0 ? (
          <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 text-slate-500">
            Ushbu fan bo‘yicha ma’lumotlar yuklanmoqda...
          </div>
        ) : (
          masteryItems.map((item) => (
            <div
              key={item.learningOutcomeId}
              className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm hover:shadow-md transition space-y-4"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold px-2.5 py-1 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200">
                    {item.learningOutcomeCode}
                  </span>
                  {statusBadge(item.status)}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500">Baholandi: {item.lastAssessedAt}</span>
                  <span className="font-mono text-sm font-black text-slate-900 px-2 py-0.5 rounded bg-slate-100">
                    {item.masteryScore}%
                  </span>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-bold text-slate-900">{item.learningOutcomeTitle}</h4>
                {item.teacherFeedback && (
                  <p className="text-xs text-slate-600 mt-1.5 bg-slate-50 p-2.5 rounded-xl border border-slate-100 flex items-start gap-2">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-600 shrink-0 mt-0.5" />
                    <span><strong>O‘qituvchi sharhi:</strong> {item.teacherFeedback}</span>
                  </p>
                )}
              </div>

              {/* Progress Bar */}
              <div className="space-y-1">
                <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      item.masteryScore >= 85
                        ? 'bg-emerald-500'
                        : item.masteryScore >= 70
                        ? 'bg-blue-500'
                        : item.masteryScore >= 50
                        ? 'bg-amber-500'
                        : 'bg-rose-500'
                    }`}
                    style={{ width: `${item.masteryScore}%` }}
                  />
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

