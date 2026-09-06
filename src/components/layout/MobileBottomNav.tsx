import React from 'react';
import {
  LayoutDashboard,
  FolderKanban,
  CalendarCheck,
  Sparkles,
  MoreHorizontal,
  GraduationCap,
  BookOpen,
  FileText,
  Bot,
  User,
  Users,
  BarChart3,
  Bell,
  HeartHandshake,
} from 'lucide-react';
import { UserRole, AppLanguage } from '../../types';
import { useI18n } from '../../lib/i18n';

interface MobileBottomNavProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  currentRole: UserRole;
  language: AppLanguage;
  onOpenMoreDrawer: () => void;
  unreadNotifsCount?: number;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  currentTab,
  onSelectTab,
  currentRole,
  language,
  onOpenMoreDrawer,
  unreadNotifsCount = 0,
}) => {
  const t = useI18n(language);

  // Define role-specific mobile bottom navigation tabs
  const getNavItems = () => {
    switch (currentRole) {
      case 'teacher':
        return [
          { id: 'dashboard', label: t('navHome'), icon: LayoutDashboard },
          { id: 'digital-classroom', label: t('navClass'), icon: FolderKanban, badge: 'Live' },
          { id: 'attendance', label: t('navAttendance'), icon: CalendarCheck },
          { id: 'ai-lesson-gen', label: t('navAIPlan'), icon: Sparkles, isAI: true },
          { id: 'more', label: t('navMore'), icon: MoreHorizontal, isAction: true },
        ];
      case 'parent_student':
        return [
          { id: 'dashboard', label: t('navHome'), icon: LayoutDashboard },
          { id: 'student-parent', label: t('navFamilyHub') || 'Oila & O‘quvchi', icon: HeartHandshake, badge: 'Oila' },
          { id: 'gradebook', label: t('navGrades'), icon: GraduationCap },
          { id: 'homework', label: t('navHomework'), icon: FileText },
          { id: 'more', label: t('navMore'), icon: MoreHorizontal, isAction: true },
        ];
      case 'admin':
      default:
        return [
          { id: 'dashboard', label: t('navHome'), icon: LayoutDashboard },
          { id: 'students', label: t('navStudents'), icon: Users },
          { id: 'teachers', label: t('navTeachers'), icon: GraduationCap },
          { id: 'ai-analytics', label: t('navAnalytics'), icon: BarChart3, isAI: true },
          { id: 'more', label: t('navMore'), icon: MoreHorizontal, isAction: true },
        ];
    }
  };

  const navItems = getNavItems();

  return (
    <nav
      id="mobile-bottom-nav"
      aria-label="Mobile Navigation"
      className="fixed bottom-0 left-0 right-0 z-40 flex h-16 w-full items-center justify-around border-t border-slate-200 bg-white/95 px-2 pb-safe backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/95 md:hidden"
    >
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = item.isAction ? false : currentTab === item.id;

        return (
          <button
            key={item.id}
            id={`mobile-tab-${item.id}`}
            onClick={() => {
              if (item.isAction) {
                onOpenMoreDrawer();
              } else {
                onSelectTab(item.id);
              }
            }}
            className={`relative flex flex-1 flex-col items-center justify-center py-1 transition-all active:scale-95 ${
              isActive
                ? 'text-indigo-600 dark:text-indigo-400 font-bold'
                : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 font-medium'
            }`}
            style={{ minHeight: '44px', minWidth: '44px' }}
          >
            <div className="relative">
              <Icon
                className={`h-5 w-5 transition-transform ${
                  isActive ? 'scale-110' : ''
                } ${item.isAI ? 'text-indigo-500 dark:text-indigo-400' : ''}`}
              />
              {item.badge && (
                <span className="absolute -top-1.5 -right-2.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-indigo-600 px-1 text-[9px] font-bold text-white shadow-xs">
                  {item.badge}
                </span>
              )}
            </div>
            <span className="mt-1 text-[10px] tracking-tight truncate max-w-[64px]">
              {item.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
};
