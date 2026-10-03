import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { isFriday, isSunday, checkIsHoliday } from '../lib/holidayUtils.js';
import { supabaseHolidays, isSupabaseConfigured } from '../lib/supabase.js';
import { Holiday } from '../../types.js';

const router = Router();

// Helper to get formatted today string
function getTodayString(): string {
  const now = new Date();
  const d = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Jakarta' }));
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

// 1. GET /api/holidays (List all holidays from Supabase + check today status)
router.get('/', async (req: Request, res: Response) => {
  const todayStr = getTodayString();
  const todayIsFriday = isFriday(todayStr);
  const todayIsSunday = isSunday(todayStr);

  const dbHolidays = await supabaseHolidays.getAll();
  const holidays: Holiday[] = dbHolidays || [];

  // Check if today is a holiday
  const holidayCheck = checkIsHoliday(todayStr, holidays);

  return res.json({
    success: true,
    source: 'supabase',
    today: {
      date: todayStr,
      is_friday: todayIsFriday,
      is_sunday: todayIsSunday,
      is_holiday: holidayCheck.isHoliday,
      holiday_name: holidayCheck.name,
    },
    holidays,
  });
});

// 1.5 GET /api/holidays/check-today & /api/holidays/today (Fast check if today is holiday)
router.get(['/check-today', '/today'], async (req: Request, res: Response) => {
  const todayStr = getTodayString();
  const dbHolidays = await supabaseHolidays.getAll();
  const holidayCheck = checkIsHoliday(todayStr, dbHolidays || []);

  if (holidayCheck.isHoliday) {
    return res.json({
      success: true,
      is_holiday: true,
      date: todayStr,
      holiday_name: holidayCheck.name,
      is_friday: holidayCheck.isFriday,
      message: `Hari ini libur: ${holidayCheck.name}. Siswa tidak perlu melakukan absensi.`,
    });
  }

  return res.json({
    success: true,
    is_holiday: false,
    date: todayStr,
    holiday_name: null,
    message: 'Hari ini adalah hari aktif sekolah.',
  });
});

// 2. POST /api/holidays (Admin add custom holiday to Supabase)
router.post('/', async (req: Request, res: Response) => {
  try {
    const { date, name, is_recurring = false } = req.body;

    if (!date || !name) {
      return res.status(400).json({
        success: false,
        message: 'Tanggal dan nama hari libur wajib diisi.',
      });
    }

    // Check if Friday
    const dateIsFriday = isFriday(date);
    let fridayWarning: string | null = null;
    if (dateIsFriday) {
      fridayWarning = 'Peringatan: Tanggal yang Anda pilih jatuh pada hari Jumat, yang sudah secara otomatis menjadi hari libur mingguan madrasah.';
    }

    // Check duplicate in Supabase
    const dbList = await supabaseHolidays.getAll();
    if (dbList && dbList.some((h) => h.date === date)) {
      return res.status(400).json({
        success: false,
        message: 'Hari libur pada tanggal ini sudah terdaftar di database.',
      });
    }

    const newHoliday: Holiday = {
      id: crypto.randomUUID(),
      date,
      name: name.trim(),
      is_recurring: Boolean(is_recurring),
      is_friday: dateIsFriday,
      created_at: new Date().toISOString(),
    };

    const created = await supabaseHolidays.create(newHoliday);

    if (!created) {
      return res.status(500).json({
        success: false,
        message: 'Gagal menyimpan hari libur ke database Supabase. Periksa koneksi dan skema database.',
      });
    }

    return res.status(201).json({
      success: true,
      source: 'supabase',
      message: 'Hari libur berhasil ditambahkan ke Supabase.',
      warning: fridayWarning,
      holiday: created,
    });
  } catch (error) {
    console.error('[Holidays] POST error:', error);
    return res.status(500).json({ success: false, message: 'Gagal menambahkan hari libur.' });
  }
});

// 3. DELETE /api/holidays/:id (Admin delete custom holiday from Supabase)
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await supabaseHolidays.delete(id);

    return res.json({ success: true, message: 'Hari libur berhasil dihapus dari Supabase.' });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Gagal menghapus hari libur.' });
  }
});

export default router;
