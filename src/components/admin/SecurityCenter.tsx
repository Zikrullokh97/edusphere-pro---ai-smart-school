import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  Lock,
  Smartphone,
  Laptop,
  Globe,
  LogOut,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  KeyRound,
  ShieldCheck,
} from 'lucide-react';
import { authenticatedFetch } from '../../lib/api';

interface SessionItem {
  id: string;
  device: string;
  ip: string;
  location: string;
  lastActive: string;
  isCurrent: boolean;
}

export const SecurityCenter: React.FC = () => {
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [revoking, setRevoking] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const fetchSessions = async () => {
    setLoading(true);
    try {
      const res = await authenticatedFetch('/api/admin/security/sessions');
      const data = await res.json();
      if (data.success && Array.isArray(data.sessions)) {
        setSessions(data.sessions);
      }
    } catch (err) {
      console.error('Sessiyalarni yuklashda xatolik:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, []);

  const handleForceLogoutAll = async () => {
    if (!window.confirm('Haqiqatan ham barcha qurilmalardagi faol sessiyalarni bekor qilmoqchimisiz?')) {
      return;
    }

    setRevoking(true);
    try {
      const res = await authenticatedFetch('/api/admin/security/force-logout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetUid: 'ALL' }),
      });
      const data = await res.json();
      if (data.success) {
        setSuccessMessage('Barcha boshqa sessiyalar muvaffaqiyatli bekor qilindi.');
        fetchSessions();
      }
    } catch (err) {
      console.error('Sessiyalarni bekor qilishda xatolik:', err);
    } finally {
      setRevoking(false);
    }
  };

  return (
    <div className="space-y-6 font-sans pb-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center gap-3.5">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-600/30">
            <Lock className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                Xavfsizlik Markazi & Sessiyalar
              </h1>
              <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                Himoyalangan
              </span>
            </div>
            <p className="text-xs text-slate-400 font-semibold mt-0.5">
              Faol ulanishlar, kirish xavfsizligi va token sessiyalarini boshqarish
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleForceLogoutAll}
          disabled={revoking}
          className="flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-rose-600/30 hover:bg-rose-700 cursor-pointer disabled:opacity-50"
        >
          <LogOut className="h-4 w-4" />
          <span>{revoking ? 'Bekor qilinmoqda...' : 'Barcha Boshqa Sessiyalarni Yopish'}</span>
        </button>
      </div>

      {successMessage && (
        <div className="flex items-center gap-2 rounded-2xl bg-emerald-50 border border-emerald-200 p-4 text-xs font-bold text-emerald-800 dark:bg-emerald-950/60 dark:border-emerald-900 dark:text-emerald-300 animate-in fade-in">
          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Security Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Card 1: Password Policy */}
        <div className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400">
              <KeyRound className="h-5 w-5" />
            </div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200">
              Parol Siyosati
            </h3>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Faqat kuchli parollar, server-side bcrypt/PBKDF2 hash va birinchi kirishda parolni majburiy yangilash (`forcePasswordChange`) faol.
          </p>
          <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-600">
            <ShieldCheck className="h-4 w-4" />
            <span>Maksimal himoya yoqilgan</span>
          </div>
        </div>

        {/* Card 2: MFA Status */}
        <div className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400">
              <Smartphone className="h-5 w-5" />
            </div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200">
              Ikki Bosqichli Himoya (MFA)
            </h3>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Adminlar va o‘qituvchilar uchun SMS / Authenticator ilovasi orqali qo‘shimcha tasdiqlash protokoli.
          </p>
          <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 dark:text-indigo-400">
            <ShieldCheck className="h-4 w-4" />
            <span>Tizim tayyor</span>
          </div>
        </div>

        {/* Card 3: RBAC Protection */}
        <div className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400">
              <ShieldAlert className="h-5 w-5" />
            </div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200">
              Server-Authoritative RBAC
            </h3>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Mijoz (brauzer) tomonidan yuborilgan ro‘lga hech qachon ishonilmaydi. Barcha ruxsatlar Firebase ID Token orqali tekshiriladi.
          </p>
          <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-600">
            <ShieldCheck className="h-4 w-4" />
            <span>Token signature tekshiruvi faol</span>
          </div>
        </div>
      </div>

      {/* Active Sessions List */}
      <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white">
            Faol Qurilmalar va Sessiyalar
          </h2>
          <span className="text-xs text-slate-400 font-semibold">Jami: {sessions.length} ta qurilma</span>
        </div>

        <div className="space-y-3">
          {sessions.map((sess) => (
            <div
              key={sess.id}
              className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700 text-xs"
            >
              <div className="flex items-center gap-3.5">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400">
                  {sess.device.includes('iPad') || sess.device.includes('Android') ? (
                    <Smartphone className="h-5 w-5" />
                  ) : (
                    <Laptop className="h-5 w-5" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 dark:text-white">{sess.device}</span>
                    {sess.isCurrent && (
                      <span className="rounded-md bg-emerald-100 px-2 py-0.5 text-[10px] font-black text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                        Joriy qurilma
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    IP: {sess.ip} • {sess.location} • {sess.lastActive}
                  </div>
                </div>
              </div>

              {!sess.isCurrent && (
                <button
                  type="button"
                  onClick={handleForceLogoutAll}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-rose-600 hover:bg-rose-50 dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 transition-colors"
                >
                  Sessiyani yopish
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

