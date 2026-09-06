import React, { useEffect } from 'react';
import {
  X,
  LayoutDashboard,
  Users,
  GraduationCap,
  BookOpen,
  CalendarCheck,
  Award,
  FileText,
  Calendar,
  Sparkles,
  Bot,
  BarChart3,
  Sliders,
  Flame,
  ScreenShare,
  FileSpreadsheet,
  FolderKanban,
  UserCheck,
  Sun,
  Moon,
  Globe,
  Wifi,
  WifiOff,
  RefreshCw,
  LogOut,
  LogIn,
  ShieldCheck,
  ChevronRight,
  School,
  Check,
  Bell,
} from 'lucide-react';
import { UserRole, AppLanguage, UserProfile } from '../../types';
import { useI18n } from '../../lib/i18n';
import { pwaManager } from '../../lib/pwa';
import { User as FirebaseUser } from 'firebase/auth';

interface MobileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  currentTab: string;
  onSelectTab: (tab: string) => void;
  currentUser: UserProfile;
  currentRole: UserRole;
  onRoleChange: (role: UserRole) => void;
  language: AppLanguage;
  onLanguageChange: (lang: AppLanguage) => void;
  isDark: boolean;
  onThemeToggle: () => void;
  onOpenCommandPalette: () => void;
  firebaseUser?: FirebaseUser | null;
  onOpenAuthModal?: () => void;
  onSignOut?: () => void;
}

