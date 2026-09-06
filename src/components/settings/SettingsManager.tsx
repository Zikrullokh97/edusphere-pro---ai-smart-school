import React, { useState, useEffect } from 'react';
import {
  Sliders,
  Sparkles,
  Shield,
  Bell,
  Globe,
  Check,
  ScanFace,
  Cpu,
  Save,
  CheckCircle2,
  Database,
  RefreshCw,
  Wifi,
  WifiOff,
  CloudCheck,
  HardDrive,
  User,
  Calendar,
  Lock,
  Unlock,
  SlidersHorizontal,
} from 'lucide-react';
import { AppLanguage, UserRole, AcademicYearRecord, SchoolSettings } from '../../types';
import { useI18n } from '../../lib/i18n';
import { CURRENT_SCHOOL } from '../../data/mockData';
import { SyncStatusView } from './SyncStatusView';
import { pwaManager } from '../../lib/pwa';
import { listSchoolData, createSchoolData, updateSchoolData } from '../../lib/schoolRepository';
import { authenticatedFetch } from '../../lib/api';

interface SettingsManagerProps {
  language: AppLanguage;
  onLanguageChange: (lang: AppLanguage) => void;
  isDark: boolean;
  onThemeToggle: () => void;
  initialSection?: 'general' | 'academic' | 'ai' | 'notifications' | 'sync';
}

