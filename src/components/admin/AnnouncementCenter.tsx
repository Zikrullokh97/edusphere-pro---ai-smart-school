import React, { useState, useEffect } from 'react';
import {
  Bell,
  Send,
  Plus,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Users,
  GraduationCap,
  Sparkles,
  Calendar,
  Layers,
} from 'lucide-react';
import { authenticatedFetch } from '../../lib/api';
import type { AnnouncementItem } from '../../types';

export const AnnouncementCenter: React.FC = () => {
  const [announcements, setAnnouncements] = useState<AnnouncementItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [priority, setPriority] = useState<'LOW' | 'NORMAL' | 'HIGH' | 'URGENT'>('NORMAL');
  const [audience, setAudience] = useState<'ALL' | 'TEACHERS' | 'STUDENTS' | 'PARENTS' | 'CLASS'>('ALL');
  const [targetClass, setTargetClass] = useState('');

  const fetchAnnouncements = async () => {
    setLoading(true);
    try {
      const res = await authenticatedFetch('/api/admin/announcements');
      const data = await res.json();
      if (data.success && Array.isArray(data.items)) {
        setAnnouncements(data.items);
      }
    } catch (err) {
      console.error('E\'lonlarni yuklashda xatolik:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const handleCreateAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !message.trim()) return;

    setIsSubmitting(true);
    try {
      const res = await authenticatedFetch('/api/admin/announcements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          message,
          priority,
          audience,
          targetClass: audience === 'CLASS' ? targetClass : undefined,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setTitle('');
        setMessage('');
        setIsCreateOpen(false);
        fetchAnnouncements();
      }
    } catch (err) {
      console.error('E\'lon yaratishda xatolik:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Ushbu e\'lonni o‘chirmoqchimisiz?')) return;
    try {
      await authenticatedFetch(`/api/admin/announcements/${id}`, { method: 'DELETE' });
      setAnnouncements((prev) => prev.filter((a) => a.id !== id));
    } catch (err) {
      console.error('O‘chirishda xatolik:', err);
    }
  };

  const getPriorityBadge = (p: string) => {
    switch (p) {
      case 'URGENT':
        return 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300';
      case 'HIGH':
        return 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300';
      case 'LOW':
        return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300';
      default:
        return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300';
    }
  };

  return (
    <div className="space-y-6 font-sans pb-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center gap-3.5">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-600/30">
            <Bell className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                E'lonlar & Bildirishnomalar Markazi
              </h1>
              <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-[11px] font-bold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                Maktab bo'ylab
              </span>
            </div>
            <p className="text-xs text-slate-400 font-semibold mt-0.5">
              O‘qituvchilar, o‘quvchilar va ota-onalar uchun rasmiy xabarlar va muhim eslatmalar
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsCreateOpen(true)}
          className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-indigo-600/30 hover:bg-indigo-700 cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          <span>Yangi E'lon Yaratish</span>
        </button>
      </div>

      {/* Announcements Feed */}
      <div className="space-y-4">
        {loading ? (
          <div className="p-12 text-center text-xs text-slate-400">E'lonlar yuklanmoqda...</div>
        ) : announcements.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-400 rounded-3xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
            Hozircha e'lonlar mavjud emas. Yuqoridagi tugma orqali yangi e'lon qo'shishingiz mumkin.
          </div>
        ) : (
          announcements.map((item) => (
            <div
              key={item.id}
              className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className={`rounded-md px-2 py-0.5 text-[10px] font-black uppercase ${getPriorityBadge(item.priority)}`}>
                      {item.priority}
                    </span>
                    <span className="rounded-md bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-[10px] font-bold text-slate-700 dark:text-slate-300">
                      Auditoriya: {item.audience} {item.targetClass ? `(${item.targetClass})` : ''}
                    </span>
                    <span className="text-[11px] text-slate-400 font-mono">
                      {new Date(item.createdAt).toLocaleString('uz-UZ')}
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white mt-1.5">
                    {item.title}
                  </h3>
                </div>

                <button
                  type="button"
                  onClick={() => handleDelete(item.id)}
                  className="rounded-xl border border-slate-200 bg-white p-2 text-rose-600 hover:bg-rose-50 dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700"
                  title="E'lonni o'chirish"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>

              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                {item.message}
              </p>

              <div className="text-[11px] text-slate-400 border-t border-slate-100 dark:border-slate-800 pt-2 flex items-center justify-between">
                <span>Yuboruvchi: <strong>{item.senderName}</strong></span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Create Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900 animate-in zoom-in-95">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-3">
              Yangi E'lon Yuborish
            </h2>

            <form onSubmit={handleCreateAnnouncement} className="mt-4 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">E'lon Sarlavhasi:</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Masalan: 1-chorak yakuniy pedagogik kengashi"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs text-slate-900 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Muhimlik Darajasi:</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as any)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs font-semibold text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  >
                    <option value="NORMAL">Oddiy (Normal)</option>
                    <option value="HIGH">Yuqori (High)</option>
                    <option value="URGENT">Shoshilinch (Urgent)</option>
                    <option value="LOW">Past (Low)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Kimlar uchun:</label>
                  <select
                    value={audience}
                    onChange={(e) => setAudience(e.target.value as any)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs font-semibold text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  >
                    <option value="ALL">Barcha maktabga</option>
                    <option value="TEACHERS">Faqat o‘qituvchilarga</option>
                    <option value="STUDENTS">Faqat o‘quvchilarga</option>
                    <option value="PARENTS">Faqat ota-onalarga</option>
                    <option value="CLASS">Aniq bir sinfga</option>
                  </select>
                </div>
              </div>

              {audience === 'CLASS' && (
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Sinf nomi (Masalan: 7-A):</label>
                  <input
                    type="text"
                    required
                    value={targetClass}
                    onChange={(e) => setTargetClass(e.target.value)}
                    placeholder="7-A"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>
              )}

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">E'lon Matni:</label>
                <textarea
                  rows={4}
                  required
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Xabarning to‘liq matnini kiriting..."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs text-slate-900 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300"
                >
                  Bekor qilish
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-5 py-2 text-xs font-bold text-white shadow-lg shadow-indigo-600/30 hover:bg-indigo-700 disabled:opacity-50"
                >
                  <Send className="h-4 w-4" />
                  <span>{isSubmitting ? 'Yuborilmoqda...' : 'E\'lonni Chop Etish'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

