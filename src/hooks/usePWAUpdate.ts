import { useEffect, useState, useRef } from 'react';
import { registerSW } from 'virtual:pwa-register';

export function usePWAUpdate() {
  const [needRefresh, setNeedRefresh] = useState(false);
  const [offlineReady, setOfflineReady] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const isReloadingRef = useRef(false);

  useEffect(() => {
    let updateSWFn: ((reloadPage?: boolean) => Promise<void>) | undefined;

    // Listen for service worker controller change to reload cleanly once
    if ('serviceWorker' in navigator) {
      const handleControllerChange = () => {
        if (isReloadingRef.current) return;
        isReloadingRef.current = true;
        console.log('[PWA] Service Worker diperbarui. Memuat ulang aplikasi otomatis...');
        window.location.reload();
      };
      navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);
    }

    try {
      updateSWFn = registerSW({
        immediate: true,
        onNeedRefresh() {
          console.log('[PWA] Versi kode baru ditemukan di server. Memperbarui otomatis di latar belakang...');
          setNeedRefresh(true);
          setIsUpdating(true);
          // Otomatis sinkronkan dan muat kode terbaru tanpa perlu aksi pengguna
          if (isReloadingRef.current) return;
          isReloadingRef.current = true;
          if (updateSWFn) {
            updateSWFn(true).catch(() => {
              window.location.reload();
            });
          } else {
            window.location.reload();
          }
        },
        onOfflineReady() {
          console.log('[PWA] Aplikasi siap berjalan.');
          setOfflineReady(true);
        },
        onRegisteredSW(_swUrl, registration) {
          if (!registration) return;

          // Fungsi pengecekan update ke server secara berkala
          const checkForUpdates = async () => {
            if (!navigator.onLine || isReloadingRef.current) return;
            try {
              // 1. Cek update Service Worker (sw.js byte diff)
              await registration.update();

              // 2. Cek endpoint versi server untuk mendeteksi rebuild/redeploy
              const res = await fetch('/api/app-version', {
                cache: 'no-store',
                headers: { 'Cache-Control': 'no-cache' }
              });
              if (res.ok) {
                const data = await res.json();
                if (data && data.version) {
                  const storedVersion = localStorage.getItem('smastika_app_version');
                  if (!storedVersion) {
                    localStorage.setItem('smastika_app_version', data.version);
                  } else if (storedVersion !== data.version) {
                    console.log(`[PWA] Versi server berubah: ${storedVersion} -> ${data.version}. Memicu pembaruan otomatis...`);
                    localStorage.setItem('smastika_app_version', data.version);
                    if (isReloadingRef.current) return;
                    isReloadingRef.current = true;
                    if (updateSWFn) {
                      await updateSWFn(true).catch(() => window.location.reload());
                    } else {
                      window.location.reload();
                    }
                  }
                }
              }
            } catch (err) {
              console.debug('[PWA] Pengecekan pembaruan latar belakang:', err);
            }
          };

          // Cek segera saat aplikasi dibuka
          checkForUpdates();

          // Cek setiap 30 detik di latar belakang
          const intervalId = setInterval(checkForUpdates, 30 * 1000);

          // Cek saat pengguna kembali ke aplikasi / tab aktif kembali
          const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
              checkForUpdates();
            }
          };
          document.addEventListener('visibilitychange', handleVisibilityChange);

          // Cek saat perangkat kembali terhubung ke internet
          const handleOnline = () => {
            checkForUpdates();
          };
          window.addEventListener('online', handleOnline);

          return () => {
            clearInterval(intervalId);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            window.removeEventListener('online', handleOnline);
          };
        },
      });
    } catch (err) {
      console.debug('[PWA] Error inisialisasi Service Worker:', err);
    }
  }, []);

  return {
    needRefresh,
    offlineReady,
    isUpdating,
  };
}
