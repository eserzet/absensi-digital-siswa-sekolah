import { Holiday } from '../../types.js';

// Check if a given date string (YYYY-MM-DD) is Friday (Jumat: hari libur mingguan madrasah)
export function isFriday(dateStr: string): boolean {
  if (!dateStr) return false;
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]), 12, 0, 0);
    return d.getDay() === 5; // 5 is Friday
  }
  const d = new Date(dateStr);
  return d.getDay() === 5;
}

// Check if a given date string (YYYY-MM-DD) is Sunday (Minggu: hari libur akhir pekan)
export function isSunday(dateStr: string): boolean {
  if (!dateStr) return false;
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]), 12, 0, 0);
    return d.getDay() === 0; // 0 is Sunday
  }
  const d = new Date(dateStr);
  return d.getDay() === 0;
}

// Check if today is holiday (Friday: hari libur mingguan otomatis madrasah, atau tanggal libur terdaftar di Supabase)
// CATATAN PENTING: Hari Minggu BUKAN hari libur sekolah. Hari Minggu adalah hari aktif KBM & absensi normal.
export function checkIsHoliday(
  dateStr: string, 
  customHolidays: Holiday[] = []
): { isHoliday: boolean; name?: string; description?: string; isFriday: boolean } {
  // 1. Hari Jumat otomatis hari libur mingguan madrasah
  if (isFriday(dateStr)) {
    return {
      isHoliday: true,
      name: 'Hari Libur Mingguan (Jumat Berkah)',
      description: 'Hari ini libur, jadi tidak perlu absen. Selamat menikmati waktu istirahat bersama teman-teman di kobong!, dan jangan lupa jumatan ya!!!, jangan tidur terus.',
      isFriday: true,
    };
  }

  // 2. Hari Minggu TETAP SEKOLAH & ABSENSI NORMAL.
  // Hanya libur jika tanggal tersebut secara khusus didaftarkan sebagai hari libur nasional di database.
  // Cek apakah dateStr berada dalam rentang date s/d end_date (inklusif) atau berulang tiap tahun
  const found = customHolidays.find((h) => {
    const startDate = h.date;
    const endDate = h.end_date || h.date;

    // 1. Pengecekan rentang tanggal standar (YYYY-MM-DD)
    if (dateStr >= startDate && dateStr <= endDate) {
      return true;
    }

    // 2. Pengecekan hari libur berulang tahunan (is_recurring)
    if (h.is_recurring) {
      const targetMD = dateStr.slice(5); // MM-DD
      const startMD = startDate.slice(5);
      const endMD = endDate.slice(5);
      if (startMD <= endMD) {
        if (targetMD >= startMD && targetMD <= endMD) return true;
      } else {
        // Rentang libur lintas tahun, contoh 25 Desember s/d 05 Januari
        if (targetMD >= startMD || targetMD <= endMD) return true;
      }
    }

    return false;
  });

  if (found) {
    return {
      isHoliday: true,
      name: found.name,
      description: found.description || 'Hari ini libur sekolah. Siswa tidak perlu melakukan presensi.',
      isFriday: false,
    };
  }

  return { isHoliday: false, isFriday: false };
}
