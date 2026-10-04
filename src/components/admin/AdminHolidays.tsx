import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api.js';
import { Holiday } from '../../types.js';
import { 
  CalendarDays, 
  Plus, 
  Trash2, 
  AlertTriangle, 
  Calendar, 
  ShieldAlert, 
  CheckCircle2, 
  X 
} from 'lucide-react';
import { ConfirmModal } from '../common/ConfirmModal.js';

export const AdminHolidays: React.FC = () => {
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [fridayRule, setFridayRule] = useState<string>('Setiap hari Jumat otomatis merupakan hari libur madrasah.');
  const [isLoading, setIsLoading] = useState(true);

  // Add holiday form state
  const [showAddModal, setShowAddModal] = useState(false);
  const [newStartDate, setNewStartDate] = useState('');
  const [newEndDate, setNewEndDate] = useState('');
  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [isRecurring, setIsRecurring] = useState(false);
  const [fridayWarning, setFridayWarning] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Delete state
  const [deleteTarget, setDeleteTarget] = useState<Holiday | null>(null);

  useEffect(() => {
    fetchHolidays();
  }, []);

  const fetchHolidays = async () => {
    setIsLoading(true);
    try {
      const res = await api.get<{
        success: boolean;
        friday_rule: string;
        holidays: Holiday[];
      }>('/holidays');

      if (res.success) {
        setHolidays(res.holidays || []);
        if (res.friday_rule) setFridayRule(res.friday_rule);
      }
    } catch (err) {
      console.error('Failed to load holidays', err);
    } finally {
      setIsLoading(false);
    }
  };

  const checkFridayInRange = (startStr: string, endStr: string) => {
    if (!startStr) {
      setFridayWarning(null);
      return;
    }
    const d1 = new Date(startStr + 'T00:00:00');
    const d2 = endStr ? new Date(endStr + 'T00:00:00') : d1;
    if (isNaN(d1.getTime()) || isNaN(d2.getTime()) || d2 < d1) {
      setFridayWarning(null);
      return;
    }

    let hasFriday = false;
    const cur = new Date(d1);
    while (cur <= d2) {
      if (cur.getDay() === 5) {
        hasFriday = true;
        break;
      }
      cur.setDate(cur.getDate() + 1);
    }

    if (hasFriday) {
      if (startStr === (endStr || startStr)) {
        setFridayWarning('Peringatan: Tanggal yang Anda pilih jatuh pada hari Jumat. Hari Jumat sudah secara otomatis diatur sebagai hari libur madrasah.');
      } else {
        setFridayWarning('Catatan: Rentang tanggal libur yang Anda tentukan mencakup hari Jumat (hari libur mingguan madrasah).');
      }
    } else {
      setFridayWarning(null);
    }
  };

  const handleStartDateChange = (val: string) => {
    setNewStartDate(val);
    const targetEnd = (!newEndDate || newEndDate < val) ? val : newEndDate;
    if (!newEndDate || newEndDate < val) {
      setNewEndDate(val);
    }
    checkFridayInRange(val, targetEnd);
  };

  const handleEndDateChange = (val: string) => {
    setNewEndDate(val);
    checkFridayInRange(newStartDate, val);
  };

  const getDurationCount = (): number => {
    if (!newStartDate) return 0;
    const d1 = new Date(newStartDate + 'T00:00:00');
    const d2 = newEndDate ? new Date(newEndDate + 'T00:00:00') : d1;
    if (isNaN(d1.getTime()) || isNaN(d2.getTime()) || d2 < d1) return 1;
    return Math.round((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  };

  const handleAddHoliday = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStartDate || !newName.trim()) {
      setErrorMessage('Tanggal mulai dan nama hari libur wajib diisi.');
      return;
    }

    const finalEndDate = newEndDate && newEndDate >= newStartDate ? newEndDate : newStartDate;

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const res = await api.post<{
        success: boolean;
        message: string;
        warning?: string;
        holiday: Holiday;
      }>('/holidays', {
        date: newStartDate,
        end_date: finalEndDate !== newStartDate ? finalEndDate : null,
        name: newName.trim(),
        description: newDescription.trim(),
        is_recurring: isRecurring,
      });

      if (res.success && res.holiday) {
        setHolidays((prev) => [...prev, res.holiday]);
        setShowAddModal(false);
        setNewStartDate('');
        setNewEndDate('');
        setNewName('');
        setNewDescription('');
        setIsRecurring(false);
        setFridayWarning(null);
      } else {
        setErrorMessage(res.message || 'Gagal menambahkan hari libur.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Terjadi kendala saat menambahkan hari libur.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;

    try {
      const res = await api.delete<{ success: boolean }>(`/holidays/${deleteTarget.id}`);
      if (res.success) {
        setHolidays((prev) => prev.filter((h) => h.id !== deleteTarget.id));
      }
    } catch (err) {
      alert('Gagal menghapus hari libur.');
    } finally {
      setDeleteTarget(null);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider block">
            Kalender Akademik
          </span>
          <h1 className="text-xl font-black text-slate-900 mt-0.5">
            Manajemen Hari Libur Sekolah
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Kelola hari libur nasional dan ketentuan libur mingguan madrasah
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setShowAddModal(true);
            setFridayWarning(null);
            setErrorMessage(null);
            setNewDescription('');
          }}
          className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold inline-flex items-center gap-2 shadow-xs transition-colors cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Tambah Hari Libur</span>
        </button>
      </div>

      {/* Friday Special Notification Banner */}
      <div className="p-5 rounded-3xl bg-amber-50 border border-amber-200/80 text-amber-900 flex items-start gap-4">
        <div className="p-2.5 rounded-2xl bg-amber-100 text-amber-800 shrink-0 mt-0.5">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <div className="space-y-1">
          <h3 className="font-bold text-sm text-amber-950">
            Aturan Baku: Hari Jumat Otomatis Hari Libur Mingguan
          </h3>
          <p className="text-xs text-amber-800 leading-relaxed">
            {fridayRule} Pada hari Jumat, scanner absensi siswa secara otomatis dinonaktifkan dan KBM ditiadakan. Hari Minggu tetap merupakan hari sekolah aktif dan kegiatan absensi berlangsung normal seperti biasa, kecuali jika tanggal tersebut secara khusus ditetapkan sebagai hari libur nasional.
          </p>
        </div>
      </div>

      {/* Holiday List Card */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-100">
          <h3 className="font-black text-sm text-slate-900">
            Daftar Hari Libur Terdaftar
          </h3>
        </div>

        <div className="divide-y divide-slate-100">
          {isLoading ? (
            <div className="p-8 text-center text-slate-400 text-xs">
              Memuat data hari libur...
            </div>
          ) : holidays.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs">
              Belum ada data hari libur kustom yang ditambahkan.
            </div>
          ) : (
            holidays.map((h) => {
              const d1 = new Date(h.date + 'T00:00:00');
              const d2 = h.end_date ? new Date(h.end_date + 'T00:00:00') : d1;
              const options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' };
              const str1 = !isNaN(d1.getTime()) ? d1.toLocaleDateString('id-ID', options) : h.date;
              const isRange = Boolean(h.end_date && h.end_date !== h.date);
              const str2 = isRange && !isNaN(d2.getTime()) ? d2.toLocaleDateString('id-ID', options) : '';
              const diffDays = isRange ? Math.round((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24)) + 1 : 1;

              return (
                <div
                  key={h.id}
                  className="p-4 sm:p-5 flex items-center justify-between hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center gap-3.5">
                    <div className="p-2.5 rounded-2xl bg-slate-100 text-slate-700">
                      <Calendar className="w-5 h-5 text-emerald-600" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-xs sm:text-sm text-slate-900">
                          {h.name}
                        </h4>
                        <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 font-bold text-[10px] border border-emerald-200/80">
                          {diffDays} Hari
                        </span>
                      </div>
                      {h.description && (
                        <p className="text-xs text-slate-600 mt-1 line-clamp-2 leading-relaxed">
                          {h.description}
                        </p>
                      )}
                      <span className="text-[11px] text-slate-500 font-mono mt-0.5 block">
                        {isRange ? `${str1} — ${str2}` : str1} {h.is_recurring && '• (Berulang Tiap Tahun)'}
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setDeleteTarget(h)}
                    className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                    title="Hapus Hari Libur"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ADD HOLIDAY MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h3 className="font-bold text-slate-800 text-sm">
                Tambah Hari Libur Sekolah
              </h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddHoliday} className="p-6 space-y-4">
              {errorMessage && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl">
                  {errorMessage}
                </div>
              )}

              {fridayWarning && (
                <div className="p-3.5 bg-amber-50 border border-amber-200 text-amber-900 text-xs rounded-xl flex items-start gap-2.5">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <span>{fridayWarning}</span>
                </div>
              )}

              {/* 2 Kalender: Tanggal Mulai dan Tanggal Selesai */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Kalender 1: Tanggal Mulai */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Tanggal Mulai
                  </label>
                  <div className="relative flex items-center">
                    <Calendar className="w-4 h-4 text-emerald-600 dark:text-emerald-400 absolute left-3 pointer-events-none" />
                    <input
                      type="date"
                      required
                      value={newStartDate}
                      onChange={(e) => handleStartDateChange(e.target.value)}
                      className="w-full pl-9 pr-3 py-2.5 bg-slate-50 dark:bg-[#070b14] border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-medium text-slate-800 dark:text-white focus:ring-2 focus:ring-emerald-500 [color-scheme:light] dark:[color-scheme:dark]"
                    />
                  </div>
                </div>

                {/* Kalender 2: Tanggal Selesai */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Tanggal Selesai
                  </label>
                  <div className="relative flex items-center">
                    <Calendar className="w-4 h-4 text-emerald-600 dark:text-emerald-400 absolute left-3 pointer-events-none" />
                    <input
                      type="date"
                      required
                      min={newStartDate || undefined}
                      value={newEndDate}
                      onChange={(e) => handleEndDateChange(e.target.value)}
                      className="w-full pl-9 pr-3 py-2.5 bg-slate-50 dark:bg-[#070b14] border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-medium text-slate-800 dark:text-white focus:ring-2 focus:ring-emerald-500 [color-scheme:light] dark:[color-scheme:dark]"
                    />
                  </div>
                </div>
              </div>

              {/* Ringkasan Durasi Hari Libur */}
              {newStartDate && (
                <div className="px-3.5 py-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800/60 flex items-center justify-between text-xs text-emerald-800 dark:text-emerald-300">
                  <span className="font-semibold flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span>Total Durasi Libur:</span>
                  </span>
                  <span className="font-bold text-emerald-900 dark:text-emerald-200">
                    {getDurationCount()} Hari {newEndDate && newEndDate !== newStartDate ? `(${newStartDate} s/d ${newEndDate})` : `(${newStartDate})`}
                  </span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nama / Judul Hari Libur
                </label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Contoh: Hari Guru Nasional / Libur Semester"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Deskripsi / Pesan Khusus Libur
                </label>
                <textarea
                  rows={3}
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="Contoh: Selamat menikmati libur Hari Guru Nasional bersama keluarga. Tetap jaga kesehatan dan rajin mengulang pelajaran di rumah!"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:ring-2 focus:ring-emerald-500 resize-none leading-relaxed"
                />
                <span className="text-[11px] text-slate-400 mt-1 block">
                  Deskripsi ini akan otomatis tampil di layar Beranda Siswa pada saat hari libur berlangsung.
                </span>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="recurringCheck"
                  checked={isRecurring}
                  onChange={(e) => setIsRecurring(e.target.checked)}
                  className="w-4 h-4 text-emerald-600 rounded-md border-slate-300 focus:ring-emerald-500"
                />
                <label htmlFor="recurringCheck" className="text-xs font-medium text-slate-700">
                  Berulang secara otomatis setiap tahun
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs transition-colors cursor-pointer"
                >
                  {isSubmitting ? 'Menyimpan...' : 'Simpan Hari Libur'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRM */}
      {deleteTarget && (
        <ConfirmModal
          isOpen={Boolean(deleteTarget)}
          title="Hapus Hari Libur"
          message={`Apakah Anda yakin ingin menghapus hari libur "${deleteTarget.name}" (${deleteTarget.date})? Sistem absensi akan kembali dibuka pada tanggal tersebut.`}
          confirmLabel="Ya, Hapus Libur"
          isDestructive={true}
          onConfirm={handleConfirmDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}

    </div>
  );
};
