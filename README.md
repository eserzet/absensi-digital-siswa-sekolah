<div align="center">

# 🏫 SMASTIKA ABSENSI
### Sistem Presensi Digital Siswa Berbasis PWA, QR Code, Geofencing GPS & Dokumentasi Kamera Real-Time
**SMA Informatika Nurul Bayan (Cimerak, Pangandaran)**

[![React 19](https://img.shields.io/badge/React-19.0-61dafb?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178c6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-6.4-646cff?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)
[![Tailwind CSS v4](https://img.shields.io/badge/TailwindCSS-v4.0-38bdf8?style=for-the-badge&logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ecf8e?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.com/)
[![Express.js](https://img.shields.io/badge/Express.js-Backend-000000?style=for-the-badge&logo=express&logoColor=white)](https://expressjs.com/)
[![PWA Ready](https://img.shields.io/badge/PWA-iOS%20%26%20Android-5A0FC8?style=for-the-badge&logo=pwa&logoColor=white)](https://web.dev/progressive-web-apps/)

🌐 **Live Production Website:** [https://www.smastika-absensi.my.id/](https://www.smastika-absensi.my.id/)

</div>

---

## 📌 Tentang Proyek

**SMASTIKA ABSENSI** adalah aplikasi web presensi siswa modern berbasis **Progressive Web App (PWA)** yang dirancang untuk mengatasi berbagai celah kecurangan presensi (*Zero-Fraud Attendance System*). Sistem ini mengintegrasikan validasi multi-lapis: **pemindaian QR Code resmi**, **verifikasi geofencing GPS radius sekolah**, dan **dokumentasi foto wajah langsung melalui kamera perangkat**.

Aplikasi ini dapat diinstal langsung ke Layar Utama (*Home Screen*) pada perangkat **Android maupun iPhone (iOS)** tanpa perlu melalui Google Play Store atau Apple App Store.

---

## ✨ Fitur Unggulan (Core Features)

### 🛡️ 1. Verifikasi Kehadiran 3-Lapis (Zero-Fraud Attendance)
1. **Lapis 1: Dynamic QR Code Scanner**
   * Siswa memindai QR Code resmi sekolah yang terpasang di gerbang masuk atau meja piket.
   * Mendukung kamera belakang (*environment*) dengan autofocus dan lampu flash/senter.
   * Kompatibel penuh dengan **iPhone / Safari WebKit** maupun **Android**.
   * Dilengkapi deteksi cadangan unggah gambar QR jika kamera bermasalah.
2. **Lapis 2: Geofencing GPS (Formula Haversine)**
   * Mengunci titik koordinat lintang & bujur (*latitude/longitude*) siswa secara presisi.
   * Menghitung jarak siswa ke titik koordinat resmi sekolah.
   * Siswa **wajib berada di dalam radius resmi** (contoh: 100 meter). Jika berada di luar radius, presensi otomatis ditolak.
3. **Lapis 3: Foto Dokumentasi Real-Time Kamera Wajah**
   * Siswa wajib mengambil foto wajah langsung saat itu juga (*live snapshot*).
   * **Unggah foto dari galeri dinonaktifkan** pada tahap ini untuk mencegah titip absen atau memakai foto lama.

### ⏰ 2. Aturan Presensi Cerdas & Otomatis
* **1x Presensi per Hari:** Mencegah siswa melakukan scan berulang pada hari yang sama.
* **Status Otomatis:**
  * 🟢 **HADIR:** Presensi sebelum batas jam masuk sekolah (misal: 07:00 WIB).
  * 🟡 **TERLAMBAT:** Presensi setelah jam masuk tetapi sebelum batas akhir toleransi.
  * 🔴 **ALPHA Otomatis:** Siswa yang belum absen hingga batas operasional sekolah selesai (misal: 11:30 WIB) otomatis tercatat sebagai **ALPHA** oleh server scheduler.
* **Deteksi Hari Libur Otomatis:** Sistem mendeteksi hari libur rutin (Jumat/Ahad) serta kalender libur nasional sekolah sehingga presensi terkunci aman.

### 📲 3. Progressive Web App (PWA) Standalone
* **Mobile-First Experience:** Tampilan fullscreen tanpa address bar layaknya aplikasi native.
* **Service Worker Caching:** Memuat aplikasi secepat kilat (*instant load*) dan hemat kuota data.
* **iOS WebKit Compatibility:** Disesuaikan dengan standar Apple Safari PWA (`playsinline`, `autoUpdate`, standalone manifest).

### 🔔 4. Web Push Notification (W3C VAPID Protocol)
* Menggunakan standar protokol Web Push VAPID resmi.
* Notifikasi dapat diterima oleh siswa **meskipun aplikasi atau browser sedang ditutup / HP dalam keadaan terkunci**.
* Siaran instan pengumuman sekolah baru dari admin langsung ke seluruh perangkat siswa.

### 👥 5. Portal Pendaftaran Siswa
* Siswa dapat mendaftar akun secara mandiri dengan verifikasi kelas, WhatsApp, dan username unik.
* **Wajib Mengunggah Foto Profil:** Dilengkapi validasi ketat di sisi klien dan server agar setiap siswa memiliki foto identitas resmi di database.

### 📊 6. Dashboard Manajemen Guru & Administrator
* **Monitoring Kehadiran Real-time:** Pantau siswa yang hadir, terlambat, izin, sakit, dan alpha hari ini.
* **Pengaturan Geofencing Peta Interaktif:** Geser pin koordinat lokasi sekolah dan atur radius meter toleransi secara visual.
* **Pengaturan Jam Operasional:** Atur jam buka presensi, jam batas tepat waktu, dan jam cutoff alpha.
* **Manajemen Data Induk:** Kelola data siswa, kelas, jadwal pelajaran, dan kalender libur sekolah.
* **Ekspor & Cetak Laporan:** Cetak rekap presensi per kelas, per bulan, atau ekspor ke format Excel dan PDF.

---

## 🏗️ Arsitektur & Teknologi (Tech Stack)

| Komponen | Teknologi | Keterangan |
| :--- | :--- | :--- |
| **Frontend Framework** | **React 19** + **TypeScript** | Arsitektur SPA berperforma tinggi |
| **Build Tool** | **Vite 6** | Bundler super cepat dengan HMR |
| **Styling** | **Tailwind CSS v4** | Modern theme styling & dark mode support |
| **PWA Engine** | **vite-plugin-pwa** | Service worker, cache precache & manifest |
| **QR Scanner** | **html5-qrcode** | ZXing native WebRTC QR engine |
| **Backend Server** | **Node.js** + **Express.js** | RESTful API backend architecture |
| **Database** | **Supabase (PostgreSQL)** | Relational database dengan Row Level Security |
| **File Storage** | **Supabase Storage** | Penyimpanan cloud foto profil & presensi siswa |
| **Push Notification** | **web-push (VAPID)** | W3C standard background push protocol |
| **Security** | **JWT & Bcrypt** | Autentikasi session token & hashing password |

---

## 📁 Struktur Direktori Proyek

```plaintext
absensi-digital-nurul-bayan/
├── public/                  # Aset statis PWA (icons, logo, manifest, sw-push.js)
├── src/
│   ├── components/
│   │   ├── admin/           # Komponen Panel Admin & Dashboard Manajemen
│   │   ├── student/         # Komponen Siswa (Home, ScanModal, Register, Login)
│   │   ├── teacher/         # Komponen Guru & Rekap Kehadiran
│   │   └── common/          # Komponen UI Reusable (Navbar, Card, Modal, Logo)
│   ├── context/             # React Context (Auth, Theme, Notification, Settings)
│   ├── hooks/               # Custom Hooks (usePermissions, usePWAUpdate)
│   ├── lib/                 # Utility (API client, dateUtils, imageCompression)
│   ├── server/              # Backend Express Server
│   │   ├── lib/             # Helper server (supabase client, pushService)
│   │   └── routes/          # API Routes (auth, attendance, students, push, dll)
│   ├── types.ts             # Definisi TypeScript interface & models
│   ├── App.tsx              # Root Component & Route Resolver
│   └── main.tsx             # Entry Point React DOM
├── supabase-schema.sql      # Skrip Skema Lengkap Database Supabase
├── MIGRASI-DATABASE.md      # Panduan Serah Terima & Migrasi Database
├── vite.config.ts           # Konfigurasi Vite & PWA Generator
├── server.ts                # Entry Point Server Node.js (cPanel / Local)
└── package.json             # Dependensi & NPM Scripts
```

---

## 🚀 Panduan Menjalankan Proyek Secara Lokal

### 1. Prasyarat Sistem
* [Node.js](https://nodejs.org/) versi 18.x atau yang lebih baru.
* Akun [Supabase](https://supabase.com/) gratis untuk database PostgreSQL.

### 2. Clone Repositori
```bash
git clone https://github.com/username-anda/absensi-digital-nurul-bayan.git
cd absensi-digital-nurul-bayan
```

### 3. Instal Dependensi
```bash
npm install
```

### 4. Konfigurasi Environment Variables
Salin file `.env.example` menjadi `.env`:
```bash
cp .env.example .env
```
Buka file `.env` dan lengkapi kredensial:
```env
# Database Supabase
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
SUPABASE_ANON_KEY=your-supabase-anon-key

# Server
PORT=3000
NODE_ENV=development
JWT_SECRET=buat-string-rahasia-anda-sendiri

# Web Push VAPID (Opsional untuk testing lokal)
# Generate via: npx web-push generate-vapid-keys
VAPID_PUBLIC_KEY=your-vapid-public-key
VAPID_PRIVATE_KEY=your-vapid-private-key
VAPID_SUBJECT=mailto:admin@smastika.sch.id
```

### 5. Setup Database Supabase
1. Buka dashboard Supabase Anda ➡️ **SQL Editor**.
2. Salin seluruh isi skrip file `supabase-schema.sql` lalu klik **Run**.
3. Di menu **Storage**, buat dua buah Public Bucket:
   * `profile-images` (untuk foto profil siswa).
   * `attendance-photos` (untuk foto bukti kehadiran).

### 6. Jalankan Server Development
```bash
npm run dev
```
Buka peramban di [http://localhost:3000](http://localhost:3000).

---

## 📦 Build Produksi & Deployment

### Build Bundle Frontend & Backend:
```bash
npm run build
```
Hasil kompilasi akan berada di folder `/dist`, siap untuk dideploy ke:
* **cPanel Hosting:** Menggunakan *Node.js Selector / Phusion Passenger* (entry point: `server.ts` / `dist/server.cjs`).
* **VPS Linux:** Menggunakan PM2 (`pm2 start dist/server.cjs --name "absensi-nuba"`).
* **Docker:** Siap dibungkus dalam container Node.js standar.

---

## 🔒 Keamanan Sistem (Security Highlights)
* **Zero Hardcoded Secrets:** Seluruh API keys, Service Role Key, dan VAPID private keys dimuat secara dinamis via environment variables (`.env`).
* **Row Level Security (RLS):** Tabel PostgreSQL Supabase dilindungi kebijakan RLS ketat.
* **Deterministic ID Protection:** Pencegahan *duplicate entry* pada level basis data menggunakan deterministic UUID hash per siswa per tanggal.
* **Image Compression Pipeline:** Foto otomatis dikompresi di sisi klien sebelum diunggah untuk menghemat bandwidth server dan storage.

---

## 📄 Lisensi & Hak Cipta

Dikembangkan untuk **SMA Informatika Nurul Bayan** (Kabupaten Pangandaran, Jawa Barat).  
Hak Cipta © 2026. Seluruh hak cipta dilindungi undang-undang.
