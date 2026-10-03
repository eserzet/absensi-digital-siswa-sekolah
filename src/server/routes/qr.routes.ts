import { Router, Request, Response } from 'express';
import { DEFAULT_ATTENDANCE_SETTINGS, DEFAULT_SCHOOL_LOCATION } from '../lib/defaults.js';
import { supabaseSettings, supabaseLocation } from '../lib/supabase.js';

const router = Router();

// 1. GET /api/qr & GET /api/qr/school (Get current school QR code token and payload from Supabase)
router.get(['/', '/school'], async (_req: Request, res: Response) => {
  let settings = DEFAULT_ATTENDANCE_SETTINGS;
  const dbSettings = await supabaseSettings.get();
  if (dbSettings) {
    settings = { ...settings, ...dbSettings };
  }

  let location = DEFAULT_SCHOOL_LOCATION;
  const dbLoc = await supabaseLocation.get();
  if (dbLoc) {
    location = { ...location, ...dbLoc };
  }

  const qrPayload = settings.school_qr_code || 'NUBA-SMART-ATTENDANCE-2026-NURUL-BAYAN';
  const schoolName = location.school_name || 'SMA Informatika Nurul Bayan';
  const generatedAt = settings.updated_at || new Date().toISOString();

  return res.json({
    success: true,
    school_name: schoolName,
    qr_code: qrPayload,
    description: 'QR Code Resmi Absensi Siswa SMA Informatika Nurul Bayan',
    check_in_time: settings.check_in_time,
    config: {
      school_name: schoolName,
      qr_payload: qrPayload,
      generated_at: generatedAt,
    },
  });
});

// 2. POST /api/qr/regenerate (Admin regenerate QR Code payload token in Supabase)
router.post('/regenerate', async (_req: Request, res: Response) => {
  const newPayload = `NUBA-SMART-ATTENDANCE-${Date.now()}-KEY`;
  const now = new Date().toISOString();

  let settings = DEFAULT_ATTENDANCE_SETTINGS;
  const dbSettings = await supabaseSettings.get();
  if (dbSettings) {
    settings = { ...settings, ...dbSettings };
  }

  settings.school_qr_code = newPayload;
  settings.updated_at = now;

  await supabaseSettings.update(settings).catch(() => {});

  let location = DEFAULT_SCHOOL_LOCATION;
  const dbLoc = await supabaseLocation.get();
  if (dbLoc) {
    location = { ...location, ...dbLoc };
  }

  return res.json({
    success: true,
    message: 'QR Code berhasil diperbarui di Supabase.',
    config: {
      school_name: location.school_name,
      qr_payload: newPayload,
      generated_at: now,
    },
  });
});

export default router;
