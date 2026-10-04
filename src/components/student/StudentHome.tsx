import React, { useState, useEffect } from 'react';
import {
  Student,
  AttendanceRecord,
  Announcement
} from '../../types.js';
import {
  CheckCircle2,
  Clock,
  QrCode,
  Calendar,
  Sparkles,
  ChevronRight,
  ShieldAlert,
  CalendarOff,
  Info,
  XCircle,
  History,
  BookOpen
} from 'lucide-react';
import { api } from '../../lib/api.js';
import { getWIBTimeString, formatIndonesianDate } from '../../lib/dateUtils.js';
import { StudentAnnouncementsModal } from './StudentAnnouncementsModal.js';
import { NotificationBellPrompt } from '../common/NotificationBellPrompt.js';
import { useTheme } from '../../context/ThemeContext.js';

const SCHOOL_BANNER_BG = "https://lh3.googleusercontent.com/gps-cs-s/AHRPTWlZgDiiO_xVpoBKAxOBMuTUF8i5lp6PRZ5a3z4PQ_E0phwWgtL2dnDMh2o0rXmVFouUea_b0YZOeBf7FWMSqse14hP-NBvUEHpBAiOuqVfmpumFCAFsiKsQnNJrCiQWXnTgTlQqWAUH4mP6=s1360-w1360-h1020-rw";

interface StudentHomeProps {
  student: Student;
  todayRecord?: AttendanceRecord | null;
  isHoliday?: boolean;
  holidayName?: string;
  holidayDescription?: string;
  announcements?: Announcement[];
  onOpenScan: () => void;
  onOpenAnnouncements?: () => void;
  onNavigateMapel?: () => void;
  onNavigateRiwayat?: () => void;
  onNavigateTab?: (tab: 'home' | 'mapel' | 'riwayat' | 'profile') => void;
  onMarkRead?: (id: string) => void;
  onMarkAllRead?: () => void;
}

