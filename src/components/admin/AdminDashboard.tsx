import React, { useState, useEffect } from 'react';
import { 
  Users, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  UserMinus, 
  Percent, 
  QrCode, 
  MapPin, 
  Megaphone,
  RefreshCw,
  ExternalLink,
  ChevronRight,
  CalendarDays,
  Trash2,
  GraduationCap
} from 'lucide-react';
import { api } from '../../lib/api.js';
import { AttendanceRecord, Student } from '../../types.js';
import { AdminMenuTab } from './AdminSidebar.js';
import { getWIBTimeString, formatIndonesianDate } from '../../lib/dateUtils.js';
import { ConfirmModal } from '../common/ConfirmModal.js';

interface AdminDashboardProps {
  onNavigateTab: (tab: AdminMenuTab) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onNavigateTab }) => {
  const [wibTime, setWibTime] = useState<string>(() => getWIBTimeString());
  const [wibDate, setWibDate] = useState<string>(() => formatIndonesianDate());

  useEffect(() => {
    const timer = setInterval(() => {
      setWibTime(getWIBTimeString());
      setWibDate(formatIndonesianDate());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const [stats, setStats] = useState({
    total_students: 0,
    total_present: 0,
    total_late: 0,
    total_permission: 0,
    total_sick: 0,
    total_alpha: 0,
    attendance_percentage: 0,
  });

  const [isHoliday, setIsHoliday] = useState<boolean>(false);
  const [holidayName, setHolidayName] = useState<string | null>(null);
  const [todayRecords, setTodayRecords] = useState<AttendanceRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deleteRecord, setDeleteRecord] = useState<AttendanceRecord | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [newlyAddedIds, setNewlyAddedIds] = useState<Set<string>>(new Set());
  const prevRecordIdsRef = React.useRef<Set<string>>(new Set());

  const handleConfirmDelete = async () => {
    if (!deleteRecord) return;
    setIsDeleting(true);
    try {
      const res = await api.delete<{ success: boolean; message: string }>(`/attendance/${deleteRecord.id}`);
      if (res.success) {
        setTodayRecords((prev) => prev.filter((r) => r.id !== deleteRecord.id));
        setDeleteRecord(null);
        fetchDashboardData();
      } else {
        alert(res.message || 'Gagal menghapus data absensi.');
      }
    } catch (err: any) {
      alert(err.message || 'Terjadi kesalahan saat menghapus data.');
    } finally {
      setIsDeleting(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    // Real-time auto-refresh every 5 seconds for instant attendance monitoring without manual reload
    const interval = setInterval(() => {
      fetchDashboardData(true);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchDashboardData = async (isBackground = false) => {
    if (!isBackground) setIsLoading(true);
    try {
      const res = await api.get<{
        success: boolean;
        date: string;
        is_holiday?: boolean;
        holiday_name?: string;
        records: AttendanceRecord[];
        stats: typeof stats;
      }>('/attendance/today');

      if (res.success) {
        const incoming = res.records || [];
        // Detect newly arrived records for live highlight animation
        if (prevRecordIdsRef.current.size > 0) {
          const freshIds = new Set<string>();
          incoming.forEach((r) => {
            if (!prevRecordIdsRef.current.has(r.id)) {
              freshIds.add(r.id);
            }
          });
          if (freshIds.size > 0) {
            setNewlyAddedIds(freshIds);
            setTimeout(() => {
              setNewlyAddedIds(new Set());
            }, 4000);
          }
        }
        prevRecordIdsRef.current = new Set(incoming.map((r) => r.id));
        setTodayRecords(incoming);
        setStats(res.stats);
        setIsHoliday(Boolean(res.is_holiday));
        setHolidayName(res.holiday_name || null);
      }
    } catch (err) {
      console.error('Failed to load dashboard data', err);
    } finally {
      setIsLoading(false);
    }
  };

  const STAT_CARDS = [
    {
      title: 'Total Siswa Aktif',
      value: stats.total_students,
      icon: Users,
      color: 'bg-slate-900 text-white',
      accent: 'text-slate-200',
    },
    {
      title: 'Hadir Tepat Waktu',
      value: stats.total_present,
      icon: CheckCircle2,
      color: 'bg-emerald-600 text-white',
      accent: 'text-emerald-100',
    },
    {
      title: 'Terlambat',
      value: stats.total_late,
      icon: Clock,
      color: 'bg-amber-500 text-white',
      accent: 'text-amber-100',
    },
    {
      title: 'Izin',
      value: stats.total_permission,
      icon: AlertCircle,
      color: 'bg-blue-600 text-white',
      accent: 'text-blue-100',
    },
    {
      title: 'Sakit',
      value: stats.total_sick,
      icon: AlertCircle,
      color: 'bg-indigo-600 text-white',
      accent: 'text-indigo-100',
    },
    {
      title: 'Tanpa Keterangan (Alpha)',
      value: isHoliday ? 0 : stats.total_alpha,
      subtitle: isHoliday ? 'Hari Libur' : undefined,
      icon: UserMinus,
      color: isHoliday ? 'bg-slate-700 text-white' : 'bg-rose-600 text-white',
      accent: isHoliday ? 'text-slate-300' : 'text-rose-100',
    },
  ];

  const [previewPhoto, setPreviewPhoto] = useState<string | null>(null);

  return (
    <div className="space-y-4 sm:space-y-6">
      
      {/* Top Banner & Live Status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 bg-white dark:bg-[#0a0f1c] p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-2xs">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] sm:text-[11px] font-bold text-emerald-600 uppercase tracking-wider block">
              Dashboard Utama Administrator
            </span>
            <span className="inline-flex items-center gap-1 text-[10px] sm:text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
              <Clock className="w-3 h-3 text-emerald-600" />
              {wibTime} WIB
            </span>
            <span className="inline-flex items-center gap-1.5 text-[10px] sm:text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-2xs">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-600"></span>
              </span>
              REAL-TIME (5s)
            </span>
          </div>
          <h1 className="text-lg sm:text-2xl font-black text-slate-900 mt-1">
            Monitoring Absensi Hari Ini
          </h1>
          <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5">
            Data presensi real-time • {wibDate} (WIB)
          </p>
        </div>

        <div className="flex items-center justify-between sm:justify-end gap-2.5 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
          <div className="px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-xl sm:rounded-2xl bg-emerald-50 border border-emerald-200 text-left sm:text-center">
            <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-emerald-700 block">
              Persentase Kehadiran
            </span>
            <span className="text-lg sm:text-xl font-black text-emerald-800">
              {stats.attendance_percentage}%
            </span>
          </div>

          <button
            type="button"
            onClick={fetchDashboardData}
            className="p-2.5 sm:p-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl sm:rounded-2xl transition-colors cursor-pointer"
            title="Muat Ulang Data"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Holiday Status Banner */}
      {isHoliday && (
        <div className="bg-amber-50 border border-amber-200 text-amber-950 p-4 sm:p-5 rounded-2xl sm:rounded-3xl flex items-start gap-3 shadow-2xs animate-in fade-in">
          <div className="p-2 rounded-xl bg-amber-100 text-amber-800 shrink-0 mt-0.5">
            <CalendarDays className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div className="space-y-1 min-w-0">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="font-black text-xs sm:text-sm text-amber-950">
                Hari Ini Libur: {holidayName || 'Jadwal Libur Madrasah (Jumat)'}
              </span>
              <span className="px-2 py-0.5 bg-amber-200/70 text-amber-900 rounded-full text-[9px] sm:text-[10px] font-extrabold uppercase tracking-wide">
                Bebas Presensi
              </span>
            </div>
            <p className="text-[11px] sm:text-xs text-amber-800 leading-relaxed">
              Sesuai kalender akademik, hari ini tidak ada KBM aktif. Siswa tidak dihitung Alpha (Alpha diatur ke 0).
            </p>
          </div>
        </div>
      )}

      {/* Grid Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3.5">
        {STAT_CARDS.map((item, idx) => {
          const Icon = item.icon;
          return (
            <div
              key={idx}
              className={`${item.color} rounded-2xl sm:rounded-3xl p-3.5 sm:p-4.5 shadow-xs relative overflow-hidden flex flex-col justify-between`}
            >
              <div className="flex justify-between items-start gap-1">
                <span className={`text-[10px] sm:text-[11px] font-bold leading-tight ${item.accent}`}>
                  {item.title}
                </span>
                <Icon className="w-4 h-4 sm:w-5 sm:h-5 opacity-70 shrink-0" />
              </div>
              <div className="mt-2.5 sm:mt-3 flex items-baseline gap-1">
                <span className="text-xl sm:text-2xl lg:text-3xl font-black tracking-tight">
                  {item.value}
                </span>
                {item.subtitle && (
                  <span className="text-[9px] sm:text-[10px] font-bold opacity-80 uppercase tracking-wide">
                    ({item.subtitle})
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Quick Action Shortcuts */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3">
        <button
          type="button"
          onClick={() => onNavigateTab('qr')}
          className="p-3.5 sm:p-4 bg-white dark:bg-[#0a0f1c] rounded-2xl border border-slate-200/90 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition-all text-left flex items-center justify-between group cursor-pointer shadow-2xs"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 sm:p-2.5 rounded-xl bg-emerald-50 text-emerald-600 group-hover:scale-105 transition-transform shrink-0">
              <QrCode className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div>
              <span className="text-xs sm:text-sm font-bold text-slate-800 block">QR Code Sekolah</span>
              <span className="text-[10px] sm:text-[11px] text-slate-400">Download & Cetak QR</span>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 transition-transform shrink-0" />
        </button>

        <button
          type="button"
          onClick={() => onNavigateTab('location')}
          className="p-3.5 sm:p-4 bg-white dark:bg-[#0a0f1c] rounded-2xl border border-slate-200/90 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition-all text-left flex items-center justify-between group cursor-pointer shadow-2xs"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 sm:p-2.5 rounded-xl bg-blue-50 text-blue-600 group-hover:scale-105 transition-transform shrink-0">
              <MapPin className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div>
              <span className="text-xs sm:text-sm font-bold text-slate-800 block">Lokasi & Radius GPS</span>
              <span className="text-[10px] sm:text-[11px] text-slate-400">Koordinat Gerbang Sekolah</span>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 transition-transform shrink-0" />
        </button>

        <button
          type="button"
          onClick={() => onNavigateTab('announcements')}
          className="p-3.5 sm:p-4 bg-white dark:bg-[#0a0f1c] rounded-2xl border border-slate-200/90 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition-all text-left flex items-center justify-between group cursor-pointer shadow-2xs"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 sm:p-2.5 rounded-xl bg-amber-50 text-amber-600 group-hover:scale-105 transition-transform shrink-0">
              <Megaphone className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div>
              <span className="text-xs sm:text-sm font-bold text-slate-800 block">Terbitkan Pengumuman</span>
              <span className="text-[10px] sm:text-[11px] text-slate-400">Pemberitahuan Siswa</span>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 transition-transform shrink-0" />
        </button>
      </div>

      {/* Live Today Attendance Feed */}
      <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 border border-slate-200/80 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm sm:text-base font-black text-slate-900">
                Presensi Siswa Masuk Hari Ini
              </h3>
              <span className="flex h-2 w-2 relative" title="Sinkronisasi otomatis setiap 5 detik">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
            </div>
            <p className="text-[11px] sm:text-xs text-slate-500">
              Sinkronisasi real-time otomatis setiap 5 detik • Tanpa perlu refresh
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => onNavigateTab('monitoring_kelas')}
              className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 transition-colors cursor-pointer border border-emerald-200"
            >
              <GraduationCap className="w-3.5 h-3.5 text-emerald-600" />
              <span>Monitoring Per Kelas</span>
            </button>
            <button
              type="button"
              onClick={() => onNavigateTab('absensi')}
              className="text-xs font-bold text-emerald-700 hover:text-emerald-900 inline-flex items-center gap-1 cursor-pointer"
            >
              <span>Monitoring Lengkap</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ── MOBILE VIEW: Adaptive Touch Cards (visible on mobile < md) ── */}
        <div className="block md:hidden space-y-2.5">
          {todayRecords.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-xs bg-slate-50 rounded-2xl border border-dashed border-slate-200">
              Belum ada siswa yang melakukan absensi hari ini.
            </div>
          ) : (
            todayRecords.map((rec) => (
              <div
                key={rec.id}
                className={`p-3.5 border rounded-2xl space-y-2.5 transition-all duration-500 ${
                  newlyAddedIds.has(rec.id)
                    ? 'bg-emerald-50/90 border-emerald-400 shadow-md ring-2 ring-emerald-400'
                    : 'bg-slate-50/80 hover:bg-slate-100/80 border-slate-200/80'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-9 h-9 rounded-xl overflow-hidden bg-white shrink-0 border border-slate-200 shadow-2xs">
                      <img
                        src={rec.student?.profile_photo_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${rec.student?.username}`}
                        alt={rec.student?.full_name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-slate-900 text-xs block truncate">
                          {rec.student?.full_name}
                        </span>
                        {newlyAddedIds.has(rec.id) && (
                          <span className="px-1.5 py-0.2 bg-emerald-600 text-white rounded text-[9px] font-black uppercase tracking-wider animate-pulse">
                            Baru
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-emerald-700 font-bold block">
                        Kelas {rec.student?.class_name} • <span className="text-slate-400 font-mono font-normal">@{rec.student?.username}</span>
                      </span>
                    </div>
                  </div>

                  <span
                    className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-extrabold shrink-0 ${
                      rec.status === 'HADIR'
                        ? 'bg-emerald-100 text-emerald-800'
                        : rec.status === 'TERLAMBAT'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-blue-100 text-blue-800'
                    }`}
                  >
                    {rec.status}
                  </span>
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-600 pt-2 border-t border-slate-200/60">
                  <div className="flex items-center gap-3">
                    <span className="font-mono font-semibold text-slate-800">
                      ⏰ {rec.time} WIB
                    </span>
                    <span className="text-slate-500">
                      📍 {rec.distance_meters}m
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {rec.photo_url ? (
                      <button
                        type="button"
                        onClick={() => setPreviewPhoto(rec.photo_url || null)}
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 hover:text-emerald-800 cursor-pointer"
                      >
                        <img
                          src={rec.photo_url}
                          alt="Foto"
                          className="w-5 h-5 rounded-md object-cover border border-slate-200"
                        />
                        <span>Lihat Foto</span>
                      </button>
                    ) : (
                      <span className="text-slate-400 italic text-[10px]">Tanpa Foto</span>
                    )}

                    <button
                      type="button"
                      onClick={() => setDeleteRecord(rec)}
                      className="min-w-[40px] min-h-[36px] px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200/80 rounded-xl text-xs font-bold inline-flex items-center gap-1 transition-colors cursor-pointer"
                      title="Hapus rekaman absensi ini"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Hapus</span>
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* ── DESKTOP VIEW: Full Data Table (visible on md:screens and larger) ── */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-bold border-b border-slate-100">
              <tr>
                <th className="py-3 px-4 rounded-l-xl">Siswa</th>
                <th className="py-3 px-4">Kelas</th>
                <th className="py-3 px-4">Waktu</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Jarak GPS</th>
                <th className="py-3 px-4">Foto Dokumentasi</th>
                <th className="py-3 px-4 rounded-r-xl text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {todayRecords.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400 font-normal">
                    Belum ada siswa yang melakukan absensi hari ini.
                  </td>
                </tr>
              ) : (
                todayRecords.map((rec) => (
                  <tr
                    key={rec.id}
                    className={`transition-all duration-500 ${
                      newlyAddedIds.has(rec.id)
                        ? 'bg-emerald-50/90 ring-2 ring-emerald-400 font-semibold'
                        : 'hover:bg-slate-50/80'
                    }`}
                  >
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg overflow-hidden bg-slate-100 shrink-0">
                          <img
                            src={rec.student?.profile_photo_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${rec.student?.username}`}
                            alt={rec.student?.full_name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-slate-900 block">{rec.student?.full_name}</span>
                            {newlyAddedIds.has(rec.id) && (
                              <span className="px-1.5 py-0.2 bg-emerald-600 text-white rounded text-[9px] font-black uppercase tracking-wider animate-pulse">
                                Baru
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-slate-400 font-mono">@{rec.student?.username}</span>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 font-bold text-emerald-700">
                      {rec.student?.class_name}
                    </td>
                    <td className="py-3 px-4">
                      {rec.time} WIB
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          rec.status === 'HADIR'
                            ? 'bg-emerald-100 text-emerald-800'
                            : rec.status === 'TERLAMBAT'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}
                      >
                        {rec.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {rec.distance_meters} meter
                    </td>
                    <td className="py-3 px-4">
                      {rec.photo_url ? (
                        <button
                          type="button"
                          onClick={() => setPreviewPhoto(rec.photo_url || null)}
                          className="w-8 h-8 rounded-lg overflow-hidden border border-slate-200 hover:scale-105 transition-transform cursor-pointer block"
                          title="Klik untuk memperbesar foto"
                        >
                          <img
                            src={rec.photo_url}
                            alt="Dokumentasi"
                            className="w-full h-full object-cover"
                          />
                        </button>
                      ) : (
                        <span className="text-slate-400 italic text-[11px]">-</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        type="button"
                        onClick={() => setDeleteRecord(rec)}
                        className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg transition-colors cursor-pointer"
                        title="Hapus data absensi ini"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Photo Preview Modal */}
      {previewPhoto && (
        <div
          onClick={() => setPreviewPhoto(null)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-xs animate-in fade-in"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl p-4 max-w-sm w-full shadow-2xl border border-slate-100 space-y-3"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800">Foto Dokumentasi Absensi</span>
              <button
                type="button"
                onClick={() => setPreviewPhoto(null)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
              >
                ✕
              </button>
            </div>
            <div className="rounded-2xl overflow-hidden bg-slate-100 border border-slate-200 aspect-4/3">
              <img
                src={previewPhoto}
                alt="Bukti Kehadiran"
                className="w-full h-full object-cover"
              />
            </div>
            <button
              type="button"
              onClick={() => setPreviewPhoto(null)}
              className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
            >
              Tutup
            </button>
          </div>
        </div>
      )}

      {/* Delete Attendance Record Confirmation Modal */}
      <ConfirmModal
        isOpen={Boolean(deleteRecord)}
        isDestructive={true}
        title="Hapus Data Absensi"
        message={`Apakah Anda yakin ingin menghapus data absensi atas nama "${deleteRecord?.student?.full_name || 'Siswa'}" (${deleteRecord?.status}, ${deleteRecord?.time} WIB)? Tindakan ini permanen.`}
        confirmLabel={isDeleting ? 'Menghapus...' : 'Ya, Hapus'}
        cancelLabel="Batal"
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteRecord(null)}
      />

    </div>
  );
};
