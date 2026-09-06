import React, { useState } from 'react';
import { X, UserPlus, Sparkles, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { AppLanguage, StudentRecord } from '../../types';
import { useI18n } from '../../lib/i18n';
import { createSchoolData } from '../../lib/schoolRepository';
import { validateKyrgyzIIN } from '../../lib/kyrgyzstanEdu';

interface AddStudentModalProps {
  language: AppLanguage;
  isOpen: boolean;
  onClose: () => void;
  onStudentAdded: (student: StudentRecord) => void;
}

export const AddStudentModal: React.FC<AddStudentModalProps> = ({
  language,
  isOpen,
  onClose,
  onStudentAdded,
}) => {
  const t = useI18n(language);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [studentId, setStudentId] = useState(`stu-${Math.floor(100 + Math.random() * 900)}`);
  const [iin, setIin] = useState('');
  const [iinFeedback, setIinFeedback] = useState<{ isValid: boolean; message?: string } | null>(null);
  const [grade, setGrade] = useState('7-A');
  const [educationLanguage, setEducationLanguage] = useState<'ky' | 'ru' | 'uz'>('ky');
  const [email, setEmail] = useState('');
  const [parentName, setParentName] = useState('');
  const [parentPhone, setParentPhone] = useState('+996 555 ');
  const [gender, setGender] = useState<'male' | 'female'>('male');
  const [dateOfBirth, setDateOfBirth] = useState('2012-05-15');
  const [address, setAddress] = useState('Бишкек ш., Свердлов району');

  const handleIinChange = (val: string) => {
    const clean = val.replace(/\D/g, '').slice(0, 14);
    setIin(clean);
    if (clean.length === 14) {
      const res = validateKyrgyzIIN(clean);
      if (res.isValid && res.metadata) {
        setIinFeedback({ isValid: true, message: `Жарактуу ИИН · ${res.metadata.gender === 'male' ? 'Эркек' : 'Аял'} · ${res.metadata.birthDate}` });
        setGender(res.metadata.gender);
        setDateOfBirth(res.metadata.birthDate);
      } else {
        setIinFeedback({ isValid: false, message: res.error || 'ИИН контролдук суммасы туура эмес' });
      }
    } else if (clean.length > 0) {
      setIinFeedback({ isValid: false, message: `${clean.length}/14 цифра` });
    } else {
      setIinFeedback(null);
    }
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMsg(language === 'uz' ? 'O‘quvchi ism-familiyasini kiriting' : 'Please enter student name');
      return;
    }
    if (!studentId.trim()) {
      setErrorMsg(language === 'uz' ? 'ID raqamni kiriting' : 'Please enter student ID');
      return;
    }

    if (iin.trim()) {
      const v = validateKyrgyzIIN(iin.trim());
      if (!v.isValid) {
        setErrorMsg(`ИИН ката: ${v.error || '14 сандуу туура ИИН киргизиңиз'}`);
        return;
      }
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    const now = new Date();
    const bDate = new Date(dateOfBirth);
    const calculatedAge = Math.max(6, now.getFullYear() - bDate.getFullYear());

    const newStudent: StudentRecord = {
      id: studentId.trim(),
      studentId: studentId.trim(),
      name: name.trim(),
      grade,
      iin: iin.trim() || undefined,
      educationLanguage,
      language: educationLanguage,
      dateOfBirth,
      birthDate: dateOfBirth,
      age: calculatedAge,
      email: email.trim() || `${studentId.toLowerCase()}@edusphere.kg`,
      parentName: parentName.trim() || 'Ата-энеси',
      parentPhone: parentPhone.trim() || '+996 555 00-00-00',
      avatar: `https://images.unsplash.com/photo-${gender === 'male' ? '1539571696357-5a69c17a67c6' : '1534528741775-53994a69daeb'}?w=150&auto=format&fit=crop&q=80`,
      attendanceRate: 98,
      avgGrade: 88,
      homeworkCompletionRate: 95,
      xp: 450,
      level: 2,
      streakDays: 5,
      riskStatus: 'safe',
      strengths: ['Математика', 'Кыргыз тили'],
      weaknesses: ['Биология'],
      badges: ['Жаңы окуучу', 'Активдүү'],
      gender,
      address,
      status: 'active',
      schoolId: 'school-71-bishkek',
      version: 1,
    };

    try {
      const created = await createSchoolData<StudentRecord>('students', newStudent);
      onStudentAdded(created || newStudent);
      onClose();
    } catch (err: any) {
      // If offline or conflict fallback gracefully
      onStudentAdded(newStudent);
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs animate-fadeIn">
      <div className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-xs">
              <UserPlus className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                {language === 'uz' ? 'Yangi O‘quvchi Qo‘shish' : 'Жаңы окуучу кошуу (Add Student)'}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {language === 'uz' ? 'Elektron jurnal va bazaga rasmiy kiritish' : 'МОН КР реестри жана электрондук журнал'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {errorMsg && (
          <div className="mt-4 flex items-center gap-2 rounded-xl bg-red-50 p-3 text-xs text-red-700 dark:bg-red-950/40 dark:text-red-300">
            <AlertCircle className="h-4 w-4 shrink-0 text-red-500" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-3.5 max-h-[70vh] overflow-y-auto pr-1">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              {language === 'uz' ? 'Ism va Familiya *' : 'Аты-жөнү (Full Name) *'}
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Азамат Садыков"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs text-slate-900 focus:border-indigo-500 focus:bg-white focus:outline-hidden dark:border-slate-800 dark:bg-slate-800 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              14-орундуу ИИН (КР Мамлекеттик PIN)
            </label>
            <input
              type="text"
              maxLength={14}
              value={iin}
              onChange={(e) => handleIinChange(e.target.value)}
              placeholder="мис: 41405200801239"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs font-mono tracking-wider text-slate-900 focus:border-indigo-500 focus:bg-white focus:outline-hidden dark:border-slate-800 dark:bg-slate-800 dark:text-white"
            />
            {iinFeedback && (
              <p className={`mt-1 text-[11px] font-medium ${iinFeedback.isValid ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
                {iinFeedback.message}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {language === 'uz' ? 'O‘quvchi ID *' : 'Окуучу ID *'}
              </label>
              <input
                type="text"
                required
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
                placeholder="stu-09"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs text-slate-900 focus:border-indigo-500 focus:bg-white focus:outline-hidden dark:border-slate-800 dark:bg-slate-800 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {language === 'uz' ? 'Sinf *' : 'Класс *'}
              </label>
              <select
                value={grade}
                onChange={(e) => setGrade(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs font-medium text-slate-900 focus:border-indigo-500 focus:outline-hidden dark:border-slate-800 dark:bg-slate-800 dark:text-white"
              >
                <option value="7-A">7-A</option>
                <option value="8-B">8-B</option>
                <option value="9-A">9-A</option>
                <option value="10-B">10-B</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Окутуу тили (Language of Instruction)
            </label>
            <select
              value={educationLanguage}
              onChange={(e) => setEducationLanguage(e.target.value as any)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs font-medium text-slate-900 focus:border-indigo-500 focus:outline-hidden dark:border-slate-800 dark:bg-slate-800 dark:text-white"
            >
              <option value="ky">Кыргыз тили (Kyrgyz)</option>
              <option value="ru">Орус тили (Русский)</option>
              <option value="uz">Өзбек тили (O‘zbekcha)</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {language === 'uz' ? 'Ota-ona Ismi' : 'Parent Name'}
              </label>
              <input
                type="text"
                value={parentName}
                onChange={(e) => setParentName(e.target.value)}
                placeholder="Rustam Alimov"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs text-slate-900 focus:border-indigo-500 focus:bg-white focus:outline-hidden dark:border-slate-800 dark:bg-slate-800 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {language === 'uz' ? 'Telefon raqam' : 'Phone'}
              </label>
              <input
                type="text"
                value={parentPhone}
                onChange={(e) => setParentPhone(e.target.value)}
                placeholder="+998 90 123-45-67"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs text-slate-900 focus:border-indigo-500 focus:bg-white focus:outline-hidden dark:border-slate-800 dark:bg-slate-800 dark:text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {language === 'uz' ? 'Jinsi' : 'Gender'}
              </label>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value as any)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs font-medium text-slate-900 dark:border-slate-800 dark:bg-slate-800 dark:text-white"
              >
                <option value="male">{language === 'uz' ? 'O‘g‘il bola' : 'Male'}</option>
                <option value="female">{language === 'uz' ? 'Qiz bola' : 'Female'}</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {language === 'uz' ? 'Tug‘ilgan sana' : 'Date of Birth'}
              </label>
              <input
                type="date"
                value={dateOfBirth}
                onChange={(e) => setDateOfBirth(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs text-slate-900 dark:border-slate-800 dark:bg-slate-800 dark:text-white"
              />
            </div>
          </div>

          <div className="mt-5 flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              {language === 'uz' ? 'Bekor qilish' : 'Cancel'}
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-indigo-700 disabled:opacity-50"
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle2 className="h-4 w-4" />
              )}
              <span>{language === 'uz' ? 'Saqlash va Ro‘yxatga olish' : 'Save & Register'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

