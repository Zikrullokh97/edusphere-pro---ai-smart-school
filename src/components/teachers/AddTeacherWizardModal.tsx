import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  User,
  GraduationCap,
  Briefcase,
  Clock,
  CheckCircle2,
  Calendar,
  Layers,
  Sparkles,
  Building,
  DoorClosed,
  Phone,
  Mail,
  Award,
  ChevronRight,
  ChevronLeft,
  BookOpen,
  Check,
  AlertCircle,
  Hash,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { AppLanguage, TeacherRecord } from '../../types';
import { TeacherWorkload } from '../../lib/scheduleGenerator';

interface AddTeacherWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  language: AppLanguage;
  onAddTeacher: (teacher: TeacherRecord, workload: TeacherWorkload, shouldRegenerateSchedule: boolean) => void;
  existingClassNames?: string[];
}

const PRESET_AVATARS = [
  'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1567532939604-b6b5b0db2604?w=150&auto=format&fit=crop&q=80',
];

const PRESET_POSITIONS = [
  { id: 'pos-hod', label: 'Kafedra mudiri (Head of Department)', icon: '👑', desc: 'Kafedra o‘quv rejalari va o‘qituvchilar uslubiy faoliyatini boshqaradi' },
  { id: 'pos-senior', label: 'Bosh o‘qituvchi (Senior Teacher)', icon: '⭐', desc: 'Katta tajribaga ega yetakchi pedagog' },
  { id: 'pos-method', label: 'Metodist & O‘quv koordinatori', icon: '📝', desc: 'O‘quv dasturlari va metodik ishlanmalar bo‘yicha mas’ul' },
  { id: 'pos-expert', label: 'Oliy toifali fan o‘qituvchisi', icon: '🏆', desc: 'Oliy toifali malakali mutaxassis' },
  { id: 'pos-spec', label: '1 / 2-toifali fan o‘qituvchisi', icon: '🎓', desc: 'Sertifikatlangan mutaxassis o‘qituvchi' },
  { id: 'pos-junior', label: 'Yosh mutaxassis (Junior Teacher)', icon: '🌱', desc: 'Stajyor va yosh o‘qituvchi' },
  { id: 'pos-vice', label: 'Direktor o‘rinbosari / Zavuch', icon: '🏛️', desc: 'Ma’muriy va o‘quv-tarbiyaviy rahbar' },
];

const PRESET_QUALIFICATIONS = [
  'Oliy toifali o‘qituvchi',
  '1-toifali o‘qituvchi',
  '2-toifali o‘qituvchi',
  'Mutaxassis o‘qituvchi',
  'Magistr (Master’s Degree)',
  'Fan nomzodi / PhD',
  'Bakalavr (Bachelor’s Degree)',
];

