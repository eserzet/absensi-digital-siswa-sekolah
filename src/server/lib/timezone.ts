// Utility for Western Indonesian Time (WIB / UTC+7 / Asia/Jakarta)
export const WIB_TIMEZONE = 'Asia/Jakarta';

const dateFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: WIB_TIMEZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

const timeFormatter = new Intl.DateTimeFormat('en-GB', {
  timeZone: WIB_TIMEZONE,
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false,
});

const dayFormatter = new Intl.DateTimeFormat('id-ID', {
  timeZone: WIB_TIMEZONE,
  weekday: 'long',
});

const dayIndexFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: WIB_TIMEZONE,
  weekday: 'short',
});

/**
 * Returns current date string "YYYY-MM-DD" in Asia/Jakarta (WIB)
 */
export function getWIBDateString(d: Date = new Date()): string {
  return dateFormatter.format(d);
}

/**
 * Returns current time string "HH:MM:SS" in Asia/Jakarta (WIB)
 */
export function getWIBTimeString(d: Date = new Date()): string {
  return timeFormatter.format(d);
}

/**
 * Returns full Indonesian day name in WIB ("Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu")
 */
export function getWIBDayName(d: Date = new Date()): string {
  return dayFormatter.format(d);
}

/**
 * Returns day of week index in WIB:
 * 0 = Minggu (Sunday), 1 = Senin, ..., 5 = Jumat (Friday), 6 = Sabtu (Saturday)
 */
export function getWIBDayOfWeek(d: Date = new Date()): number {
  const short = dayIndexFormatter.format(d);
  switch (short) {
    case 'Sun': return 0;
    case 'Mon': return 1;
    case 'Tue': return 2;
    case 'Wed': return 3;
    case 'Thu': return 4;
    case 'Fri': return 5;
    case 'Sat': return 6;
    default: return d.getDay();
  }
}

/**
 * Returns parsed time components in WIB
 */
export function getWIBTimeComponents(d: Date = new Date()): {
  hours: number;
  minutes: number;
  seconds: number;
  totalMinutes: number;
  timeString: string;
} {
  const str = timeFormatter.format(d);
  const [h, m, s] = str.split(':').map(Number);
  return {
    hours: h,
    minutes: m,
    seconds: s,
    totalMinutes: h * 60 + m,
    timeString: str,
  };
}

/**
 * Convert "HH:MM" or "HH:MM:SS" to total minutes from midnight
 */
export function timeToMinutes(timeStr: string): number {
  if (!timeStr) return 0;
  const parts = timeStr.split(':').map(Number);
  return (parts[0] || 0) * 60 + (parts[1] || 0);
}
