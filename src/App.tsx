import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { UserRole, AppLanguage, UserProfile, NotificationItem, AILessonPlan, ScheduleSlot, TeacherRecord } from './types';
import { MOCK_NOTIFICATIONS, DEMO_USERS, MOCK_TEACHERS, CURRENT_SCHOOL } from './data/mockData';
import { useI18n } from './lib/i18n';
import {
  auth,
  initAuth,
  logOutFirebase,
  getUserProfileFromFirestore,
} from './lib/firebase';
import { pwaManager } from './lib/pwa';
import { User as FirebaseUser } from 'firebase/auth';
import { AuthModal } from './components/auth/AuthModal';
import {
  TeacherWorkload,
  INITIAL_TEACHER_WORKLOADS,
  generateWorkloadBasedSchedule,
  SCHOOL_CLASSES,
} from './lib/scheduleGenerator';
import { Navbar } from './components/layout/Navbar';
import { Sidebar } from './components/layout/Sidebar';
import { MobileBottomNav } from './components/layout/MobileBottomNav';
import { MobileDrawer } from './components/layout/MobileDrawer';
import { PWAStatusBanner } from './components/common/PWAStatusBanner';
import { CommandPalette } from './components/layout/CommandPalette';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { UsersManagement } from './components/admin/UsersManagement';
import { TeacherDashboard } from './components/teacher/TeacherDashboard';
import { ElectronicJournal } from './components/teacher/ElectronicJournal';
import { DigitalClassroom } from './components/classroom/DigitalClassroom';
import { AILessonGenerator } from './components/ai/AILessonGenerator';
import { AttendanceManager } from './components/attendance/AttendanceManager';
import { GradebookManager } from './components/gradebook/GradebookManager';
import { HomeworkManager } from './components/homework/HomeworkManager';
import { StudentDashboard } from './components/student/StudentDashboard';
import { StudentAITutor } from './components/student/StudentAITutor';
import { ParentPortal } from './components/parent/ParentPortal';
import { StudentParentPortal } from './components/family/StudentParentPortal';
import { ScheduleManager } from './components/schedule/ScheduleManager';
import { AIAnalyticsView } from './components/analytics/AIAnalyticsView';
import { ReportBuilder } from './components/reports/ReportBuilder';
import { StudentsDirectory } from './components/students/StudentsDirectory';
import { TeachersDirectory } from './components/teachers/TeachersDirectory';
import { ClassesDirectory } from './components/classes/ClassesDirectory';
import { SubjectsDirectory } from './components/subjects/SubjectsDirectory';
import { AcademicYearsManager } from './components/academic/AcademicYearsManager';
import { ParentsDirectory } from './components/admin/ParentsDirectory';
import { AuditLogsViewer } from './components/admin/AuditLogsViewer';
import { SecurityCenter } from './components/admin/SecurityCenter';
import { SystemHealthMonitor } from './components/admin/SystemHealthMonitor';
import { AnnouncementCenter } from './components/admin/AnnouncementCenter';
import { LessonPlanReviewer } from './components/admin/LessonPlanReviewer';
import { BackupManager } from './components/admin/BackupManager';
import { SettingsManager } from './components/settings/SettingsManager';
import { WorkspaceHub } from './components/workspace/WorkspaceHub';
import { SchoolManagementHub } from './components/admin/SchoolManagementHub';
import { AdminMonitoringHub } from './components/admin/AdminMonitoringHub';
import { listSchoolData } from './lib/schoolRepository';

