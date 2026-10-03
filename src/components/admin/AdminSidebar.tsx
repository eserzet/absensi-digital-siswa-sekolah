import React from 'react';
import { Logo } from '../common/Logo.js';
import { useTheme } from '../../context/ThemeContext.js';
import { 
  LayoutDashboard, 
  Clock, 
  BarChart3, 
  History, 
  Users, 
  CalendarDays, 
  Megaphone, 
  Settings, 
  MapPin, 
  QrCode, 
  LogOut, 
  ShieldCheck,
  BookOpen,
  Palette,
  KeyRound,
  GraduationCap,
  X
} from 'lucide-react';

export type AdminMenuTab =
  | 'dashboard'
  | 'absensi'
  | 'monitoring_kelas'
  | 'rekap'
  | 'mapel'
  | 'users'
  | 'holidays'
  | 'announcements'
  | 'settings'
  | 'admin_branding'
  | 'admin_security'
  | 'location'
  | 'qr';

interface AdminSidebarProps {
  activeTab: AdminMenuTab;
  onSelectTab: (tab: AdminMenuTab) => void;
  onLogout: () => void;
  isMobileOpen: boolean;
  onCloseMobile: () => void;
}

export const AdminSidebar: React.FC<AdminSidebarProps> = ({
  activeTab,
  onSelectTab,
  onLogout,
  isMobileOpen,
  onCloseMobile,
}) => {
  const { branding } = useTheme();

  const MAIN_MENU = [
    { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { key: 'absensi', label: 'Absensi Hari Ini', icon: Clock },
    { key: 'monitoring_kelas', label: 'Monitoring Per Kelas', icon: GraduationCap },
    { key: 'rekap', label: 'Rekap Kehadiran', icon: BarChart3 },
    { key: 'mapel', label: 'Jadwal Mata Pelajaran', icon: BookOpen },
    { key: 'users', label: 'Manajemen User', icon: Users },
    { key: 'holidays', label: 'Manajemen Hari Libur', icon: CalendarDays },
    { key: 'announcements', label: 'Pengumuman', icon: Megaphone },
  ] as const;

  const SETTINGS_MENU = [
    { key: 'settings', label: 'Pengaturan Jam Absensi', icon: Clock },
    { key: 'admin_branding', label: 'Tampilan & Tema Warna', icon: Palette },
    { key: 'admin_security', label: 'Akun & Sandi Admin', icon: KeyRound },
    { key: 'location', label: 'Lokasi Sekolah (GPS)', icon: MapPin },
    { key: 'qr', label: 'QR Sekolah', icon: QrCode },
  ] as const;

  return (
    <>
      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 z-40 bg-slate-900/30 backdrop-blur-xs lg:hidden"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-72 bg-white dark:bg-[#0d1322] backdrop-blur-xl text-slate-800 dark:text-slate-100 flex flex-col justify-between border-r border-slate-200 dark:border-slate-800 shadow-xl transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header: Transparent, no white or gray background on darkmode */}
        <div className="p-5 sm:p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-transparent dark:bg-transparent">
          <div className="flex items-center gap-3">
            <div className="shrink-0 select-none bg-transparent filter drop-shadow-sm">
              <Logo size="md" showText={false} />
            </div>
            <div>
              <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-widest block">
                Panel Admin • {branding.academic_year || 'TA 2024/2025'}
              </span>
              <h2 className="text-sm font-black text-slate-900 dark:text-white leading-tight">
                {branding.school_name || "SMA Informatika Nurul Bayan"}
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={onCloseMobile}
            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg lg:hidden cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Menu Navigation */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          {/* Menu Utama */}
          <div className="space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800/80 dark:text-emerald-400/80 px-3 pb-1 block">
              Menu Utama
            </span>

            {MAIN_MENU.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.key;
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => {
                    onSelectTab(item.key);
                    onCloseMobile();
                  }}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all text-left cursor-pointer border ${
                    isActive
                      ? 'bg-linear-to-r from-emerald-600 to-emerald-700 text-white shadow-md shadow-emerald-600/25 border-emerald-500 font-extrabold'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-emerald-50/70 dark:hover:bg-slate-800/80 hover:text-emerald-800 dark:hover:text-emerald-300 border-transparent hover:border-emerald-100/80 dark:hover:border-slate-700'
                  }`}
                >
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-emerald-600 dark:text-emerald-400'}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>

          {/* Pengaturan & Personalisasi (Navbar Terpisah) */}
          <div className="space-y-1 pt-2 border-t border-slate-200 dark:border-slate-800">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800/80 dark:text-emerald-400/80 px-3 pb-1 block">
              Pengaturan & Sistem
            </span>

            {SETTINGS_MENU.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.key;
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => {
                    onSelectTab(item.key);
                    onCloseMobile();
                  }}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all text-left cursor-pointer border ${
                    isActive
                      ? 'bg-linear-to-r from-emerald-600 to-emerald-700 text-white shadow-md shadow-emerald-600/25 border-emerald-500 font-extrabold'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-emerald-50/70 dark:hover:bg-slate-800/80 hover:text-emerald-800 dark:hover:text-emerald-300 border-transparent hover:border-emerald-100/80 dark:hover:border-slate-700'
                  }`}
                >
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-emerald-600 dark:text-emerald-400'}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Footer Admin User & Logout */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-[#080c14]">
          <div className="flex items-center justify-between p-2.5 rounded-xl bg-white dark:bg-[#0d1322] border border-slate-200 dark:border-slate-800 shadow-2xs mb-2">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 flex items-center justify-center shrink-0 select-none bg-transparent">
                <Logo size="sm" showText={false} />
              </div>
              <div className="leading-tight">
                <span className="text-xs font-bold block text-slate-800 dark:text-white">Admin Petugas</span>
                <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">Super Administrator</span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onLogout}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-bold text-rose-600 dark:text-rose-400 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-rose-200/60 dark:border-rose-900/60 hover:border-rose-300 rounded-xl transition-all cursor-pointer shadow-2xs"
          >
            <LogOut className="w-4 h-4" />
            <span>Keluar Sesi Admin</span>
          </button>
        </div>
      </aside>
    </>
  );
};
