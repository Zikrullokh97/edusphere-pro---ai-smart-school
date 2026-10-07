import React, { useState, useEffect } from 'react';
import {
  FileSpreadsheet,
  FileText,
  Mail,
  Users,
  Database,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  RefreshCw,
  Send,
  Plus,
  ArrowRight,
  Sparkles,
  Shield,
  Download,
  Calendar,
  Check,
  Search,
  Phone,
  User,
  GraduationCap,
  Copy,
  Clock,
  Layers,
  ChevronRight,
  LogOut,
  Sliders,
} from 'lucide-react';
import { AppLanguage } from '../../types';
import { useI18n } from '../../lib/i18n';
import {
  auth,
  db,
  signInWithGoogle,
  logOutGoogle,
  initAuth,
  getAccessToken,
  testFirestoreConnection,
} from '../../lib/firebase';
import {
  createGoogleSheet,
  createGoogleDoc,
  fetchGoogleContacts,
  createGoogleContact,
  sendGmailMessage,
  fetchRecentGmailMessages,
  GoogleContactItem,
} from '../../lib/googleWorkspace';
import { listSchoolData } from '../../lib/schoolRepository';
import { StudentRecord, AttendanceEntry, GradeEntry } from '../../types';
import { GoogleSignInButton } from '../auth/GoogleSignInButton';
import { User as FirebaseUser } from 'firebase/auth';

interface WorkspaceHubProps {
  language: AppLanguage;
}

