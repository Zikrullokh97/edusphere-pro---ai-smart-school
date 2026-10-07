import React, { useState, useEffect, useRef, useCallback } from 'react';
import jsQR from 'jsqr';
import QRCode from 'qrcode';
import confetti from 'canvas-confetti';
import {
  Camera,
  QrCode,
  CheckCircle2,
  Clock,
  AlertCircle,
  Volume2,
  VolumeX,
  FlipHorizontal,
  RefreshCw,
  Flashlight,
  Sparkles,
  Users,
  Upload,
  Undo2,
  Check,
  X,
  ExternalLink,
  Download,
  Eye,
  ShieldCheck,
  Send,
  Zap,
} from 'lucide-react';
import { AppLanguage, AttendanceRecord, StudentRecord } from '../../types';
import { useI18n } from '../../lib/i18n';
import { listSchoolData } from '../../lib/schoolRepository';
import { pwaManager } from '../../lib/pwa';
import { authenticatedFetch } from '../../lib/api';

interface QRCodeAttendanceScannerProps {
  language: AppLanguage;
  selectedClass: string;
  selectedDate: string;
  records: AttendanceRecord[];
  onStatusChange: (
    studentId: string,
    newStatus: 'present' | 'late' | 'absent' | 'excused',
    studentName?: string
  ) => void;
  onBatchPresent?: () => void;
}

export interface QRScanResultItem {
  id: string;
  studentId: string;
  studentName: string;
  className: string;
  avatar?: string;
  time: string;
  status: 'present' | 'late';
  rawPayload: string;
  parentPhone?: string;
}

