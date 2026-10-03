# Panduan Deploy ke cPanel (Zenhosta / Shared Hosting)

## Prasyarat
- cPanel hosting dengan fitur **"Setup Node.js App"**
- Node.js versi **18 atau lebih baru**
- Akses **Terminal** atau **File Manager** di cPanel
- Database Supabase sudah aktif (gratis di supabase.com)

---

## Langkah-langkah Deploy

### 1. Build Project di Komputer Lokal

```bash
# Install dependencies
npm install

# Build frontend (Vite) + backend (esbuild)
npm run build
```

Setelah build berhasil, folder `dist/` akan berisi:
- `server.cjs` — Server backend (compiled)
- `index.html` — Frontend entry
- `assets/` — CSS, JS, images (compiled)

### 2. Upload ke cPanel

Upload **SEMUA file berikut** ke folder aplikasi di cPanel (misal: `/home/smastika/absensi-smastika/`):

```
File yang WAJIB di-upload:
├── app.js                    ← Entry point cPanel (PENTING!)
├── package.json              ← Dependencies
├── .env                      ← Environment variables (buat manual di server)
└── dist/                     ← Hasil build (SELURUH FOLDER)
    ├── server.cjs
    ├── server.cjs.map
    ├── index.html
    └── assets/
        ├── *.js
        └── *.css
```

> **PENTING**: Jangan upload `node_modules/`, `src/`, atau `server.ts`. Hanya upload file hasil build.

### 3. Buat File .env di Server

Di cPanel **File Manager**, buat file `.env` di root folder aplikasi:

```env
SUPABASE_URL=https://epstkdqxbtwwvmzqhmde.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
SUPABASE_ANON_KEY=your_anon_key
VITE_SUPABASE_URL=https://epstkdqxbtwwvmzqhmde.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key
ADMIN_USERNAME=NUBA
ADMIN_PASSWORD=your_admin_password
ADMIN_WHATSAPP=6285659611760
VITE_ADMIN_WHATSAPP=6285659611760
PORT=3000
NODE_ENV=production
```

### 4. Setup Node.js App di cPanel

1. Buka cPanel → **Setup Node.js App**
2. Klik **Create Application**
3. Isi konfigurasi:

| Field | Nilai |
|-------|-------|
| **Node.js version** | 18 atau 20 (pilih yang tersedia) |
| **Application mode** | Production |
| **Application root** | `absensi-smastika` (nama folder di home) |
| **Application URL** | domain Anda (misal: `absensi.sekolah.com`) |
| **Application startup file** | `app.js` |

4. Klik **Create**

### 5. Install Dependencies di Server

Buka cPanel **Terminal**, lalu jalankan:

```bash
cd ~/absensi-smastika
source /home/smastika/nodevenv/absensi-smastika/18/bin/activate
npm install --production
```

> **Catatan**: Path `nodevenv` mungkin berbeda tergantung versi Node.js yang dipilih. Lihat path yang ditampilkan di halaman "Setup Node.js App".

### 6. Restart Aplikasi

Di halaman **Setup Node.js App** di cPanel, klik tombol **Restart**.

### 7. Verifikasi

Buka browser dan akses:
- `https://domain-anda.com/api/health` — Cek status server & database
- `https://domain-anda.com/api/database/status` — Cek koneksi database detail
- `https://domain-anda.com` — Halaman utama aplikasi

---

## Environment Variables via cPanel

Selain file `.env`, Anda juga bisa memasukkan environment variables melalui:

1. **Setup Node.js App** → klik aplikasi → bagian **Environment Variables**
2. Tambahkan satu per satu:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `SUPABASE_ANON_KEY`
   - `ADMIN_USERNAME`
   - `ADMIN_PASSWORD`
   - `NODE_ENV` = `production`

> Environment variables dari cPanel **lebih prioritas** daripada file `.env`.

---

## Troubleshooting

### Website muncul tapi "Tidak terhubung ke database"
1. Cek `/api/health` — lihat bagian `database.configured` dan `database.connection`
2. Pastikan `SUPABASE_URL` dan `SUPABASE_SERVICE_ROLE_KEY` sudah diisi di Environment Variables cPanel
3. Restart aplikasi setelah menambah/mengubah environment variables

### Error 502 Bad Gateway
1. Buka cPanel Terminal, jalankan: `cd ~/absensi-smastika && node app.js`
2. Lihat error yang muncul
3. Biasanya karena `dist/server.cjs` belum ada (belum build) atau `node_modules` belum di-install

### Error "Cannot find module"
1. Jalankan `npm install --production` di Terminal cPanel
2. Restart aplikasi

### Cara Update Aplikasi
1. Build ulang di komputer lokal: `npm run build`
2. Upload ulang folder `dist/` ke cPanel (timpa yang lama)
3. Restart aplikasi di cPanel
