import React, { useState, useMemo } from 'react';
import {
  BookOpen,
  CheckCircle2,
  Filter,
  Search,
  Layers,
  Award,
  Plus,
  FileText,
  Clock,
  Sparkles,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import { AppLanguage, CognitiveLevel, LearningOutcome, CurriculumStandard, CurriculumVersion } from '../../types';
import {
  KAO_CURRICULUM_STANDARDS,
  KAO_CURRICULUM_VERSIONS,
  CANONICAL_LEARNING_OUTCOMES,
  CANONICAL_PEDAGOGICAL_RESOURCES,
  getPedagogicalResourcesForLO,
  getAssessmentsForLO,
} from '../../lib/standardsRegistry';
import { KAO_OFFICIAL_PROVENANCE_REGISTRY } from '../../lib/kyrgyzstanEdu';

interface Props {
  language: AppLanguage;
}

export const CurriculumStandardsManager: React.FC<Props> = ({ language }) => {
  const [selectedStandardId, setSelectedStandardId] = useState<string>('std-stem-2026');
  const [selectedSubjectCode, setSelectedSubjectCode] = useState<string>('ALL');
  const [selectedGrade, setSelectedGrade] = useState<number | 'ALL'>('ALL');
  const [selectedCognitiveLevel, setSelectedCognitiveLevel] = useState<CognitiveLevel | 'ALL'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeLOModal, setActiveLOModal] = useState<LearningOutcome | null>(null);

  // Active Standard
  const activeStandard = useMemo(() => {
    return KAO_CURRICULUM_STANDARDS.find((s) => s.id === selectedStandardId) || KAO_CURRICULUM_STANDARDS[0];
  }, [selectedStandardId]);

  // Unique Subjects present in LOs
  const availableSubjects = useMemo(() => {
    const map = new Map<string, { code: string; name: string }>();
    CANONICAL_LEARNING_OUTCOMES.forEach((lo) => {
      if (!map.has(lo.subjectCode)) {
        map.set(lo.subjectCode, {
          code: lo.subjectCode,
          name: lo.subjectCode.replace('-01', '').replace('_', ' '),
        });
      }
    });
    return Array.from(map.values());
  }, []);

  // Filtered Learning Outcomes
  const filteredLOs = useMemo(() => {
    return CANONICAL_LEARNING_OUTCOMES.filter((lo) => {
      if (selectedSubjectCode !== 'ALL' && lo.subjectCode !== selectedSubjectCode) return false;
      if (selectedGrade !== 'ALL' && lo.grade !== selectedGrade) return false;
      if (selectedCognitiveLevel !== 'ALL' && lo.cognitiveLevel !== selectedCognitiveLevel) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesCode = lo.code.toLowerCase().includes(q);
        const matchesTitle = lo.title.toLowerCase().includes(q);
        const matchesTopic = lo.topic.toLowerCase().includes(q);
        const matchesDesc = (lo.description[language] || lo.description.uz).toLowerCase().includes(q);
        if (!matchesCode && !matchesTitle && !matchesTopic && !matchesDesc) return false;
      }
      return true;
    });
  }, [selectedSubjectCode, selectedGrade, selectedCognitiveLevel, searchQuery, language]);

  const cognitiveLevelBadge = (level: CognitiveLevel) => {
    switch (level) {
      case 'reproductive':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-200">
            {language === 'uz' ? 'Reproduktiv (Bilish)' : language === 'ru' ? 'Репродуктивный' : 'Репродуктивдүү'}
          </span>
        );
      case 'productive':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
            {language === 'uz' ? 'Produktiv (Qo‘llash)' : language === 'ru' ? 'Продуктивный' : 'Продуктивдүү'}
          </span>
        );
      case 'creative':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-purple-100 text-purple-800 border border-purple-200">
            {language === 'uz' ? 'Kreativ (PISA/Yaratish)' : language === 'ru' ? 'Творческий (PISA)' : 'Чыгармачыл (PISA)'}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Framework Switcher */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                <ShieldCheck className="w-3.5 h-3.5" />
                KAO 2026–2027 Davlat Ta’lim Standartlari
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                <CheckCircle2 className="w-3.5 h-3.5" />
                100% Rasmiy Verifikatsiya
              </span>
            </div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight mt-2">
              {language === 'uz'
                ? 'Davlat Standartlari va O‘quv Natijalari (Learning Outcomes) Boshqaruvi'
                : language === 'ru'
                ? 'Управление Государственными Стандартами и Результатами Обучения'
                : 'Мамлекеттик Стандарттар жана Окутуу Натыйжалары (LO)'}
            </h2>
            <p className="text-sm text-slate-600 mt-1">
              {language === 'uz'
                ? 'Pedagogik ierarxiya: Standart → BUP → Fan Standarti → O‘quv Dasturi → Sinf → Fan → O‘quv Natijasi (LO) → Mavzu → Dars → Resurs → Baholash'
                : 'Педагогическая иерархия: Стандарт → БУП → Стандарт предмета → Программа → Класс → Результат обучения (LO) → Тема → Урок → Оценка'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <a
              href="https://kao.kg/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 transition border border-slate-200"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              KAO.KG Rasmiy Portali
            </a>
          </div>
        </div>

        {/* Standards Tabs */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-6 pt-6 border-t border-slate-100">
          {KAO_CURRICULUM_STANDARDS.map((std) => {
            const isSelected = std.id === selectedStandardId;
            return (
              <button
                key={std.id}
                onClick={() => setSelectedStandardId(std.id)}
                className={`text-left p-4 rounded-xl border transition flex flex-col justify-between ${
                  isSelected
                    ? 'border-indigo-600 bg-indigo-50/50 shadow-sm ring-2 ring-indigo-500/20'
                    : 'border-slate-200 bg-slate-50/50 hover:bg-slate-100/50'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-indigo-700 font-mono">{std.code}</span>
                    <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded bg-white text-slate-600 border border-slate-200">
                      {std.orderNumber}
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-slate-900 mt-2 line-clamp-2">
                    {language === 'ru' ? std.nameRu : language === 'ky' ? std.nameKy : std.nameUz}
                  </h4>
                </div>
                <div className="mt-3 pt-2 border-t border-slate-200/60 flex items-center justify-between text-xs text-slate-500">
                  <span>{std.domains.length} ta ta’lim sohasi</span>
                  <span className="font-semibold text-slate-700">{std.effectiveYear}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Curriculum Versions (11-Year vs 12-Year Pilot) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {KAO_CURRICULUM_VERSIONS.map((ver) => (
          <div
            key={ver.id}
            className={`p-5 rounded-2xl border ${
              ver.status === 'active'
                ? 'bg-gradient-to-br from-indigo-900 via-indigo-950 to-slate-900 text-white border-indigo-700 shadow-md'
                : 'bg-white border-slate-200 text-slate-800'
            }`}
          >
            <div className="flex items-center justify-between">
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${
                  ver.status === 'active'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : 'bg-amber-100 text-amber-800 border border-amber-200'
                }`}
              >
                <Zap className="w-3 h-3" />
                {ver.framework === '11_YEAR' ? '11-Yillik Standart (Amaldagi)' : '12-Yillik Standart (Bosqichma-bosqich)'}
              </span>
              <span className={`text-xs font-mono font-semibold ${ver.status === 'active' ? 'text-indigo-200' : 'text-slate-500'}`}>
                {ver.orderNumber}
              </span>
            </div>
            <h3 className={`text-lg font-black mt-3 ${ver.status === 'active' ? 'text-white' : 'text-slate-900'}`}>{ver.name}</h3>
            <p className={`text-xs mt-1.5 line-clamp-2 ${ver.status === 'active' ? 'text-indigo-200' : 'text-slate-600'}`}>
              {ver.description}
            </p>
            <div
              className={`mt-4 pt-3 border-t flex items-center justify-between text-xs ${
                ver.status === 'active' ? 'border-indigo-800/80 text-indigo-300' : 'border-slate-100 text-slate-500'
              }`}
            >
              <span>{ver.totalOutcomesCount} ta Davlat O‘quv Natijasi (LO)</span>
              <span className="font-bold">{ver.academicYear}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Learning Outcomes Interactive Registry */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-indigo-600" />
              {language === 'uz' ? 'O‘quv Natijalari (Learning Outcomes) Katalogi' : 'Каталог Результатов Обучения (LO)'}
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                {filteredLOs.length} ta natija
              </span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Har bir dars, jurnal bahosi, KTP va AI konspekti aniq O‘quv Natijasiga (LO) bog‘lanadi.
            </p>
          </div>

          {/* Search */}
          <div className="relative w-full lg:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="LO kodi, mavzu yoki ko‘nikma..."
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50/50"
            />
          </div>
        </div>

        {/* Filter Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4 pt-4 border-t border-slate-100">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Fan bo‘yicha filtr:</label>
            <select
              value={selectedSubjectCode}
              onChange={(e) => setSelectedSubjectCode(e.target.value)}
              className="w-full text-xs p-2 rounded-xl border border-slate-200 bg-white font-medium"
            >
              <option value="ALL">Barcha fanlar ({availableSubjects.length})</option>
              {availableSubjects.map((s) => (
                <option key={s.code} value={s.code}>
                  {s.name} ({s.code})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Sinf (Grade):</label>
            <select
              value={selectedGrade}
              onChange={(e) => setSelectedGrade(e.target.value === 'ALL' ? 'ALL' : Number(e.target.value))}
              className="w-full text-xs p-2 rounded-xl border border-slate-200 bg-white font-medium"
            >
              <option value="ALL">Barcha sinflar (1–11)</option>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((g) => (
                <option key={g} value={g}>
                  {g}-sinf
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Kognitiv daraja (PISA/Blum):</label>
            <select
              value={selectedCognitiveLevel}
              onChange={(e) => setSelectedCognitiveLevel(e.target.value as any)}
              className="w-full text-xs p-2 rounded-xl border border-slate-200 bg-white font-medium"
            >
              <option value="ALL">Barcha darajalar</option>
              <option value="reproductive">Reproduktiv (Bilish va eslash)</option>
              <option value="productive">Produktiv (Tushunish va qo‘llash)</option>
              <option value="creative">Kreativ (Tahlil, PISA, Yaratish)</option>
            </select>
          </div>
        </div>

        {/* LO Table */}
        <div className="mt-5 overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-slate-700 font-bold">
                <th className="py-3 px-3">LO Kodi</th>
                <th className="py-3 px-3">Sinf & Fan</th>
                <th className="py-3 px-3">Bo‘lim & Mavzu</th>
                <th className="py-3 px-3">O‘quv Natijasi (Kutilayotgan ko‘nikma)</th>
                <th className="py-3 px-3">Kognitiv Daraja</th>
                <th className="py-3 px-3 text-right">Amal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredLOs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500">
                    Mos keluvchi O‘quv Natijalari topilmadi.
                  </td>
                </tr>
              ) : (
                filteredLOs.map((lo) => (
                  <tr key={lo.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3 px-3 font-mono font-bold text-indigo-700 whitespace-nowrap">
                      {lo.code}
                    </td>
                    <td className="py-3 px-3 whitespace-nowrap">
                      <span className="font-bold text-slate-900">{lo.grade}-sinf</span>
                      <span className="block text-[11px] text-slate-500 font-mono">{lo.subjectCode}</span>
                    </td>
                    <td className="py-3 px-3 max-w-[200px]">
                      <span className="font-semibold text-slate-800 block truncate">{lo.unitTitle}</span>
                      <span className="text-[11px] text-slate-500 block truncate">{lo.topic}</span>
                    </td>
                    <td className="py-3 px-3">
                      <span className="font-medium text-slate-900 line-clamp-2">{lo.title}</span>
                      <span className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                        {lo.description[language] || lo.description.uz}
                      </span>
                    </td>
                    <td className="py-3 px-3 whitespace-nowrap">
                      {cognitiveLevelBadge(lo.cognitiveLevel)}
                    </td>
                    <td className="py-3 px-3 text-right whitespace-nowrap">
                      <button
                        onClick={() => setActiveLOModal(lo)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition"
                      >
                        Tafsilot
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* LO Detail Modal */}
      {activeLOModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 border border-slate-200 shadow-2xl space-y-5">
            <div className="flex items-start justify-between border-b border-slate-100 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-black px-2.5 py-1 rounded-md bg-indigo-100 text-indigo-800">
                    {activeLOModal.code}
                  </span>
                  {cognitiveLevelBadge(activeLOModal.cognitiveLevel)}
                </div>
                <h3 className="text-lg font-black text-slate-900 mt-2">{activeLOModal.title}</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {activeLOModal.grade}-sinf • {activeLOModal.unitTitle} • {activeLOModal.topic}
                </p>
              </div>
              <button
                onClick={() => setActiveLOModal(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                ✕
              </button>
            </div>

            {/* Description Multilingual */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Tavsif (Kompetensiya)</h4>
              <p className="text-xs text-slate-700 bg-slate-50 p-3 rounded-xl border border-slate-200/80 leading-relaxed">
                {activeLOModal.description[language] || activeLOModal.description.uz}
              </p>
            </div>

            {/* Assessment Criteria */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Baholash Mezonlari (Rubrikalar)</h4>
              <ul className="space-y-1.5 text-xs text-slate-700">
                {activeLOModal.criteria.map((c, i) => (
                  <li key={i} className="flex items-start gap-2 bg-emerald-50/50 p-2 rounded-lg border border-emerald-100">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>{c}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Sample Tasks */}
            {activeLOModal.sampleTasks && activeLOModal.sampleTasks.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Namunaviy Vazifalar / PISA topshiriqlari</h4>
                <div className="space-y-1.5 text-xs text-slate-700">
                  {activeLOModal.sampleTasks.map((task, i) => (
                    <div key={i} className="p-2.5 rounded-lg bg-indigo-50/50 border border-indigo-100 font-mono text-[11px]">
                      {task}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Related Pedagogical Resources & Rubrics */}
            <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
              <div className="text-xs text-slate-500">
                Tavsiya etilgan dars soati: <span className="font-bold text-slate-800">{activeLOModal.recommendedHours} soat</span>
              </div>
              <button
                onClick={() => setActiveLOModal(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-900 text-white hover:bg-slate-800 transition"
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

