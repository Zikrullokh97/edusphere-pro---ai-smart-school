import React, { useEffect, useRef, useState } from 'react';
import { Camera, CheckCircle2, X, ShieldCheck, VideoOff } from 'lucide-react';
import { checkLiveness, createBiometricConsent, enrollTeacherFace, extractFaceEmbedding } from '../../lib/biometric';

interface Props {
  isOpen: boolean;
  teacherId: string;
  teacherName: string;
  onClose: () => void;
  onSuccess?: () => void;
}

export const TeacherFaceEnrollmentModal: React.FC<Props> = ({ isOpen, teacherId, teacherName, onClose, onSuccess }) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [streamActive, setStreamActive] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [consent, setConsent] = useState(false);
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
        setStreamActive(true);
      })
      .catch(() => setError('Kameraga ruxsat berilmadi yoki kamera mavjud emas.'));
    return () => {
      mounted = false;
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      setStreamActive(false);
    };
  }, [isOpen]);

  const capture = async () => {
    if (!videoRef.current || !streamActive) return;
    setProcessing(true);
    setError(null);
    try {
      const video = videoRef.current;
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Kamera kadrini olish imkoni bo‘lmadi.');
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const image = canvas.toDataURL('image/jpeg', 0.9);
      const [face, live] = await Promise.all([extractFaceEmbedding(image), checkLiveness(image)]);
      if (!live.passed || !face.livenessPassed) throw new Error('Liveness tekshiruvi muvaffaqiyatsiz.');
      setResult({ face, live, image });
    } catch (err: any) {
      setError(err.message || 'Face ID tahlili muvaffaqiyatsiz.');
      setResult(null);
    } finally {
      setProcessing(false);
    }
  };

  const save = async () => {
    if (!result || !consent) return;
    setProcessing(true);
    try {
      const biometricConsent = await createBiometricConsent({
        subjectId: teacherId,
        subjectType: 'teacher',
        granted: true,
        evidenceRef: `ui:teacher-face-enrollment:${teacherId}`,
      });
      await enrollTeacherFace(teacherId, result.face.embedding, biometricConsent.id);
      onSuccess?.();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Biometrik ma’lumotni saqlashda xatolik.');
    } finally {
      setProcessing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm">
      <div className="w-full max-w-xl rounded-3xl bg-white p-6 shadow-2xl dark:bg-slate-900">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-black text-slate-900 dark:text-white">O‘qituvchi Face ID</h2>
            <p className="text-xs text-slate-500">{teacherName} · {teacherId}</p>
          </div>
          <button onClick={onClose} aria-label="Yopish"><X /></button>
        </div>
        <div className="relative mt-5 aspect-video overflow-hidden rounded-2xl bg-slate-950">
          <video ref={videoRef} autoPlay playsInline muted className="h-full w-full object-cover scale-x-[-1]" />
          {!streamActive && <div className="absolute inset-0 flex items-center justify-center text-slate-400"><VideoOff /></div>}
          {processing && <div className="absolute inset-0 flex items-center justify-center bg-slate-950/60 text-white">Face AI tahlil qilmoqda...</div>}
        </div>
        {result && (
          <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 dark:bg-emerald-950/30">
            <div className="flex items-center gap-2 font-bold text-emerald-700"><CheckCircle2 className="h-5 w-5" /> Liveness tasdiqlandi</div>
            <div className="mt-2 grid grid-cols-2 gap-3 text-xs">
              <span>Face confidence: {(result.face.confidence * 100).toFixed(1)}%</span>
              <span>Liveness: {(result.live.livenessScore * 100).toFixed(1)}%</span>
            </div>
          </div>
        )}
        {error && <div className="mt-3 rounded-xl bg-rose-50 p-3 text-xs text-rose-700">{error}</div>}
        {result && (
          <label className="mt-4 flex gap-2 text-xs text-slate-600 dark:text-slate-300">
            <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
            O‘qituvchining biometrik ma’lumotini saqlashga rozilik tasdiqlandi.
          </label>
        )}
        <div className="mt-5 flex justify-end gap-2">
          <button onClick={capture} disabled={!streamActive || processing} className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white">Kadrni tekshirish</button>
          <button onClick={save} disabled={!result || !consent || processing} className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white"><ShieldCheck className="h-4 w-4" /> Saqlash</button>
        </div>
      </div>
    </div>
  );
};