export default function App() {
  const getInitialTab = (): string => {
    try {
      const path = window.location.pathname.replace(/^\/+/, '').split('/')[0] || (window.location.hash ? window.location.hash.replace(/^#\/?/, '') : '');
      if (path && path !== 'login') {
        return path;
      }
    } catch {}
    return 'dashboard';
  };

  const [currentRole, setCurrentRole] = useState<UserRole>('admin');
  const [currentTab, setCurrentTab] = useState<string>(getInitialTab);
  const [language, setLanguage] = useState<AppLanguage>(() => {
    try {
      const saved = localStorage.getItem('edusphere_language');
      if (saved === 'uz' || saved === 'ru' || saved === 'ky') return saved;
    } catch {}
    return 'uz';
  });

  const handleLanguageChange = (newLang: AppLanguage) => {
    setLanguage(newLang);
    try {
      localStorage.setItem('edusphere_language', newLang);
    } catch {}
  };
  const [isDark, setIsDark] = useState<boolean>(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState<boolean>(false);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState<boolean>(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [customProfile, setCustomProfile] = useState<UserProfile | null>(null);
  const [selectedClassWorkspace, setSelectedClassWorkspace] = useState<string>('7-A');
  const [notifications, setNotifications] = useState<NotificationItem[]>(MOCK_NOTIFICATIONS);

  // Centralized Master Timetable & Teacher Workloads State
  const [masterSchedule, setMasterSchedule] = useState<ScheduleSlot[]>(() => {
    return generateWorkloadBasedSchedule(INITIAL_TEACHER_WORKLOADS, SCHOOL_CLASSES, 5).slots;
  });
  const [teacherWorkloads, setTeacherWorkloads] = useState<TeacherWorkload[]>(INITIAL_TEACHER_WORKLOADS);
  const [teachers, setTeachers] = useState<TeacherRecord[]>(MOCK_TEACHERS);

  // Load initial school data on mount
  useEffect(() => {
    listSchoolData<TeacherRecord>('teachers').then((items) => {
      if (items.length > 0) setTeachers(items);
    }).catch(() => undefined);
    listSchoolData<ScheduleSlot>('schedules').then((items) => {
      if (items.length > 0) setMasterSchedule(items);
    }).catch(() => undefined);

    // If loaded with /login in URL, replace state with root to avoid stuck view
    if (window.location.pathname === '/login') {
      window.history.replaceState({ tab: 'dashboard' }, '', '/');
    }
  }, []);

  // Firebase Auth Lifecycle Listener
  useEffect(() => {
    const unsubscribe = initAuth(async (user) => {
      setFirebaseUser(user);
      if (user) {
        listSchoolData<TeacherRecord>('teachers').then((items) => {
          if (items.length > 0) setTeachers(items);
        }).catch(() => undefined);
        listSchoolData<ScheduleSlot>('schedules').then((items) => {
          if (items.length > 0) setMasterSchedule(items);
        }).catch(() => undefined);
        listSchoolData<NotificationItem>('notifications').then((items) => {
          if (items.length > 0) setNotifications(items);
        }).catch(() => undefined);
        try {
          const profile = await getUserProfileFromFirestore(user.uid);
          if (profile) {
            setCustomProfile(profile);
            if (profile.role) {
              setCurrentRole(profile.role);
            }
          } else {
            // Fallback for new auth users
            setCustomProfile({
              id: user.uid,
              name: user.displayName || user.email?.split('@')[0] || 'Foydalanuvchi',
              email: user.email || 'user@edusphere.uz',
              role: currentRole,
              avatar: user.photoURL || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
              schoolId: 'school-71-tashkent',
              schoolName: CURRENT_SCHOOL.name,
            });
          }
        } catch (err) {
          console.warn('Could not fetch user profile from Firestore:', err);
        }
      } else {
        setCustomProfile(null);
        void pwaManager.clearSessionData();
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const handleLogout = async () => {
    try {
      await logOutFirebase();
      await pwaManager.clearSessionData();
    } catch (err) {
      console.error('Sign out error:', err);
    } finally {
      // Sessiya ma'lumotlarini tozalash
      setCustomProfile(null);
      setFirebaseUser(null);
      setCurrentRole('admin');
      setCurrentTab('dashboard');
      try {
        localStorage.removeItem('user_session');
        localStorage.removeItem('user_role');
        localStorage.removeItem('edusphere_saved_role');
        window.history.pushState({ tab: 'dashboard' }, '', '/');
      } catch {}

      // Login oynasini darhol ochish
      setIsAuthModalOpen(true);
    }
  };
  const handleSignOut = handleLogout;

  const handleAddTeacher = (
    newTeacher: TeacherRecord,
    newWorkload: TeacherWorkload,
    shouldRegenerateSchedule: boolean
  ) => {
    const updatedTeachers = [newTeacher, ...teachers.filter((t) => t.id !== newTeacher.id)];
    setTeachers(updatedTeachers);

    const updatedWorkloads = [
      newWorkload,
      ...teacherWorkloads.filter((w) => w.teacherId !== newWorkload.teacherId),
    ];
    setTeacherWorkloads(updatedWorkloads);

    if (shouldRegenerateSchedule) {
      const res = generateWorkloadBasedSchedule(updatedWorkloads, SCHOOL_CLASSES, 5);
      setMasterSchedule(res.slots);
    }
  };

  const handleUpdateTeacher = (updatedTeacher: TeacherRecord) => {
    setTeachers((current) => current.map((teacher) => teacher.id === updatedTeacher.id ? updatedTeacher : teacher));
  };

  const t = useI18n(language);

  // Derive user profile based on role or active custom profile
  const userProfiles: Record<UserRole, UserProfile> = {
    admin: DEMO_USERS.admin,
    teacher: DEMO_USERS.teacher,
    parent_student: DEMO_USERS.student,
  };

  const currentUser = customProfile && customProfile.role === currentRole ? customProfile : userProfiles[currentRole];

  // Whitelist of valid/allowed tabs for each role
  const ROLE_ALLOWED_TABS: Record<UserRole, string[]> = {
    admin: [
      'dashboard', 'school-management', 'monitoring', 'users', 'classes', 'students', 'teachers', 'subjects', 'academic-years', 'parents',
      'electronic-journal', 'schedule', 'attendance', 'reports', 'lesson-plans', 'homework',
      'gradebook', 'ai-analytics', 'announcements', 'audit-logs', 'security', 'system-health',
      'backup-recovery', 'settings', 'workspace', 'digital-classroom', 'ai-lesson-gen', 'ai-tutor',
      'student-parent', 'parent-portal', 'gamification', 'my-classes',
    ],
    teacher: [
      'dashboard', 'students', 'my-classes', 'schedule', 'attendance', 'electronic-journal',
      'lesson-plans', 'homework', 'gradebook', 'digital-classroom', 'ai-lesson-gen', 'ai-analytics',
      'reports', 'announcements', 'settings', 'workspace',
    ],
    parent_student: [
      'dashboard', 'student-parent', 'schedule', 'attendance', 'homework', 'gradebook',
      'ai-tutor', 'parent-portal', 'gamification', 'announcements', 'settings', 'workspace',
    ],
  };

  const handleSelectTab = (tab: string) => {
    const allowed = ROLE_ALLOWED_TABS[currentRole] || ['dashboard'];
    const targetTab = allowed.includes(tab) ? tab : 'dashboard';
    setCurrentTab(targetTab);
    try {
      const targetPath = targetTab === 'dashboard' ? '/' : `/${targetTab}`;
      if (window.location.pathname !== targetPath) {
        window.history.pushState({ tab: targetTab }, '', targetPath);
      }
    } catch {}
  };

  // Synchronize browser history (popstate - Back/Forward buttons)
  useEffect(() => {
    const handlePopState = () => {
      try {
        const path = window.location.pathname.replace(/^\/+/, '').split('/')[0] || (window.location.hash ? window.location.hash.replace(/^#\/?/, '') : '');
        const targetTab = path && path !== 'login' ? path : 'dashboard';
        const allowed = ROLE_ALLOWED_TABS[currentRole] || ['dashboard'];
        if (allowed.includes(targetTab)) {
          setCurrentTab(targetTab);
        } else {
          setCurrentTab('dashboard');
        }
      } catch {}
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [currentRole]);

  // Context titles for mobile header
  const getContextTitle = () => {
    switch (currentTab) {
      case 'dashboard':
        return t('navDashboard') || t('appName');
      case 'school-management':
        return t('navSchoolManagement') || 'Maktab Boshqaruvi';
      case 'monitoring':
        return t('navMonitoring') || 'Monitoring & Reyting';
      case 'digital-classroom':
        return `${selectedClassWorkspace} ${t('navDigitalClassroom')}`;
      case 'ai-lesson-gen':
        return 'AI Dars Rejasi Generatori';
      case 'ai-tutor':
        return t('navAITutor');
      case 'attendance':
        return t('navAttendance') || 'Davomat & Turniket';
      case 'gradebook':
        return t('navGradebook') || 'Baholar jurnali';
      case 'electronic-journal':
        return 'Elektron jurnal';
      case 'lesson-plans':
        return 'Dars rejalari (KTP)';
      case 'homework':
        return t('navHomework') || 'Uy vazifalari';
      case 'schedule':
        return t('navSchedule') || 'Dars jadvali';
      case 'ai-analytics':
        return t('navAIAnalytics') || 'AI Analitika';
      case 'reports':
        return t('navReports') || 'Hisobotlar (73-OSH/Tabel)';
      case 'students':
        return t('navStudents') || "O'quvchilar";
      case 'teachers':
        return t('navTeachers') || "O'qituvchilar";
      case 'parents':
        return 'Ota-onalar';
      case 'users':
        return 'Foydalanuvchilar';
      case 'classes':
        return "Sinflar Ro'yxati";
      case 'subjects':
        return t('navSubjects') || 'Fanlar';
      case 'academic-years':
        return "O'quv yili & choraklar";
      case 'announcements':
        return "E'lonlar markazi";
      case 'audit-logs':
        return 'Audit jurnali';
      case 'security':
        return 'Xavfsizlik & Sessiyalar';
      case 'system-health':
        return 'Tizim salomatligi';
      case 'backup-recovery':
        return 'Zaxira va tiklash';
      case 'workspace':
        return t('navWorkspace') || 'Google Workspace';
      case 'settings':
        return t('navSettings') || 'Sozlamalar';
      case 'my-classes':
        return t('navMyClasses') || 'Mening sinflarim';
      case 'student-parent':
      case 'parent-portal':
        return 'Oila va o‘quvchi portali';
      case 'gamification':
        return 'O‘quvchi yutuqlari va reyting';
      default:
        return t('appName');
    }
  };

  // Sync dark theme with document html
  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDark]);

  const handleRoleChange = (role: UserRole) => {
    setCurrentRole(role);
    let nextTab = 'dashboard';
    if (role === 'teacher') {
      nextTab = 'my-classes';
    } else if (role === 'parent_student') {
      nextTab = 'student-parent';
    }
    setCurrentTab(nextTab);
    try {
      const targetPath = nextTab === 'dashboard' ? '/' : `/${nextTab}`;
      window.history.pushState({ tab: nextTab }, '', targetPath);
    } catch {}
    setIsMobileDrawerOpen(false);
  };

  const handleAuthSuccess = async () => {
    if (auth.currentUser) {
      const profile = await getUserProfileFromFirestore(auth.currentUser.uid);
      if (profile) {
        setCustomProfile(profile);
        handleRoleChange(profile.role);
        return;
      }
    }
    handleRoleChange('parent_student');
  };

  const handleSendLessonToClassroom = (_lesson?: any) => {
    setSelectedClassWorkspace('7-A');
    setCurrentTab('digital-classroom');
  };

  return (
    <div className="flex min-h-screen flex-col bg-[#F8FAFC] text-slate-900 transition-colors dark:bg-slate-950 dark:text-slate-100 overflow-x-hidden">
      {/* Top Navigation */}
      <Navbar
        currentUser={currentUser}
        currentRole={currentRole}
        onRoleChange={handleRoleChange}
        language={language}
        onLanguageChange={handleLanguageChange}
        isDark={isDark}
        onThemeToggle={() => setIsDark(!isDark)}
        onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
        notifications={notifications}
        onOpenAIModal={() => {
          if (currentRole === 'teacher') handleSelectTab('ai-lesson-gen');
          else if (currentRole === 'parent_student') handleSelectTab('ai-tutor');
          else if (currentRole === 'admin') handleSelectTab('ai-analytics');
        }}
        onToggleMobileDrawer={() => setIsMobileDrawerOpen(true)}
        currentContextTitle={getContextTitle()}
        firebaseUser={firebaseUser}
        onOpenAuthModal={() => setIsAuthModalOpen(true)}
        onSignOut={handleSignOut}
      />

      {/* Main Layout (Sidebar + Content Workspace) */}
      <div className="flex flex-1 overflow-hidden">
        <Sidebar
          currentTab={currentTab}
          onSelectTab={handleSelectTab}
          currentRole={currentRole}
          language={language}
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          currentUser={currentUser}
          onLogout={handleLogout}
        />

        {/* Dynamic Viewport Container */}
        <motion.main
          key={currentTab}
          id="main-workspace-content"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="flex-1 overflow-y-auto p-3 sm:p-6 lg:p-8 pb-20 md:pb-8"
        >
          {/* Main Dashboard / Role Route */}
          {currentTab === 'dashboard' && (
            <>
              {currentRole === 'admin' && (
                <AdminDashboard language={language} onNavigate={handleSelectTab} />
              )}
              {currentRole === 'teacher' && (
                <TeacherDashboard
                  language={language}
                  onNavigate={handleSelectTab}
                  onSelectClassWorkspace={setSelectedClassWorkspace}
                  masterSchedule={masterSchedule}
                  teachers={teachers}
                  currentUser={currentUser}
                />
              )}
              {currentRole === 'parent_student' && (
                <StudentParentPortal
                  language={language}
                  currentRole={currentRole}
                  onNavigate={handleSelectTab}
                  masterSchedule={masterSchedule}
                  initialActiveSubTab="all_in_one"
                />
              )}
            </>
          )}

          {/* Dedicated Sub-Screens - Strictly role whitelisted */}
          {currentTab === 'student-parent' && (
            <StudentParentPortal
              language={language}
              currentRole={currentRole}
              onNavigate={handleSelectTab}
              masterSchedule={masterSchedule}
              initialActiveSubTab="all_in_one"
            />
          )}

          {currentTab === 'digital-classroom' && (currentRole === 'teacher' || currentRole === 'admin') && (
            <DigitalClassroom
              language={language}
              currentClass={selectedClassWorkspace}
              onEndLesson={() => handleSelectTab('dashboard')}
            />
          )}

          {currentTab === 'electronic-journal' && (currentRole === 'teacher' || currentRole === 'admin') && (
            <ElectronicJournal
              language={language}
              masterSchedule={masterSchedule}
              teachers={teachers}
              currentUser={currentUser}
            />
          )}

          {currentTab === 'ai-lesson-gen' && (currentRole === 'teacher' || currentRole === 'admin') && (
            <AILessonGenerator
              language={language}
              onSendToClassroom={handleSendLessonToClassroom}
            />
          )}

          {currentTab === 'attendance' && (currentRole === 'admin' || currentRole === 'teacher' || currentRole === 'parent_student') && (
            <AttendanceManager language={language} />
          )}

          {currentTab === 'gradebook' && (currentRole === 'admin' || currentRole === 'teacher' || currentRole === 'parent_student') && (
            <GradebookManager
              language={language}
              initialClass={selectedClassWorkspace}
              currentRole={currentRole}
            />
          )}

          {currentTab === 'homework' && (currentRole === 'admin' || currentRole === 'teacher' || currentRole === 'parent_student') && (
            <HomeworkManager
              language={language}
              isStudent={currentRole === 'parent_student'}
              currentRole={currentRole}
              currentUser={currentUser}
            />
          )}

          {currentTab === 'ai-tutor' && (currentRole === 'parent_student' || currentRole === 'admin') && (
            <StudentAITutor language={language} />
          )}

          {currentTab === 'parent-portal' && (
            <StudentParentPortal
              language={language}
              currentRole={currentRole}
              onNavigate={handleSelectTab}
              masterSchedule={masterSchedule}
              initialActiveSubTab="parent"
            />
          )}

          {currentTab === 'schedule' && (
            <ScheduleManager
              language={language}
              currentRole={currentRole}
              currentUser={currentUser}
              masterSchedule={masterSchedule}
              onUpdateMasterSchedule={(newSlots, updatedWorkloads) => {
                setMasterSchedule(newSlots);
                if (updatedWorkloads) setTeacherWorkloads(updatedWorkloads);
              }}
              onNavigateTab={handleSelectTab}
            />
          )}

          {currentTab === 'school-management' && currentRole === 'admin' && (
            <SchoolManagementHub
              language={language}
              onNavigateTab={handleSelectTab}
            />
          )}

          {currentTab === 'monitoring' && currentRole === 'admin' && (
            <AdminMonitoringHub
              language={language}
              onNavigateTab={handleSelectTab}
            />
          )}

          {currentTab === 'ai-analytics' && (currentRole === 'admin' || currentRole === 'teacher') && (
            <AIAnalyticsView language={language} />
          )}

          {currentTab === 'reports' && (currentRole === 'admin' || currentRole === 'teacher') && (
            <ReportBuilder language={language} />
          )}

          {currentTab === 'classes' && currentRole === 'admin' && (
            <ClassesDirectory
              language={language}
              teachers={teachers}
              onNavigateTab={handleSelectTab}
            />
          )}

          {currentTab === 'students' && (currentRole === 'admin' || currentRole === 'teacher') && (
            <StudentsDirectory
              language={language}
              currentRole={currentRole}
              teachers={teachers}
              currentUser={currentUser}
              onNavigateTab={handleSelectTab}
            />
          )}

          {currentTab === 'teachers' && currentRole === 'admin' && (
            <TeachersDirectory
              language={language}
              teachers={teachers}
              onAddTeacher={handleAddTeacher}
              onUpdateTeacher={handleUpdateTeacher}
              onNavigateTab={handleSelectTab}
              workloads={teacherWorkloads}
            />
          )}

          {currentTab === 'users' && currentRole === 'admin' && (
            <UsersManagement />
          )}

          {currentTab === 'subjects' && currentRole === 'admin' && (
            <SubjectsDirectory language={language} />
          )}

          {currentTab === 'academic-years' && currentRole === 'admin' && (
            <AcademicYearsManager language={language} />
          )}

          {currentTab === 'parents' && currentRole === 'admin' && (
            <ParentsDirectory />
          )}

          {currentTab === 'audit-logs' && currentRole === 'admin' && (
            <AuditLogsViewer />
          )}

          {currentTab === 'security' && currentRole === 'admin' && (
            <SecurityCenter />
          )}

          {currentTab === 'system-health' && currentRole === 'admin' && (
            <SystemHealthMonitor />
          )}

          {currentTab === 'backup-recovery' && currentRole === 'admin' && (
            <BackupManager language={language} />
          )}

          {currentTab === 'announcements' && (
            <AnnouncementCenter />
          )}

          {currentTab === 'lesson-plans' && (currentRole === 'admin' || currentRole === 'teacher') && (
            <LessonPlanReviewer />
          )}

          {currentTab === 'workspace' && (
            <WorkspaceHub language={language} />
          )}

          {currentTab === 'settings' && (
            <SettingsManager
              language={language}
              onLanguageChange={handleLanguageChange}
              isDark={isDark}
              onThemeToggle={() => setIsDark(!isDark)}
            />
          )}

          {currentTab === 'my-classes' && (currentRole === 'teacher' || currentRole === 'admin') && (
            <TeacherDashboard
              language={language}
              onNavigate={handleSelectTab}
              onSelectClassWorkspace={setSelectedClassWorkspace}
              masterSchedule={masterSchedule}
              teachers={teachers}
            />
          )}

          {currentTab === 'gamification' && (
            <StudentParentPortal
              language={language}
              currentRole={currentRole}
              onNavigate={handleSelectTab}
              masterSchedule={masterSchedule}
              initialActiveSubTab="student"
            />
          )}
        </motion.main>
      </div>

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav
        currentTab={currentTab}
        onSelectTab={handleSelectTab}
        currentRole={currentRole}
        language={language}
        onOpenMoreDrawer={() => setIsMobileDrawerOpen(true)}
        unreadNotifsCount={notifications.filter((n) => !n.isRead).length}
      />

      <MobileDrawer
        isOpen={isMobileDrawerOpen}
        onClose={() => setIsMobileDrawerOpen(false)}
        currentTab={currentTab}
        onSelectTab={handleSelectTab}
        currentUser={currentUser}
        currentRole={currentRole}
        onRoleChange={handleRoleChange}
        language={language}
        onLanguageChange={setLanguage}
        isDark={isDark}
        onThemeToggle={() => setIsDark(!isDark)}
        onOpenCommandPalette={() => {
          setIsMobileDrawerOpen(false);
          setIsCommandPaletteOpen(true);
        }}
        firebaseUser={firebaseUser}
        onOpenAuthModal={() => setIsAuthModalOpen(true)}
        onSignOut={handleSignOut}
      />

      {/* PWA Offline and Sync Status Banner */}
      <PWAStatusBanner />

      {/* ⌘K Command Palette Modal */}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        onSelectAction={handleSelectTab}
        onSwitchRole={handleRoleChange}
        currentRole={currentRole}
      />

      {/* Firebase Authentication Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        language={language}
        currentRole={currentRole}
        onAuthSuccess={(role, userDisplayName, profile) => {
          handleRoleChange(role);
          if (profile) {
            setCustomProfile(profile);
          } else if (userDisplayName) {
            setCustomProfile((prev) => ({
              ...(prev || {
                id: `usr-${role}`,
                email: `${role}@edusphere.school`,
                avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
                schoolId: 'school-71-tashkent',
                schoolName: '№71 Ixtisoslashtirilgan Maktab',
              }),
              name: userDisplayName,
              role,
            }));
          }
        }}
      />
    </div>
  );
}
