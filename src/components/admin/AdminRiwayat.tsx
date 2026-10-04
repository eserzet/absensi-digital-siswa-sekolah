import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../../lib/api.js';
import { AttendanceRecord, AttendanceStatus } from '../../types.js';
import { 
  History, 
  Search, 
  Edit3, 
  CheckCircle2, 
  X, 
  Save, 
  AlertCircle,
  Trash2,
  Calendar,
  Filter,
  CheckSquare,
  Square,
  GraduationCap,
  ExternalLink,
  MapPin,
  Eye,
  Camera
} from 'lucide-react';
import { ConfirmModal } from '../common/ConfirmModal.js';
import { PhotoPreviewModal, PhotoPreviewData } from '../common/PhotoPreviewModal.js';

export const AdminRiwayat: React.FC = () => {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClass, setSelectedClass] = useState('all');
  const [selectedDate, setSelectedDate] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [actionNotice, setActionNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [previewPhotoData, setPreviewPhotoData] = useState<PhotoPreviewData | null>(null);

  // Multi-selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Delete modal state
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    type: 'single' | 'bulk' | 'all';
    targetId?: string;
    targetName?: string;
    count?: number;
  }>({
    isOpen: false,
    type: 'single',
  });
  const [isDeleting, setIsDeleting] = useState(false);

  // Edit status modal
  const [selectedRecord, setSelectedRecord] = useState<AttendanceRecord | null>(null);
  const [newStatus, setNewStatus] = useState<AttendanceStatus>('HADIR');
  const [editReason, setEditReason] = useState<string>('');
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [modalError, setModalError] = useState<string | null>(null);

  useEffect(() => {
    fetchRecords();
    // Background auto-sync every 15s to keep history updated
    const interval = setInterval(() => {
      fetchRecords(true);
    }, 15000);
    return () => clearInterval(interval);
  }, []);

  const fetchRecords = async (isBackground = false) => {
    if (!isBackground) setIsLoading(true);
    try {
      const res = await api.get<{
        success: boolean;
        records: AttendanceRecord[];
      }>('/attendance/recap');

      if (res.success) {
        setRecords(res.records || []);
      }
    } catch (err) {
      console.error('Failed to load history', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Extract unique class list from records
  const availableClasses = useMemo(() => {
    const set = new Set<string>();
    // Default fallback classes
    ['X RPL 1', 'X RPL 2', 'XI RPL 1', 'XI RPL 2', 'XII RPL 1', 'XII RPL 2'].forEach((c) => set.add(c));
    records.forEach((r) => {
      const cls = r.class_name || r.student?.class_name;
      if (cls) set.add(cls);
    });
    return Array.from(set).sort();
  }, [records]);

  // Filtered records
  const filtered = useMemo(() => {
    return records.filter((r) => {
      const rClass = (r.class_name || r.student?.class_name || '').toLowerCase();
      const rDate = r.date || '';

      // Class filter
      if (selectedClass !== 'all' && rClass !== selectedClass.toLowerCase()) {
        return false;
      }

      // Date filter
      if (selectedDate && rDate !== selectedDate) {
        return false;
      }

      // Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const sName = (r.student?.full_name || r.student_name || '').toLowerCase();
        const sUser = (r.student?.username || '').toLowerCase();
        const sNotes = (r.notes || '').toLowerCase();
        const sStatus = (r.status || '').toLowerCase();

        return (
          sName.includes(q) ||
          sUser.includes(q) ||
          rClass.includes(q) ||
          rDate.includes(q) ||
          sStatus.includes(q) ||
          sNotes.includes(q)
        );
      }

      return true;
    })
    .sort((a, b) => {
      const dateCompare = (b.date || '').localeCompare(a.date || '');
      if (dateCompare !== 0) return dateCompare;
      const nameA = (a.student?.full_name || a.student_name || '').trim();
      const nameB = (b.student?.full_name || b.student_name || '').trim();
      return nameA.localeCompare(nameB, 'id', { sensitivity: 'base' });
    });
  }, [records, selectedClass, selectedDate, searchQuery]);

  // Selection handlers
  const handleSelectAll = () => {
    if (selectedIds.size === filtered.length && filtered.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map((r) => r.id)));
    }
  };

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Delete confirmations
  const triggerDeleteSingle = (rec: AttendanceRecord) => {
    setDeleteModal({
      isOpen: true,
      type: 'single',
      targetId: rec.id,
      targetName: `${rec.student?.full_name || rec.student_name || 'Siswa'} (${rec.date})`,
    });
  };

  const triggerDeleteBulk = () => {
    if (selectedIds.size === 0) return;
    setDeleteModal({
      isOpen: true,
      type: 'bulk',
      count: selectedIds.size,
    });
  };

  const triggerDeleteAll = () => {
    setDeleteModal({
      isOpen: true,
      type: 'all',
      count: records.length,
    });
  };

  // Execute deletion
  const handleConfirmDelete = async () => {
    setIsDeleting(true);
    setActionNotice(null);

    try {
      if (deleteModal.type === 'single' && deleteModal.targetId) {
        const res = await api.delete<{ success: boolean; message: string }>(`/attendance/${deleteModal.targetId}`);
        if (res.success) {
          setRecords((prev) => prev.filter((r) => r.id !== deleteModal.targetId));
          setSelectedIds((prev) => {
            const next = new Set(prev);
            next.delete(deleteModal.targetId!);
            return next;
          });
          setActionNotice({ type: 'success', message: 'Data absensi berhasil dihapus.' });
        } else {
          setActionNotice({ type: 'error', message: res.message || 'Gagal menghapus data absensi.' });
        }
      } else if (deleteModal.type === 'bulk') {
        const idsArray = Array.from(selectedIds);
        const res = await api.post<{ success: boolean; message: string }>('/attendance/bulk-delete', {
          ids: idsArray,
        });

        if (res.success) {
          setRecords((prev) => prev.filter((r) => !selectedIds.has(r.id)));
          setSelectedIds(new Set());
          setActionNotice({ type: 'success', message: `Berhasil menghapus ${idsArray.length} data absensi terpilih.` });
        } else {
          setActionNotice({ type: 'error', message: res.message || 'Gagal menghapus data terpilih.' });
        }
      } else if (deleteModal.type === 'all') {
        const queryParams = selectedDate || selectedClass !== 'all'
          ? `?${new URLSearchParams({
              ...(selectedDate ? { date: selectedDate } : {}),
              ...(selectedClass !== 'all' ? { class_name: selectedClass } : {}),
            }).toString()}`
          : '';

        const res = await api.delete<{ success: boolean; message: string }>(`/attendance${queryParams}`);
        if (res.success) {
          if (!selectedDate && selectedClass === 'all') {
            setRecords([]);
            setSelectedIds(new Set());
          } else {
            // Re-fetch to synchronize remaining records
            await fetchRecords();
            setSelectedIds(new Set());
          }
          setActionNotice({ type: 'success', message: 'Semua data absensi berhasil dihapus.' });
        } else {
          setActionNotice({ type: 'error', message: res.message || 'Gagal menghapus semua data absensi.' });
        }
      }
    } catch (err: any) {
      setActionNotice({ type: 'error', message: err.message || 'Terjadi kesalahan saat menghapus data absensi.' });
    } finally {
      setIsDeleting(false);
      setDeleteModal({ isOpen: false, type: 'single' });
      setTimeout(() => setActionNotice(null), 4000);
    }
  };

  // Edit status modal handlers
  const openEditModal = (rec: AttendanceRecord) => {
    setSelectedRecord(rec);
    setNewStatus(rec.status);
    setEditReason('');
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
        setActionNotice({ type: 'success', message: 'Status absensi berhasil diperbarui.' });
        setTimeout(() => setActionNotice(null), 3000);
      } else {
        setModalError(res.message || 'Gagal mengubah status absensi.');
      }
    } catch (err: any) {
      setModalError(err.message || 'Terjadi kendala saat mengubah status.');
    } finally {
      setIsSaving(false);
    }
  };

  const isAllSelected = filtered.length > 0 && selectedIds.size === filtered.length;

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider block">
              Kelola Riwayat Presensi
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600">
              {filtered.length} dari {records.length} Data
            </span>
          </div>
          <h1 className="text-xl font-black text-slate-900 mt-0.5">
            Riwayat Absensi Seluruh Siswa
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Pencarian, filter kelas & tanggal, penyesuaian status, serta penghapusan data presensi
          </p>
        </div>

        {/* Global Danger Button: Hapus Semua Data */}
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={triggerDeleteAll}
            disabled={records.length === 0}
            className="px-4 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-2xl text-xs font-bold inline-flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-xs"
            title="Hapus seluruh rekaman data absensi di database"
          >
            <Trash2 className="w-4 h-4 text-rose-600" />
            <span>Hapus Semua Data</span>
          </button>
        </div>
      </div>

      {/* Action Notification */}
      {actionNotice && (
        <div
          className={`p-4 rounded-2xl text-xs font-bold flex items-center justify-between gap-2 animate-in fade-in duration-200 ${
            actionNotice.type === 'success'
              ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border border-rose-200 text-rose-800'
          }`}
        >
          <div className="flex items-center gap-2">
            {actionNotice.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{actionNotice.message}</span>
          </div>
          <button
            onClick={() => setActionNotice(null)}
            className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Filter Toolbar */}
      <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-xs space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
          
          {/* Search Box */}
          <div className="sm:col-span-5 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari nama, username, status, keterangan..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all"
            />
          </div>

          {/* Filter Kelas */}
          <div className="sm:col-span-4 relative">
            <GraduationCap className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="w-full pl-9 pr-8 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:bg-white cursor-pointer transition-all appearance-none"
            >
              <option value="all">Semua Kelas</option>
              {availableClasses.map((cls) => (
                <option key={cls} value={cls}>
                  Kelas {cls}
                </option>
              ))}
            </select>
            <Filter className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-3.5 pointer-events-none" />
          </div>

          {/* Filter Tanggal */}
          <div className="sm:col-span-3 relative flex items-center">
            <Calendar className="w-4 h-4 text-emerald-600 dark:text-emerald-400 absolute left-3 top-3 pointer-events-none" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full pl-9 pr-8 py-2.5 bg-slate-50 dark:bg-[#070b14] border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-800 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:bg-white dark:focus:bg-[#070b14] cursor-pointer [color-scheme:light] dark:[color-scheme:dark] transition-all"
            />
            {selectedDate && (
              <button
                type="button"
                onClick={() => setSelectedDate('')}
                className="absolute right-2.5 top-2.5 p-1 text-slate-400 hover:text-slate-600 rounded-md cursor-pointer"
                title="Reset filter tanggal"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

        </div>

        {/* Selected Items Bulk Action Bar */}
        {selectedIds.size > 0 && (
          <div className="p-3 bg-emerald-50/80 border border-emerald-200/80 rounded-2xl flex flex-wrap items-center justify-between gap-3 animate-in fade-in duration-150">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-bold text-emerald-900">
                {selectedIds.size} data absensi dipilih
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setSelectedIds(new Set())}
                className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-600 border border-slate-200 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Batal Pilih
              </button>
              <button
                type="button"
                onClick={triggerDeleteBulk}
                className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Hapus {selectedIds.size} Data Terpilih</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Records: Dual View (Mobile Cards & Desktop Table) */}
      <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-2xs overflow-hidden p-3.5 sm:p-0">
        
        {/* ── MOBILE VIEW: Touch Cards with Checkboxes (< md) ── */}
        <div className="block md:hidden space-y-3">
          {/* Mobile Select All Header */}
          <div className="flex items-center justify-between px-1 pb-2 border-b border-slate-100">
            <button
              type="button"
              onClick={handleSelectAll}
              disabled={filtered.length === 0}
              className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer disabled:opacity-40"
            >
              {isAllSelected ? (
                <CheckSquare className="w-4 h-4 text-emerald-600" />
              ) : (
                <Square className="w-4 h-4 text-slate-400" />
              )}
              <span>{isAllSelected ? 'Batalkan Pilih Semua' : 'Pilih Semua Siswa'}</span>
            </button>
            <span className="text-[11px] text-slate-400">
              {filtered.length} riwayat
            </span>
          </div>

          {isLoading ? (
            <div className="py-10 text-center text-slate-400 text-xs">
              Memuat riwayat absensi...
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-10 text-center text-slate-400 text-xs bg-slate-50 rounded-2xl border border-dashed border-slate-200">
              Tidak ada riwayat absensi yang sesuai filter.
            </div>
          ) : (
            filtered.map((rec, idx) => {
              const isSelected = selectedIds.has(rec.id);
              const className = rec.class_name || rec.student?.class_name || '-';
              const studentName = rec.student?.full_name || rec.student_name || 'Siswa';
              const studentUser = rec.student?.username || '';
              const studentPhoto = rec.student?.profile_photo_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${studentUser || studentName}`;

              return (
                <div
                  key={rec.id}
                  className={`p-3.5 rounded-2xl border transition-all shadow-2xs space-y-2.5 ${
                    isSelected
                      ? 'bg-emerald-50/70 border-emerald-300'
                      : 'bg-slate-50/80 hover:bg-slate-100/80 border-slate-200/90'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <button
                        type="button"
                        onClick={() => handleToggleSelect(rec.id)}
                        className="p-1 cursor-pointer transition-transform active:scale-90 shrink-0"
                      >
                        {isSelected ? (
                          <CheckSquare className="w-5 h-5 text-emerald-600" />
                        ) : (
                          <Square className="w-5 h-5 text-slate-300 hover:text-slate-500" />
                        )}
                      </button>

                      <span className="w-5 h-5 rounded-md bg-slate-200/90 text-slate-700 font-black text-[10px] shrink-0 flex items-center justify-center">
                        {idx + 1}
                      </span>

                      <button
                        type="button"
                        onClick={() =>
                          setPreviewPhotoData({
                            url: studentPhoto,
                            title: 'Foto Profil Siswa',
                            studentName: studentName,
                            className: className,
                            username: studentUser,
                            isProfilePhoto: true,
                          })
                        }
                        className="group relative w-9 h-9 rounded-xl overflow-hidden bg-white shrink-0 border border-slate-200 hover:border-emerald-500 hover:ring-2 hover:ring-emerald-400/50 shadow-2xs transition-all cursor-pointer"
                        title="Klik untuk melihat foto profil ukuran penuh"
                      >
                        <img
                          src={studentPhoto}
                          alt={studentName}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-200"
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                          <Eye className="w-3.5 h-3.5 text-white drop-shadow" />
                        </div>
                      </button>

                      <div className="min-w-0">
                        <span className="font-bold text-slate-900 text-xs block truncate">
                          {studentName}
                        </span>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                            {className}
                          </span>
                        </div>
                      </div>
                    </div>

                    <span
                      className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-black shrink-0 ${
                        rec.status === 'HADIR'
                          ? 'bg-emerald-100 text-emerald-800'
                          : rec.status === 'TERLAMBAT'
                          ? 'bg-amber-100 text-amber-800'
                          : rec.status === 'ALPHA'
                          ? 'bg-rose-100 text-rose-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}
                    >
                      {rec.status}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-600 pt-2 border-t border-slate-200/60">
                    <span>📅 {rec.date}</span>
                    <span className="font-mono">⏰ {rec.time} WIB</span>
                    {rec.latitude && rec.longitude ? (
                      <a
                        href={`https://www.google.com/maps?q=${rec.latitude},${rec.longitude}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-emerald-700 hover:text-emerald-900 font-bold hover:underline"
                      >
                        <span>📍 {rec.distance_meters != null ? `${rec.distance_meters}m` : 'Maps'}</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    ) : (
                      <span>📍 {rec.distance_meters != null ? `${rec.distance_meters}m` : '-'}</span>
                    )}

                    {rec.photo_url && (
                      <button
                        type="button"
                        onClick={() =>
                          setPreviewPhotoData({
                            url: rec.photo_url || '',
                            title: 'Bukti Absensi (Selfie)',
                            studentName: studentName,
                            className: className,
                            username: studentUser,
                            statusBadge: rec.status,
                            timestamp: `${rec.date} ${rec.time} WIB`,
                            distanceMeters: rec.distance_meters,
                            notes: rec.notes,
                            isProfilePhoto: false,
                          })
                        }
                        className="inline-flex items-center gap-1 text-emerald-700 hover:text-emerald-900 font-bold cursor-pointer"
                        title="Lihat foto bukti swafoto absensi"
                      >
                        <Camera className="w-3 h-3 text-emerald-600" />
                        <span>Foto</span>
                      </button>
                    )}
                  </div>

                  {rec.notes && (
                    <div className="text-[11px] bg-white p-2 rounded-xl border border-slate-200/60 text-slate-600">
                      <span className="font-semibold text-slate-700">Ket:</span> {rec.notes}
                    </div>
                  )}

                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => openEditModal(rec)}
                      className="flex-1 min-h-[44px] py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Edit3 className="w-4 h-4 text-emerald-600" />
                      <span>Ubah</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => triggerDeleteSingle(rec)}
                      className="min-w-[44px] min-h-[44px] p-2 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200/80 rounded-xl transition-colors cursor-pointer shrink-0 flex items-center justify-center"
                      title="Hapus riwayat"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* ── DESKTOP VIEW: Full Data Table (md and up) ── */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-bold border-b border-slate-100">
              <tr>
                <th className="py-3.5 px-4 w-12 text-center">
                  <button
                    type="button"
                    onClick={handleSelectAll}
                    disabled={filtered.length === 0}
                    className="p-1 hover:text-slate-800 transition-colors cursor-pointer disabled:opacity-40"
                    title={isAllSelected ? 'Batal pilih semua' : 'Pilih semua di halaman ini'}
                  >
                    {isAllSelected ? (
                      <CheckSquare className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <Square className="w-4 h-4 text-slate-400" />
                    )}
                  </button>
                </th>
                <th className="py-3.5 px-3 w-10 text-center text-slate-500 font-bold">No.</th>
                <th className="py-3.5 px-4">Tanggal & Waktu</th>
                <th className="py-3.5 px-4">Siswa</th>
                <th className="py-3.5 px-4">Kelas</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4">Lokasi & GPS</th>
                <th className="py-3.5 px-4">Keterangan / Alasan</th>
                <th className="py-3.5 px-5 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {isLoading ? (
                <tr>
                  <td colSpan={9} className="py-10 text-center text-slate-400">
                    Memuat riwayat absensi...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    Tidak ada riwayat absensi yang sesuai dengan filter.
                  </td>
                </tr>
              ) : (
                filtered.map((rec, idx) => {
                  const isSelected = selectedIds.has(rec.id);
                  const className = rec.class_name || rec.student?.class_name || '-';
                  const studentName = rec.student?.full_name || rec.student_name || 'Siswa';
                  const studentUser = rec.student?.username || '';
                  const studentPhoto = rec.student?.profile_photo_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${studentUser || studentName}`;

                  return (
                    <tr
                      key={rec.id}
                      className={`transition-colors ${
                        isSelected ? 'bg-emerald-50/50' : 'hover:bg-slate-50/70'
                      }`}
                    >
                      {/* Selection Checkbox */}
                      <td className="py-3.5 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => handleToggleSelect(rec.id)}
                          className="p-1 cursor-pointer transition-transform active:scale-90"
                        >
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-emerald-600" />
                          ) : (
                            <Square className="w-4 h-4 text-slate-300 hover:text-slate-500" />
                          )}
                        </button>
                      </td>

                      {/* Row Number */}
                      <td className="py-3.5 px-3 text-center font-bold text-slate-400">
                        {idx + 1}
                      </td>

                      {/* Date & Time */}
                      <td className="py-3.5 px-4">
                        <span className="font-bold text-slate-900 block">{rec.date}</span>
                        <span className="text-[10px] text-slate-400 font-mono">{rec.time} WIB</span>
                      </td>

                      {/* Student */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() =>
                              setPreviewPhotoData({
                                url: studentPhoto,
                                title: 'Foto Profil Siswa',
                                studentName: studentName,
                                className: className,
                                username: studentUser,
                                isProfilePhoto: true,
                              })
                            }
                            className="group relative w-8 h-8 rounded-lg overflow-hidden bg-slate-100 shrink-0 border border-slate-200 hover:border-emerald-500 hover:ring-2 hover:ring-emerald-400/50 transition-all cursor-pointer"
                            title="Klik untuk melihat foto profil ukuran penuh"
                          >
                            <img
                              src={studentPhoto}
                              alt={studentName}
                              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-200"
                            />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                              <Eye className="w-3.5 h-3.5 text-white drop-shadow" />
                            </div>
                          </button>
                          <div>
                            <span className="font-bold text-slate-900 block">{studentName}</span>
                            {studentUser && (
                              <span className="text-[10px] text-slate-400 font-mono">@{studentUser}</span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Class */}
                      <td className="py-3.5 px-4">
                        <span className="inline-block px-2 py-0.5 rounded-md text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/50">
                          {className}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <span
                            className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-black ${
                              rec.status === 'HADIR'
                                ? 'bg-emerald-100 text-emerald-800'
                                : rec.status === 'TERLAMBAT'
                                ? 'bg-amber-100 text-amber-800'
                                : rec.status === 'ALPHA'
                                ? 'bg-rose-100 text-rose-800'
                                : 'bg-blue-100 text-blue-800'
                            }`}
                          >
                            {rec.status}
                          </span>

                          {rec.photo_url && (
                            <button
                              type="button"
                              onClick={() =>
                                setPreviewPhotoData({
                                  url: rec.photo_url || '',
                                  title: 'Bukti Absensi (Selfie)',
                                  studentName: studentName,
                                  className: className,
                                  username: studentUser,
                                  statusBadge: rec.status,
                                  timestamp: `${rec.date} ${rec.time} WIB`,
                                  distanceMeters: rec.distance_meters,
                                  notes: rec.notes,
                                  isProfilePhoto: false,
                                })
                              }
                              className="p-1 rounded-md bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 transition-colors cursor-pointer"
                              title="Lihat foto bukti swafoto absensi"
                            >
                              <Camera className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>

                      {/* Lokasi & GPS */}
                      <td className="py-3.5 px-4 text-slate-600">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold ${
                              rec.is_valid_location === false
                                ? 'bg-rose-100 text-rose-800'
                                : 'bg-emerald-100 text-emerald-800'
                            }`}
                          >
                            {rec.distance_meters != null ? `${rec.distance_meters}m` : '-'}
                          </span>
                          {rec.latitude && rec.longitude && (
                            <a
                              href={`https://www.google.com/maps?q=${rec.latitude},${rec.longitude}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 hover:text-emerald-900 hover:underline bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 transition-colors"
                              title="Buka lokasi siswa di Google Maps"
                            >
                              <span>Maps</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                        </div>
                      </td>

                      {/* Notes */}
                      <td className="py-3.5 px-4 text-[11px] text-slate-500 max-w-xs truncate">
                        {rec.notes || '-'}
                      </td>

                      {/* Action Buttons */}
                      <td className="py-3.5 px-5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => openEditModal(rec)}
                            className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold inline-flex items-center gap-1 transition-colors cursor-pointer"
                            title="Ubah status kehadiran"
                          >
                            <Edit3 className="w-3.5 h-3.5 text-emerald-600" />
                            <span className="hidden sm:inline">Ubah</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => triggerDeleteSingle(rec)}
                            className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 hover:text-rose-700 rounded-xl transition-colors cursor-pointer"
                            title="Hapus data absensi ini"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* EDIT STATUS MODAL: Mobile-safe Scrollable */}
      {selectedRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3.5 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-md max-h-[90vh] overflow-y-auto bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-emerald-50 text-emerald-700 rounded-xl">
                  <Edit3 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Sesuaikan Status Absensi</h3>
                  <p className="text-[11px] text-slate-400">
                    {selectedRecord.student?.full_name || selectedRecord.student_name}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedRecord(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveStatus} className="p-5 sm:p-6 space-y-4">
              {modalError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                  <span>{modalError}</span>
                </div>
              )}

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Pilih Status Baru
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {(['HADIR', 'TERLAMBAT', 'IZIN', 'SAKIT', 'ALPHA'] as AttendanceStatus[]).map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setNewStatus(st)}
                      className={`p-2.5 rounded-xl border text-xs font-black transition-all cursor-pointer ${
                        newStatus === st
                          ? 'border-emerald-500 bg-emerald-50 text-emerald-800 ring-2 ring-emerald-500/20'
                          : 'border-slate-200 bg-slate-50/50 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Alasan / Keterangan Penyesuaian
                </label>
                <textarea
                  required
                  rows={3}
                  value={editReason}
                  onChange={(e) => setEditReason(e.target.value)}
                  placeholder="Contoh: Siswa membawa surat dokter resmi / Dispensasi lomba..."
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setSelectedRecord(null)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{isSaving ? 'Menyimpan...' : 'Simpan Perubahan'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      <ConfirmModal
        isOpen={deleteModal.isOpen}
        isDestructive={true}
        title={
          deleteModal.type === 'all'
            ? 'Hapus Semua Data Absensi'
            : deleteModal.type === 'bulk'
            ? `Hapus ${deleteModal.count} Data Absensi Terpilih`
            : 'Hapus Rekaman Absensi'
        }
        message={
          deleteModal.type === 'all'
            ? `Apakah Anda yakin ingin menghapus SELURUH rekaman data absensi (${deleteModal.count} data)? Tindakan ini permanen dan tidak dapat dibatalkan.`
            : deleteModal.type === 'bulk'
            ? `Apakah Anda yakin ingin menghapus ${deleteModal.count} data absensi yang telah Anda centang? Tindakan ini permanen.`
            : `Apakah Anda yakin ingin menghapus rekaman absensi untuk ${deleteModal.targetName}? Tindakan ini permanen.`
        }
        confirmLabel={isDeleting ? 'Menghapus...' : 'Ya, Hapus Permanen'}
        cancelLabel="Batal"
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteModal({ isOpen: false, type: 'single' })}
      />

      {/* PHOTO PREVIEW MODAL */}
      <PhotoPreviewModal
        isOpen={Boolean(previewPhotoData)}
        onClose={() => setPreviewPhotoData(null)}
        data={previewPhotoData}
      />

    </div>
  );
};
