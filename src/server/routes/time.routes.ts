import { Router, Request, Response } from 'express';
import { 
  getWIBDateString, 
  getWIBTimeString, 
  getWIBDayName, 
  getWIBTimeComponents, 
  timeToMinutes 
} from '../lib/timezone.js';
import { checkIsHoliday } from '../lib/holidayUtils.js';
import { DEFAULT_ATTENDANCE_SETTINGS } from '../lib/defaults.js';
import { supabaseSettings, supabaseHolidays } from '../lib/supabase.js';

const router = Router();

// GET /api/time/now - Official Server WIB Clock and Schedule Status
router.get(['/', '/now'], async (_req: Request, res: Response) => {
  const now = new Date();
  const dateStr = getWIBDateString(now);
  const timeStr = getWIBTimeString(now);
  const dayName = getWIBDayName(now);
  const timeComponents = getWIBTimeComponents(now);

  let settings = DEFAULT_ATTENDANCE_SETTINGS;
  const dbSettings = await supabaseSettings.get();
  if (dbSettings) {
    settings = { ...settings, ...dbSettings };
  }

  const alphaCutoff = settings.alpha_cutoff_time || '11:30';
  const checkInLimit = settings.check_in_time || settings.on_time_limit || '07:30';
  const cutoffMinutes = timeToMinutes(alphaCutoff);
  const checkInMinutes = timeToMinutes(checkInLimit);

  const dbHolidays = (await supabaseHolidays.getAll()) || [];
  const holidayCheck = checkIsHoliday(dateStr, dbHolidays);

  const isPastCutoff = timeComponents.totalMinutes >= cutoffMinutes;
  const isLate = timeComponents.totalMinutes > checkInMinutes;

  return res.json({
    success: true,
    timezone: 'WIB',
    timezone_name: 'Waktu Indonesia Barat (UTC+7)',
    date: dateStr,
    time: timeStr,
    day_name: dayName,
    hours: timeComponents.hours,
    minutes: timeComponents.minutes,
    seconds: timeComponents.seconds,
    total_minutes: timeComponents.totalMinutes,
    is_holiday: holidayCheck.isHoliday,
    holiday_name: holidayCheck.name,
    alpha_cutoff_time: alphaCutoff,
    check_in_time: checkInLimit,
    is_past_alpha_cutoff: isPastCutoff,
    is_late: isLate,
  });
});

export default router;
