import React, { useState, useEffect } from 'react';
import { useTheme, ThemeColor } from '../../context/ThemeContext.js';
import { SCHOOL_BACKGROUND_URL } from '../common/Logo.js';
import { 
  Palette, 
  Upload, 
  Image as ImageIcon, 
  RotateCcw, 
  Check, 
  CheckCircle2, 
  AlertCircle, 
  Save, 
  Sparkles,
  School,
  Monitor,
  Smartphone,
  GraduationCap,
  Calendar,
  CalendarDays,
  ExternalLink,
  Trash2,
} from 'lucide-react';

interface ThemePreset {
  id: ThemeColor;
  name: string;
  desc: string;
  hex: string;
  secondary: string;
}

const THEME_PRESETS: ThemePreset[] = [
  { 
    id: 'emerald', 
    name: 'Emerald Hijau Madrasah', 
    desc: 'Warna identitas islami, asri, dan teduh khas madrasah', 
    hex: '#047857',
    secondary: '#10b981'
  },
  { 
    id: 'sapphire', 
    name: 'Sapphire Biru Modern', 
    desc: 'Nuansa teknologi tinggi, profesional, dan futuristik', 
    hex: '#2563eb',
    secondary: '#3b82f6'
  },
  { 
    id: 'violet', 
    name: 'Violet Ungu Prestasi', 
    desc: 'Elegan, kreatif, dan mencerminkan keunggulan mutu', 
    hex: '#7c3aed',
    secondary: '#8b5cf6'
  },
  { 
    id: 'amber', 
    name: 'Amber Emas Berwibawa', 
    desc: 'Hangat, penuh semangat, dan kehangatan keluarga sekolah', 
    hex: '#d97706',
    secondary: '#f59e0b'
  },
  { 
    id: 'ruby', 
    name: 'Ruby Merah Semangat', 
    desc: 'Berani, energetik, dan memacu kedisiplinan belajar', 
    hex: '#dc2626',
    secondary: '#ef4444'
  },
  { 
    id: 'onyx', 
    name: 'Onyx Abu Elegan', 
    desc: 'Desain monokrom minimalis, modern, dan bersih', 
    hex: '#475569',
    secondary: '#64748b'
  },
];