const PRESET_DEPARTMENTS: Array<{ id: 'STEM' | 'Science' | 'Humanities' | 'Technology' | 'Sports' | 'Languages'; name: string; color: string }> = [
  { id: 'STEM', name: 'STEM (Matematika & Aniq fanlar)', color: 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300' },
  { id: 'Science', name: 'Science (Fizika, Kimyo, Biologiya)', color: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300' },
  { id: 'Technology', name: 'Technology (Informatika & AI)', color: 'bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-950/40 dark:text-cyan-300' },
  { id: 'Humanities', name: 'Humanities (Gumanitar & Tillar)', color: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300' },
  { id: 'Sports', name: 'Sports & Sog‘lomlashtirish', color: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300' },
];

const PRESET_RATE_OPTIONS = [
  { hours: 20, rate: '1.0 stavka', label: '1.0 Stavka (20 soat/hafta)', desc: 'Standart to‘liq dars yuklamasi' },
  { hours: 30, rate: '1.5 stavka', label: '1.5 Stavka (30 soat/hafta)', desc: 'Maksimal ruxsat etilgan dars yuklamasi' },
  { hours: 25, rate: '1.25 stavka', label: '1.25 Stavka (25 soat/hafta)', desc: 'Kengaytirilgan dars yuklamasi' },
  { hours: 15, rate: '0.75 stavka', label: '0.75 Stavka (15 soat/hafta)', desc: 'Qisman yuklama' },
  { hours: 10, rate: '0.5 stavka', label: '0.5 Stavka (10 soat/hafta)', desc: 'O‘rindoshlik (yarim stavka)' },
];

const PRESET_ROOMS = [
  'Room 304 (Math Lab)',
  'Room 208 (Physics Lab)',
  'Lab 1 (CS & AI Center)',
  'Room 401 (Language Arts)',
  'Room 102 (Literature)',
  'Room 105 (Chemistry Lab)',
  'Room 201 (History & Social)',
  'Sport Hall / Arena',
  'Conference Hall (Main)',
];

export const AddTeacherWizardModal: React.FC<AddTeacherWizardModalProps> = ({
  isOpen,
  onClose,
  language,
  onAddTeacher,
  existingClassNames = ['7-A', '8-B', '9-A', '10-B'],
}) => {
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);

  // Form State
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('+998 ');
  const [avatar, setAvatar] = useState(PRESET_AVATARS[0]);
  const [qualification, setQualification] = useState('Oliy toifali o‘qituvchi');
  const [experienceYears, setExperienceYears] = useState(8);

  // Step 2: Position & Department
  const [position, setPosition] = useState('Oliy toifali fan o‘qituvchisi');
  const [department, setDepartment] = useState<'STEM' | 'Science' | 'Humanities' | 'Technology' | 'Sports'>('STEM');
  const [primarySubject, setPrimarySubject] = useState('Mathematics');
  const [additionalSubjects, setAdditionalSubjects] = useState<string[]>(['Algebra', 'Geometry']);
  const [homeroomClass, setHomeroomClass] = useState<string>('none');
  const [duties, setDuties] = useState<string[]>(['Metodbirlashma a’zosi']);

  // Step 3: Workload & Timetable parameters
  const [selectedRateHours, setSelectedRateHours] = useState(20);
  const [selectedRateName, setSelectedRateName] = useState('1.0 stavka');
  const [assignedClasses, setAssignedClasses] = useState<string[]>(['7-A', '8-B', '9-A']);
  const [maxHoursPerDay, setMaxHoursPerDay] = useState(4);
  const [preferredRoom, setPreferredRoom] = useState('Room 304 (Math Lab)');
  const [methodicalDay, setMethodicalDay] = useState<string>('Payshanba');

  // Step 4: Options
  const [syncToSchedule, setSyncToSchedule] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleNextStep = () => {
    if (currentStep === 1) {
      if (!name.trim()) {
        alert("Iltimos, o'qituvchining to'liq ism-familiyasini kiriting.");
        return;
      }
      if (!email.trim()) {
        // Auto-generate email if empty
        const cleanName = name.toLowerCase().replace(/[^a-z0-9]/g, '.');
        setEmail(`${cleanName}@edusphere.school`);
      }
    }
    if (currentStep < 4) {
      setCurrentStep((prev) => (prev + 1) as 1 | 2 | 3 | 4);
    }
  };

  const handlePrevStep = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => (prev - 1) as 1 | 2 | 3 | 4);
    }
  };

  const toggleClassAssignment = (cls: string) => {
    if (assignedClasses.includes(cls)) {
      if (assignedClasses.length === 1) return; // Keep at least one
      setAssignedClasses(assignedClasses.filter((c) => c !== cls));
    } else {
      setAssignedClasses([...assignedClasses, cls]);
    }
  };

  const handleFinalSubmit = () => {
    setIsSubmitting(true);

    const teacherId = `tch-${Date.now().toString().slice(-4)}`;
    const allSubjects = Array.from(new Set([primarySubject, ...additionalSubjects]));

    const newTeacherRecord: TeacherRecord = {
      id: teacherId,
      name,
      email: email || `${name.toLowerCase().replace(/[^a-z0-9]/g, '.')}@edusphere.school`,
      phone,
      avatar,
      position,
      qualification,
      department,
      rateType: `${selectedRateName} (${selectedRateHours} soat)`,
      homeroomClass: homeroomClass === 'none' ? undefined : homeroomClass,
      experienceYears,
      subject: allSubjects.join(' & '),
      subjects: allSubjects,
      classes: assignedClasses,
      assignedClasses,
      totalLessonsWeekly: selectedRateHours,
      aiPlansGenerated: 0,
      rating: 5.0,
      room: preferredRoom,
      status: 'active',
      joinedDate: new Date().toISOString().split('T')[0],
    };

    const newWorkload: TeacherWorkload = {
      teacherId,
      teacherName: name,
      avatar,
      subject: primarySubject,
      assignedClasses,
      targetHoursWeekly: selectedRateHours,
      allocatedHoursWeekly: selectedRateHours,
      maxHoursPerDay,
      preferredRoom,
      department,
      position,
      rateType: selectedRateName,
      homeroomClass: homeroomClass === 'none' ? undefined : homeroomClass,
    };

    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.6 },
    });

    setTimeout(() => {
      onAddTeacher(newTeacherRecord, newWorkload, syncToSchedule);
      setIsSubmitting(false);
      onClose();
    }, 400);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 backdrop-blur-xs sm:p-6 overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="relative flex w-full max-w-3xl flex-col max-h-[92vh] rounded-3xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900 overflow-hidden"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50/80 px-6 py-4 dark:border-slate-800 dark:bg-slate-800/40">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-xs dark:bg-indigo-500">
              <GraduationCap className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white sm:text-lg">
                Yangi O‘qituvchi Qo‘shish & Yuklama Biriktirish
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Lavozim berish, stavka soatlari va dars jadvaliga avtomat kiritish
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Step Progress Indicator */}
        <div className="grid grid-cols-4 border-b border-slate-200 bg-white px-6 py-3 dark:border-slate-800 dark:bg-slate-900">
          {[
            { step: 1, label: '1. Shaxsiy Ma’lumot', icon: User },
            { step: 2, label: '2. Lavozim & Kafedra', icon: Award },
            { step: 3, label: '3. Yuklama & Stavka', icon: Clock },
            { step: 4, label: '4. Tasdiqlash & Jadval', icon: CheckCircle2 },
          ].map((item) => {
            const isActive = currentStep === item.step;
            const isCompleted = currentStep > item.step;
            const Icon = item.icon;
            return (
              <button
                key={item.step}
                type="button"
                onClick={() => {
                  if (item.step < currentStep || name.trim()) {
                    setCurrentStep(item.step as 1 | 2 | 3 | 4);
                  }
                }}
                className={`flex items-center gap-2 border-b-2 pb-2 text-left transition-colors ${
                  isActive
                    ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400 font-bold'
                    : isCompleted
                    ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400 font-medium'
                    : 'border-transparent text-slate-400 dark:text-slate-500'
                }`}
              >
                <div
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${
                    isActive
                      ? 'bg-indigo-600 text-white dark:bg-indigo-500'
                      : isCompleted
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                      : 'bg-slate-100 text-slate-500 dark:bg-slate-800'
                  }`}
                >
                  {isCompleted ? <Check className="h-3.5 w-3.5" /> : item.step}
                </div>
                <span className="hidden text-xs sm:inline truncate">{item.label}</span>
              </button>
            );
          })}
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <AnimatePresence mode="wait">
            {/* STEP 1: Personal Info */}
            {currentStep === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                className="space-y-5"
              >
                <div className="rounded-2xl border border-indigo-100 bg-indigo-50/50 p-4 dark:border-indigo-950 dark:bg-indigo-950/20">
                  <h3 className="text-sm font-bold text-indigo-950 dark:text-indigo-200 flex items-center gap-2">
                    <User className="h-4 w-4 text-indigo-600" />
                    O‘qituvchining asosiy ma’lumotlari
                  </h3>
                  <p className="mt-1 text-xs text-indigo-700 dark:text-indigo-400">
                    O‘qituvchi tizimga kiritilishi bilan unga shaxsiy hisob, QR kod va dars jadvali tayyorlanadi.
                  </p>
                </div>

                {/* Avatar Selection */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
                    Profil Rasmi (Avatar)
                  </label>
                  <div className="flex flex-wrap items-center gap-3">
                    <img
                      src={avatar}
                      alt="Selected Avatar"
                      className="h-16 w-16 rounded-2xl object-cover ring-4 ring-indigo-500/20 shadow-md"
                    />
                    <div className="flex flex-wrap gap-2">
                      {PRESET_AVATARS.map((av, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setAvatar(av)}
                          className={`relative h-10 w-10 overflow-hidden rounded-xl border-2 transition-all ${
                            avatar === av
                              ? 'border-indigo-600 ring-2 ring-indigo-600/30 scale-105'
                              : 'border-transparent opacity-70 hover:opacity-100'
                          }`}
                        >
                          <img src={av} alt="Avatar option" className="h-full w-full object-cover" />
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {/* Full Name */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      F.I.Sh. (To‘liq ism) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Masalan: Dilnoza Karimova"
                      className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-900 focus:border-indigo-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                      autoFocus
                    />
                  </div>

                  {/* Phone */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Telefon Raqami
                    </label>
                    <div className="relative">
                      <Phone className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                      <input
                        type="text"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+998 90 123 45 67"
                        className="w-full rounded-xl border border-slate-300 bg-white pl-10 pr-3.5 py-2.5 text-sm font-medium text-slate-900 focus:border-indigo-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                      />
                    </div>
                  </div>

                  {/* Email */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Elektron Pochta (Email)
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="dilnoza.k@edusphere.school"
                        className="w-full rounded-xl border border-slate-300 bg-white pl-10 pr-3.5 py-2.5 text-sm font-medium text-slate-900 focus:border-indigo-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                      />
                    </div>
                  </div>

                  {/* Qualification */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Malaka Toifasi / Darajasi
                    </label>
                    <select
                      value={qualification}
                      onChange={(e) => setQualification(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-900 focus:border-indigo-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    >
                      {PRESET_QUALIFICATIONS.map((q) => (
                        <option key={q} value={q}>
                          {q}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Pedagogical Experience */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Pedagogik Ish Staji (Yillar)
                    </label>
                    <div className="flex items-center gap-3">
                      <input
                        type="range"
                        min="1"
                        max="35"
                        value={experienceYears}
                        onChange={(e) => setExperienceYears(Number(e.target.value))}
                        className="w-full accent-indigo-600"
                      />
                      <span className="shrink-0 rounded-lg bg-slate-100 px-3 py-1 text-sm font-bold text-slate-900 dark:bg-slate-800 dark:text-white">
                        {experienceYears} yil
                      </span>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* STEP 2: Position & Department */}
            {currentStep === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                className="space-y-5"
              >
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
                    O‘qituvchiga Berilayotgan Lavozim (Job Title / Position) <span className="text-rose-500">*</span>
                  </label>
                  <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                    {PRESET_POSITIONS.map((pos) => {
                      const isSelected = position === pos.label;
                      return (
                        <button
                          key={pos.id}
                          type="button"
                          onClick={() => setPosition(pos.label)}
                          className={`flex items-start gap-3 rounded-2xl border p-3.5 text-left transition-all ${
                            isSelected
                              ? 'border-indigo-600 bg-indigo-50/70 ring-2 ring-indigo-600/20 dark:border-indigo-500 dark:bg-indigo-950/40'
                              : 'border-slate-200 bg-white hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900'
                          }`}
                        >
                          <span className="text-2xl">{pos.icon}</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                              {pos.label}
                            </p>
                            <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2">
                              {pos.desc}
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {/* Department */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Kafedra / Yo‘nalish
                    </label>
                    <select
                      value={department}
                      onChange={(e) => setDepartment(e.target.value as any)}
                      className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-900 focus:border-indigo-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    >
                      {PRESET_DEPARTMENTS.map((dept) => (
                        <option key={dept.id} value={dept.id}>
                          {dept.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Primary Subject */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Asosiy Dars Beradigan Fani <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={primarySubject}
                      onChange={(e) => setPrimarySubject(e.target.value)}
                      placeholder="Masalan: Mathematics, Physics, Chemistry..."
                      className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-900 focus:border-indigo-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    />
                  </div>

                  {/* Homeroom Assignment */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Sinf Rahbarligi (Homeroom Class)
                    </label>
                    <select
                      value={homeroomClass}
                      onChange={(e) => setHomeroomClass(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-900 focus:border-indigo-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    >
                      <option value="none">Biriktirilmagan (Faqat fan o‘qituvchisi)</option>
                      {existingClassNames.map((cls) => (
                        <option key={cls} value={cls}>
                          🏫 {cls} sinf rahbari
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Additional subjects chips */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Qo‘shimcha Dars O‘tadigan Fanlari
                    </label>
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {['Algebra', 'Geometry', 'Physics', 'Informatika', 'Robototexnika', 'Kimyo', 'Biologiya', 'IELTS'].map(
                        (sub) => {
                          const isSel = additionalSubjects.includes(sub);
                          return (
                            <button
                              key={sub}
                              type="button"
                              onClick={() => {
                                if (isSel) {
                                  setAdditionalSubjects(additionalSubjects.filter((s) => s !== sub));
                                } else {
                                  setAdditionalSubjects([...additionalSubjects, sub]);
                                }
                              }}
                              className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-all ${
                                isSel
                                  ? 'bg-indigo-600 text-white dark:bg-indigo-500'
                                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
                              }`}
                            >
                              {sub}
                            </button>
                          );
                        }
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* STEP 3: Workload & Timetable Parameters */}
            {currentStep === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                className="space-y-5"
              >
                {/* Rate / Stavka Selector */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
                    Dars Yuklamasi & Haftalik Stavka Hajmi <span className="text-rose-500">*</span>
                  </label>
                  <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
                    {PRESET_RATE_OPTIONS.map((opt) => {
                      const isSel = selectedRateHours === opt.hours;
                      return (
                        <button
                          key={opt.hours}
                          type="button"
                          onClick={() => {
                            setSelectedRateHours(opt.hours);
                            setSelectedRateName(opt.rate);
                          }}
                          className={`flex flex-col justify-between rounded-2xl border p-3.5 text-left transition-all ${
                            isSel
                              ? 'border-indigo-600 bg-indigo-50/80 ring-2 ring-indigo-600/20 dark:border-indigo-500 dark:bg-indigo-950/50'
                              : 'border-slate-200 bg-white hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900'
                          }`}
                        >
                          <div>
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-slate-900 dark:text-white">
                                {opt.rate}
                              </span>
                              <span className="rounded-md bg-indigo-100 px-2 py-0.5 text-[11px] font-bold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                                {opt.hours} soat
                              </span>
                            </div>
                            <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                              {opt.desc}
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Assigned Classes Multi-Select */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Biriktirilgan Sinflar (Dars jadvalida o‘qitiladigan guruhlar) <span className="text-rose-500">*</span>
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {existingClassNames.map((cls) => {
                      const isAssigned = assignedClasses.includes(cls);
                      return (
                        <button
                          key={cls}
                          type="button"
                          onClick={() => toggleClassAssignment(cls)}
                          className={`flex items-center gap-1.5 rounded-xl border px-3.5 py-2 text-xs font-bold transition-all ${
                            isAssigned
                              ? 'border-indigo-600 bg-indigo-600 text-white shadow-xs'
                              : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-200'
                          }`}
                        >
                          {isAssigned && <Check className="h-3.5 w-3.5" />}
                          <span>{cls} sinfi</span>
                        </button>
                      );
                    })}
                  </div>
                  <p className="mt-1 text-[11px] text-slate-400">
                    Jadval tuzilganda ushbu sinflarning haftalik {primarySubject} darslari aynan shu o‘qituvchiga yuklanadi.
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {/* Preferred Room */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Asosiy Biriktirilgan Dars Xonasi (Kabinet)
                    </label>
                    <select
                      value={preferredRoom}
                      onChange={(e) => setPreferredRoom(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-900 focus:border-indigo-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    >
                      {PRESET_ROOMS.map((room) => (
                        <option key={room} value={room}>
                          🚪 {room}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Max Hours Per Day */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Kunlik Maksimal Dars Chegarasi (Para)
                    </label>
                    <div className="flex items-center gap-3">
                      <input
                        type="range"
                        min="2"
                        max="6"
                        value={maxHoursPerDay}
                        onChange={(e) => setMaxHoursPerDay(Number(e.target.value))}
                        className="w-full accent-indigo-600"
                      />
                      <span className="shrink-0 rounded-lg bg-slate-100 px-3 py-1 text-sm font-bold text-slate-900 dark:bg-slate-800 dark:text-white">
                        {maxHoursPerDay} para / kun
                      </span>
                    </div>
                  </div>

                  {/* Methodical Day */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Metodik Kun (O‘qituvchining darsdan xoli kuni)
                    </label>
                    <select
                      value={methodicalDay}
                      onChange={(e) => setMethodicalDay(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-900 focus:border-indigo-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    >
                      <option value="Dushanba">Dushanba</option>
                      <option value="Seshanba">Seshanba</option>
                      <option value="Chorshanba">Chorshanba</option>
                      <option value="Payshanba">Payshanba</option>
                      <option value="Juma">Juma</option>
                      <option value="Shanba">Shanba</option>
                      <option value="none">Belgilanmagan (Barcha kunlar teng)</option>
                    </select>
                  </div>
                </div>
              </motion.div>
            )}

            {/* STEP 4: Review, Contract & Auto-Sync */}
            {currentStep === 4 && (
              <motion.div
                key="step4"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                className="space-y-5"
              >
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4 dark:border-emerald-950 dark:bg-emerald-950/20">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                    <h3 className="text-sm font-bold text-emerald-950 dark:text-emerald-200">
                      O‘qituvchi ma’lumotlari & dars stavkasi tayyor
                    </h3>
                  </div>
                  <p className="mt-1 text-xs text-emerald-700 dark:text-emerald-300">
                    Barcha parametrlarni ko‘rib chiqing. Tasdiqlashingiz bilan o‘qituvchiga shaxsiy profil yaratiladi.
                  </p>
                </div>

                {/* Teacher Summary Card */}
                <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                    <img
                      src={avatar}
                      alt={name}
                      className="h-16 w-16 rounded-2xl object-cover ring-4 ring-indigo-500/10 shadow-md"
                    />
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="text-base font-bold text-slate-900 dark:text-white">{name}</h4>
                        <span className="rounded-full bg-indigo-100 px-2.5 py-0.5 text-[11px] font-bold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                          {position}
                        </span>
                      </div>
                      <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-0.5">
                        {qualification} • {department} kafedrasi • {experienceYears} yil staj
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5">{email} • {phone}</p>
                    </div>
                  </div>

                  {/* Summary Grid */}
                  <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4 border-t border-slate-100 pt-4 dark:border-slate-800 text-xs">
                    <div className="rounded-xl bg-slate-50 p-2.5 dark:bg-slate-800/60">
                      <span className="text-slate-400 text-[10px] uppercase font-bold">Haftalik Stavka</span>
                      <p className="font-bold text-indigo-600 dark:text-indigo-400 mt-0.5">
                        {selectedRateName} ({selectedRateHours} soat)
                      </p>
                    </div>
                    <div className="rounded-xl bg-slate-50 p-2.5 dark:bg-slate-800/60">
                      <span className="text-slate-400 text-[10px] uppercase font-bold">Asosiy Fan</span>
                      <p className="font-bold text-slate-900 dark:text-white mt-0.5">
                        {primarySubject}
                      </p>
                    </div>
                    <div className="rounded-xl bg-slate-50 p-2.5 dark:bg-slate-800/60">
                      <span className="text-slate-400 text-[10px] uppercase font-bold">Sinflar</span>
                      <p className="font-bold text-slate-900 dark:text-white mt-0.5">
                        {assignedClasses.join(', ')}
                      </p>
                    </div>
                    <div className="rounded-xl bg-slate-50 p-2.5 dark:bg-slate-800/60">
                      <span className="text-slate-400 text-[10px] uppercase font-bold">Dars Xonasi</span>
                      <p className="font-bold text-slate-900 dark:text-white mt-0.5 truncate">
                        {preferredRoom}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Auto Schedule Sync Checkbox */}
                <div className="rounded-2xl border border-indigo-200 bg-indigo-50/40 p-4 dark:border-indigo-900 dark:bg-indigo-950/30">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={syncToSchedule}
                      onChange={(e) => setSyncToSchedule(e.target.checked)}
                      className="mt-0.5 h-4 w-4 rounded text-indigo-600 focus:ring-indigo-500"
                    />
                    <div>
                      <span className="text-xs font-bold text-slate-900 dark:text-white">
                        Dars jadvalini ushbu o‘qituvchi bilan avtomat qayta hisoblab tuzish (0 Collision)
                      </span>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        AI Scheduler yangi o‘qituvchining {selectedRateHours} soatlik stavkasini sinflar jadvaliga to‘qnashuvsiz avtomatik joylashtiradi va barchaga e’lon qiladi.
                      </p>
                    </div>
                  </label>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Modal Footer Controls */}
        <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50/80 px-6 py-4 dark:border-slate-800 dark:bg-slate-800/40">
          <button
            type="button"
            onClick={currentStep === 1 ? onClose : handlePrevStep}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
          >
            {currentStep === 1 ? 'Bekor qilish' : (
              <>
                <ChevronLeft className="h-4 w-4" />
                <span>Orqaga</span>
              </>
            )}
          </button>

          <div className="flex items-center gap-2">
            {currentStep < 4 ? (
              <button
                type="button"
                onClick={handleNextStep}
                className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-indigo-700 dark:bg-indigo-500"
              >
                <span>Keyingi bosqich</span>
                <ChevronRight className="h-4 w-4" />
              </button>
            ) : (
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleFinalSubmit}
                className="flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-2.5 text-xs font-bold text-white shadow-md hover:bg-emerald-700 dark:bg-emerald-500 disabled:opacity-50"
              >
                <Check className="h-4 w-4" />
                <span>{isSubmitting ? 'Qo‘shilmoqda...' : 'O‘qituvchini Saqlash & Tizimga Qo‘shish'}</span>
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
};
