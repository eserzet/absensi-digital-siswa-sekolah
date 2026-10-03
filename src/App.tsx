import React, { useState, useEffect } from 'react';
import { Student, Announcement } from './types.js';
import { api, getAuthToken, getSavedRole, removeAuthToken } from './lib/api.js';

// Student Components
import { StudentLogin } from './components/student/StudentLogin.js';
import { StudentRegister } from './components/student/StudentRegister.js';
import { StudentHome } from './components/student/StudentHome.js';
import { StudentMapel } from './components/student/StudentMapel.js';
import { StudentRiwayat } from './components/student/StudentRiwayat.js';
import { StudentProfile } from './components/student/StudentProfile.js';
import { StudentBottomNav, StudentNavTab } from './components/student/StudentBottomNav.js';
import { StudentScanModal } from './components/student/StudentScanModal.js';
import { StudentTopNav } from './components/student/StudentTopNav.js';
import { StudentAnnouncementsModal } from './components/student/StudentAnnouncementsModal.js';

// Admin Components
import { AdminLogin } from './components/admin/AdminLogin.js';
import { AdminLayout } from './components/admin/AdminLayout.js';

// PWA Components
import { PWAInstallPopupModal } from './components/pwa/PWAInstallPopupModal.js';
import { PWAUpdateToast } from './components/pwa/PWAUpdateToast.js';
import { OfflineIndicator } from './components/pwa/OfflineIndicator.js';
import { NotificationToastContainer } from './components/common/NotificationToastContainer.js';
import { NotificationAutoPrompt } from './components/common/NotificationAutoPrompt.js';
import { usePWAUpdate } from './hooks/usePWAUpdate.js';
import { useTheme } from './context/ThemeContext.js';
import { useNotification } from './context/NotificationContext.js';

const SCHOOL_BACKGROUND_URL = "https://lh3.googleusercontent.com/gps-cs-s/AHRPTWlZgDiiO_xVpoBKAxOBMuTUF8i5lp6PRZ5a3z4PQ_E0phwWgtL2dnDMh2o0rXmVFouUea_b0YZOeBf7FWMSqse14hP-NBvUEHpBAiOuqVfmpumFCAFsiKsQnNJrCiQWXnTgTlQqWAUH4mP6=s1360-w1360-h1020-rw";

