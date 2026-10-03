import React, { useState, useRef, useEffect } from 'react';
import { Student, Gender } from '../../types.js';
import { api } from '../../lib/api.js';
import { compressImageToDataUrl } from '../../lib/imageCompression.js';
import { 
  User, 
  Phone, 
  GraduationCap, 
  ShieldCheck, 
  LogOut, 
  HelpCircle, 
  Edit3, 
  Camera, 
  X, 
  Building2,
  Smartphone,
  CheckCircle2
} from 'lucide-react';
import { ConfirmModal } from '../common/ConfirmModal.js';
import { usePWAInstall } from '../../hooks/usePWAInstall.js';
import { PWAInstallButton } from '../pwa/PWAInstallButton.js';

interface StudentProfileProps {
  student: Student;
  onUpdateStudent: (updated: Student) => void;
  onLogout: () => void;
}

export const StudentProfile: React.FC<StudentProfileProps> = ({
  student,
  onUpdateStudent,
  onLogout,
}) => {
  const [showEditModal, setShowEditModal] = useState<boolean>(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState<boolean>(false);

  // Normalize gender to prevent mismatch with 'L' or other casing
  const normalizedGender: Gender = 
    (student.gender === 'Perempuan' || student.gender === 'P' || (student.gender as string)?.toLowerCase().startsWith('p'))
      ? 'Perempuan'
      : 'Laki-laki';

  // Edit form state
  const [fullName, setFullName] = useState(student.full_name);
  const [gender, setGender] = useState<Gender>(normalizedGender);
  const [whatsapp, setWhatsapp] = useState(student.whatsapp);
  const [photoPreview, setPhotoPreview] = useState<string | null>(student.profile_photo_url || null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    setFullName(student.full_name);
    setGender(normalizedGender);
    setWhatsapp(student.whatsapp);
    setPhotoPreview(student.profile_photo_url || null);
  }, [student, normalizedGender]);

  const { isInstalled } = usePWAInstall();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const adminWhatsApp = '6285659611760';

  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const compressed = await compressImageToDataUrl(file, {
        maxWidth: 320,
        maxHeight: 320,
        quality: 0.5,
        targetMaxKb: 20,
      });
      setPhotoPreview(compressed);
    } catch {
      const reader = new FileReader();
      reader.onload = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsLoading(true);

    try {
      const res = await api.put<{
        success: boolean;
        message: string;
        student: Student;
      }>(`/students/${student.id}`, {
        full_name: fullName.trim(),
        gender,
        whatsapp: whatsapp.trim(),
        profile_photo_url: photoPreview,
      });

      if (res.success && res.student) {
        onUpdateStudent(res.student);
        setShowEditModal(false);
      } else {
        setErrorMessage(res.message || 'Gagal menyimpan perubahan.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Terjadi kendala saat memperbarui profil.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleContactAdmin = () => {
    const text = encodeURIComponent(
      `HALLO ADMIN GANTENG, APLIKASINYA BAGUS BANGET BTW....`
    );
    window.open(`https://wa.me/${adminWhatsApp}?text=${text}`, '_blank');
  };

  return (
    <div className="w-full max-w-2xl mx-auto space-y-5 pb-16 font-sans transition-colors pt-1 sm:pt-2 md:pt-4">
      
      {/* 1. Main Profile Avatar Card */}
      <div className="bg-white dark:bg-[#0d1322] rounded-2xl p-6 sm:p-7 border border-slate-200 dark:border-slate-800 text-center relative overflow-hidden card-2d transition-all">
        <div className="w-24 h-24 sm:w-28 sm:h-28 mx-auto rounded-full p-1 bg-gradient-to-tr from-emerald-600 to-emerald-400 shadow-xl shadow-emerald-600/20 overflow-hidden mb-4">
          <img
            src={student.profile_photo_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${student.username}`}
            alt={student.full_name}
            className="w-full h-full object-cover rounded-full bg-white dark:bg-slate-800"
          />
        </div>

        <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">
          {student.full_name}
        </h2>
        <div className="mt-1.5 flex items-center justify-center gap-2 flex-wrap">
          <span className="px-3 py-0.5 rounded-full text-xs font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
            {student.class_name}
          </span>
          <span className="px-3 py-0.5 rounded-full text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
            {normalizedGender}
          </span>
        </div>
        <p className="text-xs text-slate-400 dark:text-slate-500 mt-2 font-mono">
          @{student.username}
        </p>

        <div className="pt-5 flex items-center justify-center gap-2.5">
          <button
            type="button"
            onClick={() => setShowEditModal(true)}
            className="px-4 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 transition-colors cursor-pointer border border-slate-200 dark:border-slate-700 card-2d"
          >
            <Edit3 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>Ubah Profil Siswa</span>
          </button>
        </div>
      </div>

      {/* 2. Details List */}
      <div className="bg-white dark:bg-[#0d1322] rounded-2xl p-5 sm:p-6 border-2 border-slate-200 dark:border-slate-800 card-2d divide-y divide-slate-100 dark:divide-slate-800 transition-all">
        <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-white pb-3">
          Informasi Biodata Siswa
        </h3>

        <div className="flex items-center justify-between py-3.5">
          <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2">
            <User className="w-4 h-4 text-slate-400 dark:text-slate-500" /> Username Akun
          </span>
          <span className="text-xs font-bold text-slate-900 dark:text-white font-mono">
            {student.username}
          </span>
        </div>

        <div className="flex items-center justify-between py-3.5">
          <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2">
            <GraduationCap className="w-4 h-4 text-slate-400 dark:text-slate-500" /> Kelas Terdaftar
          </span>
          <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400">
            {student.class_name}
          </span>
        </div>

        <div className="flex items-center justify-between py-3.5">
          <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2">
            <User className="w-4 h-4 text-slate-400 dark:text-slate-500" /> Jenis Kelamin
          </span>
          <span className="text-xs font-bold text-slate-900 dark:text-white">
            {normalizedGender}
          </span>
        </div>

        <div className="flex items-center justify-between py-3.5">
          <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2">
            <Phone className="w-4 h-4 text-slate-400 dark:text-slate-500" /> Nomor WhatsApp
          </span>
          <span className="text-xs font-bold text-slate-900 dark:text-white">
            {student.whatsapp}
          </span>
        </div>

        <div className="flex items-center justify-between py-3.5">
          <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-slate-400 dark:text-slate-500" /> Status Akun
          </span>
          <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            AKTIF
          </span>
        </div>
      </div>

      {/* 3. School Information */}
      <div className="bg-slate-50 dark:bg-[#0d1322] rounded-2xl p-5 border-2 border-slate-200 dark:border-slate-800 card-2d text-xs text-slate-600 dark:text-slate-300 space-y-2">
        <div className="flex items-center gap-2 font-bold text-slate-800 dark:text-white">
          <Building2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <span>SMA Informatika Nurul Bayan Cimerak</span>
        </div>
        <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
          Kecamatan Cimerak, Kabupaten Pangandaran, Jawa Barat. Membina generasi unggul di bidang teknologi informasi dan akhlak mulia.
        </p>
      </div>

      {/* 4. PWA Info Card */}
      <div className="bg-white dark:bg-[#0d1322] rounded-2xl p-5 sm:p-6 border-2 border-slate-200 dark:border-slate-800 card-2d space-y-3.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
              <Smartphone className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-900 dark:text-white">App SMASTIKA Absensi</h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {isInstalled ? 'Terpasang sebagai Aplikasi di Perangkat' : 'Dapat Dipasang di Layar Utama HP / Desktop'}
              </p>
            </div>
          </div>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300">
            Auto-Sync
          </span>
        </div>

        <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-300 pt-1 border-t border-slate-100 dark:border-slate-800">
          <span>Sinkronisasi Otomatis Server:</span>
          <span className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Aktif (Update Otomatis)
          </span>
        </div>

        <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
          Aplikasi otomatis menyinkronkan pembaruan kode langsung dari server tanpa perlu instalasi ulang manual.
        </p>

        {!isInstalled && (
          <div className="pt-1">
            <PWAInstallButton variant="primary" className="w-full" />
          </div>
        )}
      </div>

      {/* 5. Action Buttons (Keluar Akun & Kontak) */}
      <div className="space-y-3">
        <button
          type="button"
          onClick={handleContactAdmin}
          className="w-full py-3 bg-white dark:bg-[#0d1322] hover:bg-slate-50 dark:hover:bg-slate-800 border-2 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 rounded-2xl text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer card-2d"
        >
          <HelpCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <span>Hubungi MIFSRZ (Developer)</span>
        </button>

        <button
          type="button"
          onClick={() => setShowLogoutConfirm(true)}
          className="w-full py-3 bg-rose-50 dark:bg-rose-950/30 hover:bg-rose-100 dark:hover:bg-rose-900/40 border-2 border-rose-200 dark:border-rose-900/80 text-rose-700 dark:text-rose-300 rounded-2xl text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer card-2d"
        >
          <LogOut className="w-4 h-4" />
          <span>Keluar dari Akun Siswa</span>
        </button>
      </div>

      {/* EDIT MODAL */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-white dark:bg-[#0d1322] rounded-2xl shadow-2xl border-2 border-slate-200 dark:border-slate-800 overflow-hidden card-2d">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-slate-900 dark:text-white text-sm">
                Ubah Profil Siswa
              </h3>
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveProfile} className="p-6 space-y-4">
              {errorMessage && (
                <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/80 text-rose-700 dark:text-rose-300 text-xs rounded-xl">
                  {errorMessage}
                </div>
              )}

              {/* Photo (Bulat) */}
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 overflow-hidden shrink-0">
                  <img
                    src={photoPreview || student.profile_photo_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${student.username}`}
                    alt="Preview"
                    className="w-full h-full object-cover rounded-full"
                  />
                </div>
                <div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoSelect}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer border border-slate-200 dark:border-slate-700"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <span>Ganti Foto Profil</span>
                  </button>
                </div>
              </div>

              {/* Nama */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Nama Lengkap
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-[#080c14] border-2 border-slate-200 dark:border-slate-800 rounded-xl text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Jenis Kelamin */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Jenis Kelamin
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {(['Laki-laki', 'Perempuan'] as const).map((g) => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => setGender(g)}
                      className={`py-2 px-3 text-xs font-bold rounded-xl border-2 transition-all cursor-pointer ${
                        gender === g
                          ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300'
                          : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#080c14] text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      {g}
                    </button>
                  ))}
                </div>
              </div>

              {/* WhatsApp */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Nomor WhatsApp
                </label>
                <input
                  type="tel"
                  required
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-[#080c14] border-2 border-slate-200 dark:border-slate-800 rounded-xl text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs transition-colors cursor-pointer card-2d"
                >
                  {isLoading ? 'Menyimpan...' : 'Simpan Profil'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* LOGOUT CONFIRM MODAL */}
      <ConfirmModal
        isOpen={showLogoutConfirm}
        title="Konfirmasi Keluar Akun"
        message="Apakah Anda yakin ingin keluar dari akun siswa ini? Anda harus memasukkan username dan password kembali untuk login."
        confirmLabel="Ya, Keluar Akun"
        isDestructive={true}
        onConfirm={() => {
          setShowLogoutConfirm(false);
          onLogout();
        }}
        onCancel={() => setShowLogoutConfirm(false)}
      />

    </div>
  );
};
