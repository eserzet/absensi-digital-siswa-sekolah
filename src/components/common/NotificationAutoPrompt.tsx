import React, { useState, useEffect } from 'react';
import { useNotification } from '../../context/NotificationContext.js';
import { 
  BellRing, 
  ShieldCheck, 
  X, 
  RefreshCw, 
  CheckCircle2, 
  Smartphone, 
  Laptop, 
  SlidersHorizontal, 
  AlertTriangle,
  HelpCircle
} from 'lucide-react';

/**
 * NotificationAutoPrompt — Modal panduan ramah saat izin notifikasi browser belum aktif.
 * Menggantikan instruksi 'gembok' lama yang membingungkan dengan panduan akurat
 * untuk Chrome Android, Aplikasi PWA di Beranda HP, dan Chrome/Edge Desktop.
 */
export const NotificationAutoPrompt: React.FC = () => {
  const { permission, isSupported, requestPermission, refreshPermission } = useNotification();
  const [isVisible, setIsVisible] = useState(false);
  const [isRequesting, setIsRequesting] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [showDeniedGuide, setShowDeniedGuide] = useState(false);
  const [recheckSuccess, setRecheckSuccess] = useState(false);

  // Active guide tab: 'chrome_mobile' | 'pwa_mobile' | 'desktop'
  const [guideTab, setGuideTab] = useState<'chrome_mobile' | 'pwa_mobile' | 'desktop'>('chrome_mobile');

  // Detect environment
  const isPWA = typeof window !== 'undefined' && (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  );

  const isSecure = typeof window !== 'undefined' && (
    window.location.protocol === 'https:' ||
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1'
  );

  useEffect(() => {
    // Detect default tab based on user device
    if (typeof window !== 'undefined') {
      const ua = navigator.userAgent.toLowerCase();
      const isMobile = /android|iphone|ipad|ipod/.test(ua);
      if (isPWA) {
        setGuideTab('pwa_mobile');
      } else if (isMobile) {
        setGuideTab('chrome_mobile');
      } else {
        setGuideTab('desktop');
      }
    }
  }, [isPWA]);

  useEffect(() => {
    // Jangan tampilkan jika:
    // - Browser tidak mendukung Notification API
    // - Izin sudah 'granted'
    if (!isSupported) return;
    if (permission === 'granted') {
      setIsVisible(false);
      return;
    }

    // Cek apakah user pernah menutup prompt dalam 12 jam terakhir
    const dismissedAt = localStorage.getItem('nb_notif_prompt_dismissed_at');
    if (dismissedAt) {
      const hours = (Date.now() - Number(dismissedAt)) / (1000 * 60 * 60);
      if (hours < 12) return;
    }

    // Jika permission 'denied', tampilkan guide setelah delay 1.5 detik
    if (permission === 'denied') {
      const timer = setTimeout(() => {
        setShowDeniedGuide(true);
        setIsVisible(true);
      }, 1500);
      return () => clearTimeout(timer);
    }

    // Tampilkan prompt standar minta izin setelah 1.5 detik
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, 1500);

    return () => clearTimeout(timer);
  }, [isSupported, permission]);

  const handleEnable = async () => {
    setIsRequesting(true);
    const granted = await requestPermission();
    setIsRequesting(false);

    if (granted) {
      setIsVisible(false);
    } else {
      setShowDeniedGuide(true);
    }
  };

  const handleRecheck = () => {
    setIsChecking(true);
    setTimeout(() => {
      const current = refreshPermission();
      setIsChecking(false);
      if (current === 'granted') {
        setRecheckSuccess(true);
        setTimeout(() => {
          setIsVisible(false);
        }, 1800);
      }
    }, 500);
  };

  const handleDismiss = () => {
    setIsVisible(false);
    // Simpan ke localStorage agar tidak mengganggu setiap kali buka halaman
    localStorage.setItem('nb_notif_prompt_dismissed_at', Date.now().toString());
  };

  if (!isVisible || permission === 'granted') return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-5 bg-black/65 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        role="dialog"
        aria-modal="true"
        className="relative w-full max-w-md max-h-[92vh] flex flex-col bg-white dark:bg-[#0d1322] rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden text-slate-800 dark:text-slate-100 animate-in zoom-in-95 duration-200"
      >
        {/* Accent bar */}
        <div className="h-1.5 bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 shrink-0" />

        {/* Tombol close */}
        <button
          type="button"
          onClick={handleDismiss}
          className="absolute top-3.5 right-3.5 p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer z-10"
          title="Tutup (nanti saja)"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="p-5 sm:p-6 overflow-y-auto space-y-4">
          {recheckSuccess ? (
            <div className="p-6 text-center space-y-3 animate-in zoom-in-95">
              <div className="w-14 h-14 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-300 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h3 className="text-base font-bold text-emerald-950 dark:text-emerald-200">
                Notifikasi Berhasil Diaktifkan!
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-300">
                Sekarang Anda akan menerima pemberitahuan jadwal absensi dan pengumuman sekolah langsung.
              </p>
            </div>
          ) : showDeniedGuide ? (
            /* ============================================================ */
            /* === DENIED STATE: Panduan Lengkap & Akurat Multi-Device === */
            /* ============================================================ */
            <>
              <div className="text-center space-y-1.5 pt-1">
                <div className="mx-auto w-12 h-12 rounded-2xl bg-amber-500/15 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <h3 className="text-base font-black text-slate-900 dark:text-white">
                  Izin Notifikasi Belum Aktif
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed px-2">
                  Browser mendeteksi izin notifikasi untuk situs ini dibatasi. 
                  Ikuti langkah mudah di bawah untuk mengaktifkannya:
                </p>
              </div>

              {/* Protocol Warning if not HTTPS */}
              {!isSecure && (
                <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 text-xs text-rose-800 dark:text-rose-200 flex items-start gap-2.5">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">Koneksi Belum Menggunakan HTTPS</span>
                    <p className="text-[11px] text-rose-700 dark:text-rose-300 mt-0.5">
                      Browser mewajibkan koneksi SSL aman (<b>https://</b>). Pastikan alamat web dimulai dengan <b>https://</b>.
                    </p>
                  </div>
                </div>
              )}

              {/* Guide Tabs */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-[11px] font-bold text-slate-600 dark:text-slate-300 px-0.5">
                  <span className="flex items-center gap-1">
                    <HelpCircle className="w-3.5 h-3.5 text-emerald-600" />
                    Pilih lokasi penggunaan:
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-1 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700">
                  <button
                    type="button"
                    onClick={() => setGuideTab('chrome_mobile')}
                    className={`py-2 px-1 text-center rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      guideTab === 'chrome_mobile'
                        ? 'bg-white dark:bg-[#0d1322] text-emerald-700 dark:text-emerald-400 shadow-xs border border-emerald-500/20'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <span>Chrome HP</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setGuideTab('pwa_mobile')}
                    className={`py-2 px-1 text-center rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      guideTab === 'pwa_mobile'
                        ? 'bg-white dark:bg-[#0d1322] text-emerald-700 dark:text-emerald-400 shadow-xs border border-emerald-500/20'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <span>App PWA</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setGuideTab('desktop')}
                    className={`py-2 px-1 text-center rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      guideTab === 'desktop'
                        ? 'bg-white dark:bg-[#0d1322] text-emerald-700 dark:text-emerald-400 shadow-xs border border-emerald-500/20'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <span>Laptop / PC</span>
                  </button>
                </div>

                {/* TAB 1: CHROME DI HP ANDROID */}
                {guideTab === 'chrome_mobile' && (
                  <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/80 space-y-2 text-xs text-slate-700 dark:text-slate-300 animate-in fade-in duration-150">
                    <div className="flex items-center gap-1.5 font-bold text-slate-900 dark:text-white pb-1 border-b border-slate-200 dark:border-slate-700">
                      <Smartphone className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Di Browser Google Chrome HP:</span>
                    </div>
                    <ol className="space-y-2 pl-0.5 list-none">
                      <li className="flex items-start gap-2">
                        <span className="w-4 h-4 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">1</span>
                        <span>Ketuk ikon <b>titik tiga (⋮)</b> di pojok kanan atas Chrome &rarr; pilih <b>Setelan (Settings)</b>.</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="w-4 h-4 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">2</span>
                        <span>Gulir ke bawah dan ketuk <b>Setelan Situs (Site Settings)</b> &rarr; <b>Notifikasi</b>.</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="w-4 h-4 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">3</span>
                        <span>
                          Periksa daftar <b>&quot;Diblokir&quot;</b> di bagian bawah. Jika situs ini tercantum, ketuk nama situsnya lalu pilih <b>&quot;Izinkan&quot;</b> atau <b>&quot;Hapus &amp; Reset&quot;</b>.
                        </span>
                      </li>
                    </ol>
                  </div>
                )}

                {/* TAB 2: APLIKASI PWA (TERPASANG DI LAYAR UTAMA) */}
                {guideTab === 'pwa_mobile' && (
                  <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/80 space-y-2 text-xs text-slate-700 dark:text-slate-300 animate-in fade-in duration-150">
                    <div className="flex items-center gap-1.5 font-bold text-slate-900 dark:text-white pb-1 border-b border-slate-200 dark:border-slate-700">
                      <Smartphone className="w-3.5 h-3.5 text-teal-600" />
                      <span>Di Aplikasi PWA (Layar Beranda HP):</span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      *Aplikasi di layar utama tidak memiliki address bar browser, ubah langsung dari pengaturan HP:
                    </p>
                    <ol className="space-y-2 pl-0.5 list-none">
                      <li className="flex items-start gap-2">
                        <span className="w-4 h-4 rounded-full bg-teal-600 text-white flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">1</span>
                        <span>Buka menu <b>Pengaturan HP (Settings)</b> bawaan perangkat Anda.</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="w-4 h-4 rounded-full bg-teal-600 text-white flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">2</span>
                        <span>Pilih menu <b>Aplikasi / Kelola Aplikasi</b> &rarr; cari aplikasi <b>SMASTIKA</b> atau <b>Chrome</b>.</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="w-4 h-4 rounded-full bg-teal-600 text-white flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">3</span>
                        <span>Ketuk menu <b>Izin / Notifikasi</b> &rarr; aktifkan sakelar <b>&quot;Izinkan Notifikasi&quot;</b>.</span>
                      </li>
                    </ol>
                  </div>
                )}

                {/* TAB 3: LAPTOP / PC */}
                {guideTab === 'desktop' && (
                  <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/80 space-y-2 text-xs text-slate-700 dark:text-slate-300 animate-in fade-in duration-150">
                    <div className="flex items-center gap-1.5 font-bold text-slate-900 dark:text-white pb-1 border-b border-slate-200 dark:border-slate-700">
                      <Laptop className="w-3.5 h-3.5 text-blue-600" />
                      <span>Di Browser Laptop / Komputer (Chrome/Edge):</span>
                    </div>
                    <ol className="space-y-2 pl-0.5 list-none">
                      <li className="flex items-start gap-2">
                        <span className="w-4 h-4 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">1</span>
                        <span>
                          Lihat address bar di atas, klik ikon <b>Setelan Situs / Tune (🎛️)</b> <SlidersHorizontal className="w-3 h-3 inline mx-0.5 text-slate-600 dark:text-slate-300" /> di sebelah kiri alamat web *(Google Chrome sudah mengganti ikon gembok dengan ikon ini)*.
                        </span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="w-4 h-4 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">2</span>
                        <span>Cari baris <b>Notifikasi</b> &rarr; ubah pilihannya menjadi <b>&quot;Izinkan&quot;</b>.</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="w-4 h-4 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">3</span>
                        <span>Klik tombol <b>Periksa Ulang Status</b> di bawah setelah mengubahnya.</span>
                      </li>
                    </ol>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="pt-2 space-y-2">
                <button
                  type="button"
                  onClick={handleRecheck}
                  disabled={isChecking}
                  className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-bold rounded-2xl flex items-center justify-center gap-2 active:scale-98 transition-all cursor-pointer shadow-sm"
                >
                  <RefreshCw className={`w-4 h-4 ${isChecking ? 'animate-spin' : ''}`} />
                  <span>{isChecking ? 'Memeriksa Status Izin...' : 'Saya Sudah Ubah — Periksa Ulang'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleDismiss}
                  className="w-full py-2 text-xs font-semibold text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors text-center cursor-pointer"
                >
                  Tutup / Nanti Saja
                </button>
              </div>
            </>
          ) : (
            /* ============================================================ */
            /* === DEFAULT STATE: Minta izin awal secara interaktif === */
            /* ============================================================ */
            <>
              <div className="text-center space-y-2">
                <div className="mx-auto w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/25">
                  <BellRing className="w-7 h-7 text-white animate-pulse" />
                </div>
                <h3 className="text-base font-black text-slate-900 dark:text-white">
                  Aktifkan Notifikasi Sekolah 🔔
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed px-1">
                  Dapatkan pengingat jadwal absensi, informasi libur, dan pengumuman sekolah langsung di perangkat Anda.
                </p>
              </div>

              {/* Benefit list */}
              <div className="space-y-2 py-1">
                {[
                  'Pengingat otomatis jam absensi masuk & pulang',
                  'Pemberitahuan pengumuman penting sekolah',
                  'Konfirmasi kehadiran berhasil secara real-time',
                ].map((text, i) => (
                  <div key={i} className="flex items-start gap-2.5 text-xs text-slate-700 dark:text-slate-300">
                    <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                    <span>{text}</span>
                  </div>
                ))}
              </div>

              {/* CTA Buttons */}
              <div className="space-y-2 pt-2">
                <button
                  type="button"
                  onClick={handleEnable}
                  disabled={isRequesting}
                  className="w-full py-3.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-sm font-black rounded-2xl flex items-center justify-center gap-2.5 active:scale-98 transition-all cursor-pointer shadow-md shadow-emerald-600/25 disabled:opacity-70"
                >
                  <BellRing className={`w-4 h-4 ${isRequesting ? 'animate-bounce' : ''}`} />
                  <span>{isRequesting ? 'Memproses Izin...' : 'Aktifkan Notifikasi Sekarang'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleDismiss}
                  className="w-full py-2 text-xs font-semibold text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors text-center cursor-pointer"
                >
                  Nanti saja, lewati
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