export default function App() {
  const { branding } = useTheme();
  const { sendNotification } = useNotification();
  const prevAnnouncementsLengthRef = React.useRef<number | null>(null);

  // Silent background auto-update listener for PWA and code changes
  usePWAUpdate();

  const [role, setRole] = useState<'student' | 'admin'>('student');
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  
  // Student state
  const [currentStudent, setCurrentStudent] = useState<Student | null>(null);
  const [studentTab, setStudentTab] = useState<StudentNavTab>('home');
  const [isScanModalOpen, setIsScanModalOpen] = useState<boolean>(false);
  const [initialScannedQr, setInitialScannedQr] = useState<string | null>(null);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [isAnnouncementsModalOpen, setIsAnnouncementsModalOpen] = useState<boolean>(false);

  // Catch deep-link QR parameter from native phone camera (e.g. ?qr=CODE or #qr=CODE or /attendance#qr=CODE)
  useEffect(() => {
    try {
      let qrCode: string | null = null;

      // 1. Check Query Parameter (?qr=...)
      const params = new URLSearchParams(window.location.search);
      const queryQr = params.get('qr');
      if (queryQr) {
        qrCode = queryQr.trim();
      }

      // 2. Check Hash Fragment (#qr=... or #/attendance#qr=...)
      if (!qrCode && window.location.hash) {
        const hashMatch = window.location.hash.match(/[#&?]qr=([^&#]+)/);
        if (hashMatch) {
          qrCode = decodeURIComponent(hashMatch[1]).trim();
        }
      }

      if (qrCode) {
        sessionStorage.setItem('pending_qr_code', qrCode);
        const cleanUrl = window.location.pathname;
        window.history.replaceState({}, '', cleanUrl);
      }
    } catch (e) {
      console.warn('Failed parsing query/hash params:', e);
    }
  }, []);

  // When student is authenticated, check if there was a pending QR scanned from native camera
  useEffect(() => {
    if (currentStudent) {
      const pending = sessionStorage.getItem('pending_qr_code');
      if (pending) {
        sessionStorage.removeItem('pending_qr_code');
        setInitialScannedQr(pending);
        setIsScanModalOpen(true);
      }
    }
  }, [currentStudent]);

  // Admin state
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState<boolean>(false);

  // App loading state
  const [isInitializing, setIsInitializing] = useState<boolean>(true);

  // Local storage helpers for instant, persistent announcement reads
  const getLocalReadIds = (studentId: string): string[] => {
    try {
      const stored = localStorage.getItem(`nuba_read_announcements_${studentId}`);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  };

  const saveLocalReadId = (studentId: string, announcementId: string) => {
    try {
      const current = getLocalReadIds(studentId);
      if (!current.includes(announcementId)) {
        current.push(announcementId);
        localStorage.setItem(`nuba_read_announcements_${studentId}`, JSON.stringify(current));
      }
    } catch (err) {
      console.warn('Failed to save read state to localStorage:', err);
    }
  };

  const saveAllLocalReadIds = (studentId: string, announcementIds: string[]) => {
    try {
      const current = getLocalReadIds(studentId);
      const combined = Array.from(new Set([...current, ...announcementIds]));
      localStorage.setItem(`nuba_read_announcements_${studentId}`, JSON.stringify(combined));
    } catch (err) {
      console.warn('Failed to save read state to localStorage:', err);
    }
  };

  // Load announcements for student with local cache merge and real-time 30s polling
  useEffect(() => {
    if (!currentStudent) return;

    let isMounted = true;

    const fetchStudentAnnouncements = () => {
      if (document.hidden) return;
      const localReadIds = getLocalReadIds(currentStudent.id);

      api.get<{ success: boolean; announcements: Announcement[] }>(
        `/announcements?student_id=${encodeURIComponent(currentStudent.id)}`
      )
        .then((res) => {
          if (!isMounted) return;
          if (res.success && Array.isArray(res.announcements)) {
            const incoming = res.announcements;
            const merged = incoming.map((a) => ({
              ...a,
              is_read: Boolean(a.is_read || localReadIds.includes(a.id)),
            }));

            // Trigger notification when a new announcement arrives
            if (prevAnnouncementsLengthRef.current !== null && incoming.length > prevAnnouncementsLengthRef.current) {
              const newest = incoming[0];
              if (newest && !localReadIds.includes(newest.id)) {
                sendNotification(
                  `📢 ${newest.title}`,
                  newest.content.substring(0, 90) + (newest.content.length > 90 ? '...' : ''),
                  'announcement',
                  () => setIsAnnouncementsModalOpen(true)
                );
              }
            }
            prevAnnouncementsLengthRef.current = incoming.length;
            setAnnouncements(merged);
          }
        })
        .catch((err) => {
          console.warn('Gagal memuat pengumuman:', err);
        });
    };

    // Immediate initial load
    fetchStudentAnnouncements();

    // Background auto-polling every 30 seconds
    const interval = setInterval(fetchStudentAnnouncements, 30000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [currentStudent?.id]);

  const unreadCount = announcements.filter((a) => !a.is_read).length;

  const handleMarkReadAnnouncement = async (id: string) => {
    if (!currentStudent) return;

    // 1. Instantly update React state
    setAnnouncements((prev) =>
      prev.map((a) => (a.id === id ? { ...a, is_read: true } : a))
    );

    // 2. Instantly persist to localStorage
    saveLocalReadId(currentStudent.id, id);

    // 3. Persist to server backend & disk
    try {
      await api.post(`/announcements/${id}/read`, { student_id: currentStudent.id });
    } catch (err) {
      console.warn('Gagal sinkron status baca ke server:', err);
    }
  };

  const handleMarkAllReadAnnouncements = async () => {
    if (!currentStudent) return;
    const allIds = announcements.map((a) => a.id);

    // 1. Instantly update React state
    setAnnouncements((prev) => prev.map((a) => ({ ...a, is_read: true })));

    // 2. Instantly persist to localStorage
    saveAllLocalReadIds(currentStudent.id, allIds);

    // 3. Persist to server backend & disk
    try {
      await api.post('/announcements/read-all', { student_id: currentStudent.id });
    } catch (err) {
      console.warn('Gagal sinkron tandai semua baca ke server:', err);
    }
  };

  // Check persisted session on load
  useEffect(() => {
    const initAuth = async () => {
      const token = getAuthToken();
      const savedRole = getSavedRole();

      if (!token) {
        setIsInitializing(false);
        return;
      }

      try {
        const res = await api.get<{
          success: boolean;
          authenticated?: boolean;
          role?: string;
          student?: Student;
          admin?: { username: string };
        }>('/auth/me');

        if (res.success && res.authenticated) {
          if (res.role === 'admin' || res.admin) {
            setRole('admin');
            setIsAdminAuthenticated(true);
          } else if (res.student) {
            setCurrentStudent(res.student);
            setRole('student');
          } else {
            removeAuthToken();
            setRole('student');
          }
        } else {
          removeAuthToken();
          setRole('student');
        }
      } catch (_err) {
        removeAuthToken();
        setRole('student');
      } finally {
        setIsInitializing(false);
      }
    };

    initAuth();
  }, []);

  const handleLogout = () => {
    removeAuthToken();
    setCurrentStudent(null);
    setIsAdminAuthenticated(false);
    setStudentTab('home');
  };

  if (isInitializing) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4 text-white font-sans">
        <div className="w-12 h-12 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4" />
        <span className="text-xs font-bold text-slate-300 tracking-wider">
          Memuat Absensi Digital Nurul Bayan...
        </span>
      </div>
    );
  }

  // ================= ADMIN FLOW =================
  if (role === 'admin') {
    if (!isAdminAuthenticated) {
      return (
        <>
          <NotificationToastContainer />
          <PWAUpdateToast />
          <OfflineIndicator />
          <PWAInstallPopupModal />

          <AdminLogin
            onLoginSuccess={() => setIsAdminAuthenticated(true)}
            onNavigateStudent={() => {
              setRole('student');
              setAuthMode('login');
            }}
          />
        </>
      );
    }

    return (
      <>
        <NotificationToastContainer />
        <PWAUpdateToast />
        <OfflineIndicator />
        <PWAInstallPopupModal />

        <AdminLayout onLogout={handleLogout} />
      </>
    );
  }

  // ================= STUDENT FLOW =================
  if (!currentStudent) {
    if (authMode === 'register') {
      return (
        <>
          <NotificationToastContainer />
          <PWAUpdateToast />
          <OfflineIndicator />
          <PWAInstallPopupModal />

          <StudentRegister
            onRegisterSuccess={(student) => {
              setCurrentStudent(student);
            }}
            onNavigateLogin={() => setAuthMode('login')}
          />
        </>
      );
    }

    return (
      <>
        <NotificationToastContainer />
        <PWAUpdateToast />
        <OfflineIndicator />
        <PWAInstallPopupModal />

        <StudentLogin
          onLoginSuccess={(student) => {
            setCurrentStudent(student);
          }}
          onNavigateRegister={() => setAuthMode('register')}
          onNavigateAdmin={() => setRole('admin')}
        />
      </>
    );
  }

  // Authenticated Student App Shell (Mobile First Container)
  return (
    <>
      <NotificationToastContainer />
      <NotificationAutoPrompt />
      <PWAUpdateToast />
      <OfflineIndicator />
      <PWAInstallPopupModal />

      <div className="min-h-screen min-h-[100dvh] w-full bg-slate-50 dark:bg-[#080c14] flex flex-col font-sans antialiased text-slate-900 dark:text-slate-100 selection:bg-emerald-500 selection:text-white relative overflow-x-hidden p-0">
        {/* Fullscreen responsive container */}
        <div className="w-full flex-1 bg-white dark:bg-[#080c14] flex flex-col relative z-10 transition-colors">
        
        {/* Top Navbar: School Logo + Name on left, Announcements Bell + ThemeToggle + Profile Logo on right */}
        <StudentTopNav
          student={currentStudent}
          activeTab={studentTab}
          unreadAnnouncementsCount={unreadCount}
          onOpenAnnouncements={() => setIsAnnouncementsModalOpen(true)}
          onNavigateProfile={() => setStudentTab('profile')}
          onNavigateHome={() => setStudentTab('home')}
        />

        {/* Main Content Body: Generous top padding (pt-24 to lg:pt-36) so cards are never cramped or mepet with fixed top navbar on desktop */}
        <main className="flex-1 w-full max-w-4xl lg:max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 sm:pt-28 md:pt-32 lg:pt-36 pb-28 sm:pb-32 lg:pb-36 overflow-y-auto">
          {studentTab === 'home' && (
            <StudentHome
              student={currentStudent}
              announcements={announcements}
              onOpenAnnouncements={() => setIsAnnouncementsModalOpen(true)}
              onOpenScan={() => setIsScanModalOpen(true)}
              onNavigateTab={(tab) => setStudentTab(tab as StudentNavTab)}
              onNavigateMapel={() => setStudentTab('mapel')}
              onNavigateRiwayat={() => setStudentTab('riwayat')}
            />
          )}

          {studentTab === 'mapel' && (
            <StudentMapel student={currentStudent} />
          )}

          {studentTab === 'riwayat' && (
            <StudentRiwayat />
          )}

          {studentTab === 'profile' && (
            <StudentProfile
              student={currentStudent}
              onUpdateStudent={(updated) => setCurrentStudent(updated)}
              onLogout={handleLogout}
            />
          )}
        </main>

        {/* Persistent Student Bottom Navigation across all devices (mobile, tablet, desktop) with 5 items */}
        <StudentBottomNav
          activeTab={studentTab}
          onSelectTab={(tab) => setStudentTab(tab)}
          onTabChange={(tab) => setStudentTab(tab)}
          onOpenScan={() => setIsScanModalOpen(true)}
        />

        {/* Floating Scan QR & Photo Attendance Modal */}
        <StudentScanModal
          isOpen={isScanModalOpen}
          initialScannedQr={initialScannedQr}
          onClose={() => {
            setIsScanModalOpen(false);
            setInitialScannedQr(null);
          }}
          onSuccess={() => {
            setStudentTab('riwayat');
            setInitialScannedQr(null);
          }}
          onAttendanceSuccess={() => {
            setStudentTab('riwayat');
            setInitialScannedQr(null);
          }}
          onNavigateRiwayat={() => {
            setStudentTab('riwayat');
            setInitialScannedQr(null);
          }}
        />

        {/* Modal Pengumuman Sekolah (Dibuka dari Lonceng Navbar atau Tombol Beranda) */}
        <StudentAnnouncementsModal
          isOpen={isAnnouncementsModalOpen}
          announcements={announcements}
          onMarkRead={handleMarkReadAnnouncement}
          onMarkAllRead={handleMarkAllReadAnnouncements}
          onClose={() => setIsAnnouncementsModalOpen(false)}
        />

      </div>
    </div>
    </>
  );
}
