import React, { useState, useEffect } from 'react';
import { X, Save, Trash2, GraduationCap, Clock, Building, User, Mail, Phone, BookOpen, AlertCircle, Award, CheckCircle2 } from 'lucide-react';
import { TeacherRecord, ClassGroup } from '../../types';
import { updateSchoolData, archiveSchoolData, updateTeacherWorkload, listSchoolData } from '../../lib/schoolRepository';

interface Props {
  teacher: TeacherRecord;
  onClose: () => void;
  onSaved: (teacher: TeacherRecord) => void;
}

const POSITIONS = [
  "Bosh o'qituvchi",
  "Yetakchi o'qituvchi",
  "Katta o'qituvchi",
  "Oliy toifali o'qituvchi",
  "Metodist (Kafedra mudiri)",
  "Zauch (O'quv ishlari bo'yicha direktor o'rinbosari)",
  "To'garak rahbari",
  "Mutaxassis o'qituvchi",
  "Amaliyotchi o'qituvchi",
];

export const TeacherEditModal: React.FC<Props> = ({ teacher, onClose, onSaved }) => {
  const [value, setValue] = useState<TeacherRecord>(teacher);
  const [classes, setClasses] = useState<ClassGroup[]>([]);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listSchoolData<ClassGroup>('classes').then((res) => {
      if (res && res.length > 0) setClasses(res);
    }).catch(() => undefined);
  }, []);

  const update = (field: keyof TeacherRecord, next: any) => {
    setValue((current) => ({ ...current, [field]: next }));
  };

  const calculateStavka = (hours: number): string => {
    if (hours <= 0) return '0 stavka';
    const stavka = (hours / 18).toFixed(2);
    return `${stavka} stavka (${hours} soat)`;
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!value.name.trim() || !value.email.trim()) {
      setError('F.I.Sh va elektron pochta kiritilishi shart.');
      return;
    }
    setSaving(true);
    setError(null);

    const hours = value.totalLessonsWeekly || value.workloadHours || 18;
    const computedRate = value.rateType || calculateStavka(hours);
    const payload: TeacherRecord = {
      ...value,
      totalLessonsWeekly: hours,
      workloadHours: hours,
      rateType: computedRate,
    };

    try {
      let saved: TeacherRecord;
      try {
        saved = await updateTeacherWorkload(value.id, payload);
      } catch {
        saved = await updateSchoolData('teachers', payload);
      }
      onSaved(saved || payload);
      onClose();
    } catch {
      setError('O‘qituvchi ma’lumotlarini saqlashda xatolik yuz berdi.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(`Haqiqatan ham ${value.name} o‘qituvchi profilini o‘chirmoqchimisiz?`)) return;
    setDeleting(true);
    try {
      await archiveSchoolData('teachers', value.id);
      onSaved({ ...value, status: 'inactive' });
      onClose();
    } catch {
      setError('O‘qituvchini o‘chirishda xatolik.');
    } finally {
      setDeleting(false);
    }
  };

  const weeklyHours = value.totalLessonsWeekly || value.workloadHours || 18;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-3 sm:p-6 backdrop-blur-xs">
      <form onSubmit={submit} className="max-h-[94vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800 animate-in zoom-in-95">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-md shadow-indigo-600/30">
              <GraduationCap className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">O‘qituvchi Profilini Tahrirlash</h2>
              <p className="text-xs text-slate-400">Lavozim, haftalik yuklama stavkasi va sinf rahbarligi</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {error && (
          <div role="alert" className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 p-3 text-xs font-bold text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/50 dark:text-rose-300 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="mt-5 space-y-4 text-xs">
          {/* Section 1: Basic Info */}
          <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-800/40 space-y-3">
            <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <User className="h-3.5 w-3.5 text-indigo-600" />
              <span>Shaxsiy Ma’lumotlar</span>
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300">F.I.SH (To‘liq ism) *</label>
                <input
                  required
                  value={value.name || ''}
                  onChange={(e) => update('name', e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300">Elektron Pochta *</label>
                <input
                  type="email"
                  required
                  value={value.email || ''}
                  onChange={(e) => update('email', e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300">Telefon Raqami</label>
                <input
                  value={value.phone || ''}
                  onChange={(e) => update('phone', e.target.value)}
                  placeholder="+998 90 123 45 67"
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-mono text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300">Xodim ID / Tabel raqami</label>
                <input
                  value={value.employeeId || ''}
                  onChange={(e) => update('employeeId', e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-mono text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Position, Workload & Homeroom Class */}
          <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-800/40 space-y-3">
            <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Award className="h-3.5 w-3.5 text-indigo-600" />
              <span>Lavozim, Haftalik Yuklama (Stavka) & Sinf Rahbarligi</span>
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300">Pedagogik Lavozimi</label>
                <select
                  value={value.position || "O'qituvchi"}
                  onChange={(e) => update('position', e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                >
                  {POSITIONS.map((pos) => (
                    <option key={pos} value={pos}>{pos}</option>
                  ))}
                  <option value="Fan o'qituvchisi">Fan o'qituvchisi</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300">Kafedra</label>
                <select
                  value={value.department || 'Aniq fanlar'}
                  onChange={(e) => update('department', e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                >
                  <option value="Aniq fanlar">Aniq fanlar (STEM)</option>
                  <option value="Tabiiy fanlar">Tabiiy fanlar</option>
                  <option value="Tillar">Tillar va Adabiyot</option>
                  <option value="Gumanitar">Gumanitar fanlar</option>
                  <option value="San'at va sport">San'at va sport</option>
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-700 dark:text-slate-300">Haftalik Dars Yuklamasi (Soat)</label>
                  <span className="rounded-md bg-indigo-100 px-1.5 py-0.5 text-[10px] font-bold text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300">
                    {calculateStavka(weeklyHours)}
                  </span>
                </div>
                <input
                  type="number"
                  min={1}
                  max={40}
                  value={weeklyHours}
                  onChange={(e) => {
                    const h = parseInt(e.target.value, 10) || 18;
                    update('totalLessonsWeekly', h);
                    update('workloadHours', h);
                    update('rateType', calculateStavka(h));
                  }}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-900 font-mono dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300">Biriktirilgan Xona</label>
                <input
                  value={value.room || 'Xona-101'}
                  onChange={(e) => update('room', e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 font-mono dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300">Sinf Rahbarligi</label>
                <select
                  value={value.homeroomClass || 'none'}
                  onChange={(e) => update('homeroomClass', e.target.value === 'none' ? null : e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                >
                  <option value="none">Sinf rahbari emas</option>
                  {classes.length > 0 ? (
                    classes.map((c) => (
                      <option key={c.id || c.name} value={c.name}>
                        {c.name} sinfi {c.homeroomTeacher && c.homeroomTeacher !== value.name ? `(hozir: ${c.homeroomTeacher})` : ''}
                      </option>
                    ))
                  ) : (
                    <>
                      <option value="5-A">5-A sinfi</option>
                      <option value="5-B">5-B sinfi</option>
                      <option value="6-A">6-A sinfi</option>
                      <option value="7-A">7-A sinfi</option>
                      <option value="8-B">8-B sinfi</option>
                      <option value="9-A">9-A sinfi</option>
                      <option value="10-A">10-A sinfi</option>
                      <option value="11-A">11-A sinfi</option>
                    </>
                  )}
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300">Asosiy Mutaxassislik Fani</label>
                <input
                  value={value.subject || (value.subjects && value.subjects[0]) || ''}
                  onChange={(e) => {
                    update('subject', e.target.value);
                    if (!value.subjects?.includes(e.target.value)) {
                      update('subjects', [e.target.value, ...(value.subjects || [])]);
                    }
                  }}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-4 dark:border-slate-800">
          <button
            type="button"
            disabled={deleting}
            onClick={handleDelete}
            className="flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-xs font-bold text-rose-600 hover:bg-rose-100 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-400"
          >
            <Trash2 className="h-4 w-4" />
            <span>{deleting ? 'O‘chirilmoqda...' : 'O‘qituvchini o‘chirish'}</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300"
            >
              Bekor qilish
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-5 py-2 text-xs font-bold text-white shadow-lg shadow-indigo-600/30 hover:bg-indigo-700 disabled:opacity-60"
            >
              <Save className="h-4 w-4" />
              <span>{saving ? 'Saqlanmoqda...' : 'O‘zgarishlarni Saqlash'}</span>
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};