export const MobileDrawer: React.FC<MobileDrawerProps> = ({
  isOpen,
  onClose,
  currentTab,
  onSelectTab,
  currentUser,
  currentRole,
  onRoleChange,
  language,
  onLanguageChange,
  isDark,
  onThemeToggle,
  onOpenCommandPalette,
  firebaseUser,
  onOpenAuthModal,
  onSignOut,
}) => {
  const t = useI18n(language);
  const [isOnline, setIsOnline] = React.useState(true);
  const [isSyncing, setIsSyncing] = React.useState(false);
  const [pendingCount, setPendingCount] = React.useState(0);
  const [showRoleSelector, setShowRoleSelector] = React.useState(false);

  useEffect(() => {
    const unsubOnline = pwaManager.subscribeOnlineState(setIsOnline);
    const unsubSync = pwaManager.subscribeSync((syncing, count) => {
      setIsSyncing(syncing);
      setPendingCount(count);
    });

    // Lock body scroll when drawer is open
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      unsubOnline();
      unsubSync();
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const allNavItems = [
    { id: 'dashboard', labelKey: 'navDashboard', icon: LayoutDashboard, roles: ['admin', 'teacher', 'parent_student'] },
    { id: 'school-management', labelKey: 'navSchoolManagement', icon: School, roles: ['admin'] },
    { id: 'monitoring', labelKey: 'navMonitoring', icon: BarChart3, roles: ['admin'] },
    { id: 'student-parent', labelKey: 'navStudentParent', icon: UserCheck, roles: ['admin', 'teacher', 'parent_student'], badge: 'Oila' },
    { id: 'students', labelKey: 'navStudents', icon: Users, roles: ['admin', 'teacher'] },
    { id: 'teachers', labelKey: 'navTeachers', icon: GraduationCap, roles: ['admin'] },
    { id: 'parents', labelKey: 'parents', customLabel: 'Ota-onalar', icon: UserCheck, roles: ['admin'] },
    { id: 'users', labelKey: 'Users & Accounts', customLabel: 'Foydalanuvchilar', icon: UserCheck, roles: ['admin'] },
    { id: 'classes', labelKey: 'classes', customLabel: 'Sinflar', icon: FolderKanban, roles: ['admin'] },
    { id: 'subjects', labelKey: 'navSubjects', icon: BookOpen, roles: ['admin'] },
    { id: 'academic-years', labelKey: 'academicYears', customLabel: "O'quv yili & choraklar", icon: Calendar, roles: ['admin'] },
    { id: 'my-classes', labelKey: 'navMyClasses', icon: FolderKanban, roles: ['teacher'] },
    { id: 'schedule', labelKey: 'navSchedule', icon: Calendar, roles: ['admin', 'teacher', 'parent_student'] },
    { id: 'attendance', labelKey: 'navAttendance', icon: CalendarCheck, roles: ['admin', 'teacher', 'parent_student'], badge: 'Face ID' },
    { id: 'electronic-journal', labelKey: 'Electronic Journal', customLabel: 'Elektron jurnal', icon: BookOpen, roles: ['admin', 'teacher'] },
    { id: 'lesson-plans', labelKey: 'lessonPlans', customLabel: 'Dars rejalari (KTP)', icon: BookOpen, roles: ['admin', 'teacher'] },
    { id: 'homework', labelKey: 'navHomework', icon: FileText, roles: ['admin', 'teacher', 'parent_student'], badge: 'AI Grade' },
    { id: 'gradebook', labelKey: 'navGradebook', icon: FileSpreadsheet, roles: ['admin', 'teacher', 'parent_student'] },
    { id: 'digital-classroom', labelKey: 'navDigitalClassroom', icon: ScreenShare, roles: ['teacher', 'admin'], badge: 'Live AI' },
    { id: 'ai-analytics', labelKey: 'navAIAnalytics', icon: BarChart3, roles: ['admin', 'teacher'], isAI: true },
    { id: 'reports', labelKey: 'navReports', icon: Award, roles: ['admin', 'teacher'] },
    { id: 'announcements', labelKey: 'announcements', customLabel: "E'lonlar markazi", icon: Bell, roles: ['admin', 'teacher', 'parent_student'] },
    { id: 'audit-logs', labelKey: 'auditLogs', customLabel: 'Audit jurnali', icon: ShieldCheck, roles: ['admin'] },
    { id: 'security', labelKey: 'security', customLabel: 'Xavfsizlik & Sessiyalar', icon: ShieldCheck, roles: ['admin'] },
    { id: 'system-health', labelKey: 'systemHealth', customLabel: 'Tizim salomatligi', icon: BarChart3, roles: ['admin'] },
    { id: 'backup-recovery', labelKey: 'backupRecovery', customLabel: 'Zaxira va tiklash', icon: Sliders, roles: ['admin'] },
    { id: 'workspace', labelKey: 'navWorkspace', icon: FileSpreadsheet, roles: ['admin', 'teacher', 'parent_student'], badge: 'G-Suite' },
    { id: 'settings', labelKey: 'navSettings', icon: Sliders, roles: ['admin', 'teacher', 'parent_student'] },
    { id: 'gamification', labelKey: 'navGamification', icon: Flame, roles: ['parent_student'], badge: 'XP' },
    { id: 'ai-lesson-gen', labelKey: 'navAILessonGen', icon: Sparkles, roles: ['teacher', 'admin'], isAI: true, badge: 'Wizard' },
    { id: 'ai-tutor', labelKey: 'navAITutor', icon: Bot, roles: ['parent_student', 'admin'], isAI: true, badge: 'Socratic' },
    { id: 'parent-portal', labelKey: 'navParentPortal', icon: UserCheck, roles: ['parent_student'] },
  ];

  const visibleItems = allNavItems.filter((i) => i.roles.includes(currentRole));

  const languages: { code: AppLanguage; label: string; flag: string }[] = [
    { code: 'en', label: 'EN', flag: '🇬🇧' },
    { code: 'uz', label: 'UZ', flag: '🇺🇿' },
    { code: 'ky', label: 'KY', flag: '🇰🇬' },
    { code: 'ru', label: 'RU', flag: '🇷🇺' },
  ];

  const roles: { role: UserRole; title: string; desc: string }[] = [
    { role: 'admin', title: 'Admin / Director', desc: 'Full School Management' },
    { role: 'teacher', title: 'Teacher (Aigul S.)', desc: 'Classroom, Attendance, AI' },
    { role: 'parent_student', title: 'Parent / Student', desc: 'Profile, Progress, AI Tutor, Homework' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex md:hidden">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Drawer Panel */}
      <div className="relative flex w-full max-w-xs flex-1 flex-col bg-white shadow-2xl transition-transform dark:bg-slate-900">
        {/* Drawer Header with User Profile */}
        <div className="flex flex-col border-b border-slate-100 p-4 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img
                src={currentUser.avatar}
                alt={currentUser.name}
                className="h-10 w-10 rounded-full object-cover ring-2 ring-indigo-500/30"
              />
              <div>
                <div className="text-sm font-bold text-slate-900 dark:text-white truncate max-w-[140px]">
                  {currentUser.name}
                </div>
                <button
                  onClick={() => setShowRoleSelector(!showRoleSelector)}
                  className="flex items-center gap-1 text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 capitalize"
                >
                  <span>{currentRole}</span>
                  <ChevronRight className="h-3 w-3 rotate-90" />
                </button>
              </div>
            </div>
            <button
              onClick={onClose}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400"
              style={{ minHeight: '44px', minWidth: '44px' }}
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Quick Auth Action Trigger */}
          <div className="mt-3 flex items-center gap-2">
            {onOpenAuthModal && (
              <button
                id="mobile-drawer-auth-btn"
                onClick={() => {
                  onClose();
                  onOpenAuthModal();
                }}
                className="flex-1 min-h-[44px] flex items-center justify-center gap-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200/60 dark:border-indigo-800/60 py-2.5 px-3 text-xs font-bold text-indigo-700 dark:text-indigo-300 shadow-xs active:scale-[0.98] active:bg-indigo-100 dark:active:bg-indigo-900 transition-all"
              >
                <LogIn className="h-4 w-4" />
                <span>{t('tabSignIn')} / {t('tabSignUp')}</span>
              </button>
            )}

            {onSignOut && (
              <button
                id="mobile-drawer-signout-btn"
                onClick={() => {
                  onClose();
                  onSignOut();
                }}
                className="min-h-[44px] min-w-[44px] flex items-center justify-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-semibold text-slate-700 hover:bg-red-50 hover:text-red-600 active:scale-95 active:bg-red-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:active:bg-red-950/40 transition-all"
                title={t('signOutButton')}
              >
                <LogOut className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* Role Switcher Collapsible Accordion */}
        {showRoleSelector && (
          <div className="border-b border-slate-100 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-800/50 space-y-1.5 animate-fadeIn">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Switch Demo Role</div>
            {roles.map((r) => (
              <button
                key={r.role}
                onClick={() => {
                  onRoleChange(r.role);
                  setShowRoleSelector(false);
                }}
                className={`flex w-full min-h-[44px] items-center justify-between rounded-xl p-2.5 text-left text-xs transition-all active:scale-[0.98] ${
                  currentRole === r.role
                    ? 'bg-indigo-600 text-white font-bold shadow-xs active:bg-indigo-700'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-200 active:bg-slate-200 dark:hover:bg-slate-700 dark:active:bg-slate-700'
                }`}
              >
                <div>
                  <div className="font-semibold">{r.title}</div>
                  <div className={`text-[10px] ${currentRole === r.role ? 'text-indigo-100' : 'text-slate-400'}`}>{r.desc}</div>
                </div>
                {currentRole === r.role && <Check className="h-4 w-4" />}
              </button>
            ))}
          </div>
        )}

        {/* Scrollable Navigation List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-1">
          <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Navigation Menu
          </div>

          {visibleItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;

            return (
              <button
                key={item.id}
                id={`drawer-item-${item.id}`}
                onClick={() => {
                  onSelectTab(item.id);
                  onClose();
                }}
                className={`flex w-full min-h-[44px] items-center justify-between rounded-xl px-3.5 py-3 text-xs font-semibold transition-all active:scale-[0.98] ${
                  isActive
                    ? 'bg-indigo-50 text-indigo-700 active:bg-indigo-100 dark:bg-indigo-950/70 dark:text-indigo-300 dark:active:bg-indigo-900'
                    : 'text-slate-700 hover:bg-slate-50 active:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 dark:active:bg-slate-800'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    className={`h-4 w-4 shrink-0 ${
                      isActive
                        ? 'text-indigo-600 dark:text-indigo-400'
                        : item.isAI
                        ? 'text-indigo-500'
                        : 'text-slate-400'
                    }`}
                  />
                  <span>{item.customLabel || t(item.labelKey)}</span>
                </div>

                {item.badge && (
                  <span
                    className={`rounded-full px-2 py-0.5 text-[9px] font-bold uppercase ${
                      isActive
                        ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/80 dark:text-indigo-200'
                        : item.isAI
                        ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/80 dark:text-indigo-400'
                        : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Drawer Bottom Controls: Language, Dark Mode, Sync & School info */}
        <div className="border-t border-slate-100 p-3 dark:border-slate-800 space-y-3">
          {/* Offline Sync Status Bar */}
          <div className="flex min-h-[44px] items-center justify-between rounded-xl bg-slate-50 px-3 py-2 text-xs dark:bg-slate-800">
            <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
              {isOnline ? (
                <Wifi className="h-4 w-4 text-emerald-500" />
              ) : (
                <WifiOff className="h-4 w-4 text-amber-500" />
              )}
              <span className="font-semibold text-[11px]">
                {isOnline ? 'Online Cloud Mode' : 'Offline Cached'}
              </span>
            </div>
            {pendingCount > 0 && (
              <button
                onClick={() => pwaManager.processSyncQueue()}
                className="flex min-h-[36px] items-center gap-1 text-[11px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 active:scale-95 active:bg-indigo-100 dark:bg-indigo-950/60 px-2.5 py-1 rounded-lg transition-all"
              >
                <RefreshCw className={`h-3 w-3 ${isSyncing ? 'animate-spin' : ''}`} />
                Sync ({pendingCount})
              </button>
            )}
          </div>

          {/* Languages & Theme row */}
          <div className="flex items-center justify-between gap-2">
            {/* Language Pills */}
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
              {languages.map((l) => (
                <button
                  key={l.code}
                  onClick={() => onLanguageChange(l.code)}
                  className={`min-h-[44px] min-w-[40px] px-2.5 py-2 rounded-lg text-xs font-bold transition-all active:scale-95 ${
                    language === l.code
                      ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 active:bg-slate-200'
                  }`}
                >
                  {l.label}
                </button>
              ))}
            </div>

            {/* Dark Mode toggle */}
            <button
              onClick={onThemeToggle}
              className="flex min-h-[44px] items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 active:scale-95 active:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:active:bg-slate-700 transition-all"
            >
              {isDark ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4" />}
              <span>{isDark ? 'Light' : 'Dark'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
