import React, { useState, useEffect } from 'react';
import {
  FileText,
  FolderArchive,
  Download,
  Eye,
  Plus,
  Sparkles,
  Search,
  Filter,
  CheckCircle2,
  Calendar,
  User,
  Building,
  Award,
  BookOpen,
  Users,
  ShieldCheck,
  Printer,
  X,
  FileSpreadsheet,
  FileCheck,
  UploadCloud,
  ChevronRight,
  SlidersHorizontal,
  Bookmark,
  Send,
  Loader2,
} from 'lucide-react';
import { AppLanguage, SchoolDocument, UserRole } from '../../types';
import { useI18n } from '../../lib/i18n';
import { MOCK_DOCUMENTS } from '../../data/mockData';
import { listSchoolData, createSchoolData } from '../../lib/schoolRepository';

interface DocumentsManagerProps {
  language: AppLanguage;
  currentRole?: UserRole;
  activeTeacherHomeroom?: string;
}

export const DocumentsManager: React.FC<DocumentsManagerProps> = ({
  language,
  currentRole = 'teacher',
  activeTeacherHomeroom,
}) => {
  const t = useI18n(language);
  const [documents, setDocuments] = useState<SchoolDocument[]>(MOCK_DOCUMENTS);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedDocType, setSelectedDocType] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [previewDoc, setPreviewDoc] = useState<SchoolDocument | null>(null);

  // Load from school data repository
  useEffect(() => {
    let active = true;
    listSchoolData<SchoolDocument>('documents')
      .then((items) => {
        if (active && items.length > 0) {
          // Merge unique by ID
          const existingIds = new Set(items.map((d) => d.id));
          const mockNonDuplicated = MOCK_DOCUMENTS.filter((d) => !existingIds.has(d.id));
          setDocuments([...items, ...mockNonDuplicated]);
        }
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);

  // Upload modal state
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState<'pedagogical' | 'homeroom' | 'regulatory' | 'portfolio'>('pedagogical');
  const [newDocType, setNewDocType] = useState<'ktm' | 'lesson_plan' | 'meeting_minutes' | 'social_passport' | 'order' | 'curriculum' | 'certificate' | 'report'>('ktm');
  const [newSubject, setNewSubject] = useState('Matematika');
  const [newGrade, setNewGrade] = useState('7-A');
  const [newDescription, setNewDescription] = useState('');
  const [newFormat, setNewFormat] = useState<'PDF' | 'DOCX' | 'XLSX'>('PDF');

  // AI Generator modal state
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [aiDocType, setAiDocType] = useState<'ktm' | 'meeting_minutes' | 'lesson_plan' | 'social_passport'>('ktm');
  const [aiTopic, setAiTopic] = useState('');
  const [aiGrade, setAiGrade] = useState('7-A');
  const [aiSubject, setAiSubject] = useState('Matematika');
  const [isGenerating, setIsGenerating] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleUploadDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const newDoc: SchoolDocument = {
      id: `doc-${Date.now()}`,
      title: newTitle,
      category: newCategory,
      docType: newDocType,
      subject: newSubject,
      gradeLevel: newGrade,
      author: 'Aigul Sadykova (Pedagog)',
      date: new Date().toISOString().split('T')[0],
      fileSize: '1.5 MB',
      format: newFormat,
      description: newDescription || 'Yangi yuklangan rasmiy pedagogik hujjat.',
      status: 'approved',
      tags: [newSubject, newGrade, newCategory.toUpperCase(), 'Yangi'],
      contentPreview: `${newTitle} bo‘yicha to‘liq elektron matn va ilovalar to‘plami. Ushbu hujjat ta’lim sifatini nazorat qilish mezonlariga mos ravishda tasdiqlangan.`,
    };

    setDocuments((prev) => [newDoc, ...prev]);
    setIsUploadModalOpen(false);
    setNewTitle('');
    setNewDescription('');

    try {
      await createSchoolData<SchoolDocument>('documents', newDoc);
    } catch {
      // Local state preserved
    }

    showToast(language === 'uz' ? 'Hujjat muvaffaqiyatli yuklandi va bazaga qo‘shildi!' : 'Document uploaded successfully!');
  };

  const handleGenerateAiDocument = async () => {
    setIsGenerating(true);
    let generatedTitle = '';
    let generatedContent = '';
    let category: 'pedagogical' | 'homeroom' = 'pedagogical';

    if (aiDocType === 'ktm') {
      generatedTitle = `${aiGrade}-sinf ${aiSubject} fanidan 2025-2026 o‘quv yili uchun AI Taqvim-Mavzu Rejasi (KTM)`;
      generatedContent = `DTS talablari bo‘yicha tuzilgan taqvim-mavzuiy reja. Mavzular: 1. Kirish va takrorlash (4 soat), 2. Asosiy bo‘lim (24 soat), 3. Amaliy mashg‘ulotlar va laboratoriyalar (12 soat), 4. BSB va CHSB nazorati (8 soat). Jami: 68 soat.`;
      category = 'pedagogical';
    } else if (aiDocType === 'meeting_minutes') {
      generatedTitle = `${aiGrade} Sinf Ota-onalar Majlisi Bayonnomasi №${Math.floor(Math.random() * 5) + 1} (${aiTopic || 'O‘zlashtirish va odob-axloq'})`;
      generatedContent = `Majlis raisi: Sinf rahbari. Qatnashdilar: 26 nafar ota-ona. Kun tartibi: 1. O‘quvchilarning 2-chorakdagi o‘zlashtirish holati. 2. FaceID davomat hisoboti va kechikishlar tahlili. 3. Ota-onalar bilan individual suhbatlar natijasi. Qaror qilindi: O‘quvchilarning uy vazifalarini nazorat qilish kuchaytirilsin.`;
      category = 'homeroom';
    } else if (aiDocType === 'lesson_plan') {
      generatedTitle = `${aiGrade}-sinf ${aiSubject}: "${aiTopic || 'Zamonaviy metodlar asosida dars ishlanmasi'}"`;
      generatedContent = `Darsning maqsadi: DTS kompetensiyalarini shakllantirish. Dars turi: Yangi bilimlarni mustahkamlash. Metodlar: "Aqliy hujum", "Klaster", "Beshinchisi ortiqcha". Dars bosqichlari: Tashkiliy qism (5 daqiqa), Yangi mavzu (20 daqiqa), Guruhlarda ishlash (15 daqiqa), Baholash va uyga vazifa (5 daqiqa).`;
      category = 'pedagogical';
    } else {
      generatedTitle = `${aiGrade} Sinf O‘quvchilarining Yillik Ijtimoiy Pasporti va Tarbiyaviy Monitoringi`;
      generatedContent = `Sinfdagi umumiy o‘quvchilar: 28 nafar. Ijtimoiy himoyaga muhtoj: 2 nafar. Iqtidorli va olimpiadachilar: 6 nafar. Sinf faollari va ota-onalar qo‘mitasi tarkibi tasdiqlangan.`;
      category = 'homeroom';
    }

    const generatedDoc: SchoolDocument = {
      id: `ai-doc-${Date.now()}`,
      title: generatedTitle,
      category: category,
      docType: aiDocType,
      subject: aiSubject,
      gradeLevel: aiGrade,
      author: 'EduSphere AI Generator & Aigul Sadykova',
      date: new Date().toISOString().split('T')[0],
      fileSize: '1.2 MB',
      format: 'PDF',
      description: `Sun’iy intellekt yordamida DTS va maktab standartlari asosida avtomatik shakllantirilgan rasmiy hujjat loyihasi.`,
      status: 'approved',
      tags: [aiSubject, aiGrade, 'AI Generatsiya', 'Rasmiy'],
      contentPreview: generatedContent,
      isAiGenerated: true,
    };

    setDocuments((prev) => [generatedDoc, ...prev]);
    setIsGenerating(false);
    setIsAiModalOpen(false);
    setAiTopic('');

    try {
      await createSchoolData<SchoolDocument>('documents', generatedDoc);
    } catch {
      // Local state preserved
    }

    showToast(language === 'uz' ? 'AI Hujjat yaratildi va bazaga saqlandi!' : 'AI Document generated and saved to cloud!');
  };

  const handlePrintOrDownload = (doc: SchoolDocument) => {
    showToast(language === 'uz' ? `"${doc.title.slice(0, 30)}..." yuklab olinmoqda (PDF/DOCX)...` : `Downloading "${doc.title.slice(0, 30)}..."`);
  };

  const filteredDocuments = documents.filter((doc) => {
    const matchesSearch =
      doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.author.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (doc.subject && doc.subject.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (doc.tags && doc.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase())));

    const matchesCategory =
      selectedCategory === 'ALL' || doc.category === selectedCategory;

    const matchesDocType =
      selectedDocType === 'ALL' || doc.docType === selectedDocType;

    return matchesSearch && matchesCategory && matchesDocType;
  });

  const countPedagogical = documents.filter((d) => d.category === 'pedagogical').length;
  const countHomeroom = documents.filter((d) => d.category === 'homeroom').length;
  const countRegulatory = documents.filter((d) => d.category === 'regulatory').length;
  const countPortfolio = documents.filter((d) => d.category === 'portfolio').length;

  return (
    <div id="documents-manager-view" className="space-y-6 pb-16">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-2xl bg-indigo-600 px-5 py-3.5 text-xs font-bold text-white shadow-2xl animate-bounce">
          <CheckCircle2 className="h-4 w-4" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Hero Banner with Actions */}
      <div className="flex flex-col justify-between gap-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-xs dark:bg-indigo-500">
              <FolderArchive className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 dark:text-white sm:text-2xl">
                {language === 'uz'
                  ? "Kerakli Ma'lumotlar & Pedagogik Hujjatlar Markazi"
                  : "Documents & Regulatory Knowledge Center"}
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 sm:text-sm mt-0.5">
                {language === 'uz'
                  ? "Taqvim-mavzuiy rejalar (KTM), dars ishlanmalari, sinf rahbarlik daftarlari, bayonnomalar va davlat normativlari"
                  : "Curriculum plans (KTM), lesson plans, homeroom logs, meeting minutes, and official ministry orders"}
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => setIsAiModalOpen(true)}
            className="flex items-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-2.5 text-xs font-bold text-indigo-700 hover:bg-indigo-100 dark:border-indigo-800 dark:bg-indigo-950 dark:text-indigo-300 transition-all"
          >
            <Sparkles className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
            <span>{language === 'uz' ? 'AI Hujjat Yaratuvchi' : 'AI Document Generator'}</span>
          </button>

          <button
            onClick={() => setIsUploadModalOpen(true)}
            className="flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-bold text-white shadow-md hover:bg-indigo-700 dark:bg-indigo-500 transition-all hover:scale-[1.02]"
          >
            <Plus className="h-4 w-4" />
            <span>{language === 'uz' ? 'Hujjat Yuklash' : 'Upload Document'}</span>
          </button>
        </div>
      </div>

      {/* Metrics Summary Strip */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div
          onClick={() => setSelectedCategory('pedagogical')}
          className={`cursor-pointer rounded-2xl border p-4 shadow-2xs transition-all ${
            selectedCategory === 'pedagogical'
              ? 'border-indigo-500 bg-indigo-50/50 dark:border-indigo-500 dark:bg-indigo-950/30'
              : 'border-slate-200 bg-white hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900'
          }`}
        >
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold uppercase">{language === 'uz' ? 'Pedagogik & KTM' : 'Curriculum & KTM'}</span>
            <BookOpen className="h-4 w-4 text-indigo-600" />
          </div>
          <div className="mt-2 text-2xl font-black text-slate-900 dark:text-white">
            {countPedagogical} <span className="text-xs font-normal text-slate-500">ta hujjat</span>
          </div>
          <p className="text-[11px] text-emerald-600 font-semibold mt-0.5">Tasdiqlangan dasturlar</p>
        </div>

        <div
          onClick={() => setSelectedCategory('homeroom')}
          className={`cursor-pointer rounded-2xl border p-4 shadow-2xs transition-all ${
            selectedCategory === 'homeroom'
              ? 'border-amber-500 bg-amber-50/50 dark:border-amber-500 dark:bg-amber-950/30'
              : 'border-slate-200 bg-white hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900'
          }`}
        >
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold uppercase">{language === 'uz' ? 'Sinf Rahbarlik' : 'Homeroom Master'}</span>
            <Users className="h-4 w-4 text-amber-600" />
          </div>
          <div className="mt-2 text-2xl font-black text-slate-900 dark:text-white">
            {countHomeroom} <span className="text-xs font-normal text-slate-500">ta hujjat</span>
          </div>
          <p className="text-[11px] text-amber-600 font-semibold mt-0.5">Bayonnomalar & pasport</p>
        </div>

        <div
          onClick={() => setSelectedCategory('regulatory')}
          className={`cursor-pointer rounded-2xl border p-4 shadow-2xs transition-all ${
            selectedCategory === 'regulatory'
              ? 'border-cyan-500 bg-cyan-50/50 dark:border-cyan-500 dark:bg-cyan-950/30'
              : 'border-slate-200 bg-white hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900'
          }`}
        >
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold uppercase">{language === 'uz' ? 'Vazirlik & Buyruqlar' : 'Ministry & Orders'}</span>
            <ShieldCheck className="h-4 w-4 text-cyan-600" />
          </div>
          <div className="mt-2 text-2xl font-black text-slate-900 dark:text-white">
            {countRegulatory} <span className="text-xs font-normal text-slate-500">ta qaror</span>
          </div>
          <p className="text-[11px] text-cyan-600 font-semibold mt-0.5">DTS va baholash nizomi</p>
        </div>

        <div
          onClick={() => setSelectedCategory('portfolio')}
          className={`cursor-pointer rounded-2xl border p-4 shadow-2xs transition-all ${
            selectedCategory === 'portfolio'
              ? 'border-purple-500 bg-purple-50/50 dark:border-purple-500 dark:bg-purple-950/30'
              : 'border-slate-200 bg-white hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900'
          }`}
        >
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold uppercase">{language === 'uz' ? 'Portfolio & Sertifikat' : 'Certificates'}</span>
            <Award className="h-4 w-4 text-purple-600" />
          </div>
          <div className="mt-2 text-2xl font-black text-slate-900 dark:text-white">
            {countPortfolio} <span className="text-xs font-normal text-slate-500">ta fayl</span>
          </div>
          <p className="text-[11px] text-purple-600 font-semibold mt-0.5">Oliy toifa & attestatsiya</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900 md:flex-row md:items-center md:justify-between">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={
              language === 'uz'
                ? "Hujjat nomi, mavzu, fan, muallif yoki teglar bo‘yicha qidirish..."
                : "Search documents by title, subject, author, tags..."
            }
            className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 py-2.5 text-xs font-medium text-slate-900 focus:border-indigo-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          />
        </div>

        {/* Category Filter Chips */}
        <div className="flex flex-wrap items-center gap-1.5">
          {[
            { id: 'ALL', label: language === 'uz' ? 'Barchasi' : 'All' },
            { id: 'pedagogical', label: language === 'uz' ? '📑 Pedagogik & KTM' : '📑 Curriculum' },
            { id: 'homeroom', label: language === 'uz' ? '🏫 Sinf Rahbarlik' : '🏫 Homeroom' },
            { id: 'regulatory', label: language === 'uz' ? '⚖️ Normativlar' : '⚖️ Orders' },
            { id: 'portfolio', label: language === 'uz' ? '📜 Portfolio' : '📜 Portfolio' },
          ].map((cat) => {
            const isSel = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-all ${
                  isSel
                    ? 'bg-indigo-600 text-white shadow-2xs dark:bg-indigo-500'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
                }`}
              >
                {cat.label}
              </button>
            );
          })}
        </div>

        {/* DocType Filter */}
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-slate-400" />
          <select
            value={selectedDocType}
            onChange={(e) => setSelectedDocType(e.target.value)}
            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-700 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
          >
            <option value="ALL">{language === 'uz' ? 'Barcha Hujjat Turlari' : 'All Types'}</option>
            <option value="ktm">{language === 'uz' ? 'Taqvim Reja (KTM)' : 'Curriculum Plan (KTM)'}</option>
            <option value="lesson_plan">{language === 'uz' ? 'Dars Ishlanmasi (Konspekt)' : 'Lesson Plan'}</option>
            <option value="meeting_minutes">{language === 'uz' ? 'Majlis Bayonnomasi' : 'Meeting Minutes'}</option>
            <option value="social_passport">{language === 'uz' ? 'Ijtimoiy Pasport & Tarbiya' : 'Social Passport'}</option>
            <option value="order">{language === 'uz' ? 'Maktab / Vazirlik Buyrug‘i' : 'School/Ministry Order'}</option>
            <option value="certificate">{language === 'uz' ? 'Sertifikat & Guvohnoma' : 'Certificates'}</option>
          </select>
        </div>
      </div>

      {/* Documents Grid */}
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
        {filteredDocuments.map((doc) => {
          const isKtm = doc.docType === 'ktm';
          const isHomeroom = doc.category === 'homeroom';
          const isReg = doc.category === 'regulatory';
          const isPort = doc.category === 'portfolio';

          const badgeColor = isKtm
            ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-900'
            : isHomeroom
            ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-900'
            : isReg
            ? 'bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-950 dark:text-cyan-300 dark:border-cyan-900'
            : 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950 dark:text-purple-300 dark:border-purple-900';

          return (
            <div
              key={doc.id}
              className="group flex flex-col justify-between rounded-3xl border border-slate-200 bg-white p-5 shadow-xs transition-all duration-200 hover:-translate-y-1 hover:border-indigo-300 hover:shadow-xl dark:border-slate-800 dark:bg-slate-900"
            >
              <div>
                {/* Header Badge & File Format */}
                <div className="flex items-start justify-between gap-2">
                  <span className={`inline-flex items-center gap-1 rounded-xl px-2.5 py-1 text-[10px] font-bold border ${badgeColor}`}>
                    {isHomeroom ? '🏫 Sinf Rahbarlik' : isKtm ? '📑 Taqvim Reja (KTM)' : isReg ? '⚖️ Normativ & Buyruq' : '📜 Portfolio'}
                  </span>

                  <span className="rounded-lg bg-slate-100 px-2 py-0.5 text-[10px] font-black text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                    {doc.format} • {doc.fileSize}
                  </span>
                </div>

                {/* Document Title */}
                <h3 className="mt-3 text-sm font-bold text-slate-900 dark:text-white line-clamp-2 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                  {doc.title}
                </h3>

                {/* Description */}
                <p className="mt-2 text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                  {doc.description}
                </p>

                {/* Metadata Row */}
                <div className="mt-4 space-y-1.5 rounded-2xl bg-slate-50 p-3 text-[11px] text-slate-600 dark:bg-slate-800/60 dark:text-slate-300 border border-slate-100 dark:border-slate-800">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 flex items-center gap-1">
                      <User className="h-3 w-3" /> Muallif / Mas’ul:
                    </span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[150px]">
                      {doc.author}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 flex items-center gap-1">
                      <Calendar className="h-3 w-3" /> Sana:
                    </span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">{doc.date}</span>
                  </div>

                  {doc.gradeLevel && (
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 flex items-center gap-1">
                        <Building className="h-3 w-3" /> Sinf / Bosqich:
                      </span>
                      <span className="font-bold text-indigo-600 dark:text-indigo-400">{doc.gradeLevel}</span>
                    </div>
                  )}
                </div>

                {/* Tags */}
                {doc.tags && (
                  <div className="mt-3 flex flex-wrap gap-1">
                    {doc.tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded bg-slate-100 px-1.5 py-0.5 text-[9px] font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                      >
                        #{tag}
                      </span>
                    ))}
                    {doc.isAiGenerated && (
                      <span className="inline-flex items-center gap-0.5 rounded bg-purple-100 px-1.5 py-0.5 text-[9px] font-bold text-purple-700 dark:bg-purple-950 dark:text-purple-300">
                        <Sparkles className="h-2.5 w-2.5" /> AI Generated
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Action Buttons Footer */}
              <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-3 dark:border-slate-800">
                <button
                  onClick={() => setPreviewDoc(doc)}
                  className="flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400"
                >
                  <Eye className="h-3.5 w-3.5" />
                  <span>{language === 'uz' ? 'Ko‘rish' : 'Preview'}</span>
                </button>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => handlePrintOrDownload(doc)}
                    className="flex items-center gap-1 rounded-xl bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200"
                    title="Yuklab olish"
                  >
                    <Download className="h-3.5 w-3.5" />
                    <span>{doc.format}</span>
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Document Preview Modal */}
      {previewDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-2xl rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900 max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-start justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400">
                  <FileText className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white sm:text-lg">
                    {previewDoc.title}
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {previewDoc.author} • {previewDoc.date} • {previewDoc.format} ({previewDoc.fileSize})
                  </p>
                </div>
              </div>

              <button
                onClick={() => setPreviewDoc(null)}
                className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Official Stamp & Details */}
            <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-emerald-50/70 p-3.5 text-xs text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900">
              <div className="flex items-center gap-2 font-bold">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                <span>EduSphere Rasmiy Tasdiqlangan Hujjat</span>
              </div>
              <span className="text-[11px] text-emerald-700 dark:text-emerald-400 font-semibold">
                Elektron raqamli imzo: Verified #EDS-2026-9874
              </span>
            </div>

            {/* Content Preview Box */}
            <div className="mt-4 rounded-2xl bg-slate-50 p-5 text-xs dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 space-y-3 font-sans leading-relaxed text-slate-700 dark:text-slate-300">
              <h4 className="font-bold text-slate-900 dark:text-white uppercase tracking-wider text-[11px]">
                Hujjatning Qisqacha Mazmuni va Tuzilishi:
              </h4>
              <p className="whitespace-pre-line text-xs">
                {previewDoc.contentPreview || previewDoc.description}
              </p>
              <div className="pt-3 border-t border-slate-200 dark:border-slate-700 text-[11px] text-slate-400 flex items-center justify-between">
                <span>Format: {previewDoc.format}</span>
                <span>Kategoriya: {previewDoc.category.toUpperCase()}</span>
                <span>Status: Rasmiy amal qilmoqda</span>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="mt-6 flex items-center justify-end gap-2.5">
              <button
                onClick={() => setPreviewDoc(null)}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              >
                Yopish
              </button>

              <button
                onClick={() => {
                  handlePrintOrDownload(previewDoc);
                  setPreviewDoc(null);
                }}
                className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              >
                <Printer className="h-4 w-4 text-slate-500" />
                <span>Chop Etish (Print)</span>
              </button>

              <button
                onClick={() => {
                  handlePrintOrDownload(previewDoc);
                  setPreviewDoc(null);
                }}
                className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-5 py-2 text-xs font-bold text-white hover:bg-indigo-700 dark:bg-indigo-500 shadow-md"
              >
                <Download className="h-4 w-4" />
                <span>Yuklab Olish ({previewDoc.format})</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Upload Document Modal */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <UploadCloud className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {language === 'uz' ? 'Yangi Hujjat Yuklash' : 'Upload School Document'}
                </h3>
              </div>
              <button
                onClick={() => setIsUploadModalOpen(false)}
                className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleUploadDocument} className="mt-4 space-y-3.5">
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Hujjat Nomi / Sarlavhasi *
                </label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Masalan: 7-A Matematika 3-chorak KTM yoki Sinf bayonnomasi №4"
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs text-slate-900 focus:border-indigo-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Kategoriya
                  </label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value as any)}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-900 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  >
                    <option value="pedagogical">📑 Pedagogik & KTM</option>
                    <option value="homeroom">🏫 Sinf Rahbarlik</option>
                    <option value="regulatory">⚖️ Normativ & Buyruqlar</option>
                    <option value="portfolio">📜 Portfolio & Sertifikat</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Hujjat Turi
                  </label>
                  <select
                    value={newDocType}
                    onChange={(e) => setNewDocType(e.target.value as any)}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-900 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  >
                    <option value="ktm">Taqvim-mavzu reja (KTM)</option>
                    <option value="lesson_plan">Dars ishlanmasi (Konspekt)</option>
                    <option value="meeting_minutes">Majlis bayonnomasi</option>
                    <option value="social_passport">Ijtimoiy pasport</option>
                    <option value="order">Buyruq / Nizom</option>
                    <option value="certificate">Sertifikat</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Fan</label>
                  <input
                    type="text"
                    value={newSubject}
                    onChange={(e) => setNewSubject(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Sinf</label>
                  <select
                    value={newGrade}
                    onChange={(e) => setNewGrade(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-900 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  >
                    <option value="7-A">7-A</option>
                    <option value="8-B">8-B</option>
                    <option value="9-A">9-A</option>
                    <option value="10-B">10-B</option>
                    <option value="General">Barcha sinflar</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Format</label>
                  <select
                    value={newFormat}
                    onChange={(e) => setNewFormat(e.target.value as any)}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-900 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  >
                    <option value="PDF">PDF</option>
                    <option value="DOCX">DOCX (Word)</option>
                    <option value="XLSX">XLSX (Excel)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Tavsif va Qo‘shimcha Qaydlar
                </label>
                <textarea
                  rows={3}
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="Hujjatning qisqacha mazmuni, tasdiqlangan buyruq raqami yoki eslatmalar..."
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-900 focus:border-indigo-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              {/* Drag and Drop Zone Simulator */}
              <div className="rounded-2xl border-2 border-dashed border-slate-200 p-4 text-center dark:border-slate-700">
                <UploadCloud className="mx-auto h-7 w-7 text-indigo-500" />
                <p className="mt-1 text-xs font-semibold text-slate-700 dark:text-slate-200">
                  Faylni shu yerga torting yoki tanlang
                </p>
                <p className="text-[10px] text-slate-400">PDF, DOCX, XLSX, max 25 MB</p>
              </div>

              <div className="mt-5 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsUploadModalOpen(false)}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                >
                  Bekor qilish
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-indigo-600 px-5 py-2 text-xs font-bold text-white hover:bg-indigo-700 dark:bg-indigo-500 shadow-md"
                >
                  Yuklash va Saqlash
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* AI Document Generator Modal */}
      {isAiModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-purple-600 text-white">
                  <Sparkles className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    {language === 'uz' ? 'AI Pedagogik Hujjat Yaratuvchi' : 'AI Document Generator'}
                  </h3>
                  <p className="text-[11px] text-slate-400">DTS va rasmiy maktab andozalari asosida tezkor generatsiya</p>
                </div>
              </div>
              <button
                onClick={() => setIsAiModalOpen(false)}
                className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4 space-y-3.5">
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Qanday Hujjat Generatsiya Qilinsin?
                </label>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  {[
                    { id: 'ktm', title: '📑 Taqvim Reja (KTM)', desc: 'Yillik 68 soatlik reja' },
                    { id: 'meeting_minutes', title: '🏫 Ota-onalar Majlisi', desc: 'Bayonnoma va qarorlar' },
                    { id: 'lesson_plan', title: '📝 Dars Ishlanmasi', desc: '45 daqiqalik konspekt' },
                    { id: 'social_passport', title: '👥 Ijtimoiy Pasport', desc: 'Sinf monitoringi' },
                  ].map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setAiDocType(item.id as any)}
                      className={`rounded-2xl border p-3 text-left transition-all ${
                        aiDocType === item.id
                          ? 'border-purple-600 bg-purple-50 dark:border-purple-500 dark:bg-purple-950/40 text-purple-900 dark:text-purple-200 font-bold'
                          : 'border-slate-200 bg-white hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <div className="text-xs">{item.title}</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">{item.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Sinf</label>
                  <select
                    value={aiGrade}
                    onChange={(e) => setAiGrade(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-900 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  >
                    <option value="7-A">7-A sinf</option>
                    <option value="8-B">8-B sinf</option>
                    <option value="9-A">9-A sinf</option>
                    <option value="10-B">10-B sinf</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Fan</label>
                  <select
                    value={aiSubject}
                    onChange={(e) => setAiSubject(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-900 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  >
                    <option value="Matematika">Matematika & Algebra</option>
                    <option value="Fizika">Fizika & STEM</option>
                    <option value="Ingliz tili">Ingliz tili</option>
                    <option value="Informatika">Informatika & AI</option>
                    <option value="Ona tili">Ona tili & Adabiyot</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Mavzu yoki Asosiy Yo‘nalish (Ixtiyoriy)
                </label>
                <input
                  type="text"
                  value={aiTopic}
                  onChange={(e) => setAiTopic(e.target.value)}
                  placeholder="Masalan: 2-chorak yakunlari va xavfsizlik, Chiziqli tenglamalar, Tarbiyaviy soat..."
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs text-slate-900 focus:border-purple-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div className="mt-6 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAiModalOpen(false)}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                >
                  Bekor qilish
                </button>
                <button
                  type="button"
                  disabled={isGenerating}
                  onClick={handleGenerateAiDocument}
                  className="flex items-center gap-2 rounded-xl bg-purple-600 px-5 py-2 text-xs font-bold text-white hover:bg-purple-700 dark:bg-purple-500 shadow-md disabled:opacity-50"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Generatsiya qilinmoqda...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4" />
                      <span>AI Hujjatni Yaratish</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
