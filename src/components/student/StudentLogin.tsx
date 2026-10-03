import React, { useState } from 'react';
import { Logo } from '../common/Logo.js';
import { api, setAuthToken, setSavedRole } from '../../lib/api.js';
import { Lock, User, LogIn, ArrowRight, HelpCircle, ShieldCheck, Eye, EyeOff } from 'lucide-react';
import { Student } from '../../types.js';
import { useTheme } from '../../context/ThemeContext.js';
import { ThemeToggle } from '../common/ThemeToggle.js';

interface StudentLoginProps {
  onLoginSuccess: (student: Student) => void;
  onNavigateRegister: () => void;
  onNavigateAdmin: () => void;
}

// Background image URL resmi SMA Informatika Nurul Bayan
const BACKGROUND = "https://lh3.googleusercontent.com/gps-cs-s/AHRPTWlZgDiiO_xVpoBKAxOBMuTUF8i5lp6PRZ5a3z4PQ_E0phwWgtL2dnDMh2o0rXmVFouUea_b0YZOeBf7FWMSqse14hP-NBvUEHpBAiOuqVfmpumFCAFsiKsQnNJrCiQWXnTgTlQqWAUH4mP6=s1360-w1360-h1020-rw";

export const StudentLogin: React.FC<StudentLoginProps> = ({
  onLoginSuccess,
  onNavigateRegister,
  onNavigateAdmin,
}) => {
  const { branding } = useTheme();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const adminWhatsApp = '6285659611760';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!username.trim() || !password) {
      setErrorMessage('Silakan masukkan username dan password Anda.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await api.post<{
        success: boolean;
        message: string;
        token: string;
        student: Student;
      }>('/auth/student/login', {
        username: username.trim().toLowerCase(),
        password: password.trim(),
      });

      if (res.success && res.student) {
        setAuthToken(res.token);
        setSavedRole('student');
        onLoginSuccess(res.student);
      } else {
        setErrorMessage(res.message || 'Login gagal.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Username atau password tidak sesuai. Silakan periksa kembali.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleWhatsAppAdmin = () => {
    const text = encodeURIComponent(
      `HALLOO ADMIN GANTENG, saya mengalami kendala pada akun absensi digital siswa saya. Mohon bantuannya. Username: ${username || '-'}`
    );
    window.open(`https://wa.me/${adminWhatsApp}?text=${text}`, '_blank');
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-between relative overflow-hidden font-sans">
      {/* Saklar Lampu / Mode Gelap Mengambang di Pojok Kanan Atas */}
      <ThemeToggle variant="floating" />

      {/* Background Graphic: Real School Building Photo */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        <img
          src={branding.background_url || BACKGROUND}
          alt="Gedung Kampus SMA Informatika Nurul Bayan"
          className="w-full h-full object-cover object-center transform scale-100"
          referrerPolicy="no-referrer"
        />
        {/* Contrast overlay */}
        <div className="absolute inset-0 bg-linear-to-b from-slate-950/75 via-slate-900/50 to-slate-950/85" />
        <div className="absolute inset-0 bg-radial from-transparent via-emerald-950/25 to-slate-950/55" />
      </div>

      {/* Main Container: Centered auth card */}
      <div className="relative z-10 w-full flex-1 flex flex-col items-center justify-center p-4 sm:p-6 lg:p-10 max-w-7xl mx-auto my-auto">

        {/* Main Auth Card Container */}
        <div className="w-full max-w-md">
          <div className="auth-card bg-white dark:bg-[#0d1322] rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden transition-all">
            {/* Header Card Brand */}
            <div className="auth-card-header p-6 sm:p-8 text-white relative border-b border-white/20">
              <div className="flex justify-center mb-3">
                <div className="w-32 h-32 sm:w-36 sm:h-36 flex items-center justify-center select-none filter drop-shadow-md">
                  <Logo size="xl" showText={false} />
                </div>
              </div>
              <div className="text-center">
                <span className="text-[11px] font-bold uppercase tracking-widest auth-theme-badge px-2.5 py-0.5 rounded-full inline-block">
                  Sistem Absensi Digital Siswa
                </span>
                <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white mt-1">
                  {branding.school_name || 'SMA Informatika Nurul Bayan'}
                </h1>
                <p className="text-xs text-white/85 mt-1 max-w-xs mx-auto leading-relaxed">
                  Masuk untuk melakukan absensi kehadiran harian dan memeriksa jadwal mata pelajaran.
                </p>
              </div>
            </div>

            {/* Form Content */}
            <div className="p-6 sm:p-8 bg-white dark:bg-[#0d1322] transition-colors">
              {errorMessage && (
                <div className="mb-5 p-3.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs rounded-xl flex items-start gap-2.5 animate-in fade-in duration-200">
                  <div className="shrink-0 w-2 h-2 rounded-full bg-rose-500 mt-1.5" />
                  <span className="font-medium leading-relaxed">{errorMessage}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                    Username Siswa
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
                      placeholder="Lebetkeun username akun"
                      autoCapitalize="none"
                      autoComplete="username"
                      className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-[#080c14] border-2 border-slate-200 dark:border-slate-800 rounded-xl text-sm font-medium text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500 transition-all shadow-2xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                    Password Akun
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none auth-theme-icon">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="lebetkeun password akun"
                      autoComplete="current-password"
                      className="w-full pl-10 pr-10 py-3 bg-slate-50 dark:bg-[#080c14] border-2 border-slate-200 dark:border-slate-800 rounded-xl text-sm font-medium text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500 transition-all shadow-2xs"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full mt-2 py-3.5 btn-theme-submit active:scale-[0.99] text-white text-sm font-bold rounded-xl flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:pointer-events-none cursor-pointer card-2d"
                >
                  {isLoading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <LogIn className="w-4 h-4" />
                      <span>Masuk ke Akun Siswa</span>
                    </>
                  )}
                </button>
              </form>

              {/* Navigation Links */}
              <div className="mt-6 pt-5 border-t border-slate-200 dark:border-slate-800 flex flex-col gap-3 text-center text-xs">
                <p className="text-slate-600 dark:text-slate-400">
                  Teu acan gaduh akun?{' '}
                  <button
                    type="button"
                    onClick={onNavigateRegister}
                    className="font-bold auth-theme-link hover:underline inline-flex items-center gap-0.5 cursor-pointer"
                  >
                    Daftar Hela Huunn <ArrowRight className="w-3 h-3" />
                  </button>
                </p>

                <button
                  type="button"
                  onClick={handleWhatsAppAdmin}
                  className="text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <HelpCircle className="w-3.5 h-3.5 auth-theme-icon" />
                  <span>Mengalami kendala? Hubungi Admin Ganteng</span>
                </button>

                <div className="pt-2">
                  <button
                    type="button"
                    onClick={onNavigateAdmin}
                    className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 auth-theme-btn-secondary rounded-xl font-bold text-xs transition-all cursor-pointer shadow-2xs hover:shadow-xs card-2d"
                  >
                    <ShieldCheck className="w-3.5 h-3.5 auth-theme-icon" />
                    <span>Portal Masuk Guru & Admin</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Footer info */}
          <p className="text-center text-xs text-white/90 drop-shadow-sm mt-6 font-medium">
            © {new Date().getFullYear()} SMA Informatika Nurul Bayan Cimerak. Hak Cipta Dilindungi.
          </p>
        </div>
      </div>
    </div>
  );
};