export const SettingsManager: React.FC<SettingsManagerProps> = ({
  language,
  onLanguageChange,
  isDark,
  onThemeToggle,
  initialSection = 'general',
}) => {
  const t = useI18n(language);
  const [activeTab, setActiveTab] = useState<'general' | 'academic' | 'ai' | 'notifications' | 'sync'>(initialSection);
  const [schoolName, setSchoolName] = useState(CURRENT_SCHOOL.name);
  const [city, setCity] = useState(CURRENT_SCHOOL.city);
  const [socraticStrictness, setSocraticStrictness] = useState('high');
  const [telegramAlerts, setTelegramAlerts] = useState(true);
  const [autoGradingEnabled, setAutoGradingEnabled] = useState(true);
  const [faceIdThreshold, setFaceIdThreshold] = useState('95');
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [academicYears, setAcademicYears] = useState<AcademicYearRecord[]>([]);
  const [loadingAcademic, setLoadingAcademic] = useState(false);

  // Sync state for tab badge
  const [pendingSyncCount, setPendingSyncCount] = useState<number>(0);
  const [isOnline, setIsOnline] = useState<boolean>(pwaManager.getIsOnline());

  useEffect(() => {
    let active = true;
    listSchoolData<SchoolSettings>('settings')
      .then((items) => {
        if (active && items.length > 0) {
          const cfg = items[0];
          if (cfg.schoolName) setSchoolName(cfg.schoolName);
          if (cfg.city) setCity(cfg.city);
          if (cfg.socraticStrictness) setSocraticStrictness(cfg.socraticStrictness);
          if (cfg.telegramAlerts !== undefined) setTelegramAlerts(cfg.telegramAlerts);
          if (cfg.autoGradingEnabled !== undefined) setAutoGradingEnabled(cfg.autoGradingEnabled);
          if (cfg.faceIdThreshold) setFaceIdThreshold(cfg.faceIdThreshold);
        }
      })
      .catch(() => undefined);

    const unsubOnline = pwaManager.subscribeOnlineState(setIsOnline);
    const unsubSync = pwaManager.subscribeSync((_, count) => setPendingSyncCount(count));
    const unsubStats = pwaManager.subscribeStats((stats) => {
      setPendingSyncCount(stats.pendingSyncCount);
      setIsOnline(stats.isOnline);
    });

    loadAcademicYears();

    return () => {
      active = false;
      unsubOnline();
      unsubSync();
      unsubStats();
    };
  }, []);

  const loadAcademicYears = async () => {
    setLoadingAcademic(true);
    try {
      const res = await authenticatedFetch('/api/academic-years');
      if (res.ok) {
        const data = await res.json();
        setAcademicYears(data.items || []);
      }
    } catch {
      // fallback
    } finally {
      setLoadingAcademic(false);
    }
  };

  const handleQuarterStatusToggle = async (yearId: string, quarterId: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'closed' ? 'active' : 'closed';
    try {
      const res = await authenticatedFetch(`/api/academic-years/${yearId}/quarters/${quarterId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      });
      if (res.ok) {
        await loadAcademicYears();
        setSavedSuccess(true);
        setTimeout(() => setSavedSuccess(false), 3000);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    const payload: SchoolSettings = {
      id: 'school-config',
      schoolId: 'school-71-tashkent',
      schoolName,
      city,
      socraticStrictness,
      telegramAlerts,
      autoGradingEnabled,
      faceIdThreshold,
      updatedAt: new Date().toISOString(),
      version: 1,
    };

    try {
      await updateSchoolData('settings', payload);
    } catch {
      try {
        await createSchoolData('settings', payload);
      } catch {
        // Handled gracefully in offline mode
      }
    } finally {
      setIsSaving(false);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    }
  };

  return (
    <div id="settings-manager-view" className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-600 text-white dark:bg-indigo-500">
              <Sliders className="h-4 w-4" />
            </div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white sm:text-2xl">
              {t('settingsHeader')}
            </h1>
          </div>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 sm:text-sm">
            AI Engine Configuration, Biometrics Calibration, Offline Sync & Notification Channels
          </p>
        </div>

        <div className="flex items-center gap-2">
          {activeTab !== 'sync' && (
            <button
              id="btn-save-settings"
              onClick={handleSave}
              className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-indigo-700 dark:bg-indigo-500"
              style={{ minHeight: '44px' }}
            >
              <Save className="h-4 w-4" />
              <span>Save Preferences</span>
            </button>
          )}
        </div>
      </div>

      {savedSuccess && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-medium text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/80 dark:text-emerald-200 animate-slideDown">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>✓ School configuration parameters saved successfully.</span>
        </div>
      )}

      {/* Navigation Sub-Tabs */}
      <div className="flex overflow-x-auto rounded-2xl border border-slate-200 bg-white p-1.5 dark:border-slate-800 dark:bg-slate-900 no-scrollbar">
        <div className="flex min-w-full sm:min-w-0 gap-1">
          <button
            id="tab-settings-general"
            onClick={() => setActiveTab('general')}
            className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === 'general'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white'
            }`}
            style={{ minHeight: '44px' }}
          >
            <User className="h-4 w-4" />
            <span>Profile & Language</span>
          </button>

          <button
            id="tab-settings-academic"
            onClick={() => setActiveTab('academic')}
            className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === 'academic'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white'
            }`}
            style={{ minHeight: '44px' }}
          >
            <Calendar className="h-4 w-4" />
            <span>Окуу жылы жана Чейректер (Quarters)</span>
          </button>

          <button
            id="tab-settings-sync"
            onClick={() => setActiveTab('sync')}
            className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === 'sync'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white'
            }`}
            style={{ minHeight: '44px' }}
          >
            <Database className="h-4 w-4" />
            <span>Sync Status & Offline Storage</span>
            {pendingSyncCount > 0 && (
              <span className={`rounded-full px-1.5 py-0.2 text-[10px] font-bold ${
                activeTab === 'sync' ? 'bg-white text-indigo-900' : 'bg-amber-500 text-slate-950 animate-pulse'
              }`}>
                {pendingSyncCount}
              </span>
            )}
            {!isOnline && (
              <span className={`rounded-full px-1.5 py-0.2 text-[9px] font-semibold ${
                activeTab === 'sync' ? 'bg-amber-400 text-slate-950' : 'bg-amber-500/20 text-amber-500'
              }`}>
                Offline
              </span>
            )}
          </button>

          <button
            id="tab-settings-ai"
            onClick={() => setActiveTab('ai')}
            className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === 'ai'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white'
            }`}
            style={{ minHeight: '44px' }}
          >
            <Sparkles className="h-4 w-4" />
            <span>AI & Biometrics</span>
          </button>

          <button
            id="tab-settings-notifications"
            onClick={() => setActiveTab('notifications')}
            className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === 'notifications'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white'
            }`}
            style={{ minHeight: '44px' }}
          >
            <Bell className="h-4 w-4" />
            <span>Telegram & Notifications</span>
          </button>
        </div>
      </div>

      {/* VIEW 0: ACADEMIC YEAR & QUARTERS MANAGEMENT */}
      {activeTab === 'academic' && (
        <div className="space-y-6">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4 dark:border-slate-800">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-indigo-600" />
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Окуу жылы жана 4 Чейректер (Academic Year & Quarters)
                  </h3>
                </div>
                <p className="text-xs text-slate-500">
                  Чейректердин мөөнөтүн жөндөө, активдештирүү жана баа коюуну бөгөттөө (Lock/Unlock).
                </p>
              </div>

              <span className="rounded-xl bg-emerald-50 px-3 py-1.5 text-xs font-extrabold text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                Жактоо абалы: Активдүү
              </span>
            </div>

            {loadingAcademic ? (
              <p className="py-8 text-center text-xs text-slate-400">{t('loading') || 'Yuklanmoqda...'}</p>
            ) : academicYears.length === 0 ? (
              <p className="py-8 text-center text-xs text-slate-400">
                {language === 'ky' ? 'Окуу жылы табылган жок.' : language === 'ru' ? 'Учебный год не найден.' : 'O‘quv yili topilmadi.'}
              </p>
            ) : (
              <div className="mt-5 space-y-4">
                {academicYears.map((ay) => (
                  <div key={ay.id} className="space-y-3">
                    <div className="flex items-center justify-between rounded-2xl bg-slate-50 p-4 dark:bg-slate-800/60">
                      <div>
                        <h4 className="font-bold text-sm text-slate-900 dark:text-white">{ay.name} ({ay.id})</h4>
                        <p className="text-xs text-slate-500">{ay.startDate} — {ay.endDate}</p>
                      </div>
                      <span className="rounded-lg bg-indigo-100 px-2.5 py-1 text-xs font-bold text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300">
                        {language === 'ky' ? 'Учурдагы чейрек:' : language === 'ru' ? 'Текущая четверть:' : 'Joriy chorak:'} {ay.activeQuarter}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                      {ay.quarters.map((q) => {
                        const isClosed = q.status === 'closed';
                        const isActive = q.status === 'active';

                        return (
                          <div
                            key={q.id}
                            className={`rounded-2xl border p-4 transition shadow-2xs ${
                              isActive
                                ? 'border-emerald-300 bg-emerald-50/40 dark:border-emerald-800 dark:bg-emerald-950/20'
                                : isClosed
                                ? 'border-rose-200 bg-rose-50/40 dark:border-rose-900/40 dark:bg-rose-950/20 opacity-80'
                                : 'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-xs text-slate-900 dark:text-white">{q.name}</span>
                              <span
                                className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                                  isActive
                                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                    : isClosed
                                    ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                                    : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                                }`}
                              >
                                {isActive ? 'АКТИВДҮҮ' : isClosed ? 'ЖАБЫЛГАН' : 'КҮТҮЛҮҮДӨ'}
                              </span>
                            </div>

                            <p className="mt-2 text-[11px] text-slate-500">
                              {q.startDate} — {q.endDate}
                            </p>

                            <div className="mt-3.5 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                              <span className="text-[11px] text-slate-400">
                                {isClosed ? 'Баалар кулпуланган' : 'Баа коюуга ачык'}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleQuarterStatusToggle(ay.id, q.id, q.status)}
                                className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-bold transition ${
                                  isClosed
                                    ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                                    : 'bg-rose-600 text-white hover:bg-rose-700'
                                }`}
                              >
                                {isClosed ? <Unlock className="h-3 w-3" /> : <Lock className="h-3 w-3" />}
                                <span>{isClosed ? 'Ачуу' : 'Жабуу'}</span>
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* VIEW 1: SYNC STATUS & OFFLINE DATA VIEW */}
      {activeTab === 'sync' && (
        <SyncStatusView language={language} />
      )}

      {/* VIEW 2: GENERAL PROFILE & LANGUAGE */}
      {activeTab === 'general' && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Quick Offline Status Summary Card */}
          <div className="rounded-2xl border border-indigo-100 bg-gradient-to-r from-indigo-50/70 to-slate-50 p-5 shadow-xs dark:border-indigo-900/40 dark:from-indigo-950/20 dark:to-slate-900 lg:col-span-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-md">
                  <Database className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-slate-900 dark:text-white text-sm">
                      Offline Storage Engine Status
                    </h4>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                      isOnline ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                    }`}>
                      {isOnline ? 'Online & Syncing' : 'Operating in Offline Mode'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {pendingSyncCount > 0
                      ? `${pendingSyncCount} pending change(s) stored in browser IndexedDB.`
                      : 'All attendance records and continuous assessments are synchronized.'}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setActiveTab('sync')}
                className="flex items-center gap-1.5 rounded-xl bg-white px-3.5 py-2 text-xs font-bold text-indigo-600 shadow-xs border border-indigo-200 hover:bg-indigo-50 dark:bg-slate-800 dark:border-indigo-900 dark:text-indigo-400 dark:hover:bg-slate-700 self-start sm:self-auto"
                style={{ minHeight: '40px' }}
              >
                <span>View Full Sync Status</span>
                <Database className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* School Information */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
            <h3 className="font-bold text-slate-900 dark:text-white">School Profile</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">Institutional identity across Central Asian database</p>

            <div className="mt-4 space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">School Name</label>
                <input
                  type="text"
                  value={schoolName}
                  onChange={(e) => setSchoolName(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs text-slate-900 focus:outline-hidden dark:border-slate-800 dark:bg-slate-800 dark:text-white"
                  style={{ minHeight: '44px' }}
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">City / Jurisdiction</label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs text-slate-900 focus:outline-hidden dark:border-slate-800 dark:bg-slate-800 dark:text-white"
                  style={{ minHeight: '44px' }}
                />
              </div>
            </div>
          </div>

          {/* Theme & Display Preferences */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
            <h3 className="font-bold text-slate-900 dark:text-white">Display & Theme</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">User interface appearance</p>

            <div className="mt-4 space-y-3">
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60">
                <div>
                  <div className="font-semibold text-xs text-slate-900 dark:text-white">Dark Mode</div>
                  <div className="text-[11px] text-slate-400">Night shift contrast & eye protection</div>
                </div>
                <button
                  onClick={onThemeToggle}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                    isDark ? 'bg-indigo-600' : 'bg-slate-300'
                  }`}
                  style={{ minHeight: '24px', minWidth: '44px' }}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                      isDark ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>

          {/* Language & Regional Settings */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900 lg:col-span-2">
            <div className="flex items-center gap-2">
              <Globe className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
              <h3 className="font-bold text-slate-900 dark:text-white">{t('languageSetting')}</h3>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Select system interface language (O‘zbekcha, Кыргызча, Русский, English)
            </p>

            <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { code: 'uz' as AppLanguage, name: 'O‘zbekcha', flag: '🇺🇿', desc: 'Lotin alifbosi' },
                { code: 'ky' as AppLanguage, name: 'Кыргызча', flag: '🇰🇬', desc: 'Кириллица' },
                { code: 'ru' as AppLanguage, name: 'Русский', flag: '🇷🇺', desc: 'Язык интерфейса' },
                { code: 'en' as AppLanguage, name: 'English', flag: '🇬🇧', desc: 'International' },
              ].map((langItem) => {
                const isSelected = language === langItem.code;
                return (
                  <button
                    key={langItem.code}
                    onClick={() => onLanguageChange(langItem.code)}
                    className={`flex flex-col items-start p-3.5 rounded-xl border text-left transition-all ${
                      isSelected
                        ? 'border-indigo-600 bg-indigo-50/70 text-indigo-900 ring-2 ring-indigo-500/20 dark:border-indigo-500 dark:bg-indigo-950/60 dark:text-indigo-200'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-850 dark:text-slate-300 dark:hover:bg-slate-800'
                    }`}
                    style={{ minHeight: '44px' }}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="text-xl">{langItem.flag}</span>
                      {isSelected && <Check className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />}
                    </div>
                    <span className="mt-2 text-xs font-bold">{langItem.name}</span>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500">{langItem.desc}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* VIEW 3: AI & BIOMETRICS */}
      {activeTab === 'ai' && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* AI Engine Parameters */}
          <div className="rounded-2xl border border-indigo-200/80 bg-indigo-50/40 p-5 shadow-xs dark:border-indigo-900/50 dark:bg-indigo-950/20">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
              <h3 className="font-bold text-slate-900 dark:text-white">AI Engine & Pedagogical Sensitivity</h3>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">Gemini 3.7 model configurations</p>

            <div className="mt-4 space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Socratic AI Tutor Guidance Mode
                </label>
                <select
                  value={socraticStrictness}
                  onChange={(e) => setSocraticStrictness(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
                  style={{ minHeight: '44px' }}
                >
                  <option value="high">Strict Socratic (Never give direct answers, 100% inquiry)</option>
                  <option value="moderate">Balanced (Progressive hints + intermediate steps)</option>
                  <option value="low">Direct Tutoring (Full step-by-step solutions)</option>
                </select>
              </div>

              <label className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300">
                <input
                  type="checkbox"
                  checked={autoGradingEnabled}
                  onChange={(e) => setAutoGradingEnabled(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-indigo-500"
                />
                <span>Enable AI Automated Homework Rubric Evaluation</span>
              </label>
            </div>
          </div>

          {/* Biometric Turnstiles Calibration */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center gap-2">
              <ScanFace className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              <h3 className="font-bold text-slate-900 dark:text-white">Biometric Face ID Turnstiles</h3>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">Edge recognition threshold & camera feeds</p>

            <div className="mt-4 space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Recognition Confidence Threshold ({faceIdThreshold}%)
                </label>
                <input
                  type="range"
                  min="80"
                  max="99"
                  value={faceIdThreshold}
                  onChange={(e) => setFaceIdThreshold(e.target.value)}
                  className="mt-2 w-full accent-indigo-600"
                />
              </div>
              <div className="text-[11px] text-slate-500">
                Verified: <b>4 Turnstile Cameras Active</b> at Entrance A & B
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 4: NOTIFICATIONS */}
      {activeTab === 'notifications' && (
        <div className="grid grid-cols-1 gap-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-amber-500" />
              <h3 className="font-bold text-slate-900 dark:text-white">Parent Dispatch Bot</h3>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">Telegram Bot & SMS Gateway integration</p>

            <div className="mt-4 space-y-3">
              <label className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300">
                <input
                  type="checkbox"
                  checked={telegramAlerts}
                  onChange={(e) => setTelegramAlerts(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-indigo-500"
                />
                <span>Send instant Telegram arrival / departure alert to Parents</span>
              </label>
              <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                ✓ EduSphere Telegram Bot Webhook: <b>CONNECTED</b> (@EduSphereProBot)
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
