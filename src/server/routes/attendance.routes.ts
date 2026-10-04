import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { calculateDistanceMeters } from '../lib/distance.js';
import { checkIsHoliday } from '../lib/holidayUtils.js';
import { DEFAULT_ATTENDANCE_SETTINGS, DEFAULT_SCHOOL_LOCATION } from '../lib/defaults.js';
import { getSession } from './auth.routes.js';
import { 
  getWIBDateString, 
  getWIBTimeString, 
  getWIBTimeComponents, 
  timeToMinutes 
} from '../lib/timezone.js';
import { 
  supabaseAttendance, 
  supabaseStudents, 
  supabaseSettings, 
  supabaseLocation, 
  supabaseHolidays,
  supabaseStorage,
  isSupabaseConfigured,
  getDeterministicAttendanceId
} from '../lib/supabase.js';
import { AttendanceRecord, AttendanceStatus, Student } from '../../types.js';

const router = Router();

// Run background job to purge attendance photos older than 24h from Supabase Storage
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    if (isSupabaseConfigured()) {
      supabaseStorage.cleanupExpiredAttendancePhotos(24).catch(() => {});
    }
  }, 15 * 60 * 1000);
}

// Helper to get formatted date string YYYY-MM-DD in WIB
export function getTodayDateString(): string {
  return getWIBDateString();
}

// Helper to get current time string HH:MM:SS in WIB
export function getCurrentTimeString(): string {
  return getWIBTimeString();
}

// Track dates where admin has manually modified or deleted records to prevent auto-resurrection
const manuallyClearedDates = new Set<string>();
let lastAutoAlphaSyncedDate: string | null = null;
let lastAlphaCleanupDate: string | null = null;
let isSyncingAlpha = false;
let hasAutoDeduplicatedToday = false;
const studentCheckInLocks = new Set<string>();

export function markDateManuallyCleared(date: string) {
  if (date) manuallyClearedDates.add(date);
}

export function resetAutoAlphaSyncedDate() {
  lastAutoAlphaSyncedDate = null;
  lastAlphaCleanupDate = null;
  hasAutoDeduplicatedToday = false;
}

/**
 * Deduplicates attendance records by (student_id + date) defensively and sorts
 * them strictly alphabetically by student name (A-Z) case-insensitively.
 */
export function deduplicateAndSortRecords<T extends { student_id?: string; student?: { id?: string; full_name?: string }; student_name?: string; date?: string; status?: string; updated_by_admin?: boolean }>(records: T[]): T[] {
  const map = new Map<string, T>();
  for (const r of records) {
    const studentId = r.student_id || r.student?.id || '';
    const date = r.date || '';
    const key = `${studentId}_${date}`;
    const existing = map.get(key);
    if (!existing) {
      map.set(key, r);
    } else {
      // Prioritize non-ALPHA over ALPHA
      if (existing.status === 'ALPHA' && r.status !== 'ALPHA') {
        map.set(key, r);
      } else if (r.updated_by_admin && !existing.updated_by_admin) {
        map.set(key, r);
      }
    }
  }

  const list = Array.from(map.values());
  return list.sort((a, b) => {
    const nameA = (a.student?.full_name || a.student_name || '').trim();
    const nameB = (b.student?.full_name || b.student_name || '').trim();
    return nameA.localeCompare(nameB, 'id', { sensitivity: 'base' });
  });
}

/**
 * Synchronizes automatic ALPHA records for all active students who have not checked in
 * once current WIB time reaches or passes the school cutoff time.
 * Protected with mutex lock and deterministic ID to guarantee ZERO duplicate records.
 */
