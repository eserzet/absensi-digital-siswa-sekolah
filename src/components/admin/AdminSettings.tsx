import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api.js';
import { AttendanceSettings } from '../../types.js';
import { 
  Clock, 
  MapPin, 
  Save, 
  CheckCircle2, 
  AlertCircle,
  Database,
  Copy,
  Check,
  Server
} from 'lucide-react';

interface DatabaseStatusInfo {
  provider: string;
  is_connected: boolean;
  url: string | null;
  auth_key_type: string;
  primary_storage: string;
}

type SettingsTab = 'jadwal' | 'database';

interface AdminSettingsProps {
  onNavigateTab?: (tab: any) => void;
}

export const AdminSettings: React.FC<AdminSettingsProps> = () => {
  const [activeTab, setActiveTab] = useState<SettingsTab>('jadwal');
  const [isLoading, setIsLoading] = useState(true);

  // Jadwal state
  const [settings, setSettings] = useState<AttendanceSettings>({
    start_time: '',
    on_time_limit: '',
    end_time: '',
    gps_radius_meters: 100,
  });

  const [dbStatus, setDbStatus] = useState<DatabaseStatusInfo | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showSqlModal, setShowSqlModal] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setIsLoading(true);
    try {
      const res = await api.get<{
        success: boolean;
        settings: AttendanceSettings;
        database_status?: DatabaseStatusInfo;
      }>('/settings');

      if (res.success && res.settings) {
        setSettings({
          start_time: res.settings.start_time || '06:00',
          on_time_limit: res.settings.on_time_limit || '07:15',
          end_time: res.settings.end_time || res.settings.alpha_cutoff_time || '11:30',
          gps_radius_meters: res.settings.gps_radius_meters ?? 100,
        });
        if (res.database_status) setDbStatus(res.database_status);
      }
    } catch (err) {
      console.error('Failed to load settings', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSuccessMessage(null);
    setErrorMessage(null);

    try {
      const payload = {
        start_time: settings.start_time,
        on_time_limit: settings.on_time_limit,
        end_time: settings.end_time,
        gps_radius_meters: settings.gps_radius_meters,
      };

      const res = await api.put<{
        success: boolean;
        message: string;
        settings: AttendanceSettings;
      }>('/settings', payload);

      if (res.success) {
        if (res.settings) {
          setSettings({
            start_time: res.settings.start_time || payload.start_time,
            on_time_limit: res.settings.on_time_limit || payload.on_time_limit,
            end_time: res.settings.end_time || res.settings.alpha_cutoff_time || payload.end_time,
            gps_radius_meters: res.settings.gps_radius_meters ?? payload.gps_radius_meters,
          });
        }
        setSuccessMessage('Pengaturan jam & toleransi radius absensi berhasil disimpan ke Supabase.');
        setTimeout(() => setSuccessMessage(null), 3500);
      } else {
        setErrorMessage(res.message || 'Gagal menyimpan pengaturan.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Terjadi kendala saat menyimpan pengaturan.');
    } finally {
      setIsSaving(false);
    }
  };

  const sqlQuickCopy = `-- SKEMA TABEL UTAMA SUPABASE
-- Silakan jalankan di Supabase SQL Editor
-- File lengkap: supabase-schema.sql

-- 1. users
CREATE TABLE IF NOT EXISTS public.users (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'student'
);

-- 2. students
CREATE TABLE IF NOT EXISTS public.students (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  username TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  class_name TEXT NOT NULL,
  gender TEXT NOT NULL,
  whatsapp TEXT NOT NULL,
  profile_photo_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. attendance_records
CREATE TABLE IF NOT EXISTS public.attendance_records (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL REFERENCES public.students(id),
  student_name TEXT,
  class_name TEXT,
  date DATE NOT NULL,
  time TIME NOT NULL,
  timestamp TIMESTAMPTZ DEFAULT now(),
  status TEXT NOT NULL,
  photo_url TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  distance_meters NUMERIC,
  is_valid_location BOOLEAN DEFAULT true,
  notes TEXT
);

-- 4. attendance_settings
CREATE TABLE IF NOT EXISTS public.attendance_settings (
  id TEXT PRIMARY KEY,
  start_time TEXT DEFAULT '06:00',
  on_time_limit TEXT DEFAULT '07:15',
  end_time TEXT DEFAULT '08:30',
  gps_radius_meters NUMERIC DEFAULT 100,
  school_qr_code TEXT DEFAULT 'NUBA-SMART-ATTENDANCE-2026-NURUL-BAYAN'
);`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(sqlQuickCopy);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2500);
  };

  return (
    <div className="space-y-6">
      
      {/* Header Banner */}
      <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-xs">
        <span className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider block">
          Pusat Kontrol Waktu & Lokasi
        </span>
        <h1 className="text-xl font-black text-slate-900 mt-0.5">
          Pengaturan Jam & Toleransi Absensi
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Kelola jadwal presensi masuk, batas toleransi tepat waktu, jam pulang, dan radius GPS siswa
        </p>

        {/* Sub-Navigation Tabs */}
        <div className="flex flex-wrap gap-2 mt-5 pt-4 border-t border-slate-100">
          <button
            type="button"
            onClick={() => setActiveTab('jadwal')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-2 ${
              activeTab === 'jadwal'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Jadwal & Radius GPS</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('database')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-2 ${
              activeTab === 'database'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            <span>Status Database Supabase</span>
          </button>
        </div>
      </div>

      {/* Global Alerts */}
      {successMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-2xl flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span className="font-bold">{successMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-2xl flex items-center gap-2 animate-in fade-in">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* TAB 1: JADWAL & RADIUS GPS */}
      {activeTab === 'jadwal' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-100 shadow-xs space-y-6">
          <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900">
                Waktu Batas Absensi Pagi & Radius GPS
              </h2>
              <p className="text-xs text-slate-500">
                Data tersimpan di tabel <code className="font-mono text-emerald-600">attendance_settings</code> Supabase
              </p>
            </div>
          </div>

          {isLoading ? (
            <div className="space-y-6 animate-pulse py-2">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {[1, 2, 3].map((idx) => (
                  <div key={idx} className="space-y-2">
                    <div className="h-4 bg-slate-200 rounded w-1/2" />
                    <div className="h-10 bg-slate-100 rounded-xl" />
                    <div className="h-3 bg-slate-100 rounded w-3/4" />
                  </div>
                ))}
              </div>
              <div className="pt-4 border-t border-slate-100 space-y-3">
                <div className="h-4 bg-slate-200 rounded w-1/3" />
                <div className="h-8 bg-slate-100 rounded-xl" />
              </div>
              <div className="pt-4 border-t border-slate-100 flex justify-end">
                <div className="h-10 w-36 bg-slate-200 rounded-xl" />
              </div>
            </div>
          ) : (
            <form onSubmit={handleSaveSettings} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {/* Jam Buka Absen */}
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-slate-700">
                    Jam Buka Presensi Pagi
                  </label>
                  <div className="relative">
                    <input
                      type="time"
                      required
                      value={settings.start_time}
                      onChange={(e) => setSettings({ ...settings, start_time: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Waktu siswa mulai dapat melakukan scan QR
                  </p>
                </div>

              {/* Batas Tepat Waktu */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700">
                  Batas Maksimal Tepat Waktu
                </label>
                <div className="relative">
                  <input
                    type="time"
                    required
                    value={settings.on_time_limit}
                    onChange={(e) => setSettings({ ...settings, on_time_limit: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <p className="text-[11px] text-slate-400">
                  Lewat dari waktu ini akan dihitung <span className="text-amber-600 font-bold">Terlambat</span>
                </p>
              </div>

              {/* Jam Tutup Absen */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700">
                  Batas Akhir Presensi (Tutup)
                </label>
                <div className="relative">
                  <input
                    type="time"
                    required
                    value={settings.end_time}
                    onChange={(e) => setSettings({ ...settings, end_time: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <p className="text-[11px] text-slate-400">
                  Lewat dari waktu ini QR scanner siswa akan ditutup
                </p>
              </div>
            </div>

            {/* Radius Toleransi GPS */}
            <div className="pt-4 border-t border-slate-100 space-y-2">
              <label className="block text-xs font-bold text-slate-700 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Toleransi Radius GPS Sekolah (Meter)</span>
                </span>
                <span className="text-emerald-700 font-black text-sm">
                  {settings.gps_radius_meters} Meter
                </span>
              </label>

              <div className="flex items-center gap-4">
                <input
                  type="range"
                  min={20}
                  max={500}
                  step={10}
                  value={settings.gps_radius_meters}
                  onChange={(e) => setSettings({ ...settings, gps_radius_meters: Number(e.target.value) })}
                  className="flex-1 accent-emerald-600 cursor-pointer"
                />
                <input
                  type="number"
                  min={10}
                  max={1000}
                  value={settings.gps_radius_meters}
                  onChange={(e) => setSettings({ ...settings, gps_radius_meters: Number(e.target.value) })}
                  className="w-24 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 text-center"
                />
              </div>
              <p className="text-[11px] text-slate-400">
                Jarak maksimal siswa dari titik koordinat sekolah agar absensi dinyatakan sah / valid.
              </p>
            </div>

            <div className="pt-4 border-t border-slate-100 flex justify-end">
              <button
                type="submit"
                disabled={isSaving}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold inline-flex items-center gap-2 shadow-xs transition-colors cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>{isSaving ? 'Menyimpan...' : 'Simpan Pengaturan'}</span>
              </button>
            </div>
          </form>
          )}
        </div>
      )}

      {/* TAB 2: STATUS DATABASE SUPABASE */}
      {activeTab === 'database' && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
                  dbStatus?.is_connected ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'
                }`}>
                  <Database className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-black text-sm text-slate-900">
                      Database Cloud Utama: Supabase
                    </h3>
                    {dbStatus?.is_connected ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                        Aktif (Penyimpanan Utama)
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-100 text-amber-800">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                        Menunggu Kredensial
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {dbStatus?.is_connected 
                      ? `Terhubung ke: ${dbStatus.url || 'Supabase PostgreSQL Cloud'} (Semua data disimpan di Supabase)`
                      : 'Sistem siap disambungkan ke Supabase. Data lokal hanya bertindak sebagai cadangan sementara.'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowSqlModal(true)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl inline-flex items-center justify-center gap-1.5 shrink-0 transition-colors cursor-pointer"
              >
                <Server className="w-3.5 h-3.5 text-emerald-400" />
                <span>Skrip SQL Supabase</span>
              </button>
            </div>

            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 text-xs space-y-2">
              <p className="font-bold text-slate-800">
                Cara Menyambungkan Database Supabase:
              </p>
              <ol className="list-decimal list-inside space-y-1 text-slate-600 pl-1">
                <li>Buka dashboard Supabase (<span className="font-mono text-emerald-700">supabase.com</span>) dan buat Project baru.</li>
                <li>Buka menu <strong>SQL Editor</strong> di Supabase, lalu salin dan jalankan skrip dari tombol <strong>"Skrip SQL Supabase"</strong> di atas.</li>
                <li>Buka <strong>Project Settings → API</strong> di Supabase, salin <strong>Project URL</strong> dan <strong>service_role key</strong>.</li>
                <li>Atur variabel environment: <code className="font-mono bg-white px-1.5 py-0.5 rounded border border-slate-200">SUPABASE_URL</code> dan <code className="font-mono bg-white px-1.5 py-0.5 rounded border border-slate-200">SUPABASE_SERVICE_ROLE_KEY</code>.</li>
              </ol>
            </div>
          </div>
        </div>
      )}

      {/* SQL Script Viewer Modal */}
      {showSqlModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl border border-slate-100 overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Database className="w-5 h-5 text-emerald-600" />
                <div>
                  <h3 className="font-black text-sm text-slate-900">
                    Skema SQL Supabase (PostgreSQL)
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Daftar tabel: users, students, attendance_records, schedules, announcements, holidays, location, settings
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowSqlModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-800 transition-colors text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-5 overflow-y-auto flex-1 bg-slate-900 text-slate-200 font-mono text-xs leading-relaxed">
              <pre className="whitespace-pre-wrap">{sqlQuickCopy}</pre>
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
              <span className="text-[11px] text-slate-500">
                File skema lengkap tersimpan di <code className="font-bold text-slate-700">/supabase-schema.sql</code>
              </span>
              <button
                type="button"
                onClick={copyToClipboard}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
              >
                {copiedSql ? (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Tersalin ke Clipboard!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>Salin Seluruh Skrip SQL</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
