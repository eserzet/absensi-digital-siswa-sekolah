import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api.js';
import { AttendanceRecord, AttendanceStatus } from '../../types.js';
import {
  Clock,
  Search,
  Filter,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  MapPin,
  Image as ImageIcon,
  Edit3,
  Save,
  X,
  AlertCircle,
  ExternalLink,
  Trash2
} from 'lucide-react';
import { ConfirmModal } from '../common/ConfirmModal.js';

const CLASS_OPTIONS = [
  'all',
  'X (10)',
  'XI (11)',
  'XII (12)',
];

export const AdminAbsensiLive: React.FC = () => {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [previewPhoto, setPreviewPhoto] = useState<string | null>(null);

  // Delete state
  const [deleteTarget, setDeleteTarget] = useState<AttendanceRecord | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [newlyAddedIds, setNewlyAddedIds] = useState<Set<string>>(new Set());
  const prevRecordIdsRef = React.useRef<Set<string>>(new Set());

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      const res = await api.delete<{ success: boolean; message: string }>(`/attendance/${deleteTarget.id}`);
      if (res.success) {
        setRecords((prev) => prev.filter((r) => r.id !== deleteTarget.id));
        setDeleteTarget(null);
      } else {
        alert(res.message || 'Gagal menghapus data absensi.');
      }
    } catch (err: any) {
      alert(err.message || 'Terjadi kesalahan saat menghapus data.');
    } finally {
      setIsDeleting(false);
    }
  };

  // Status edit modal state
  const [selectedRecord, setSelectedRecord] = useState<AttendanceRecord | null>(null);
  const [newStatus, setNewStatus] = useState<AttendanceStatus>('HADIR');
  const [editReason, setEditReason] = useState<string>('');
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [modalError, setModalError] = useState<string | null>(null);

  const openEditModal = (rec: AttendanceRecord) => {
    setSelectedRecord(rec);
    setNewStatus(rec.status);
    setEditReason(rec.notes || '');
    setModalError(null);
  };

  const handleSaveStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRecord) return;

    if (!editReason.trim()) {
      setModalError('Alasan perubahan status kehadiran wajib diisi.');
      return;
    }

    setIsSaving(true);
    setModalError(null);

    try {
      const res = await api.put<{
        success: boolean;
        message: string;
        attendance: AttendanceRecord;
      }>(`/attendance/${selectedRecord.id}/status`, {
        status: newStatus,
        reason: editReason.trim(),
      });

      if (res.success) {
        setRecords((prev) =>
          prev.map((r) =>
            r.id === selectedRecord.id
              ? { ...r, status: newStatus, notes: editReason.trim() }
              : r
          )
        );
        setSelectedRecord(null);
      } else {
        setModalError(res.message || 'Gagal mengubah status absensi.');
      }
    } catch (err: any) {
      setModalError(err.message || 'Terjadi kendala saat mengubah status.');
    } finally {
      setIsSaving(false);
    }
  };

  useEffect(() => {
    fetchTodayData();
    // Real-time polling every 5 seconds without resetting user view
    const interval = setInterval(() => {
      fetchTodayData(true);
    }, 5000);
    return () => clearInterval(interval);
  }, [selectedClass, selectedStatus]);

  const fetchTodayData = async (isBackground = false) => {
    if (!isBackground) setIsLoading(true);
    try {
      const url = `/attendance/today?class=${selectedClass}&status=${selectedStatus}`;
      const res = await api.get<{
        success: boolean;
        date: string;
        records: AttendanceRecord[];
      }>(url);

      if (res.success) {
        const incoming = res.records || [];
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
        setRecords(incoming);
      }
    } catch (err) {
      console.error('Failed to load today attendance', err);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredRecords = records
    .filter((r) => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        (r.student?.full_name || r.student_name || '').toLowerCase().includes(q) ||
        (r.student?.username || '').toLowerCase().includes(q) ||
        (r.student?.class_name || r.class_name || '').toLowerCase().includes(q)
      );
    })
    .sort((a, b) => {
      const nameA = (a.student?.full_name || a.student_name || '').trim();
      const nameB = (b.student?.full_name || b.student_name || '').trim();
      return nameA.localeCompare(nameB, 'id', { sensitivity: 'base' });
    });

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider block">
              Monitoring Hari Ini
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold text-[10px] shadow-2xs">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-600"></span>
              </span>
              REAL-TIME
            </span>
          </div>
          <h1 className="text-xl font-black text-slate-900 mt-0.5">
            Presensi Siswa Masuk Hari Ini
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Otomatis disinkronkan setiap 5 detik tanpa perlu refresh • Verifikasi foto & GPS
          </p>
        </div>

        <button
          type="button"
          onClick={() => fetchTodayData()}
          className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold inline-flex items-center gap-2 transition-colors cursor-pointer self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Segarkan Data</span>
        </button>
      </div>

      {/* Filter Controls */}
      <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-100 shadow-xs grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Search */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari nama siswa..."
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        {/* Filter Kelas */}
        <div>
          <select
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
          >
            <option value="all">Semua Kelas</option>
            {CLASS_OPTIONS.filter((c) => c !== 'all').map((c) => (
              <option key={c} value={c}>
                Kelas {c}
              </option>
            ))}
          </select>
        </div>

        {/* Filter Status */}
        <div>
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
          >
            <option value="all">Semua Status Kehadiran</option>
            <option value="HADIR">Hadir Tepat Waktu</option>
            <option value="TERLAMBAT">Terlambat</option>
            <option value="IZIN">Izin</option>
            <option value="SAKIT">Sakit</option>
            <option value="ALPHA">Alpha</option>
          </select>
        </div>
      </div>

      {/* Attendance Records: Dual View (Mobile Cards & Desktop Table) */}
      <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-2xs overflow-hidden p-3.5 sm:p-0">

        {/* ── MOBILE VIEW: Touch-friendly Cards (< md) ── */}
        <div className="block md:hidden space-y-3">
          {isLoading ? (
            <div className="py-10 text-center text-slate-400 text-xs">
              Memuat data kehadiran...
            </div>
          ) : filteredRecords.length === 0 ? (
            <div className="py-10 text-center text-slate-400 text-xs bg-slate-50 rounded-2xl border border-dashed border-slate-200">
              Tidak ada data absensi yang sesuai filter.
            </div>
          ) : (
            filteredRecords.map((rec, idx) => (
              <div
                key={rec.id}
                className={`p-3.5 border rounded-2xl space-y-2.5 transition-all duration-500 shadow-2xs ${newlyAddedIds.has(rec.id)
                    ? 'bg-emerald-50/90 border-emerald-400 shadow-md ring-2 ring-emerald-400'
                    : 'bg-slate-50/80 hover:bg-slate-100/80 border-slate-200/90'
                  }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="w-6 h-6 rounded-lg bg-slate-200/90 text-slate-700 font-black text-[11px] shrink-0 flex items-center justify-center">
                      {idx + 1}
                    </span>
                    <div className="w-10 h-10 rounded-xl overflow-hidden bg-white shrink-0 border border-slate-200 shadow-2xs">
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
                        Kelas {rec.student?.class_name}
                      </span>
                    </div>
                  </div>

                  <span
                    className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-black shrink-0 ${rec.status === 'HADIR'
                        ? 'bg-emerald-100 text-emerald-800'
                        : rec.status === 'TERLAMBAT'
                          ? 'bg-amber-100 text-amber-800'
                          : rec.status === 'IZIN'
                            ? 'bg-blue-100 text-blue-800'
                            : rec.status === 'SAKIT'
                              ? 'bg-indigo-100 text-indigo-800'
                              : 'bg-rose-100 text-rose-800'
                      }`}
                  >
                    {rec.status}
                  </span>
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-600 pt-2 border-t border-slate-200/60">
                  <div className="flex items-center gap-2.5">
                    <span className="font-mono font-semibold text-slate-800">
                      ⏰ {rec.time} WIB
                    </span>
                    {rec.latitude && rec.longitude ? (
                      <a
                        href={`https://www.google.com/maps?q=${rec.latitude},${rec.longitude}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 font-bold text-[11px] text-blue-600 hover:text-blue-800 underline"
                        title="Lihat koordinat live di Google Maps"
                      >
                        <MapPin className="w-3 h-3 text-blue-600" />
                        <span>📍 {rec.distance_meters !== null && rec.distance_meters !== undefined ? `${rec.distance_meters}m (Maps)` : 'Maps'}</span>
                      </a>
                    ) : (
                      <span className="text-slate-500">
                        📍 {rec.distance_meters !== null && rec.distance_meters !== undefined ? `${rec.distance_meters}m` : '-'}
                      </span>
                    )}
                  </div>

                  {rec.photo_url ? (
                    <button
                      type="button"
                      onClick={() => setPreviewPhoto(rec.photo_url || null)}
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 hover:text-emerald-800 cursor-pointer"
                    >
                      <img
                        src={rec.photo_url}
                        alt="Foto"
                        className="w-6 h-6 rounded-md object-cover border border-slate-200"
                      />
                      <span>Lihat Foto</span>
                    </button>
                  ) : (
                    <span className="text-slate-400 italic text-[10px]">Tanpa Foto</span>
                  )}
                </div>

                {rec.notes && (
                  <div className="text-[11px] bg-white p-2 rounded-xl border border-slate-200/60 text-slate-600">
                    <span className="font-semibold text-slate-700">Ket:</span> {rec.notes}
                  </div>
                )}

                <div className="pt-1 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => openEditModal(rec)}
                    className="flex-1 min-h-[44px] py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5 text-emerald-700" />
                    <span>Ubah Status</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteTarget(rec)}
                    className="min-w-[44px] min-h-[44px] p-2 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 rounded-xl flex items-center justify-center transition-colors cursor-pointer shrink-0"
                    title="Hapus data absensi ini"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* ── DESKTOP VIEW: Full Data Table (md and up) ── */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-bold border-b border-slate-100">
              <tr>
                <th className="py-3.5 px-4 text-center w-12 text-slate-500 font-bold">No.</th>
                <th className="py-3.5 px-5">Siswa</th>
                <th className="py-3.5 px-4">Kelas</th>
                <th className="py-3.5 px-4">Waktu Scan</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4">Lokasi & GPS</th>
                <th className="py-3.5 px-4">Dokumentasi Wajah</th>
                <th className="py-3.5 px-4">Keterangan</th>
                <th className="py-3.5 px-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {isLoading ? (
                <tr>
                  <td colSpan={9} className="py-10 text-center text-slate-400">
                    Memuat data kehadiran...
                  </td>
                </tr>
              ) : filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    Tidak ada data absensi yang sesuai kriteria pencarian.
                  </td>
                </tr>
              ) : (
                filteredRecords.map((rec, idx) => (
                  <tr
                    key={rec.id}
                    className={`transition-all duration-500 ${newlyAddedIds.has(rec.id)
                        ? 'bg-emerald-50/90 ring-2 ring-emerald-400 font-semibold'
                        : 'hover:bg-slate-50/70'
                      }`}
                  >
                    <td className="py-3.5 px-4 text-center font-bold text-slate-400">
                      {idx + 1}
                    </td>
                    <td className="py-3.5 px-5">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl overflow-hidden bg-slate-100 shrink-0 border border-slate-200">
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
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-bold text-emerald-700">
                      {rec.student?.class_name}
                    </td>
                    <td className="py-3.5 px-4 font-mono font-semibold">
                      {rec.time} WIB
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-black ${rec.status === 'HADIR'
                            ? 'bg-emerald-100 text-emerald-800'
                            : rec.status === 'TERLAMBAT'
                              ? 'bg-amber-100 text-amber-800'
                              : rec.status === 'IZIN'
                                ? 'bg-blue-100 text-blue-800'
                                : rec.status === 'SAKIT'
                                  ? 'bg-indigo-100 text-indigo-800'
                                  : 'bg-rose-100 text-rose-800'
                          }`}
                      >
                        {rec.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${rec.is_valid_location || (rec.distance_meters !== null && rec.distance_meters !== undefined && rec.distance_meters <= 100)
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-amber-50 text-amber-700 border border-amber-200'
                              }`}
                          >
                            {rec.distance_meters !== null && rec.distance_meters !== undefined ? `${rec.distance_meters}m` : '-'}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {rec.is_valid_location ? 'Di Sekolah' : 'Luar Radius'}
                          </span>
                        </div>

                        {rec.latitude && rec.longitude ? (
                          <a
                            href={`https://www.google.com/maps?q=${rec.latitude},${rec.longitude}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:text-blue-800 hover:underline"
                            title={`Lihat koordinat (${rec.latitude}, ${rec.longitude}) di Google Maps`}
                          >
                            <ExternalLink className="w-3 h-3 text-blue-500" />
                            <span>Buka Google Maps</span>
                          </a>
                        ) : (
                          <span className="text-[10px] text-slate-400 italic block">Tanpa Koordinat</span>
                        )}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      {rec.photo_url ? (
                        <div
                          onClick={() => setPreviewPhoto(rec.photo_url || null)}
                          className="w-10 h-10 rounded-xl overflow-hidden border border-slate-200 hover:scale-110 transition-transform cursor-pointer shadow-xs"
                          title="Klik untuk memperbesar foto dokumentasi"
                        >
                          <img
                            src={rec.photo_url}
                            alt="Dokumentasi"
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ) : (
                        <span className="text-slate-400 italic text-[11px]">-</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-[11px] text-slate-500">
                      {rec.notes || '-'}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => openEditModal(rec)}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg border border-emerald-200 transition-colors shadow-2xs cursor-pointer"
                          title="Ubah status kehadiran siswa"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          Ubah Status
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(rec)}
                          className="p-1.5 text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-lg border border-rose-200 transition-colors cursor-pointer"
                          title="Hapus data absensi ini"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Status Edit Modal: Mobile-safe Scrollable */}
      {selectedRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3.5 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md max-h-[90vh] overflow-y-auto rounded-3xl shadow-2xl border border-slate-100 p-5 sm:p-6">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-sm sm:text-base font-bold text-slate-900">Ubah Status Kehadiran</h3>
                <p className="text-[11px] text-slate-500">Perbarui status presensi di database Supabase</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedRecord(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-slate-50 rounded-2xl p-3.5 mb-4 border border-slate-100 space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-slate-500">Nama Siswa:</span>
                <span className="font-bold text-slate-800">{selectedRecord.student?.full_name || selectedRecord.student_name}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-500">Kelas:</span>
                <span className="font-bold text-emerald-700">{selectedRecord.student?.class_name || selectedRecord.class_name}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-500">Waktu Absensi:</span>
                <span className="font-mono text-slate-700">{selectedRecord.time} WIB</span>
              </div>
            </div>

            {modalError && (
              <div className="p-3 mb-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2 font-medium">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{modalError}</span>
              </div>
            )}

            <form onSubmit={handleSaveStatus} className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Pilih Status Baru
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['HADIR', 'TERLAMBAT', 'IZIN', 'SAKIT', 'ALPHA'] as AttendanceStatus[]).map((st) => (
                    <button
                      type="button"
                      key={st}
                      onClick={() => setNewStatus(st)}
                      className={`py-2 px-2 sm:px-3 text-xs font-bold rounded-xl border transition-all cursor-pointer ${newStatus === st
                          ? 'bg-emerald-700 text-white border-emerald-700 shadow-sm'
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                        }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Alasan / Keterangan Perubahan <span className="text-rose-500">*</span>
                </label>
                <textarea
                  value={editReason}
                  onChange={(e) => setEditReason(e.target.value)}
                  placeholder="Contoh: Dispensasi acara OSIS, perbaikan koordinat lokasi, surat dokter..."
                  rows={3}
                  className="w-full text-xs rounded-xl border border-slate-200 p-3 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 bg-slate-50"
                  required
                />
              </div>

              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedRecord(null)}
                  disabled={isSaving}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-xs font-bold hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex-1 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-colors shadow-sm disabled:opacity-50 cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  {isSaving ? 'Menyimpan...' : 'Simpan Status'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Photo Preview Modal: Mobile-friendly */}
      {previewPhoto && (
        <div
          onClick={() => setPreviewPhoto(null)}
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl p-3.5 max-w-sm w-full overflow-hidden shadow-2xl space-y-3"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800">Foto Dokumentasi Swafoto</span>
              <button
                type="button"
                onClick={() => setPreviewPhoto(null)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
              >
                ✕
              </button>
            </div>
            <img
              src={previewPhoto}
              alt="Preview Dokumentasi Wajah"
              className="w-full h-auto rounded-2xl object-cover max-h-[65vh]"
            />
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
        isOpen={Boolean(deleteTarget)}
        isDestructive={true}
        title="Hapus Data Absensi"
        message={`Apakah Anda yakin ingin menghapus data absensi atas nama "${deleteTarget?.student?.full_name || deleteTarget?.student_name || 'Siswa'}" (${deleteTarget?.status}, ${deleteTarget?.time} WIB)? Tindakan ini permanen.`}
        confirmLabel={isDeleting ? 'Menghapus...' : 'Ya, Hapus'}
        cancelLabel="Batal"
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />

    </div>
  );
};