export async function syncAutomaticAlphaRecords(): Promise<void> {
  if (isSyncingAlpha) {
    return;
  }

  const todayDate = getWIBDateString();

  // If already synced today or admin cleared/deleted records today, do not auto-generate again!
  if (lastAutoAlphaSyncedDate === todayDate || manuallyClearedDates.has(todayDate)) {
    return;
  }

  isSyncingAlpha = true;
  try {
    const timeComponents = getWIBTimeComponents();

    let settings = DEFAULT_ATTENDANCE_SETTINGS;
    if (isSupabaseConfigured()) {
      const dbSettings = await supabaseSettings.get();
      if (dbSettings) settings = { ...settings, ...dbSettings };
    }

    const alphaCutoff = (settings.alpha_cutoff_time || settings.end_time || '11:30').trim();
    const cutoffMinutes = timeToMinutes(alphaCutoff);

    // If before cutoff time, do not trigger Alpha yet
    if (timeComponents.totalMinutes < cutoffMinutes) {
      // Clean up any premature automatic ALPHA records once per day or when settings change
      if (lastAlphaCleanupDate !== todayDate) {
        await supabaseAttendance.deleteAutomaticAlpha(todayDate).catch(() => {});
        lastAlphaCleanupDate = todayDate;
      }
      lastAutoAlphaSyncedDate = null;
      return;
    }

    // Immediately mark as synced for today to block any subsequent concurrent invocations
    lastAutoAlphaSyncedDate = todayDate;

    // Run auto-deduplication to purge any previous stray duplicates
    if (!hasAutoDeduplicatedToday) {
      await supabaseAttendance.deduplicateRecords(todayDate).catch(() => {});
      hasAutoDeduplicatedToday = true;
    }

    // Check if today is a holiday (Friday, Sunday, or registered school holiday in Supabase)
    const dbHolidays = (await supabaseHolidays.getAll()) || [];
    const holidayCheck = checkIsHoliday(todayDate, dbHolidays);

    if (holidayCheck.isHoliday) {
      return;
    }

    // Get all active students from Supabase (sorted alphabetically A-Z)
    const students = (await supabaseStudents.getAll({ status: 'active' })) || [];
    if (students.length === 0) {
      return;
    }

    // Fetch current today attendance records from Supabase
    const existingRecords = (await supabaseAttendance.getAll({ date: todayDate })) || [];
    const attendedStudentIds = new Set(existingRecords.map((r) => r.student_id));

    // For any active student without attendance today, generate the official ALPHA record in Supabase
    for (const student of students) {
      if (!attendedStudentIds.has(student.id)) {
        const deterministicId = getDeterministicAttendanceId(student.id, todayDate);
        const alphaRecord: AttendanceRecord = {
          id: deterministicId,
          student_id: student.id,
          student_name: student.full_name,
          class_name: student.class_name,
          date: todayDate,
          time: `${alphaCutoff}:00`,
          timestamp: new Date().toISOString(),
          status: 'ALPHA',
          photo_url: null,
          latitude: null,
          longitude: null,
          distance_meters: 0,
          is_valid_location: false,
          notes: `Otomatis ALPHA: Melewati batas waktu akhir sekolah (${alphaCutoff} WIB)`,
          created_at: new Date().toISOString(),
        };

        await supabaseAttendance.create(alphaRecord).catch(() => {});
        attendedStudentIds.add(student.id);
      }
    }
  } catch (err) {
    console.error('Error syncing automatic alpha records:', err);
    lastAutoAlphaSyncedDate = null;
  } finally {
    isSyncingAlpha = false;
  }
}

/**
 * Retroactive synchronization of ALPHA records for missed school days (up to daysBack days).
 * Ensures that even if the server was asleep or nobody opened the application,
 * past active school days have complete, accurate ALPHA records for absent students.
 */
