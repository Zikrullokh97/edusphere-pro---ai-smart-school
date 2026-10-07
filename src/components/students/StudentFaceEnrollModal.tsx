import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Camera,
  Upload,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  X,
  ScanFace,
  Sparkles,
  ShieldCheck,
  VideoOff,
} from 'lucide-react';
import { authenticatedFetch } from '../../lib/api';
import { checkLiveness, createBiometricConsent, extractFaceEmbedding, enrollStudentFace } from '../../lib/biometric';
import type {
  StudentFaceEnrollModalProps,
  FaceExtractionResult,
} from '../../types/faceEnrollment';

export const StudentFaceEnrollModal: React.FC<StudentFaceEnrollModalProps> = ({
  isOpen,
  studentId,
  studentName,
  className,
  currentPhotoUrl,
  onClose,
  onSuccess,
}) => {
  const [activeTab, setActiveTab] = useState<'camera' | 'upload'>('camera');
  const [streamActive, setStreamActive] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [extractionResult, setExtractionResult] = useState<FaceExtractionResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [livenessResult, setLivenessResult] = useState<{ passed: boolean; livenessScore: number; qualityScore: number } | null>(null);
  const [consentGranted, setConsentGranted] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Veb-kamerani yoqish
  const startCamera = useCallback(async () => {
    try {
      setErrorMessage(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user',
        },
        audio: false,
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        setStreamActive(true);
      }
    } catch (err: any) {
      console.error('Kamera ulanishida xatolik:', err);
      setStreamActive(false);
      setErrorMessage('Kameraga ulanib bo‘lmadi. Ruxsat berilganligini tekshiring.');
    }
  }, []);

  // Kamerani to'xtatish
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setStreamActive(false);
  }, []);

  useEffect(() => {
    if (isOpen && activeTab === 'camera') {
      startCamera();
    } else {
      stopCamera();
    }

    return () => {
      stopCamera();
    };
  }, [isOpen, activeTab, startCamera, stopCamera]);

  // Suratdan 512-d embedding ajratib olish (Backend API chaqiruvi)
  const extractEmbeddingFromImage = async (base64Image: string) => {
    setIsProcessing(true);
    setErrorMessage(null);
    setExtractionResult(null);

    try {
      const [data, live] = await Promise.all([
        extractFaceEmbedding(base64Image),
        checkLiveness(base64Image),
      ]);

      if (!live.passed || !data.livenessPassed) {
        throw new Error('Liveness tekshiruvi muvaffaqiyatsiz. Kameraga qarab, yuzni to‘liq va yorug‘ holda ko‘rsating.');
      }

      setLivenessResult({
        passed: live.passed,
        livenessScore: live.livenessScore,
        qualityScore: live.qualityScore,
      });

      setExtractionResult({
        ...data,
        livenessScore: live.livenessScore,
        livenessPassed: live.passed,
        previewUrl: base64Image,
      });
    } catch (err: any) {
      setErrorMessage(err.message || 'Yuzni tahlil qilishda xatolik yuz berdi.');
      setExtractionResult(null);
    } finally {
      setIsProcessing(false);
    }
  };

  // Kameradan kadrni ushlash (Snapshot)
  const handleCapture = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Aylanma ko'zgu effektini to'g'rilash (Mirror flip)
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const base64 = canvas.toDataURL('image/jpeg', 0.92);
    setCapturedImage(base64);
    extractEmbeddingFromImage(base64);
  };

  // Fayldan rasm yuklash
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrorMessage('Faqat JPG yoki PNG formatdagi rasm yuklang.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      setCapturedImage(base64);
      extractEmbeddingFromImage(base64);
    };
    reader.readAsDataURL(file);
  };

  // Qayta urinish
  const handleReset = () => {
    setCapturedImage(null);
    setExtractionResult(null);
    setLivenessResult(null);
    setConsentGranted(false);
    setErrorMessage(null);
    if (activeTab === 'camera') {
      startCamera();
    }
  };

  // Profilga saqlash
  const handleSaveToProfile = async () => {
    if (!extractionResult || !capturedImage) return;

    setIsSaving(true);
    try {
      if (!consentGranted) {
        throw new Error('Biometrik ma’lumotni saqlashdan oldin rozilikni tasdiqlang.');
      }

      const consent = await createBiometricConsent({
        subjectId: studentId,
        subjectType: 'student',
        granted: true,
        evidenceRef: `ui:face-enrollment:${studentId}`,
      });

      await enrollStudentFace(
        studentId,
        extractionResult.embedding,
        consent.id,
        capturedImage,
      );

      onSuccess(extractionResult.embedding, capturedImage);
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Saqlashda xatolik yuz berdi.');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
    >
      <div className="relative w-full max-w-2xl rounded-3xl bg-white p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 dark:bg-slate-900 dark:border-slate-800">
        {/* Yopish tugmasi */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 transition-colors"
          aria-label="Yopish"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Sarlavhasi */}
        <div className="flex items-center gap-3.5 border-b border-slate-100 dark:border-slate-800 pb-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-600/30">
            <ScanFace className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              Face ID Biometriyasini Ro‘yxatga Olish
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {studentName} ({className} sinf) • ID: <span className="font-mono">{studentId}</span>
            </p>
          </div>
        </div>

        {/* Tab Switcher */}
        {!capturedImage && (
          <div className="mt-5 flex rounded-xl bg-slate-100 dark:bg-slate-800 p-1">
            <button
              type="button"
              onClick={() => setActiveTab('camera')}
              className={`flex flex-1 items-center justify-center gap-2 rounded-lg py-2 text-xs font-semibold transition-all ${
                activeTab === 'camera'
                  ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
              }`}
            >
              <Camera className="w-4 h-4" />
              Jonli Veb-kamera
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('upload')}
              className={`flex flex-1 items-center justify-center gap-2 rounded-lg py-2 text-xs font-semibold transition-all ${
                activeTab === 'upload'
                  ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
              }`}
            >
              <Upload className="w-4 h-4" />
              Fayl Yuklash (JPG/PNG)
            </button>
          </div>
        )}

        {/* Asosiy Video / Rasm Maydoni */}
        <div className="mt-5 flex flex-col items-center">
          {!capturedImage ? (
            activeTab === 'camera' ? (
              <div className="relative w-full aspect-4/3 max-w-md rounded-2xl overflow-hidden bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-center shadow-inner">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover scale-x-[-1]"
                />

                {/* Yuz ovali (Scanner Overlay) */}
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                  <div className="w-48 h-64 rounded-[45%] border-2 border-dashed border-indigo-400/80 shadow-[0_0_0_9999px_rgba(15,23,42,0.45)] flex items-center justify-center">
                    <span className="text-[11px] font-bold text-white/90 bg-indigo-600/70 px-2 py-0.5 rounded-full backdrop-blur-xs">
                      Yuzni markazga keltiring
                    </span>
                  </div>
                </div>

                {!streamActive && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900 text-slate-400 gap-2 p-4 text-center">
                    <VideoOff className="w-8 h-8 text-slate-500" />
                    <p className="text-xs">Kamera faollashtirilmoqda...</p>
                  </div>
                )}
              </div>
            ) : (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="w-full aspect-4/3 max-w-md rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-indigo-500 bg-slate-50 dark:bg-slate-800/50 hover:bg-indigo-50/20 transition-all flex flex-col items-center justify-center gap-3 cursor-pointer p-6 text-center"
              >
                <div className="p-4 rounded-full bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400">
                  <Upload className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-700 dark:text-slate-200">Suratni tanlang yoki tashlang</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">Tiniq, frontal va yorug‘ surat</p>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </div>
            )
          ) : (
            /* Natijani Ko'rsatish (Review & Vector Score) */
            <div className="w-full max-w-md space-y-4">
              <div className="relative aspect-4/3 w-full rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-md">
                <img
                  src={capturedImage}
                  alt="Captured face"
                  className="w-full h-full object-cover"
                />

                {isProcessing && (
                  <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs flex flex-col items-center justify-center text-white gap-2">
                    <div className="w-8 h-8 rounded-full border-3 border-white border-t-transparent animate-spin" />
                    <span className="text-xs font-semibold">512-d vektor generatsiya qilinmoqda...</span>
                  </div>
                )}
              </div>

              {/* Status va Vektor ko'rsatkichi */}
              {extractionResult && (
                <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-850 text-emerald-900 dark:text-emerald-200 space-y-2 animate-in fade-in">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5 font-bold text-emerald-700 dark:text-emerald-400">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      <span>Yuz muvaffaqiyatli tanildi</span>
                    </div>
                    <span className="px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-300 font-mono font-bold text-[11px]">
                      512-D ArcFace
                    </span>
                  </div>

                  {livenessResult && (
                    <div className="grid grid-cols-2 gap-2 text-xs pt-2 mt-2 border-t border-emerald-100 dark:border-emerald-900">
                      <div>
                        <span className="text-emerald-700/80 dark:text-emerald-400/80 text-[11px]">Liveness:</span>
                        <div className="font-bold font-mono">{(livenessResult.livenessScore * 100).toFixed(1)}%</div>
                      </div>
                      <div>
                        <span className="text-emerald-700/80 dark:text-emerald-400/80 text-[11px]">Model:</span>
                        <div className="font-bold text-[10px]">{extractionResult.modelVersion || 'Face AI'}</div>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-emerald-100 dark:border-emerald-900">
                    <div>
                      <span className="text-emerald-700/80 dark:text-emerald-400/80 text-[11px]">Sifat ko‘rsatkichi:</span>
                      <div className="font-bold font-mono">
                        {((extractionResult.qualityScore || 0.95) * 100).toFixed(1)}%
                      </div>
                    </div>
                    <div>
                      <span className="text-emerald-700/80 dark:text-emerald-400/80 text-[11px]">Ishonchlilik (Confidence):</span>
                      <div className="font-bold font-mono">
                        {(extractionResult.confidence * 100).toFixed(1)}%
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Xatolik Xabari */}
          {errorMessage && (
            <div className="mt-3 w-full max-w-md p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-500" />
              <span>{errorMessage}</span>
            </div>
          )}

          <canvas ref={canvasRef} className="hidden" />
        </div>

        {extractionResult && (
          <label className="mt-4 flex items-start gap-3 rounded-xl border border-indigo-200 bg-indigo-50/70 p-3 text-[11px] text-indigo-900 dark:border-indigo-900 dark:bg-indigo-950/40 dark:text-indigo-200">
            <input
              type="checkbox"
              checked={consentGranted}
              onChange={(event) => setConsentGranted(event.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-slate-300 text-indigo-600"
            />
            <span>
              Biometrik ma’lumotni Face ID orqali davomat va identifikatsiya uchun saqlashga rozilik beraman.
              Rozilikni keyinchalik bekor qilish mumkin.
            </span>
          </label>
        )}

        {/* Pastki Amallar Paneli */}
        <div className="mt-6 flex items-center justify-between border-t border-slate-100 dark:border-slate-800 pt-4">
          <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-medium">
            <ShieldCheck className="w-4 h-4 text-indigo-500" />
            <span>Biometriya xavfsiz shifrlanadi</span>
          </div>

          <div className="flex items-center gap-2">
            {!capturedImage ? (
              activeTab === 'camera' && (
                <button
                  type="button"
                  onClick={handleCapture}
                  disabled={!streamActive}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold shadow-lg shadow-indigo-600/30 transition-all cursor-pointer"
                >
                  <Camera className="w-4 h-4" />
                  Rasmga Olish
                </button>
              )
            ) : (
              <>
                <button
                  type="button"
                  onClick={handleReset}
                  disabled={isSaving}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold transition-colors"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Qayta Olish
                </button>

                <button
                  type="button"
                  onClick={handleSaveToProfile}
                  disabled={!extractionResult || isSaving || isProcessing}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold shadow-lg shadow-emerald-600/30 transition-all cursor-pointer"
                >
                  {isSaving ? (
                    <>
                      <div className="w-3.5 h-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                      Saqlanmoqda...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      Tasdiqlash va Saqlash
                    </>
                  )}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

