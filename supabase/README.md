# Panduan Setup Supabase Database & Storage

Dokumen ini menjelaskan langkah demi langkah pengaturan Supabase untuk aplikasi **Absensi Digital SMA Informatika Nurul Bayan**.

## Langkah 1: Buat Project di Supabase
1. Buka [https://supabase.com](https://supabase.com) dan login ke akun Anda.
2. Klik tombol **New Project**.
3. Beri nama project: `absensi-nurul-bayan`.
4. Atur Database Password (simpan password dengan aman).
5. Pilih Region terdekat (contoh: `Singapore - ap-southeast-1`).
6. Klik **Create new project** dan tunggu proses provisioning (~1-2 menit).

## Langkah 2: Dapatkan Kredensial API
1. Masuk ke menu **Project Settings** (ikon gear di sidebar bawah).
2. Pilih tab **API**.
3. Salin data berikut:
   - **Project URL** (contoh: `https://xyzproject.supabase.co`)
   - **anon / public key** (untuk Frontend)
   - **service_role key** (Secret untuk Backend - JANGAN PERNAH dimasukkan ke Frontend!)

## Langkah 3: Eksekusi SQL Schema
1. Masuk ke menu **SQL Editor** di sidebar Supabase.
2. Klik **New Query**.
3. Buka file `supabase/schema.sql`, salin seluruh kodenya, dan paste ke SQL Editor.
4. Klik **Run** (Ctrl+Enter).
5. Pastikan semua tabel (`users`, `students`, `attendance`, `announcements`, `announcement_reads`, `holidays`, `schedules`, `attendance_settings`, `school_location`) berhasil dibuat.

## Langkah 4: Eksekusi Seed Data
1. Buka kembali **SQL Editor** -> **New Query**.
2. Salin isi file `supabase/seed.sql` dan paste ke SQL Editor.
3. Klik **Run**. Data awal sekolah, pengumuman, dan jadwal pelajaran akan terisi otomatis.

## Langkah 5: Setup Supabase Storage
1. Buka menu **Storage** di sidebar Supabase.
2. Pastikan 3 bucket berikut telah dibuat:
   - `profile-images` (Public bucket)
   - `attendance-images` (Public bucket)
   - `schedule-images` (Public bucket)
3. Jika belum terbuat, klik **New Bucket**, beri nama sesuai di atas, dan aktifkan toggle **Public bucket**.
4. Klik **Save**.

## Langkah 6: Masukkan Kredensial ke `.env`
Buka file `.env` di project Anda:
```env
SUPABASE_URL=https://xyzproject.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOi...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOi...
```
Dan untuk frontend:
```env
VITE_SUPABASE_URL=https://xyzproject.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOi...
```
