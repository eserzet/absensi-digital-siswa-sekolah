import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { isFriday, isSunday, checkIsHoliday } from '../lib/holidayUtils.js';
import { supabaseHolidays, supabaseAnnouncements, isSupabaseConfigured } from '../lib/supabase.js';
import { broadcastPush } from '../lib/pushService.js';
import { Holiday, Announcement } from '../../types.js';

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
      holiday_description: holidayCheck.description,
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
      holiday_description: holidayCheck.description,
      is_friday: holidayCheck.isFriday,
      message: holidayCheck.description || `Hari ini libur: ${holidayCheck.name}. Siswa tidak perlu melakukan absensi.`,
    });
  }

  return res.json({
    success: true,
    is_holiday: false,
    date: todayStr,
    holiday_name: null,
    holiday_description: null,
    message: 'Hari ini adalah hari aktif sekolah.',
  });
});

// 2. POST /api/holidays (Admin add custom holiday to Supabase)
router.post('/', async (req: Request, res: Response) => {
  try {
    let { date, end_date, name, description, is_recurring = false } = req.body;

    if (!date || !name) {
      return res.status(400).json({
        success: false,
        message: 'Tanggal dan nama hari libur wajib diisi.',
      });
    }

    // Normalisasi tanggal: jika end_date tidak diisi, gunakan date
    let startDate = date.trim();
    let endDate = end_date ? end_date.trim() : startDate;

    // Jika admin terbalik mengisi tanggal mulai & selesai, otomatis swap
    if (startDate > endDate) {
      const temp = startDate;
      startDate = endDate;
      endDate = temp;
    }

    // Cek apakah ada hari Jumat di dalam rentang tanggal
    let hasFriday = false;
    try {
      const cur = new Date(startDate + 'T00:00:00');
      const stop = new Date(endDate + 'T00:00:00');
      while (cur <= stop) {
        if (cur.getDay() === 5) {
          hasFriday = true;
          break;
        }
        cur.setDate(cur.getDate() + 1);
      }
    } catch {
      hasFriday = isFriday(startDate);
    }

    let fridayWarning: string | null = null;
    if (hasFriday) {
      fridayWarning = (startDate === endDate)
        ? 'Peringatan: Tanggal yang Anda pilih jatuh pada hari Jumat, yang sudah otomatis menjadi hari libur mingguan madrasah.'
        : 'Catatan: Rentang tanggal libur ini mencakup hari Jumat (hari libur mingguan madrasah).';
    }

    // Cek duplikasi atau benturan rentang di database
    const dbList = await supabaseHolidays.getAll();
    if (dbList && dbList.length > 0) {
      const conflict = dbList.find((h) => {
        const hStart = h.date;
        const hEnd = h.end_date || h.date;
        // Check overlap [startDate, endDate] with [hStart, hEnd]
        return startDate <= hEnd && endDate >= hStart;
      });

      if (conflict) {
        return res.status(400).json({
          success: false,
          message: `Rentang tanggal ini bertabrakan dengan hari libur "${conflict.name}" (${conflict.date}${conflict.end_date ? ' s/d ' + conflict.end_date : ''}).`,
        });
      }
    }

    const newHoliday: Holiday = {
      id: crypto.randomUUID(),
      date: startDate,
      end_date: endDate !== startDate ? endDate : null,
      name: name.trim(),
      description: description ? description.trim() : null,
      is_recurring: Boolean(is_recurring),
      is_friday: isFriday(startDate),
      created_at: new Date().toISOString(),
    };

    const created = await supabaseHolidays.create(newHoliday);

    if (!created) {
      return res.status(500).json({
        success: false,
        message: 'Gagal menyimpan hari libur ke database Supabase. Periksa koneksi dan skema database.',
      });
    }

    // Helper text for date range
    const isRange = Boolean(created.end_date && created.end_date !== created.date);
    const dateText = isRange
      ? `${created.date} s/d ${created.end_date}`
      : created.date;

    // 1. Send push notification to all subscribed devices (background, non-blocking)
    const pushBody = created.description
      ? `(${dateText}) ${created.description}`
      : `Sekolah diliburkan pada ${dateText}. Siswa tidak perlu melakukan absensi.`;

    broadcastPush({
      title: `🏖️ Libur Sekolah: ${created.name}`,
      body: pushBody.substring(0, 120) + (pushBody.length > 120 ? '...' : ''),
      url: '/',
      tag: `holiday-${created.id}`,
    }).catch((err) => console.error('[Holidays] Push broadcast error:', err));

    // 2. Also auto-publish an announcement in Supabase so in-app bell, toast, & modal receive it
    try {
      const announcementHash = crypto.createHash('sha256').update(`holiday_announcement_${created.id}`).digest('hex');
      const linkedAnnouncementId = `${announcementHash.substring(0, 8)}-${announcementHash.substring(8, 12)}-4${announcementHash.substring(13, 16)}-8${announcementHash.substring(17, 20)}-${announcementHash.substring(20, 32)}`;

      const announcementContent = `Diumumkan kepada seluruh siswa bahwa madrasah diliburkan pada tanggal ${dateText}.${created.description ? `\n\nKeterangan: ${created.description}` : ''}\n\nSiswa tidak perlu melakukan absensi masuk selama hari libur berlangsung.`;

      const holidayAnnouncement: Announcement = {
        id: linkedAnnouncementId,
        title: `🏖️ Libur Sekolah: ${created.name}`,
        content: announcementContent,
        date: created.date,
        status: 'published',
        priority: 'important',
        created_at: new Date().toISOString(),
        is_active: true,
      };

      supabaseAnnouncements.create(holidayAnnouncement).catch((err) =>
        console.error('[Holidays] Auto announcement error:', err)
      );
    } catch (annError) {
      console.error('[Holidays] Failed to create linked announcement:', annError);
    }

    return res.status(201).json({
      success: true,
      source: 'supabase',
      message: 'Hari libur berhasil ditambahkan ke Supabase dan disiarkan ke seluruh siswa.',
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

    // Also clean up linked holiday announcement if any
    try {
      const announcementHash = crypto.createHash('sha256').update(`holiday_announcement_${id}`).digest('hex');
      const linkedAnnouncementId = `${announcementHash.substring(0, 8)}-${announcementHash.substring(8, 12)}-4${announcementHash.substring(13, 16)}-8${announcementHash.substring(17, 20)}-${announcementHash.substring(20, 32)}`;
      await supabaseAnnouncements.delete(linkedAnnouncementId);
    } catch (err) {
      console.error('[Holidays] Cleanup linked announcement error:', err);
    }

    return res.json({ success: true, message: 'Hari libur berhasil dihapus dari Supabase.' });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Gagal menghapus hari libur.' });
  }
});

export default router;
