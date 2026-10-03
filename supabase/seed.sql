-- ====================================================================
-- SEED DATA: Absensi Digital SMA Informatika Nurul Bayan
-- ====================================================================

-- 1. Inisialisasi Lokasi Sekolah
INSERT INTO public.school_location (id, school_name, latitude, longitude, radius_meters, address, updated_at)
VALUES (
  'a0000000-0000-0000-0000-000000000001',
  'SMA Informatika Nurul Bayan',
  -7.678912,
  108.456789,
  100,
  'Jl. Raya Cimerak, Kec. Cimerak, Kabupaten Pangandaran, Jawa Barat',
  now()
) ON CONFLICT (id) DO NOTHING;

-- 2. Inisialisasi Pengaturan Absensi
INSERT INTO public.attendance_settings (id, check_in_time, check_out_time, alpha_cutoff_time, late_tolerance_minutes, school_qr_code, updated_at)
VALUES (
  'b0000000-0000-0000-0000-000000000001',
  '07:30',
  '14:30',
  '10:00',
  0,
  'NUBA-SMART-ATTENDANCE-2026-NURUL-BAYAN',
  now()
) ON CONFLICT (id) DO NOTHING;

-- 3. Inisialisasi Hari Libur Otomatis & Nasional
INSERT INTO public.holidays (date, name, is_recurring)
VALUES 
  ('2026-01-01', 'Tahun Baru Masehi', true),
  ('2026-05-01', 'Hari Buruh Internasional', true),
  ('2026-08-17', 'Hari Kemerdekaan RI Ke-81', true)
ON CONFLICT (date) DO NOTHING;

-- 4. Inisialisasi Pengumuman Awal
INSERT INTO public.announcements (id, title, content, date, status, priority, created_at)
VALUES 
  (
    'c0000000-0000-0000-0000-000000000001',
    'Penerapan Sistem Absensi Digital Baru',
    'Mulai semester ini, seluruh siswa SMA Informatika Nurul Bayan diwajibkan melakukan absensi digital mandiri melalui pemindaian QR Code di jendela sekolah, verifikasi lokasi GPS, dan dokumentasi foto wajah kamera depan sebelum pukul 07:30 WIB.',
    CURRENT_DATE,
    'published',
    'important',
    now()
  ),
  (
    'c0000000-0000-0000-0000-000000000002',
    'Jadwal Kegiatan Belajar Mengajar',
    'Pemberitahuan kepada seluruh siswa: Hari Jumat adalah hari libur mingguan madrasah. KBM berjalan normal dari hari Sabtu sampai dengan hari Kamis.',
    CURRENT_DATE,
    'published',
    'normal',
    now()
  )
ON CONFLICT (id) DO NOTHING;

-- 5. Inisialisasi Jadwal Pelajaran (Mapel) Contoh
INSERT INTO public.schedules (class_name, day, subject, teacher, start_time, end_time, room)
VALUES
  ('X RPL 1', 'Sabtu', 'Pemrograman Dasar', 'Ust. Ahmad Fauzi, S.Kom', '07:30', '09:30', 'Lab Komputer 1'),
  ('X RPL 1', 'Sabtu', 'Pendidikan Agama Islam', 'Ust. Hasan Basri, M.Pd.I', '09:45', '11:15', 'Ruang X-1'),
  ('X RPL 1', 'Senin', 'Matematika Terapan', 'Ibu Siti Rahmawati, S.Pd', '07:30', '09:30', 'Ruang X-1'),
  ('X RPL 1', 'Senin', 'Bahasa Inggris IT', 'Bpk. Dani Setiawan, S.Pd', '09:45', '11:15', 'Ruang X-1'),
  ('XI RPL 1', 'Sabtu', 'Basis Data & SQL', 'Ust. Ahmad Fauzi, S.Kom', '07:30', '09:30', 'Lab Komputer 2'),
  ('XI RPL 1', 'Senin', 'Pemrograman Web & Mobile', 'Bpk. Rizky Fadilah, S.T', '07:30', '10:30', 'Lab Komputer 2'),
  ('XII TKJ 1', 'Sabtu', 'Administrasi Infrastruktur Jaringan', 'Bpk. Hendra Gunawan, M.Kom', '07:30', '10:00', 'Lab Jaringan'),
  ('XII TKJ 1', 'Senin', 'Keamanan Jaringan Komputer', 'Bpk. Hendra Gunawan, M.Kom', '07:30', '09:30', 'Lab Jaringan')
ON CONFLICT DO NOTHING;