export const StudentHome: React.FC<StudentHomeProps> = ({
  student,
  todayRecord: propTodayRecord,
  isHoliday: propIsHoliday,
  holidayName: propHolidayName,
  holidayDescription: propHolidayDescription,
  announcements: propAnnouncements,
  onOpenScan,
  onOpenAnnouncements,
  onNavigateMapel,
  onNavigateRiwayat,
  onNavigateTab,
  onMarkRead,
  onMarkAllRead,
}) => {
  const { branding } = useTheme();
  const [isLoadingData, setIsLoadingData] = useState<boolean>(true);
  const [internalTodayRecord, setInternalTodayRecord] = useState<AttendanceRecord | null>(null);
  const [internalIsHoliday, setInternalIsHoliday] = useState<boolean>(() => new Date().getDay() === 5);
  const [internalHolidayName, setInternalHolidayName] = useState<string>(
    new Date().getDay() === 5 ? 'Libur Mingguan (Jumat Berkah)' : ''
  );
  const [internalHolidayDescription, setInternalHolidayDescription] = useState<string>(() =>
    new Date().getDay() === 5
      ? "Hari ini libur, jadi tidak perlu absen. Selamat menikmati waktu istirahat bersama teman-teman di kobong!, dan jangan lupa jumatan ya!!!, jangan tidur terus."
      : ""
  );
  const [internalAnnouncements, setInternalAnnouncements] = useState<Announcement[]>([]);
  const [isAnnouncementsModalOpen, setIsAnnouncementsModalOpen] = useState(false);
  const [attendanceSettings, setAttendanceSettings] = useState<{
    start_time: string;
    on_time_limit: string;
    end_time: string;
    gps_radius_meters: number;
  } | null>(null);

  useEffect(() => {
    // Single ultra-fast, real-time live fetch for attendance record, settings, and holiday
    api.get<{
      success: boolean;
      attendance: AttendanceRecord | null;
      is_holiday?: boolean;
      holiday_name?: string;
      holiday_description?: string;
      settings?: {
        start_time?: string;
        on_time_limit?: string;
        end_time?: string;
        alpha_cutoff_time?: string;
        gps_radius_meters?: number;
      };
    }>('/attendance/my-today')
      .then((res) => {
        if (res.success) {
          if (propTodayRecord === undefined) {
            setInternalTodayRecord(res.attendance);
          }
          if (res.settings) {
            setAttendanceSettings({
              start_time: res.settings.start_time || '06:00',
              on_time_limit: res.settings.on_time_limit || '07:15',
              end_time: res.settings.end_time || res.settings.alpha_cutoff_time || '11:30',
              gps_radius_meters: Number(res.settings.gps_radius_meters) || 100,
            });
          }
          if (propIsHoliday === undefined && res.is_holiday !== undefined) {
            setInternalIsHoliday(Boolean(res.is_holiday));
            if (res.holiday_name) setInternalHolidayName(res.holiday_name);
            if (res.holiday_description) setInternalHolidayDescription(res.holiday_description);
          }
        }
      })
      .catch((err) => console.error('Failed to load my-today', err))
      .finally(() => {
        setIsLoadingData(false);
      });

    // Fetch announcements if not supplied
    if (!propAnnouncements || propAnnouncements.length === 0) {
      api.get<{ success: boolean; announcements: Announcement[] }>('/announcements')
        .then((res) => {
          if (res.success && Array.isArray(res.announcements)) {
            setInternalAnnouncements(res.announcements);
          }
        })
        .catch((err) => console.error('Failed to load announcements', err));
    }
  }, [propTodayRecord, propAnnouncements, propIsHoliday]);

  // Determine active values safely
  const effectiveTodayRecord = propTodayRecord !== undefined ? propTodayRecord : internalTodayRecord;
  const effectiveIsHoliday = propIsHoliday !== undefined ? propIsHoliday : internalIsHoliday;
  const effectiveHolidayName = propHolidayName !== undefined ? propHolidayName : internalHolidayName;
  const effectiveHolidayDescription = propHolidayDescription !== undefined ? propHolidayDescription : internalHolidayDescription;
  const effectiveAnnouncements = (propAnnouncements && propAnnouncements.length > 0)
    ? propAnnouncements
    : internalAnnouncements;

  const activeAnnouncementsList = Array.isArray(effectiveAnnouncements) ? effectiveAnnouncements : [];
  const latestAnnouncement = activeAnnouncementsList.find(
    (a) => a.status === 'published' || a.is_active !== false
  );

  const handleNavigateMapel = () => {
    if (onNavigateMapel) {
      onNavigateMapel();
    } else if (onNavigateTab) {
      onNavigateTab('mapel');
    }
  };

  const handleNavigateRiwayat = () => {
    if (onNavigateRiwayat) {
      onNavigateRiwayat();
    } else if (onNavigateTab) {
      onNavigateTab('riwayat');
    }
  };

  const handleOpenAnnouncements = () => {
    if (onOpenAnnouncements) {
      onOpenAnnouncements();
    } else {
      setIsAnnouncementsModalOpen(true);
    }
  };

  const handleMarkRead = (id: string) => {
    if (onMarkRead) {
      onMarkRead(id);
    } else {
      setInternalAnnouncements((prev) =>
        prev.map((a) => (a.id === id ? { ...a, is_read: true } : a))
      );
    }
  };

  const handleMarkAllRead = () => {
    if (onMarkAllRead) {
      onMarkAllRead();
    } else {
      setInternalAnnouncements((prev) => prev.map((a) => ({ ...a, is_read: true })));
    }
  };

  const [wibTime, setWibTime] = useState<string>(() => getWIBTimeString());
  const [formattedDate, setFormattedDate] = useState<string>(() => formatIndonesianDate());

  useEffect(() => {
    const timer = setInterval(() => {
      setWibTime(getWIBTimeString());
      setFormattedDate(formatIndonesianDate());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const cutoffTime = (attendanceSettings?.end_time || '').trim();
  const isPastCutoff = !isLoadingData && Boolean(cutoffTime) && wibTime >= `${cutoffTime}:00`;

  return (
    <div className="w-full max-w-2xl mx-auto space-y-5 font-sans transition-colors pt-1 sm:pt-2 md:pt-4">

      {/* 1. Student Greeting & Profile Card with School Background & Horizontal Left-Aligned Layout */}
      <div className="relative overflow-hidden rounded-2xl p-5 sm:p-6 text-white border border-emerald-600/40 dark:border-emerald-500/50 min-h-[140px] sm:min-h-[155px] flex items-center card-2d transition-all">
        {/* Background Image of School Building - Configured by Admin or Fallback */}
        <img
          src={branding.background_url || SCHOOL_BANNER_BG}
          alt="Gedung Kampus SMA Informatika Nurul Bayan"
          className="absolute inset-0 w-full h-full object-cover object-center"
          referrerPolicy="no-referrer"
        />
        {/* Balanced Dark & Theme Gradient Overlay identical to Card Jadwal Pelajaran Resmi */}
        <div className="absolute inset-0 z-0 bg-linear-to-r from-slate-950/92 via-emerald-950/80 to-slate-950/75 backdrop-blur-[0.5px]" />

        {/* Foreground Content - Horizontal Layout: Foto di Kiri, Teks Sejajar di Kanan */}
        <div className="relative z-10 flex items-center gap-4 sm:gap-5 w-full">
          {/* Avatar Foto Profil Siswa di Kiri (Bentuk Bulat) */}
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full p-1 bg-gradient-to-tr from-emerald-500 to-emerald-300 dark:from-emerald-400 dark:to-teal-300 shadow-xl shadow-black/40 shrink-0 overflow-hidden">
            <img
              src={student.profile_photo_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${student.username}`}
              alt={student.full_name}
              className="w-full h-full object-cover rounded-full bg-slate-900"
            />
          </div>

          {/* Info Siswa di Kanan Sejajar */}
          <div className="flex flex-col min-w-0 flex-1 justify-center space-y-1">
            <span className="text-[11px] sm:text-xs font-bold tracking-wider text-emerald-300 uppercase drop-shadow-xs">
              Selamat Datang,
            </span>
            <h1 className="text-base sm:text-xl md:text-2xl font-black text-white tracking-tight leading-tight truncate drop-shadow-md">
              {student.full_name}
            </h1>

            {/* Badges: Kelas & Tanggal */}
            <div className="flex items-center gap-2 pt-1 flex-wrap">
              <span className="inline-flex items-center px-2.5 py-0.5 bg-white/20 dark:bg-emerald-900/70 text-white text-[11px] sm:text-xs font-bold rounded-lg border border-white/30 dark:border-emerald-400/40 shadow-xs">
                Kelas {student.class_name}
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-black/35 dark:bg-black/45 text-emerald-100 text-[11px] sm:text-xs font-medium rounded-lg border border-white/15 shadow-xs">
                <Calendar className="w-3.5 h-3.5 text-emerald-300 shrink-0" />
                <span>{formattedDate}</span>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Push/System Notification Permission Banner */}
      <NotificationBellPrompt variant="banner" />

      {/* 2. Status Absensi Hari Ini (Hero Card with Soft Shadow) */}
      <div className="bg-white dark:bg-[#0d1322] rounded-2xl p-5 sm:p-6 border border-slate-200 dark:border-slate-800 card-2d transition-all">
        <div className="flex items-center justify-between pb-3.5 mb-3.5 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-white">
              Status Absensi Hari Ini
            </span>
          </div>
          <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 px-2.5 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800/80 flex items-center gap-1.5">
            {wibTime} WIB {isLoadingData ? '• Memuat...' : cutoffTime ? `• Batas ${cutoffTime} WIB` : ''}
          </span>
        </div>

        {/* Condition 0: Loading Real-Time Data from Database */}
        {isLoadingData ? (
          <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 animate-pulse space-y-3.5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-slate-200 dark:bg-slate-700 shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded-md w-1/3" />
                <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded-md w-2/3" />
              </div>
            </div>
            <div className="h-11 bg-slate-200 dark:bg-slate-700 rounded-2xl w-full" />
          </div>
        ) : effectiveIsHoliday ? (
          <div className="space-y-3">
            <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/80 flex items-start gap-3 text-amber-900 dark:text-amber-200">
              <div className="p-2.5 rounded-xl bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300 shrink-0 mt-0.5">
                <CalendarOff className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-amber-800 dark:text-amber-300 bg-amber-200/60 dark:bg-amber-900/80 px-2 py-0.5 rounded-md uppercase tracking-wider inline-block mb-1">
                  Hari Libur Sekolah
                </span>
                <h4 className="font-bold text-sm text-amber-950 dark:text-amber-100">
                  {effectiveHolidayName || 'Hari Libur Madrasah'}
                </h4>
                <p className="text-xs text-amber-800 dark:text-amber-300 mt-1 leading-relaxed whitespace-pre-line">
                  {effectiveHolidayDescription || (new Date().getDay() === 5
                    ? "Hari ini libur, jadi tidak perlu absen. Selamat menikmati waktu istirahat bersama teman-teman di kobong!, dan jangan lupa jumatan ya!!!, jangan tidur terus."
                    : "Hari ini libur sekolah. Siswa tidak perlu melakukan presensi.")}
                </p>
              </div>
            </div>

            <button
              type="button"
              disabled
              className="w-full py-3 bg-amber-100/80 dark:bg-amber-950/40 text-amber-900 dark:text-amber-300 text-xs font-bold rounded-2xl border border-amber-300 dark:border-amber-800 flex items-center justify-center gap-2 opacity-80 cursor-not-allowed"
            >
              <CalendarOff className="w-4 h-4 text-amber-700 dark:text-amber-300" />
              <span>Hari Ini Libur (Tidak Perlu Absen)</span>
            </button>
          </div>
        ) : effectiveTodayRecord?.status === 'ALPHA' ? (
          /* Condition B.1: Alpha (Cutoff exceeded) */
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/80 flex items-start gap-3">
              <div className="p-2.5 rounded-xl bg-rose-600 text-white shadow-xs shrink-0 mt-0.5">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-black px-2.5 py-0.5 rounded-md bg-rose-600 text-white tracking-wider uppercase shadow-xs">
                    ALPHA
                  </span>
                  <span className="text-xs text-rose-800 dark:text-rose-300 font-bold">
                    Tanpa Keterangan
                  </span>
                </div>
                <h4 className="font-bold text-sm text-rose-950 dark:text-rose-100 mt-1.5">
                  Batas Waktu Absensi Telah Berakhir
                </h4>
                <p className="text-xs text-rose-700 dark:text-rose-300 mt-1 leading-relaxed">
                  Operasional absensi sekolah ditutup pukul {cutoffTime} WIB. Karena Anda belum melakukan absensi sebelum batas waktu ({cutoffTime} WIB), sistem otomatis mencatat status Anda hari ini sebagai <b>Alpha</b>.
                </p>
              </div>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-[#080c14] rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 text-xs flex items-center justify-between">
              <span>Jika terdapat kekeliruan atau izin darurat, hubungi wali kelas.</span>
              <button
                type="button"
                onClick={handleNavigateRiwayat}
                className="font-bold text-emerald-700 dark:text-emerald-400 hover:underline inline-flex items-center gap-0.5 cursor-pointer shrink-0 ml-2"
              >
                Lihat Riwayat <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ) : effectiveTodayRecord ? (
          /* Condition B.2: Already Attended Today (HADIR / TERLAMBAT / IZIN / SAKIT) */
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/20 border-2 border-emerald-200 dark:border-emerald-800/80">
              <div className="flex items-center gap-3.5">
                <div
                  className={`w-11 h-11 rounded-xl flex items-center justify-center font-bold text-white shadow-xs ${effectiveTodayRecord.status === 'HADIR'
                    ? 'bg-emerald-600'
                    : effectiveTodayRecord.status === 'TERLAMBAT'
                      ? 'bg-amber-500'
                      : 'bg-blue-600'
                    }`}
                >
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[11px] font-black px-2.5 py-0.5 rounded-md text-white tracking-wider uppercase shadow-xs ${effectiveTodayRecord.status === 'HADIR'
                        ? 'bg-emerald-600'
                        : effectiveTodayRecord.status === 'TERLAMBAT'
                          ? 'bg-amber-500'
                          : 'bg-blue-600'
                        }`}
                    >
                      {effectiveTodayRecord.status}
                    </span>
                    <span className="text-xs text-slate-800 dark:text-slate-200 font-bold">
                      {effectiveTodayRecord.status === 'HADIR'
                        ? 'Tepat Waktu'
                        : effectiveTodayRecord.status === 'TERLAMBAT'
                          ? 'Terlambat'
                          : effectiveTodayRecord.status === 'IZIN'
                            ? 'Izin'
                            : 'Sakit'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                    Tercatat pada pukul <b className="text-slate-900 dark:text-white font-bold">{effectiveTodayRecord.time} WIB</b>
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleNavigateRiwayat}
                className="text-xs font-bold text-emerald-700 dark:text-emerald-400 hover:text-emerald-800 bg-white dark:bg-[#080c14] px-3 py-1.5 rounded-xl border border-emerald-200 dark:border-emerald-800 flex items-center gap-1 cursor-pointer transition-colors"
              >
                Riwayat <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {effectiveTodayRecord.status === 'TERLAMBAT' && (
              <div className="p-3 bg-amber-50 dark:bg-amber-950/30 rounded-xl border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200 text-xs">
                Anda tercatat terlambat hari ini. Harap datang lebih awal di hari berikutnya.
              </div>
            )}
          </div>
        ) : (
          /* Condition B.3: Not Attended Yet */
          <div className="space-y-4">
            <div className={`p-4 rounded-2xl flex items-start gap-3 border ${isPastCutoff
              ? 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900/80'
              : 'bg-emerald-50/70 dark:bg-emerald-950/20 border-emerald-100 dark:border-emerald-900/80'
              }`}>
              <div className={`p-2.5 rounded-xl text-white shadow-xs shrink-0 mt-0.5 ${isPastCutoff ? 'bg-rose-600' : 'bg-emerald-600'
                }`}>
                {isPastCutoff ? <ShieldAlert className="w-5 h-5" /> : <QrCode className="w-5 h-5" />}
              </div>
              <div className="flex-1">
                <h4 className={`font-bold text-sm ${isPastCutoff ? 'text-rose-950 dark:text-rose-100' : 'text-emerald-950 dark:text-emerald-100'}`}>
                  {isPastCutoff ? 'Waktu Absensi Telah Ditutup' : 'Anda Belum Melakukan Absensi'}
                </h4>
                <p className={`text-xs mt-1 leading-relaxed ${isPastCutoff ? 'text-rose-700 dark:text-rose-300' : 'text-emerald-800/80 dark:text-emerald-300/80'}`}>
                  {isPastCutoff
                    ? `Batas waktu absensi madrasah (${cutoffTime} WIB) telah terlewati. Siswa yang belum absen otomatis tercatat sebagai Alpha.`
                    : 'Pindai QR Code di gerbang/lobi sekolah, verifikasi radius GPS, dan ambil foto dokumentasi wajah seragam.'}
                </p>
              </div>
            </div>

            {isPastCutoff ? (
              <button
                type="button"
                disabled
                className="w-full py-3.5 bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-sm font-bold rounded-2xl border border-slate-300 dark:border-slate-700 flex items-center justify-center gap-2 cursor-not-allowed opacity-75"
              >
                <XCircle className="w-4 h-4" />
                <span>Absensi Hari Ini Telah Berakhir ({cutoffTime} WIB)</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={onOpenScan}
                className="w-full py-3.5 bg-linear-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white text-sm font-bold rounded-2xl flex items-center justify-center gap-2 active:scale-[0.99] transition-all cursor-pointer border border-emerald-500/40 card-2d"
              >
                <QrCode className="w-4 h-4" />
                <span>Mulai Absensi Masuk Sekarang</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* 3. Quick Actions Cards (2 Column 50:50 Symmetrical Grid: Jadwal Pelajaran & Riwayat Presensi) */}
      <div className="grid grid-cols-2 gap-3.5">
        <button
          type="button"
          onClick={handleNavigateMapel}
          className="p-4 bg-white dark:bg-[#0d1322] rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-emerald-400 dark:hover:border-emerald-500/50 transition-all text-left group cursor-pointer card-2d"
        >
          <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 flex items-center justify-center mb-2.5 group-hover:scale-105 transition-transform">
            <BookOpen className="w-5 h-5" />
          </div>
          <span className="text-xs font-bold text-slate-900 dark:text-white block">Jadwal Pelajaran</span>
          <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 block">File Jadwal Resmi</span>
        </button>

        <button
          type="button"
          onClick={handleNavigateRiwayat}
          className="p-4 bg-white dark:bg-[#0d1322] rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-emerald-400 dark:hover:border-emerald-500/50 transition-all text-left group cursor-pointer card-2d"
        >
          <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 flex items-center justify-center mb-2.5 group-hover:scale-105 transition-transform">
            <History className="w-5 h-5" />
          </div>
          <span className="text-xs font-bold text-slate-900 dark:text-white block">Riwayat Presensi</span>
          <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 block">Log Kehadiran Saya</span>
        </button>
      </div>

      {/* 4. Latest Announcement Quick Preview */}
      {latestAnnouncement && (
        <div
          onClick={handleOpenAnnouncements}
          className="p-4 bg-white dark:bg-[#0d1322] rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-emerald-400 dark:hover:border-emerald-500/50 transition-all cursor-pointer flex items-start justify-between gap-3 card-2d"
        >
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-300 shrink-0 mt-0.5">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider block">
                Pengumuman Terbaru
              </span>
              <h4 className="text-xs font-bold text-slate-900 dark:text-white line-clamp-1 mt-0.5">
                {latestAnnouncement.title}
              </h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 mt-0.5 leading-relaxed">
                {latestAnnouncement.content}
              </p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-2" />
        </div>
      )}

      {/* 5. School Attendance Rules Reminder */}
      <div className="p-4 rounded-2xl bg-emerald-50/50 dark:bg-[#091a14] border border-emerald-200 dark:border-emerald-800/60 text-slate-700 dark:text-slate-200 text-xs flex items-start gap-3 card-2d transition-all">
        <Info className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
        <div className="space-y-1 text-[11px] leading-relaxed">
          <p className="font-bold text-emerald-900 dark:text-emerald-300">
            Aturan Presensi {branding?.school_name || 'SMA Informatika Nurul Bayan'}:
          </p>
          <p>• Waktu Masuk Tepat Waktu: Sebelum pukul {attendanceSettings?.on_time_limit || '07:15'} WIB.</p>
          <p>• Absensi setelah pukul {attendanceSettings?.on_time_limit || '07:15'} WIB otomatis tercatat <b>TERLAMBAT</b>.</p>
          <p>• Radius GPS maksimal {attendanceSettings?.gps_radius_meters ?? 100}m dari gerbang sekolah.</p>
          <p>• Wajib dokumentasi swafoto menggunakan seragam madrasah.</p>
        </div>
      </div>

      {/* Announcements Modal */}
      <StudentAnnouncementsModal
        isOpen={isAnnouncementsModalOpen}
        announcements={activeAnnouncementsList}
        onClose={() => setIsAnnouncementsModalOpen(false)}
        onMarkRead={handleMarkRead}
        onMarkAllRead={handleMarkAllRead}
      />

    </div>
  );
};
