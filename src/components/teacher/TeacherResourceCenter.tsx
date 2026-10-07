import React, { useState, useMemo } from 'react';
import {
  BookOpen,
  FileText,
  Presentation,
  CheckSquare,
  FlaskConical,
  Award,
  Download,
  Copy,
  Sparkles,
  Filter,
  Search,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  Tag,
  Share2,
} from 'lucide-react';
import { AppLanguage, PedagogicalResource, UserProfile } from '../../types';
import {
  CANONICAL_PEDAGOGICAL_RESOURCES,
  CANONICAL_LEARNING_OUTCOMES,
  getLearningOutcomeById,
} from '../../lib/standardsRegistry';

interface Props {
  currentUser?: UserProfile | null;
  language: AppLanguage;
  onSelectResourceForLesson?: (resource: PedagogicalResource) => void;
}

export const TeacherResourceCenter: React.FC<Props> = ({
  currentUser,
  language,
  onSelectResourceForLesson,
}) => {
  const [selectedType, setSelectedType] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [activePreviewResource, setActivePreviewResource] = useState<PedagogicalResource | null>(null);

  // Filter resources
  const filteredResources = useMemo(() => {
    return CANONICAL_PEDAGOGICAL_RESOURCES.filter((res) => {
      if (selectedType !== 'ALL' && res.type !== selectedType) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = res.title.toLowerCase().includes(q);
        const matchesAuthor = res.author.toLowerCase().includes(q);
        const matchesTags = res.tags.some((t) => t.toLowerCase().includes(q));
        if (!matchesTitle && !matchesAuthor && !matchesTags) return false;
      }
      return true;
    });
  }, [selectedType, searchQuery]);

  const handleCopySnippet = (res: PedagogicalResource) => {
    const text = res.contentSnippet || `${res.title}\nMuallif: ${res.author}\nLO: ${res.learningOutcomeId}`;
    navigator.clipboard.writeText(text);
    setCopiedId(res.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const resourceTypeIcon = (type: PedagogicalResource['type']) => {
    switch (type) {
      case 'lesson_plan':
        return <FileText className="w-4 h-4 text-blue-600" />;
      case 'presentation':
        return <Presentation className="w-4 h-4 text-purple-600" />;
      case 'worksheet':
        return <CheckSquare className="w-4 h-4 text-emerald-600" />;
      case 'lab_guide':
        return <FlaskConical className="w-4 h-4 text-amber-600" />;
      case 'rubric':
        return <Award className="w-4 h-4 text-rose-600" />;
      default:
        return <BookOpen className="w-4 h-4 text-indigo-600" />;
    }
  };

  const resourceTypeLabel = (type: PedagogicalResource['type']) => {
    switch (type) {
      case 'lesson_plan':
        return language === 'uz' ? 'Texnologik Xarita' : language === 'ru' ? 'Техкарта урока' : 'Технологиялык карта';
      case 'presentation':
        return language === 'uz' ? 'Prezentatsiya' : language === 'ru' ? 'Презентация' : 'Презентация';
      case 'worksheet':
        return language === 'uz' ? 'Tarkatma Material' : language === 'ru' ? 'Раздаточный материал' : 'Таркатма материал';
      case 'lab_guide':
        return language === 'uz' ? 'Laboratoriya Qo‘llanmasi' : language === 'ru' ? 'Лабораторный практикум' : 'Лабораториялык колдонмо';
      case 'rubric':
        return language === 'uz' ? 'Baholash Rubrikasi' : language === 'ru' ? 'Критерии оценивания' : 'Баалоо критерийлери';
      default:
        return type;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl p-6 border border-indigo-800 shadow-md">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-400/30">
                <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
                KAO & МОН КР Metodik Kutubxonasi
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Standartlarga moslangan
              </span>
            </div>
            <h2 className="text-2xl font-black tracking-tight mt-2">
              {language === 'uz'
                ? 'O‘qituvchi Pedagogik va Metodik Resurslar Markazi'
                : language === 'ru'
                ? 'Центр Педагогических и Методических Ресурсов'
                : 'Мугалимдин Педагогикалык жана Методикалык Ресурстар Борбору'}
            </h2>
            <p className="text-xs text-indigo-200 mt-1 max-w-2xl">
              {language === 'uz'
                ? 'Dars jarayoniga tayyorgarlik ko‘rish uchun rasmiy texnologik xaritalar, taqdimotlar, PISA uslubidagi tarqatmalar va baholash mezonlari to‘plami.'
                : 'Комплект официальных технологических карт уроков, презентаций, раздаточных материалов и критериев оценивания.'}
            </p>
          </div>

          <div className="bg-indigo-900/50 p-4 rounded-xl border border-indigo-700/50 backdrop-blur-sm flex items-center gap-3">
            <Sparkles className="w-7 h-7 text-amber-300 shrink-0" />
            <div>
              <div className="text-xs font-bold text-white">AI Dars Yordamchisi bilan integratsiya</div>
              <div className="text-[11px] text-indigo-200">Resurslarni bir bosishda AI konspektiga joylang</div>
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Type Filter Buttons */}
          <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto">
            {[
              { id: 'ALL', label: 'Barcha resurslar' },
              { id: 'lesson_plan', label: 'Texnologik Xarita' },
              { id: 'presentation', label: 'Prezentatsiya' },
              { id: 'worksheet', label: 'Tarkatma' },
              { id: 'lab_guide', label: 'Laboratoriya' },
              { id: 'rubric', label: 'Rubrika' },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => setSelectedType(t.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                  selectedType === t.id
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Qidiruv (nomi, teglar)..."
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50/50"
            />
          </div>
        </div>
      </div>

      {/* Resources Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredResources.length === 0 ? (
          <div className="col-span-full py-12 text-center text-slate-500 bg-white rounded-2xl border border-slate-200">
            Resurslar topilmadi.
          </div>
        ) : (
          filteredResources.map((res) => {
            const linkedLO = getLearningOutcomeById(res.learningOutcomeId);
            return (
              <div
                key={res.id}
                className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm hover:shadow-md transition flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-100 text-slate-700">
                      {resourceTypeIcon(res.type)}
                      {resourceTypeLabel(res.type)}
                    </span>
                    <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-100">
                      {res.grade}-sinf • {res.subjectCode}
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-slate-900 mt-3 line-clamp-2">{res.title}</h3>
                  {res.description && (
                    <p className="text-xs text-slate-600 mt-1 line-clamp-2">{res.description}</p>
                  )}

                  {linkedLO && (
                    <div className="mt-3 p-2 rounded-xl bg-slate-50 border border-slate-100 text-[11px] text-slate-700">
                      <span className="font-mono font-bold text-indigo-600">{linkedLO.code}:</span>{' '}
                      <span className="line-clamp-1">{linkedLO.title}</span>
                    </div>
                  )}

                  {/* Tags */}
                  <div className="flex flex-wrap items-center gap-1 mt-3">
                    {res.tags.map((tag, idx) => (
                      <span key={idx} className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Card Footer */}
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="text-slate-500 text-[11px]">Muallif: {res.author.split(' ')[0]}</span>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleCopySnippet(res)}
                      className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 transition"
                      title="Nusxa olish"
                    >
                      {copiedId === res.id ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                    {onSelectResourceForLesson && (
                      <button
                        onClick={() => onSelectResourceForLesson(res)}
                        className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition"
                      >
                        Darsga biriktirish
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

