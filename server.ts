import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// ====================================================================
// SERVER ENTRY POINT: Absensi Digital SMA Informatika Nurul Bayan
// Compatible with: Local Development, cPanel (Passenger), VPS (PM2)
// ====================================================================

// Safe resolution of directory across both ESM (dev) and CJS (production bundle)
const getDirname = (): string => {
  if (typeof __dirname !== 'undefined') return __dirname;
  try {
    return path.dirname(fileURLToPath(import.meta.url));
  } catch {
    return process.cwd();
  }
};

const currentDir = getDirname();

// Robust .env loading: searches multiple candidate paths for cPanel compatibility
const candidateEnvPaths = [
  path.resolve(process.cwd(), '.env'),
  path.resolve(currentDir, '.env'),
  path.resolve(currentDir, '../.env'),
  path.resolve(currentDir, '../../.env'),
];

let envLoaded = false;
for (const envPath of candidateEnvPaths) {
  try {
    if (fs.existsSync(envPath)) {
      dotenv.config({ path: envPath });
      console.log(`[ENV] Loaded from: ${envPath}`);
      envLoaded = true;
      break;
    }
  } catch {
    // continue searching
  }
}
if (!envLoaded) {
  dotenv.config(); // fallback to default
  console.log('[ENV] Using default dotenv (process.env)');
}

import express from 'express';
import cors from 'cors';

// Route imports
import authRoutes from './src/server/routes/auth.routes.js';
import attendanceRoutes, { syncAutomaticAlphaRecords, syncMissedAlphaDays } from './src/server/routes/attendance.routes.js';
import studentsRoutes from './src/server/routes/students.routes.js';
import announcementsRoutes from './src/server/routes/announcements.routes.js';
import holidaysRoutes from './src/server/routes/holidays.routes.js';
import schedulesRoutes from './src/server/routes/schedules.routes.js';
import settingsRoutes from './src/server/routes/settings.routes.js';
import locationRoutes from './src/server/routes/location.routes.js';
import qrRoutes from './src/server/routes/qr.routes.js';
import timeRoutes from './src/server/routes/time.routes.js';
import brandingRoutes from './src/server/routes/branding.routes.js';
import pushRoutes from './src/server/routes/push.routes.js';
import { getSupabaseStatus, getSupabaseAdmin, supabaseBranding, supabaseSettings } from './src/server/lib/supabase.js';
import { broadcastPush, isWebPushConfigured } from './src/server/lib/pushService.js';

