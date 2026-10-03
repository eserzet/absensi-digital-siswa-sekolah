// Client-side date and time utilities configured for Indonesia (WIB / Asia/Jakarta)
export const WIB_TIMEZONE = 'Asia/Jakarta';

/**
 * Returns current date string "YYYY-MM-DD" in Asia/Jakarta (WIB)
 */
export function getWIBTodayDateString(d: Date = new Date()): string {
  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: WIB_TIMEZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(d);
  } catch {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}

/**
 * Returns current time string "HH:MM:SS" in Asia/Jakarta (WIB)
 */
export function getWIBTimeString(d: Date = new Date()): string {
  try {
    return new Intl.DateTimeFormat('en-GB', {
      timeZone: WIB_TIMEZONE,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    }).format(d);
  } catch {
    return d.toLocaleTimeString('id-ID');
  }
}

/**
 * Formats date into formal Indonesian readable string (e.g. "Sabtu, 12 September 2026")
 */
export function formatIndonesianDate(input: string | Date = new Date()): string {
  try {
    let d: Date;
    if (typeof input === 'string') {
      const parts = input.split('T')[0].split('-');
      if (parts.length === 3) {
        d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]), 12, 0, 0);
      } else {
        d = new Date(input);
      }
    } else {
      d = input;
    }
    return new Intl.DateTimeFormat('id-ID', {
      timeZone: WIB_TIMEZONE,
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(d);
  } catch {
    return typeof input === 'string' ? input : input.toLocaleDateString('id-ID');
  }
}
