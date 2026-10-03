import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api.js';
import { Student, Gender } from '../../types.js';
import { 
  Users, 
  Search, 
  Edit3, 
  KeyRound, 
  UserCheck, 
  UserX, 
  Trash2,
  CheckCircle2,
  X, 
  Save, 
  AlertCircle,
  Phone,
  GraduationCap,
  UserPlus,
  Eye,
  EyeOff,
  Copy
} from 'lucide-react';
import { ConfirmModal } from '../common/ConfirmModal.js';

const CLASS_OPTIONS = [
  'all',
  'X (10)',
  'XI (11)',
  'XII (12)',
];

export const AdminUserManagement: React.FC = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClass, setSelectedClass] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [isLoading, setIsLoading] = useState(true);
  const [actionNotice, setActionNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Edit Student Modal
  const [editStudent, setEditStudent] = useState<Student | null>(null);
  const [editFullName, setEditFullName] = useState('');
  const [editClass, setEditClass] = useState('');
  const [editGender, setEditGender] = useState<Gender>('Laki-laki');
  const [editWhatsapp, setEditWhatsapp] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Reset Password Modal
  const [resetStudent, setResetStudent] = useState<Student | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);

  // View Password State
  const [viewPasswordStudent, setViewPasswordStudent] = useState<Student | null>(null);
  const [retrievedAuth, setRetrievedAuth] = useState<{ username: string; password: string } | null>(null);
  const [isLoadingPassword, setIsLoadingPassword] = useState(false);
  const [showPlainPassword, setShowPlainPassword] = useState(true);
  const [copySuccess, setCopySuccess] = useState(false);

  // Toggle Status Confirm
  const [toggleStudent, setToggleStudent] = useState<Student | null>(null);

  // Delete Student Confirm
  const [deleteStudent, setDeleteStudent] = useState<Student | null>(null);
  const [isDeletingStudent, setIsDeletingStudent] = useState(false);

  // Add Student Modal
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addFullName, setAddFullName] = useState('');
  const [addClassName, setAddClassName] = useState('X RPL 1');
  const [addGender, setAddGender] = useState<Gender>('Laki-laki');
  const [addWhatsapp, setAddWhatsapp] = useState('');
  const [addUsername, setAddUsername] = useState('');
  const [addPassword, setAddPassword] = useState('123456');
  const [isSavingNewStudent, setIsSavingNewStudent] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  const resetAddForm = () => {
    setAddFullName('');
    setAddClassName('X RPL 1');
    setAddGender('Laki-laki');
    setAddWhatsapp('');
    setAddUsername('');
    setAddPassword('123456');
    setAddError(null);
  };

  const handleCreateStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddError(null);

    if (!addFullName.trim() || !addWhatsapp.trim() || !addUsername.trim() || !addPassword) {
      setAddError('Semua kolom data siswa wajib diisi.');
      return;
    }

    const cleanUsername = addUsername.trim().toLowerCase().replace(/\s+/g, '_');

    setIsSavingNewStudent(true);
    try {
      const res = await api.post<{ success: boolean; message: string; student: Student }>('/students', {
        full_name: addFullName.trim(),
        class_name: addClassName,
        gender: addGender,
        whatsapp: addWhatsapp.trim(),
        username: cleanUsername,
        password: addPassword,
      });

      if (res.success && res.student) {
        setStudents((prev) => [res.student, ...prev]);
        setIsAddModalOpen(false);
        resetAddForm();
      } else {
        setAddError(res.message || 'Gagal menambahkan siswa.');
      }
    } catch (err: any) {
      setAddError(err.message || 'Terjadi kesalahan saat menambahkan data siswa.');
    } finally {
      setIsSavingNewStudent(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, [selectedClass, selectedStatus]);

  const fetchStudents = async () => {
    setIsLoading(true);
    try {
      const url = `/students?class_name=${selectedClass}&status=${selectedStatus}`;
      const res = await api.get<{
        success: boolean;
        students: Student[];
      }>(url);

      if (res.success) {
        setStudents(res.students || []);
      }
    } catch (err) {
      console.error('Failed to load students', err);
    } finally {
      setIsLoading(false);
    }
  };

  const openEdit = (s: Student) => {
    setEditStudent(s);
    setEditFullName(s.full_name || '');
    setEditClass(s.class_name || '');
    setEditGender(s.gender || 'Laki-laki');
    setEditWhatsapp(s.whatsapp || '');
  };
  const openEditModal = openEdit;

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editStudent) return;

    setIsSavingEdit(true);
    try {
      const res = await api.put<{
        success: boolean;
        message: string;
        student: Student;
      }>(`/students/${editStudent.id}`, {
        full_name: editFullName.trim(),
        class_name: editClass,
        gender: editGender,
        whatsapp: editWhatsapp.trim(),
      });

      if (res.success && res.student) {
        setStudents((prev) =>
          prev.map((s) => (s.id === editStudent.id ? res.student : s))
        );
        setEditStudent(null);
      }
    } catch (err) {
      alert('Gagal menyimpan perubahan siswa.');
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleSavePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetStudent) return;

    if (newPassword.length < 6) {
      alert('Password minimal 6 karakter.');
      return;
    }

    setIsSavingPassword(true);
    try {
      const res = await api.put<{ success: boolean; message: string }>(
        `/students/${resetStudent.id}/reset-password`,
        { new_password: newPassword }
      );

      if (res.success) {
        setPasswordSuccess(res.message);
        setTimeout(() => {
          setResetStudent(null);
          setPasswordSuccess(null);
          setNewPassword('');
        }, 1500);
      }
    } catch (err) {
      alert('Gagal mereset password.');
    } finally {
      setIsSavingPassword(false);
    }
  };

  const handleOpenViewPassword = async (s: Student) => {
    setViewPasswordStudent(s);
    setRetrievedAuth(null);
    setIsLoadingPassword(true);
    setShowPlainPassword(true);
    setCopySuccess(false);

    try {
      const res = await api.get<{ success: boolean; username: string; password: string }>(`/students/${s.id}/password`);
      if (res.success) {
        setRetrievedAuth({ username: res.username, password: res.password });
      } else {
        alert('Gagal mengambil password siswa.');
      }
    } catch (err: any) {
      alert(err.message || 'Gagal mengambil password siswa.');
    } finally {
      setIsLoadingPassword(false);
    }
  };

  const handleCopyPassword = () => {
    if (retrievedAuth?.password) {
      navigator.clipboard.writeText(retrievedAuth.password);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    }
  };

  const handleConfirmToggleStatus = async () => {
    if (!toggleStudent) return;
    const nextStatus = !toggleStudent.is_active;

    try {
      const res = await api.put<{ success: boolean; student: Student }>(
        `/students/${toggleStudent.id}/status`,
        { is_active: nextStatus }
      );

      if (res.success) {
        setStudents((prev) =>
          prev.map((s) => (s.id === toggleStudent.id ? { ...s, is_active: nextStatus } : s))
        );
        setActionNotice({
          type: 'success',
          message: `Status akun siswa ${toggleStudent.full_name} berhasil diubah menjadi ${nextStatus ? 'AKTIF' : 'NONAKTIF'}.`,
        });
        setTimeout(() => setActionNotice(null), 4000);
      }
    } catch (err: any) {
      setActionNotice({
        type: 'error',
        message: err.message || 'Gagal mengubah status akun siswa.',
      });
      setTimeout(() => setActionNotice(null), 4000);
    } finally {
      setToggleStudent(null);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteStudent) return;
    setIsDeletingStudent(true);

    try {
      const res = await api.delete<{ success: boolean; message: string }>(
        `/students/${deleteStudent.id}`
      );

      if (res.success) {
        setStudents((prev) => prev.filter((s) => s.id !== deleteStudent.id));
        setActionNotice({
          type: 'success',
          message: `Data akun siswa ${deleteStudent.full_name} (@${deleteStudent.username}) berhasil dihapus permanen.`,
        });
        setTimeout(() => setActionNotice(null), 4500);
      } else {
        setActionNotice({
          type: 'error',
          message: res.message || 'Gagal menghapus data siswa.',
        });
        setTimeout(() => setActionNotice(null), 4500);
      }
    } catch (err: any) {
      setActionNotice({
        type: 'error',
        message: err.message || 'Terjadi kesalahan saat menghapus data siswa.',
      });
      setTimeout(() => setActionNotice(null), 4500);
    } finally {
      setIsDeletingStudent(false);
      setDeleteStudent(null);
    }
  };

  const filtered = students
    .filter((s) => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        s.full_name.toLowerCase().includes(q) ||
        s.username.toLowerCase().includes(q) ||
        s.class_name.toLowerCase().includes(q) ||
        s.whatsapp.includes(q)
      );
    })
    .sort((a, b) => (a.full_name || '').localeCompare(b.full_name || '', 'id', { sensitivity: 'base' }));

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider block">
            Kelola Akun Siswa
          </span>
          <h1 className="text-xl font-black text-slate-900 mt-0.5">
            Manajemen Data Siswa Terdaftar
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Ubah profil, reset password, nonaktifkan/aktifkan akses, atau hapus akun siswa
          </p>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-2.5">
          <button
            type="button"
            onClick={() => {
              resetAddForm();
              setIsAddModalOpen(true);
            }}
            className="px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 active:scale-95 text-white text-xs font-bold rounded-xl shadow-2xs flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>+ Daftarkan Siswa Baru</span>
          </button>

          <div className="text-xs font-bold px-3.5 py-2.5 bg-emerald-50 text-emerald-800 rounded-xl border border-emerald-200 text-center">
            Total: {students.length} Siswa
          </div>
        </div>
      </div>

      {/* Notification Toast/Banner */}
      {actionNotice && (
        <div
          className={`p-4 rounded-2xl text-xs font-bold flex items-center justify-between border animate-in fade-in duration-200 ${
            actionNotice.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-rose-50 text-rose-800 border-rose-200'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {actionNotice.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{actionNotice.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setActionNotice(null)}
            className="text-slate-400 hover:text-slate-700 p-1 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-5 border border-slate-200/80 shadow-2xs grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari nama, kelas, atau username..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <div>
          <select
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
            className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:ring-2 focus:ring-emerald-500 cursor-pointer"
          >
            <option value="all">Semua Kelas</option>
            {CLASS_OPTIONS.filter((c) => c !== 'all').map((c) => (
              <option key={c} value={c}>
                Kelas {c}
              </option>
            ))}
          </select>
        </div>

        <div>
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:ring-2 focus:ring-emerald-500 cursor-pointer"
          >
            <option value="all">Semua Status Akun</option>
            <option value="active">Akun Aktif</option>
            <option value="inactive">Akun Nonaktif</option>
          </select>
        </div>
      </div>

      {/* Student List: Dual View (Mobile Cards & Desktop Table) */}
      <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-2xs overflow-hidden p-3.5 sm:p-0">
        
        {/* ── MOBILE VIEW: Touch Cards (< md) ── */}
        <div className="block md:hidden space-y-3">
          {isLoading ? (
            <div className="py-10 text-center text-slate-400 text-xs">
              Memuat data siswa...
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-10 text-center text-slate-400 text-xs bg-slate-50 rounded-2xl border border-dashed border-slate-200">
              Tidak ada siswa yang sesuai filter.
            </div>
          ) : (
            filtered.map((s, idx) => (
              <div
                key={s.id}
                className="p-3.5 bg-slate-50/80 hover:bg-slate-100/80 border border-slate-200/90 rounded-2xl space-y-3 transition-colors shadow-2xs"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="w-6 h-6 rounded-lg bg-slate-200/90 text-slate-700 font-black text-[11px] shrink-0 flex items-center justify-center">
                      {idx + 1}
                    </span>
                    <div className="w-11 h-11 rounded-xl overflow-hidden bg-white shrink-0 border border-slate-200 shadow-2xs">
                      <img
                        src={s.profile_photo_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${s.username}`}
                        alt={s.full_name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="min-w-0">
                      <span className="font-bold text-slate-900 text-xs block truncate">
                        {s.full_name}
                      </span>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                          {s.class_name}
                        </span>
                        <span className="inline-block px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-mono font-bold text-[10px] border border-slate-200/80">
                          @{s.username}
                        </span>
                      </div>
                    </div>
                  </div>

                  <span
                    className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                      s.is_active
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-rose-100 text-rose-800'
                    }`}
                  >
                    {s.is_active ? 'Aktif' : 'Nonaktif'}
                  </span>
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-600 pt-2 border-t border-slate-200/60">
                  <span className="text-slate-500 font-medium">
                    {s.gender || 'Laki-laki'}
                  </span>
                  
                  {s.whatsapp ? (
                    <a
                      href={`https://wa.me/${s.whatsapp.replace(/\D/g, '').replace(/^0/, '62')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-mono text-[11px] font-bold"
                    >
                      <Phone className="w-3.5 h-3.5 text-emerald-600" />
                      <span>{s.whatsapp}</span>
                    </a>
                  ) : (
                    <span className="text-slate-400 italic text-[10px]">-</span>
                  )}
                </div>

                {/* Touch Action Toolbar */}
                <div className="grid grid-cols-4 gap-1.5 pt-1">
                  <button
                    type="button"
                    onClick={() => openEditModal(s)}
                    className="py-1.5 px-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold inline-flex items-center justify-center gap-1 transition-colors cursor-pointer"
                    title="Ubah Profil"
                  >
                    <Edit3 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Edit</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleOpenViewPassword(s)}
                    className="py-1.5 px-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl text-xs font-bold inline-flex items-center justify-center gap-1 transition-colors cursor-pointer"
                    title="Lihat Password"
                  >
                    <Eye className="w-3.5 h-3.5 text-blue-600" />
                    <span>Lihat</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setResetStudent(s);
                      setNewPassword('');
                      setPasswordSuccess(null);
                    }}
                    className="py-1.5 px-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold inline-flex items-center justify-center gap-1 transition-colors cursor-pointer"
                    title="Reset Sandi"
                  >
                    <KeyRound className="w-3.5 h-3.5 text-amber-600" />
                    <span>Sandi</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setToggleStudent(s)}
                    className={`py-1.5 px-2 rounded-xl text-xs font-bold inline-flex items-center justify-center gap-1 transition-colors cursor-pointer ${
                      s.is_active
                        ? 'bg-amber-50 hover:bg-amber-100 text-amber-700'
                        : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700'
                    }`}
                    title={s.is_active ? 'Nonaktifkan Akun' : 'Aktifkan Akun'}
                  >
                    {s.is_active ? (
                      <UserX className="w-3.5 h-3.5" />
                    ) : (
                      <UserCheck className="w-3.5 h-3.5" />
                    )}
                    <span>{s.is_active ? 'Off' : 'On'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setDeleteStudent(s)}
                    className="py-1.5 px-2 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl text-xs font-bold inline-flex items-center justify-center gap-1 transition-colors cursor-pointer"
                    title="Hapus Siswa"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Hapus</span>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* ── DESKTOP VIEW: Full Table (md and up) ── */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-bold border-b border-slate-100">
              <tr>
                <th className="py-3.5 px-4 text-center w-12 text-slate-500 font-bold">No.</th>
                <th className="py-3.5 px-5">Siswa</th>
                <th className="py-3.5 px-4">Username</th>
                <th className="py-3.5 px-4">Kelas</th>
                <th className="py-3.5 px-4">Gender</th>
                <th className="py-3.5 px-4">WhatsApp</th>
                <th className="py-3.5 px-4">Status Akun</th>
                <th className="py-3.5 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-slate-400">
                    Memuat data siswa...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    Tidak ada siswa yang sesuai filter.
                  </td>
                </tr>
              ) : (
                filtered.map((s, idx) => (
                  <tr key={s.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-4 text-center font-bold text-slate-400">
                      {idx + 1}
                    </td>
                    <td className="py-3.5 px-5">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl overflow-hidden bg-slate-100 shrink-0 border border-slate-200">
                          <img
                            src={s.profile_photo_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${s.username}`}
                            alt={s.full_name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div>
                          <span className="font-bold text-slate-900 block">{s.full_name}</span>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-slate-100 text-slate-800 border border-slate-200/90 font-mono text-[11px] font-bold shadow-2xs">
                        @{s.username}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-bold text-emerald-700">
                      {s.class_name}
                    </td>
                    <td className="py-3.5 px-4">
                      {s.gender}
                    </td>
                    <td className="py-3.5 px-4">
                      {s.whatsapp ? (
                        <a
                          href={`https://wa.me/${s.whatsapp.replace(/\D/g, '').replace(/^0/, '62')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 hover:text-emerald-800 transition-colors font-mono text-[11px] font-bold group cursor-pointer"
                          title="Klik untuk chat langsung ke WhatsApp siswa"
                        >
                          <Phone className="w-3.5 h-3.5 text-emerald-600 group-hover:scale-110 transition-transform" />
                          <span>{s.whatsapp}</span>
                        </a>
                      ) : (
                        <span className="text-slate-400 italic text-[11px]">-</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          s.is_active
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {s.is_active ? 'Aktif' : 'Nonaktif'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => openEditModal(s)}
                          className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors cursor-pointer"
                          title="Ubah Profil Siswa"
                        >
                          <Edit3 className="w-3.5 h-3.5 text-emerald-600" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenViewPassword(s)}
                          className="p-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl transition-colors cursor-pointer"
                          title="Lihat Password Akun Siswa"
                        >
                          <Eye className="w-3.5 h-3.5 text-blue-600" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setResetStudent(s);
                            setNewPassword('');
                            setPasswordSuccess(null);
                          }}
                          className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors cursor-pointer"
                          title="Reset Password Akun Siswa"
                        >
                          <KeyRound className="w-3.5 h-3.5 text-amber-600" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setToggleStudent(s)}
                          className={`p-2 rounded-xl transition-colors cursor-pointer ${
                            s.is_active
                              ? 'bg-amber-50 hover:bg-amber-100 text-amber-700'
                              : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700'
                          }`}
                          title={s.is_active ? 'Nonaktifkan Akun' : 'Aktifkan Akun'}
                        >
                          {s.is_active ? <UserX className="w-3.5 h-3.5" /> : <UserCheck className="w-3.5 h-3.5" />}
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteStudent(s)}
                          className="p-2 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl transition-colors cursor-pointer"
                          title="Hapus Akun Siswa (Permanen)"
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

      {/* EDIT MODAL */}
      {editStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3.5 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-md max-h-[90vh] overflow-y-auto bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden">
            <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-slate-100">
              <h3 className="font-bold text-slate-800 text-sm">
                Ubah Profil Siswa: {editStudent.full_name}
              </h3>
              <button
                type="button"
                onClick={() => setEditStudent(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="p-5 sm:p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nama Lengkap
                </label>
                <input
                  type="text"
                  required
                  value={editFullName}
                  onChange={(e) => setEditFullName(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Kelas
                  </label>
                  <select
                    value={editClass}
                    onChange={(e) => setEditClass(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                  >
                    {CLASS_OPTIONS.filter((c) => c !== 'all').map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Jenis Kelamin
                  </label>
                  <select
                    value={editGender}
                    onChange={(e) => setEditGender(e.target.value as Gender)}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                  >
                    <option value="Laki-laki">Laki-laki</option>
                    <option value="Perempuan">Perempuan</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nomor WhatsApp
                </label>
                <input
                  type="tel"
                  required
                  value={editWhatsapp}
                  onChange={(e) => setEditWhatsapp(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditStudent(null)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSavingEdit}
                  className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs transition-colors cursor-pointer"
                >
                  {isSavingEdit ? 'Menyimpan...' : 'Simpan Perubahan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RESET PASSWORD MODAL */}
      {resetStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3.5 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-md max-h-[90vh] overflow-y-auto bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden">
            <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-slate-100">
              <h3 className="font-bold text-slate-800 text-sm">
                Reset Password Akun Siswa
              </h3>
              <button
                type="button"
                onClick={() => setResetStudent(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSavePassword} className="p-5 sm:p-6 space-y-4">
              <p className="text-xs text-slate-600">
                Setel ulang kata sandi login untuk siswa <b>{resetStudent.full_name}</b> (@{resetStudent.username}).
              </p>

              {passwordSuccess ? (
                <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl font-bold">
                  {passwordSuccess}
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Password Baru (Min. 6 Karakter)
                  </label>
                  <input
                    type="text"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Masukkan password baru siswa"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setResetStudent(null)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSavingPassword || Boolean(passwordSuccess)}
                  className="px-5 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-xl shadow-xs transition-colors cursor-pointer"
                >
                  {isSavingPassword ? 'Mereset...' : 'Reset Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TOGGLE STATUS CONFIRM */}
      {toggleStudent && (
        <ConfirmModal
          isOpen={Boolean(toggleStudent)}
          title={toggleStudent.is_active ? 'Nonaktifkan Akun Siswa' : 'Aktifkan Akun Siswa'}
          message={`Apakah Anda yakin ingin ${
            toggleStudent.is_active ? 'menonaktifkan' : 'mengaktifkan kembali'
          } akun siswa atas nama ${toggleStudent.full_name} (${toggleStudent.class_name})? ${
            toggleStudent.is_active
              ? 'Siswa ini tidak akan dapat login atau melakukan absensi sampai diaktifkan kembali.'
              : 'Siswa akan dapat login dan melakukan absensi seperti biasa.'
          }`}
          confirmLabel={toggleStudent.is_active ? 'Ya, Nonaktifkan' : 'Ya, Aktifkan'}
          isDestructive={toggleStudent.is_active}
          onConfirm={handleConfirmToggleStatus}
          onCancel={() => setToggleStudent(null)}
        />
      )}

      {/* DELETE STUDENT CONFIRM */}
      {deleteStudent && (
        <ConfirmModal
          isOpen={Boolean(deleteStudent)}
          title="Hapus Akun Siswa Secara Permanen"
          message={`Apakah Anda yakin ingin MENGHAPUS akun siswa atas nama "${deleteStudent.full_name}" (@${deleteStudent.username}, Kelas ${deleteStudent.class_name})? Tindakan ini akan menghapus akun dan data presensi terkait secara permanen dan tidak dapat dibatalkan.`}
          confirmLabel={isDeletingStudent ? 'Menghapus...' : 'Ya, Hapus Permanen'}
          isDestructive={true}
          onConfirm={handleConfirmDelete}
          onCancel={() => {
            if (!isDeletingStudent) setDeleteStudent(null);
          }}
        />
      )}

      {/* ADD STUDENT MODAL */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3.5 sm:p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full max-h-[90vh] overflow-y-auto p-5 sm:p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-emerald-50 text-emerald-700 rounded-xl">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900">Daftarkan Siswa Baru</h3>
                  <p className="text-[11px] text-slate-400">Tambahkan akun siswa baru ke database</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {addError && (
              <div className="mt-4 p-3 bg-rose-50 border border-rose-200 rounded-2xl flex items-center gap-2 text-xs text-rose-700">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{addError}</span>
              </div>
            )}

            <form onSubmit={handleCreateStudent} className="space-y-3.5 mt-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  Nama Lengkap
                </label>
                <input
                  type="text"
                  required
                  value={addFullName}
                  onChange={(e) => setAddFullName(e.target.value)}
                  placeholder="Contoh: Muhammad Rizki"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Kelas
                  </label>
                  <select
                    value={addClassName}
                    onChange={(e) => setAddClassName(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                  >
                    {CLASS_OPTIONS.filter((c) => c !== 'all').map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Jenis Kelamin
                  </label>
                  <select
                    value={addGender}
                    onChange={(e) => setAddGender(e.target.value as Gender)}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                  >
                    <option value="Laki-laki">Laki-laki</option>
                    <option value="Perempuan">Perempuan</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  Nomor WhatsApp
                </label>
                <input
                  type="text"
                  required
                  value={addWhatsapp}
                  onChange={(e) => setAddWhatsapp(e.target.value)}
                  placeholder="Contoh: 08123456789"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Username
                  </label>
                  <input
                    type="text"
                    required
                    value={addUsername}
                    onChange={(e) => setAddUsername(e.target.value.toLowerCase().replace(/\s+/g, '_'))}
                    placeholder="rizki123"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Password Akun
                  </label>
                  <input
                    type="text"
                    required
                    value={addPassword}
                    onChange={(e) => setAddPassword(e.target.value)}
                    placeholder="Min. 6 karakter"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100 mt-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSavingNewStudent}
                  className="px-5 py-2 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-xl shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                >
                  {isSavingNewStudent ? 'Menyimpan...' : 'Simpan Siswa'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── View Password Modal ── */}
      {viewPasswordStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-200">
                  <KeyRound className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-black text-sm text-slate-900">
                    Informasi Password Siswa
                  </h3>
                  <p className="text-[10px] text-slate-400">
                    Detail autentikasi akun siswa
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setViewPasswordStudent(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 cursor-pointer transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {isLoadingPassword ? (
              <div className="py-8 text-center space-y-2">
                <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-xs font-bold text-slate-600">Mengambil data password...</p>
              </div>
            ) : retrievedAuth ? (
              <div className="space-y-3.5">
                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 space-y-2 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">Nama Siswa:</span>
                    <span className="font-bold text-slate-800">{viewPasswordStudent.full_name}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">Kelas:</span>
                    <span className="font-bold text-emerald-700">{viewPasswordStudent.class_name}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">Username:</span>
                    <span className="font-mono font-bold text-slate-900 bg-slate-200/60 px-2 py-0.5 rounded-md">
                      {retrievedAuth.username}
                    </span>
                  </div>
                </div>

                <div className="p-3.5 bg-blue-50/70 border border-blue-200 rounded-2xl space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-blue-900">Password Akun:</span>
                    <button
                      type="button"
                      onClick={() => setShowPlainPassword(!showPlainPassword)}
                      className="text-[11px] font-bold text-blue-700 hover:text-blue-900 inline-flex items-center gap-1 cursor-pointer"
                    >
                      {showPlainPassword ? (
                        <>
                          <EyeOff className="w-3.5 h-3.5" />
                          <span>Sembunyikan</span>
                        </>
                      ) : (
                        <>
                          <Eye className="w-3.5 h-3.5" />
                          <span>Perlihatkan</span>
                        </>
                      )}
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="flex-1 px-3 py-2 bg-white rounded-xl border border-blue-200 font-mono text-sm font-black text-slate-900 tracking-wider overflow-x-auto select-all">
                      {showPlainPassword ? retrievedAuth.password : '••••••••••••'}
                    </div>
                    <button
                      type="button"
                      onClick={handleCopyPassword}
                      className="p-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs"
                      title="Salin Password"
                    >
                      {copySuccess ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                  {copySuccess && (
                    <p className="text-[11px] text-emerald-600 font-bold text-center">
                      ✓ Password berhasil disalin ke clipboard!
                    </p>
                  )}
                </div>

                <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-800 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <span>
                    Jaga kerahasiaan password siswa ini dan hanya berikan kepada siswa bersangkutan jika mereka lupa sandi.
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => setViewPasswordStudent(null)}
                  className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer"
                >
                  Tutup
                </button>
              </div>
            ) : (
              <div className="py-4 text-center text-xs text-rose-600">
                Gagal memuat password pengguna.
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
};
