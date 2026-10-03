import React, { useState } from 'react';
import { useNotification } from '../../context/NotificationContext.js';
import { Bell, BellRing, Check, X } from 'lucide-react';

export const NotificationBellPrompt: React.FC<{ variant?: 'banner' | 'button' }> = ({
  variant = 'banner',
}) => {
  const { permission, isSupported, requestPermission } = useNotification();
  const [isDismissed, setIsDismissed] = useState<boolean>(() => {
    // Per-session dismiss — banner muncul lagi di sesi/kunjungan baru
    return sessionStorage.getItem('nb_notif_banner_dismissed') === 'true';
  });
  const [isRequesting, setIsRequesting] = useState(false);

  if (!isSupported || permission === 'granted' || (variant === 'banner' && isDismissed)) {
    return null;
  }

  const handleEnable = async () => {
    setIsRequesting(true);
    await requestPermission();
    setIsRequesting(false);
  };

  const handleDismiss = () => {
    setIsDismissed(true);
    // Per-session: hanya berlaku selama tab/browser terbuka
    sessionStorage.setItem('nb_notif_banner_dismissed', 'true');
  };

  if (variant === 'button') {
    return (
      <button
        type="button"
        onClick={handleEnable}
        disabled={isRequesting}
        className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold inline-flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
        title="Aktifkan Notifikasi Aplikasi"
      >
        <BellRing className={`w-3.5 h-3.5 ${isRequesting ? 'animate-bounce' : ''}`} />
        <span>Aktifkan Notifikasi</span>
      </button>
    );
  }

  return (
    <div className="bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-300 dark:border-amber-700/60 rounded-2xl p-3.5 flex items-center justify-between gap-3 text-xs shadow-2xs animate-in fade-in">
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-8 h-8 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 flex items-center justify-center shrink-0">
          <BellRing className="w-4 h-4 animate-pulse" />
        </div>
        <div className="min-w-0">
          <h4 className="font-black text-slate-900 dark:text-white text-xs truncate">
            Aktifkan Notifikasi Sekolah
          </h4>
          <p className="text-[11px] text-slate-600 dark:text-slate-300 line-clamp-1">
            Dapatkan pengingat jam absensi masuk & pengumuman penting secara instan.
          </p>
        </div>
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        <button
          type="button"
          onClick={handleEnable}
          disabled={isRequesting}
          className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-black transition-colors cursor-pointer"
        >
          {isRequesting ? 'Memproses...' : 'Izinkan'}
        </button>
        <button
          type="button"
          onClick={handleDismiss}
          className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg cursor-pointer"
          title="Tutup banner"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
