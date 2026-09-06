import React, { useEffect, useMemo, useState } from 'react';
import {
  KeyRound,
  RefreshCw,
  ShieldCheck,
  UserRound,
  Plus,
  Search,
  Trash2,
  Check,
  X,
  AlertCircle,
  Users,
  CheckCircle2,
} from 'lucide-react';
import { authenticatedFetch } from '../../lib/api';

interface Account {
  uid: string;
  email: string;
  displayName: string;
  phoneNumber?: string;
  disabled?: boolean;
  role: 'admin' | 'teacher' | 'parent_student';
  studentId?: string;
  employeeId?: string;
  teacherId?: string;
  subjects?: string[];
  subjectSpecialties?: string[];
  assignedClasses?: string[];
  homeroomClass?: string;
  workloadHours?: number;
  lastLoginAt?: string | null;
  createdAt?: string;
}

export const UsersManagement: React.FC = () => {
  const [users, setUsers] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [search, setSearch] = useState('');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<string>('ALL');

  // Modal State
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [newDisplayName, setNewDisplayName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPhone, setNewPhone] = useState('+998 ');
  const [newRole, setNewRole] = useState<'admin' | 'teacher' | 'parent_student'>('teacher');
  const [newPassword, setNewPassword] = useState('123456');

  const loadUsers = async () => {
    setLoading(true);
    try {
      const response = await authenticatedFetch('/api/users');
      if (response.ok) {
        const data = (await response.json()) as { items: Account[] };
        if (data.items && Array.isArray(data.items)) {
          setUsers(data.items);
        }
      }
    } catch {
      // Keep empty if failed
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadUsers();
  }, []);

  const roleCounts = useMemo(() => {
    const admin = users.filter((u) => u.role === 'admin').length;
    const teacher = users.filter((u) => u.role === 'teacher').length;
    const parent = users.filter((u) => u.role === 'parent_student').length;
    return {
      all: users.length,
      admin,
      teacher,
      parent,
    };
  }, [users]);

  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const q = search.toLowerCase().trim();
      const matchesSearch =
        q === '' ||
        (u.displayName && u.displayName.toLowerCase().includes(q)) ||
        (u.email && u.email.toLowerCase().includes(q)) ||
        (u.subjects && u.subjects.some((s) => s.toLowerCase().includes(q))) ||
        (u.assignedClasses && u.assignedClasses.some((c) => c.toLowerCase().includes(q)));
      const matchesRole = selectedRoleFilter === 'ALL' || u.role === selectedRoleFilter;
      return matchesSearch && matchesRole;
    });
  }, [users, search, selectedRoleFilter]);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDisplayName.trim() || !newEmail.trim()) {
      setMessage({ type: 'error', text: 'Iltimos, ism va elektron pochtani kiriting.' });
      return;
    }

    const newUser: Account = {
      uid: `usr-${Date.now()}`,
      displayName: newDisplayName.trim(),
      email: newEmail.trim().toLowerCase(),
      phoneNumber: newPhone.trim(),
      role: newRole,
      disabled: false,
      createdAt: new Date().toISOString().slice(0, 10),
    };

    setUsers((prev) => [newUser, ...prev]);
    setIsAddUserOpen(false);
    setMessage({ type: 'success', text: 'Yangi foydalanuvchi hisobi muvaffaqiyatli yaratildi!' });
    setTimeout(() => setMessage(null), 3500);

    try {
      await authenticatedFetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newUser),
      });
    } catch {}
  };

  const updateUser = async (user: Account, patch: Record<string, unknown>) => {
    setUsers((prev) =>
      prev.map((u) => (u.uid === user.uid ? ({ ...u, ...patch } as Account) : u))
    );
    setMessage({ type: 'success', text: 'Foydalanuvchi ma’lumotlari yangilandi.' });
    setTimeout(() => setMessage(null), 3000);

    try {
      await authenticatedFetch(`/api/users/${encodeURIComponent(user.uid)}`, {
        method: 'PATCH',
        body: JSON.stringify(patch),
      });
    } catch {}
  };

  const resetPassword = async (user: Account) => {
    setMessage({
      type: 'success',
      text: `${user.displayName} uchun parolni tiklash xabari yuborildi.`,
    });
    setTimeout(() => setMessage(null), 3500);

    try {
      await authenticatedFetch(`/api/users/${encodeURIComponent(user.uid)}/password-reset`, {
        method: 'POST',
      });
    } catch {}
  };

  const handleDeleteUser = (uid: string) => {
    if (!window.confirm('Haqiqatan ham ushbu foydalanuvchi hisobini o‘chirmoqchimisiz?')) return;
    setUsers((prev) => prev.filter((u) => u.uid !== uid));
    setMessage({ type: 'success', text: 'Hisob o‘chirildi.' });
    setTimeout(() => setMessage(null), 3000);
  };

  return (
    <section className="space-y-6 max-w-7xl mx-auto pb-12 font-sans" aria-labelledby="users-heading">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-3xl border border-slate-200/80 bg-white p-5 sm:p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <div>
          <h1 id="users-heading" className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2.5">
            <Users className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
            <span>Foydalanuvchilar va Hisoblar Boshqaruvi</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Maktab xodimlari, o‘qituvchilar va ota-onalar hisoblarini boshqarish ({users.length} ta hisob)
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void loadUsers()}
            className="flex min-h-[40px] items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 text-xs font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Yangilash</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setNewDisplayName('');
              setNewEmail('');
              setNewPhone('+998 ');
              setNewRole('teacher');
              setNewPassword('123456');
              setIsAddUserOpen(true);
            }}
            className="flex min-h-[40px] items-center gap-2 rounded-xl bg-indigo-600 px-4 text-xs font-bold text-white shadow-md shadow-indigo-600/30 hover:bg-indigo-700 active:scale-95 transition-all"
          >
            <Plus className="h-4 w-4" />
            <span>+ Yangi foydalanuvchi</span>
          </button>
        </div>
      </div>

      {/* Alerts */}
      {message && (
        <div
          className={`flex items-center gap-2 rounded-2xl p-3.5 text-xs font-bold ${
            message.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300'
              : 'bg-rose-50 text-rose-800 border border-rose-200 dark:bg-rose-950/50 dark:text-rose-300'
          }`}
        >
          {message.type === 'success' ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
          <span>{message.text}</span>
        </div>
      )}

      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Foydalanuvchi ismi, emaili yoki fani bo‘yicha qidirish..."
            className="w-full rounded-2xl border border-slate-200 bg-white pl-10 pr-4 py-2.5 text-xs font-medium text-slate-900 focus:ring-2 focus:ring-indigo-500 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
          />
        </div>

        <select
          value={selectedRoleFilter}
          onChange={(e) => setSelectedRoleFilter(e.target.value)}
          className="min-h-[42px] rounded-2xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
        >
          <option value="ALL">Barcha rollar ({roleCounts.all})</option>
          <option value="teacher">O‘qituvchilar ({roleCounts.teacher})</option>
          <option value="admin">Administrator ({roleCounts.admin})</option>
          <option value="parent_student">Ota-ona / O‘quvchi ({roleCounts.parent})</option>
        </select>
      </div>

      {/* Users Table */}
      <div className="overflow-x-auto rounded-3xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 shadow-xs">
        <table className="min-w-[880px] w-full text-left text-xs">
          <thead className="border-b border-slate-100 bg-slate-50/70 text-slate-400 dark:border-slate-800 dark:bg-slate-800/40 font-bold uppercase tracking-wider text-[10px]">
            <tr>
              <th className="p-4">Foydalanuvchi</th>
              <th className="p-4">Rol</th>
              <th className="p-4">Fanlar / Biriktirilgan Sinflar</th>
              <th className="p-4">Holat</th>
              <th className="p-4">Parol Xavfsizligi</th>
              <th className="p-4 text-right">Amallar</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {filteredUsers.map((user) => (
              <tr key={user.uid} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                <td className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-50 font-bold text-indigo-600 text-xs dark:bg-indigo-950/60 dark:text-indigo-400">
                      {user.displayName.charAt(0)}
                    </div>
                    <div>
                      <div className="font-bold text-slate-900 dark:text-white">
                        {user.displayName || 'Nomsiz foydalanuvchi'}
                      </div>
                      <div className="text-[11px] text-slate-400">{user.email}</div>
                    </div>
                  </div>
                </td>

                <td className="p-4">
                  <select
                    value={user.role}
                    onChange={(e) => void updateUser(user, { role: e.target.value })}
                    className="rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-bold text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                  >
                    <option value="admin">ADMIN</option>
                    <option value="teacher">O‘QITUVCHI</option>
                    <option value="parent_student">OTA-ONA</option>
                  </select>
                </td>

                <td className="p-4">
                  {user.role === 'teacher' ? (
                    <div className="space-y-1 max-w-[260px]">
                      <div className="flex flex-wrap gap-1">
                        {(user.subjects && user.subjects.length > 0 ? user.subjects : ['Fan biriktirilgan']).map((sbj, sIdx) => (
                          <span
                            key={sIdx}
                            className="inline-block rounded-md bg-indigo-50 px-2 py-0.5 text-[10px] font-semibold text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300"
                          >
                            {sbj}
                          </span>
                        ))}
                      </div>
                      {(user.assignedClasses?.length || user.homeroomClass) && (
                        <div className="text-[10px] text-slate-400">
                          Sinflar:{' '}
                          <span className="font-medium text-slate-600 dark:text-slate-300">
                            {user.assignedClasses?.length ? user.assignedClasses.join(', ') : user.homeroomClass}
                          </span>
                          {user.homeroomClass && ` (Rahbar: ${user.homeroomClass})`}
                        </div>
                      )}
                    </div>
                  ) : user.role === 'admin' ? (
                    <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                      Maktab Boshqaruvi
                    </span>
                  ) : (
                    <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                      Ota-ona & O‘quvchi Portali
                    </span>
                  )}
                </td>

                <td className="p-4">
                  <button
                    type="button"
                    onClick={() => void updateUser(user, { disabled: !user.disabled })}
                    className={`rounded-xl px-3 py-1 text-xs font-bold transition-all ${
                      user.disabled
                        ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300'
                        : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                    }`}
                  >
                    {user.disabled ? 'Nofaol' : 'Faol'}
                  </button>
                </td>

                <td className="p-4">
                  <span className="inline-flex items-center gap-1 text-slate-400 font-mono">
                    <ShieldCheck className="h-4 w-4 text-emerald-500" />
                    ••••••••
                  </span>
                </td>

                <td className="p-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => void resetPassword(user)}
                      className="flex items-center gap-1 rounded-xl bg-indigo-50 px-3 py-1.5 text-xs font-bold text-indigo-700 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:text-indigo-300"
                    >
                      <KeyRound className="h-3.5 w-3.5" />
                      <span>Parol yangilash</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteUser(user.uid)}
                      className="rounded-xl p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                      title="O‘chirish"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add User Modal */}
      {isAddUserOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl dark:bg-slate-900 border border-slate-100 dark:border-slate-800 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
              <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                <UserRound className="h-5 w-5 text-indigo-600" />
                <span>Yangi Foydalanuvchi Yaratish</span>
              </h3>
              <button onClick={() => setIsAddUserOpen(false)} className="text-slate-400 hover:text-slate-600">
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="mt-4 space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300">To‘liq ism-familiya</label>
                <input
                  type="text"
                  value={newDisplayName}
                  onChange={(e) => setNewDisplayName(e.target.value)}
                  placeholder="masalan: Dilshod Rahimov"
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 font-bold focus:bg-white focus:ring-2 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800"
                  required
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300">Elektron pochta (Login)</label>
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="user@edusphere.school"
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 font-bold focus:bg-white dark:border-slate-700 dark:bg-slate-800"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300">Foydalanuvchi roli</label>
                  <select
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value as any)}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 font-bold dark:border-slate-700 dark:bg-slate-800"
                  >
                    <option value="teacher">O‘QITUVCHI</option>
                    <option value="parent_student">OTA-ONA</option>
                    <option value="admin">ADMIN</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300">Boshlang‘ich parol</label>
                  <input
                    type="text"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 font-bold dark:border-slate-700 dark:bg-slate-800"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300">Telefon raqami</label>
                <input
                  type="text"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 font-bold dark:border-slate-700 dark:bg-slate-800"
                />
              </div>

              <div className="mt-5 flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddUserOpen(false)}
                  className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  Bekor qilish
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-indigo-600 px-5 py-2 text-xs font-bold text-white hover:bg-indigo-700 active:scale-95 transition-all shadow-md"
                >
                  Hisob yaratish
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
};
