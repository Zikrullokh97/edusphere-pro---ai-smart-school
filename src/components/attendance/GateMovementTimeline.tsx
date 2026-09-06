import React, { useState, useEffect } from 'react';
import {
  LogIn,
  LogOut,
  Clock,
  Calendar,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  ChevronRight,
  Info,
  Timer,
  X,
} from 'lucide-react';
import { authenticatedFetch } from '../../lib/api';
import type { GateMovementRecord, GateMovementTimelineProps } from '../../types/gateMovement';

export const GateMovementTimeline: React.FC<GateMovementTimelineProps> = ({
  studentId,
  studentName,
  records: initialRecords,
}) => {
  const [records, setRecords] = useState<GateMovementRecord[]>(initialRecords || []);
  const [loading, setLoading] = useState(!initialRecords);
  const [selectedPhoto, setSelectedPhoto] = useState<{ url: string; title: string } | null>(null);

  useEffect(() => {
    if (initialRecords) return;

    let active = true;
    const fetchMovements = async () => {
      try {
        setLoading(true);
        const res = await authenticatedFetch(`/api/attendance/gate-movements/${studentId}`);
        const data = await res.json();
        if (active && data.success && data.records) {
          setRecords(data.records);
        }
      } catch (error) {
        console.error('Harakatlar tarixini yuklashda xatolik:', error);
      } finally {
        if (active) setLoading(false);
      }
    };

    fetchMovements();
    return () => {
      active = false;
    };
  }, [studentId, initialRecords]);

  // Daqiqalarni soat va daqiqaga aylantirish
  const formatDuration = (mins?: number) => {
    if (!mins || mins <= 0) return '—';
    const hours = Math.floor(mins / 60);
    const remainingMins = mins % 60;
    return hours > 0 ? `${hours} soat ${remainingMins} daqiqa` : `${remainingMins} daqiqa`;
  };

  if (loading) {
    return (
      <div className="w-full rounded-3xl border border-slate-200 bg-white p-6 shadow-xs animate-pulse dark:border-slate-800 dark:bg-slate-900">
        <div className="h-6 w-48 rounded-lg bg-slate-200 dark:bg-slate-800 mb-6" />
        <div className="space-y-4">
          {[1, 2, 3].map((n) => (
            <div key={n} className="h-24 rounded-2xl bg-slate-100 dark:bg-slate-800" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xs font-sans dark:border-slate-800 dark:bg-slate-900">
      {/* Sarlavha Paneli */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-5">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400">
            <Timer className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Kirish va Chiqish Nazorati (Face ID Timeline)
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              {studentName} uchun kunlik turniket harakatlari va xavfsizlik loglari
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700 bg-emerald-50 dark:bg-emerald-950/60 dark:text-emerald-300 px-3 py-1.5 rounded-xl border border-emerald-100 dark:border-emerald-900 w-fit">
          <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <span>Biometrik Xavfsizlik Faol</span>
        </div>
      </div>

      {/* Harakatlar Ro'yxati */}
      {records.length === 0 ? (
        <div className="py-12 text-center text-xs text-slate-400">
          Ushbu davr uchun kirish-chiqish harakatlari topilmadi.
        </div>
      ) : (
        <div className="mt-6 space-y-4">
          {records.map((rec) => {
            const isCurrentlyInSchool = rec.entryTime && !rec.exitTime;

            return (
              <div
                key={rec.id || rec.date}
                className="relative rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 p-4.5 hover:bg-slate-50 dark:hover:bg-slate-800/70 transition-colors"
              >
                {/* Sana va Umumiy Vaqt */}
                <div className="flex items-center justify-between border-b border-slate-200/60 dark:border-slate-800 pb-3 mb-4">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-200">
                    <Calendar className="w-4 h-4 text-indigo-500" />
                    <span>{rec.date}</span>
                    {rec.status === 'late' && (
                      <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 text-[10px] font-black">
                        Kechikkan
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 font-medium">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span>Maktabda: </span>
                    <strong className="text-slate-800 dark:text-white font-mono">
                      {isCurrentlyInSchool ? 'Hozir maktabda' : formatDuration(rec.durationMinutes)}
                    </strong>
                  </div>
                </div>

                {/* Vizual Oqim Qatori */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Kirish Bloki */}
                  <div className="flex items-center justify-between rounded-xl bg-white dark:bg-slate-850 p-3 border border-slate-200/80 dark:border-slate-700 shadow-2xs">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-300">
                        <LogIn className="h-4.5 w-4.5" />
                      </div>
                      <div>
                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                          Kirish Vaqti
                        </span>
                        <div className="text-sm font-black text-slate-800 dark:text-white font-mono">
                          {rec.entryTime || 'Qayd etilmagan'}
                        </div>
                        <span className="text-[10px] text-slate-400">
                          {rec.entryGateName || '1-sonli Asosiy Kirish'}
                        </span>
                      </div>
                    </div>

                    {rec.entryPhotoUrl && (
                      <button
                        type="button"
                        onClick={() => setSelectedPhoto({ url: rec.entryPhotoUrl!, title: `${rec.date} — Kirish lahzasi` })}
                        className="group relative h-10 w-10 rounded-xl overflow-hidden border border-slate-200 hover:ring-2 hover:ring-indigo-500 transition-all cursor-pointer shrink-0"
                        title="Face ID suratini ko‘rish"
                      >
                        <img src={rec.entryPhotoUrl} alt="Entry snapshot" className="h-full w-full object-cover" />
                      </button>
                    )}
                  </div>

                  {/* Chiqish Bloki */}
                  <div className="flex items-center justify-between rounded-xl bg-white dark:bg-slate-850 p-3 border border-slate-200/80 dark:border-slate-700 shadow-2xs">
                    <div className="flex items-center gap-3">
                      <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${
                        rec.exitTime ? 'bg-rose-50 text-rose-600 dark:bg-rose-950 dark:text-rose-300' : 'bg-slate-100 text-slate-400 dark:bg-slate-800'
                      }`}>
                        <LogOut className="h-4.5 w-4.5" />
                      </div>
                      <div>
                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                          Chiqish Vaqti
                        </span>
                        <div className="text-sm font-black text-slate-800 dark:text-white font-mono">
                          {rec.exitTime || (isCurrentlyInSchool ? (
                            <span className="text-emerald-600 dark:text-emerald-400 font-semibold text-xs flex items-center gap-1">
                              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                              Dars jarayonida
                            </span>
                          ) : '—')}
                        </div>
                        <span className="text-[10px] text-slate-400">
                          {rec.exitTime ? (rec.exitGateName || '1-sonli Asosiy Chiqish') : 'Hali chiqib ketmagan'}
                        </span>
                      </div>
                    </div>

                    {rec.exitPhotoUrl && (
                      <button
                        type="button"
                        onClick={() => setSelectedPhoto({ url: rec.exitPhotoUrl!, title: `${rec.date} — Chiqish lahzasi` })}
                        className="group relative h-10 w-10 rounded-xl overflow-hidden border border-slate-200 hover:ring-2 hover:ring-indigo-500 transition-all cursor-pointer shrink-0"
                        title="Face ID suratini ko‘rish"
                      >
                        <img src={rec.exitPhotoUrl} alt="Exit snapshot" className="h-full w-full object-cover" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Suratni Katta Ko'rish Modali */}
      {selectedPhoto && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4"
          onClick={() => setSelectedPhoto(null)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="relative max-w-sm w-full rounded-3xl bg-white dark:bg-slate-900 p-5 shadow-2xl border border-slate-200 dark:border-slate-800 animate-in zoom-in-95"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <span className="text-xs font-bold text-slate-800 dark:text-white">{selectedPhoto.title}</span>
              <button
                type="button"
                onClick={() => setSelectedPhoto(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs font-bold p-1 rounded-lg bg-slate-100 dark:bg-slate-800"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-4 aspect-4/3 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700">
              <img src={selectedPhoto.url} alt="Turnstile Snapshot" className="h-full w-full object-cover" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

