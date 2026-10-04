import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  Download, 
  X, 
  Smartphone, 
  Zap, 
  MapPin, 
  Camera, 
  CheckCircle2, 
  Share2, 
  PlusSquare,
  Sparkles,
  ShieldCheck,
  Laptop,
  MoreVertical,
  HelpCircle,
  Bell
} from 'lucide-react';
import { usePWAInstall } from '../../hooks/usePWAInstall.js';
import { useTheme } from '../../context/ThemeContext.js';
import { Logo } from '../common/Logo.js';

interface PWAInstallPopupModalProps {
  forceOpen?: boolean;
  onClose?: () => void;
}

export const PWAInstallPopupModal: React.FC<PWAInstallPopupModalProps> = ({
  forceOpen = false,
  onClose,
}) => {
  const { isInstallable, isInstalled, isIOS, isAndroid, install } = usePWAInstall();
  const { branding } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);
  const [installSuccess, setInstallSuccess] = useState(false);

  // Active guide tab: 'android' | 'ios' | 'desktop'
  const [activeTab, setActiveTab] = useState<'android' | 'ios' | 'desktop'>('android');

  useEffect(() => {
    if (isIOS) {
      setActiveTab('ios');
    } else if (isAndroid) {
      setActiveTab('android');
    } else {
      setActiveTab('desktop');
    }
  }, [isIOS, isAndroid]);

  // Auto pop-up logic when user visits the app on browser (not installed yet)
  useEffect(() => {
    if (forceOpen) {
      setIsOpen(true);
      return;
    }

    // If already installed in standalone PWA, never show popup
    if (isInstalled) {
      setIsOpen(false);
      return;
    }

    // Check if dismissed recently (e.g. within the last 12 hours)
    const dismissedAt = localStorage.getItem('smastika_pwa_popup_dismissed');
    if (dismissedAt) {
      const hoursSince = (Date.now() - Number(dismissedAt)) / (1000 * 60 * 60);
      if (hoursSince < 12) {
        return;
      }
    }

    // Trigger popup smoothly after 1.8 seconds so initial page render is calm
    const timer = setTimeout(() => {
      setIsOpen(true);
    }, 1800);

    return () => clearTimeout(timer);
  }, [forceOpen, isInstalled]);

  if (!isOpen || isInstalled) {
    return null;
  }

  const handleDismiss = () => {
    setIsOpen(false);
    localStorage.setItem('smastika_pwa_popup_dismissed', Date.now().toString());
    if (onClose) onClose();
  };

  const handleInstallClick = async () => {
    if (isInstallable) {
      setIsInstalling(true);
      try {
        const success = await install();
        if (success) {
          setInstallSuccess(true);
          setTimeout(() => {
            setIsOpen(false);
            if (onClose) onClose();
          }, 2500);
        }
      } finally {
        setIsInstalling(false);
      }
    }
  };

  const schoolTitle = branding.school_name || 'SMA Informatika Nurul Bayan';

  const modalContent = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        role="dialog"
        aria-modal="true"
        aria-labelledby="pwa-popup-title"
        className="relative w-full max-w-md max-h-[85vh] max-h-[85dvh] flex flex-col rounded-3xl bg-white dark:bg-[#0d1322] shadow-2xl border border-emerald-100 dark:border-emerald-500/20 overflow-hidden text-slate-800 dark:text-slate-100 animate-in zoom-in-95 duration-200"
      >
        {/* Decorative Header Banner */}
        <div className="relative shrink-0 bg-gradient-to-br from-emerald-800 via-emerald-700 to-teal-800 p-4 sm:p-5 text-white overflow-hidden">
          {/* Subtle background glow */}
          <div className="absolute -right-8 -bottom-8 w-32 h-32 bg-emerald-400/20 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute -left-8 -top-8 w-32 h-32 bg-teal-300/15 rounded-full blur-xl pointer-events-none" />

          {/* Close button */}
          <button
            type="button"
            onClick={handleDismiss}
            aria-label="Tutup Notifikasi"
            className="absolute top-3.5 right-3.5 p-2 rounded-full bg-black/25 hover:bg-black/40 text-white transition-colors cursor-pointer z-10"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex items-start gap-3.5 sm:gap-4">
            <div className="relative shrink-0 flex items-center justify-center select-none filter drop-shadow-md">
              <Logo size="md" showText={false} />
            </div>

            <div className="min-w-0 pr-6">
              <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-black/25 border border-white/20 text-emerald-200 text-[10px] font-bold uppercase tracking-wider mb-1">
                <ShieldCheck className="w-3 h-3 text-emerald-300" />
                <span>Aplikasi Resmi Sekolah</span>
              </div>
              <h2 id="pwa-popup-title" className="text-base sm:text-lg font-black tracking-tight text-white leading-snug truncate">
                Install App Absensi
              </h2>
              <p className="text-[11px] sm:text-xs text-white/90 font-medium truncate mt-0.5">
                {schoolTitle}
              </p>
            </div>
          </div>
        </div>

        {/* Content Body (Scrollable if screen is small) */}
        <div className="p-4 sm:p-5 space-y-3.5 flex-1 overflow-y-auto overscroll-contain">
          {installSuccess ? (
            <div className="p-6 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-center space-y-2.5 animate-in zoom-in-95">
              <div className="w-14 h-14 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-600 dark:text-emerald-300 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h3 className="text-base font-bold text-emerald-950 dark:text-emerald-200">
                Pemasangan Berhasil!
              </h3>
              <p className="text-xs text-emerald-800 dark:text-emerald-300 leading-relaxed">
                App Absensi telah sukses terpasang di Layar Utama HP / Desktop Anda. Sekarang Anda dapat membuka langsung dari ikon aplikasi di beranda!
              </p>
            </div>
          ) : (
            <>
              {/* If browser supports 1-click native install */}
              {isInstallable && (
                <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-500/15 via-teal-500/15 to-emerald-500/10 border-2 border-emerald-500/40 dark:border-emerald-500/40 space-y-2.5">
                  <div className="flex items-center gap-1.5 text-emerald-800 dark:text-emerald-300 font-bold text-xs">
                    <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <span>Browser Mendukung Instalasi Langsung</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleInstallClick}
                    disabled={isInstalling}
                    className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-sm shadow-md shadow-emerald-900/20 active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                  >
                    <Download className={`w-4 h-4 ${isInstalling ? 'animate-bounce' : ''}`} />
                    <span>{isInstalling ? 'Memproses Pemasangan...' : 'Klik Di Sini Untuk Langsung Install'}</span>
                  </button>
                  <p className="text-[10px] text-emerald-700 dark:text-emerald-400 text-center font-medium">
                    Ketuk tombol di atas lalu pilih <b>"Install"</b> pada dialog browser.
                  </p>
                </div>
              )}

              {/* Guide Tabs (Android / iOS / PC) */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <HelpCircle className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span>Panduan Pasang di Perangkat:</span>
                  </h4>
                  <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                    Pilih perangkat Anda:
                  </span>
                </div>

                {/* Tab Buttons */}
                <div className="grid grid-cols-3 gap-1.5 p-1 rounded-2xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
                  <button
                    type="button"
                    onClick={() => setActiveTab('android')}
                    className={`py-2 px-1 text-center rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1 ${
                      activeTab === 'android'
                        ? 'bg-white dark:bg-[#0d1322] text-emerald-700 dark:text-emerald-400 shadow-xs border border-emerald-500/20'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <span>Android</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab('ios')}
                    className={`py-2 px-1 text-center rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1 ${
                      activeTab === 'ios'
                        ? 'bg-white dark:bg-[#0d1322] text-emerald-700 dark:text-emerald-400 shadow-xs border border-emerald-500/20'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <span>iPhone (iOS)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab('desktop')}
                    className={`py-2 px-1 text-center rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1 ${
                      activeTab === 'desktop'
                        ? 'bg-white dark:bg-[#0d1322] text-emerald-700 dark:text-emerald-400 shadow-xs border border-emerald-500/20'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <span>Laptop / PC</span>
                  </button>
                </div>

                {/* TAB 1: ANDROID (Google Chrome) */}
                {activeTab === 'android' && (
                  <div className="p-3.5 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-200/80 dark:border-emerald-800/60 space-y-2.5 animate-in fade-in duration-150">
                    <div className="flex items-center gap-2 text-xs font-bold text-emerald-900 dark:text-emerald-200">
                      <Smartphone className="w-4 h-4 text-emerald-600" />
                      <span>Cara Pasang di Android (Google Chrome):</span>
                    </div>

                    <ol className="space-y-2 text-xs text-slate-700 dark:text-slate-300">
                      <li className="flex items-start gap-2.5">
                        <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                          1
                        </span>
                        <span>
                          Buka website ini menggunakan aplikasi <b>Google Chrome</b>.
                        </span>
                      </li>
                      <li className="flex items-start gap-2.5">
                        <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                          2
                        </span>
                        <span>
                          Ketuk ikon <b>titik tiga (⋮)</b> <MoreVertical className="w-3.5 h-3.5 inline mx-0.5 text-slate-600 dark:text-slate-300" /> di pojok kanan atas browser.
                        </span>
                      </li>
                      <li className="flex items-start gap-2.5">
                        <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                          3
                        </span>
                        <span>
                          Pilih menu <b>"Install aplikasi"</b> atau <b>"Tambahkan ke Layar Utama"</b> (<i>Add to Home Screen</i>).
                        </span>
                      </li>
                      <li className="flex items-start gap-2.5">
                        <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                          4
                        </span>
                        <span>
                          Ketuk <b>"Install"</b> atau <b>"Tambah"</b>. Ikon SMASTIKA akan langsung muncul di beranda HP Anda!
                        </span>
                      </li>
                    </ol>
                  </div>
                )}

                {/* TAB 2: IPHONE / IPAD (Safari) */}
                {activeTab === 'ios' && (
                  <div className="p-3.5 rounded-2xl bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-800/60 space-y-2.5 animate-in fade-in duration-150">
                    <div className="flex items-center gap-2 text-xs font-bold text-amber-950 dark:text-amber-200">
                      <Smartphone className="w-4 h-4 text-amber-700 dark:text-amber-400" />
                      <span>Cara Pasang di iPhone / iPad (Safari):</span>
                    </div>

                    <ol className="space-y-2 text-xs text-slate-700 dark:text-slate-300">
                      <li className="flex items-start gap-2.5">
                        <span className="w-5 h-5 rounded-full bg-amber-600 text-white flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                          1
                        </span>
                        <span>
                          Pastikan Anda membuka website ini melalui browser resmi <b>Safari</b>.
                        </span>
                      </li>
                      <li className="flex items-start gap-2.5">
                        <span className="w-5 h-5 rounded-full bg-amber-600 text-white flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                          2
                        </span>
                        <span>
                          Ketuk tombol <b>Bagikan (Share)</b> <Share2 className="w-3.5 h-3.5 inline mx-0.5 text-amber-700 dark:text-amber-400" /> yang berada di bilah bawah layar Safari.
                        </span>
                      </li>
                      <li className="flex items-start gap-2.5">
                        <span className="w-5 h-5 rounded-full bg-amber-600 text-white flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                          3
                        </span>
                        <span>
                          Gulir ke bawah pada menu yang muncul, lalu pilih <b>"Tambah ke Layar Utama"</b> (<i>Add to Home Screen</i> <PlusSquare className="w-3.5 h-3.5 inline mx-0.5 text-amber-700 dark:text-amber-400" />).
                        </span>
                      </li>
                      <li className="flex items-start gap-2.5">
                        <span className="w-5 h-5 rounded-full bg-amber-600 text-white flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                          4
                        </span>
                        <span>
                          Ketuk <b>"Tambah"</b> (<i>Add</i>) di pojok kanan atas. Selesai!
                        </span>
                      </li>
                    </ol>
                  </div>
                )}

                {/* TAB 3: LAPTOP / PC (Chrome / Edge) */}
                {activeTab === 'desktop' && (
                  <div className="p-3.5 rounded-2xl bg-blue-50/70 dark:bg-blue-950/20 border border-blue-200/80 dark:border-blue-800/60 space-y-2.5 animate-in fade-in duration-150">
                    <div className="flex items-center gap-2 text-xs font-bold text-blue-950 dark:text-blue-200">
                      <Laptop className="w-4 h-4 text-blue-600" />
                      <span>Cara Pasang di Laptop / Komputer (Chrome/Edge):</span>
                    </div>

                    <ol className="space-y-2 text-xs text-slate-700 dark:text-slate-300">
                      <li className="flex items-start gap-2.5">
                        <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                          1
                        </span>
                        <span>
                          Buka di browser <b>Google Chrome</b> atau <b>Microsoft Edge</b>.
                        </span>
                      </li>
                      <li className="flex items-start gap-2.5">
                        <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                          2
                        </span>
                        <span>
                          Perhatikan bilah alamat URL (Address bar) di atas, klik ikon <b>Pasang Aplikasi</b> (ikon monitor / tanda panah bawah).
                        </span>
                      </li>
                      <li className="flex items-start gap-2.5">
                        <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                          3
                        </span>
                        <span>
                          Atau klik menu titik tiga (⋮) di kanan atas browser &rarr; <b>&quot;Simpan dan bagikan&quot;</b> &rarr; klik <b>&quot;Install aplikasi&quot;</b>.
                        </span>
                      </li>
                      <li className="flex items-start gap-2.5">
                        <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                          4
                        </span>
                        <span>
                          Klik <b>"Install"</b>. Aplikasi akan langsung terbuka secara mandiri di desktop Anda!
                        </span>
                      </li>
                    </ol>
                  </div>
                )}
              </div>

              {/* Feature Highlights Grid */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 flex items-start gap-2">
                  <div className="p-1 rounded-lg bg-emerald-600 text-white shrink-0 mt-0.5">
                    <Zap className="w-3 h-3" />
                  </div>
                  <div>
                    <h5 className="text-[11px] font-bold text-slate-800 dark:text-slate-200">Akses Cepat</h5>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight">1-klik dari beranda HP</p>
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 flex items-start gap-2">
                  <div className="p-1 rounded-lg bg-emerald-600 text-white shrink-0 mt-0.5">
                    <Camera className="w-3 h-3" />
                  </div>
                  <div>
                    <h5 className="text-[11px] font-bold text-slate-800 dark:text-slate-200">Kamera Mulus</h5>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight">Scan QR & foto lancar</p>
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 flex items-start gap-2">
                  <div className="p-1 rounded-lg bg-emerald-600 text-white shrink-0 mt-0.5">
                    <MapPin className="w-3 h-3" />
                  </div>
                  <div>
                    <h5 className="text-[11px] font-bold text-slate-800 dark:text-slate-200">GPS Presisi</h5>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight">Radius sekolah akurat</p>
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 flex items-start gap-2">
                  <div className="p-1 rounded-lg bg-emerald-600 text-white shrink-0 mt-0.5">
                    <Bell className="w-3 h-3" />
                  </div>
                  <div>
                    <h5 className="text-[11px] font-bold text-slate-800 dark:text-slate-200">Notifikasi</h5>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight">Pengumuman sekolah</p>
                  </div>
                </div>
              </div>

              {/* Action Buttons in Footer */}
              <div className="pt-2 space-y-2">
                {isInstallable ? (
                  <button
                    type="button"
                    onClick={handleInstallClick}
                    disabled={isInstalling}
                    className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-sm shadow-md active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                  >
                    <Download className={`w-4 h-4 ${isInstalling ? 'animate-bounce' : ''}`} />
                    <span>{isInstalling ? 'Memasang Aplikasi...' : 'Install Sekarang'}</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleDismiss}
                    className="w-full py-3 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Saya Mengerti Cara Pasangnya</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleDismiss}
                  className="w-full py-2 text-xs font-semibold text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors text-center cursor-pointer"
                >
                  Tutup / Nanti Saja
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );

  if (typeof document !== 'undefined') {
    return createPortal(modalContent, document.body);
  }

  return modalContent;
};