export const AdminBranding: React.FC = () => {
  const { 
    branding, 
    themeColor, 
    setThemeColor, 
    updateBranding, 
    uploadBrandingAsset, 
    resetBranding 
  } = useTheme();

  // State untuk tema warna
  const [selectedTheme, setSelectedTheme] = useState<ThemeColor>(themeColor);
  const [isSavingTheme, setIsSavingTheme] = useState(false);
  const [themeSuccessMsg, setThemeSuccessMsg] = useState<string | null>(null);

  // State untuk upload logo
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [logoSuccessMsg, setLogoSuccessMsg] = useState<string | null>(null);
  const [logoErrorMsg, setLogoErrorMsg] = useState<string | null>(null);

  // State untuk upload background
  const [bgFile, setBgFile] = useState<File | null>(null);
  const [bgPreview, setBgPreview] = useState<string | null>(null);
  const [isUploadingBg, setIsUploadingBg] = useState(false);
  const [bgSuccessMsg, setBgSuccessMsg] = useState<string | null>(null);
  const [bgErrorMsg, setBgErrorMsg] = useState<string | null>(null);

  // State nama sekolah
  const [schoolNameInput, setSchoolNameInput] = useState('');
  const [isSavingSchoolName, setIsSavingSchoolName] = useState(false);
  const [schoolNameSuccessMsg, setSchoolNameSuccessMsg] = useState<string | null>(null);

  // State tahun ajaran
  const [academicYearInput, setAcademicYearInput] = useState('');
  const [isSavingAcademicYear, setIsSavingAcademicYear] = useState(false);
  const [academicYearSuccessMsg, setAcademicYearSuccessMsg] = useState<string | null>(null);

  // Global reset state
  const [isResetting, setIsResetting] = useState(false);

  useEffect(() => {
    if (branding.school_name) {
      setSchoolNameInput(branding.school_name);
    }
  }, [branding.school_name]);

  useEffect(() => {
    if (branding.academic_year) {
      setAcademicYearInput(branding.academic_year);
    } else {
      setAcademicYearInput('Tahun Ajaran 2024/2025');
    }
  }, [branding.academic_year]);

  useEffect(() => {
    setSelectedTheme(themeColor);
  }, [themeColor]);

  // Handle memilih tema (langsung pratinjau lokal pada DOM)
  const handleSelectThemeLive = (color: ThemeColor) => {
    setSelectedTheme(color);
    setThemeColor(color); // Langsung ubah live agar admin melihat hasilnya seketika
  };

  // Simpan tema ke Supabase dengan validasi eksplisit
  const handleSaveTheme = async () => {
    setIsSavingTheme(true);
    setThemeSuccessMsg(null);
    try {
      const ok = await updateBranding({ theme_color: selectedTheme });
      if (ok) {
        setThemeSuccessMsg(`Tema warna "${selectedTheme.toUpperCase()}" berhasil divalidasi dan disimpan di database Supabase! Aktif di semua perangkat admin dan siswa.`);
        setTimeout(() => setThemeSuccessMsg(null), 4500);
      } else {
        alert('Gagal menyimpan tema warna ke Supabase. Periksa koneksi internet.');
      }
    } catch {
      alert('Terjadi kesalahan saat menyimpan tema warna.');
    } finally {
      setIsSavingTheme(false);
    }
  };

  // Handle seleksi file logo dengan local preview instan
  const handleLogoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setLogoErrorMsg('Ukuran file logo maksimal 5 MB.');
      return;
    }

    setLogoFile(file);
    setLogoErrorMsg(null);
    setLogoSuccessMsg(null);

    const reader = new FileReader();
    reader.onload = () => {
      setLogoPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Upload logo ke Supabase Storage
  const handleUploadLogo = async () => {
    if (!logoFile || !logoPreview) return;
    setIsUploadingLogo(true);
    setLogoSuccessMsg(null);
    setLogoErrorMsg(null);

    try {
      const url = await uploadBrandingAsset('logo', logoPreview, logoFile.type);
      if (url) {
        setLogoSuccessMsg('Logo Sekolah berhasil diunggah ke Supabase Storage dan langsung aktif di seluruh aplikasi!');
        setLogoFile(null);
        setLogoPreview(null);
        setTimeout(() => setLogoSuccessMsg(null), 5000);
      } else {
        setLogoErrorMsg('Gagal mengunggah logo ke Supabase Storage. Pastikan izin bucket aktif.');
      }
    } catch (err: any) {
      setLogoErrorMsg(err?.message || 'Terjadi kesalahan saat mengunggah file logo.');
    } finally {
      setIsUploadingLogo(false);
    }
  };

  // Handle seleksi file background dengan local preview instan
  const handleBgFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 8 * 1024 * 1024) {
      setBgErrorMsg('Ukuran foto background maksimal 8 MB.');
      return;
    }

    setBgFile(file);
    setBgErrorMsg(null);
    setBgSuccessMsg(null);

    const reader = new FileReader();
    reader.onload = () => {
      setBgPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Upload background banner ke Supabase Storage
  const handleUploadBg = async () => {
    if (!bgFile || !bgPreview) return;
    setIsUploadingBg(true);
    setBgSuccessMsg(null);
    setBgErrorMsg(null);

    try {
      const url = await uploadBrandingAsset('background', bgPreview, bgFile.type);
      if (url) {
        setBgSuccessMsg('Background Banner Sekolah berhasil diunggah ke Supabase Storage dan aktif!');
        setBgFile(null);
        setBgPreview(null);
        setTimeout(() => setBgSuccessMsg(null), 5000);
      } else {
        setBgErrorMsg('Gagal mengunggah background banner ke Supabase Storage.');
      }
    } catch (err: any) {
      setBgErrorMsg(err?.message || 'Terjadi kesalahan saat mengunggah background banner.');
    } finally {
      setIsUploadingBg(false);
    }
  };

  // Reset foto background ke bawaan
  const handleResetBg = async () => {
    if (!window.confirm('Kembalikan background ke foto gedung kampus sekolah resmi bawaan?')) return;
    setIsUploadingBg(true);
    setBgSuccessMsg(null);
    setBgErrorMsg(null);

    try {
      const ok = await updateBranding({ background_url: '' });
      if (ok) {
        setBgSuccessMsg('Background berhasil dikembalikan ke foto gedung sekolah resmi bawaan!');
        setBgFile(null);
        setBgPreview(null);
        setTimeout(() => setBgSuccessMsg(null), 4000);
      } else {
        setBgErrorMsg('Gagal mereset background banner.');
      }
    } catch (err: any) {
      setBgErrorMsg(err?.message || 'Terjadi kesalahan saat mereset background.');
    } finally {
      setIsUploadingBg(false);
    }
  };

  // Simpan Nama Sekolah
  const handleSaveSchoolName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!schoolNameInput.trim()) return;
    setIsSavingSchoolName(true);
    setSchoolNameSuccessMsg(null);

    try {
      const ok = await updateBranding({ school_name: schoolNameInput.trim() });
      if (ok) {
        setSchoolNameSuccessMsg('Nama sekolah berhasil disimpan di database Supabase.');
        setTimeout(() => setSchoolNameSuccessMsg(null), 3500);
      }
    } finally {
      setIsSavingSchoolName(false);
    }
  };

  // Simpan Tahun Ajaran
  const handleSaveAcademicYear = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!academicYearInput.trim()) return;
    setIsSavingAcademicYear(true);
    setAcademicYearSuccessMsg(null);

    try {
      const ok = await updateBranding({ academic_year: academicYearInput.trim() });
      if (ok) {
        setAcademicYearSuccessMsg('Teks tahun ajaran berhasil disimpan dan langsung aktif di seluruh sistem.');
        setTimeout(() => setAcademicYearSuccessMsg(null), 4000);
      } else {
        alert('Gagal menyimpan tahun ajaran.');
      }
    } catch {
      alert('Terjadi kesalahan saat menyimpan tahun ajaran.');
    } finally {
      setIsSavingAcademicYear(false);
    }
  };

  // Reset ke default
  const handleReset = async () => {
    if (!window.confirm('Apakah Anda yakin ingin mengembalikan logo, background, tahun ajaran, dan tema warna ke pengaturan bawaan awal sekolah?')) return;
    setIsResetting(true);
    try {
      const ok = await resetBranding();
      if (ok) {
        alert('Branding sekolah berhasil dikembalikan ke pengaturan default.');
        setLogoPreview(null);
        setBgPreview(null);
        setAcademicYearInput('Tahun Ajaran 2024/2025');
      }
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white rounded-3xl p-6 border border-slate-100 shadow-xs">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0 shadow-xs">
            <Palette className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-800">
                Pusat Personalisasi
              </span>
              <span className="text-xs text-slate-400 font-medium">Otomatis Sinkron Seluruh Perangkat</span>
            </div>
            <h1 className="text-xl font-black text-slate-900 mt-1">
              Tampilan, Logo & Tema Warna
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Ubah tema warna tombol/elemen, ganti logo resmi sekolah, dan pasang background gedung sekolah
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleReset}
          disabled={isResetting}
          className="px-4 py-2.5 bg-slate-50 hover:bg-rose-50 text-slate-600 hover:text-rose-700 border border-slate-200 hover:border-rose-200 rounded-2xl text-xs font-bold inline-flex items-center gap-2 transition-all cursor-pointer shrink-0"
        >
          <RotateCcw className="w-4 h-4" />
          <span>{isResetting ? 'Mereset...' : 'Reset ke Default Bawaan'}</span>
        </button>
      </div>

      {/* =========================================================================
          BAGIAN 1: PENGATURAN TEMA WARNA & VALIDASI SIMPAN
          ========================================================================= */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-100 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900">
                Tema Warna Aplikasi (Admin & Siswa)
              </h2>
              <p className="text-xs text-slate-500">
                Warna tombol, border, gradasi, dan aksen aktif di seluruh halaman admin dan dashboard siswa
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleSaveTheme}
            disabled={isSavingTheme}
            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black inline-flex items-center gap-2 shadow-md shadow-emerald-600/20 hover:shadow-emerald-600/30 transition-all cursor-pointer disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{isSavingTheme ? 'Menyimpan...' : 'Simpan & Terapkan Tema ke Supabase'}</span>
          </button>
        </div>

        {/* Validasi Banner Sukses */}
        {themeSuccessMsg && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs rounded-2xl flex items-center gap-3 animate-in fade-in">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <div>
              <p className="font-black text-sm">Validasi Simpan Berhasil!</p>
              <p className="font-medium text-emerald-700">{themeSuccessMsg}</p>
            </div>
          </div>
        )}

        {/* Grid Pilihan Warna */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {THEME_PRESETS.map((preset) => {
            const isSelected = selectedTheme === preset.id;
            return (
              <div
                key={preset.id}
                onClick={() => handleSelectThemeLive(preset.id)}
                className={`p-4 rounded-2xl border-2 transition-all cursor-pointer relative flex flex-col justify-between gap-3 ${
                  isSelected
                    ? 'border-emerald-500 ring-4 ring-emerald-500/15 bg-emerald-50/30 shadow-xs'
                    : 'border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50/50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-8 h-8 rounded-xl shadow-xs shrink-0 flex items-center justify-center text-white"
                      style={{ backgroundColor: preset.hex }}
                    >
                      {isSelected && <Check className="w-4 h-4 stroke-[3]" />}
                    </span>
                    <span
                      className="w-4 h-4 rounded-full border border-white shadow-2xs shrink-0"
                      style={{ backgroundColor: preset.secondary }}
                    />
                  </div>
                  {isSelected ? (
                    <span className="text-[10px] font-black text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full">
                      Sedang Dipilih
                    </span>
                  ) : (
                    <span className="text-[10px] font-medium text-slate-400">
                      Klik untuk Pilih
                    </span>
                  )}
                </div>

                <div>
                  <h3 className="text-xs font-black text-slate-900">
                    {preset.name}
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                    {preset.desc}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
          <span className="text-slate-600">
            <strong>Catatan:</strong> Memilih kartu di atas langsung mengubah tampilan seketika. Klik tombol <strong>"Simpan & Terapkan Tema ke Supabase"</strong> di kanan atas agar tema tersimpan permanen di database.
          </span>
          <button
            type="button"
            onClick={handleSaveTheme}
            disabled={isSavingTheme}
            className="text-xs font-bold text-emerald-700 hover:underline shrink-0"
          >
            Simpan Sekarang &rarr;
          </button>
        </div>
      </div>

      {/* =========================================================================
          BAGIAN 2: LOGO SEKOLAH (PWA, FAVICON & HEADER)
          ========================================================================= */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-100 shadow-xs space-y-6">
        <div className="flex items-center gap-3 pb-5 border-b border-slate-100">
          <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <ImageIcon className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-black text-slate-900">
              Logo Resmi Sekolah (PWA, Favicon & Seluruh Halaman)
            </h2>
            <p className="text-xs text-slate-500">
              Logo otomatis sinkron ke header admin, navbar siswa, logo PWA di perangkat, dan favicon browser
            </p>
          </div>
        </div>

        {/* Alert Logo */}
        {logoSuccessMsg && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs rounded-2xl flex items-center gap-3 animate-in fade-in">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <div>
              <p className="font-black text-sm">Berhasil Mengunggah!</p>
              <p className="font-medium text-emerald-700">{logoSuccessMsg}</p>
            </div>
          </div>
        )}

        {logoErrorMsg && (
          <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-2xl flex items-center gap-3 animate-in fade-in">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            <div>
              <p className="font-black text-sm">Gagal Mengunggah</p>
              <p className="font-medium text-rose-700">{logoErrorMsg}</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Logo Saat Ini */}
          <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
            <span className="text-xs font-black text-slate-700 block">
              Logo Aktif Saat Ini
            </span>
            <div className="flex items-center gap-4">
              <div className="w-24 h-24 rounded-2xl bg-white border border-slate-200 p-2 flex items-center justify-center shrink-0 shadow-xs">
                <img
                  src={branding.logo_url && branding.logo_url !== '/pwa-512x512.png' ? branding.logo_url : '/school-logo.png'}
                  alt="Logo Aktif"
                  className="w-full h-full object-contain drop-shadow-xs"
                />
              </div>
              <div className="text-xs text-slate-600 space-y-1">
                <p className="font-bold text-slate-800">Sedang Tampil di Sistem</p>
                <p className="text-[11px] text-slate-500">
                  Logo ini ditampilkan di Sidebar, Header, Form Presensi, dan PWA Siswa.
                </p>
              </div>
            </div>
          </div>

          {/* Area Unggah & Pratinjau Logo Baru */}
          <div className="p-5 bg-emerald-50/40 rounded-2xl border-2 border-dashed border-emerald-300/80 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-emerald-950 block">
                Pilih & Unggah Logo Baru
              </span>
              {logoPreview && (
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                  Pratinjau Terpilih
                </span>
              )}
            </div>

            <div className="flex items-center gap-4">
              {/* Kotak Preview Instan */}
              <div className="w-24 h-24 rounded-2xl bg-white border-2 border-emerald-200 p-2 flex items-center justify-center shrink-0 shadow-xs overflow-hidden">
                {logoPreview ? (
                  <img
                    src={logoPreview}
                    alt="Pratinjau Baru"
                    className="w-full h-full object-contain animate-in zoom-in-95"
                  />
                ) : (
                  <div className="text-center p-2 text-slate-300">
                    <ImageIcon className="w-8 h-8 mx-auto stroke-1" />
                    <span className="text-[9px] block mt-1">Belum ada file</span>
                  </div>
                )}
              </div>

              <div className="space-y-2 flex-1">
                <p className="text-[11px] text-slate-600">
                  Pilih file PNG transparan atau SVG (Maks. 5 MB).
                </p>

                <div className="flex flex-wrap items-center gap-2">
                  <label className="inline-flex items-center gap-2 px-4 py-2 bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 rounded-xl text-xs font-bold cursor-pointer transition-all shadow-xs">
                    <Upload className="w-3.5 h-3.5 text-slate-600" />
                    <span>Pilih Berkas File</span>
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/svg+xml,image/webp"
                      onChange={handleLogoFileChange}
                      className="hidden"
                    />
                  </label>

                  {logoPreview && (
                    <button
                      type="button"
                      onClick={handleUploadLogo}
                      disabled={isUploadingLogo}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black shadow-md shadow-emerald-600/20 transition-all cursor-pointer disabled:opacity-50"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>{isUploadingLogo ? 'Mengunggah...' : 'Simpan & Terapkan Logo'}</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* =========================================================================
          BAGIAN 3: BACKGROUND BANNER SEKOLAH
          ========================================================================= */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-100 shadow-xs space-y-6">
        <div className="flex items-center gap-3 pb-5 border-b border-slate-100">
          <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <School className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-black text-slate-900">
              Background Banner Sekolah
            </h2>
            <p className="text-xs text-slate-500">
              Foto gedung kampus sekolah yang aktif saat ini dan tampil di halaman Login Siswa, Login Admin, Registrasi Siswa, dan Desktop
            </p>
          </div>
        </div>

        {/* Alert Background */}
        {bgSuccessMsg && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs rounded-2xl flex items-center gap-3 animate-in fade-in">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <div>
              <p className="font-black text-sm">Pengaturan Background Berhasil Diperbarui!</p>
              <p className="font-medium text-emerald-700">{bgSuccessMsg}</p>
            </div>
          </div>
        )}

        {bgErrorMsg && (
          <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-2xl flex items-center gap-3 animate-in fade-in">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            <div>
              <p className="font-black text-sm">Gagal Mengunggah Background</p>
              <p className="font-medium text-rose-700">{bgErrorMsg}</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Card 1: Background Yang Sedang Aktif Saat Ini */}
          <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col justify-between space-y-4">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-slate-900 flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse inline-block" />
                  Background Aktif Saat Ini
                </span>
                {branding.background_url ? (
                  <span className="text-[10px] font-bold text-blue-800 bg-blue-100 px-2.5 py-0.5 rounded-full border border-blue-200">
                    Foto Kustom Admin
                  </span>
                ) : (
                  <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full border border-emerald-200">
                    Foto Resmi Bawaan (Default)
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-500">
                Berikut adalah gambar latar belakang yang saat ini aktif tampil di seluruh sistem.
              </p>
            </div>

            {/* Container Preview Gambar Aktif */}
            <div className="relative w-full h-44 sm:h-52 rounded-2xl overflow-hidden border border-slate-300 bg-slate-900 shadow-inner group">
              <img
                src={branding.background_url || SCHOOL_BACKGROUND_URL}
                alt="Background Sekolah Aktif"
                className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex items-end p-4">
                <div className="text-white">
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md bg-white/20 backdrop-blur-xs inline-block mb-1">
                    {branding.background_url ? 'Penyimpanan Cloud Supabase' : 'Gedung SMA Informatika Nurul Bayan'}
                  </span>
                  <p className="text-xs font-black drop-shadow-sm">
                    {branding.background_url ? 'Foto Custom Kampus Sekolah' : 'Pemandangan Kampus Utama SMA Informatika Nurul Bayan'}
                  </p>
                  <p className="text-[10px] text-slate-300 mt-0.5">
                    Aktif di: Login Siswa & Admin, Registrasi Siswa, Wallpaper Siswa Desktop
                  </p>
                </div>
              </div>
            </div>

            {/* Footer Status & Reset Tombol */}
            <div className="flex items-center justify-between pt-1">
              <span className="text-[11px] font-medium text-slate-500">
                {branding.background_url ? 'Tersimpan di Supabase Storage' : 'Menggunakan gambar foto bawaan sekolah'}
              </span>
              {branding.background_url && (
                <button
                  type="button"
                  onClick={handleResetBg}
                  disabled={isUploadingBg}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold cursor-pointer transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Kembalikan ke Default</span>
                </button>
              )}
            </div>
          </div>

          {/* Card 2: Pilih & Unggah Background Baru */}
          <div className="p-5 bg-amber-50/40 rounded-2xl border-2 border-dashed border-amber-300/80 flex flex-col justify-between space-y-4">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-amber-950 block">
                  Pilih & Unggah Background Baru
                </span>
                {bgPreview && (
                  <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-2.5 py-0.5 rounded-full border border-amber-200">
                    Pratinjau File Terpilih
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-600">
                Pilih foto pemandangan gedung sekolah terbaru (JPG, PNG, WEBP. Maks 8 MB, disarankan 1920x1080).
              </p>
            </div>

            {/* Kotak Preview File Baru */}
            <div className="relative w-full h-44 sm:h-52 rounded-2xl overflow-hidden border-2 border-amber-200 bg-white flex items-center justify-center shadow-inner">
              {bgPreview ? (
                <>
                  <img
                    src={bgPreview}
                    alt="Pratinjau Background Baru"
                    className="w-full h-full object-cover animate-in fade-in"
                  />
                  <div className="absolute top-2.5 right-2.5 bg-emerald-600 text-white text-[10px] font-black px-3 py-1 rounded-full shadow-md">
                    Siap Disimpan & Diterapkan
                  </div>
                </>
              ) : (
                <div className="text-center p-4 text-slate-400">
                  <Upload className="w-10 h-10 mx-auto stroke-1 mb-2 text-slate-400" />
                  <p className="text-xs font-bold text-slate-700">Belum ada file background baru dipilih</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">Klik tombol di bawah untuk memilih berkas foto baru</p>
                </div>
              )}
            </div>

            {/* Tombol Aksi Upload */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <label className="inline-flex items-center gap-2 px-4 py-2 bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 rounded-xl text-xs font-bold cursor-pointer transition-all shadow-xs">
                <Upload className="w-3.5 h-3.5 text-slate-600" />
                <span>Pilih Berkas Foto</span>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={handleBgFileChange}
                  className="hidden"
                />
              </label>

              {bgPreview && (
                <button
                  type="button"
                  onClick={handleUploadBg}
                  disabled={isUploadingBg}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>{isUploadingBg ? 'Mengunggah...' : 'Simpan & Terapkan Background'}</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* BAGIAN 4: PENGATURAN TAHUN AJARAN & IDENTITAS SEKOLAH     */}
      {/* ========================================================= */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-6">
        <div>
          <h2 className="text-base font-black text-slate-900 flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-black text-sm border border-purple-200">
              4
            </span>
            Pengaturan Tahun Ajaran & Identitas Sekolah
          </h2>
          <p className="text-xs text-slate-500 mt-1 ml-10">
            Sesuaikan teks tahun ajaran aktif dan nama resmi instansi sekolah yang akan ditampilkan di header navbar admin, sidebar, kartu identitas, dan laporan.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-2">
          {/* Card A: Pengaturan Tahun Ajaran */}
          <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-4 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-black text-slate-900 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-purple-600" />
                  Teks Tahun Ajaran Aktif
                </label>
                <span className="text-[10px] font-bold text-purple-700 bg-purple-100 px-2 py-0.5 rounded-full border border-purple-200">
                  Header & Sidebar
                </span>
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Teks ini tampil di badge navbar atas admin dan sidebar identitas sekolah.
              </p>

              {academicYearSuccessMsg && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2 animate-in fade-in">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span className="font-bold">{academicYearSuccessMsg}</span>
                </div>
              )}

              {/* Live Preview Pill */}
              <div className="p-3 bg-white rounded-xl border border-slate-200">
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block mb-1">
                  Pratinjau Tampilan di Navbar:
                </span>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-100 text-slate-800 rounded-full border border-slate-300 text-xs font-black">
                  <Calendar className="w-3.5 h-3.5 text-purple-600" />
                  <span>{academicYearInput || 'Tahun Ajaran 2024/2025'}</span>
                </div>
              </div>

              {/* Quick Presets */}
              <div className="space-y-1.5 pt-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Pilihan Cepat (Preset):
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    'Tahun Ajaran 2024/2025',
                    'Tahun Ajaran 2025/2026',
                    'Tahun Ajaran 2026/2027',
                    'T.A. 2024/2025 (Genap)',
                    'T.A. 2025/2026 (Ganjil)'
                  ].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setAcademicYearInput(preset)}
                      className={`text-[11px] font-bold px-2.5 py-1 rounded-lg border transition-all cursor-pointer ${
                        academicYearInput === preset
                          ? 'bg-purple-600 text-white border-purple-600 shadow-xs'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <form onSubmit={handleSaveAcademicYear} className="space-y-2 pt-3">
              <input
                type="text"
                required
                value={academicYearInput}
                onChange={(e) => setAcademicYearInput(e.target.value)}
                placeholder="Contoh: Tahun Ajaran 2024/2025"
                className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all shadow-2xs"
              />
              <button
                type="submit"
                disabled={isSavingAcademicYear}
                className="w-full py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-black transition-colors cursor-pointer shadow-xs disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                <Check className="w-3.5 h-3.5" />
                <span>{isSavingAcademicYear ? 'Menyimpan...' : 'Simpan Teks Tahun Ajaran'}</span>
              </button>
            </form>
          </div>

          {/* Card B: Pengaturan Nama Resmi Sekolah */}
          <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-4 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-black text-slate-900 flex items-center gap-2">
                  <School className="w-4 h-4 text-emerald-600" />
                  Nama Resmi Instansi / Sekolah
                </label>
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-200">
                  Identitas Utama
                </span>
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Nama sekolah yang tercantum pada judul sistem, header login, dan kartu absensi digital.
              </p>

              {schoolNameSuccessMsg && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2 animate-in fade-in">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span className="font-bold">{schoolNameSuccessMsg}</span>
                </div>
              )}

              {/* Live Preview Nama Sekolah */}
              <div className="p-3 bg-white rounded-xl border border-slate-200">
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block mb-1">
                  Pratinjau Nama Sekolah:
                </span>
                <p className="text-sm font-black text-slate-900 tracking-wide">
                  {schoolNameInput || 'SMA Informatika Nurul Bayan'}
                </p>
              </div>
            </div>

            <form onSubmit={handleSaveSchoolName} className="space-y-2 pt-3">
              <input
                type="text"
                required
                value={schoolNameInput}
                onChange={(e) => setSchoolNameInput(e.target.value)}
                placeholder="Contoh: SMA Informatika Nurul Bayan"
                className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all shadow-2xs"
              />
              <button
                type="submit"
                disabled={isSavingSchoolName}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black transition-colors cursor-pointer shadow-xs disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                <Check className="w-3.5 h-3.5" />
                <span>{isSavingSchoolName ? 'Menyimpan...' : 'Simpan Nama Sekolah'}</span>
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
