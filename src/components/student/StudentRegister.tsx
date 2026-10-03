import React, { useState, useRef } from 'react';
import { Logo } from '../common/Logo.js';
import { api, setAuthToken, setSavedRole } from '../../lib/api.js';
import { compressImageToDataUrl } from '../../lib/imageCompression.js';
import {
  User,
  Lock,
  Phone,
  GraduationCap,
  Upload,
  Camera,
  ArrowLeft,
  UserCheck,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff
} from 'lucide-react';
import { Gender, Student } from '../../types.js';
import { useTheme } from '../../context/ThemeContext.js';


interface StudentRegisterProps {
  onRegisterSuccess: (student: Student) => void;
  onNavigateLogin: () => void;
}

// Background image URL resmi SMA Informatika Nurul Bayan
const BACKGROUND = "https://lh3.googleusercontent.com/gps-cs-s/AHRPTWlZgDiiO_xVpoBKAxOBMuTUF8i5lp6PRZ5a3z4PQ_E0phwWgtL2dnDMh2o0rXmVFouUea_b0YZOeBf7FWMSqse14hP-NBvUEHpBAiOuqVfmpumFCAFsiKsQnNJrCiQWXnTgTlQqWAUH4mP6=s1360-w1360-h1020-rw";

const CLASS_OPTIONS = [
  'X (10)',
  'XI (11)',
  'XII (12)',
];

