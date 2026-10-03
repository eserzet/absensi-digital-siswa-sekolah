import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { api, getAuthToken } from '../lib/api.js';

export type NotificationType = 'info' | 'success' | 'warning' | 'announcement';

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: NotificationType;
  timestamp: number;
  duration?: number;
  onClick?: () => void;
}

interface NotificationContextType {
  notifications: AppNotification[];
  permission: NotificationPermission | 'unsupported';
  isSupported: boolean;
  isPushSubscribed: boolean;
  requestPermission: () => Promise<boolean>;
  refreshPermission: () => NotificationPermission | 'unsupported';
  sendNotification: (
    title: string,
    message: string,
    type?: NotificationType,
    onClick?: () => void
  ) => void;
  removeNotification: (id: string) => void;
  clearAll: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

// Web Audio API chime synthesis for instant, zero-dependency sound alerts
export const playNotificationChime = () => {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    // Pleasant dual chime
    osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.08); // A5

    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.35);
  } catch {
    // AudioContext blocked before interaction
  }
};

// ── Web Push Subscription Helper ──────────────────────────────────────

/**
 * Convert a base64 VAPID public key to Uint8Array for PushManager.subscribe()
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Subscribe the browser to Web Push and register with our server.
 * This enables background notifications even when the app is closed.
 */
async function subscribeToPush(): Promise<boolean> {
  try {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      console.log('[Push] PushManager not supported in this browser.');
      return false;
    }

    // 1. Get VAPID public key from server
    const response = await fetch('/api/push/vapid-public-key', { cache: 'no-store' });
    if (!response.ok) return false;
    const { publicKey } = await response.json();
    if (!publicKey) return false;

    // 2. Get service worker registration
    const registration = await navigator.serviceWorker.ready;

    // 3. Check if already subscribed
    const existingSub = await registration.pushManager.getSubscription();
    if (existingSub) {
      // Already subscribed, re-register with server (in case server DB was reset)
      await sendSubscriptionToServer(existingSub);
      return true;
    }

    // 4. Subscribe to push
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    });

    // 5. Send subscription to server
    await sendSubscriptionToServer(subscription);
    console.log('[Push] Successfully subscribed to Web Push notifications.');
    return true;
  } catch (err) {
    console.warn('[Push] Failed to subscribe to push:', err);
    return false;
  }
}

/**
 * Send the push subscription object to our backend for storage.
 */
async function sendSubscriptionToServer(subscription: PushSubscription): Promise<void> {
  const token = getAuthToken();
  if (!token) return;

  try {
    await fetch('/api/push/subscribe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        subscription: subscription.toJSON(),
      }),
    });
  } catch (err) {
    console.warn('[Push] Failed to send subscription to server:', err);
  }
}

// ── Notification Provider ─────────────────────────────────────────────

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [isPushSubscribed, setIsPushSubscribed] = useState(false);
  const pushSubscribeAttempted = useRef(false);
  const isSupported = typeof window !== 'undefined' && 'Notification' in window;
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      return Notification.permission;
    }
    return 'unsupported';
  });

  const refreshPermission = useCallback((): NotificationPermission | 'unsupported' => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      const current = Notification.permission;
      setPermission(current);
      return current;
    }
    return 'unsupported';
  }, []);

  useEffect(() => {
    if (isSupported) {
      setPermission(Notification.permission);

      const handleFocus = () => {
        if ('Notification' in window) {
          setPermission(Notification.permission);
        }
      };

      window.addEventListener('focus', handleFocus);
      return () => window.removeEventListener('focus', handleFocus);
    }
  }, [isSupported]);

  // Auto-subscribe to Web Push when permission is granted and user is logged in
  useEffect(() => {
    if (permission === 'granted' && !pushSubscribeAttempted.current) {
      pushSubscribeAttempted.current = true;
      const token = getAuthToken();
      if (token) {
        subscribeToPush().then((success) => {
          setIsPushSubscribed(success);
          if (success) {
            console.log('[Push] Background push notifications are active.');
          }
        });
      }
    }
  }, [permission]);

  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!isSupported) return false;
    try {
      const res = await Notification.requestPermission();
      setPermission(res);
      if (res === 'granted') {
        localStorage.setItem('nb_notification_enabled', 'true');

        // Subscribe to Web Push immediately after permission is granted
        const token = getAuthToken();
        if (token) {
          subscribeToPush().then((success) => {
            setIsPushSubscribed(success);
          });
        }

        sendNotification(
          '🔔 Notifikasi Berhasil Diaktifkan!',
          'Anda akan menerima pemberitahuan jadwal absensi dan pengumuman sekolah langsung — bahkan saat aplikasi tidak dibuka.',
          'success'
        );
        return true;
      }
      return false;
    } catch (err) {
      console.warn('Failed to request notification permission:', err);
      return false;
    }
  }, [isSupported]);

  const removeNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  const sendNotification = useCallback(
    (
      title: string,
      message: string,
      type: NotificationType = 'info',
      onClick?: () => void
    ) => {
      // 1. Play subtle audio chime
      playNotificationChime();

      // 2. Vibrate mobile device if supported (PWA Android / modern mobile)
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        try {
          navigator.vibrate([100, 50, 100]);
        } catch {}
      }

      // 3. Dispatch native browser/PWA system notification if granted
      if (isSupported && Notification.permission === 'granted') {
        try {
          if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
            navigator.serviceWorker.ready.then((reg) => {
              reg.showNotification(title, {
                body: message,
                icon: '/pwa-192x192.png',
                badge: '/favicon.png',
                vibrate: [100, 50, 100],
                tag: `nb-${Date.now()}`,
              } as any);
            });
          } else {
            const notif = new Notification(title, {
              body: message,
              icon: '/pwa-192x192.png',
              badge: '/favicon.png',
            });
            if (onClick) {
              notif.onclick = () => {
                window.focus();
                onClick();
              };
            }
          }
        } catch (e) {
          console.warn('Browser notification failed:', e);
        }
      }

      // 4. Always add in-app toast notification
      const id = `toast-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const newNotif: AppNotification = {
        id,
        title,
        message,
        type,
        timestamp: Date.now(),
        duration: 5000,
        onClick,
      };

      setNotifications((prev) => [newNotif, ...prev.slice(0, 4)]);

      // Auto-dismiss after 5 seconds
      setTimeout(() => {
        setNotifications((prev) => prev.filter((n) => n.id !== id));
      }, 5000);
    },
    [isSupported]
  );

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        permission,
        isSupported,
        isPushSubscribed,
        requestPermission,
        refreshPermission,
        sendNotification,
        removeNotification,
        clearAll,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
};
