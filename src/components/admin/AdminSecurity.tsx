import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api.js';
import { 
  KeyRound, 
  User, 
  ShieldCheck, 
  Eye, 
  EyeOff, 
  Copy, 
  Check, 
  Save, 
  AlertCircle, 
  CheckCircle2, 
  Lock,
  Sparkles,
  Info
} from 'lucide-react';

export const AdminSecurity: React.FC = () => {
  const [currentUsername, setCurrentUsername] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [copiedUser, setCopiedUser] = useState(false);
  const [copiedPass, setCopiedPass] = useState(false);

  // Edit form state
  const [newUsernameInput, setNewUsernameInput] = useState('');
  const [oldPasswordInput, setOldPasswordInput] = useState('');
  const [newPasswordInput, setNewPasswordInput] = useState('');
  const [confirmPasswordInput, setConfirmPasswordInput] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);

  // Status state
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    fetchCredentials();
  }, []);

  const fetchCredentials = async () => {
    setIsLoading(true);
    try {
      const res = await api.get<{
        success: boolean;
        username: string;
        current_password?: string;
      }>('/auth/admin/credentials');

      if (res.success) {
        if (res.username) {
          setCurrentUsername(res.username);
          setNewUsernameInput(res.username);
        }
        if (res.current_password) {
          setCurrentPassword(res.current_password);
        }
      }
    } catch (err) {
      console.error('Failed to load admin credentials', err);
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = (text: string, type: 'user' | 'pass') => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    if (type === 'user') {
      setCopiedUser(true);
      setTimeout(() => setCopiedUser(false), 2500);
    } else {
      setCopiedPass(true);
      setTimeout(() => setCopiedPass(false), 2500);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMessage(null);
    setErrorMessage(null);

    if (!oldPasswordInput.trim()) {
      setErrorMessage('Harap masukkan Sandi Saat Ini untuk verifikasi keamanan.');
      return;
    }

    const isUsernameChanged = newUsernameInput.trim() !== currentUsername;
    const isPasswordFilled = newPasswordInput.trim().length > 0;

    if (!isUsernameChanged && !isPasswordFilled) {
      setErrorMessage('Tidak ada perubahan yang Anda buat. Ubah username atau masukkan sandi baru.');
      return;
    }

    if (isPasswordFilled) {
      if (newPasswordInput.length < 6) {
        setErrorMessage('Sandi baru minimal harus 6 karakter.');
        return;
      }
      if (newPasswordInput !== confirmPasswordInput) {
        setErrorMessage('Sandi baru dan konfirmasi sandi tidak cocok. Harap periksa kembali.');
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const res = await api.put<{
        success: boolean;
        message: string;
        username?: string;
      }>('/auth/admin/credentials', {
        old_password: oldPasswordInput,
        new_username: isUsernameChanged ? newUsernameInput.trim() : undefined,
        new_password: isPasswordFilled ? newPasswordInput.trim() : undefined,
        confirm_password: isPasswordFilled ? confirmPasswordInput.trim() : undefined,
      });

      if (res.success) {
        setSuccessMessage(res.message || 'Kredensial administrator berhasil diperbarui di database Supabase.');
        if (res.username) {
          setCurrentUsername(res.username);
          setNewUsernameInput(res.username);
        }
        if (isPasswordFilled) {
          setCurrentPassword(newPasswordInput.trim());
        }
        setOldPasswordInput('');
        setNewPasswordInput('');
        setConfirmPasswordInput('');

        setTimeout(() => setSuccessMessage(null), 5000);
      } else {
        setErrorMessage(res.message || 'Gagal memperbarui kredensial admin.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Terjadi gangguan jaringan atau server.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white rounded-3xl p-6 border border-slate-100 shadow-xs">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 shadow-xs">
            <ShieldCheck className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                Akses Keamanan
              </span>
              <span className="text-xs text-slate-400 font-medium">Supabase Auth Root</span>
            </div>
            <h1 className="text-xl font-black text-slate-900 mt-1">
              Akun & Sandi Administrator
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Kelola username dan sandi login resmi administrator SMA Informatika Nurul Bayan
            </p>
          </div>
        </div>
      </div>

      {/* Alert Notifications */}
      {successMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-2xl flex items-center gap-3 animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <div>
            <p className="font-black text-sm text-emerald-900">Pembaruan Berhasil!</p>
            <p className="text-xs font-medium text-emerald-700">{successMessage}</p>
          </div>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-2xl flex items-center gap-3 animate-in fade-in">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          <div>
            <p className="font-black text-sm text-rose-900">Perhatian</p>
            <p className="text-xs font-medium text-rose-700">{errorMessage}</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Kolom Kiri: Kartu Info Kredensial Saat Ini */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-xs space-y-5">
            <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
              <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                <User className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-black text-sm text-slate-900">Kredensial Aktif</h3>
                <p className="text-xs text-slate-500">Data login yang sedang digunakan</p>
              </div>
            </div>

            {/* Current Username */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-600 flex items-center gap-1.5">
                <span>Username Admin</span>
              </label>
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl border border-slate-200/80">
                {isLoading ? (
                  <div className="h-4 w-24 bg-slate-200 rounded animate-pulse" />
                ) : (
                  <span className="text-sm font-black text-slate-900 font-mono">
                    {currentUsername || '-'}
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => copyToClipboard(currentUsername, 'user')}
                  disabled={isLoading || !currentUsername}
                  className="p-1.5 text-slate-400 hover:text-emerald-700 hover:bg-white rounded-xl transition-all cursor-pointer disabled:opacity-40"
                  title="Salin Username"
                >
                  {copiedUser ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Current Password */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-600 flex items-center justify-between">
                <span>Sandi Admin Saat Ini</span>
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  disabled={isLoading}
                  className="text-[11px] text-emerald-600 hover:underline inline-flex items-center gap-1 cursor-pointer font-bold disabled:opacity-50"
                >
                  {showCurrentPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  <span>{showCurrentPassword ? 'Sembunyikan' : 'Lihat Sandi'}</span>
                </button>
              </label>
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl border border-slate-200/80">
                {isLoading ? (
                  <div className="h-4 w-32 bg-slate-200 rounded animate-pulse" />
                ) : (
                  <span className="text-sm font-black text-slate-900 font-mono tracking-wider">
                    {showCurrentPassword ? currentPassword || '(Belum dimuat)' : '••••••••••••'}
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => copyToClipboard(currentPassword, 'pass')}
                  disabled={isLoading || !currentPassword}
                  className="p-1.5 text-slate-400 hover:text-emerald-700 hover:bg-white rounded-xl transition-all cursor-pointer disabled:opacity-40"
                  title="Salin Sandi"
                >
                  {copiedPass ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="p-4 bg-emerald-50/50 border border-emerald-100 rounded-2xl space-y-2">
              <div className="flex items-center gap-2 text-emerald-800 text-xs font-bold">
                <Info className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Petunjuk Keamanan</span>
              </div>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                Anda dapat memperbarui <strong>Username saja</strong>, <strong>Sandi saja</strong>, ataupun <strong>keduanya bersamaan</strong>. Untuk keamanan, Sandi Lama wajib dimasukkan saat melakukan perubahan.
              </p>
            </div>
          </div>
        </div>

        {/* Kolom Kanan: Form Edit Username & Sandi */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-100 shadow-xs space-y-6">
            <div className="flex items-center gap-3 pb-5 border-b border-slate-100">
              <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                <KeyRound className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-black text-slate-900">
                  Form Ubah Username & Sandi Administrator
                </h2>
                <p className="text-xs text-slate-500">
                  Data langsung disimpan ke tabel users database Supabase PostgreSQL
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Bagian 1: Username Baru */}
              <div className="space-y-1.5">
                <label className="block text-xs font-black text-slate-800">
                  Username Administrator <span className="text-emerald-600">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    value={newUsernameInput}
                    onChange={(e) => setNewUsernameInput(e.target.value)}
                    placeholder="Masukkan username admin (contoh: NUBA)"
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-emerald-500 transition-all"
                  />
                </div>
                <p className="text-[11px] text-slate-500">
                  Username dapat diubah sesuai kebutuhan (minimal 3 karakter).
                </p>
              </div>

              {/* Garis Pembatas */}
              <div className="border-t border-slate-100 pt-3">
                <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 block mb-3">
                  Verifikasi & Pengaturan Sandi
                </span>
              </div>

              {/* Bagian 2: Sandi Saat Ini (Lama) */}
              <div className="space-y-1.5">
                <label className="block text-xs font-black text-slate-800">
                  Sandi Saat Ini (Sandi Lama) <span className="text-rose-500">* Wajib Diisi</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type="password"
                    required
                    value={oldPasswordInput}
                    onChange={(e) => setOldPasswordInput(e.target.value)}
                    placeholder="Ketikkan sandi administrator saat ini untuk konfirmasi"
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-medium text-slate-800 focus:ring-2 focus:ring-emerald-500 transition-all"
                  />
                </div>
              </div>

              {/* Bagian 3: Sandi Baru (Opsional jika hanya ganti username) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-black text-slate-800">
                      Sandi Baru <span className="text-slate-400 font-normal">(Kosongkan jika tidak diubah)</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="text-[10px] text-slate-400 hover:text-slate-600"
                    >
                      {showNewPassword ? 'Sembunyikan' : 'Tampilkan'}
                    </button>
                  </div>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <KeyRound className="w-4 h-4" />
                    </div>
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      minLength={6}
                      value={newPasswordInput}
                      onChange={(e) => setNewPasswordInput(e.target.value)}
                      placeholder="Minimal 6 karakter"
                      className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-medium text-slate-800 focus:ring-2 focus:ring-emerald-500 transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-black text-slate-800">
                    Konfirmasi Sandi Baru
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <KeyRound className="w-4 h-4" />
                    </div>
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      minLength={6}
                      value={confirmPasswordInput}
                      onChange={(e) => setConfirmPasswordInput(e.target.value)}
                      placeholder="Ketik ulang sandi baru"
                      className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-medium text-slate-800 focus:ring-2 focus:ring-emerald-500 transition-all"
                    />
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <div className="pt-4 flex items-center justify-end gap-3">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-black inline-flex items-center gap-2 shadow-md shadow-emerald-600/20 hover:shadow-emerald-600/30 transition-all cursor-pointer disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  <span>{isSubmitting ? 'Menyimpan Kredensial...' : 'Simpan Perubahan Akun & Sandi'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
