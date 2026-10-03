-- ====================================================================
-- SKEMA DATABASE UTAMA SUPABASE (POSTGRESQL)
-- Sistem Absensi Digital Siswa SMA Informatika Nurul Bayan
-- ====================================================================
-- Panduan:
-- 1. Buka dashboard Supabase: https://supabase.com/dashboard
-- 2. Pilih Project Anda -> Masuk ke menu "SQL Editor"
-- 3. Tempelkan seluruh isi script ini dan klik "RUN"
-- ====================================================================

-- 1. Tabel Users (Autentikasi Akun Siswa & Admin)
CREATE TABLE IF NOT EXISTS public.users (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'student' CHECK (role IN ('student', 'admin')),
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Tabel Siswa (Biodata & Profil Siswa)
CREATE TABLE IF NOT EXISTS public.students (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  username TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  class_name TEXT NOT NULL,
  gender TEXT NOT NULL CHECK (gender IN ('Laki-laki', 'Perempuan')),
  whatsapp TEXT NOT NULL,
  profile_photo_url TEXT,
  is_active BOOLEAN DEFAULT true NOT NULL,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Tabel Riwayat Presensi Siswa
CREATE TABLE IF NOT EXISTS public.attendance_records (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  student_name TEXT,
  class_name TEXT,
  date DATE NOT NULL,
  time TIME NOT NULL,
  timestamp TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('HADIR', 'TERLAMBAT', 'IZIN', 'SAKIT', 'ALPHA')),
  photo_url TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  distance_meters NUMERIC,
  is_valid_location BOOLEAN DEFAULT true,
  notes TEXT,
  updated_by_admin BOOLEAN DEFAULT false,
  updated_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Index untuk pencarian cepat presensi per siswa dan per tanggal
-- Constraint unik: Siswa hanya boleh absen 1 kali per hari (mencegah data ganda/duplikasi)
CREATE UNIQUE INDEX IF NOT EXISTS idx_attendance_student_date_unique ON public.attendance_records(student_id, date);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON public.attendance_records(date);
CREATE INDEX IF NOT EXISTS idx_attendance_class ON public.attendance_records(class_name);

-- 4. Tabel Jadwal Pelajaran (Schedules)
CREATE TABLE IF NOT EXISTS public.schedules (
  id TEXT PRIMARY KEY,
  class_name TEXT NOT NULL,
  day TEXT NOT NULL CHECK (day IN ('Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu')),
  subject TEXT NOT NULL,
  teacher TEXT NOT NULL,
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  room TEXT,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. Tabel Gambar Jadwal Pelajaran (Schedule Images)
CREATE TABLE IF NOT EXISTS public.schedule_images (
  id TEXT PRIMARY KEY,
  class_grade TEXT UNIQUE NOT NULL CHECK (class_grade IN ('10', '11', '12')),
  class_name TEXT,
  image_url TEXT NOT NULL,
  title TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. Tabel Pengumuman Sekolah (Announcements)
CREATE TABLE IF NOT EXISTS public.announcements (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  date TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'published' CHECK (status IN ('published', 'draft')),
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('normal', 'important', 'penting')),
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  is_active BOOLEAN DEFAULT true NOT NULL
);

-- 7. Tabel Hari Libur & Kalender Madrasah (Holidays)
CREATE TABLE IF NOT EXISTS public.holidays (
  id TEXT PRIMARY KEY,
  date DATE UNIQUE NOT NULL,
  name TEXT NOT NULL,
  is_recurring BOOLEAN DEFAULT false,
  is_friday BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 8. Tabel Lokasi Titik Pusat Sekolah & Radius Geofence (School Location)
CREATE TABLE IF NOT EXISTS public.school_location (
  id TEXT PRIMARY KEY,
  school_name TEXT NOT NULL,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  radius_meters NUMERIC NOT NULL DEFAULT 100,
  address TEXT,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 9. Tabel Konfigurasi Jam Presensi (Attendance Settings)
CREATE TABLE IF NOT EXISTS public.attendance_settings (
  id TEXT PRIMARY KEY,
  start_time TEXT NOT NULL DEFAULT '06:00',
  on_time_limit TEXT NOT NULL DEFAULT '07:30',
  end_time TEXT NOT NULL DEFAULT '17:00',
  gps_radius_meters NUMERIC NOT NULL DEFAULT 100,
  check_in_time TEXT DEFAULT '07:30',
  check_out_time TEXT DEFAULT '15:30',
  alpha_cutoff_time TEXT DEFAULT '10:00',
  late_tolerance_minutes NUMERIC DEFAULT 0,
  school_qr_code TEXT DEFAULT 'SMANUBAPRESENSI2025',
  admin_whatsapp TEXT DEFAULT '081234567890',
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 10. Tabel Push Notification Subscriptions (Web Push VAPID)
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id TEXT NOT NULL,
  endpoint TEXT NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(user_id, endpoint)
);

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user ON public.push_subscriptions(user_id);

-- ====================================================================
-- DATA AWAL DEFAULT (SEED DATA)
-- ====================================================================

-- Lokasi Sekolah SMA Informatika Nurul Bayan (Cimerak, Pangandaran)
INSERT INTO public.school_location (id, school_name, latitude, longitude, radius_meters, address, updated_at)
VALUES (
  'primary-loc',
  'SMA Informatika Nurul Bayan',
  -7.694665,
  108.503254,
  100,
  'Jl. Sukajaya No. 12, Cimerak, Pangandaran, Jawa Barat',
  now()
) ON CONFLICT (id) DO UPDATE SET
  school_name = EXCLUDED.school_name,
  latitude = EXCLUDED.latitude,
  longitude = EXCLUDED.longitude,
  radius_meters = EXCLUDED.radius_meters;

-- Pengaturan Waktu Presensi Default
INSERT INTO public.attendance_settings (id, start_time, on_time_limit, end_time, gps_radius_meters, check_in_time, check_out_time, alpha_cutoff_time, school_qr_code, updated_at)
VALUES (
  'primary-settings',
  '06:00',
  '07:30',
  '17:00',
  100,
  '07:30',
  '15:30',
  '10:00',
  'SMANUBAPRESENSI2025',
  now()
) ON CONFLICT (id) DO UPDATE SET
  on_time_limit = EXCLUDED.on_time_limit,
  school_qr_code = EXCLUDED.school_qr_code;

-- Pengumuman Selamat Datang
INSERT INTO public.announcements (id, title, content, date, status, priority, created_at)
VALUES (
  'ann-1',
  'Selamat Datang di Sistem Presensi Digital SMA Informatika Nurul Bayan',
  'Gunakan aplikasi ini untuk melakukan absensi harian dengan scan barcode di sekolah, validasi titik koordinat GPS gerbang sekolah, dan dokumentasi foto berseragam rapi.',
  TO_CHAR(now(), 'YYYY-MM-DD'),
  'published',
  'important',
  now()
) ON CONFLICT (id) DO NOTHING;

-- Akun Siswa Demo Awal
INSERT INTO public.users (id, username, password_hash, role, created_at)
VALUES 
  ('u-1', 'rizky.nuba', 'siswa123', 'student', now()),
  ('u-2', 'anisa.nuba', 'siswa123', 'student', now())
ON CONFLICT (username) DO NOTHING;

INSERT INTO public.students (id, user_id, username, full_name, class_name, gender, whatsapp, is_active, created_at)
VALUES 
  ('s-1', 'u-1', 'rizky.nuba', 'Muhammad Rizky Pratama', 'XI RPL 1', 'Laki-laki', '081234567891', true, now()),
  ('s-2', 'u-2', 'anisa.nuba', 'Anisa Rahmawati', 'XI RPL 1', 'Perempuan', '081234567892', true, now())
ON CONFLICT (username) DO NOTHING;
