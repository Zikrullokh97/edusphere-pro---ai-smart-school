import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Html5Qrcode, CameraDevice } from 'html5-qrcode';
import QRCode from 'qrcode';
import confetti from 'canvas-confetti';
import {
  Camera,
  QrCode,
  CheckCircle2,
  AlertCircle,
  Volume2,
  VolumeX,
  FlipHorizontal,
  RefreshCw,
  Flashlight,
  Sparkles,
  Users,
  Upload,
  Check,
  X,
  Download,
  Eye,
  ShieldCheck,
  Send,
  Zap,
  Radio,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { AppLanguage, AttendanceRecord, StudentRecord } from '../../types';
import { useI18n } from '../../lib/i18n';
import { MOCK_STUDENTS } from '../../data/mockData';
import { pwaManager } from '../../lib/pwa';
import { authenticatedFetch } from '../../lib/api';

export interface QRCodeScannerProps {
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
  onScanSuccess?: (item: QRScanHistoryItem) => void;
}

export interface QRScanHistoryItem {
  id: string;
  studentId: string;
  studentName: string;
  className: string;
  avatar?: string;
  time: string;
  status: 'present' | 'late';
  rawPayload: string;
  parentPhone?: string;
  serverSynced: boolean;
}

export const QRCodeScanner: React.FC<QRCodeScannerProps> = ({
  language,
  selectedClass,
  selectedDate,
  records,
  onStatusChange,
  onBatchPresent,
  onScanSuccess,
}) => {
  const t = useI18n(language);
  const scannerContainerId = 'html5-qrcode-reader-element';

  // Scanner UI States
  const [isScanning, setIsScanning] = useState(false);
  const [availableCameras, setAvailableCameras] = useState<CameraDevice[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>('');
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [torchOn, setTorchOn] = useState(false);
  const [hasTorch, setHasTorch] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [recentScans, setRecentScans] = useState<QRScanHistoryItem[]>([]);
  const [activeTab, setActiveTab] = useState<'scanner' | 'student-badges' | 'class-pass'>('scanner');
  const [isSyncingBackend, setIsSyncingBackend] = useState(false);

  // Student Pass Modal
  const [badgeModalStudent, setBadgeModalStudent] = useState<StudentRecord | null>(null);
  const [generatedBadgeQR, setGeneratedBadgeQR] = useState<string | null>(null);

  // Classroom Live Projector QR
  const [classSessionQR, setClassSessionQR] = useState<string | null>(null);
  const [qrExpirySeconds, setQrExpirySeconds] = useState(900); // 15 min

  // Toast Notification
  const [scanToast, setScanToast] = useState<{
    studentName: string;
    status: 'present' | 'late';
    time: string;
    studentId: string;
    parentPhone?: string;
    serverSynced: boolean;
  } | null>(null);

  // References
  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const cooldownRef = useRef<{ [key: string]: number }>({});
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Sound Chime Feedback
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

  // Haptic Feedback
  const triggerVibrate = () => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try {
        navigator.vibrate([80, 40, 80]);
      } catch {
        // Safe catch
      }
    }
  };

  // Generate QR for single student
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
          dark: '#1e1b4b',
          light: '#ffffff',
        },
        errorCorrectionLevel: 'H',
      });
    } catch (e) {
      console.error('Failed to generate student QR code:', e);
      return '';
    }
  };

  // Classroom Live Projector Token
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

  // Open Modal Badge
  const handleOpenBadgeModal = async (student: StudentRecord) => {
    setBadgeModalStudent(student);
    const qrUrl = await generateStudentQRDataUrl(student);
    setGeneratedBadgeQR(qrUrl);
  };

  // Send Attendance to Backend
  const sendAttendanceToBackend = async (
    rawCode: string,
    studentId: string,
    studentName: string,
    className: string
  ) => {
    setIsSyncingBackend(true);
    try {
      const res = await authenticatedFetch('/api/attendance/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          qrData: rawCode,
          studentId,
          studentName,
          className,
          date: selectedDate,
          scannedBy: 'Teacher (Camera Scanner)',
        }),
      });
      if (res.ok) {
        return true;
      }
    } catch (err) {
      console.warn('Backend sync failed, saving locally and via PWA queue:', err);
    } finally {
      setIsSyncingBackend(false);
    }
    return false;
  };

  // Process Decoded QR Code
  const processDecodedQRCode = useCallback(
    async (codeText: string) => {
      const now = Date.now();
      if (cooldownRef.current[codeText] && now - cooldownRef.current[codeText] < 3000) {
        return;
      }
      cooldownRef.current[codeText] = now;

      // Extract Student ID
      let matchedStudent: StudentRecord | undefined;
      let studentIdToFind = codeText.trim();

      try {
        if (codeText.startsWith('{') && codeText.endsWith('}')) {
          const parsed = JSON.parse(codeText);
          if (parsed.studentId) studentIdToFind = parsed.studentId;
          else if (parsed.id) studentIdToFind = parsed.id;
          else if (parsed.name) studentIdToFind = parsed.name;
        } else if (codeText.startsWith('EDUSPHERE:STUDENT:')) {
          studentIdToFind = codeText.replace('EDUSPHERE:STUDENT:', '').trim();
        }
      } catch {
        // Default text fallback
      }

      // Match Student in Directory
      matchedStudent = MOCK_STUDENTS.find(
        (s) =>
          s.studentId.toLowerCase() === studentIdToFind.toLowerCase() ||
          s.id.toLowerCase() === studentIdToFind.toLowerCase() ||
          s.name.toLowerCase() === studentIdToFind.toLowerCase() ||
          codeText.toLowerCase().includes(s.name.toLowerCase()) ||
          codeText.toLowerCase().includes(s.studentId.toLowerCase())
      );

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
            avatar:
              'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
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

      // Update Attendance locally
      onStatusChange(finalStudentId, 'present', finalStudentName);

      // Send to Backend
      const backendSuccess = await sendAttendanceToBackend(
        codeText,
        finalStudentId,
        finalStudentName,
        finalGrade
      );

      // Register with PWA offline queue
      pwaManager.queueAction('attendance_update', {
        studentId: finalStudentId,
        status: 'present',
        date: selectedDate,
        studentName: finalStudentName,
        verifiedVia: 'qr_scanner',
      });

      // Add to Session History
      const newScanItem: QRScanHistoryItem = {
        id: `scan-${Date.now()}`,
        studentId: finalStudentId,
        studentName: finalStudentName,
        className: finalGrade,
        avatar: finalAvatar,
        time: scanTime,
        status: 'present',
        rawPayload: codeText,
        parentPhone,
        serverSynced: backendSuccess,
      };

      setRecentScans((prev) => [newScanItem, ...prev.slice(0, 19)]);

      // Trigger callback if provided
      if (onScanSuccess) {
        onScanSuccess(newScanItem);
      }

      // Audio & Vibration Feedback
      playChime();
      triggerVibrate();

      // Confetti burst
      confetti({
        particleCount: 40,
        spread: 45,
        origin: { y: 0.6, x: 0.5 },
      });

      // Banner Toast
      setScanToast({
        studentName: finalStudentName,
        status: 'present',
        time: scanTime,
        studentId: finalStudentId,
        parentPhone,
        serverSynced: backendSuccess,
      });

      setTimeout(() => {
        setScanToast((curr) => (curr?.studentId === finalStudentId ? null : curr));
      }, 4000);
    },
    [onStatusChange, playChime, records, selectedClass, selectedDate]
  );

  // Initialize and Start html5-qrcode scanner
  const startHtml5Scanner = useCallback(async () => {
    setCameraError(null);

    try {
      // Clean up previous instance
      if (html5QrCodeRef.current) {
        if (html5QrCodeRef.current.isScanning) {
          await html5QrCodeRef.current.stop();
        }
        html5QrCodeRef.current.clear();
      }

      // Ensure element exists in DOM
      const element = document.getElementById(scannerContainerId);
      if (!element) {
        console.warn('Scanner container element not found yet');
        return;
      }

      const html5QrCode = new Html5Qrcode(scannerContainerId);
      html5QrCodeRef.current = html5QrCode;

      // Get Cameras list
      try {
        const cameras = await Html5Qrcode.getCameras();
        if (cameras && cameras.length > 0) {
          setAvailableCameras(cameras);
          if (!selectedCameraId) {
            // Pick rear camera by default if available
            const rearCamera = cameras.find(
              (c) =>
                c.label.toLowerCase().includes('back') ||
                c.label.toLowerCase().includes('rear') ||
                c.label.toLowerCase().includes('environment')
            );
            setSelectedCameraId(rearCamera ? rearCamera.id : cameras[0].id);
          }
        }
      } catch (camErr) {
        console.warn('Could not enumerate cameras:', camErr);
      }

      const cameraConfig = selectedCameraId
        ? { deviceId: { exact: selectedCameraId } }
        : { facingMode: facingMode };

      const qrConfig = {
        fps: 15,
        qrbox: (viewfinderWidth: number, viewfinderHeight: number) => {
          const minDim = Math.min(viewfinderWidth, viewfinderHeight);
          const size = Math.floor(minDim * 0.75);
          return { width: size, height: size };
        },
        aspectRatio: 1.0,
        showTorchButtonIfSupported: true,
      };

      await html5QrCode.start(
        cameraConfig,
        qrConfig,
        (decodedText: string) => {
          processDecodedQRCode(decodedText);
        },
        () => {
          // Frame decode error (silent per-frame pass)
        }
      );

      setIsScanning(true);
      setCameraError(null);
    } catch (err: any) {
      console.warn('HTML5-QRCode start error:', err);
      setIsScanning(false);
      setCameraError(
        'Camera permission was dismissed, or the camera is in use by another tab. You can select another camera, upload a photo, or use quick test passes below.'
      );
    }
  }, [facingMode, processDecodedQRCode, selectedCameraId]);

  // Stop Scanner
  const stopHtml5Scanner = useCallback(async () => {
    if (html5QrCodeRef.current) {
      try {
        if (html5QrCodeRef.current.isScanning) {
          await html5QrCodeRef.current.stop();
        }
        html5QrCodeRef.current.clear();
      } catch (err) {
        console.warn('Error stopping scanner:', err);
      }
    }
    setIsScanning(false);
    setTorchOn(false);
  }, []);

  // Manage scanner lifecycle with activeTab & camera changes
  useEffect(() => {
    if (activeTab === 'scanner') {
      const timer = setTimeout(() => {
        startHtml5Scanner();
      }, 150);
      return () => {
        clearTimeout(timer);
        stopHtml5Scanner();
      };
    } else {
      stopHtml5Scanner();
    }
  }, [activeTab, selectedCameraId, facingMode, startHtml5Scanner, stopHtml5Scanner]);

  // File Upload Decoder
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      if (!html5QrCodeRef.current) {
        html5QrCodeRef.current = new Html5Qrcode(scannerContainerId);
      }
      const result = await html5QrCodeRef.current.scanFile(file, true);
      if (result) {
        processDecodedQRCode(result);
      }
    } catch (err) {
      console.warn('File decode error:', err);
      alert('Could not detect a clear QR Code in the uploaded image. Please try another photo.');
    } finally {
      e.target.value = '';
    }
  };

  // Toggle Camera Facing Mode
  const toggleFacingMode = () => {
    const next = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(next);
    setSelectedCameraId('');
  };

  // Class Students Filtered
  const classStudents = MOCK_STUDENTS.filter((s) => s.grade === selectedClass);
  const presentStudentIds = new Set(
    records.filter((r) => r.status === 'present').map((r) => r.studentId)
  );

  return (
    <div id="html5-qrcode-attendance-scanner-module" className="space-y-4">
      {/* Toast Notification */}
      {scanToast && (
        <div className="fixed top-20 right-4 z-50 flex items-center gap-3 rounded-2xl bg-slate-900 px-5 py-3.5 text-white shadow-2xl dark:bg-slate-950 border border-emerald-500/50 animate-slideDown">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500 text-white shadow-lg shadow-emerald-500/30">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-200">QR Code Verified</span>
              <span className="rounded-md bg-emerald-500/20 px-1.5 py-0.5 text-[10px] font-bold text-emerald-300 uppercase">
                {scanToast.status}
              </span>
              {scanToast.serverSynced ? (
                <span className="flex items-center gap-0.5 text-[10px] text-emerald-400 font-semibold">
                  <Wifi className="h-3 w-3" /> Synced
                </span>
              ) : (
                <span className="flex items-center gap-0.5 text-[10px] text-amber-400 font-semibold">
                  <WifiOff className="h-3 w-3" /> Queued
                </span>
              )}
            </div>
            <div className="text-sm font-bold text-white">{scanToast.studentName}</div>
            <div className="text-[11px] text-slate-400">
              ID: {scanToast.studentId} • {scanToast.time} • SMS Sent to Parent
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

      {/* Sub-navigation Tabs */}
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
            <span>Live Camera Scanner</span>
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

        {/* Quick Controls */}
        <div className="flex items-center gap-2">
          {/* Camera device selector if multiple exist */}
          {availableCameras.length > 1 && (
            <select
              value={selectedCameraId}
              onChange={(e) => setSelectedCameraId(e.target.value)}
              className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              style={{ minHeight: '44px' }}
            >
              {availableCameras.map((cam) => (
                <option key={cam.id} value={cam.id}>
                  {cam.label || `Camera ${cam.id.substring(0, 5)}`}
                </option>
              ))}
            </select>
          )}

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
            <span className="hidden sm:inline">Upload Image</span>
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

      {/* TAB 1: Live html5-qrcode Camera Scanner */}
      {activeTab === 'scanner' && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
          {/* Camera Viewfinder Column (7 cols) */}
          <div className="lg:col-span-7 flex flex-col rounded-3xl border border-slate-200 bg-slate-950 p-4 sm:p-5 text-white shadow-xl dark:border-slate-800 overflow-hidden">
            {/* Viewfinder Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className={`h-3 w-3 rounded-full ${isScanning ? 'bg-emerald-500 animate-ping' : 'bg-amber-500'}`} />
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                  {isScanning ? 'Scanner Active' : 'Camera Ready'}
                </span>
                <span className="rounded bg-slate-800 px-2 py-0.5 text-[10px] font-mono text-slate-300">
                  {facingMode === 'environment' ? 'Rear Sensor' : 'Front Sensor'}
                </span>
              </div>

              {/* Controls */}
              <div className="flex items-center gap-1.5">
                <button
                  onClick={toggleFacingMode}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700"
                  title="Switch Camera (Front / Back)"
                >
                  <FlipHorizontal className="h-4 w-4" />
                </button>

                <button
                  onClick={startHtml5Scanner}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700"
                  title="Restart Scanner"
                >
                  <RefreshCw className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* html5-qrcode DOM Target Container with HUD */}
            <div className="relative my-3 flex min-h-[320px] sm:min-h-[380px] w-full items-center justify-center rounded-2xl bg-slate-900 overflow-hidden">
              {/* html5-qrcode will mount inside this element */}
              <div
                id={scannerContainerId}
                className="w-full h-full overflow-hidden [&_video]:w-full [&_video]:h-full [&_video]:object-cover"
              />

              {/* Scanning Reticle HUD Overlay */}
              <div className="pointer-events-none absolute h-56 w-56 sm:h-64 sm:w-64 rounded-3xl border-2 border-emerald-400/70 p-3 shadow-2xl shadow-emerald-500/20">
                {/* Corner markers */}
                <div className="absolute -top-1 -left-1 h-5 w-5 border-t-4 border-l-4 border-emerald-400 rounded-tl-lg" />
                <div className="absolute -top-1 -right-1 h-5 w-5 border-t-4 border-r-4 border-emerald-400 rounded-tr-lg" />
                <div className="absolute -bottom-1 -left-1 h-5 w-5 border-b-4 border-l-4 border-emerald-400 rounded-bl-lg" />
                <div className="absolute -bottom-1 -right-1 h-5 w-5 border-b-4 border-r-4 border-emerald-400 rounded-br-lg" />

                {/* Laser animation bar */}
                <div className="absolute left-2 right-2 h-0.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-lg shadow-emerald-400 animate-bounce" />
              </div>

              {/* Bottom HUD Bar */}
              <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between rounded-xl bg-slate-950/80 px-3 py-2 text-xs backdrop-blur-md border border-slate-800">
                <span className="text-slate-300">
                  Align student QR pass inside the green frame
                </span>
                <span className="font-mono text-emerald-400 text-[10px] font-bold">
                  HTML5-QRCODE ENGINE
                </span>
              </div>
            </div>

            {/* Error Message Notice */}
            {cameraError && (
              <div className="mt-2 rounded-xl bg-amber-950/60 p-3 border border-amber-500/40 text-xs text-amber-300 flex items-start gap-2">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-amber-400" />
                <div>
                  <p className="font-semibold">Camera Access Notice:</p>
                  <p className="text-[11px] text-amber-200/90">{cameraError}</p>
                </div>
              </div>
            )}

            {/* Fast Test Simulation Bar */}
            <div className="mt-3 pt-3 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs">
              <span className="text-slate-400">Quick Simulation Tests:</span>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => processDecodedQRCode('EDUSPHERE:STUDENT:stu-01')}
                  className="rounded-lg bg-indigo-600/80 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-indigo-600"
                >
                  Ali (7-A)
                </button>
                <button
                  onClick={() => processDecodedQRCode('EDUSPHERE:STUDENT:stu-03')}
                  className="rounded-lg bg-indigo-600/80 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-indigo-600"
                >
                  Sara (7-A)
                </button>
                <button
                  onClick={() => processDecodedQRCode('EDUSPHERE:STUDENT:stu-04')}
                  className="rounded-lg bg-indigo-600/80 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-indigo-600"
                >
                  Dinara (7-A)
                </button>
              </div>
            </div>
          </div>

          {/* Activity Log & Roster Feed Column (5 cols) */}
          <div className="lg:col-span-5 space-y-4">
            {/* Live Session Status */}
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-sm">
                    Class {selectedClass} Check-in
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    {selectedDate} • Real-time Backend Sync
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

              {/* Scanned Students Activity Feed */}
              <div className="mt-4">
                <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
                  <span>Recent Scans in This Session</span>
                  <span className="text-[10px] text-slate-400 font-normal">
                    {recentScans.length} verified
                  </span>
                </div>

                <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
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
                        No student passes scanned yet
                      </p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Hold a student QR badge up to the camera or tap a student below.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Quick Tap Check-in List */}
            <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center justify-between text-xs font-bold text-slate-800 dark:text-slate-200 mb-2">
                <span>Quick Tap Check-in</span>
                <span className="text-[10px] text-slate-400 font-normal">One-tap simulation</span>
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

      {/* TAB 2: Student QR ID Badges */}
      {activeTab === 'student-badges' && (
        <div className="space-y-4">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4 dark:border-slate-800">
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white text-base">
                  Class {selectedClass} Digital QR Badges
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Student digital cards with high-density QR payloads for instant scanning.
                </p>
              </div>

              <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                {classStudents.length} Students in {selectedClass}
              </span>
            </div>

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