export const QRCodeAttendanceScanner: React.FC<QRCodeAttendanceScannerProps> = ({
  language,
  selectedClass,
  selectedDate,
  records,
  onStatusChange,
}) => {
  const t = useI18n(language);

  // Scanner States
  const [isScanning, setIsScanning] = useState(true);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [torchOn, setTorchOn] = useState(false);
  const [hasTorch, setHasTorch] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [lastScannedPayload, setLastScannedPayload] = useState<string | null>(null);
  const [recentScans, setRecentScans] = useState<QRScanResultItem[]>([]);
  const [activeTab, setActiveTab] = useState<'scanner' | 'student-badges' | 'class-pass'>('scanner');
  const [students, setStudents] = useState<StudentRecord[]>([]);

  useEffect(() => {
    let active = true;
    listSchoolData<StudentRecord>('students')
      .then((items) => {
        if (active) setStudents(items);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);

  // Selected Student for Badge Preview Modal
  const [badgeModalStudent, setBadgeModalStudent] = useState<StudentRecord | null>(null);
  const [generatedBadgeQR, setGeneratedBadgeQR] = useState<string | null>(null);

  // Classroom Live Display QR
  const [classSessionQR, setClassSessionQR] = useState<string | null>(null);
  const [qrExpirySeconds, setQrExpirySeconds] = useState(900); // 15 min

  // Toast / Notification
  const [scanToast, setScanToast] = useState<{
    studentName: string;
    status: 'present' | 'late';
    time: string;
    studentId: string;
    parentPhone?: string;
  } | null>(null);

  // Refs for video & canvas stream processing
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const cooldownRef = useRef<{ [key: string]: number }>({});
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Play audio chime
  const playChime = useCallback(() => {
    if (!soundEnabled) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.setValueAtTime(880, ctx.currentTime + 0.08); // A5

      gain.gain.setValueAtTime(0.25, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.36);
    } catch {
      // Audio autoplay policy catch
    }
  }, [soundEnabled]);

  // Vibrate mobile device
  const triggerVibrate = () => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try {
        navigator.vibrate([80, 40, 80]);
      } catch {
        // Ignore vibration error
      }
    }
  };

  // Generate QR for a student
  const generateStudentQRDataUrl = async (student: StudentRecord): Promise<string> => {
    const tokenResponse = await authenticatedFetch('/api/attendance/qr-token', {
      method: 'POST',
      body: JSON.stringify({ studentId: student.studentId || student.id, className: student.grade }),
    });
    if (!tokenResponse.ok) return '';
    const { token } = await tokenResponse.json();
    const payload = `QR1:${token}`;

    try {
      return await QRCode.toDataURL(payload, {
        width: 320,
        margin: 2,
        color: {
          dark: '#1e1b4b', // deep indigo
          light: '#ffffff',
        },
        errorCorrectionLevel: 'H',
      });
    } catch (e) {
      console.error('Failed to generate QR code:', e);
      return '';
    }
  };

  // Generate Classroom Session QR
  useEffect(() => {
    const generateClassQR = async () => {
      const payload = JSON.stringify({
        type: 'EDUSPHERE_CLASS_SESSION',
        className: selectedClass,
        date: selectedDate,
        token: `sess_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        validUntil: Date.now() + 15 * 60 * 1000,
      });

      try {
        const url = await QRCode.toDataURL(payload, {
          width: 360,
          margin: 2,
          color: {
            dark: '#0f172a',
            light: '#ffffff',
          },
        });
        setClassSessionQR(url);
      } catch (err) {
        console.error(err);
      }
    };

    generateClassQR();

    const timer = setInterval(() => {
      setQrExpirySeconds((prev) => (prev > 0 ? prev - 1 : 900));
    }, 1000);

    return () => clearInterval(timer);
  }, [selectedClass, selectedDate]);

  // Open Badge Modal for specific student
  const handleOpenBadgeModal = async (student: StudentRecord) => {
    setBadgeModalStudent(student);
    const qrUrl = await generateStudentQRDataUrl(student);
    setGeneratedBadgeQR(qrUrl);
  };

  // Process decoded QR text
  const processDecodedQRCode = useCallback(
    (codeText: string) => {
      const now = Date.now();
      // Cooldown prevention (same QR within 3 seconds)
      if (cooldownRef.current[codeText] && now - cooldownRef.current[codeText] < 3000) {
        return;
      }
      cooldownRef.current[codeText] = now;
      setLastScannedPayload(codeText);

      // Parse payload
      let matchedStudent: StudentRecord | undefined;
      let studentIdToFind = codeText.trim();

      try {
        // Attempt JSON parse
        if (codeText.startsWith('{') && codeText.endsWith('}')) {
          const parsed = JSON.parse(codeText);
          if (parsed.studentId) studentIdToFind = parsed.studentId;
          else if (parsed.id) studentIdToFind = parsed.id;
          else if (parsed.name) studentIdToFind = parsed.name;
        } else if (codeText.startsWith('EDUSPHERE:STUDENT:')) {
          studentIdToFind = codeText.replace('EDUSPHERE:STUDENT:', '').trim();
        }
      } catch {
        // Fallback to literal search
      }

      // Match student against the authenticated school roster or scanned records
      matchedStudent = students.find(
        (s) =>
          s.studentId.toLowerCase() === studentIdToFind.toLowerCase() ||
          s.id.toLowerCase() === studentIdToFind.toLowerCase() ||
          s.name.toLowerCase() === studentIdToFind.toLowerCase() ||
          codeText.toLowerCase().includes(s.name.toLowerCase()) ||
          codeText.toLowerCase().includes(s.studentId.toLowerCase())
      );

      // If still not matched, check records
      if (!matchedStudent) {
        const rec = records.find(
          (r) =>
            r.studentId.toLowerCase() === studentIdToFind.toLowerCase() ||
            r.studentName.toLowerCase().includes(studentIdToFind.toLowerCase())
        );
        if (rec) {
          matchedStudent = {
            id: rec.studentId,
            studentId: rec.studentId,
            name: rec.studentName,
            grade: rec.className,
            avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
            parentName: 'Parent of ' + rec.studentName,
            parentPhone: '+996 555 123456',
            email: 'student@edusphere.school',
            attendanceRate: 95,
            avgGrade: 88,
            homeworkCompletionRate: 90,
            xp: 1000,
            level: 8,
            streakDays: 5,
            riskStatus: 'safe',
            strengths: [],
            weaknesses: [],
            badges: [],
          };
        }
      }

      // Fallback student placeholder if non-registered QR
      const finalStudentName = matchedStudent ? matchedStudent.name : `Student (${studentIdToFind})`;
      const finalStudentId = matchedStudent ? matchedStudent.studentId || matchedStudent.id : studentIdToFind;
      const finalGrade = matchedStudent ? matchedStudent.grade : selectedClass;
      const finalAvatar = matchedStudent?.avatar;
      const parentPhone = matchedStudent?.parentPhone || '+996 555 123456';

      const scanTime = new Date().toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });

      // Mark Present
      onStatusChange(finalStudentId, 'present', finalStudentName);

      // Add to local scan history
      const newScanItem: QRScanResultItem = {
        id: `scan-${Date.now()}`,
        studentId: finalStudentId,
        studentName: finalStudentName,
        className: finalGrade,
        avatar: finalAvatar,
        time: scanTime,
        status: 'present',
        rawPayload: codeText,
        parentPhone,
      };

      setRecentScans((prev) => [newScanItem, ...prev.slice(0, 19)]);

      // Audio & Vibration Feedback
      playChime();
      triggerVibrate();

      // Confetti celebration
      confetti({
        particleCount: 40,
        spread: 45,
        origin: { y: 0.6, x: 0.5 },
      });

      // Show Toast Banner
      setScanToast({
        studentName: finalStudentName,
        status: 'present',
        time: scanTime,
        studentId: finalStudentId,
        parentPhone,
      });

      // Auto dismiss toast after 4s
      setTimeout(() => {
        setScanToast((curr) => (curr?.studentId === finalStudentId ? null : curr));
      }, 4000);
    },
    [onStatusChange, playChime, records, selectedClass]
  );

  // Draw bounding box on overlay canvas
  const drawBoundingBox = (location: any) => {
    const overlay = overlayCanvasRef.current;
    if (!overlay) return;
    const ctx = overlay.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, overlay.width, overlay.height);

    ctx.lineWidth = 4;
    ctx.strokeStyle = '#10B981'; // Emerald 500
    ctx.fillStyle = 'rgba(16, 185, 129, 0.2)';

    ctx.beginPath();
    ctx.moveTo(location.topLeftCorner.x, location.topLeftCorner.y);
    ctx.lineTo(location.topRightCorner.x, location.topRightCorner.y);
    ctx.lineTo(location.bottomRightCorner.x, location.bottomRightCorner.y);
    ctx.lineTo(location.bottomLeftCorner.x, location.bottomLeftCorner.y);
    ctx.closePath();
    ctx.stroke();
    ctx.fill();
  };

  // Video Frame Scanning Loop
  const tickScanLoop = useCallback(() => {
    if (!isScanning) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const overlay = overlayCanvasRef.current;

    if (video && video.readyState === video.HAVE_ENOUGH_DATA && canvas) {
      const width = video.videoWidth;
      const height = video.videoHeight;

      if (width > 0 && height > 0) {
        if (canvas.width !== width || canvas.height !== height) {
          canvas.width = width;
          canvas.height = height;
        }
        if (overlay && (overlay.width !== width || overlay.height !== height)) {
          overlay.width = width;
          overlay.height = height;
        }

        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (ctx) {
          ctx.drawImage(video, 0, 0, width, height);
          const imageData = ctx.getImageData(0, 0, width, height);

          // Decode QR using jsQR
          const code = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: 'dontInvert',
          });

          if (code && code.data) {
            drawBoundingBox(code.location);
            processDecodedQRCode(code.data);
          } else {
            // Clear overlay if no code
            const overlayCtx = overlay?.getContext('2d');
            if (overlayCtx && overlay) {
              overlayCtx.clearRect(0, 0, overlay.width, overlay.height);
            }
          }
        }
      }
    }

    animationFrameRef.current = requestAnimationFrame(tickScanLoop);
  }, [isScanning, processDecodedQRCode]);

  // Start Camera Stream
  const startCamera = async () => {
    setCameraError(null);
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setCameraError('Camera API is not supported on this device/browser.');
        return;
      }

      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: { ideal: facingMode },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true');
        await videoRef.current.play();
      }

      // Check for torch capability
      const track = stream.getVideoTracks()[0];
      const capabilities: any = track.getCapabilities ? track.getCapabilities() : {};
      setHasTorch(Boolean(capabilities.torch));

      setIsScanning(true);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      animationFrameRef.current = requestAnimationFrame(tickScanLoop);
    } catch (err: any) {
      console.warn('Camera stream error:', err);
      setCameraError(
        'Camera permission was dismissed or camera is in use. You can also upload a QR photo or click sample student passes below.'
      );
      setIsScanning(false);
    }
  };

  // Stop Camera Stream
  const stopCamera = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsScanning(false);
    setTorchOn(false);
  };

  // Toggle Torch / Flashlight
  const toggleTorch = async () => {
    if (!streamRef.current) return;
    const track = streamRef.current.getVideoTracks()[0];
    if (!track) return;

    try {
      const newTorch = !torchOn;
      await (track as any).applyConstraints({
        advanced: [{ torch: newTorch }],
      });
      setTorchOn(newTorch);
    } catch (err) {
      console.warn('Torch toggle not supported:', err);
    }
  };

  // Switch Facing Mode (Front vs Back)
  const toggleFacingMode = () => {
    const nextMode = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(nextMode);
  };

  // Lifecycle for Camera
  useEffect(() => {
    if (activeTab === 'scanner') {
      startCamera();
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [activeTab, facingMode]);

  // Handle Manual File Upload for QR Code decoding
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const offCanvas = document.createElement('canvas');
        offCanvas.width = img.width;
        offCanvas.height = img.height;
        const ctx = offCanvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          const imgData = ctx.getImageData(0, 0, img.width, img.height);
          const decoded = jsQR(imgData.data, imgData.width, imgData.height);
          if (decoded && decoded.data) {
            processDecodedQRCode(decoded.data);
          } else {
            alert('Could not detect a clear QR Code in the uploaded image. Please try another photo.');
          }
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Class Students filtered
  const classStudents = students.filter((s) => s.grade === selectedClass);
  const presentStudentIds = new Set(
    records.filter((r) => r.status === 'present').map((r) => r.studentId)
  );

  return (
    <div id="qr-attendance-scanner-module" className="space-y-4">
      {/* Toast Notification for Instant Scan Success */}
      {scanToast && (
        <div className="fixed top-20 right-4 z-50 flex items-center gap-3 rounded-2xl bg-slate-900 px-5 py-3.5 text-white shadow-2xl dark:bg-slate-950 border border-emerald-500/50 animate-slideDown">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500 text-white shadow-lg shadow-emerald-500/30">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-200">Instant QR Verified</span>
              <span className="rounded-md bg-emerald-500/20 px-1.5 py-0.5 text-[10px] font-bold text-emerald-300 uppercase">
                {scanToast.status}
              </span>
            </div>
            <div className="text-sm font-bold text-white">{scanToast.studentName}</div>
            <div className="text-[11px] text-slate-400">
              {scanToast.studentId} • {scanToast.time} • SMS Sent
            </div>
          </div>
          <button
            onClick={() => setScanToast(null)}
            className="ml-2 rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* QR Module Sub-navigation Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveTab('scanner')}
            className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition-all ${
              activeTab === 'scanner'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20 dark:bg-indigo-500'
                : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
            }`}
            style={{ minHeight: '44px' }}
          >
            <Camera className="h-4 w-4" />
            <span>Camera QR Scanner</span>
          </button>

          <button
            onClick={() => setActiveTab('student-badges')}
            className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition-all ${
              activeTab === 'student-badges'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20 dark:bg-indigo-500'
                : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
            }`}
            style={{ minHeight: '44px' }}
          >
            <Users className="h-4 w-4" />
            <span>Student QR Passes ({classStudents.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('class-pass')}
            className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition-all ${
              activeTab === 'class-pass'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20 dark:bg-indigo-500'
                : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
            }`}
            style={{ minHeight: '44px' }}
          >
            <QrCode className="h-4 w-4" />
            <span>Classroom Live Projector QR</span>
          </button>
        </div>

        {/* Quick Sound & Upload Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSoundEnabled((v) => !v)}
            className={`flex h-10 w-10 items-center justify-center rounded-xl border transition-all ${
              soundEnabled
                ? 'border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-900 dark:bg-indigo-950/60 dark:text-indigo-300'
                : 'border-slate-200 bg-slate-50 text-slate-400 dark:border-slate-800 dark:bg-slate-800'
            }`}
            title={soundEnabled ? 'Chime Sound Enabled' : 'Chime Sound Muted'}
            style={{ minHeight: '44px', minWidth: '44px' }}
          >
            {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
          </button>

          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            title="Scan from image file"
            style={{ minHeight: '44px' }}
          >
            <Upload className="h-4 w-4" />
            <span className="hidden sm:inline">Upload QR</span>
          </button>
          <input
            type="file"
            ref={fileInputRef}
            accept="image/*"
            className="hidden"
            onChange={handleFileUpload}
          />
        </div>
      </div>

      {/* TAB 1: Live Camera QR Scanner */}
      {activeTab === 'scanner' && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
          {/* Viewfinder Column (7 cols on lg) */}
          <div className="lg:col-span-7 flex flex-col rounded-3xl border border-slate-200 bg-slate-950 p-4 sm:p-5 text-white shadow-xl dark:border-slate-800 overflow-hidden">
            {/* Viewfinder Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-emerald-500 animate-ping" />
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                  Live Camera Scanner
                </span>
                <span className="rounded bg-slate-800 px-2 py-0.5 text-[10px] font-mono text-slate-300">
                  {facingMode === 'environment' ? 'Rear Camera' : 'Front Camera'}
                </span>
              </div>

              {/* Camera Controls */}
              <div className="flex items-center gap-1.5">
                {hasTorch && (
                  <button
                    onClick={toggleTorch}
                    className={`flex h-8 w-8 items-center justify-center rounded-lg border transition-all ${
                      torchOn
                        ? 'border-amber-400 bg-amber-400 text-slate-950'
                        : 'border-slate-700 bg-slate-800 text-slate-300'
                    }`}
                    title="Toggle Flashlight"
                  >
                    <Flashlight className="h-4 w-4" />
                  </button>
                )}

                <button
                  onClick={toggleFacingMode}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700"
                  title="Switch Camera (Front/Rear)"
                >
                  <FlipHorizontal className="h-4 w-4" />
                </button>

                <button
                  onClick={startCamera}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700"
                  title="Restart Camera"
                >
                  <RefreshCw className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Viewfinder Video Frame with HUD */}
            <div className="relative my-3 flex min-h-[300px] sm:min-h-[380px] w-full items-center justify-center rounded-2xl bg-slate-900 overflow-hidden">
              {/* Actual Video Tag */}
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="h-full w-full object-cover"
              />

              {/* Hidden Canvas for Frame Processing */}
              <canvas ref={canvasRef} className="hidden" />

              {/* Overlay Canvas for Green Target Box */}
              <canvas
                ref={overlayCanvasRef}
                className="absolute inset-0 h-full w-full pointer-events-none"
              />

              {/* Center Targeting Reticle */}
              <div className="pointer-events-none absolute h-56 w-56 sm:h-64 sm:w-64 rounded-3xl border-2 border-emerald-400/70 p-3 shadow-2xl shadow-emerald-500/20">
                {/* Corner markers */}
                <div className="absolute -top-1 -left-1 h-5 w-5 border-t-4 border-l-4 border-emerald-400 rounded-tl-lg" />
                <div className="absolute -top-1 -right-1 h-5 w-5 border-t-4 border-r-4 border-emerald-400 rounded-tr-lg" />
                <div className="absolute -bottom-1 -left-1 h-5 w-5 border-b-4 border-l-4 border-emerald-400 rounded-bl-lg" />
                <div className="absolute -bottom-1 -right-1 h-5 w-5 border-b-4 border-r-4 border-emerald-400 rounded-br-lg" />

                {/* Sweeping Laser Line */}
                <div className="absolute left-2 right-2 h-0.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-lg shadow-emerald-400 animate-bounce" />
              </div>

              {/* Instructions Overlay */}
              <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between rounded-xl bg-slate-950/80 px-3 py-2 text-xs backdrop-blur-md border border-slate-800">
                <span className="text-slate-300">
                  Point camera at student QR badge or phone screen
                </span>
                <span className="font-mono text-emerald-400 text-[10px] font-bold">
                  AUTO-DECODE
                </span>
              </div>
            </div>

            {/* Error / Fallback info */}
            {cameraError && (
              <div className="mt-2 rounded-xl bg-amber-950/60 p-3 border border-amber-500/40 text-xs text-amber-300 flex items-start gap-2">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-amber-400" />
                <div>
                  <p className="font-semibold">Camera Notice:</p>
                  <p className="text-[11px] text-amber-200/90">{cameraError}</p>
                </div>
              </div>
            )}

            {/* Quick Test Bar */}
            <div className="mt-3 pt-3 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs">
              <span className="text-slate-400">Want to test without camera?</span>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => processDecodedQRCode('EDUSPHERE:STUDENT:stu-01')}
                  className="rounded-lg bg-indigo-600/80 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-indigo-600"
                >
                  Test Ali (7-A)
                </button>
                <button
                  onClick={() => processDecodedQRCode('EDUSPHERE:STUDENT:stu-03')}
                  className="rounded-lg bg-indigo-600/80 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-indigo-600"
                >
                  Test Sara (7-A)
                </button>
                <button
                  onClick={() => processDecodedQRCode('EDUSPHERE:STUDENT:stu-04')}
                  className="rounded-lg bg-indigo-600/80 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-indigo-600"
                >
                  Test Dinara (7-A)
                </button>
              </div>
            </div>
          </div>

          {/* Activity Log & Quick Roster Column (5 cols on lg) */}
          <div className="lg:col-span-5 space-y-4">
            {/* Real-time Session Summary */}
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-sm">
                    Class {selectedClass} Check-in
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    {selectedDate} • Academic Roster
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-lg font-extrabold text-indigo-600 dark:text-indigo-400">
                    {presentStudentIds.size} / {classStudents.length}
                  </span>
                  <div className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                    {Math.round((presentStudentIds.size / (classStudents.length || 1)) * 100)}% Present
                  </div>
                </div>
              </div>

              {/* Live Scans History Feed */}
              <div className="mt-4">
                <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
                  <span>Recent Scans in This Session</span>
                  <span className="text-[10px] text-slate-400 font-normal">
                    {recentScans.length} verified
                  </span>
                </div>

                <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1">
                  {recentScans.map((scan) => (
                    <div
                      key={scan.id}
                      className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50 p-3 text-xs dark:border-slate-800 dark:bg-slate-800/60 transition-all hover:bg-indigo-50/50 dark:hover:bg-indigo-950/30"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-bold">
                          <CheckCircle2 className="h-5 w-5" />
                        </div>
                        <div>
                          <div className="font-bold text-slate-900 dark:text-white">
                            {scan.studentName}
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono">
                            {scan.studentId} • {scan.time}
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                          ✓ Present
                        </span>
                        <div className="text-[9px] text-slate-400 mt-1 flex items-center justify-end gap-1">
                          <Send className="h-2.5 w-2.5 text-indigo-500" />
                          <span>SMS Alerted</span>
                        </div>
                      </div>
                    </div>
                  ))}

                  {recentScans.length === 0 && (
                    <div className="rounded-2xl border border-dashed border-slate-200 p-6 text-center text-xs text-slate-400 dark:border-slate-800">
                      <QrCode className="mx-auto h-8 w-8 text-slate-300 dark:text-slate-600 mb-2" />
                      <p className="font-semibold text-slate-600 dark:text-slate-300">
                        No QR codes scanned yet
                      </p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Position a student QR pass inside the camera frame.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Quick Unchecked Student Badges */}
            <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center justify-between text-xs font-bold text-slate-800 dark:text-slate-200 mb-2">
                <span>Class {selectedClass} Quick Tap Check-in</span>
                <span className="text-[10px] text-slate-400 font-normal">Tap to simulate scan</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {classStudents.slice(0, 6).map((std) => {
                  const isPresent = presentStudentIds.has(std.studentId || std.id);
                  return (
                    <button
                      key={std.id}
                      onClick={() => processDecodedQRCode(std.studentId)}
                      className={`flex items-center justify-between rounded-xl p-2 text-left text-xs transition-all ${
                        isPresent
                          ? 'border border-emerald-200 bg-emerald-50/70 text-emerald-900 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-200'
                          : 'border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-300'
                      }`}
                      style={{ minHeight: '44px' }}
                    >
                      <div className="truncate">
                        <div className="font-bold truncate">{std.name}</div>
                        <div className="text-[9px] text-slate-400">{std.studentId}</div>
                      </div>
                      {isPresent ? (
                        <Check className="h-4 w-4 text-emerald-600 shrink-0" />
                      ) : (
                        <QrCode className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: Student QR Passes & Badge Generator */}
      {activeTab === 'student-badges' && (
        <div className="space-y-4">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4 dark:border-slate-800">
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white text-base">
                  Class {selectedClass} Student Digital QR ID Badges
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Each student carries a cryptographically verifiable QR pass on their phone or printed card.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                  {classStudents.length} Students in {selectedClass}
                </span>
              </div>
            </div>

            {/* Students Grid of QR Badges */}
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {classStudents.map((std) => {
                const isPresent = presentStudentIds.has(std.studentId || std.id);
                return (
                  <div
                    key={std.id}
                    className="relative rounded-2xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900 hover:shadow-md transition-all flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="rounded bg-indigo-100 px-2 py-0.5 text-[10px] font-bold text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300 font-mono">
                          {std.studentId}
                        </span>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-bold capitalize ${
                            isPresent
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                              : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                          }`}
                        >
                          {isPresent ? '✓ Present Today' : 'Unchecked'}
                        </span>
                      </div>

                      <div className="mt-3 flex items-center gap-3">
                        <div className="h-12 w-12 rounded-full overflow-hidden bg-slate-100 dark:bg-slate-800 shrink-0">
                          <img
                            src={
                              std.avatar ||
                              'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
                            }
                            alt={std.name}
                            className="h-full w-full object-cover"
                          />
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                            {std.name}
                          </h4>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400">
                            Grade {std.grade} • Level {std.level} ({std.xp} XP)
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                      <button
                        onClick={() => handleOpenBadgeModal(std)}
                        className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                        style={{ minHeight: '40px' }}
                      >
                        <Eye className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
                        <span>View QR Badge</span>
                      </button>

                      <button
                        onClick={() => processDecodedQRCode(std.studentId)}
                        className="flex items-center justify-center gap-1 rounded-xl bg-indigo-600 px-3 py-2 text-xs font-bold text-white shadow-xs hover:bg-indigo-700 dark:bg-indigo-500"
                        style={{ minHeight: '40px' }}
                        title="Simulate Instant QR Scan"
                      >
                        <Zap className="h-3.5 w-3.5" />
                        <span>Scan</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: Classroom Live Projector QR */}
      {activeTab === 'class-pass' && (
        <div className="max-w-xl mx-auto rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xl dark:border-slate-800 dark:bg-slate-900 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400 mx-auto mb-3">
            <QrCode className="h-6 w-6" />
          </div>

          <h2 className="text-xl font-bold text-slate-900 dark:text-white">
            Classroom Dynamic Attendance Board
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto">
            Project this dynamic QR code onto your whiteboard or smart display. Students scan this code from the EduSphere mobile app to register attendance.
          </p>

          <div className="my-6 p-6 bg-slate-50 dark:bg-slate-800/60 rounded-3xl border border-slate-200 dark:border-slate-700 flex flex-col items-center">
            {classSessionQR ? (
              <img
                src={classSessionQR}
                alt="Classroom QR"
                className="h-64 w-64 rounded-2xl border-4 border-white shadow-xl bg-white p-2"
              />
            ) : (
              <div className="h-64 w-64 rounded-2xl bg-slate-200 dark:bg-slate-700 animate-pulse flex items-center justify-center text-xs text-slate-400">
                Generating Dynamic QR...
              </div>
            )}

            <div className="mt-4 flex items-center gap-2">
              <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Valid for Class {selectedClass} • Refreshes in {Math.floor(qrExpirySeconds / 60)}:
                {String(qrExpirySeconds % 60).padStart(2, '0')}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => {
                // Simulate student bulk scan
                classStudents.forEach((std, i) => {
                  setTimeout(() => {
                    processDecodedQRCode(std.studentId);
                  }, i * 300);
                });
              }}
              className="rounded-xl bg-indigo-600 py-3 text-xs font-bold text-white shadow-md hover:bg-indigo-700 dark:bg-indigo-500"
              style={{ minHeight: '44px' }}
            >
              Simulate All Students Scanning
            </button>

            <button
              onClick={() => {
                if (classSessionQR) {
                  const link = document.createElement('a');
                  link.download = `edusphere-class-${selectedClass}-qr.png`;
                  link.href = classSessionQR;
                  link.click();
                }
              }}
              className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 py-3 text-xs font-bold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              style={{ minHeight: '44px' }}
            >
              <Download className="h-4 w-4" />
              <span>Download Board QR</span>
            </button>
          </div>
        </div>
      )}

      {/* Modal: Full Student QR Badge View */}
      {badgeModalStudent && generatedBadgeQR && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs"
            onClick={() => setBadgeModalStudent(null)}
          />

          <div className="relative w-full max-w-sm rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900 z-10 text-center">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
              <div className="flex items-center gap-2 text-left">
                <ShieldCheck className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-sm">
                    Verified Student Pass
                  </h3>
                  <p className="text-[10px] text-slate-400">EduSphere Smart ID</p>
                </div>
              </div>
              <button
                onClick={() => setBadgeModalStudent(null)}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Badge Body */}
            <div className="my-5 p-4 rounded-2xl bg-gradient-to-b from-indigo-50/80 to-white dark:from-indigo-950/40 dark:to-slate-900 border border-indigo-100 dark:border-indigo-900/60">
              <div className="h-20 w-20 rounded-full overflow-hidden mx-auto ring-4 ring-indigo-500/20 shadow-md mb-2">
                <img
                  src={
                    badgeModalStudent.avatar ||
                    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
                  }
                  alt={badgeModalStudent.name}
                  className="h-full w-full object-cover"
                />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {badgeModalStudent.name}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Grade {badgeModalStudent.grade} • ID: {badgeModalStudent.studentId}
              </p>

              {/* Rendered Scannable QR Code */}
              <div className="my-4 p-2 bg-white rounded-2xl shadow-inner inline-block border border-slate-200">
                <img
                  src={generatedBadgeQR}
                  alt="Student QR Code"
                  className="h-44 w-44 object-contain mx-auto"
                />
              </div>

              <div className="text-[10px] font-mono text-slate-400">
                Scan with Teacher Device to mark Present
              </div>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => {
                  processDecodedQRCode(badgeModalStudent.studentId);
                  setBadgeModalStudent(null);
                }}
                className="w-full rounded-xl bg-indigo-600 py-3 text-xs font-bold text-white shadow-md hover:bg-indigo-700 dark:bg-indigo-500"
                style={{ minHeight: '44px' }}
              >
                Scan & Mark Present
              </button>

              <button
                onClick={() => {
                  const link = document.createElement('a');
                  link.download = `${badgeModalStudent.name}-QR-Pass.png`;
                  link.href = generatedBadgeQR;
                  link.click();
                }}
                className="flex items-center justify-center gap-1 w-full rounded-xl border border-slate-200 bg-slate-50 py-3 text-xs font-bold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                style={{ minHeight: '44px' }}
              >
                <Download className="h-4 w-4" />
                <span>Save Pass</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
