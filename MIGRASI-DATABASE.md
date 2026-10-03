# PANDUAN LENGKAP MIGRASI DATABASE & SERAH TERIMA SISTEM
## Aplikasi Absensi Digital Siswa (SMASTIKA ABSENSI)
**SMA Informatika Nurul Bayan**

Dokumen ini disusun sebagai panduan teknis langkah demi langkah (*step-by-step*) apabila sistem/aplikasi dibeli oleh pihak sekolah dan kepemilikan database serta server akan dialihkan secara resmi.

---

## DAFTAR ISI
1. [Ringkasan Arsitektur Sistem](#1-ringkasan-arsitektur-sistem)
2. [Skenario A: Transfer Kepemilikan Project Supabase (Paling Direkomendasikan)](#2-skenario-a-transfer-kepemilikan-project-supabase-paling-direkomendasikan)
3. [Skenario B: Fresh Setup Database Baru (Deploy Ulang dari Nol)](#3-skenario-b-fresh-setup-database-baru-deploy-ulang-dari-nol)
4. [Skenario C: Backup & Ekspor-Impor Data Manual](#4-skenario-c-backup--ekspor-impor-data-manual)
5. [Konfigurasi File Environment (.env)](#5-konfigurasi-file-environment-env)
6. [Checklist Aset Serah Terima (Handover Checklist)](#6-checklist-aset-serah-terima-handover-checklist)
7. [Rekomendasi Model Bisnis: Beli Putus vs Biaya Pemeliharaan](#7-rekomendasi-model-bisnis-beli-putus-vs-biaya-pemeliharaan)

---

## 1. Ringkasan Arsitektur Sistem

Aplikasi SMASTIKA ABSENSI menggunakan arsitektur modern:
* **Frontend:** React 19 + Vite (Progressive Web Apps / PWA) dengan dukungan scan QR Code kamera native iOS & Android.
* **Backend:** Node.js / Express Server (REST API).
* **Database & Storage:** Supabase Cloud (PostgreSQL Database + Supabase Storage untuk foto profil & foto presensi).
* **Notifikasi:** Web Push Notification (VAPID Standar W3C).

---

## 2. Skenario A: Transfer Kepemilikan Project Supabase (Paling Direkomendasikan)

Gunakan cara ini jika pihak sekolah ingin mengambil alih seluruh database yang **sedang berjalan saat ini beserta seluruh data siswa yang sudah terdaftar, riwayat absensi, akun pengguna, dan foto-foto di storage tanpa ada data yang hilang dan tanpa downtime**.

### Langkah 1: Persiapan Akun oleh Pihak Sekolah
1. Minta perwakilan sekolah (Kepala Sekolah, Wakasek, atau Tim IT) mendaftar akun baru di [https://supabase.com](https://supabase.com).
2. **Penting:** Gunakan email resmi sekolah (misal: `it@smastika.sch.id` atau `admin.absensi@gmail.com`).
3. Setelah login ke dashboard Supabase, buat **Organization** baru dengan nama sekolah, misalnya:
   * **Organization Name:** `SMA Informatika Nurul Bayan`

### Langkah 2: Mengundang Akun Sekolah ke Project Anda
1. Buka dashboard Supabase pada akun developer Anda (tempat project absensi saat ini berada).
2. Pilih project absensi sekolah tersebut.
3. Di bilah menu kiri bawah, klik ikon **Settings** (gerigi) ➡️ pilih **Team / Members**.
4. Klik tombol hijau **"Invite Member"**.
5. Masukkan alamat email resmi sekolah yang didaftarkan pada Langkah 1.
6. Pilih role sebagai **Owner** atau **Administrator**.
7. Klik **"Send Invitation"**.
8. Minta pihak sekolah membuka inbox email mereka dan mengeklik tombol konfirmasi undangan (*Accept Invitation*).

### Langkah 3: Eksekusi Transfer Project
1. Di dashboard Supabase akun developer Anda, buka **Project Settings** ➡️ **General**.
2. Gulir layar ke bagian paling bawah ke bagian **Transfer Project**.
3. Klik tombol **"Transfer Project"**.
4. Pada daftar pilihan organisasi tujuan, pilih Organization sekolah yang telah dibuat pada Langkah 1.
5. Ketikkan nama project untuk konfirmasi keamanan, lalu klik tombol **"Transfer"**.

### Langkah 4: Verifikasi & Selesai
* Kepemilikan database Supabase langsung berpindah 100% ke akun sekolah.
* URL API, Anon Key, dan Service Role Key **TIDAK BERUBAH**, sehingga aplikasi web dan server backend langsung tetap terhubung normal tanpa perlu mematikan server.
* Akun developer dapat keluar dari organisasi (*Leave Team*) setelah proses administrasi serah terima selesai.

---

## 3. Skenario B: Fresh Setup Database Baru (Deploy Ulang dari Nol)

Gunakan cara ini jika sekolah menginginkan database yang baru dan bersih (misalnya untuk memulai tahun ajaran baru dari awal tanpa data testing):

### Langkah 1: Pembuatan Project Baru di Akun Sekolah
1. Pihak sekolah login ke akun Supabase mereka.
2. Klik **"New Project"**.
3. Isi informasi project:
   * **Name:** `Absensi SMA Informatika Nurul Bayan`
   * **Database Password:** Buat password yang kuat dan catat dengan aman.
   * **Region:** Pilih `Singapore (ap-southeast-1)` (region tercepat dengan latensi paling rendah untuk Indonesia).
   * **Pricing Plan:** Free / Pro sesuai kebutuhan sekolah.
4. Klik **"Create new project"** dan tunggu hingga proses provisioning selesai (~2 menit).

### Langkah 2: Eksekusi Skrip Struktur Tabel (Schema SQL)
1. Di bilah menu kiri dashboard Supabase, buka menu **SQL Editor**.
2. Klik tombol **"+ New query"**.
3. Buka file `supabase-schema.sql` yang ada di root direktori proyek ini.
4. Salin seluruh isi kode SQL di dalam file tersebut, lalu tempel (*paste*) ke SQL Editor Supabase.
5. Klik tombol hijau **"Run"** di pojok kanan bawah.
6. Tunggu beberapa detik hingga muncul pesan *"Success. No rows returned"*.
7. Seluruh tabel berikut otomatis terbuat lengkap beserta relasi, indeks, dan trigger:
   * `users`
   * `students`
   * `attendance`
   * `school_locations`
   * `school_schedules`
   * `school_holidays`
   * `announcements`
   * `school_settings`
   * `push_subscriptions`

### Langkah 3: Pembuatan Bucket Storage untuk Foto
1. Buka menu **Storage** di bilah kiri Supabase.
2. Klik **"New bucket"**:
   * Bucket 1: Buat bucket bernama `profile-images` ➡️ centang **Public Bucket** ➡️ Klik **Create Bucket**.
   * Bucket 2: Buat bucket bernama `attendance-photos` ➡️ centang **Public Bucket** ➡️ Klik **Create Bucket**.
3. Atur Policy jika diperlukan agar server dapat mengunggah file foto base64 secara aman.

### Langkah 4: Mengambil Kredensial API Baru
1. Buka menu **Project Settings** ➡️ **API**.
2. Salin data kredensial berikut:
   * **Project URL** (contoh: `https://xyzcompany.supabase.co`)
   * **anon public key**
   * **service_role secret key** (klik *Reveal* untuk melihat kuncinya)

---

## 4. Skenario C: Backup & Ekspor-Impor Data Manual

Jika sekolah ingin membuat database baru tetapi data siswa dari database lama ingin tetap dipindahkan:

### Ekspor Data Siswa dari Database Lama:
1. Buka Supabase lama ➡️ Menu **Table Editor** ➡️ pilih tabel `students`.
2. Klik tombol **"Export"** di bagian atas tabel ➡️ pilih **Export as CSV**.
3. Lakukan hal yang sama untuk tabel `school_locations` dan `school_settings`.

### Impor Data ke Database Baru:
1. Buka Supabase baru ➡️ Menu **Table Editor** ➡️ pilih tabel `students`.
2. Klik tombol **"Insert"** ➡️ pilih **Import data from CSV**.
3. Unggah file CSV hasil ekspor tadi.

---

## 5. Konfigurasi File Environment (.env)

Setelah database Supabase diserahterimakan ke sekolah, perbarui file `.env` di server hosting aplikasi (cPanel / VPS):

```env
# ====================================================================
# KONFIGURASI DATABASE SUPABASE SEKOLAH
# ====================================================================
SUPABASE_URL=https://<project-id-sekolah>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# ====================================================================
# SERVER & KEAMANAN SESSION
# ====================================================================
PORT=3000
NODE_ENV=production
JWT_SECRET=rahasia-kunci-jwt-sekolah-ganti-dengan-string-acak-panjang

# ====================================================================
# WEB PUSH NOTIFICATION (VAPID KEYS)
# ====================================================================
VAPID_PUBLIC_KEY=B...
VAPID_PRIVATE_KEY=...
VAPID_SUBJECT=mailto:admin@smastika.sch.id
```

> **Catatan:** Jika project Supabase lama ditransfer langsung menggunakan **Skenario A**, nilai `SUPABASE_URL` dan `SUPABASE_SERVICE_ROLE_KEY` tidak perlu diubah sama sekali karena kredensial API tetap sama.

---

## 6. Checklist Aset Serah Terima (Handover Checklist)

Gunakan daftar centang berikut saat penandatanganan berita acara serah terima aplikasi kepada pihak sekolah:

- [ ] **Akun Database Supabase:** Project Supabase sudah dipindahkan ke email resmi sekolah.
- [ ] **Akun Hosting / Server:** Akses cPanel / VPS tempat aplikasi berjalan telah diberikan.
- [ ] **Akses Domain:** Domain sekolah (misal `smastika-absensi.my.id`) atau DNS subdomain sekolah sudah diarahkan ke server.
- [ ] **Akun Super Admin Sekolah:** Akun login Admin utama sekolah sudah dibuat dan diverifikasi oleh pihak sekolah.
- [ ] **Password Akun Developer Direset:** Akun developer sementara dinonaktifkan atau diserahkan hak aksesnya.
- [ ] **Master Source Code:** Salinan kode sumber (file zip atau repositori GitHub) diserahkan.
- [ ] **Dokumentasi Panduan Admin:** Panduan singkat cara mengubah titik radius GPS, jam operasional sekolah, dan cetak rekap absensi.

---

## 7. Rekomendasi Model Bisnis: Beli Putus vs Biaya Pemeliharaan

Ketika bernegosiasi dengan sekolah mengenai pembelian sistem, ada 2 opsi model kerja sama yang dapat ditawarkan:

### Opsi 1: Beli Putus (One-Time License Fee)
* **Kelebihan:** Developer mendapatkan pembayaran penuh di awal.
* **Kewajiban Sekolah:** Sekolah bertanggung jawab sendiri atas perpanjangan sewa domain, sewa hosting cPanel/VPS, dan kuota Supabase di masa mendatang.
* **Catatan:** Buat batasan garansi (misalnya garansi perbaikan bug selama 3 bulan pertama gratis). Lewat dari masa garansi, permintaan fitur baru dikenakan biaya tambahan.

### Opsi 2: Jasa Pemeliharaan / Retainer (SaaS Sekolah)
* **Kelebihan:** Sumber pemasukan rutin (*recurring income*) bagi developer (misal per semester atau per tahun).
* **Alasan Sekolah Menyukai Opsi Ini:** Sebagian besar sekolah tidak memiliki tim IT khusus yang memahami pengelolaan database PostgreSQL Supabase atau troubleshooting server Node.js.
* **Bentuk Kerja Sama:** Developer tetap bertindak sebagai *System Administrator* yang menjaga server tetap hidup, membackup database secara berkala, dan memperbarui sistem jika ada perubahan aturan sekolah.

---

*Dokumen ini dibuat secara resmi untuk sistem presensi digital SMA Informatika Nurul Bayan.*
