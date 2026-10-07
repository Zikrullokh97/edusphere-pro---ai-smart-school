import React from 'react';
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  CalendarCheck,
  Award,
  FileText,
  Calendar,
  Sliders,
  ChevronLeft,
  ChevronRight,
  FolderKanban,
  UserCheck,
  BookOpen,
  CalendarRange,
  Menu,
  LogOut,
  ShieldCheck,
  Lock,
  Activity,
  Bell,
  HeartHandshake,
  Sparkles,
  Database,
  Building,
  BarChart3,
  ScreenShare,
  Bot,
  Flame,
  FileSpreadsheet,
  Layers,
} from 'lucide-react';
import { UserRole, AppLanguage, UserProfile } from '../../types';
import { useI18n } from '../../lib/i18n';

interface SidebarProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  currentRole: UserRole;
  language: AppLanguage;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  currentUser?: UserProfile;
  onLogout?: () => void;
}

interface NavItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  roles: UserRole[];
  badge?: string;
  isAI?: boolean;
}

interface NavSection {
  header?: string;
  items: NavItem[];
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  currentRole,
  language,
  isCollapsed,
  onToggleCollapse,
  currentUser,
  onLogout,
}) => {
  const t = useI18n(language);

  // Role-Specific Navigation Structures
  const getSections = (): NavSection[] => {
    if (currentRole === 'admin') {
      return [
        {
          items: [
            { id: 'dashboard', label: t('navDashboard') || 'Boshqaruv Paneli', icon: LayoutDashboard, roles: ['admin'] },
          ],
        },
        {
          header: t('sectionSchoolManagement'),
          items: [
            { id: 'school-management', label: t('navSchoolManagement'), icon: Building, roles: ['admin'] },
            { id: 'curriculum-standards', label: t('navCurriculumStandards'), icon: BookOpen, roles: ['admin'] },
            { id: 'students', label: t('navStudents'), icon: Users, roles: ['admin'] },
            { id: 'teachers', label: t('navTeachers'), icon: GraduationCap, roles: ['admin'] },
            { id: 'users', label: t('navUsers'), icon: UserCheck, roles: ['admin'] },
          ],
        },
        {
          header: t('sectionMonitoringAI'),
          items: [
            { id: 'monitoring', label: t('navMonitoring'), icon: BarChart3, roles: ['admin'] },
            { id: 'standards-analytics', label: t('navStandardsAnalytics'), icon: Layers, roles: ['admin'] },
            { id: 'ai-analytics', label: t('navAIAnalytics'), icon: Sparkles, roles: ['admin'], isAI: true },
            { id: 'reports', label: t('navReportsDetailed'), icon: Award, roles: ['admin'] },
          ],
        },
        {
          header: t('sectionCommunicationSecurity'),
          items: [
            { id: 'announcements', label: t('navAnnouncementsCenter'), icon: Bell, roles: ['admin'] },
            { id: 'security', label: t('navSecurityAudit'), icon: ShieldCheck, roles: ['admin'] },
            { id: 'settings', label: t('navSettings'), icon: Sliders, roles: ['admin'] },
          ],
        },
      ];
    }

    if (currentRole === 'teacher') {
      return [
        {
          items: [
            { id: 'dashboard', label: t('navDashboard') || 'Boshqaruv Paneli', icon: LayoutDashboard, roles: ['teacher'] },
            { id: 'my-classes', label: t('navMyClasses') || 'Mening Sinflarim', icon: FolderKanban, roles: ['teacher'] },
          ],
        },
        {
          header: t('sectionTeachingPedagogy'),
          items: [
            { id: 'schedule', label: t('navSchedule'), icon: Calendar, roles: ['teacher'] },
            { id: 'attendance', label: t('navAttendance'), icon: CalendarCheck, roles: ['teacher'] },
            { id: 'electronic-journal', label: t('navElectronicJournal'), icon: BookOpen, roles: ['teacher'] },
            { id: 'homework', label: t('navHomework'), icon: FileText, roles: ['teacher'] },
            { id: 'lesson-plans', label: t('navLessonPlans'), icon: FileSpreadsheet, roles: ['teacher'] },
            { id: 'teacher-resources', label: t('navTeacherResources'), icon: Layers, roles: ['teacher'] },
            { id: 'digital-classroom', label: t('navDigitalClassroom'), icon: ScreenShare, roles: ['teacher'], badge: 'Live' },
            { id: 'ai-lesson-gen', label: t('navAILessonGen'), icon: Sparkles, roles: ['teacher'], isAI: true },
          ],
        },
        {
          header: t('sectionCommunicationSettings'),
          items: [
            { id: 'announcements', label: t('navAnnouncementsCenter'), icon: Bell, roles: ['teacher'] },
            { id: 'settings', label: t('navSettings'), icon: Sliders, roles: ['teacher'] },
          ],
        },
      ];
    }

    // parent_student
    return [
      {
        items: [
          { id: 'dashboard', label: t('navDashboard') || 'Boshqaruv Paneli', icon: LayoutDashboard, roles: ['parent_student'] },
          { id: 'student-parent', label: t('navFamilyHub') || 'Oila va O‘quvchi', icon: HeartHandshake, roles: ['parent_student'] },
        ],
      },
      {
        header: t('sectionLearningResults'),
        items: [
          { id: 'schedule', label: t('navSchedule'), icon: Calendar, roles: ['parent_student'] },
          { id: 'attendance', label: t('navAttendanceTurnstile'), icon: CalendarCheck, roles: ['parent_student'] },
          { id: 'homework', label: t('navHomework'), icon: FileText, roles: ['parent_student'] },
          { id: 'gradebook', label: t('navGradebook'), icon: FileSpreadsheet, roles: ['parent_student'] },
          { id: 'mastery-progress', label: t('navMasteryProgress'), icon: Award, roles: ['parent_student'] },
          { id: 'ai-tutor', label: t('navAITutor'), icon: Bot, roles: ['parent_student'], isAI: true },
          { id: 'gamification', label: t('navGamification'), icon: Flame, roles: ['parent_student'], badge: 'XP' },
        ],
      },
      {
        header: t('sectionCommunicationSettings'),
        items: [
          { id: 'announcements', label: t('navAnnouncementsCenter'), icon: Bell, roles: ['parent_student'] },
          { id: 'settings', label: t('navSettings'), icon: Sliders, roles: ['parent_student'] },
        ],
      },
    ];
  };

  const sections = getSections();

  const displayName = currentUser?.name || (currentRole === 'admin' ? 'Admin' : currentRole === 'teacher' ? 'O‘qituvchi' : 'Ota-ona');
  const displayRole = currentRole === 'admin' ? (t('adminRoleName') || 'Administrator') : currentRole === 'teacher' ? (t('teacherRoleName') || 'O‘qituvchi') : (t('parentStudentRoleName') || 'Ota-ona / O‘quvchi');
  const initialLetter = displayName.charAt(0).toUpperCase();

  return (
    <aside
      id="main-app-sidebar"
      className={`relative hidden md:flex flex-col border-r border-slate-200/80 bg-white transition-all duration-300 dark:border-slate-800 dark:bg-slate-900 ${
        isCollapsed ? 'w-20' : 'w-64'
      }`}
    >
      {/* Top Logo & Toggle */}
      <div className="flex h-16 items-center justify-between border-b border-slate-100 px-4 dark:border-slate-800">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-md shadow-indigo-600/30">
            <GraduationCap className="h-5 w-5" />
          </div>
          {!isCollapsed && (
            <span className="truncate text-base font-black tracking-tight text-slate-900 dark:text-white">
              EduSphere <span className="text-indigo-600 dark:text-indigo-400">Pro</span>
            </span>
          )}
        </div>

        <button
          onClick={onToggleCollapse}
          className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-50 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 cursor-pointer"
          title={isCollapsed ? 'Kengaytirish' : 'Yig‘ish'}
        >
          <Menu className="h-4 w-4" />
        </button>
      </div>

      {/* Navigation Items */}
      <nav className="flex-1 space-y-4 overflow-y-auto px-3 py-4 text-xs font-medium scrollbar-thin">
        {sections.map((section, sIdx) => {
          const visibleItems = section.items.filter((item) => item.roles.includes(currentRole));
          if (visibleItems.length === 0) return null;

          return (
            <div key={sIdx} className="space-y-1">
              {section.header && !isCollapsed && (
                <div className="px-3 pb-1.5 pt-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  {section.header}
                </div>
              )}
              {visibleItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentTab === item.id;

                return (
                  <button
                    key={item.id}
                    id={`sidebar-item-${item.id}`}
                    onClick={() => onSelectTab(item.id)}
                    title={isCollapsed ? item.label : undefined}
                    className={`group relative flex w-full min-h-[42px] items-center gap-3 rounded-2xl px-3 py-2.5 text-xs font-semibold transition-all active:scale-[0.98] cursor-pointer ${
                      isActive
                        ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/20 dark:bg-indigo-600 dark:text-white'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/60 dark:hover:text-white'
                    }`}
                  >
                    <Icon
                      className={`h-4 w-4 shrink-0 transition-transform ${
                        isActive
                          ? 'text-white'
                          : item.isAI
                          ? 'text-indigo-600 dark:text-indigo-400'
                          : 'text-slate-400 group-hover:text-slate-600 dark:text-slate-500 dark:group-hover:text-slate-300'
                      }`}
                    />

                    {!isCollapsed && (
                      <span className="flex-1 truncate text-left">{item.label}</span>
                    )}

                    {!isCollapsed && item.badge && (
                      <span
                        className={`rounded-full px-2 py-0.5 text-[9px] font-bold uppercase ${
                          isActive
                            ? 'bg-white/20 text-white'
                            : 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300'
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          );
        })}
      </nav>

      {/* User Footer Profile Card */}
      <div className="border-t border-slate-100 p-3 dark:border-slate-800">
        <div className="flex items-center gap-3 rounded-2xl bg-slate-50 p-2.5 dark:bg-slate-800/60">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-600 font-bold text-white shadow-xs">
            {initialLetter}
          </div>
          {!isCollapsed && (
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-bold text-slate-900 dark:text-white">
                {displayName}
              </p>
              <p className="truncate text-[10px] font-medium text-slate-400 capitalize">
                {displayRole}
              </p>
            </div>
          )}
          {onLogout && !isCollapsed && (
            <button
              onClick={onLogout}
              className="rounded-xl p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40 dark:hover:text-rose-400 cursor-pointer"
              title="Chiqish"
            >
              <LogOut className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </aside>
  );
};