export async function syncMissedAlphaDays(daysBack: number = 7): Promise<{ syncedDays: string[]; totalRecordsCreated: number }> {
  const result = { syncedDays: [] as string[], totalRecordsCreated: 0 };
  if (!isSupabaseConfigured()) return result;

  try {
    let settings = DEFAULT_ATTENDANCE_SETTINGS;
    const dbSettings = await supabaseSettings.get();
    if (dbSettings) settings = { ...settings, ...dbSettings };

    const alphaCutoff = (settings.alpha_cutoff_time || settings.end_time || '11:30').trim();
    const dbHolidays = (await supabaseHolidays.getAll()) || [];
    const students = (await supabaseStudents.getAll({ status: 'active' })) || [];
    if (students.length === 0) return result;

    const now = new Date();
    // Use UTC timestamp offset by +7 hours to get exact WIB date
    const wibNow = new Date(now.getTime() + 7 * 60 * 60 * 1000);

    for (let i = 1; i <= daysBack; i++) {
      const pastDate = new Date(wibNow.getTime() - i * 24 * 60 * 60 * 1000);
      const pastDateStr = pastDate.toISOString().split('T')[0];

      // Skip if marked as manually cleared by admin
      if (manuallyClearedDates.has(pastDateStr)) continue;

      // Check if past date was a holiday (Sunday, Friday, or registered school holiday)
      const holidayCheck = checkIsHoliday(pastDateStr, dbHolidays);
      if (holidayCheck.isHoliday) continue;

      // Fetch existing records for this past day
      const existingRecords = (await supabaseAttendance.getAll({ date: pastDateStr })) || [];
      const attendedStudentIds = new Set(existingRecords.map((r) => r.student_id));

      let dayCount = 0;
      for (const student of students) {
        if (!attendedStudentIds.has(student.id)) {
          const cutoffClean = alphaCutoff.includes(':')
            ? (alphaCutoff.split(':').length === 2 ? `${alphaCutoff}:00` : alphaCutoff)
            : '11:30:00';
          const pastDateObj = new Date(`${pastDateStr}T${cutoffClean}+07:00`);
          const safeTimestamp = !isNaN(pastDateObj.getTime()) ? pastDateObj.toISOString() : new Date().toISOString();

          const deterministicId = getDeterministicAttendanceId(student.id, pastDateStr);
          const alphaRecord: AttendanceRecord = {
            id: deterministicId,
            student_id: student.id,
            student_name: student.full_name,
            class_name: student.class_name,
            date: pastDateStr,
            time: cutoffClean,
            timestamp: safeTimestamp,
            status: 'ALPHA',
            photo_url: null,
            latitude: null,
            longitude: null,
            distance_meters: 0,
            is_valid_location: false,
            notes: `Otomatis ALPHA (Sistem): Siswa tidak melakukan absensi pada hari kegiatan sekolah`,
            created_at: new Date().toISOString(),
          };

          await supabaseAttendance.create(alphaRecord).catch(() => {});
          attendedStudentIds.add(student.id);
          dayCount++;
        }
      }

      if (dayCount > 0) {
        result.syncedDays.push(pastDateStr);
        result.totalRecordsCreated += dayCount;
      }
    }
  } catch (err) {
    console.error('Error in syncMissedAlphaDays:', err);
  }

  return result;
}

