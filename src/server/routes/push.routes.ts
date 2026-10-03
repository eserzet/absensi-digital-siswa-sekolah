// ====================================================================
// PUSH NOTIFICATION API ROUTES
// Subscribe, unsubscribe, VAPID public key, and test endpoints
// ====================================================================

import { Router, Request, Response } from 'express';
import { getSession } from './auth.routes.js';
import {
  isWebPushConfigured,
  getVapidPublicKey,
  savePushSubscription,
  removePushSubscription,
  broadcastPush,
} from '../lib/pushService.js';

const router = Router();

// 1. GET /api/push/vapid-public-key — Return VAPID public key for client PushManager.subscribe()
router.get('/vapid-public-key', (_req: Request, res: Response) => {
  const key = getVapidPublicKey();
  if (!key) {
    return res.status(503).json({
      success: false,
      message: 'Web Push belum dikonfigurasi di server.',
    });
  }
  return res.json({ success: true, publicKey: key });
});

// 2. GET /api/push/status — Check if push is configured
router.get('/status', (_req: Request, res: Response) => {
  return res.json({
    success: true,
    configured: isWebPushConfigured(),
    publicKey: getVapidPublicKey() || null,
  });
});

// 3. POST /api/push/subscribe — Save push subscription for authenticated user
router.post('/subscribe', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : req.body?.token;
    const session = getSession(token);

    if (!session) {
      return res.status(401).json({
        success: false,
        message: 'Sesi login tidak ditemukan. Silakan login ulang.',
      });
    }

    const { subscription } = req.body;

    if (!subscription || !subscription.endpoint || !subscription.keys?.p256dh || !subscription.keys?.auth) {
      return res.status(400).json({
        success: false,
        message: 'Data subscription tidak valid.',
      });
    }

    const saved = await savePushSubscription(
      session.userId,
      {
        endpoint: subscription.endpoint,
        keys: {
          p256dh: subscription.keys.p256dh,
          auth: subscription.keys.auth,
        },
      },
      req.headers['user-agent'] || undefined
    );

    if (!saved) {
      return res.status(500).json({
        success: false,
        message: 'Gagal menyimpan subscription push notification.',
      });
    }

    console.log(`[Push] User ${session.userId} subscribed from ${req.headers['user-agent']?.substring(0, 40)}...`);

    return res.json({
      success: true,
      message: 'Push notification berhasil diaktifkan.',
    });
  } catch (error) {
    console.error('[Push] Subscribe error:', error);
    return res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat menyimpan subscription.',
    });
  }
});

// 4. POST /api/push/unsubscribe — Remove push subscription
router.post('/unsubscribe', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : req.body?.token;
    const session = getSession(token);

    if (!session) {
      return res.status(401).json({
        success: false,
        message: 'Sesi login tidak ditemukan.',
      });
    }

    const { endpoint } = req.body;

    if (!endpoint) {
      return res.status(400).json({
        success: false,
        message: 'Endpoint subscription tidak valid.',
      });
    }

    const removed = await removePushSubscription(session.userId, endpoint);

    return res.json({
      success: true,
      message: removed
        ? 'Push notification berhasil dinonaktifkan.'
        : 'Subscription tidak ditemukan.',
    });
  } catch (error) {
    console.error('[Push] Unsubscribe error:', error);
    return res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat menghapus subscription.',
    });
  }
});

// 5. POST /api/push/test — Admin-only: send test push to all subscribers
router.post('/test', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : req.body?.token;
    const session = getSession(token);

    if (!session || session.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Hanya admin yang bisa mengirim test push.',
      });
    }

    if (!isWebPushConfigured()) {
      return res.status(503).json({
        success: false,
        message: 'Web Push belum dikonfigurasi. Periksa VAPID keys di .env',
      });
    }

    const result = await broadcastPush({
      title: '🔔 Test Notifikasi SMASTIKA',
      body: 'Ini adalah test push notification. Jika Anda melihat ini, berarti notifikasi berfungsi dengan baik!',
      url: '/',
      tag: 'test-push',
    });

    return res.json({
      success: true,
      message: `Test push dikirim: ${result.sent} berhasil, ${result.failed} gagal dari ${result.total} perangkat.`,
      result,
    });
  } catch (error) {
    console.error('[Push] Test push error:', error);
    return res.status(500).json({
      success: false,
      message: 'Gagal mengirim test push.',
    });
  }
});

export default router;