export const StudentRegister: React.FC<StudentRegisterProps> = ({
  onRegisterSuccess,
  onNavigateLogin,
}) => {
  const { branding } = useTheme();
  const [fullName, setFullName] = useState('');
  const [className, setClassName] = useState('X (10)');
  const [gender, setGender] = useState<Gender>('Laki-laki');
  const [whatsapp, setWhatsapp] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check format
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      setErrorMessage('Format foto hanya boleh JPG, JPEG, PNG, atau WEBP.');
      return;
    }

    setErrorMessage(null);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // 1. Validasi Foto Profil Wajib
    if (!photoPreview) {
      setErrorMessage('Foto profil nya isi dulu cik 😹🤣.');
      return;
    }

    // 2. Frontend Validations Form
    if (!fullName.trim() || !whatsapp.trim() || !username.trim() || !password || !confirmPassword) {
      setErrorMessage('Semua formulir pendaftaran wajib diisi.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage('Password dan Konfirmasi Password tidak cocok.');
      return;
    }

    if (password.length < 6) {
      setErrorMessage('Password minimal harus 6 karakter.');
      return;
    }

    const cleanUsername = username.trim().toLowerCase().replace(/\s+/g, '_');
    if (!cleanUsername) {
      setErrorMessage('Username siswa wajib diisi.');
      return;
    }
    if (!/^[a-zA-Z0-9._-]+$/.test(cleanUsername)) {
      setErrorMessage('Username hanya boleh berisi huruf, angka, titik, atau strip.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await api.post<{
        success: boolean;
        message: string;
        token: string;
        student: Student;
      }>('/auth/student/register', {
        full_name: fullName.trim(),
        class_name: className,
        gender,
        whatsapp: whatsapp.trim(),
        username: cleanUsername,
        password,
        confirm_password: confirmPassword,
        profile_photo_url: photoPreview,
      });

      if (res.success && res.student) {
        setAuthToken(res.token);
        setSavedRole('student');
        onRegisterSuccess(res.student);
      } else {
        setErrorMessage(res.message || 'Pendaftaran gagal.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Terjadi kendala saat pendaftaran akun siswa.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 py-8 px-4 sm:px-6 relative overflow-x-hidden font-sans">
      {/* Background Graphic: Real School Building Photo - Clear & Crisp */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        <img
          src={branding.background_url || BACKGROUND}
          alt="Gedung Kampus SMA Informatika Nurul Bayan"
          className="w-full h-full object-cover object-center transform scale-100"
          referrerPolicy="no-referrer"
        />
        {/* Balanced contrast overlay so the photo is clearly visible while the form card stands out */}
        <div className="absolute inset-0 bg-linear-to-b from-slate-950/60 via-slate-900/40 to-slate-950/75" />
        <div className="absolute inset-0 bg-radial from-transparent via-emerald-950/20 to-slate-950/50" />
      </div>

      <div className="relative z-10 w-full flex flex-col items-center justify-center max-w-7xl mx-auto my-auto">

        <div className="w-full max-w-lg">
          <div className="auth-card bg-white dark:bg-[#0d1322] rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden transition-all">

            {/* Header */}
            <div className="auth-card-header p-6 sm:p-7 text-white border-b border-white/20">
              <button
                type="button"
                onClick={onNavigateLogin}
                className="inline-flex items-center gap-1.5 text-xs text-white/80 hover:text-white mb-3 transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Kembali ke Halaman Login</span>
              </button>
              <div className="flex items-center gap-4">
                <div className="shrink-0 filter drop-shadow-md select-none">
                  <Logo size="lg" showText={false} />
                </div>
                <div>
                  <h1 className="text-xl font-black tracking-tight text-white">
                    Pendaftaran Akun Siswa
                  </h1>
                  <p className="text-xs text-white/85">
                    {branding.school_name || 'SMA Informatika Nurul Bayan Cimerak'}
                  </p>
                </div>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-5 bg-white">
              {errorMessage && (
                <div className="p-3.5 bg-rose-50/90 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-start gap-2.5 animate-in fade-in duration-200">
                  <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                  <span className="font-medium leading-relaxed">{errorMessage}</span>
                </div>
              )}

              {/* 1. Foto Profil */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    1. Foto Profil Siswa <span className="text-rose-500">* (Wajib Diunggah)</span>
                  </label>
                  {photoPreview ? (
                    <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>Foto Siap</span>
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold text-rose-500 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full">
                      Wajib Dipilih
                    </span>
                  )}
                </div>
                <div className={`flex items-center gap-4 p-3.5 rounded-2xl border transition-all ${!photoPreview
                  ? 'bg-rose-50/30 border-rose-200/80 shadow-2xs'
                  : 'bg-slate-50/80 border-slate-200 shadow-2xs'
                  }`}>
                  <div className="relative w-20 h-20 rounded-full auth-theme-bg-light border-2 border-dashed auth-theme-border overflow-hidden flex items-center justify-center shrink-0 shadow-2xs">
                    {photoPreview ? (
                      <img
                        src={photoPreview}
                        alt="Preview Foto Siswa"
                        className="w-full h-full object-cover rounded-full"
                      />
                    ) : (
                      <User className="w-8 h-8 auth-theme-icon" />
                    )}
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="absolute inset-0 bg-slate-950/40 opacity-0 hover:opacity-100 flex items-center justify-center text-white transition-opacity cursor-pointer"
                      title="Ganti Foto"
                    >
                      <Camera className="w-5 h-5" />
                    </button>
                  </div>
                  <div className="flex-1">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/jpg,image/png,image/webp"
                      onChange={handlePhotoSelect}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer shadow-2xs ${photoPreview
                        ? 'bg-slate-200 hover:bg-slate-300 text-slate-800'
                        : 'auth-theme-btn-secondary'
                        }`}
                    >
                      <Upload className="w-3.5 h-3.5 auth-theme-icon" />
                      <span>{photoPreview ? 'Ganti Foto Profil' : 'Pilih Foto dari Galeri (Wajib)'}</span>
                    </button>
                    <p className="text-[11px] text-slate-500 mt-1.5 leading-relaxed">
                      Format: JPG, PNG, WEBP (Maks. 3 MB). Gunakan foto berseragam atau pakaian rapi dengan wajah jelas.
                    </p>
                  </div>
                </div>
              </div>

              {/* 2. Nama Lengkap */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  2. Nama Lengkap Siswa
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="wa zaed, saumuran jeung mobil kijang"
                  className="w-full px-4 py-3 bg-white/90 border border-emerald-100/90 rounded-xl text-sm font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/25 focus:border-emerald-500 transition-all shadow-2xs"
                />
              </div>

              {/* 3. Kelas & 4. Jenis Kelamin (2 Columns) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    3. Kelas
                  </label>
                  <div className="relative">
                    <select
                      value={className}
                      onChange={(e) => setClassName(e.target.value)}
                      className="w-full px-4 py-3 bg-white/90 border border-emerald-100/90 rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/25 focus:border-emerald-500 transition-all cursor-pointer shadow-2xs"
                    >
                      {CLASS_OPTIONS.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    4. Jenis Kelamin
                  </label>
                  <div className="flex gap-2">
                    {(['Laki-laki', 'Perempuan'] as Gender[]).map((g) => (
                      <button
                        key={g}
                        type="button"
                        onClick={() => setGender(g)}
                        className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer ${gender === g
                          ? 'btn-theme-submit text-white shadow-xs'
                          : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
                          }`}
                      >
                        {g}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* 5. Nomor WhatsApp */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  5. Nomor WhatsApp Siswa
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none auth-theme-icon">
                    <Phone className="w-4 h-4" />
                  </div>
                  <input
                    type="tel"
                    required
                    value={whatsapp}
                    onChange={(e) => setWhatsapp(e.target.value)}
                    placeholder="sing baleg nganuan nomor wa na, kudu nu aktif no utama!"
                    className="w-full pl-10 pr-4 py-3 bg-white border border-slate-300 rounded-xl text-sm font-medium text-slate-900 placeholder-slate-400 focus:outline-none transition-all shadow-2xs"
                  />
                </div>
              </div>

              {/* 6. Username */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  6. Username (Unik)
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none auth-theme-icon">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Contoh: royan123 (omat wa, kade poho jang login deui"
                    autoCapitalize="none"
                    className="w-full pl-10 pr-4 py-3 bg-white border border-slate-300 rounded-xl text-sm font-medium text-slate-900 placeholder-slate-400 focus:outline-none transition-all shadow-2xs"
                  />
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Akan digunakan untuk login siswa sehari-hari.
                </p>
              </div>

              {/* 7. Password & 8. Konfirmasi Password */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    7. Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Minimal 6 karakter"
                      className="w-full px-3.5 py-3 bg-white border border-slate-300 rounded-xl text-sm font-medium text-slate-900 placeholder-slate-400 focus:outline-none transition-all shadow-2xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    8. Konfirmasi Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Ulangi password"
                      className="w-full px-3.5 py-3 bg-white border border-slate-300 rounded-xl text-sm font-medium text-slate-900 placeholder-slate-400 focus:outline-none transition-all shadow-2xs"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-700 cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3.5 btn-theme-submit active:scale-[0.99] text-white text-sm font-bold rounded-xl flex items-center justify-center gap-2 transition-all disabled:opacity-50 cursor-pointer"
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <UserCheck className="w-4 h-4" />
                    <span>Daftar Sekarang & Masuk</span>
                  </>
                )}
              </button>

              <div className="text-center pt-2">
                <span className="text-xs text-slate-500">
                  Sudah memiliki akun siswa?{' '}
                  <button
                    type="button"
                    onClick={onNavigateLogin}
                    className="font-bold auth-theme-link hover:underline cursor-pointer"
                  >
                    Masuk di sini
                  </button>
                </span>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
