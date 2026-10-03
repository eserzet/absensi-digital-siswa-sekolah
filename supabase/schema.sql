-- ====================================================================
-- SCHEMA DATABASE: Absensi Digital SMA Informatika Nurul Bayan
-- Engine: Supabase PostgreSQL
-- ====================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. USERS TABLE
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  username VARCHAR(50) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role VARCHAR(20) NOT NULL CHECK (role IN ('student', 'admin')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. STUDENTS TABLE
CREATE TABLE IF NOT EXISTS public.students (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  full_name VARCHAR(100) NOT NULL,
  class_name VARCHAR(30) NOT NULL,
  gender VARCHAR(20) NOT NULL CHECK (gender IN ('Laki-laki', 'Perempuan')),
  whatsapp VARCHAR(25) NOT NULL,
  profile_photo_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4. ATTENDANCE TABLE (SATU SISWA SATU ABSENSI MASUK PER HARI)
CREATE TABLE IF NOT EXISTS public.attendance (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  time TIME NOT NULL DEFAULT CURRENT_TIME,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
  status VARCHAR(20) NOT NULL CHECK (status IN ('HADIR', 'TERLAMBAT', 'IZIN', 'SAKIT', 'ALPHA')),
  photo_url TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  distance_meters DOUBLE PRECISION,
  is_valid_location BOOLEAN DEFAULT true,
  notes TEXT,
  updated_by_admin BOOLEAN DEFAULT false,
  updated_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT unique_student_daily_attendance UNIQUE (student_id, date)
);

-- 5. ANNOUNCEMENTS TABLE
CREATE TABLE IF NOT EXISTS public.announcements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title VARCHAR(200) NOT NULL,
  content TEXT NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  status VARCHAR(20) NOT NULL CHECK (status IN ('published', 'draft')) DEFAULT 'published',
  priority VARCHAR(20) NOT NULL CHECK (priority IN ('normal', 'important')) DEFAULT 'normal',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 6. ANNOUNCEMENT READS (STATUS BACA PER SISWA)
CREATE TABLE IF NOT EXISTS public.announcement_reads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  announcement_id UUID NOT NULL REFERENCES public.announcements(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  read_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT unique_student_announcement_read UNIQUE (announcement_id, student_id)
);

-- 7. HOLIDAYS TABLE (MANAJEMEN HARI LIBUR)
CREATE TABLE IF NOT EXISTS public.holidays (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  date DATE NOT NULL UNIQUE,
  name VARCHAR(150) NOT NULL,
  is_recurring BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 8. SCHEDULES TABLE (MAPEL & JADWAL PELAJARAN)
CREATE TABLE IF NOT EXISTS public.schedules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  class_name VARCHAR(30) NOT NULL,
  day VARCHAR(15) NOT NULL CHECK (day IN ('Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu')),
  subject VARCHAR(100) NOT NULL,
  teacher VARCHAR(100) NOT NULL,
  start_time VARCHAR(10) NOT NULL,
  end_time VARCHAR(10) NOT NULL,
  room VARCHAR(50),
  schedule_image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 9. ATTENDANCE SETTINGS TABLE
CREATE TABLE IF NOT EXISTS public.attendance_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  check_in_time VARCHAR(10) NOT NULL DEFAULT '07:30',
  check_out_time VARCHAR(10) NOT NULL DEFAULT '14:30',
  alpha_cutoff_time VARCHAR(10) NOT NULL DEFAULT '10:00',
  late_tolerance_minutes INT NOT NULL DEFAULT 0,
  school_qr_code VARCHAR(150) NOT NULL DEFAULT 'NUBA-SMART-ATTENDANCE-2026-NURUL-BAYAN',
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 10. SCHOOL LOCATION TABLE (TITIK KOORDINAT DAN RADIUS SEKOLAH)
CREATE TABLE IF NOT EXISTS public.school_location (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_name VARCHAR(150) NOT NULL DEFAULT 'SMA Informatika Nurul Bayan',
  latitude DOUBLE PRECISION NOT NULL DEFAULT -7.6789,
  longitude DOUBLE PRECISION NOT NULL DEFAULT 108.4567,
  radius_meters INT NOT NULL DEFAULT 100,
  address TEXT NOT NULL DEFAULT 'Jl. Raya Cimerak, Kec. Cimerak, Kab. Pangandaran, Jawa Barat',
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ====================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ====================================================================

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcement_reads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.holidays ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_location ENABLE ROW LEVEL SECURITY;

-- Allow public read for school settings and location (needed for QR & GPS verification)
CREATE POLICY "Public read school_location" ON public.school_location FOR SELECT USING (true);
CREATE POLICY "Public read attendance_settings" ON public.attendance_settings FOR SELECT USING (true);
CREATE POLICY "Public read published announcements" ON public.announcements FOR SELECT USING (status = 'published');
CREATE POLICY "Public read schedules" ON public.schedules FOR SELECT USING (true);
CREATE POLICY "Public read holidays" ON public.holidays FOR SELECT USING (true);

-- Backend Service Role Bypass: The backend uses SUPABASE_SERVICE_ROLE_KEY which automatically bypasses RLS for privileged operations.

-- ====================================================================
-- STORAGE BUCKETS SETUP (Execute in Supabase SQL Editor / Storage Panel)
-- ====================================================================

-- 1. profile-images (Bucket foto profil siswa)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('profile-images', 'profile-images', true)
ON CONFLICT (id) DO NOTHING;

-- 2. attendance-images (Bucket foto dokumentasi kamera absensi)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('attendance-images', 'attendance-images', true)
ON CONFLICT (id) DO NOTHING;

-- 3. schedule-images (Bucket gambar jadwal pelajaran kelas 10, 11, 12)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('schedule-images', 'schedule-images', true)
ON CONFLICT (id) DO NOTHING;