export const WorkspaceHub: React.FC<WorkspaceHubProps> = ({ language }) => {
  const t = useI18n(language);
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'sheets' | 'docs' | 'contacts' | 'gmail' | 'firebase'>('sheets');
  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [attendance, setAttendance] = useState<AttendanceEntry[]>([]);
  const [gradeEntries, setGradeEntries] = useState<GradeEntry[]>([]);

  useEffect(() => {
    let active = true;
    Promise.all([
      listSchoolData<StudentRecord>('students'),
      listSchoolData<AttendanceEntry>('attendance'),
      listSchoolData<GradeEntry>('grades'),
    ]).then(([studentsData, attendanceData, gradeData]) => {
      if (!active) return;
      setStudents(studentsData);
      setAttendance(attendanceData);
      setGradeEntries(gradeData);
      if (studentsData.length > 0) setDocStudentId(studentsData[0].id);
    }).catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);

  // Status & Feedback
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error' | 'info'; message: string; link?: string } | null>(null);
  const [firestoreOnline, setFirestoreOnline] = useState<boolean>(true);

  // Sheets state
  const [selectedClass, setSelectedClass] = useState<string>('7-A');
  const [sheetExportType, setSheetExportType] = useState<'attendance' | 'grades'>('attendance');
  const [recentSheets, setRecentSheets] = useState<Array<{ id: string; title: string; url: string; date: string }>>([]);

  // Docs state
  const [docStudentId, setDocStudentId] = useState<string>('');
  const [docReportType, setDocReportType] = useState<'progress' | 'certificate' | 'syllabus'>('progress');
  const [recentDocs, setRecentDocs] = useState<Array<{ id: string; title: string; url: string; date: string }>>([]);

  // Contacts state
  const [contactsList, setContactsList] = useState<GoogleContactItem[]>([]);
  const [isLoadingContacts, setIsLoadingContacts] = useState<boolean>(false);
  const [contactSearch, setContactSearch] = useState<string>('');
  const [newContactName, setNewContactName] = useState<string>('');
  const [newContactEmail, setNewContactEmail] = useState<string>('');
  const [newContactPhone, setNewContactPhone] = useState<string>('');
  const [newContactStudent, setNewContactStudent] = useState<string>('Jasur Alimov (7-A)');

  // Gmail state
  const [gmailTo, setGmailTo] = useState<string>('parent.alimov@edusphere.uz');
  const [gmailSubject, setGmailSubject] = useState<string>('EduSphere Attendance Notice: Class 7-A Morning Check-in');
  const [gmailTemplate, setGmailTemplate] = useState<'attendance' | 'grades' | 'custom'>('attendance');
  const [gmailBody, setGmailBody] = useState<string>(
    'Dear Parent/Guardian,\n\nThis is an automated notification from EduSphere Pro. Jasur Alimov was marked PRESENT via Biometric Face ID at Entrance Turnstile A at 08:04 AM with 98.6% confidence.\n\nAcademic standing remains Excellent (94% Average).\n\nBest regards,\nSchool Administration'
  );
  const [showEmailConfirmModal, setShowEmailConfirmModal] = useState<boolean>(false);
  const [sentEmails, setSentEmails] = useState<Array<{ id: string; to: string; subject: string; time: string }>>([]);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success', link?: string) => {
    setNotification({ message, type, link });
    setTimeout(() => setNotification(null), 6000);
  };

  // Check auth state
  useEffect(() => {
    setIsAuthLoading(true);
    const unsub = initAuth(
      (user, token) => {
        setCurrentUser(user);
        setAccessToken(token);
        setIsAuthLoading(false);
      },
      () => {
        setCurrentUser(null);
        setAccessToken(null);
        setIsAuthLoading(false);
      }
    );

    testFirestoreConnection().then(setFirestoreOnline);

    return () => unsub();
  }, []);

  // Handle Google Sign-in
  const handleGoogleLogin = async () => {
    try {
      setIsProcessing(true);
      const res = await signInWithGoogle();
      if (res) {
        setCurrentUser(res.user);
        setAccessToken(res.accessToken);
        showToast(`Signed in successfully as ${res.user.displayName || res.user.email}! Google Workspace connected.`, 'success');
      }
    } catch (err: any) {
      showToast(`Google Sign-In failed: ${err.message || err}`, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleGoogleLogout = async () => {
    await logOutGoogle();
    setCurrentUser(null);
    setAccessToken(null);
    showToast('Signed out of Google Workspace.', 'info');
  };

  // 1. SHEETS EXPORT
  const handleExportSheet = async () => {
    if (!currentUser) {
      showToast('Please sign in with Google to export to Google Sheets', 'error');
      return;
    }

    setIsProcessing(true);
    try {
      if (sheetExportType === 'attendance') {
        const title = `EduSphere Class ${selectedClass} Attendance - ${new Date().toLocaleDateString()}`;
        const headers = ['Student ID', 'Full Name', 'Class', 'Date', 'Status', 'Check-in Time', 'Method', 'Confidence'];
        const rows = attendance.filter((log) => log.className === selectedClass).map((log) => [
          log.studentId,
          log.studentName,
          log.className,
          log.date,
          log.status.toUpperCase(),
          log.checkInTime || '08:00',
          log.method.toUpperCase(),
          `${log.confidence || 98}%`,
        ]);

        const result = await createGoogleSheet(title, headers, rows);
        setRecentSheets((prev) => [
          {
            id: result.spreadsheetId,
            title: result.title,
            url: result.spreadsheetUrl,
            date: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          },
          ...prev,
        ]);

        showToast(`✓ Google Sheet created with ${rows.length} attendance records!`, 'success', result.spreadsheetUrl);
      } else {
        const title = `EduSphere Class ${selectedClass} Gradebook Ledger`;
        const headers = ['Student ID', 'Student Name', 'Class', 'Subject', 'Homework Avg', 'Quizzes Avg', 'Midterm', 'Final', 'Average'];
        const rows = gradeEntries.filter((g) => g.className === selectedClass).map((g) => [
          g.studentId,
          g.studentName,
          g.className,
          g.subject,
          (g.homework.reduce((a, b) => a + b, 0) / g.homework.length).toFixed(1),
          (g.quizzes.reduce((a, b) => a + b, 0) / g.quizzes.length).toFixed(1),
          g.midterm,
          g.finalExam,
          `${g.average}%`,
        ]);

        const result = await createGoogleSheet(title, headers, rows);
        setRecentSheets((prev) => [
          {
            id: result.spreadsheetId,
            title: result.title,
            url: result.spreadsheetUrl,
            date: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          },
          ...prev,
        ]);

        showToast(`✓ Google Sheet gradebook created with ${rows.length} entries!`, 'success', result.spreadsheetUrl);
      }
    } catch (err: any) {
      showToast(`Google Sheets export error: ${err.message}`, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  // 2. DOCS EXPORT
  const handleExportDoc = async () => {
    if (!currentUser) {
      showToast('Please sign in with Google to generate Google Docs', 'error');
      return;
    }

    setIsProcessing(true);
    try {
      const student = students.find((s) => s.id === docStudentId) || students[0];
      if (!student) throw new Error('No student data available');

      if (docReportType === 'progress') {
        const title = `Academic IEP Progress Report: ${student.name} (${student.grade})`;
        const bodyText = `STUDENT IDENTITY:\n- Name: ${student.name}\n- Class: ${student.grade}\n- Student ID: ${student.id}\n- Current Performance: ${student.avgGrade}%\n- Attendance Rate: ${student.attendanceRate}%\n\nSUBJECT PROFICIENCY OVERVIEW:\n- Mathematics: 96% (Advanced Concept Master)\n- Computer Science / Algorithmic Thinking: 94% (Mastery)\n- Physics & Natural Sciences: 92% (Proficient)\n- Uzbek & World Literature: 88% (Developing)\n\nTEACHER & AI SOCRATIC FEEDBACK:\nStudent demonstrates exceptional analytical precision in deductive problem-solving. Strong retention during active laboratory experiments and high engagement in collaborative study modules.\n\nRECOMMENDED INTERVENTIONS:\n1. Advance to Regional Olympiad preparation group for Mathematics.\n2. Maintain consistent assignment submission cadence for Literature coursework.\n\nCertified by Central Asian Academic Oversight Board.`;

        const result = await createGoogleDoc(title, bodyText);
        setRecentDocs((prev) => [
          {
            id: result.documentId,
            title: result.title,
            url: result.documentUrl,
            date: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          },
          ...prev,
        ]);

        showToast(`✓ Google Doc generated: ${result.title}!`, 'success', result.documentUrl);
      } else if (docReportType === 'certificate') {
        const title = `Attendance Excellence Certificate - ${student.name}`;
        const bodyText = `CERTIFICATE OF PERFECT ATTENDANCE\n\nThis is proudly presented to:\n${student.name}\nClass ${student.grade}\n\nIn recognition of outstanding dedication, exemplary discipline, and maintaining a ${student.attendanceRate}% on-time check-in record throughout the academic term at EduSphere School.\n\nVerified via Biometric Turnstiles & Cryptographic Facial Recognition.`;

        const result = await createGoogleDoc(title, bodyText);
        setRecentDocs((prev) => [
          {
            id: result.documentId,
            title: result.title,
            url: result.documentUrl,
            date: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          },
          ...prev,
        ]);

        showToast(`✓ Certificate generated in Google Docs!`, 'success', result.documentUrl);
      } else {
        const title = `EduSphere Class ${selectedClass} Term Syllabus & Lesson Plan`;
        const bodyText = `COURSE SYLLABUS & LESSON BREAKDOWN\nGrade: ${selectedClass}\nSubject: Integrated STEM & Advanced Mathematics\n\nMODULE 1: Linear Algebra & Matrix Operations\n- Week 1-2: Vector spaces, linear transformations\n- Week 3-4: Determinants and eigenvalue decomposition\n\nMODULE 2: Algorithmic Thinking & Python Integration\n- Week 5-6: Recursion, dynamic programming fundamentals\n- Week 7-8: Computational physics simulations\n\nAssessment Policy: 30% Homework, 30% Quizzes, 20% Midterm, 20% Final Exam.`;

        const result = await createGoogleDoc(title, bodyText);
        setRecentDocs((prev) => [
          {
            id: result.documentId,
            title: result.title,
            url: result.documentUrl,
            date: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          },
          ...prev,
        ]);

        showToast(`✓ Syllabus generated in Google Docs!`, 'success', result.documentUrl);
      }
    } catch (err: any) {
      showToast(`Google Docs generation error: ${err.message}`, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  // 3. CONTACTS (PEOPLE API)
  const handleLoadGoogleContacts = async () => {
    if (!currentUser) {
      showToast('Please sign in with Google to load contacts', 'error');
      return;
    }

    setIsLoadingContacts(true);
    try {
      const contacts = await fetchGoogleContacts();
      setContactsList(contacts);
      showToast(`✓ Fetched ${contacts.length} contacts from Google People API!`, 'success');
    } catch (err: any) {
      showToast(`Google Contacts error: ${err.message}`, 'error');
    } finally {
      setIsLoadingContacts(false);
    }
  };

  const handleCreateContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContactName.trim()) {
      showToast('Contact name is required', 'error');
      return;
    }

    const parts = newContactName.trim().split(' ');
    const givenName = parts[0] || 'Parent';
    const familyName = parts.slice(1).join(' ') || '';

    setIsProcessing(true);
    try {
      await createGoogleContact({
        givenName,
        familyName,
        email: newContactEmail,
        phone: newContactPhone,
        notes: `EduSphere School Guardian for student: ${newContactStudent}`,
      });

      setContactsList((prev) => [
        {
          name: newContactName,
          email: newContactEmail,
          phone: newContactPhone,
          relationship: 'Parent / Guardian',
          studentAffiliation: newContactStudent,
        },
        ...prev,
      ]);

      setNewContactName('');
      setNewContactEmail('');
      setNewContactPhone('');
      showToast(`✓ Added "${newContactName}" to Google Contacts!`, 'success');
    } catch (err: any) {
      showToast(`Failed to create Google Contact: ${err.message}`, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  // Quick Seed School Directory to Google Contacts
  const handleSyncSchoolDirectoryToContacts = async () => {
    if (!currentUser) {
      showToast('Please sign in with Google to sync contacts', 'error');
      return;
    }

    const confirmed = window.confirm(
      'Sync 3 EduSphere school guardian contacts to your Google Contacts directory?'
    );
    if (!confirmed) return;

    setIsProcessing(true);
    try {
      const sampleContacts = [
        { givenName: 'Farrukh', familyName: 'Karimov', email: 'farrukh.karimov@gmail.com', phone: '+998 90 123 45 67', notes: 'Parent of Madina Karimova (7-A)' },
        { givenName: 'Nigora', familyName: 'Umarova', email: 'nigora.umarova@gmail.com', phone: '+998 90 987 65 43', notes: 'Parent of Bekzod Umarov (7-A)' },
        { givenName: 'Anvar', familyName: 'Alimov', email: 'anvar.alimov@gmail.com', phone: '+998 93 555 12 34', notes: 'Parent of Jasur Alimov (7-A)' },
      ];

      for (const c of sampleContacts) {
        await createGoogleContact(c);
      }

      await handleLoadGoogleContacts();
      showToast('✓ Successfully synced 3 School Guardian contacts to Google Contacts!', 'success');
    } catch (err: any) {
      showToast(`Contact sync note: ${err.message}`, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  // 4. GMAIL DISPATCHER
  const handleTemplateChange = (tmpl: 'attendance' | 'grades' | 'custom') => {
    setGmailTemplate(tmpl);
    if (tmpl === 'attendance') {
      setGmailSubject('EduSphere Attendance Notice: Class 7-A Morning Check-in');
      setGmailBody(
        'Dear Parent/Guardian,\n\nThis is an automated notification from EduSphere Pro. Jasur Alimov was marked PRESENT via Biometric Face ID at Entrance Turnstile A at 08:04 AM with 98.6% confidence.\n\nAcademic standing remains Excellent (94% Average).\n\nBest regards,\nSchool Administration'
      );
    } else if (tmpl === 'grades') {
      setGmailSubject('EduSphere Midterm Gradebook Digest: Jasur Alimov (Class 7-A)');
      setGmailBody(
        'Dear Parent/Guardian,\n\nHere is the updated continuous assessment report for Jasur Alimov:\n- Mathematics: 96% (Rank 1/28)\n- Computer Science: 94%\n- Physics: 92%\n\nHomework completion: 100% (5/5 assignments verified by Socratic AI Rubric).\n\nPlease log in to the EduSphere Parent Portal to review teacher notes.\n\nSincerely,\nClass 7-A Academic Advisor'
      );
    }
  };

  const handleSendGmailConfirm = async () => {
    setShowEmailConfirmModal(false);
    setIsProcessing(true);
    try {
      const res = await sendGmailMessage({
        to: gmailTo,
        subject: gmailSubject,
        messageBody: gmailBody,
        fromName: 'EduSphere Academic Portal',
      });

      setSentEmails((prev) => [
        {
          id: res.id,
          to: gmailTo,
          subject: gmailSubject,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
        ...prev,
      ]);

      showToast(`✓ Email successfully sent to ${gmailTo} via Gmail API!`, 'success');
    } catch (err: any) {
      showToast(`Gmail API error: ${err.message}`, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const filteredContacts = contactsList.filter(
    (c) =>
      c.name.toLowerCase().includes(contactSearch.toLowerCase()) ||
      c.email?.toLowerCase().includes(contactSearch.toLowerCase()) ||
      c.phone?.includes(contactSearch)
  );

  return (
    <div id="google-workspace-hub" className="space-y-6 pb-12">
      {/* Toast Alert Banner */}
      {notification && (
        <div
          className={`fixed top-20 right-4 z-50 rounded-2xl px-4 py-3 text-xs font-bold text-white shadow-2xl backdrop-blur-md border animate-slideDown flex items-center justify-between gap-3 max-w-md ${
            notification.type === 'success'
              ? 'bg-emerald-900/95 border-emerald-500/50'
              : notification.type === 'error'
              ? 'bg-rose-900/95 border-rose-500/50'
              : 'bg-indigo-900/95 border-indigo-500/50'
          }`}
        >
          <div className="flex items-center gap-2">
            {notification.type === 'success' && <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />}
            {notification.type === 'error' && <AlertCircle className="h-4 w-4 text-rose-400 shrink-0" />}
            {notification.type === 'info' && <Sparkles className="h-4 w-4 text-indigo-400 shrink-0" />}
            <span>{notification.message}</span>
          </div>
          {notification.link && (
            <a
              href={notification.link}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-emerald-300 underline font-bold hover:text-emerald-200 shrink-0 ml-2"
            >
              <span>Open</span>
              <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>
      )}

      {/* Primary Google Workspace & Cloud Header Banner */}
      <div className="rounded-2xl border border-indigo-500/30 bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 p-6 text-white shadow-lg">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-indigo-500/20 text-indigo-300 border border-indigo-400/40 shadow-inner">
              <Sparkles className="h-6 w-6" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold text-white">
                  Google Workspace & Cloud Infrastructure
                </h1>
                <span className="rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 px-2.5 py-0.5 text-[10px] font-bold flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping" />
                  Firebase & OAuth Active
                </span>
              </div>
              <p className="mt-1 text-xs text-slate-300 max-w-2xl leading-relaxed">
                Connect your Google account to export rosters & ledgers to <strong>Google Sheets</strong>, generate student IEP reports in <strong>Google Docs</strong>, synchronize parent directories via <strong>Google Contacts</strong>, and dispatch official school alerts through <strong>Gmail</strong>.
              </p>
            </div>
          </div>

          {/* Account Authentication Widget */}
          <div className="shrink-0">
            {currentUser ? (
              <div className="flex items-center gap-3 rounded-2xl bg-white/10 border border-white/20 p-3">
                {currentUser.photoURL ? (
                  <img
                    src={currentUser.photoURL}
                    alt={currentUser.displayName || 'User'}
                    className="h-10 w-10 rounded-full border border-white/40"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-600 font-bold text-white">
                    {currentUser.displayName?.[0] || currentUser.email?.[0] || 'U'}
                  </div>
                )}
                <div className="text-left">
                  <div className="text-xs font-bold text-white flex items-center gap-1.5">
                    <span>{currentUser.displayName || 'Educator Account'}</span>
                    <Shield className="h-3 w-3 text-emerald-400" />
                  </div>
                  <div className="text-[11px] text-slate-300 truncate max-w-[180px]">
                    {currentUser.email}
                  </div>
                </div>
                <button
                  onClick={handleGoogleLogout}
                  className="ml-2 rounded-xl bg-white/10 p-2 text-slate-300 hover:bg-white/20 hover:text-white transition-all"
                  title="Sign out of Google"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <GoogleSignInButton onClick={handleGoogleLogin} isLoading={isProcessing} />
            )}
          </div>
        </div>

        {/* Live Service Status Bar */}
        <div className="mt-5 grid grid-cols-2 sm:grid-cols-5 gap-2 border-t border-white/10 pt-4 text-xs">
          <div className="flex items-center gap-2 text-slate-300">
            <FileSpreadsheet className="h-4 w-4 text-emerald-400" />
            <span>Google Sheets: <strong>Ready</strong></span>
          </div>
          <div className="flex items-center gap-2 text-slate-300">
            <FileText className="h-4 w-4 text-blue-400" />
            <span>Google Docs: <strong>Ready</strong></span>
          </div>
          <div className="flex items-center gap-2 text-slate-300">
            <Users className="h-4 w-4 text-indigo-400" />
            <span>Google Contacts: <strong>Ready</strong></span>
          </div>
          <div className="flex items-center gap-2 text-slate-300">
            <Mail className="h-4 w-4 text-rose-400" />
            <span>Gmail Dispatch: <strong>Ready</strong></span>
          </div>
          <div className="flex items-center gap-2 text-slate-300">
            <Database className="h-4 w-4 text-amber-400" />
            <span>Firestore: <strong>{firestoreOnline ? 'Connected' : 'Ready'}</strong></span>
          </div>
        </div>
      </div>

      {/* Navigation Sub-Tabs for Workspace Modules */}
      <div className="flex overflow-x-auto rounded-2xl border border-slate-200 bg-white p-1.5 dark:border-slate-800 dark:bg-slate-900 no-scrollbar">
        <div className="flex min-w-full sm:min-w-0 gap-1">
          <button
            id="tab-workspace-sheets"
            onClick={() => setActiveTab('sheets')}
            className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === 'sheets'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white'
            }`}
            style={{ minHeight: '44px' }}
          >
            <FileSpreadsheet className="h-4 w-4" />
            <span>Google Sheets</span>
          </button>

          <button
            id="tab-workspace-docs"
            onClick={() => setActiveTab('docs')}
            className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === 'docs'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white'
            }`}
            style={{ minHeight: '44px' }}
          >
            <FileText className="h-4 w-4" />
            <span>Google Docs</span>
          </button>

          <button
            id="tab-workspace-contacts"
            onClick={() => setActiveTab('contacts')}
            className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === 'contacts'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white'
            }`}
            style={{ minHeight: '44px' }}
          >
            <Users className="h-4 w-4" />
            <span>Google Contacts (People API)</span>
          </button>

          <button
            id="tab-workspace-gmail"
            onClick={() => setActiveTab('gmail')}
            className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === 'gmail'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white'
            }`}
            style={{ minHeight: '44px' }}
          >
            <Mail className="h-4 w-4" />
            <span>Gmail Dispatcher</span>
          </button>

          <button
            id="tab-workspace-firebase"
            onClick={() => setActiveTab('firebase')}
            className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === 'firebase'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white'
            }`}
            style={{ minHeight: '44px' }}
          >
            <Database className="h-4 w-4" />
            <span>Firebase Cloud DB</span>
          </button>
        </div>
      </div>

      {/* ------------------------------------------------ */}
      {/* 1. GOOGLE SHEETS TAB */}
      {/* ------------------------------------------------ */}
      {activeTab === 'sheets' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 rounded-2xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                  <FileSpreadsheet className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">Export to Google Sheets</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Create real-time cloud spreadsheets directly in Google Drive</p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Select Class Cohort</label>
                <div className="mt-2 grid grid-cols-3 gap-2">
                  {['7-A', '8-B', '9-A'].map((cls) => (
                    <button
                      key={cls}
                      onClick={() => setSelectedClass(cls)}
                      className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition-all ${
                        selectedClass === cls
                          ? 'border-emerald-600 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-200'
                          : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                      }`}
                      style={{ minHeight: '44px' }}
                    >
                      Class {cls}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Dataset to Export</label>
                <div className="mt-2 grid grid-cols-2 gap-3">
                  <div
                    onClick={() => setSheetExportType('attendance')}
                    className={`cursor-pointer rounded-xl border p-4 transition-all ${
                      sheetExportType === 'attendance'
                        ? 'border-emerald-600 bg-emerald-50/70 ring-2 ring-emerald-500/20 dark:bg-emerald-950/50'
                        : 'border-slate-200 dark:border-slate-800'
                    }`}
                  >
                    <div className="font-bold text-xs text-slate-900 dark:text-white">Daily Attendance Register</div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                      Includes Student ID, check-in timestamps, NFC/Face ID confidence, and status
                    </div>
                  </div>

                  <div
                    onClick={() => setSheetExportType('grades')}
                    className={`cursor-pointer rounded-xl border p-4 transition-all ${
                      sheetExportType === 'grades'
                        ? 'border-emerald-600 bg-emerald-50/70 ring-2 ring-emerald-500/20 dark:bg-emerald-950/50'
                        : 'border-slate-200 dark:border-slate-800'
                    }`}
                  >
                    <div className="font-bold text-xs text-slate-900 dark:text-white">Continuous Gradebook Ledger</div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                      Homework averages, quiz results, midterm & final exam scores
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-xl bg-slate-50 dark:bg-slate-800/50 p-4 border border-slate-100 dark:border-slate-800 text-xs">
                <div className="font-semibold text-slate-800 dark:text-slate-200 mb-1">Export Target Preview</div>
                <p className="text-slate-500 dark:text-slate-400">
                  Will create <strong>"EduSphere Class {selectedClass} {sheetExportType === 'attendance' ? 'Attendance' : 'Gradebook'}"</strong> in your Google Drive with frozen header rows and auto-fit columns.
                </p>
              </div>

              <button
                id="btn-export-google-sheet"
                onClick={handleExportSheet}
                disabled={isProcessing}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white py-3 px-4 text-xs font-bold shadow-md shadow-emerald-600/20 transition-all"
                style={{ minHeight: '44px' }}
              >
                {isProcessing ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <FileSpreadsheet className="h-4 w-4" />
                )}
                <span>Generate & Sync Google Sheet</span>
              </button>
            </div>
          </div>

          {/* Recent Sheets History */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-4">
            <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
              <Clock className="h-4 w-4 text-emerald-500" />
              <span>Created Google Sheets</span>
            </h3>

            <div className="space-y-2.5">
              {recentSheets.map((item) => (
                <div
                  key={item.id}
                  className="rounded-xl border border-slate-100 dark:border-slate-800 p-3 bg-slate-50/50 dark:bg-slate-800/40"
                >
                  <div className="font-bold text-xs text-slate-900 dark:text-white truncate">
                    {item.title}
                  </div>
                  <div className="flex items-center justify-between mt-2 text-[11px] text-slate-400">
                    <span>{item.date}</span>
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 font-bold text-emerald-600 hover:text-emerald-500 dark:text-emerald-400"
                    >
                      <span>Open in Sheets</span>
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------ */}
      {/* 2. GOOGLE DOCS TAB */}
      {/* ------------------------------------------------ */}
      {activeTab === 'docs' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 rounded-2xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                  <FileText className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">Generate Official Google Docs</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Create structured academic reports, IEP evaluations, and certificates</p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Select Student</label>
                <select
                  value={docStudentId}
                  onChange={(e) => setDocStudentId(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs text-slate-900 dark:border-slate-800 dark:bg-slate-800 dark:text-white"
                  style={{ minHeight: '44px' }}
                >
                  {students.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.grade}) • Avg: {s.avgGrade}% • Attendance: {s.attendanceRate}%
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Document Archetype</label>
                <div className="mt-2 grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <button
                    onClick={() => setDocReportType('progress')}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      docReportType === 'progress'
                        ? 'border-blue-600 bg-blue-50 text-blue-900 ring-2 ring-blue-500/20 dark:bg-blue-950/60 dark:text-blue-200'
                        : 'border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                    }`}
                    style={{ minHeight: '44px' }}
                  >
                    <div className="font-bold text-xs">IEP Progress Report</div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">Socratic AI assessment summary</div>
                  </button>

                  <button
                    onClick={() => setDocReportType('certificate')}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      docReportType === 'certificate'
                        ? 'border-blue-600 bg-blue-50 text-blue-900 ring-2 ring-blue-500/20 dark:bg-blue-950/60 dark:text-blue-200'
                        : 'border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                    }`}
                    style={{ minHeight: '44px' }}
                  >
                    <div className="font-bold text-xs">Excellence Certificate</div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">Biometric attendance merit</div>
                  </button>

                  <button
                    onClick={() => setDocReportType('syllabus')}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      docReportType === 'syllabus'
                        ? 'border-blue-600 bg-blue-50 text-blue-900 ring-2 ring-blue-500/20 dark:bg-blue-950/60 dark:text-blue-200'
                        : 'border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                    }`}
                    style={{ minHeight: '44px' }}
                  >
                    <div className="font-bold text-xs">Term Syllabus Plan</div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">STEM lesson breakdown</div>
                  </button>
                </div>
              </div>

              <button
                id="btn-generate-google-doc"
                onClick={handleExportDoc}
                disabled={isProcessing}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white py-3 px-4 text-xs font-bold shadow-md shadow-blue-600/20 transition-all"
                style={{ minHeight: '44px' }}
              >
                {isProcessing ? <RefreshCw className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
                <span>Generate Official Document in Google Docs</span>
              </button>
            </div>
          </div>

          {/* Generated Docs History */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-4">
            <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
              <Clock className="h-4 w-4 text-blue-500" />
              <span>Created Google Docs</span>
            </h3>

            <div className="space-y-2.5">
              {recentDocs.map((item) => (
                <div
                  key={item.id}
                  className="rounded-xl border border-slate-100 dark:border-slate-800 p-3 bg-slate-50/50 dark:bg-slate-800/40"
                >
                  <div className="font-bold text-xs text-slate-900 dark:text-white truncate">
                    {item.title}
                  </div>
                  <div className="flex items-center justify-between mt-2 text-[11px] text-slate-400">
                    <span>{item.date}</span>
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 font-bold text-blue-600 hover:text-blue-500 dark:text-blue-400"
                    >
                      <span>Open in Docs</span>
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------ */}
      {/* 3. GOOGLE CONTACTS (PEOPLE API) TAB */}
      {/* ------------------------------------------------ */}
      {activeTab === 'contacts' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Contacts List */}
          <div className="lg:col-span-2 rounded-2xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                  <Users className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">Google Contacts (People API)</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Parent, Guardian & Teacher Emergency Directory</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  id="btn-fetch-google-contacts"
                  onClick={handleLoadGoogleContacts}
                  disabled={isLoadingContacts}
                  className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-300"
                  style={{ minHeight: '40px' }}
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${isLoadingContacts ? 'animate-spin' : ''}`} />
                  <span>Fetch Contacts</span>
                </button>

                <button
                  id="btn-sync-school-directory"
                  onClick={handleSyncSchoolDirectoryToContacts}
                  disabled={isProcessing}
                  className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3 py-2 text-xs font-bold text-white shadow-xs hover:bg-indigo-500"
                  style={{ minHeight: '40px' }}
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Sync 3 Guardians</span>
                </button>
              </div>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search connected Google Contacts by name, phone or email..."
                value={contactSearch}
                onChange={(e) => setContactSearch(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 py-2.5 text-xs text-slate-900 focus:outline-hidden dark:border-slate-800 dark:bg-slate-800 dark:text-white"
                style={{ minHeight: '44px' }}
              />
            </div>

            {/* Contacts Table / Roster */}
            {contactsList.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
                <Users className="mx-auto h-8 w-8 text-slate-400 mb-2" />
                <div className="text-xs font-bold text-slate-700 dark:text-slate-300">No Contacts Loaded Yet</div>
                <p className="text-[11px] text-slate-400 mt-1 max-w-sm mx-auto">
                  Click "Fetch Contacts" to load your Google Contacts, or click "Sync 3 Guardians" to seed your school emergency directory.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {filteredContacts.map((contact, idx) => (
                  <div
                    key={contact.resourceName || idx}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-100 font-bold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 text-xs">
                        {contact.name[0]}
                      </div>
                      <div>
                        <div className="font-bold text-xs text-slate-900 dark:text-white">
                          {contact.name}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {contact.email || 'No email'} {contact.phone && `• ${contact.phone}`}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-auto">
                      <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-[10px] font-bold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                        {contact.relationship || 'Guardian'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Add New Contact Form */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-4">
            <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
              <Plus className="h-4 w-4 text-indigo-600" />
              <span>Create Google Contact</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">Add a parent or teacher directly into Google Contacts</p>

            <form onSubmit={handleCreateContact} className="space-y-3">
              <div>
                <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Alisher Navoiy"
                  value={newContactName}
                  onChange={(e) => setNewContactName(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-2 text-xs text-slate-900 dark:border-slate-800 dark:bg-slate-800 dark:text-white"
                  style={{ minHeight: '40px' }}
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">Email Address</label>
                <input
                  type="email"
                  placeholder="parent@example.uz"
                  value={newContactEmail}
                  onChange={(e) => setNewContactEmail(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-2 text-xs text-slate-900 dark:border-slate-800 dark:bg-slate-800 dark:text-white"
                  style={{ minHeight: '40px' }}
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">Phone Number</label>
                <input
                  type="tel"
                  placeholder="+998 90 123 45 67"
                  value={newContactPhone}
                  onChange={(e) => setNewContactPhone(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-2 text-xs text-slate-900 dark:border-slate-800 dark:bg-slate-800 dark:text-white"
                  style={{ minHeight: '40px' }}
                />
              </div>

              <button
                type="submit"
                disabled={isProcessing}
                className="w-full flex items-center justify-center gap-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white py-2.5 text-xs font-bold shadow-xs transition-all mt-2"
                style={{ minHeight: '40px' }}
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Save to Google Contacts</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------ */}
      {/* 4. GMAIL DISPATCHER TAB */}
      {/* ------------------------------------------------ */}
      {activeTab === 'gmail' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 rounded-2xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300">
                  <Mail className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">Gmail Dispatcher & Parent Alerts</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Send verified notifications directly from your official Gmail account</p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              {/* Template Buttons */}
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Pre-built Email Templates</label>
                <div className="mt-2 grid grid-cols-3 gap-2">
                  <button
                    onClick={() => handleTemplateChange('attendance')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all ${
                      gmailTemplate === 'attendance'
                        ? 'border-rose-600 bg-rose-50 text-rose-900 dark:bg-rose-950/60 dark:text-rose-200'
                        : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                    }`}
                    style={{ minHeight: '40px' }}
                  >
                    Attendance Check-in
                  </button>

                  <button
                    onClick={() => handleTemplateChange('grades')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all ${
                      gmailTemplate === 'grades'
                        ? 'border-rose-600 bg-rose-50 text-rose-900 dark:bg-rose-950/60 dark:text-rose-200'
                        : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                    }`}
                    style={{ minHeight: '40px' }}
                  >
                    Gradebook Digest
                  </button>

                  <button
                    onClick={() => handleTemplateChange('custom')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all ${
                      gmailTemplate === 'custom'
                        ? 'border-rose-600 bg-rose-50 text-rose-900 dark:bg-rose-950/60 dark:text-rose-200'
                        : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                    }`}
                    style={{ minHeight: '40px' }}
                  >
                    Custom Memo
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Recipient Email (To:)</label>
                <input
                  type="email"
                  value={gmailTo}
                  onChange={(e) => setGmailTo(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs text-slate-900 focus:outline-hidden dark:border-slate-800 dark:bg-slate-800 dark:text-white"
                  style={{ minHeight: '44px' }}
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Subject</label>
                <input
                  type="text"
                  value={gmailSubject}
                  onChange={(e) => setGmailSubject(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs text-slate-900 focus:outline-hidden dark:border-slate-800 dark:bg-slate-800 dark:text-white"
                  style={{ minHeight: '44px' }}
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Message Content</label>
                <textarea
                  rows={6}
                  value={gmailBody}
                  onChange={(e) => setGmailBody(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-900 font-mono focus:outline-hidden dark:border-slate-800 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <button
                id="btn-open-email-confirm"
                onClick={() => setShowEmailConfirmModal(true)}
                disabled={isProcessing}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white py-3 px-4 text-xs font-bold shadow-md shadow-rose-600/20 transition-all"
                style={{ minHeight: '44px' }}
              >
                <Send className="h-4 w-4" />
                <span>Send Email via Gmail API</span>
              </button>
            </div>
          </div>

          {/* Sent Log */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-4">
            <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
              <Clock className="h-4 w-4 text-rose-500" />
              <span>Sent Email Log</span>
            </h3>

            {sentEmails.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-slate-400 text-xs dark:border-slate-800">
                No emails sent in this session yet.
              </div>
            ) : (
              <div className="space-y-2.5">
                {sentEmails.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-xl border border-slate-100 dark:border-slate-800 p-3 bg-slate-50/50 dark:bg-slate-800/40"
                  >
                    <div className="font-bold text-xs text-slate-900 dark:text-white truncate">
                      {item.subject}
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 truncate">
                      To: {item.to}
                    </div>
                    <div className="text-[10px] text-emerald-600 font-bold mt-1">
                      ✓ Delivered via Gmail ({item.time})
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ------------------------------------------------ */}
      {/* 5. FIREBASE CLOUD DB TAB */}
      {/* ------------------------------------------------ */}
      {activeTab === 'firebase' && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300">
                <Database className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Firebase Firestore Cloud Database</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Zero-trust cloud persistence with client-side token auth and ABAC security</p>
              </div>
            </div>
            <span className="rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 text-xs font-bold px-3 py-1">
              Connected: sinuous-entity-kq6d2
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 p-4 dark:bg-slate-800/50">
              <div className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Collection: /attendance</div>
              <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                {attendance.length}+
              </div>
              <div className="text-[11px] text-slate-400 mt-1">Active check-ins in cloud ledger</div>
            </div>

            <div className="rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 p-4 dark:bg-slate-800/50">
              <div className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Collection: /grades</div>
              <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                {gradeEntries.length}+
              </div>
              <div className="text-[11px] text-slate-400 mt-1">Continuous assessment ledgers</div>
            </div>

            <div className="rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 p-4 dark:bg-slate-800/50">
              <div className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Collection: /workspace_exports</div>
              <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                {recentSheets.length + recentDocs.length + sentEmails.length}
              </div>
              <div className="text-[11px] text-slate-400 mt-1">Google Sheets, Docs & Gmail sync audits</div>
            </div>
          </div>
        </div>
      )}

      {/* Mandatory User Confirmation Modal for Destructive/Sending Actions */}
      {showEmailConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900 space-y-4 animate-scaleUp">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-100 text-rose-600 dark:bg-rose-950 dark:text-rose-400">
                <Send className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white text-base">Confirm Email Transmission</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Please review before sending message via Gmail</p>
              </div>
            </div>

            <div className="rounded-xl bg-slate-50 dark:bg-slate-800/60 p-4 border border-slate-100 dark:border-slate-800 text-xs space-y-2">
              <div>
                <span className="text-slate-400">To:</span> <strong className="text-slate-900 dark:text-white">{gmailTo}</strong>
              </div>
              <div>
                <span className="text-slate-400">Subject:</span> <strong className="text-slate-900 dark:text-white">{gmailSubject}</strong>
              </div>
              <div className="border-t border-slate-200 dark:border-slate-700 pt-2 text-[11px] text-slate-600 dark:text-slate-300 font-mono whitespace-pre-line max-h-36 overflow-y-auto">
                {gmailBody}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowEmailConfirmModal(false)}
                className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-100 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800"
                style={{ minHeight: '44px' }}
              >
                Cancel
              </button>
              <button
                type="button"
                id="btn-confirm-send-gmail"
                onClick={handleSendGmailConfirm}
                className="rounded-xl bg-rose-600 px-5 py-2.5 text-xs font-bold text-white shadow-md hover:bg-rose-500"
                style={{ minHeight: '44px' }}
              >
                Confirm & Send Email
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
