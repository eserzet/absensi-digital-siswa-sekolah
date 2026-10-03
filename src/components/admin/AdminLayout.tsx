import React, { useState } from 'react';
import { AdminSidebar, AdminMenuTab } from './AdminSidebar.js';
import { AdminDashboard } from './AdminDashboard.js';
import { AdminAbsensiLive } from './AdminAbsensiLive.js';
import { AdminRekap } from './AdminRekap.js';
import { AdminUserManagement } from './AdminUserManagement.js';
import { AdminHolidays } from './AdminHolidays.js';
import { AdminAnnouncements } from './AdminAnnouncements.js';
import { AdminSettings } from './AdminSettings.js';
import { AdminBranding } from './AdminBranding.js';
import { AdminSecurity } from './AdminSecurity.js';
import { AdminLocation } from './AdminLocation.js';
import { AdminQRCode } from './AdminQRCode.js';
import { AdminScheduleUpload } from './AdminScheduleUpload.js';
import { AdminMonitoringKelas } from './AdminMonitoringKelas.js';
import { ConfirmModal } from '../common/ConfirmModal.js';
import { Logo } from '../common/Logo.js';
import { PWAInstallButton } from '../pwa/PWAInstallButton.js';
import { ThemeToggle } from '../common/ThemeToggle.js';
import { NotificationBellPrompt } from '../common/NotificationBellPrompt.js';
import { useTheme } from '../../context/ThemeContext.js';
import { Menu, ShieldCheck, User } from 'lucide-react';