async function startServer() {
  const app = express();
  const PORT = parseInt(process.env.PORT || '3000', 10);
  const isDevCommand = process.env.npm_lifecycle_event === 'dev' || process.argv.includes('--dev');
  const isProduction = !isDevCommand && process.env.NODE_ENV === 'production';

  // ── Global Middlewares ──────────────────────────────────────────────
  app.use(cors({ origin: true, credentials: true }));
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Security headers
  app.use((_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    next();
  });

  // Global Anti-Cache middleware for API routes: Ensure real-time live Supabase data always
  app.use('/api', (_req, res, next) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Surrogate-Control', 'no-store');
    next();
  });

  const SERVER_BOOT_ID = Date.now().toString();

  // ── Health & Status Endpoints ───────────────────────────────────────
  app.get('/api/app-version', (_req, res) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.json({
      success: true,
      version: SERVER_BOOT_ID,
      app: 'Absensi Digital Nurul Bayan',
      timestamp: new Date().toISOString(),
    });
  });

  app.get('/api/health', async (_req, res) => {
    const dbStatus = getSupabaseStatus();
    let livePing = 'untested';
    let liveError: string | null = null;

    if (dbStatus.configured) {
      const client = getSupabaseAdmin();
      if (client) {
        try {
          const { error } = await client.from('users').select('id').limit(1);
          livePing = error ? 'error' : 'connected';
          if (error) liveError = error.message;
        } catch (err: any) {
          livePing = 'exception';
          liveError = err.message;
        }
      }
    }

    res.json({
      status: 'ok',
      app: 'Absensi Digital SMA Informatika Nurul Bayan',
      version: '1.0.0',
      environment: isProduction ? 'production' : 'development',
      database: {
        engine: 'Supabase (PostgreSQL)',
        configured: dbStatus.configured,
        connection: livePing,
        error: liveError,
        endpoint: dbStatus.url,
        keyType: dbStatus.keyType,
      },
      timestamp: new Date().toISOString(),
    });
  });

  app.get('/api/database/status', async (_req, res) => {
    const dbStatus = getSupabaseStatus();
    let pingOk = false;
    let pingErr: string | null = null;

    if (dbStatus.configured) {
      const client = getSupabaseAdmin();
      if (client) {
        try {
          const { error } = await client.from('users').select('id').limit(1);
          pingOk = !error;
          if (error) pingErr = error.message;
        } catch (e: any) {
          pingErr = e.message;
        }
      }
    }

    res.json({
      success: pingOk,
      provider: 'Supabase (PostgreSQL)',
      is_configured: dbStatus.configured,
      is_connected: pingOk,
      url: dbStatus.url,
      auth_key_type: dbStatus.keyType,
      error: pingErr,
      message: pingOk
        ? 'Database Supabase berhasil terhubung.'
        : dbStatus.configured
        ? `Kredensial terdeteksi namun koneksi gagal: ${pingErr}`
        : 'Kredensial Supabase tidak ditemukan. Pastikan environment variables sudah diset.',
    });
  });

  // ── API Routes ──────────────────────────────────────────────────────
  app.use('/api/auth', authRoutes);
  app.use('/api/attendance', attendanceRoutes);
  app.use('/api/students', studentsRoutes);
  app.use('/api/announcements', announcementsRoutes);
  app.use('/api/holidays', holidaysRoutes);
  app.use('/api/schedules', schedulesRoutes);
  app.use('/api/settings', settingsRoutes);
  app.use('/api/location', locationRoutes);
  app.use('/api/qr', qrRoutes);
  app.use('/api/time', timeRoutes);
  app.use('/api/branding', brandingRoutes);
  app.use('/api/push', pushRoutes);

  // ── Dynamic PWA Manifest Route ──────────────────────────────────────
  const sendDynamicManifest = async (_req: express.Request, res: express.Response) => {
    try {
      const branding = await supabaseBranding.get();
      const themeColorHex =
        branding.theme_color === 'sapphire' ? '#2563eb' :
        branding.theme_color === 'violet' ? '#7c3aed' :
        branding.theme_color === 'amber' ? '#d97706' :
        branding.theme_color === 'ruby' ? '#dc2626' :
        branding.theme_color === 'onyx' ? '#0f172a' : '#047857';

      const manifestData = {
        id: '/',
        name: 'SMASTIKA ABSENSI',
        short_name: 'SMASTIKA ABSENSI',
        description: 'Aplikasi Absensi Digital Siswa SMA Informatika Nurul Bayan (SMASTIKA)',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        background_color: '#ffffff',
        theme_color: themeColorHex,
        orientation: 'portrait-primary',
        icons: [
          {
            src: '/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: '/pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: '/pwa-maskable-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          },
          {
            src: '/apple-touch-icon.png',
            sizes: '180x180',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: '/favicon.png',
            sizes: '64x64',
            type: 'image/png',
            purpose: 'any'
          }
        ]
      };
      res.setHeader('Content-Type', 'application/manifest+json; charset=utf-8');
      res.setHeader('Cache-Control', 'public, max-age=30');
      return res.json(manifestData);
    } catch {
      return res.sendFile(path.resolve(process.cwd(), 'public', 'manifest.json'));
    }
  };

  app.get('/manifest.json', sendDynamicManifest);
  app.get('/manifest.webmanifest', sendDynamicManifest);

  // ── Static Files & SPA Fallback ─────────────────────────────────────
  const distIndexInCwd = path.join(process.cwd(), 'dist', 'index.html');
  const distIndexInDir = path.join(currentDir, 'index.html');
  const hasDist = fs.existsSync(distIndexInCwd) || fs.existsSync(distIndexInDir);

  if (isProduction || (hasDist && !isDevCommand)) {
    // Production: serve pre-built static files
    const distPath = fs.existsSync(distIndexInCwd)
      ? path.join(process.cwd(), 'dist')
      : currentDir;
    console.log(`[Static] Serving frontend from: ${distPath}`);
    app.use(express.static(distPath));

    // Explicit 404 for missing static assets to prevent browser loading HTML as JS/CSS
    app.use('/assets', (_req, res) => {
      res.status(404).type('text/plain').send('Asset not found');
    });

    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  } else {
    // Development: use Vite middleware for HMR
    try {
      const { createServer: createViteServer } = await import('vite');
      const vite = await createViteServer({
        server: { middlewareMode: true, hmr: true },
        appType: 'spa',
      });
      app.use(vite.middlewares);
      console.log('[Dev] Vite dev server middleware attached');
    } catch (viteErr) {
      console.error('[Dev] Failed to initialize Vite:', viteErr);
    }
  }

  // ── Start Listening ─────────────────────────────────────────────────
  app.listen(PORT, '0.0.0.0', () => {
    console.log('');
    console.log('╔══════════════════════════════════════════════════╗');
    console.log('║   Absensi Digital SMA Informatika Nurul Bayan   ║');
    console.log(`║   Server running on http://0.0.0.0:${PORT}         ║`);
    console.log(`║   Mode: ${isProduction ? 'PRODUCTION' : 'DEVELOPMENT'}                          ║`);
    console.log('╚══════════════════════════════════════════════════╝');
    console.log('');

    // ── Background Auto-Alpha Scheduler ─────────────────────────────────
    // Warmup sync 3 seconds after server start
    setTimeout(async () => {
      try {
        console.log('[Scheduler] Running initial Alpha check & retroactive recovery...');
        await syncAutomaticAlphaRecords();
        const missed = await syncMissedAlphaDays(7);
        if (missed.totalRecordsCreated > 0) {
          console.log(`[Scheduler] Retroactively created ${missed.totalRecordsCreated} ALPHA records across ${missed.syncedDays.length} days: ${missed.syncedDays.join(', ')}`);
        }
      } catch (syncErr) {
        console.error('[Scheduler] Initial Alpha sync error:', syncErr);
      }
    }, 3000);

    // Continuous background scheduler: every 2 minutes checks if cutoff reached
    setInterval(async () => {
      try {
        await syncAutomaticAlphaRecords();
      } catch (intervalErr) {
        console.error('[Scheduler] Background Alpha check error:', intervalErr);
      }
    }, 2 * 60 * 1000);

    // Continuous retroactive checker: every 30 minutes scans for missed school days
    setInterval(async () => {
      try {
        await syncMissedAlphaDays(7);
      } catch (missedErr) {
        console.error('[Scheduler] Background Missed Days check error:', missedErr);
      }
    }, 30 * 60 * 1000);

    // ── Push Notification Reminder Scheduler ───────────────────────────
    // Every 5 minutes: check if it's time to send attendance reminders
    let lastReminderSent = '';
    setInterval(async () => {
      if (!isWebPushConfigured()) return;
      try {
        const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Jakarta' }));
        const hh = now.getHours().toString().padStart(2, '0');
        const mm = now.getMinutes().toString().padStart(2, '0');
        const currentTime = `${hh}:${mm}`;
        const todayKey = now.toISOString().split('T')[0];

        // Get attendance settings for reminder times
        const settings = await supabaseSettings.get();
        if (!settings) return;

        // Calculate reminder time: 15 minutes before on_time_limit
        const onTimeParts = (settings.on_time_limit || '07:30').split(':').map(Number);
        let reminderH = onTimeParts[0];
        let reminderM = (onTimeParts[1] || 0) - 15;
        if (reminderM < 0) { reminderH--; reminderM += 60; }
        const reminderTime = `${reminderH.toString().padStart(2, '0')}:${reminderM.toString().padStart(2, '0')}`;

        const reminderKey = `${todayKey}-${reminderTime}`;

        // Send reminder if current time matches and we haven't sent for this slot today
        if (currentTime === reminderTime && lastReminderSent !== reminderKey) {
          lastReminderSent = reminderKey;
          console.log(`[Push Scheduler] Sending attendance reminder at ${currentTime}`);
          await broadcastPush({
            title: '⏰ Pengingat Absensi',
            body: `Jangan lupa absen hari ini! Batas waktu tepat waktu: ${settings.on_time_limit}. Segera buka aplikasi dan scan QR Code.`,
            url: '/',
            tag: `reminder-${todayKey}`,
          });
        }
      } catch (err) {
        console.error('[Push Scheduler] Reminder error:', err);
      }
    }, 5 * 60 * 1000);
  });
}

startServer().catch((err) => {
  console.error('[FATAL] Failed to start server:', err);
  process.exit(1);
});
