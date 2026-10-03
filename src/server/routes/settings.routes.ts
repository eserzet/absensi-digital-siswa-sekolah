import { Router, Request, Response } from 'express';
import { DEFAULT_ATTENDANCE_SETTINGS, DEFAULT_SCHOOL_LOCATION } from '../lib/defaults.js';
import { 
  supabaseSettings, 
  supabaseLocation,
  supabaseSchedules,
  supabaseAttendance,
  isSupabaseConfigured,
  getSupabaseStatus 
} from '../lib/supabase.js';
import { getWIBDateString, getWIBTimeComponents, timeToMinutes } from '../lib/timezone.js';
import { resetAutoAlphaSyncedDate } from './attendance.routes.js';
import { AttendanceSettings } from '../../types.js';

const router = Router();

// 1. GET /api/settings (Get current settings & database connection status from Supabase)
router.get('/', async (req: Request, res: Response) => {
  let settings: AttendanceSettings = { ...DEFAULT_ATTENDANCE_SETTINGS };

  const dbSettings = await supabaseSettings.get();
  if (dbSettings) {
    settings = { ...settings, ...dbSettings };
  }

  const dbLoc = await supabaseLocation.get();
  const radius = dbLoc?.radius_meters || DEFAULT_SCHOOL_LOCATION.radius_meters;
  settings.gps_radius_meters = radius;

  const dbImages = await supabaseSchedules.getImages();
  const dbStatus = getSupabaseStatus();

  return res.json({
    success: true,
    source: 'supabase',
    database_status: {
      provider: 'Supabase',
      is_connected: dbStatus.configured,
      url: dbStatus.url,
      auth_key_type: dbStatus.keyType,
      primary_storage: 'Supabase Cloud Database (PostgreSQL)',
    },
    settings,
    schedule_images: dbImages || [],
  });
});

// 2. PUT /api/settings (Admin update settings in Supabase)
router.put('/', async (req: Request, res: Response) => {
  try {
    const current = (await supabaseSettings.get()) || { ...DEFAULT_ATTENDANCE_SETTINGS };
    const {
      start_time,
      on_time_limit,
      end_time,
      gps_radius_meters,
      check_in_time,
      check_out_time,
      alpha_cutoff_time,
      late_tolerance_minutes,
      school_qr_code,
      admin_whatsapp,
    } = req.body;

    // Prioritize clean, canonical field names from Admin form
    const finalStartTime = (start_time || check_out_time || current.start_time || '06:00').trim();
    const finalOnTimeLimit = (on_time_limit || check_in_time || current.on_time_limit || '07:15').trim();
    const finalEndTime = (end_time || alpha_cutoff_time || current.end_time || '08:30').trim();

    current.start_time = finalStartTime;
    current.check_out_time = finalStartTime;
    current.on_time_limit = finalOnTimeLimit;
    current.check_in_time = finalOnTimeLimit;
    current.end_time = finalEndTime;
    current.alpha_cutoff_time = finalEndTime;

    if (typeof gps_radius_meters === 'number') {
      current.gps_radius_meters = gps_radius_meters;
      const dbLoc = (await supabaseLocation.get()) || { ...DEFAULT_SCHOOL_LOCATION };
      dbLoc.radius_meters = gps_radius_meters;
      await supabaseLocation.update(dbLoc);
    }
    if (typeof late_tolerance_minutes === 'number') {
      current.late_tolerance_minutes = late_tolerance_minutes;
    }
    if (school_qr_code) current.school_qr_code = school_qr_code.trim();
    if (admin_whatsapp) current.admin_whatsapp = admin_whatsapp.trim();
    current.updated_at = new Date().toISOString();

    const updated = await supabaseSettings.update(current);

    if (!updated) {
      return res.status(500).json({
        success: false,
        message: 'Gagal menyimpan pengaturan ke database Supabase. Periksa koneksi dan skema database.',
      });
    }

    // If new end_time/alpha_cutoff_time is in the future, clear today's premature automatic ALPHA records
    try {
      const todayDate = getWIBDateString();
      const timeComponents = getWIBTimeComponents();
      const newCutoff = (current.alpha_cutoff_time || current.end_time || '11:30').trim();
      if (timeComponents.totalMinutes < timeToMinutes(newCutoff)) {
        await supabaseAttendance.deleteAutomaticAlpha(todayDate);
        resetAutoAlphaSyncedDate();
      }
    } catch (cleanErr) {
      console.error('[Settings] Error auto-cleaning alpha records:', cleanErr);
    }

    return res.json({
      success: true,
      source: 'supabase',
      message: 'Pengaturan absensi sekolah berhasil disimpan ke Supabase.',
      settings: updated,
    });
  } catch (error) {
    console.error('[Settings] PUT error:', error);
    return res.status(500).json({ success: false, message: 'Gagal memperbarui pengaturan sekolah.' });
  }
});

export default router;