interface AdminLayoutProps {
  onLogout: () => void;
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({ onLogout }) => {
  const { branding } = useTheme();
  const [activeTab, setActiveTab] = useState<AdminMenuTab>('dashboard');
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  return (
    <div className="min-h-screen bg-white dark:bg-[#080c14] text-slate-900 dark:text-slate-100 flex font-sans transition-colors">
      
      {/* Sidebar Navigation */}
      <AdminSidebar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        onLogout={() => setShowLogoutConfirm(true)}
        isMobileOpen={isMobileOpen}
        onCloseMobile={() => setIsMobileOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 lg:pl-72 flex flex-col min-h-screen">
        
        {/* Top Navbar */}
        <header className="sticky top-0 z-30 bg-white/95 dark:bg-[#0b101e]/95 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 px-3.5 sm:px-8 py-3 flex items-center justify-between shadow-2xs transition-colors">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setIsMobileOpen(true)}
              className="p-2 text-slate-600 dark:text-slate-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 hover:text-emerald-800 dark:hover:text-emerald-400 rounded-xl lg:hidden cursor-pointer transition-colors shrink-0"
              title="Buka Menu Navigasi"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="min-w-0">
              <span className="text-[10px] sm:text-[11px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider block truncate">
                {branding.academic_year || 'Tahun Ajaran 2024/2025'}
              </span>
              <span className="text-xs sm:text-sm font-black text-slate-800 dark:text-white block truncate">
                {branding.school_name || 'SMA Informatika Nurul Bayan'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
            <NotificationBellPrompt variant="button" />
            <PWAInstallButton variant="compact" />
            <ThemeToggle />
            <div className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 bg-emerald-50/80 dark:bg-[#080c14] border border-emerald-100/90 dark:border-emerald-500/30 rounded-xl shadow-2xs">
              <div className="w-6 h-6 sm:w-7 sm:h-7 flex items-center justify-center shrink-0 select-none bg-transparent">
                <Logo size="sm" showText={false} />
              </div>
              <span className="text-[11px] sm:text-xs font-bold text-slate-800 dark:text-slate-200 hidden xs:inline">
                Admin
              </span>
            </div>
          </div>
        </header>

        {/* Content View Container with padding bottom for mobile bottom nav */}
        <main className="flex-1 p-3.5 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto pb-24 lg:pb-8">
          {activeTab === 'dashboard' && <AdminDashboard onNavigateTab={setActiveTab} />}
          {activeTab === 'absensi' && <AdminAbsensiLive />}
          {activeTab === 'monitoring_kelas' && <AdminMonitoringKelas />}
          {activeTab === 'rekap' && <AdminRekap />}
          {activeTab === 'mapel' && <AdminScheduleUpload />}
          {activeTab === 'users' && <AdminUserManagement />}
          {activeTab === 'holidays' && <AdminHolidays />}
          {activeTab === 'announcements' && <AdminAnnouncements />}
          {activeTab === 'settings' && <AdminSettings onNavigateTab={setActiveTab} />}
          {activeTab === 'admin_branding' && <AdminBranding />}
          {activeTab === 'admin_security' && <AdminSecurity />}
          {activeTab === 'location' && <AdminLocation />}
          {activeTab === 'qr' && <AdminQRCode />}
        </main>

        {/* Mobile Bottom Navigation Bar: Thumb-friendly Quick Access */}
        <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-[#0d1322]/95 backdrop-blur-lg border-t border-slate-200/90 dark:border-slate-800 px-2 py-1.5 flex items-center justify-around shadow-lg lg:hidden safe-area-bottom">
          <button
            type="button"
            onClick={() => setActiveTab('dashboard')}
            className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all cursor-pointer ${
              activeTab === 'dashboard'
                ? 'text-emerald-700 dark:text-emerald-400 font-black'
                : 'text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            <div className={`p-1 rounded-lg ${activeTab === 'dashboard' ? 'bg-emerald-50 dark:bg-emerald-950/40' : ''}`}>
              <Menu className="w-4 h-4 hidden" />
              <svg className="w-5 h-5" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect width="7" height="9" x="3" y="3" rx="1"/><rect width="7" height="5" x="14" y="3" rx="1"/><rect width="7" height="9" x="14" y="12" rx="1"/><rect width="7" height="5" x="3" y="16" rx="1"/></svg>
            </div>
            <span className="text-[10px] tracking-tight">Beranda</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('absensi')}
            className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all cursor-pointer ${
              activeTab === 'absensi'
                ? 'text-emerald-700 dark:text-emerald-400 font-black'
                : 'text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            <div className={`p-1 rounded-lg ${activeTab === 'absensi' ? 'bg-emerald-50 dark:bg-emerald-950/40' : ''}`}>
              <svg className="w-5 h-5" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            </div>
            <span className="text-[10px] tracking-tight">Presensi</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('rekap')}
            className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all cursor-pointer ${
              activeTab === 'rekap'
                ? 'text-emerald-700 dark:text-emerald-400 font-black'
                : 'text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            <div className={`p-1 rounded-lg ${activeTab === 'rekap' ? 'bg-emerald-50 dark:bg-emerald-950/40' : ''}`}>
              <svg className="w-5 h-5" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" x2="18" y1="20" y2="10"/><line x1="12" x2="12" y1="20" y2="4"/><line x1="6" x2="6" y1="20" y2="14"/></svg>
            </div>
            <span className="text-[10px] tracking-tight">Rekap</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('users')}
            className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all cursor-pointer ${
              activeTab === 'users'
                ? 'text-emerald-700 dark:text-emerald-400 font-black'
                : 'text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            <div className={`p-1 rounded-lg ${activeTab === 'users' ? 'bg-emerald-50 dark:bg-emerald-950/40' : ''}`}>
              <svg className="w-5 h-5" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
            </div>
            <span className="text-[10px] tracking-tight">Siswa</span>
          </button>

          <button
            type="button"
            onClick={() => setIsMobileOpen(true)}
            className="flex flex-col items-center justify-center py-1 px-2.5 rounded-xl text-slate-500 dark:text-slate-400 hover:text-emerald-700 dark:hover:text-emerald-400 transition-all cursor-pointer"
          >
            <div className="p-1 rounded-lg">
              <Menu className="w-5 h-5" />
            </div>
            <span className="text-[10px] tracking-tight">Menu</span>
          </button>
        </nav>
      </div>

      {/* Logout Confirm Modal */}
      <ConfirmModal
        isOpen={showLogoutConfirm}
        title="Konfirmasi Keluar Admin"
        message="Apakah Anda yakin ingin keluar dari sesi administrator sekolah?"
        confirmLabel="Ya, Keluar Sesi"
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
