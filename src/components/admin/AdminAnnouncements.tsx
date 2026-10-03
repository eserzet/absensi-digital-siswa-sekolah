import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api.js';
import { Announcement, AnnouncementPriority } from '../../types.js';
import { 
  Megaphone, 
  Plus, 
  Trash2, 
  X, 
  CheckCircle2, 
  AlertCircle, 
  Calendar, 
  Eye, 
  EyeOff,
  Edit3
} from 'lucide-react';
import { ConfirmModal } from '../common/ConfirmModal.js';

export const AdminAnnouncements: React.FC = () => {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modal create
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [priority, setPriority] = useState<AnnouncementPriority>('normal');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Modal edit
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [editPriority, setEditPriority] = useState<AnnouncementPriority>('normal');
  const [isUpdating, setIsUpdating] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Delete
  const [deleteTarget, setDeleteTarget] = useState<Announcement | null>(null);

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const fetchAnnouncements = async () => {
    setIsLoading(true);
    try {
      const res = await api.get<{
        success: boolean;
        announcements: Announcement[];
      }>('/announcements');

      if (res.success) {
        setAnnouncements(res.announcements || []);
      }
    } catch (err) {
      console.error('Failed to load announcements', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      setErrorMessage('Judul dan isi pengumuman wajib diisi.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const res = await api.post<{
        success: boolean;
        message: string;
        announcement: Announcement;
      }>('/announcements', {
        title: title.trim(),
        content: content.trim(),
        priority,
      });

      if (res.success && res.announcement) {
        setAnnouncements((prev) => [res.announcement, ...prev]);
        setShowCreateModal(false);
        setTitle('');
        setContent('');
        setPriority('normal');
      } else {
        setErrorMessage(res.message || 'Gagal menerbitkan pengumuman.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Terjadi kendala saat menerbitkan pengumuman.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const openEditModal = (a: Announcement) => {
    setEditingAnnouncement(a);
    setEditTitle(a.title);
    setEditContent(a.content);
    setEditPriority(a.priority === 'important' || (a.priority as string) === 'penting' ? 'important' : 'normal');
    setEditError(null);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAnnouncement) return;
    if (!editTitle.trim() || !editContent.trim()) {
      setEditError('Judul dan isi pengumuman wajib diisi.');
      return;
    }

    setIsUpdating(true);
    setEditError(null);

    try {
      const res = await api.put<{
        success: boolean;
        message: string;
        announcement: Announcement;
      }>(`/announcements/${editingAnnouncement.id}`, {
        title: editTitle.trim(),
        content: editContent.trim(),
        priority: editPriority,
      });

      if (res.success && res.announcement) {
        setAnnouncements((prev) =>
          prev.map((item) => (item.id === editingAnnouncement.id ? res.announcement : item))
        );
        setEditingAnnouncement(null);
      } else {
        setEditError(res.message || 'Gagal memperbarui pengumuman.');
      }
    } catch (err: any) {
      setEditError(err.message || 'Terjadi kesalahan saat memperbarui pengumuman.');
    } finally {
      setIsUpdating(false);
    }
  };

  // Toast feedback
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const handleToggleActive = async (a: Announcement) => {
    const nextStatus = !a.is_active;
    setTogglingId(a.id);
    try {
      const res = await api.put<{ success: boolean; announcement?: Announcement; message?: string }>(
        `/announcements/${a.id}`,
        { 
          is_active: nextStatus,
          status: nextStatus ? 'published' : 'draft',
        }
      );

      if (res.success) {
        setAnnouncements((prev) =>
          prev.map((item) => (item.id === a.id ? { ...item, is_active: nextStatus, status: nextStatus ? 'published' : 'draft' } : item))
        );
        setToastMessage({
          text: `Status pengumuman "${a.title}" berhasil diubah menjadi ${nextStatus ? 'Aktif (Diterbitkan)' : 'Nonaktif (Draft)'}.`,
          type: 'success',
        });
      } else {
        setToastMessage({
          text: res.message || 'Gagal mengubah status pengumuman.',
          type: 'error',
        });
      }
    } catch (err: any) {
      setToastMessage({
        text: err?.message || 'Gagal mengubah status pengumuman.',
        type: 'error',
      });
    } finally {
      setTogglingId(null);
      setTimeout(() => setToastMessage(null), 4000);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;

    try {
      const res = await api.delete<{ success: boolean }>(`/announcements/${deleteTarget.id}`);
      if (res.success) {
        setAnnouncements((prev) => prev.filter((a) => a.id !== deleteTarget.id));
      }
    } catch (err) {
      alert('Gagal menghapus pengumuman.');
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
            Pemberitahuan Sekolah
          </span>
          <h1 className="text-xl font-black text-slate-900 mt-0.5">
            Manajemen Pengumuman Siswa
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Publikasikan informasi penting, agenda madrasah, dan pengumuman kesiswaan
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setShowCreateModal(true);
            setErrorMessage(null);
          }}
          className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold inline-flex items-center gap-2 shadow-xs transition-colors cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Buat Pengumuman Baru</span>
        </button>
      </div>

      {/* Toast Feedback */}
      {toastMessage && (
        <div
          className={`p-4 rounded-2xl border text-xs font-bold flex items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2 ${
            toastMessage.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          <div className="flex items-center gap-2">
            {toastMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{toastMessage.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setToastMessage(null)}
            className="text-slate-400 hover:text-slate-600 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Announcements List */}
      <div className="space-y-3">
        {isLoading ? (
          <div className="bg-white rounded-3xl p-10 text-center text-slate-400 text-xs">
            Memuat pengumuman...
          </div>
        ) : announcements.length === 0 ? (
          <div className="bg-white rounded-3xl p-10 text-center text-slate-400 text-xs">
            Belum ada pengumuman yang diterbitkan.
          </div>
        ) : (
          announcements.map((a) => (
            <div
              key={a.id}
              className={`bg-white rounded-3xl p-5 sm:p-6 border transition-all shadow-xs ${
                a.is_active ? 'border-slate-100' : 'border-slate-200 opacity-60 bg-slate-50/50'
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full ${
                        a.priority === 'important' || (a.priority as string) === 'penting'
                          ? 'bg-rose-100 text-rose-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}
                    >
                      {a.priority === 'important' || (a.priority as string) === 'penting' ? 'Penting' : 'Biasa'}
                    </span>
                    <span className="text-xs text-slate-400 flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      {a.date}
                    </span>
                  </div>

                  <h3 className="text-base font-black text-slate-900">
                    {a.title}
                  </h3>

                  <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-line pt-1">
                    {a.content}
                  </p>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => openEditModal(a)}
                    className="p-2 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-colors cursor-pointer"
                    title="Ubah / Edit Pengumuman"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    disabled={togglingId === a.id}
                    onClick={() => handleToggleActive(a)}
                    className={`p-2 rounded-xl transition-all cursor-pointer ${
                      togglingId === a.id ? 'opacity-50 cursor-wait' : ''
                    } ${
                      a.is_active
                        ? 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'
                        : 'bg-slate-200 text-slate-500 hover:bg-slate-300'
                    }`}
                    title={a.is_active ? 'Sembunyikan Pengumuman (Jadikan Draft)' : 'Tampilkan Pengumuman (Publikasikan)'}
                  >
                    {a.is_active ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                  </button>

                  <button
                    type="button"
                    onClick={() => setDeleteTarget(a)}
                    className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                    title="Hapus Pengumuman"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* CREATE MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4.5 border-b border-slate-100">
              <h3 className="font-bold text-slate-800 text-sm">
                Terbitkan Pengumuman Baru
              </h3>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="p-6 space-y-4">
              {errorMessage && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl">
                  {errorMessage}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Judul Pengumuman
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Contoh: Jadwal Penilaian Akhir Semester (PAS)"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Prioritas
                </label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as AnnouncementPriority)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                >
                  <option value="normal">Biasa (Normal)</option>
                  <option value="important">Penting / Pengumuman Mendesak</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Isi / Detail Pengumuman
                </label>
                <textarea
                  rows={5}
                  required
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Tuliskan isi pengumuman lengkap untuk seluruh siswa..."
                  className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs transition-colors cursor-pointer"
                >
                  {isSubmitting ? 'Menerbitkan...' : 'Terbitkan Pengumuman'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT MODAL */}
      {editingAnnouncement && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4.5 border-b border-slate-100">
              <h3 className="font-bold text-slate-800 text-sm">
                Ubah / Edit Pengumuman
              </h3>
              <button
                type="button"
                onClick={() => setEditingAnnouncement(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUpdate} className="p-6 space-y-4">
              {editError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl">
                  {editError}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Judul Pengumuman
                </label>
                <input
                  type="text"
                  required
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  placeholder="Judul pengumuman..."
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Prioritas
                </label>
                <select
                  value={editPriority}
                  onChange={(e) => setEditPriority(e.target.value as AnnouncementPriority)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                >
                  <option value="normal">Biasa (Normal)</option>
                  <option value="important">Penting / Pengumuman Mendesak</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Isi / Detail Pengumuman
                </label>
                <textarea
                  rows={5}
                  required
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  placeholder="Tuliskan isi pengumuman lengkap..."
                  className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingAnnouncement(null)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isUpdating}
                  className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs transition-colors cursor-pointer"
                >
                  {isUpdating ? 'Menyimpan...' : 'Simpan Perubahan'}
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
          title="Hapus Pengumuman"
          message={`Apakah Anda yakin ingin menghapus pengumuman "${deleteTarget.title}"? Pengumuman ini tidak akan lagi tampil di beranda siswa.`}
          confirmLabel="Ya, Hapus Pengumuman"
          isDestructive={true}
          onConfirm={handleConfirmDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}

    </div>
  );
};
