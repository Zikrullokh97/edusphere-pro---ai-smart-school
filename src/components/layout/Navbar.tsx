import React, { useState } from 'react';
import {
  Bell,
  Search,
  Globe,
  Check,
  Menu,
  LogOut,
  ChevronDown,
  Calendar,
  CalendarDays,
  User as UserIcon,
} from 'lucide-react';
import { UserRole, AppLanguage, UserProfile, NotificationItem } from '../../types';
import { formatQuarter, useI18n } from '../../lib/i18n';
import { User as FirebaseUser } from 'firebase/auth';

interface NavbarProps {
  currentUser: UserProfile;
  currentRole: UserRole;
  onRoleChange: (role: UserRole) => void;
  language: AppLanguage;
  onLanguageChange: (lang: AppLanguage) => void;
  isDark: boolean;
  onThemeToggle: () => void;
  onOpenCommandPalette: () => void;
  notifications: NotificationItem[];
  onOpenAIModal?: () => void;
  onToggleMobileDrawer?: () => void;
  currentContextTitle?: string;
  firebaseUser?: FirebaseUser | null;
  onOpenAuthModal?: () => void;
  onSignOut?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentUser,
  currentRole,
  onRoleChange,
  language,
  onLanguageChange,
  isDark,
  onThemeToggle,
  onOpenCommandPalette,
  notifications,
  onToggleMobileDrawer,
  currentContextTitle,
  firebaseUser,
  onOpenAuthModal,
  onSignOut,
}) => {
  const t = useI18n(language);
  const [selectedAcademicYear, setSelectedAcademicYear] = useState('2026-2027');
  const [selectedQuarter, setSelectedQuarter] = useState('Q1');
  const [showYearDropdown, setShowYearDropdown] = useState(false);
  const [showQuarterDropdown, setShowQuarterDropdown] = useState(false);
  const [showLangMenu, setShowLangMenu] = useState(false);
  const [showNotifMenu, setShowNotifMenu] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const academicYears = ['2026-2027', '2025-2026'];
  const quarters = [
    { id: 'Q1' as const, dates: '01.09.2026 - 31.10.2026' },
    { id: 'Q2' as const, dates: '12.11.2026 - 30.12.2026' },
    { id: 'Q3' as const, dates: '11.01.2027 - 20.03.2027' },
    { id: 'Q4' as const, dates: '01.04.2027 - 25.05.2027' },
  ];

  const languages = [
    { code: 'uz' as AppLanguage, label: "O'zbekcha", flag: '🇺🇿' },
    { code: 'ru' as AppLanguage, label: 'Русский', flag: '🇷🇺' },
    { code: 'ky' as AppLanguage, label: 'Кыргызча', flag: '🇰🇬' },
  ];

  return (
    <header
      id="main-app-header"
      className="sticky top-0 z-40 flex h-16 w-full items-center justify-between border-b border-slate-200/80 bg-white px-4 sm:px-6 transition-colors dark:border-slate-800 dark:bg-slate-900"
    >
      {/* Left: Mobile Toggle & Breadcrumb / Page Title */}
      <div className="flex items-center gap-3">
        {onToggleMobileDrawer && (
          <button
            id="mobile-drawer-toggle-btn"
            onClick={onToggleMobileDrawer}
            className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-700 hover:bg-slate-100 active:scale-95 dark:text-slate-200 dark:hover:bg-slate-800 md:hidden"
            aria-label="Open Mobile Menu"
          >
            <Menu className="h-5 w-5" />
          </button>
        )}

        <div>
          <h1 className="text-base sm:text-lg font-bold tracking-tight text-slate-900 dark:text-white">
            {currentContextTitle || 'Boshqaruv paneli'}
          </h1>
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Dropdown 1: Academic Year Selector */}
        <div className="relative hidden lg:block">
          <button
            onClick={() => {
              setShowYearDropdown(!showYearDropdown);
              setShowQuarterDropdown(false);
            }}
            className="flex min-h-[38px] items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-800/80 dark:text-slate-200"
          >
            <Calendar className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
            <span>{selectedAcademicYear} {t('academicYearLabel')}</span>
            <ChevronDown className="h-3 w-3 text-slate-400" />
          </button>

          {showYearDropdown && (
            <div className="absolute right-0 mt-2 w-52 rounded-xl border border-slate-200 bg-white p-1 shadow-lg dark:border-slate-800 dark:bg-slate-900 z-50 animate-in zoom-in-95">
              {academicYears.map((yr) => (
                <button
                  key={yr}
                  onClick={() => {
                    setSelectedAcademicYear(yr);
                    setShowYearDropdown(false);
                  }}
                  className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-xs font-medium ${
                    selectedAcademicYear === yr
                      ? 'bg-indigo-50 font-bold text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400'
                      : 'text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800'
                  }`}
                >
                  <span>{yr} {t('academicYearLabel')}</span>
                  {selectedAcademicYear === yr && <Check className="h-3.5 w-3.5" />}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Dropdown 2: Quarter / Term Selector */}
        <div className="relative hidden xl:block">
          <button
            onClick={() => {
              setShowQuarterDropdown(!showQuarterDropdown);
              setShowYearDropdown(false);
            }}
            className="flex min-h-[38px] items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-800/80 dark:text-slate-200"
          >
            <CalendarDays className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
            <span>{formatQuarter(selectedQuarter, language)} ({quarters.find((q) => q.id === selectedQuarter)?.dates})</span>
            <ChevronDown className="h-3 w-3 text-slate-400" />
          </button>

          {showQuarterDropdown && (
            <div className="absolute right-0 mt-2 w-72 rounded-xl border border-slate-200 bg-white p-1 shadow-lg dark:border-slate-800 dark:bg-slate-900 z-50 animate-in zoom-in-95">
              {quarters.map((q) => (
                <button
                  key={q.id}
                  onClick={() => {
                    setSelectedQuarter(q.id);
                    setShowQuarterDropdown(false);
                  }}
                  className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-xs font-medium ${
                    selectedQuarter === q.id
                      ? 'bg-indigo-50 font-bold text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400'
                      : 'text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800'
                  }`}
                >
                  <span>{formatQuarter(q.id, language)} ({q.dates})</span>
                  {selectedQuarter === q.id && <Check className="h-3.5 w-3.5" />}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Notifications */}
        <div className="relative">
          <button
            id="notifications-bell-btn"
            onClick={() => setShowNotifMenu(!showNotifMenu)}
            className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200/80 bg-slate-50 text-slate-600 transition-all hover:bg-slate-100 active:scale-95 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-300"
            title={t('notificationTitle')}
          >
            <Bell className="h-4 w-4" />
            <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-bold text-white shadow-xs">
              {unreadCount}
            </span>
          </button>

          {showNotifMenu && (
            <div className="absolute right-0 mt-2 w-80 rounded-2xl border border-slate-200 bg-white p-3 shadow-xl dark:border-slate-800 dark:bg-slate-900 z-50">
              <div className="mb-2 flex items-center justify-between border-b border-slate-100 pb-2 dark:border-slate-800">
                <span className="text-xs font-bold text-slate-900 dark:text-white">{t('notificationTitle')}</span>
                <span className="text-[10px] font-medium text-indigo-600 dark:text-indigo-400">{unreadCount} {t('unreadNotifications')}</span>
              </div>
              <div className="max-h-64 space-y-1.5 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="py-6 text-center text-xs text-slate-400">{t('noNotifications')}</div>
                ) : (
                  notifications.map((n) => (
                    <div
                      key={n.id}
                      className={`rounded-xl p-2.5 text-xs transition-colors ${
                        !n.isRead
                          ? 'bg-indigo-50/70 dark:bg-indigo-950/40 font-semibold'
                          : 'bg-slate-50 dark:bg-slate-800/60'
                      }`}
                    >
                      <div className="flex items-center justify-between text-slate-900 dark:text-white">
                        <span>{n.title}</span>
                        <span className="text-[10px] text-slate-400">{n.timeAgo}</span>
                      </div>
                      <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-300 font-normal">{n.message}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Globe / Language Switcher */}
        <div className="relative">
          <button
            id="language-switcher-btn"
            onClick={() => setShowLangMenu(!showLangMenu)}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200/80 bg-slate-50 text-slate-600 transition-all hover:bg-slate-100 active:scale-95 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-300"
            title={t('languageSelector')}
          >
            <Globe className="h-4 w-4" />
          </button>

          {showLangMenu && (
            <div className="absolute right-0 mt-2 w-40 rounded-xl border border-slate-200 bg-white p-1 shadow-lg dark:border-slate-800 dark:bg-slate-900 z-50 animate-in zoom-in-95">
              {languages.map((l) => (
                <button
                  key={l.code}
                  onClick={() => {
                    onLanguageChange(l.code);
                    setShowLangMenu(false);
                  }}
                  className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-xs font-medium ${
                    language === l.code
                      ? 'bg-indigo-50 font-bold text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400'
                      : 'text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span>{l.flag}</span>
                    <span>{l.label}</span>
                  </span>
                  {language === l.code && <Check className="h-3.5 w-3.5 text-indigo-600" />}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Logout / Exit Icon */}
        {onSignOut && (
          <button
            onClick={onSignOut}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200/80 bg-slate-50 text-rose-600 transition-all hover:bg-rose-50 hover:border-rose-200 active:scale-95 dark:border-slate-800 dark:bg-slate-800 dark:text-rose-400 dark:hover:bg-rose-950/50"
            title={t('signOutButton')}
          >
            <LogOut className="h-4 w-4" />
          </button>
        )}
      </div>
    </header>
  );
};
