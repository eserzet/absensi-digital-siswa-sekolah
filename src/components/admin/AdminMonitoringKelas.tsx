import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../../lib/api.js';
import { Student, AttendanceRecord } from '../../types.js';
import {
  GraduationCap,
  Users,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Search,
  Calendar,
  RefreshCw,
  Filter,
  CheckCircle,
  XCircle,
  HelpCircle,
  ArrowRight,
  MapPin,
  ChevronDown,
  Eye
} from 'lucide-react';
import { formatIndonesianDate } from '../../lib/dateUtils.js';
import { PhotoPreviewModal, PhotoPreviewData } from '../common/PhotoPreviewModal.js';

interface ClassStat {
  className: string;
  totalStudents: number;
  present: number;
  late: number;
  permission: number;
  sick: number;
  alpha: number;
  notYet: number;
  percentage: number;
}

export const AdminMonitoringKelas: React.FC = () => {
  const [selectedClass, setSelectedClass] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<'all' | 'HADIR' | 'IZIN_SAKIT' | 'ALPHA' | 'BELUM_ABSEN'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  });

  const [students, setStudents] = useState<Student[]>([]);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [previewPhotoData, setPreviewPhotoData] = useState<PhotoPreviewData | null>(null);

  const isToday = useMemo(() => {
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    return selectedDate === todayStr;
  }, [selectedDate]);

  useEffect(() => {
    fetchData();
    if (isToday) {
      // 5s real-time auto-refresh for today
      const timer = setInterval(() => {
        fetchData(true);
      }, 5000);
      return () => clearInterval(timer);
    }
  }, [selectedDate, isToday]);

  const fetchData = async (isBackground = false) => {
    if (!isBackground) setIsLoading(true);
    try {
      // Fetch students list and attendance records in parallel
      const [stuRes, attRes] = await Promise.all([
        api.get<{ success: boolean; students: Student[] }>('/students'),
        isToday
          ? api.get<{ success: boolean; records: AttendanceRecord[] }>('/attendance/today')
          : api.get<{ success: boolean; records: AttendanceRecord[] }>(`/attendance/recap?date=${selectedDate}`),
      ]);

      if (stuRes.success) {
        setStudents(stuRes.students || []);
      }
      if (attRes.success) {
        setRecords(attRes.records || []);
      }
    } catch (err) {
      console.error('Failed to load class monitoring data', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Distinct class list
  const classList = useMemo(() => {
    const predefined = ['X (10)', 'XI (11)', 'XII (12)'];
    const fromStudents = Array.from(new Set(students.map((s) => s.class_name).filter(Boolean)));
    const combined = Array.from(new Set([...predefined, ...fromStudents]));
    return combined.sort();
  }, [students]);

  // Aggregate statistics per class
  const classStats = useMemo<ClassStat[]>(() => {
    return classList.map((cls) => {
      const classStudents = students.filter((s) => s.class_name === cls);
      const total = classStudents.length;

      let present = 0;
      let late = 0;
      let permission = 0;
      let sick = 0;
      let alpha = 0;

      // Map attendance records belonging to students of this class
      classStudents.forEach((student) => {
        const rec = records.find((r) => r.student_id === student.id);
        if (rec) {
          if (rec.status === 'HADIR') present++;
          else if (rec.status === 'TERLAMBAT') late++;
          else if (rec.status === 'IZIN') permission++;
          else if (rec.status === 'SAKIT') sick++;
          else if (rec.status === 'ALPHA') alpha++;
        }
      });

      const attendedTotal = present + late;
      const recordedTotal = present + late + permission + sick + alpha;
      const notYet = Math.max(0, total - recordedTotal);
      const percentage = total > 0 ? Math.round((attendedTotal / total) * 100) : 0;

      return {
        className: cls,
        totalStudents: total,
        present,
        late,
        permission,
        sick,
        alpha,
        notYet,
        percentage,
      };
    });
  }, [classList, students, records]);

  // Overall attendance counts for the active class filter
  const filterCounts = useMemo(() => {
    const targetStudents = students.filter((s) => selectedClass === 'all' || s.class_name === selectedClass);
    let hadir = 0;
    let izinSakit = 0;
    let alpha = 0;

    targetStudents.forEach((s) => {
      const r = records.find((rec) => rec.student_id === s.id);
      if (r) {
        if (r.status === 'HADIR' || r.status === 'TERLAMBAT') hadir++;
        else if (r.status === 'IZIN' || r.status === 'SAKIT') izinSakit++;
        else if (r.status === 'ALPHA') alpha++;
      }
    });

    const notYet = Math.max(0, targetStudents.length - (hadir + izinSakit + alpha));
    return {
      all: targetStudents.length,
      hadir,
      izinSakit,
      alpha,
      notYet,
    };
  }, [students, records, selectedClass]);

  // Full breakdown of students combined with their attendance state
  const combinedStudentData = useMemo(() => {
    return students
      .filter((s) => {
        if (selectedClass !== 'all' && s.class_name !== selectedClass) return false;

        const record = records.find((r) => r.student_id === s.id);

        if (selectedStatus === 'HADIR') {
          if (!record || (record.status !== 'HADIR' && record.status !== 'TERLAMBAT')) return false;
        } else if (selectedStatus === 'IZIN_SAKIT') {
          if (!record || (record.status !== 'IZIN' && record.status !== 'SAKIT')) return false;
        } else if (selectedStatus === 'ALPHA') {
          if (!record || record.status !== 'ALPHA') return false;
        } else if (selectedStatus === 'BELUM_ABSEN') {
          if (record) return false;
        }

        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase();
        return (
          (s.full_name || '').toLowerCase().includes(q) ||
          (s.class_name || '').toLowerCase().includes(q)
        );
      })
      .map((student) => {
        const record = records.find((r) => r.student_id === student.id);
        return {
          student,
          record,
        };
      })
      .sort((a, b) => {
        // Sort by class first, then by name
        if (a.student.class_name !== b.student.class_name) {
          return (a.student.class_name || '').localeCompare(b.student.class_name || '');
        }
        return (a.student.full_name || '').localeCompare(b.student.full_name || '');
      });
  }, [students, records, selectedClass, selectedStatus, searchQuery]);

  return (
    <div className="space-y-6">

      {/* Header Banner */}
      <div className="bg-white dark:bg-[#0a0f1c] rounded-3xl p-5 sm:p-6 border border-slate-200/90 dark:border-slate-800 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] sm:text-[11px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block">
              Monitoring Kehadiran Siswa
            </span>
            {isToday && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 font-bold text-[10px] shadow-2xs">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-600"></span>
                </span>
                LIVE REAL-TIME
              </span>
            )}
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-1">
            Monitoring Absensi Per Kelas
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Pantau ringkasan kehadiran siswa Kelas X, XI, dan XII secara rinci dan terpisah
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 self-start md:self-auto">
          {/* Date Picker */}
          <div className="relative">
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="pl-9 pr-3.5 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
            />
            <Calendar className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3 pointer-events-none" />
          </div>

          <button
            type="button"
            onClick={() => fetchData()}
            className="px-3.5 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold inline-flex items-center gap-2 transition-colors cursor-pointer"
            title="Segarkan Data"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Segarkan</span>
          </button>
        </div>
      </div>

      {/* Class Overview Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {classStats.map((stat) => {
          const isSelected = selectedClass === stat.className;
          return (
            <div
              key={stat.className}
              onClick={() => setSelectedClass(isSelected ? 'all' : stat.className)}
              className={`p-5 rounded-3xl border transition-all cursor-pointer relative overflow-hidden shadow-2xs group ${isSelected
                  ? 'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-400 dark:border-emerald-600 ring-2 ring-emerald-400'
                  : 'bg-white dark:bg-[#0a0f1c] border-slate-200/90 dark:border-slate-800 hover:border-emerald-300 dark:hover:border-emerald-700'
                }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block">
                    Tingkat Kelas
                  </span>
                  <h3 className="text-xl font-black text-slate-900 dark:text-white mt-0.5">
                    Kelas {stat.className}
                  </h3>
                </div>

                <div className={`p-2.5 rounded-2xl ${isSelected
                    ? 'bg-emerald-600 text-white'
                    : 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 group-hover:scale-105'
                  } transition-all`}>
                  <GraduationCap className="w-5 h-5" />
                </div>
              </div>

              {/* Attendance Percentage Bar */}
              <div className="mt-4 space-y-1.5">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-slate-600 dark:text-slate-300">Tingkat Kehadiran</span>
                  <span className="font-black text-emerald-600 dark:text-emerald-400 text-sm">
                    {stat.percentage}%
                  </span>
                </div>
                <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full transition-all duration-700"
                    style={{ width: `${stat.percentage}%` }}
                  />
                </div>
              </div>

              {/* Status Breakdown Counters - 4 Separate Columns */}
              <div className="mt-4 grid grid-cols-4 gap-1.5 text-center pt-3 border-t border-slate-100 dark:border-slate-800">
                <div className="p-1.5 bg-emerald-50/60 dark:bg-emerald-950/40 rounded-xl border border-emerald-100 dark:border-emerald-900/40">
                  <span className="text-[9px] font-bold text-emerald-800 dark:text-emerald-300 uppercase block">Hadir</span>
                  <span className="text-xs sm:text-sm font-black text-emerald-700 dark:text-emerald-300">{stat.present + stat.late}</span>
                </div>
                <div className="p-1.5 bg-amber-50/60 dark:bg-amber-950/40 rounded-xl border border-amber-100 dark:border-amber-900/40">
                  <span className="text-[9px] font-bold text-amber-800 dark:text-amber-300 uppercase block">Izin/Skt</span>
                  <span className="text-xs sm:text-sm font-black text-amber-700 dark:text-amber-300">{stat.permission + stat.sick}</span>
                </div>
                <div className="p-1.5 bg-rose-50/60 dark:bg-rose-950/40 rounded-xl border border-rose-100 dark:border-rose-900/40">
                  <span className="text-[9px] font-bold text-rose-800 dark:text-rose-300 uppercase block">Alpha</span>
                  <span className="text-xs sm:text-sm font-black text-rose-700 dark:text-rose-300">{stat.alpha}</span>
                </div>
                <div className="p-1.5 bg-slate-100/80 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700/80">
                  <span className="text-[9px] font-bold text-slate-600 dark:text-slate-400 uppercase block">Belum</span>
                  <span className="text-xs sm:text-sm font-black text-slate-700 dark:text-slate-300">{stat.notYet}</span>
                </div>
              </div>

              <div className="mt-3 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                <span>Total: <b>{stat.totalStudents} Siswa</b></span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400 group-hover:underline">
                  {isSelected ? '✓ Filter Aktif' : 'Pilih Kelas →'}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-[#0a0f1c] rounded-3xl p-4 sm:p-5 border border-slate-200/90 dark:border-slate-800 shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Class Filter Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
            <button
              type="button"
              onClick={() => setSelectedClass('all')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer shrink-0 ${selectedClass === 'all'
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                }`}
            >
              Semua Kelas ({students.length})
            </button>
            {classList.map((cls) => (
              <button
                key={cls}
                type="button"
                onClick={() => setSelectedClass(cls)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer shrink-0 ${selectedClass === cls
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                  }`}
              >
                Kelas {cls}
              </button>
            ))}
          </div>

          {/* Search Input */}
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari nama siswa di kelas ini..."
              className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-medium text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        </div>

        {/* Quick Attendance Status Filters */}
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider shrink-0 mr-1">
            Status:
          </span>
          <button
            type="button"
            onClick={() => setSelectedStatus('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer shrink-0 ${
              selectedStatus === 'all'
                ? 'bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-900'
                : 'bg-slate-100 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
            }`}
          >
            Semua ({filterCounts.all})
          </button>
          <button
            type="button"
            onClick={() => setSelectedStatus('HADIR')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer shrink-0 ${
              selectedStatus === 'HADIR'
                ? 'bg-emerald-600 text-white'
                : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100'
            }`}
          >
            Hadir ({filterCounts.hadir})
          </button>
          <button
            type="button"
            onClick={() => setSelectedStatus('IZIN_SAKIT')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer shrink-0 ${
              selectedStatus === 'IZIN_SAKIT'
                ? 'bg-amber-600 text-white'
                : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 hover:bg-amber-100'
            }`}
          >
            Izin / Sakit ({filterCounts.izinSakit})
          </button>
          <button
            type="button"
            onClick={() => setSelectedStatus('ALPHA')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer shrink-0 ${
              selectedStatus === 'ALPHA'
                ? 'bg-rose-600 text-white'
                : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 hover:bg-rose-100'
            }`}
          >
            Alpha ({filterCounts.alpha})
          </button>
          <button
            type="button"
            onClick={() => setSelectedStatus('BELUM_ABSEN')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer shrink-0 ${
              selectedStatus === 'BELUM_ABSEN'
                ? 'bg-slate-700 text-white dark:bg-slate-300 dark:text-slate-900'
                : 'bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
            }`}
          >
            Belum Absen ({filterCounts.notYet})
          </button>
        </div>
      </div>

      {/* Student Attendance List Table & Cards */}
      <div className="bg-white dark:bg-[#0a0f1c] rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-2xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div>
            <h2 className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
              Daftar Presensi Siswa {selectedClass !== 'all' ? `Kelas ${selectedClass}` : 'Semua Kelas'}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Total {combinedStudentData.length} siswa terdaftar
            </p>
          </div>
        </div>

        {/* Desktop View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 uppercase tracking-wider font-bold border-b border-slate-100 dark:border-slate-800">
              <tr>
                <th className="py-3 px-4 w-12 text-center">No</th>
                <th className="py-3 px-4">Nama Siswa</th>
                <th className="py-3 px-4">Kelas</th>
                <th className="py-3 px-4">Jenis Kelamin</th>
                <th className="py-3 px-4">Status Kehadiran</th>
                <th className="py-3 px-4">Waktu Masuk</th>
                <th className="py-3 px-4">Jarak GPS</th>
                <th className="py-3 px-4 text-center">Foto Swafoto</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    Memuat data siswa per kelas...
                  </td>
                </tr>
              ) : combinedStudentData.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    Tidak ada siswa ditemukan pada filter ini.
                  </td>
                </tr>
              ) : (
                combinedStudentData.map((item, idx) => {
                  const { student, record } = item;
                  return (
                    <tr key={student.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-900/40 transition-colors">
                      <td className="py-3.5 px-4 text-center font-bold text-slate-400">
                        {idx + 1}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() =>
                              setPreviewPhotoData({
                                url: student.profile_photo_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${student.username}`,
                                title: 'Foto Profil Siswa',
                                studentName: student.full_name,
                                className: student.class_name,
                                username: student.username,
                                notes: student.gender ? `Jenis Kelamin: ${student.gender}` : undefined,
                                isProfilePhoto: true,
                              })
                            }
                            className="group relative w-8 h-8 rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-800 shrink-0 border border-slate-200 dark:border-slate-700 hover:border-emerald-500 hover:ring-2 hover:ring-emerald-400/50 transition-all cursor-pointer"
                            title="Klik untuk melihat foto profil ukuran penuh"
                          >
                            <img
                              src={student.profile_photo_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${student.username}`}
                              alt={student.full_name}
                              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-200"
                            />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                              <Eye className="w-3.5 h-3.5 text-white drop-shadow" />
                            </div>
                          </button>
                          <div>
                            <span className="font-bold text-slate-900 dark:text-white block">{student.full_name}</span>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-bold text-emerald-600 dark:text-emerald-400">
                        {student.class_name}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 dark:text-slate-400">
                        {student.gender || '-'}
                      </td>
                      <td className="py-3.5 px-4">
                        {record ? (
                          <span
                            className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-black ${record.status === 'HADIR'
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                                : record.status === 'TERLAMBAT'
                                  ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                                  : record.status === 'IZIN'
                                    ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300'
                                    : record.status === 'SAKIT'
                                      ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300'
                                      : 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                              }`}
                          >
                            {record.status}
                          </span>
                        ) : (
                          <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border border-slate-200/80 dark:border-slate-700/80">
                            {isToday ? 'Belum Absen' : 'Tidak Hadir'}
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 font-mono">
                        {record?.time ? `${record.time} WIB` : '-'}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 dark:text-slate-400">
                        {record?.distance_meters !== null && record?.distance_meters !== undefined
                          ? `${record.distance_meters}m`
                          : '-'}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        {record?.photo_url ? (
                          <button
                            type="button"
                            onClick={() =>
                              setPreviewPhotoData({
                                url: record.photo_url || '',
                                title: 'Bukti Absensi (Selfie)',
                                studentName: student.full_name,
                                className: student.class_name,
                                username: student.username,
                                statusBadge: record.status,
                                timestamp: `${record.date} ${record.time} WIB`,
                                distanceMeters: record.distance_meters,
                                notes: record.notes,
                                isProfilePhoto: false,
                              })
                            }
                            className="inline-block w-8 h-8 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 hover:scale-105 hover:ring-2 hover:ring-emerald-500 transition-all cursor-pointer"
                            title="Klik untuk melihat foto swafoto"
                          >
                            <img
                              src={record.photo_url}
                              alt="Swafoto"
                              className="w-full h-full object-cover"
                            />
                          </button>
                        ) : (
                          <span className="text-slate-400 italic text-[11px]">-</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile View */}
        <div className="block md:hidden p-3.5 space-y-2.5">
          {isLoading ? (
            <div className="py-10 text-center text-slate-400 text-xs">
              Memuat data kehadiran...
            </div>
          ) : combinedStudentData.length === 0 ? (
            <div className="py-10 text-center text-slate-400 text-xs bg-slate-50 dark:bg-slate-900 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
              Tidak ada siswa ditemukan.
            </div>
          ) : (
            combinedStudentData.map((item) => {
              const { student, record } = item;
              return (
                <div
                  key={student.id}
                  className="p-3.5 bg-slate-50/80 dark:bg-slate-900/60 border border-slate-200/90 dark:border-slate-800 rounded-2xl space-y-2.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <button
                        type="button"
                        onClick={() =>
                          setPreviewPhotoData({
                            url: student.profile_photo_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${student.username}`,
                            title: 'Foto Profil Siswa',
                            studentName: student.full_name,
                            className: student.class_name,
                            username: student.username,
                            notes: student.gender ? `Jenis Kelamin: ${student.gender}` : undefined,
                            isProfilePhoto: true,
                          })
                        }
                        className="group relative w-10 h-10 rounded-xl overflow-hidden bg-white dark:bg-slate-800 shrink-0 border border-slate-200 dark:border-slate-700 hover:border-emerald-500 hover:ring-2 hover:ring-emerald-400/50 transition-all cursor-pointer"
                        title="Klik untuk melihat foto profil ukuran penuh"
                      >
                        <img
                          src={student.profile_photo_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${student.username}`}
                          alt={student.full_name}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-200"
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                          <Eye className="w-3.5 h-3.5 text-white drop-shadow" />
                        </div>
                      </button>
                      <div className="min-w-0">
                        <span className="font-bold text-slate-900 dark:text-white text-xs block truncate">
                          {student.full_name}
                        </span>
                        <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-bold block">
                          Kelas {student.class_name}
                        </span>
                      </div>
                    </div>

                    {record ? (
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-black shrink-0 ${record.status === 'HADIR'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                            : record.status === 'TERLAMBAT'
                              ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                              : record.status === 'IZIN'
                                ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300'
                                : record.status === 'SAKIT'
                                  ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300'
                                  : 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                          }`}
                      >
                        {record.status}
                      </span>
                    ) : (
                      <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-200/80 text-slate-700 dark:bg-slate-800 dark:text-slate-300 shrink-0 border border-slate-300/60 dark:border-slate-700">
                        {isToday ? 'Belum Absen' : 'Tidak Hadir'}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-600 dark:text-slate-400 pt-2 border-t border-slate-200/60 dark:border-slate-800">
                    <div className="flex items-center gap-3">
                      <span>⏰ {record?.time ? `${record.time} WIB` : '-'}</span>
                      <span>📍 {record?.distance_meters !== null && record?.distance_meters !== undefined ? `${record.distance_meters}m` : '-'}</span>
                    </div>

                    {record?.photo_url && (
                      <button
                        type="button"
                        onClick={() =>
                          setPreviewPhotoData({
                            url: record.photo_url || '',
                            title: 'Bukti Absensi (Selfie)',
                            studentName: student.full_name,
                            className: student.class_name,
                            username: student.username,
                            statusBadge: record.status,
                            timestamp: `${record.date} ${record.time} WIB`,
                            distanceMeters: record.distance_meters,
                            notes: record.notes,
                            isProfilePhoto: false,
                          })
                        }
                        className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
                      >
                        Lihat Foto
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Modal Preview Photo */}
      <PhotoPreviewModal
        isOpen={Boolean(previewPhotoData)}
        onClose={() => setPreviewPhotoData(null)}
        data={previewPhotoData}
      />

    </div>
  );
};
