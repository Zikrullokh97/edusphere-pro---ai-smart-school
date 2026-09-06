import React, { useState, useEffect, useMemo } from 'react';
import {
  Users,
  Search,
  Plus,
  Phone,
  Mail,
  GraduationCap,
  HeartHandshake,
  CheckCircle2,
  AlertTriangle,
  Download,
  RefreshCw,
  Send,
  Trash2,
  UserPlus,
  X,
  Bell,
  Check,
} from 'lucide-react';
import { authenticatedFetch } from '../../lib/api';
import { listSchoolData } from '../../lib/schoolRepository';
import type { ParentRecord, StudentRecord } from '../../types';

export const ParentsDirectory: React.FC = () => {
  const [parents, setParents] = useState<ParentRecord[]>([
    {
      id: 'par-001',
      name: 'Nurdinov Alisher',
      phone: '+998 90 123 45 67',
      email: 'parent@edusphere.school',
      relationship: 'father',
      childrenIds: ['stu-0001', 'stu-0042'],
      childrenNames: ['Karimov Ali (7-A)', 'Karimova Madina (5-B)'],
      address: 'Toshkent sh., Yunusobod tumani',
      status: 'active',
      createdAt: '2026-08-30',
      updatedAt: '2026-08-30',
    },
    {
      id: 'par-002',
      name: 'Yo‘ldosheva Dilnoza',
      phone: '+998 93 987 65 43',
      email: 'dilnoza.y@mail.uz',
      relationship: 'mother',
      childrenIds: ['stu-0014'],
      childrenNames: ['Yo‘ldoshev Bobur (8-A)'],
      address: 'Toshkent sh., Chilonzor tumani',
      status: 'active',
      createdAt: '2026-08-28',
      updatedAt: '2026-08-28',
    },
  ]);

  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('+998 ');
  const [newEmail, setNewEmail] = useState('');
  const [newRelationship, setNewRelationship] = useState<'father' | 'mother' | 'guardian'>('father');

  // Linking modal state
  const [linkingParent, setLinkingParent] = useState<ParentRecord | null>(null);
  const [selectedStudentIdToLink, setSelectedStudentIdToLink] = useState('');
  const [studentSearchQuery, setStudentSearchQuery] = useState('');
  const [feedbackToast, setFeedbackToast] = useState<string | null>(null);

  const fetchParents = async () => {
    setLoading(true);
    try {
      const [res, studentList] = await Promise.all([
        authenticatedFetch('/api/parents'),
        listSchoolData<StudentRecord>('students').catch(() => []),
      ]);
      const data = await res.json();
      if (data.success && Array.isArray(data.items) && data.items.length > 0) {
        setParents(data.items);
      }
      if (studentList && studentList.length > 0) {
        setStudents(studentList);
      }
    } catch {
      // Baseline
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchParents();
  }, []);

  const filteredParents = useMemo(() => {
    return parents.filter((p) => {
      const q = search.toLowerCase().trim();
      return (
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.phone.toLowerCase().includes(q) ||
        (p.childrenNames && p.childrenNames.some((c) => c.toLowerCase().includes(q)))
      );
    });
  }, [parents, search]);

  const handleAddParent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName || !newPhone) return;

    try {
      const res = await authenticatedFetch('/api/parents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newName,
          phone: newPhone,
          email: newEmail || undefined,
          relationship: newRelationship,
          childrenIds: [],
        }),
      });
      const data = await res.json();
      if (data.success) {
        setParents((prev) => [data.item, ...prev]);
        setIsAddOpen(false);
        setNewName('');
        setNewPhone('+998 ');
        setNewEmail('');
        setFeedbackToast('✓ Yangi ota-ona muvaffaqiyatli qo‘shildi!');
        setTimeout(() => setFeedbackToast(null), 3500);
      }
    } catch (err) {
      console.error('Ota-onani qo‘shishda xatolik:', err);
    }
  };

  const handleLinkStudentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!linkingParent || !selectedStudentIdToLink) return;
    const targetStudent = students.find((s) => s.id === selectedStudentIdToLink);
    if (!targetStudent) return;

    const childLabel = `${targetStudent.name} (${targetStudent.grade})`;
    const updatedChildrenIds = Array.from(new Set([...(linkingParent.childrenIds || []), targetStudent.id]));
    const updatedChildrenNames = Array.from(new Set([...(linkingParent.childrenNames || []), childLabel]));

    const updatedParent: ParentRecord = {
      ...linkingParent,
      childrenIds: updatedChildrenIds,
      childrenNames: updatedChildrenNames,
      updatedAt: new Date().toISOString(),
    };

    setParents((prev) => prev.map((p) => (p.id === updatedParent.id ? updatedParent : p)));
    setLinkingParent(null);
    setSelectedStudentIdToLink('');
    setFeedbackToast(`✓ ${targetStudent.name} ${linkingParent.name} ga biriktirildi!`);
    setTimeout(() => setFeedbackToast(null), 3500);

    try {
      await authenticatedFetch(`/api/parents/${linkingParent.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ childrenIds: updatedChildrenIds, childrenNames: updatedChildrenNames }),
      });
    } catch {}
  };

  const handleToggleTelegram = (parent: ParentRecord) => {
    const nextTelegram = !(parent as any).telegramAlerts;
    const updated = { ...parent, telegramAlerts: nextTelegram };
    setParents((prev) => prev.map((p) => (p.id === parent.id ? updated : p)));
    setFeedbackToast(`✓ ${parent.name} uchun Telegram bildirishnomalari ${nextTelegram ? 'yoqildi' : 'o‘chirildi'}`);
    setTimeout(() => setFeedbackToast(null), 3000);
  };

  const handleDeleteParent = (parent: ParentRecord) => {
    if (!window.confirm(`Haqiqatan ham ${parent.name} ota-ona profilini o‘chirmoqchimisiz?`)) return;
    setParents((prev) => prev.filter((p) => p.id !== parent.id));
    setFeedbackToast(`✓ ${parent.name} o‘chirildi`);
    setTimeout(() => setFeedbackToast(null), 3000);
  };

  const handleExportCSV = () => {
    const headers = ['ID', 'F.I.SH', 'Qarindoshlik', 'Telefon', 'Email', 'Farzandlari'];
    const rows = filteredParents.map((p) => [
      p.id,
      p.name,
      p.relationship === 'father' ? 'Otasi' : p.relationship === 'mother' ? 'Onasi' : 'Vasiysi',
      p.phone,
      p.email || '',
      (p.childrenNames || []).join('; '),
    ]);
    const csvContent = [headers.join(','), ...rows.map((r) => r.map((c) => `"${c || ''}"`).join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `edusphere_parents_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 font-sans pb-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center gap-3.5">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-600/30">
            <HeartHandshake className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                Ota-onalar & Vasiylar Boshqaruvi
              </h1>
              <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-[11px] font-bold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                Jami: {parents.length} nafar
              </span>
            </div>
            <p className="text-xs text-slate-400 font-semibold mt-0.5">
              O‘quvchilarning ota-onalari, bog‘langan farzandlar va rasmiy aloqa rekvizitlari
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 shadow-2xs"
          >
            <Download className="h-4 w-4 text-slate-500" />
            <span>Eksport (CSV)</span>
          </button>

          <button
            type="button"
            onClick={() => setIsAddOpen(true)}
            className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-indigo-600/30 hover:bg-indigo-700 cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>+ Yangi Ota-ona Qo‘shish</span>
          </button>
        </div>
      </div>

      {/* Feedback Toast */}
      {feedbackToast && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-bold text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{feedbackToast}</span>
        </div>
      )}

      {/* Search Bar */}
      <div className="relative rounded-2xl border border-slate-200/80 bg-white p-3 shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <Search className="absolute left-6 top-5.5 h-4 w-4 text-slate-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Ota-ona ismi, telefon raqami yoki farzandi bo‘yicha qidirish..."
          className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-11 pr-4 py-2.5 text-xs text-slate-900 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-white"
        />
      </div>

      {/* Parents Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredParents.map((parent) => {
          const isTelegramOn = (parent as any).telegramAlerts !== false;
          return (
            <div
              key={parent.id}
              className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-3 flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="rounded-md bg-indigo-50 dark:bg-indigo-950 px-2 py-0.5 text-[10px] font-bold text-indigo-700 dark:text-indigo-300 uppercase">
                      {parent.relationship === 'father' ? 'Otasi' : parent.relationship === 'mother' ? 'Onasi' : 'Vasiysi'}
                    </span>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white mt-1">
                      {parent.name}
                    </h3>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleToggleTelegram(parent)}
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold transition-colors ${
                        isTelegramOn
                          ? 'bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300'
                          : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                      }`}
                      title="Telegram bildirishnomalar holati"
                    >
                      <Send className="h-3 w-3" />
                      <span>{isTelegramOn ? 'Telegram Yoqilgan' : 'Telegram O‘chiq'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDeleteParent(parent)}
                      className="rounded-xl p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/50"
                      title="O‘chirish"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
                  <div className="flex items-center gap-2">
                    <Phone className="h-3.5 w-3.5 text-slate-400" />
                    <span className="font-mono font-semibold">{parent.phone}</span>
                  </div>
                  {parent.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="h-3.5 w-3.5 text-slate-400" />
                      <span>{parent.email}</span>
                    </div>
                  )}
                </div>

                <div className="border-t border-slate-100 dark:border-slate-800 pt-3">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                      Bog‘langan Farzandlari:
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setLinkingParent(parent);
                        setSelectedStudentIdToLink(students[0]?.id || '');
                      }}
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400"
                    >
                      <UserPlus className="h-3 w-3" />
                      <span>+ Farzand biriktirish</span>
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {parent.childrenNames && parent.childrenNames.length > 0 ? (
                      parent.childrenNames.map((child, i) => (
                        <span
                          key={i}
                          className="rounded-xl bg-slate-100 dark:bg-slate-800 px-2.5 py-1 text-xs font-bold text-slate-800 dark:text-slate-200"
                        >
                          🎓 {child}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-slate-400">Farzand biriktirilmagan</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Link Student Modal */}
      {linkingParent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-white">
                  <HeartHandshake className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">Farzandni Biriktirish</h3>
                  <p className="text-[11px] text-slate-400 font-semibold">{linkingParent.name} uchun</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setLinkingParent(null)}
                className="rounded-xl p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleLinkStudentSubmit} className="mt-4 space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  O‘quvchini tanlang (Ismi yoki sinfi bo‘yicha):
                </label>
                <input
                  type="text"
                  placeholder="O‘quvchini qidirish..."
                  value={studentSearchQuery}
                  onChange={(e) => setStudentSearchQuery(e.target.value)}
                  className="w-full mb-2 rounded-xl border border-slate-200 bg-slate-50 p-2 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />

                <select
                  value={selectedStudentIdToLink}
                  onChange={(e) => setSelectedStudentIdToLink(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 font-bold text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                >
                  {students
                    .filter((s) => !studentSearchQuery || s.name.toLowerCase().includes(studentSearchQuery.toLowerCase()) || s.grade.includes(studentSearchQuery))
                    .map((st) => (
                      <option key={st.id} value={st.id}>
                        {st.name} — {st.grade} sinfi (ID: {st.studentId || st.id})
                      </option>
                    ))}
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setLinkingParent(null)}
                  className="rounded-xl border border-slate-200 px-4 py-2 font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300"
                >
                  Bekor qilish
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-indigo-600 px-5 py-2 font-bold text-white shadow-lg shadow-indigo-600/30 hover:bg-indigo-700"
                >
                  Farzandni Bog‘lash
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Modal */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900 animate-in zoom-in-95">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-3">
              Yangi Ota-ona / Vasiy Qo‘shish
            </h2>

            <form onSubmit={handleAddParent} className="mt-4 space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">F.I.SH:</label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Masalan: Karimov Alisher"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Telefon Raqami:</label>
                <input
                  type="text"
                  required
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs text-slate-900 font-mono dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Email (Ixtiyoriy):</label>
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="parent@mail.uz"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Qarindoshlik:</label>
                <select
                  value={newRelationship}
                  onChange={(e) => setNewRelationship(e.target.value as any)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs font-semibold text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                >
                  <option value="father">Otasi (Father)</option>
                  <option value="mother">Onasi (Mother)</option>
                  <option value="guardian">Vasiysi (Guardian)</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300"
                >
                  Bekor qilish
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-indigo-600 px-5 py-2 text-xs font-bold text-white shadow-lg shadow-indigo-600/30 hover:bg-indigo-700"
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

