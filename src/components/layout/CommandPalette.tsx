import React, { useState, useEffect } from 'react';
import {
  Search,
  ScreenShare,
  Sparkles,
  Bot,
  CalendarCheck,
  FileSpreadsheet,
  Users,
  LayoutDashboard,
  Calendar,
  X,
  ArrowRight,
  UserCheck,
  Database,
  Sliders,
} from 'lucide-react';
import { UserRole } from '../../types';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectAction: (tabId: string) => void;
  onSwitchRole: (role: UserRole) => void;
  currentRole: UserRole;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  onSelectAction,
  onSwitchRole,
  currentRole,
}) => {
  const [query, setQuery] = useState('');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (isOpen) {
          onClose();
        } else {
          // Open
          setQuery('');
        }
      }
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const quickActions = [
    { id: 'dashboard', title: 'Go to Main Overview Dashboard', category: 'General', icon: LayoutDashboard, roles: ['admin', 'teacher', 'parent_student'] },
    { id: 'student-parent', title: 'Open Unified Student & Parent Portal (Oila Portali)', category: 'Family', icon: UserCheck, roles: ['admin', 'teacher', 'parent_student'] },
    { id: 'digital-classroom', title: 'Launch Flagship Digital Classroom & Board', category: 'Classroom', icon: ScreenShare, isAI: true, roles: ['teacher'] },
    { id: 'ai-lesson-gen', title: 'Generate Lesson Plan with AI Wizard', category: 'AI Tools', icon: Sparkles, isAI: true, roles: ['teacher'] },
    { id: 'ai-tutor', title: 'Open Student Assistant', category: 'AI Tools', icon: Bot, isAI: true, roles: ['parent_student'] },
    { id: 'attendance', title: 'Scan Attendance with AI Face ID & QR', category: 'Academic', icon: CalendarCheck, roles: ['admin', 'teacher'] },
    { id: 'gradebook', title: 'Open Gradebook', category: 'Academic', icon: FileSpreadsheet, roles: ['teacher', 'parent_student'] },
    { id: 'homework', title: 'Homework Hub & Submissions', category: 'Academic', icon: ScreenShare, roles: ['teacher', 'parent_student'] },
    { id: 'students', title: 'Manage Student Profiles & Knowledge Graphs', category: 'Management', icon: Users, roles: ['admin', 'teacher'] },
    { id: 'schedule', title: 'View Timetable & Lesson Schedule', category: 'Academic', icon: Calendar, roles: ['admin', 'teacher', 'parent_student'] },
    { id: 'parent-portal', title: 'Open Parent / Student Portal', category: 'Management', icon: UserCheck, roles: ['parent_student'] },
    { id: 'workspace', title: 'Google Workspace Hub', category: 'Integrations', icon: Sparkles, roles: ['admin', 'teacher', 'parent_student'] },
    { id: 'settings', title: 'Check Offline Sync Status & Local IndexedDB', category: 'System', icon: Database, roles: ['admin', 'teacher', 'parent_student'] },
  ];

  const roleShortcuts: { role: UserRole; title: string }[] = [
    { role: 'admin', title: 'Switch to School Director / Admin' },
    { role: 'teacher', title: 'Switch to Teacher Portal' },
    { role: 'parent_student', title: 'Open Parent / Student Portal (Ali Nurdinov)' },
  ];

  const filteredActions = quickActions
    .filter((a) => a.roles.includes(currentRole))
    .filter(
      (a) =>
        a.title.toLowerCase().includes(query.toLowerCase()) ||
        a.category.toLowerCase().includes(query.toLowerCase())
    );

  const filteredRoles = roleShortcuts.filter((r) =>
    r.title.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div
      id="command-palette-backdrop"
      className="fixed inset-0 z-50 flex items-start justify-center bg-slate-950/60 p-4 backdrop-blur-xs sm:p-6 md:p-20"
      onClick={onClose}
    >
      <div
        id="command-palette-modal"
        className="w-full max-w-xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl transition-all dark:border-slate-800 dark:bg-slate-900"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input */}
        <div className="flex items-center border-b border-slate-200 px-4 dark:border-slate-800 min-h-[52px]">
          <Search className="h-5 w-5 text-slate-400 shrink-0" />
          <input
            type="text"
            placeholder="Type a command or search (e.g. Digital Classroom, Face ID, Ali, Teacher)..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
            className="w-full bg-transparent px-3 py-3 text-sm text-slate-900 placeholder-slate-400 focus:outline-hidden dark:text-white"
            style={{ minHeight: '44px' }}
          />
          <button
            onClick={onClose}
            className="flex h-11 w-11 min-h-[44px] min-w-[44px] items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-700 active:scale-95 active:bg-slate-200 dark:hover:bg-slate-800 dark:hover:text-slate-200 dark:active:bg-slate-700 transition-all"
            aria-label="Close Command Palette"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Results List */}
        <div className="max-h-96 space-y-4 overflow-y-auto p-3">
          {/* Quick Actions */}
          <div>
            <div className="px-3 py-1 text-[10px] font-bold tracking-wider text-slate-400 uppercase">
              Navigation & AI Operations
            </div>
            <div className="space-y-1 mt-1">
              {filteredActions.map((action) => {
                const Icon = action.icon;
                return (
                  <button
                    key={action.id}
                    onClick={() => {
                      onSelectAction(action.id);
                      onClose();
                    }}
                    className="flex w-full min-h-[48px] items-center justify-between rounded-xl px-3.5 py-2.5 text-left text-xs font-medium text-slate-700 transition-all hover:bg-slate-100 active:scale-[0.98] active:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-800/80 dark:active:bg-slate-800"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                          action.isAI
                            ? 'bg-indigo-100 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400'
                            : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="font-semibold text-slate-900 dark:text-white">{action.title}</div>
                        <div className="text-[10px] text-slate-400">{action.category}</div>
                      </div>
                    </div>
                    <ArrowRight className="h-4 w-4 text-slate-400 shrink-0" />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Role Switching shortcuts */}
          {filteredRoles.length > 0 && (
            <div>
              <div className="px-3 py-1 text-[10px] font-bold tracking-wider text-slate-400 uppercase">
                Switch Role Profile
              </div>
              <div className="space-y-1 mt-1">
                {filteredRoles.map((r) => (
                  <button
                    key={r.role}
                    onClick={() => {
                      onSwitchRole(r.role);
                      onClose();
                    }}
                    className="flex w-full min-h-[48px] items-center justify-between rounded-xl px-3.5 py-2.5 text-left text-xs text-slate-700 hover:bg-indigo-50 active:scale-[0.98] active:bg-indigo-100 dark:text-slate-300 dark:hover:bg-indigo-950/40 dark:active:bg-indigo-950 transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400">
                        <UserCheck className="h-4 w-4" />
                      </div>
                      <span className="font-semibold text-slate-900 dark:text-white">{r.title}</span>
                    </div>
                    <span className="rounded-lg bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                      Select
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50 px-4 py-2 text-[11px] text-slate-500 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-400">
          <span>Navigate with <b>Tab</b> / <b>Arrows</b></span>
          <span><b>ESC</b> to close</span>
        </div>
      </div>
    </div>
  );
};