// 1. POST /api/attendance/check-in (Student submit attendance)
router.post('/check-in', async (req: Request, res: Response) => {
  let studentLockKey: string | null = null;
  try {
    if (!isSupabaseConfigured()) {
      return res.status(503).json({
        success: false,
        message: 'Koneksi Database Supabase belum aktif di server. Pastikan SUPABASE_URL dan SUPABASE_SERVICE_ROLE_KEY telah diatur di Environment Variables cPanel.',
      });
    }

    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : (req.body.token as string);
    const session = getSession(token);

    if (!session || session.role !== 'student') {
      return res.status(401).json({
        success: false,
        message: 'Akses ditolak. Sesi siswa tidak valid atau telah kedaluwarsa.',
      });
    }

    let student: Student | null = await supabaseStudents.getById(session.userId);
    if (!student && session.username) {
      student = await supabaseStudents.getByUsername(session.username);
    }

    if (!student || !student.is_active) {
      return res.status(403).json({
        success: false,
        message: 'Status akun siswa tidak aktif atau data siswa tidak ditemukan.',
      });
    }

    const { qr_code, latitude, longitude, photo_url, notes } = req.body;
    const todayDate = getTodayDateString();
    const currentTime = getCurrentTimeString();

    // Prevent concurrent rapid double-submit check-ins for the same student
    studentLockKey = `${student.id}_${todayDate}`;
    if (studentCheckInLocks.has(studentLockKey)) {
      return res.status(429).json({
        success: false,
        message: 'Permintaan absensi Anda sedang diproses. Mohon tunggu beberapa saat...',
      });
    }
    studentCheckInLocks.add(studentLockKey);

    // A. Check Holiday / Friday / Sunday / Supabase
    const dbHolidays = (await supabaseHolidays.getAll()) || [];
    const holidayCheck = checkIsHoliday(todayDate, dbHolidays);

    if (holidayCheck.isHoliday) {
      return res.status(400).json({
        success: false,
        message: `Hari ini libur (${holidayCheck.name || 'Jadwal Libur'}), jadi tidak perlu absen.`,
        is_holiday: true,
        holiday_name: holidayCheck.name,
      });
    }

    // Synchronize automatic Alpha records if past cutoff time
    await syncAutomaticAlphaRecords();

    // B. Check One Attendance Per Day in Supabase
    const existingAttendance = await supabaseAttendance.getToday(student.id, todayDate);

    if (existingAttendance) {
      const isAlpha = existingAttendance.status === 'ALPHA';
      const statusText = existingAttendance.status;
      const timeInfo = existingAttendance.time ? ` pada pukul ${existingAttendance.time} WIB` : '';
      const msg = isAlpha
        ? `Waktu absensi hari ini telah berakhir dan status kehadiran Anda telah tercatat sebagai ALPHA (Tanpa Keterangan). Setiap siswa hanya dapat melakukan absensi 1 kali dalam sehari.`
        : `Anda sudah melakukan absensi hari ini dengan status ${statusText}${timeInfo}. Setiap siswa hanya dapat melakukan absensi 1 kali dalam sehari.`;

      return res.status(400).json({
        success: false,
        already_attended: true,
        status: statusText,
        message: msg,
        attendance: existingAttendance,
      });
    }

    // Fetch dynamic settings & location from Supabase
    let settings = DEFAULT_ATTENDANCE_SETTINGS;
    const dbSettings = await supabaseSettings.get();
    if (dbSettings) settings = { ...settings, ...dbSettings };

    let schoolLoc = DEFAULT_SCHOOL_LOCATION;
    const dbLoc = await supabaseLocation.get();
    if (dbLoc) schoolLoc = { ...schoolLoc, ...dbLoc };

    // Check School Cutoff Time (11:30 WIB)
    const alphaCutoff = (settings.alpha_cutoff_time || settings.end_time || '11:30').trim();
    const cutoffMinutes = timeToMinutes(alphaCutoff);
    const [currH, currM] = currentTime.split(':').map(Number);
    const currentMinutes = currH * 60 + currM;

    if (currentMinutes >= cutoffMinutes) {
      await syncAutomaticAlphaRecords();
      const alphaRec = await supabaseAttendance.getToday(student.id, todayDate);
      return res.status(400).json({
        success: false,
        already_attended: true,
        is_cutoff_exceeded: true,
        status: 'ALPHA',
        message: `Waktu absensi hari ini telah ditutup karena telah melewati batas maksimal operasional sekolah pukul ${alphaCutoff} WIB. Kehadiran Anda tercatat sebagai ALPHA (Tanpa Keterangan). Anda tidak dapat melakukan absensi kembali.`,
        attendance: alphaRec || null,
      });
    }

    // C. Validate School QR Code (supports both raw code and deep-link URL from native camera scanning)
    const expectedQr = (settings.school_qr_code || 'NUBA-SMART-ATTENDANCE-2026-NURUL-BAYAN').trim();
    let submittedQr = (qr_code || '').trim();
    if (submittedQr.includes('qr=')) {
      try {
        const parsed = new URL(submittedQr.startsWith('http') ? submittedQr : `https://dummy.local/${submittedQr}`);
        const extracted = parsed.searchParams.get('qr');
        if (extracted) {
          submittedQr = extracted.trim();
        } else if (parsed.hash && parsed.hash.includes('qr=')) {
          const hashMatch = parsed.hash.match(/[#&?]qr=([^&#]+)/);
          if (hashMatch) submittedQr = decodeURIComponent(hashMatch[1]).trim();
        }
      } catch {
        const match = submittedQr.match(/[?&#]qr=([^&#]+)/);
        if (match) submittedQr = decodeURIComponent(match[1]).trim();
      }
    }

    if (!submittedQr || submittedQr !== expectedQr) {
      return res.status(400).json({
        success: false,
        message: 'QR Code tidak valid! Kode yang dipindai bukan QR Code resmi absensi SMA Informatika Nurul Bayan yang dicetak dari dashboard admin.',
      });
    }

    // D. Validate Geolocation GPS & Strict Radius Enforce
    if (typeof latitude !== 'number' || typeof longitude !== 'number') {
      return res.status(400).json({
        success: false,
        message: 'Koordinat GPS lokasi Anda tidak terdeteksi. Pastikan izin lokasi (GPS) diizinkan.',
      });
    }

    const distance = calculateDistanceMeters(
      latitude,
      longitude,
      schoolLoc.latitude,
      schoolLoc.longitude
    );

    const allowedRadius = schoolLoc.radius_meters || 100;
    const isValidLocation = distance <= allowedRadius;

    // Strict validation: Reject check-in if outside allowed radius
    if (!isValidLocation) {
      return res.status(400).json({
        success: false,
        message: `Presensi ditolak. Posisi Anda terdeteksi berjarak ${distance} meter dari sekolah, melebihi batas radius yang diizinkan (${allowedRadius} meter). Pastikan Anda telah berada di lingkungan sekolah.`,
        distance_meters: distance,
        allowed_radius: allowedRadius,
        is_valid_location: false,
      });
    }

    // E. Validate Camera Photo Documentation
    if (!photo_url || typeof photo_url !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Foto kamera dokumentasi wajah wajib diambil sebelum mengirim absensi.',
      });
    }

    // F. Determine Attendance Status based on time settings
    const checkInLimit = settings.check_in_time || settings.on_time_limit || '07:30';
    const [checkInH, checkInM] = checkInLimit.split(':').map(Number);
    const checkInMinutes = checkInH * 60 + checkInM + (settings.late_tolerance_minutes || 0);

    let status: AttendanceStatus = 'HADIR';
    if (currentMinutes > checkInMinutes) {
      status = 'TERLAMBAT';
    }

    let finalPhotoUrl = photo_url;

    // Upload selfie photo to Supabase Storage 'attendance-images' bucket
    if (typeof photo_url === 'string' && photo_url.startsWith('data:')) {
      const photoFileName = `attendance_${student.id}_${todayDate}_${Date.now()}.jpg`;
      const uploadedPublicUrl = await supabaseStorage.uploadBase64(
        'attendance-images',
        photoFileName,
        photo_url,
        'image/jpeg'
      );
      if (uploadedPublicUrl) {
        finalPhotoUrl = uploadedPublicUrl;
      }
    }

    const newAttendanceId = getDeterministicAttendanceId(student.id, todayDate);
    const newRecord: AttendanceRecord = {
      id: newAttendanceId,
      student_id: student.id,
      student_name: student.full_name,
      class_name: student.class_name,
      date: todayDate,
      time: currentTime,
      timestamp: new Date().toISOString(),
      status,
      photo_url: finalPhotoUrl,
      latitude,
      longitude,
      distance_meters: distance,
      is_valid_location: isValidLocation,
      notes: notes || (isValidLocation 
        ? (status === 'TERLAMBAT' ? `Terlambat ${currentMinutes - checkInMinutes} menit (Di sekolah)` : 'Tepat waktu (Di sekolah)')
        : (status === 'TERLAMBAT' ? `Terlambat ${currentMinutes - checkInMinutes} menit (Luar radius ${distance}m)` : `Presensi di luar radius sekolah (${distance}m)`)),
      created_at: new Date().toISOString(),
    };

    // Save to Supabase (Primary)
    const savedRecord = await supabaseAttendance.create(newRecord);
    if (!savedRecord) {
      return res.status(500).json({
        success: false,
        message: 'Gagal menyimpan rekaman absensi ke database Supabase. Periksa izin akses (RLS) tabel attendance_records.',
      });
    }

    return res.status(201).json({
      success: true,
      source: 'supabase',
      message:
        status === 'HADIR'
          ? 'Alhamdulillah, absensi HADIR berhasil tercatat!'
          : `Absensi berhasil tercatat dengan status TERLAMBAT (waktu masuk: ${currentTime}).`,
      attendance: {
        ...savedRecord,
        student,
      },
    });
  } catch (error: any) {
    console.error('Check-in error:', error);
    return res.status(500).json({
      success: false,
      message: 'Terjadi kendala saat memproses absensi.',
    });
  } finally {
    if (studentLockKey) {
      studentCheckInLocks.delete(studentLockKey);
    }
  }
});

// 2. GET /api/attendance/today (Admin monitoring live today from Supabase)
router.get('/today', async (req: Request, res: Response) => {
  // Synchronize automatic Alpha records if past cutoff (11:30 WIB)
  await syncAutomaticAlphaRecords();

  const todayDate = getTodayDateString();
  const classFilter = req.query.class as string;
  const statusFilter = req.query.status as string;

  const dbRecords = await supabaseAttendance.getAll({ date: todayDate });
  const dbStudents = await supabaseStudents.getAll();

  const records: AttendanceRecord[] = dbRecords || [];
  const students: Student[] = dbStudents || [];

  // Attach student details
  let populated = records.map((record) => {
    const student = students.find((s) => s.id === record.student_id);
    return {
      ...record,
      student,
    };
  });

  if (classFilter && classFilter !== 'all') {
    populated = populated.filter((p) => p.student?.class_name === classFilter);
  }

  if (statusFilter && statusFilter !== 'all') {
    populated = populated.filter((p) => p.status === statusFilter);
  }

  // Deduplicate and sort strictly A-Z by student name
  populated = deduplicateAndSortRecords(populated);

  // Check holiday status for today
  const dbHolidays = (await supabaseHolidays.getAll()) || [];
  const holidayCheck = checkIsHoliday(todayDate, dbHolidays);

  // Calculate today stats strictly from deduplicated records
  const activeStudents = students.filter((s) => s.is_active);
  const totalStudents = activeStudents.length;

  const presentCount = populated.filter((att) => att.status === 'HADIR').length;
  const lateCount = populated.filter((att) => att.status === 'TERLAMBAT').length;
  const permissionCount = populated.filter((att) => att.status === 'IZIN').length;
  const sickCount = populated.filter((att) => att.status === 'SAKIT').length;
  const alphaCount = holidayCheck.isHoliday ? 0 : populated.filter((att) => att.status === 'ALPHA').length;
  const attendedCount = presentCount + lateCount + permissionCount + sickCount;

  return res.json({
    success: true,
    source: 'supabase',
    date: todayDate,
    is_holiday: holidayCheck.isHoliday,
    holiday_name: holidayCheck.name,
    records: populated,
    stats: {
      total_students: totalStudents,
      total_present: presentCount,
      total_late: lateCount,
      total_permission: permissionCount,
      total_sick: sickCount,
      total_alpha: alphaCount,
      attendance_percentage: holidayCheck.isHoliday ? 100 : (totalStudents > 0 ? Math.round((attendedCount / totalStudents) * 100) : 0),
    },
  });
});

// 3. GET /api/attendance/my-today (Check student status for today from Supabase)
router.get('/my-today', async (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : (req.query.token as string);
  const session = getSession(token);

  if (!session || session.role !== 'student') {
    return res.status(401).json({
      success: false,
      message: 'Sesi tidak valid.',
    });
  }

  // Ensure automatic Alpha is synchronized if past cutoff
  await syncAutomaticAlphaRecords();

  const todayDate = getTodayDateString();

  const [dbHolidays, record, dbSettings] = await Promise.all([
    supabaseHolidays.getAll().catch(() => []),
    supabaseAttendance.getToday(session.userId, todayDate).catch(() => null),
    supabaseSettings.get().catch(() => null),
  ]);

  const holidayCheck = checkIsHoliday(todayDate, dbHolidays || []);
  const isAlpha = record?.status === 'ALPHA';

  let settings = DEFAULT_ATTENDANCE_SETTINGS;
  if (dbSettings) {
    settings = { ...settings, ...dbSettings };
  }

  const startTime = (settings.start_time || '06:00').trim();
  const onTimeLimit = (settings.on_time_limit || settings.check_in_time || '07:15').trim();
  const endTime = (settings.end_time || settings.alpha_cutoff_time || '11:30').trim();

  return res.json({
    success: true,
    source: 'supabase',
    today_date: todayDate,
    is_holiday: holidayCheck.isHoliday,
    holiday_name: holidayCheck.name,
    holiday_description: holidayCheck.description,
    has_attended: Boolean(record),
    is_alpha: isAlpha,
    attendance: record || null,
    settings: {
      start_time: startTime,
      on_time_limit: onTimeLimit,
      end_time: endTime,
      alpha_cutoff_time: endTime,
      gps_radius_meters: Number(settings.gps_radius_meters) || 100,
    },
  });
});

// 4. GET /api/attendance/my-history (Student attendance history with 24h photo expiry from Supabase)
router.get('/my-history', async (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : (req.query.token as string);
  const session = getSession(token);

  if (!session || session.role !== 'student') {
    return res.status(401).json({
      success: false,
      message: 'Sesi tidak valid.',
    });
  }

  const statusFilter = req.query.status as string;
  const now = Date.now();
  const ONE_DAY_MS = 24 * 60 * 60 * 1000;

  const dbRecords = await supabaseAttendance.getHistory(session.userId, statusFilter);
  const records: AttendanceRecord[] = dbRecords || [];
  // Deduplicate by date if any duplicates exist in student history
  const historyMap = new Map<string, AttendanceRecord>();
  for (const r of records) {
    if (!historyMap.has(r.date)) {
      historyMap.set(r.date, r);
    } else {
      const ex = historyMap.get(r.date)!;
      if (ex.status === 'ALPHA' && r.status !== 'ALPHA') {
        historyMap.set(r.date, r);
      }
    }
  }
  const uniqueHistory = Array.from(historyMap.values()).sort((a, b) => b.date.localeCompare(a.date));

  // Check 24-hour photo expiration rule
  const formatted = uniqueHistory.map((record) => {
    const recordTime = new Date(record.timestamp || `${record.date}T${record.time}`).getTime();
    const isPhotoExpired = now - recordTime > ONE_DAY_MS;

    return {
      ...record,
      is_photo_expired: isPhotoExpired,
      photo_url: isPhotoExpired ? null : record.photo_url,
      photo_notice: isPhotoExpired ? 'Dokumentasi foto telah kedaluwarsa.' : null,
    };
  });

  return res.json({
    success: true,
    source: 'supabase',
    records: formatted,
  });
});

// 5. GET /api/attendance/recap (Admin recap with filters & stats from Supabase)
router.get('/recap', async (req: Request, res: Response) => {
  const { start_date, end_date, class_name, status } = req.query;

  const dbRecords = await supabaseAttendance.getAll({
    start_date: typeof start_date === 'string' ? start_date : undefined,
    end_date: typeof end_date === 'string' ? end_date : undefined,
    class_name: typeof class_name === 'string' ? class_name : undefined,
    status: typeof status === 'string' ? status : undefined,
  });
  const dbStudents = await supabaseStudents.getAll();

  const records = dbRecords || [];
  const students = dbStudents || [];

  let populated = records.map((record) => {
    const student = students.find((s) => s.id === record.student_id);
    return {
      ...record,
      student,
    };
  });

  if (class_name && class_name !== 'all') {
    populated = populated.filter((p) => p.student?.class_name === class_name);
  }

  if (status && status !== 'all') {
    populated = populated.filter((p) => p.status === status);
  }

  // Deduplicate and sort strictly A-Z by student name
  populated = deduplicateAndSortRecords(populated);

  const totalHadir = populated.filter((p) => p.status === 'HADIR').length;
  const totalTerlambat = populated.filter((p) => p.status === 'TERLAMBAT').length;
  const totalIzin = populated.filter((p) => p.status === 'IZIN').length;
  const totalSakit = populated.filter((p) => p.status === 'SAKIT').length;
  const totalAlpha = populated.filter((p) => p.status === 'ALPHA').length;

  return res.json({
    success: true,
    source: 'supabase',
    records: populated,
    summary: {
      total_records: populated.length,
      total_hadir: totalHadir,
      total_terlambat: totalTerlambat,
      total_izin: totalIzin,
      total_sakit: totalSakit,
      total_alpha: totalAlpha,
    },
  });
});

// 6. PUT /api/attendance/:id/status (Admin change status with confirmation & reason in Supabase)
router.put('/:id/status', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status, reason } = req.body;

    const validStatuses: AttendanceStatus[] = ['HADIR', 'TERLAMBAT', 'IZIN', 'SAKIT', 'ALPHA'];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Status kehadiran yang dipilih tidak valid.',
      });
    }

    const updated_reason = reason || `Diubah oleh Admin menjadi ${status}`;

    const updatedRecord = await supabaseAttendance.update(id, {
      status,
      updated_by_admin: true,
      updated_reason,
    });

    if (!updatedRecord) {
      return res.status(404).json({
        success: false,
        message: 'Data absensi tidak ditemukan di database.',
      });
    }

    return res.json({
      success: true,
      message: `Status kehadiran berhasil diubah menjadi ${status}.`,
      attendance: updatedRecord,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Gagal memperbarui status kehadiran.',
    });
  }
});

