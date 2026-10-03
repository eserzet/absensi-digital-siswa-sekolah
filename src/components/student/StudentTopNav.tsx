import React from 'react';
import { Bell, User } from 'lucide-react';
import { Student } from '../../types.js';
import { SCHOOL_LOGO_URL } from '../common/Logo.js';
import { PWAInstallButton } from '../pwa/PWAInstallButton.js';
import { useTheme } from '../../context/ThemeContext.js';
import { ThemeToggle } from '../common/ThemeToggle.js';

interface StudentTopNavProps {
  student: Student | null;
  activeTab?: string;
  unreadAnnouncementsCount?: number;
  onOpenAnnouncements: () => void;
  onNavigateProfile: () => void;
  onNavigateHome?: () => void;
}

export const StudentTopNav: React.FC<StudentTopNavProps> = ({
  student,
  activeTab,
  unreadAnnouncementsCount = 0,
  onOpenAnnouncements,
  onNavigateProfile,
  onNavigateHome,
}) => {
  const { branding } = useTheme();

  return (
    <header className="fixed top-0 left-0 right-0 z-40 w-full bg-white/95 dark:bg-[#0b101e]/95 backdrop-blur-md border-b border-slate-200/90 dark:border-slate-800 transition-colors shadow-2xs">
      <div className="max-w-5xl w-full mx-auto px-4 sm:px-6 py-2.5 sm:py-3 flex items-center justify-between gap-3">
        
        {/* LEFT: School Logo & School Name */}
        <button
          type="button"
          onClick={onNavigateHome}
          aria-label="Kembali ke Beranda"
          className="school-brand-btn flex items-center gap-2.5 sm:gap-3 text-left cursor-pointer focus:outline-none select-none shrink-0"
        >
          <div className="w-10 h-10 sm:w-11 sm:h-11 flex items-center justify-center shrink-0 bg-transparent border-0 p-0 shadow-none">
            <img
              src={branding.logo_url && branding.logo_url !== '/pwa-512x512.png' ? branding.logo_url : SCHOOL_LOGO_URL}
              alt={branding.school_name || "Logo SMA Informatika Nurul Bayan"}
              className="w-full h-full object-contain pointer-events-none select-none filter-none"
              loading="eager"
              crossOrigin="anonymous"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                if (target.src !== SCHOOL_LOGO_URL && !target.src.endsWith(SCHOOL_LOGO_URL)) {
                  target.src = SCHOOL_LOGO_URL;
                } else {
                  target.src =
                    'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="48" fill="%23047857"/><circle cx="50" cy="50" r="38" fill="%23ffffff"/><text x="50" y="58" font-size="24" font-family="sans-serif" font-weight="bold" fill="%23047857" text-anchor="middle">NB</text></svg>';
                }
              }}
            />
          </div>
          <div className="flex flex-col min-w-0 leading-none justify-center">
            <span className="text-[10px] sm:text-[11px] font-bold text-emerald-800 dark:text-emerald-400 uppercase tracking-wider truncate">
              SMA Informatika
            </span>
            <span className="school-brand-title text-xs sm:text-sm font-black text-slate-900 dark:text-white tracking-tight truncate mt-0.5">
              {branding.school_name ? branding.school_name.replace(/^SMA Informatika\s*/i, '') || 'Nurul Bayan' : 'Nurul Bayan'}
            </span>
          </div>
        </button>

        {/* RIGHT: Theme Toggle (Lampu), Announcements Bell, Install PWA, & Profile Icon */}
        <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
          {/* Tombol Install PWA */}
          <PWAInstallButton variant="compact" />

          {/* Saklar Lampu (Light/Dark Mode Toggle) */}
          <ThemeToggle />

          {/* Lonceng Pengumuman */}
          <button
            type="button"
            onClick={onOpenAnnouncements}
            aria-label="Lihat Pengumuman Sekolah"
            title="Pengumuman Sekolah"
            className="relative w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-white dark:bg-[#0d1322] hover:bg-emerald-50 dark:hover:bg-slate-800 border-2 border-slate-200 dark:border-slate-800 hover:border-emerald-300 dark:hover:border-emerald-500/50 text-slate-600 dark:text-slate-300 hover:text-emerald-700 dark:hover:text-emerald-400 flex items-center justify-center transition-all cursor-pointer active:scale-95 focus:outline-none shadow-2xs"
          >
            <Bell className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
            {unreadAnnouncementsCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 min-w-4 px-1 items-center justify-center rounded-full bg-rose-500 text-[10px] font-black text-white ring-2 ring-white dark:ring-[#0b101e] animate-in zoom-in-50">
                {unreadAnnouncementsCount > 9 ? '9+' : unreadAnnouncementsCount}
              </span>
            )}
          </button>

          {/* Logo / Foto Profil Siswa (Bulat) */}
          {student && (
            <button
              type="button"
              onClick={onNavigateProfile}
              aria-label="Buka Profil Siswa"
              title="Buka Profil Siswa"
              className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full overflow-hidden border-2 transition-all cursor-pointer active:scale-95 flex items-center justify-center p-0.5 focus:outline-none shadow-2xs ${
                activeTab === 'profile'
                  ? 'border-emerald-600 dark:border-emerald-400 ring-2 ring-emerald-500/20 bg-emerald-50 dark:bg-emerald-950/40'
                  : 'border-slate-200 dark:border-slate-800 hover:border-emerald-400 dark:hover:border-emerald-400 bg-white dark:bg-[#0d1322]'
              }`}
            >
              {student.profile_photo_url ? (
                <img
                  src={student.profile_photo_url}
                  alt={student.full_name}
                  className="w-full h-full object-cover rounded-full"
                />
              ) : (
                <div className="w-full h-full rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 flex items-center justify-center">
                  <User className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
                </div>
              )}
            </button>
          )}
        </div>

      </div>
    </header>
  );
};
