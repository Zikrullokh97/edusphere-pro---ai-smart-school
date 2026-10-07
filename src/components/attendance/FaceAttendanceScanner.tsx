import React, { useEffect, useRef, useState } from 'react';
import { Camera, CheckCircle2, ShieldCheck, X } from 'lucide-react';
import { verifyFace } from '../../lib/biometric';

interface Props {
  isOpen: boolean;
  subjectType: 'student' | 'teacher';
  classId?: string;
  className?: string;
  lessonId?: string;
  date?: string;
  direction?: 'IN' | 'OUT';
  scheduleSlotId?: string;
  onClose: () => void;
  onVerified?: (result: any) => void;
}

export const FaceAttendanceScanner: React.FC<Props> = ({ isOpen, subjectType, classId, className, lessonId, date, direction, scheduleSlotId, onClose, onVerified }) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [active, setActive] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    let mounted = true;
    navigator.mediaDevices.getUserMedia({ video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' }, audio: false })
      .then((stream) => {
        if (!mounted) return stream.getTracks().forEach((track) => track.stop());
        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
        setActive(true);
      })
      .catch(() => setError('Kameraga ruxsat berilmadi.'));
    return () => {
      mounted = false;
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      setActive(false);
    };
  }, [isOpen]);

  const scan = async () => {
    if (!videoRef.current || !active) return;
    setBusy(true);
    setError(null);
    try {
      const video = videoRef.current;
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Kamera kadrini olish imkoni bo‘lmadi.');
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const verification = await verifyFace({
        imageBase64: canvas.toDataURL('image/jpeg', 0.82),
        subjectType,
        classId,
        className,
        lessonId,
        date,
        direction,
        scheduleSlotId,
      });
      setResult(verification);
      onVerified?.(verification);
    } catch (err: any) {
      setResult(null);
      setError(err.message || 'Face ID tekshiruvi muvaffaqiyatsiz.');
    } finally {
      setBusy(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
      <div className="w-full max-w-2xl rounded-3xl bg-white p-5 shadow-2xl dark:bg-slate-900">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-black text-slate-900 dark:text-white">Face ID davomat</h2>
            <p className="text-xs text-slate-500">{subjectType === 'student' ? 'O‘quvchi' : 'O‘qituvchi'} · real kamera</p>
          </div>
          <button onClick={onClose} aria-label="Yopish"><X /></button>
        </div>
        <div className="relative mt-4 aspect-video overflow-hidden rounded-2xl bg-slate-950">
          <video ref={videoRef} autoPlay playsInline muted className="h-full w-full object-cover scale-x-[-1]" />
          {busy && <div className="absolute inset-0 flex items-center justify-center bg-slate-950/60 text-white">Face + liveness tekshirilmoqda...</div>}
        </div>
        {result && (
          <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 dark:bg-emerald-950/30">
            <div className="flex items-center gap-2 font-black text-emerald-700"><CheckCircle2 className="h-5 w-5" /> {result.decision}</div>
            <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
              <span>Match: {((result.matchScore || 0) * 100).toFixed(1)}%</span>
              <span>Liveness: {((result.livenessScore || 0) * 100).toFixed(1)}%</span>
              <span>Quality: {((result.qualityScore || 0) * 100).toFixed(1)}%</span>
            </div>
            {result.attendanceRecord && <p className="mt-2 text-xs font-bold text-emerald-700">Davomat avtomatik qayd etildi.</p>}
          </div>
        )}
        {error && <div className="mt-3 rounded-xl bg-rose-50 p-3 text-xs text-rose-700">{error}</div>}
        <div className="mt-5 flex justify-end gap-2">
          <button onClick={scan} disabled={!active || busy} className="flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-bold text-white"><Camera className="h-4 w-4" /> Skanerlash</button>
          <button onClick={onClose} className="rounded-xl bg-slate-100 px-4 py-2.5 text-xs font-bold text-slate-700"><ShieldCheck className="mr-1 inline h-4 w-4" /> Yopish</button>
        </div>
      </div>
    </div>
  );
};