// Delete single attendance record (Admin only)
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ success: false, message: 'ID absensi wajib disertakan.' });
    }

    markDateManuallyCleared(getTodayDateString());
    const success = await supabaseAttendance.delete(id);
    if (!success) {
      return res.status(500).json({ success: false, message: 'Gagal menghapus data absensi dari database Supabase.' });
    }

    return res.json({ success: true, message: 'Data absensi berhasil dihapus dari Supabase.' });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message || 'Terjadi kesalahan saat menghapus data.' });
  }
});

// Bulk delete attendance records (Admin only)
router.post('/bulk-delete', async (req: Request, res: Response) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, message: 'Pilih minimal satu data absensi untuk dihapus.' });
    }

    markDateManuallyCleared(getTodayDateString());
    const success = await supabaseAttendance.deleteMany(ids);
    if (!success) {
      return res.status(500).json({ success: false, message: 'Gagal menghapus data terpilih dari database Supabase.' });
    }

    return res.json({ success: true, message: `Berhasil menghapus ${ids.length} data absensi dari Supabase.` });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message || 'Terjadi kesalahan saat menghapus data terpilih.' });
  }
});

// Delete all attendance records (Admin only)
router.delete('/', async (req: Request, res: Response) => {
  try {
    const date = req.query.date as string | undefined;
    const class_name = req.query.class_name as string | undefined;

    markDateManuallyCleared(date || getTodayDateString());
    const success = await supabaseAttendance.deleteAll({ date, class_name });
    if (!success) {
      return res.status(500).json({ success: false, message: 'Gagal menghapus seluruh data absensi dari Supabase.' });
    }

    return res.json({ success: true, message: 'Seluruh data absensi berhasil dihapus dari database Supabase.' });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message || 'Terjadi kesalahan saat menghapus data.' });
  }
});

// Trigger manual / scheduler alpha sync & retroactive catchup (Admin or background scheduler)
router.post('/sync-alpha', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : (req.body?.token as string);
    const session = getSession(token);

    if (!session || session.role !== 'admin') {
      return res.status(401).json({ success: false, message: 'Hanya Admin yang dapat memicu sinkronisasi alpha.' });
    }

    resetAutoAlphaSyncedDate();
    await syncAutomaticAlphaRecords();
    const missedResult = await syncMissedAlphaDays(7);

    return res.json({
      success: true,
      message: 'Sinkronisasi Alpha harian dan hari terlewat berhasil dijalankan.',
      today_synced: lastAutoAlphaSyncedDate,
      retroactive_synced_days: missedResult.syncedDays,
      total_retroactive_records: missedResult.totalRecordsCreated,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message || 'Gagal menyinkronkan data alpha.' });
  }
});

export default router;

