import React, { useState, useEffect } from 'react';
import {
  Building2,
  CalendarRange,
  FolderKanban,
  DoorOpen,
  BookOpen,
  Plus,
  Search,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Edit2,
  Trash2,
  Users,
  Layers,
  MapPin,
  Phone,
  Mail,
  ShieldCheck,
  GraduationCap,
  Sparkles,
} from 'lucide-react';
import { AppLanguage, TeacherRecord, RoomRecord } from '../../types';
import { useI18n } from '../../lib/i18n';
import { authenticatedFetch } from '../../lib/api';
import { ClassesDirectory } from '../classes/ClassesDirectory';
import { SubjectsDirectory } from '../subjects/SubjectsDirectory';
import { AcademicYearsManager } from '../academic/AcademicYearsManager';

interface SchoolManagementHubProps {
  language: AppLanguage;
  teachers?: TeacherRecord[];
  onNavigateTab?: (tab: string) => void;
  initialSubTab?: 'profile' | 'academic-years' | 'classes' | 'rooms' | 'subjects';
}

export const SchoolManagementHub: React.FC<SchoolManagementHubProps> = ({
  language,
  teachers = [],
  onNavigateTab,
  initialSubTab = 'profile',
}) => {
  const t = useI18n(language);
  const [activeSubTab, setActiveSubTab] = useState<'profile' | 'academic-years' | 'classes' | 'rooms' | 'subjects'>(initialSubTab);

  // Rooms State
  const [rooms, setRooms] = useState<RoomRecord[]>([]);
  const [loadingRooms, setLoadingRooms] = useState(false);
  const [roomSearch, setRoomSearch] = useState('');
  const [roomTypeFilter, setRoomTypeFilter] = useState<string>('all');
  const [isAddRoomModalOpen, setIsAddRoomModalOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState<RoomRecord | null>(null);

  // Room Form State
  const [roomFormData, setRoomFormData] = useState({
    name: '',
    code: '',
    floor: 1,
    building: 'Asosiy bino',
    capacity: 30,
    type: 'classroom' as RoomRecord['type'],
    equipment: [] as string[],
    assignedTeacherName: '',
    assignedClass: '',
    status: 'active' as RoomRecord['status'],
  });

  const [savingRoom, setSavingRoom] = useState(false);
  const [roomToast, setRoomToast] = useState<string | null>(null);

  const fetchRooms = async () => {
    setLoadingRooms(true);
    try {
      const res = await authenticatedFetch('/api/admin/rooms');
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.items)) {
          setRooms(data.items);
        }
      }
    } catch (err) {
      console.error('Failed to fetch rooms:', err);
    } finally {
      setLoadingRooms(false);
    }
  };

  useEffect(() => {
    if (activeSubTab === 'rooms') {
      fetchRooms();
    }
  }, [activeSubTab]);

  const showToast = (msg: string) => {
    setRoomToast(msg);
    setTimeout(() => setRoomToast(null), 3500);
  };

  const handleOpenAddRoom = () => {
    setEditingRoom(null);
    setRoomFormData({
      name: '',
      code: '',
      floor: 1,
      building: 'Asosiy bino',
      capacity: 30,
      type: 'classroom',
      equipment: ['smart_board', 'wi_fi'],
      assignedTeacherName: '',
      assignedClass: '',
      status: 'active',
    });
    setIsAddRoomModalOpen(true);
  };

  const handleOpenEditRoom = (room: RoomRecord) => {
    setEditingRoom(room);
    setRoomFormData({
      name: room.name,
      code: room.code,
      floor: room.floor || 1,
      building: room.building || 'Asosiy bino',
      capacity: room.capacity || 30,
      type: room.type || 'classroom',
      equipment: room.equipment || [],
      assignedTeacherName: room.assignedTeacherName || '',
      assignedClass: room.assignedClass || '',
      status: room.status || 'active',
    });
    setIsAddRoomModalOpen(true);
  };

  const handleSaveRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomFormData.name.trim() || !roomFormData.code.trim()) {
      alert('Xona nomi va kodi talab qilinadi');
      return;
    }

    setSavingRoom(true);
    try {
      if (editingRoom) {
        const res = await authenticatedFetch(`/api/admin/rooms/${editingRoom.id}`, {
          method: 'PUT',
          body: JSON.stringify(roomFormData),
        });
        if (res.ok) {
          showToast('Xona muvaffaqiyatli yangilandi');
          setIsAddRoomModalOpen(false);
          fetchRooms();
        }
      } else {
        const res = await authenticatedFetch('/api/admin/rooms', {
          method: 'POST',
          body: JSON.stringify(roomFormData),
        });
        if (res.ok) {
          showToast('Yangi xona muvaffaqiyatli qo‘shildi');
          setIsAddRoomModalOpen(false);
          fetchRooms();
        }
      }
    } catch (err) {
      console.error('Save room error:', err);
    } finally {
      setSavingRoom(false);
    }
  };

  const handleDeleteRoom = async (id: string) => {
    if (!confirm('Haqiqatan ham ushbu xonani o‘chirmoqchimisiz?')) return;
    try {
      const res = await authenticatedFetch(`/api/admin/rooms/${id}`, { method: 'DELETE' });
      if (res.ok) {
        showToast('Xona o‘chirildi');
        fetchRooms();
      }
    } catch (err) {
      console.error('Delete room error:', err);
    }
  };

  const filteredRooms = rooms.filter((r) => {
    const matchesSearch =
      r.name.toLowerCase().includes(roomSearch.toLowerCase()) ||
      r.code.toLowerCase().includes(roomSearch.toLowerCase()) ||
      (r.assignedTeacherName && r.assignedTeacherName.toLowerCase().includes(roomSearch.toLowerCase())) ||
      (r.assignedClass && r.assignedClass.toLowerCase().includes(roomSearch.toLowerCase()));
    const matchesType = roomTypeFilter === 'all' || r.type === roomTypeFilter;
    return matchesSearch && matchesType;
  });

  return (
    <div className="space-y-6 pb-12 font-sans">
      {/* Toast */}
      {roomToast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 text-xs font-bold text-white shadow-2xl dark:bg-white dark:text-slate-900">
          <CheckCircle2 className="h-4 w-4 text-emerald-400 dark:text-emerald-600" />
          <span>{roomToast}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center gap-3.5">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-xl shadow-indigo-600/30">
            <Building2 className="h-7 w-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                {t('navSchoolManagement') || 'Maktab Boshqaruvi'}
              </h1>
              <span className="rounded-full bg-indigo-100 px-2.5 py-0.5 text-[11px] font-extrabold text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300">
                2026–2027
              </span>
            </div>
            <p className="text-xs text-slate-400 font-semibold mt-0.5">
              Maktab profili, o‘quv yillari, sinflar, xonalar va KAO fan standartlari boshqaruvi
            </p>
          </div>
        </div>

        {/* Sub-tab Navigation Pills */}
        <div className="flex flex-wrap items-center gap-1.5 rounded-2xl bg-slate-100 p-1 text-xs font-bold dark:bg-slate-800">
          <button
            type="button"
            onClick={() => setActiveSubTab('profile')}
            className={`flex items-center gap-1.5 rounded-xl px-3.5 py-2 transition-all cursor-pointer ${
              activeSubTab === 'profile'
                ? 'bg-white text-indigo-600 shadow-xs dark:bg-slate-700 dark:text-white'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
            }`}
          >
            <Building2 className="h-4 w-4" />
            <span>{t('schoolProfile') || 'Maktab Profili'}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('academic-years')}
            className={`flex items-center gap-1.5 rounded-xl px-3.5 py-2 transition-all cursor-pointer ${
              activeSubTab === 'academic-years'
                ? 'bg-white text-indigo-600 shadow-xs dark:bg-slate-700 dark:text-white'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
            }`}
          >
            <CalendarRange className="h-4 w-4" />
            <span>{t('academicYears') || 'O‘quv Yillari'}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('classes')}
            className={`flex items-center gap-1.5 rounded-xl px-3.5 py-2 transition-all cursor-pointer ${
              activeSubTab === 'classes'
                ? 'bg-white text-indigo-600 shadow-xs dark:bg-slate-700 dark:text-white'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
            }`}
          >
            <FolderKanban className="h-4 w-4" />
            <span>{t('classes') || 'Sinflar'}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('rooms')}
            className={`flex items-center gap-1.5 rounded-xl px-3.5 py-2 transition-all cursor-pointer ${
              activeSubTab === 'rooms'
                ? 'bg-white text-indigo-600 shadow-xs dark:bg-slate-700 dark:text-white'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
            }`}
          >
            <DoorOpen className="h-4 w-4" />
            <span>{t('rooms') || 'Xonalar'}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('subjects')}
            className={`flex items-center gap-1.5 rounded-xl px-3.5 py-2 transition-all cursor-pointer ${
              activeSubTab === 'subjects'
                ? 'bg-white text-indigo-600 shadow-xs dark:bg-slate-700 dark:text-white'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
            }`}
          >
            <BookOpen className="h-4 w-4" />
            <span>{t('subjects') || 'Fanlar (KAO)'}</span>
          </button>
        </div>
      </div>

      {/* Sub-tab Content Area */}
      {activeSubTab === 'profile' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Institution Card */}
          <div className="lg:col-span-2 rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Building2 className="h-5 w-5 text-indigo-600" />
                Rasmiy Maktab Pasporti va Ma'lumotlari
              </h2>
              <span className="flex items-center gap-1 text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full dark:bg-emerald-950/50">
                <ShieldCheck className="h-3.5 w-3.5" />
                Davlat akkreditatsiyasidan o‘tgan
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-800/50">
                <span className="text-slate-400 font-bold block mb-1">Muassasa to‘liq nomi:</span>
                <span className="font-extrabold text-slate-900 dark:text-white text-sm">
                  №71 Ixtisoslashtirilgan Maktab-Gimnaziyasi
                </span>
              </div>

              <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-800/50">
                <span className="text-slate-400 font-bold block mb-1">Maktab ID kodi:</span>
                <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">
                  KG-BSH-71-SCH
                </span>
              </div>

              <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-800/50">
                <span className="text-slate-400 font-bold block mb-1">Maktab Direktori:</span>
                <span className="font-extrabold text-slate-900 dark:text-white">
                  Aigul Sadykova (Pedagogika fanlari nomzodi)
                </span>
              </div>

              <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-800/50">
                <span className="text-slate-400 font-bold block mb-1">O‘quv ishlari bo‘yicha Zauch:</span>
                <span className="font-extrabold text-slate-900 dark:text-white">
                  Jasur Karimov (Bosh o‘qituvchi)
                </span>
              </div>

              <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-800/50">
                <span className="text-slate-400 font-bold block mb-1">Manzil & Hudud:</span>
                <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1 mt-0.5">
                  <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                  Bishkek sh., Sverdlov tumani, Chuy shoh ko‘chasi 142
                </span>
              </div>

              <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-800/50">
                <span className="text-slate-400 font-bold block mb-1">Aloqa va Pochta:</span>
                <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2 mt-0.5">
                  <Phone className="h-3.5 w-3.5 text-slate-400" /> +996 (312) 45-88-90
                  <Mail className="h-3.5 w-3.5 text-slate-400 ml-2" /> info@edusphere.school
                </span>
              </div>
            </div>

            {/* Capacities */}
            <div className="border-t border-slate-100 pt-4 dark:border-slate-800">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-3">
                Maktab quvvati va bino sig‘imi
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                <div className="rounded-2xl bg-indigo-50/80 p-3 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/40">
                  <span className="text-[11px] font-bold text-indigo-700 dark:text-indigo-300 block">Jami Sig‘im</span>
                  <span className="text-xl font-black text-indigo-900 dark:text-white font-mono mt-0.5 block">1,350</span>
                  <span className="text-[10px] text-slate-400">o‘rinli</span>
                </div>

                <div className="rounded-2xl bg-emerald-50/80 p-3 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/40">
                  <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300 block">Amaldagi O‘quvchilar</span>
                  <span className="text-xl font-black text-emerald-900 dark:text-white font-mono mt-0.5 block">1,000</span>
                  <span className="text-[10px] text-emerald-600 font-bold">74% bandlik</span>
                </div>

                <div className="rounded-2xl bg-purple-50/80 p-3 dark:bg-purple-950/30 border border-purple-100 dark:border-purple-900/40">
                  <span className="text-[11px] font-bold text-purple-700 dark:text-purple-300 block">Sinflar Soni</span>
                  <span className="text-xl font-black text-purple-900 dark:text-white font-mono mt-0.5 block">26</span>
                  <span className="text-[10px] text-slate-400">1–11 parallellar</span>
                </div>

                <div className="rounded-2xl bg-amber-50/80 p-3 dark:bg-amber-950/30 border border-amber-100 dark:border-amber-900/40">
                  <span className="text-[11px] font-bold text-amber-700 dark:text-amber-300 block">O‘qituvchilar</span>
                  <span className="text-xl font-black text-amber-900 dark:text-white font-mono mt-0.5 block">70</span>
                  <span className="text-[10px] text-slate-400">mutaxassis</span>
                </div>
              </div>
            </div>
          </div>

          {/* Standards Accreditation Card */}
          <div className="space-y-6">
            <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-4">
              <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-indigo-600" />
                Ta'lim Standartlari & KAO Mosligi
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                №71 maktab o‘quv jarayoni Qirg‘iziston Respublikasi Ta‘lim va fan vazirligi hamda KAO (Кыргыз билим берүү академиясы) 2026–2027 o‘quv yili Bazaviy o‘quv rejasi asosida to‘liq akkreditatsiyalangan.
              </p>

              <div className="space-y-2 text-xs font-bold">
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800">
                  <span className="text-slate-700 dark:text-slate-300">Ta'lim tizimi formati:</span>
                  <span className="text-indigo-600 dark:text-indigo-400 font-extrabold">11 yillik + 12 yillik STEM</span>
                </div>
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800">
                  <span className="text-slate-700 dark:text-slate-300">Ta'lim tillari:</span>
                  <span className="text-slate-900 dark:text-white font-bold">Qirg‘iz, Rus, O‘zbek</span>
                </div>
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800">
                  <span className="text-slate-700 dark:text-slate-300">Dars davomiyligi:</span>
                  <span className="text-slate-900 dark:text-white font-bold">45 daqiqa</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sub-tab: Academic Years */}
      {activeSubTab === 'academic-years' && (
        <AcademicYearsManager language={language} />
      )}

      {/* Sub-tab: Classes */}
      {activeSubTab === 'classes' && (
        <ClassesDirectory
          language={language}
          teachers={teachers}
          onNavigateTab={onNavigateTab}
        />
      )}

      {/* Sub-tab: Rooms */}
      {activeSubTab === 'rooms' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-3xl border border-slate-200/80 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
            <div className="flex flex-1 items-center gap-3">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Xona nomi, kodi yoki o‘qituvchini qidirish..."
                  value={roomSearch}
                  onChange={(e) => setRoomSearch(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 pl-10 pr-4 py-2 text-xs font-semibold text-slate-900 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <select
                value={roomTypeFilter}
                onChange={(e) => setRoomTypeFilter(e.target.value)}
                className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-700 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              >
                <option value="all">Barcha xonalar</option>
                <option value="classroom">Sinfxonalar</option>
                <option value="laboratory">Laboratoriyalar</option>
                <option value="computer_lab">IT / Kompyuter</option>
                <option value="gym">Sport zali</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={fetchRooms}
                disabled={loadingRooms}
                className="flex items-center gap-1 rounded-2xl border border-slate-200 bg-white p-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                title="Yangilash"
              >
                <RefreshCw className={`h-4 w-4 ${loadingRooms ? 'animate-spin' : ''}`} />
              </button>

              <button
                type="button"
                onClick={handleOpenAddRoom}
                className="flex items-center gap-1.5 rounded-2xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-indigo-700 cursor-pointer"
              >
                <Plus className="h-4 w-4" />
                <span>Yangi Xona Qo‘shish</span>
              </button>
            </div>
          </div>

          {/* Rooms Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredRooms.map((room) => (
              <div
                key={room.id}
                className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-xs hover:border-indigo-300 dark:border-slate-800 dark:bg-slate-900 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 font-mono">
                        {room.code}
                      </span>
                      <h3 className="text-sm font-extrabold text-slate-900 dark:text-white mt-0.5">
                        {room.name}
                      </h3>
                    </div>
                    <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-extrabold text-slate-700 dark:bg-slate-800 dark:text-slate-300 capitalize">
                      {room.floor}-qavat
                    </span>
                  </div>

                  <div className="mt-4 space-y-2 text-xs">
                    <div className="flex items-center justify-between text-slate-500">
                      <span>Sig‘imi:</span>
                      <span className="font-extrabold text-slate-900 dark:text-white">{room.capacity} ta o‘quvchi</span>
                    </div>
                    <div className="flex items-center justify-between text-slate-500">
                      <span>Biriktirilgan o‘qituvchi:</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200 truncate max-w-[140px]">
                        {room.assignedTeacherName || 'Biriktirilmagan'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-slate-500">
                      <span>Biriktirilgan sinf:</span>
                      <span className="font-bold text-indigo-600 dark:text-indigo-400 font-mono">
                        {room.assignedClass || 'Umumiy'}
                      </span>
                    </div>
                  </div>

                  {/* Equipment badges */}
                  {room.equipment && room.equipment.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1">
                      {room.equipment.map((eq, eIdx) => (
                        <span
                          key={eIdx}
                          className="rounded-lg bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                        >
                          {eq.replace(/_/g, ' ')}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => handleOpenEditRoom(room)}
                    className="flex items-center gap-1 rounded-xl bg-slate-50 px-2.5 py-1.5 text-xs font-bold text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 dark:bg-slate-800 dark:text-slate-300"
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                    <span>Tahrirlash</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteRoom(room.id)}
                    className="flex items-center gap-1 rounded-xl bg-slate-50 p-1.5 text-xs font-bold text-rose-600 hover:bg-rose-50 dark:bg-slate-800"
                    title="O‘chirish"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {filteredRooms.length === 0 && !loadingRooms && (
            <div className="rounded-3xl border border-slate-200/80 bg-white p-12 text-center shadow-xs dark:border-slate-800 dark:bg-slate-900">
              <DoorOpen className="h-10 w-10 text-slate-300 mx-auto mb-3" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Xonalar topilmadi</h3>
              <p className="text-xs text-slate-400 mt-1">Qidiruv parametrlarini o‘zgartiring yoki yangi xona qo‘shing.</p>
            </div>
          )}
        </div>
      )}

      {/* Sub-tab: Subjects */}
      {activeSubTab === 'subjects' && (
        <SubjectsDirectory language={language} />
      )}

      {/* Add / Edit Room Modal */}
      {isAddRoomModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
            <h2 className="text-lg font-black text-slate-900 dark:text-white">
              {editingRoom ? 'Xona ma‘lumotlarini tahrirlash' : 'Yangi Xona / Kabinet Qo‘shish'}
            </h2>

            <form onSubmit={handleSaveRoom} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Xona nomi *</label>
                  <input
                    type="text"
                    required
                    placeholder="Masalan: 101-kabinet (Matematika)"
                    value={roomFormData.name}
                    onChange={(e) => setRoomFormData({ ...roomFormData, name: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 p-2.5 font-bold text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Xona kodi *</label>
                  <input
                    type="text"
                    required
                    placeholder="ROOM-101"
                    value={roomFormData.code}
                    onChange={(e) => setRoomFormData({ ...roomFormData, code: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 p-2.5 font-bold text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Qavat</label>
                  <input
                    type="number"
                    min={1}
                    max={5}
                    value={roomFormData.floor}
                    onChange={(e) => setRoomFormData({ ...roomFormData, floor: Number(e.target.value) })}
                    className="w-full rounded-xl border border-slate-200 p-2.5 font-bold text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Sig‘imi (o‘quvchi)</label>
                  <input
                    type="number"
                    min={10}
                    max={100}
                    value={roomFormData.capacity}
                    onChange={(e) => setRoomFormData({ ...roomFormData, capacity: Number(e.target.value) })}
                    className="w-full rounded-xl border border-slate-200 p-2.5 font-bold text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Turi</label>
                  <select
                    value={roomFormData.type}
                    onChange={(e) => setRoomFormData({ ...roomFormData, type: e.target.value as any })}
                    className="w-full rounded-xl border border-slate-200 p-2.5 font-bold text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  >
                    <option value="classroom">Sinfxona</option>
                    <option value="laboratory">Laboratoriya</option>
                    <option value="computer_lab">IT / Kompyuter</option>
                    <option value="gym">Sport zali</option>
                    <option value="workshop">Ustaxona</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Mas‘ul O‘qituvchi</label>
                  <input
                    type="text"
                    placeholder="Masalan: Jasur Karimov"
                    value={roomFormData.assignedTeacherName}
                    onChange={(e) => setRoomFormData({ ...roomFormData, assignedTeacherName: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 p-2.5 font-bold text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Biriktirilgan Sinf</label>
                  <input
                    type="text"
                    placeholder="Masalan: 7-A"
                    value={roomFormData.assignedClass}
                    onChange={(e) => setRoomFormData({ ...roomFormData, assignedClass: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 p-2.5 font-bold text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddRoomModalOpen(false)}
                  className="rounded-xl px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Bekor qilish
                </button>
                <button
                  type="submit"
                  disabled={savingRoom}
                  className="rounded-xl bg-indigo-600 px-5 py-2 text-xs font-bold text-white shadow-xs hover:bg-indigo-700 disabled:opacity-50 cursor-pointer"
                >
                  {savingRoom ? 'Saqlanmoqda...' : 'Saqlash'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

