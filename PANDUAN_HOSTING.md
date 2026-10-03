# Panduan Lengkap Deploy & Hosting Aplikasi Absensi Digital NUBA
**SMA Informatika Nurul Bayan Cimerak**

Dokumen ini berisi panduan langkah demi langkah (*step-by-step*) untuk melakukan *hosting* aplikasi baik di platform **Gratis (Free Tier)** maupun **Berbayar (VPS / Cloud)**.

---

## 1. Persiapan Awal (Wajib untuk Semua Pilihan Hosting)

### A. Environment Variables (.env)
Aplikasi ini membutuhkan variabel lingkungan berikut saat dideploy:

```env
PORT=3000
NODE_ENV=production
JWT_SECRET=rahasia-kunci-jwt-anda-yang-panjang-dan-unik
SUPABASE_URL=https://xxxxxxxxxxxxxxxxxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOi... (Service role key dari Supabase)
SUPABASE_ANON_KEY=eyJhbGciOi... (Anon public key dari Supabase)
```

> **Catatan Penting**: 
> - `PORT` dapat disesuaikan otomatis oleh penyedia hosting (misal Render/Railway menentukan port sendiri via `process.env.PORT`).
> - Dapatkan kunci Supabase di: Dashboard Supabase -> Project Settings -> API.

### B. Setup Database Supabase (Gratis)
1. Buat akun di [https://supabase.com](https://supabase.com) (Tersedia paket Free selamanya).
2. Buat project baru (pilih region terdekat, misalnya *Singapore*).
3. Masuk ke menu **SQL Editor** di sidebar Supabase.
4. Buka file `supabase-schema.sql` yang ada di aplikasi ini, lalu *Copy & Paste* seluruh isinya ke SQL Editor Supabase, kemudian klik **Run**.
5. Database tabel siswa, absensi, pengumuman, dan hari libur siap digunakan.

---

## 2. Pilihan Hosting GRATIS (Free Tier)

### Opsi A: Render.com (Paling Populer & Mudah)
*Kelebihan:* Gratis, langsung terhubung ke GitHub, otomatis HTTPS (SSL), dan auto-deploy saat ada perubahan kode.

**Langkah-langkah:**
1. Upload/Export kode aplikasi ini ke akun **GitHub** Anda (via menu Settings di AI Studio -> Export to GitHub).
2. Daftar/Masuk ke [https://render.com](https://render.com).
3. Klik tombol **New +** -> pilih **Web Service**.
4. Hubungkan ke repositori GitHub aplikasi absensi Anda.
5. Isi konfigurasi berikut:
   - **Name**: `absensi-nuba` (bebas)
   - **Region**: Singapore (Southeast Asia)
   - **Branch**: `main`
   - **Runtime**: `Node`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
   - **Instance Type**: `Free`
6. Gulir ke bawah ke bagian **Environment Variables**, klik **Add Environment Variable**, lalu masukkan:
   - `JWT_SECRET` = (kunci rahasia acak Anda)
   - `SUPABASE_URL` = (URL Supabase Anda)
   - `SUPABASE_SERVICE_ROLE_KEY` = (Service role key Supabase)
   - `SUPABASE_ANON_KEY` = (Anon key Supabase)
   - `NODE_ENV` = `production`
7. Klik **Create Web Service**. Tunggu 2-3 menit sampai build selesai.
8. Aplikasi Anda langsung online di URL seperti `https://absensi-nuba.onrender.com`.

---

### Opsi B: Railway.app (Alternatif Cepat & Stabil)
1. Daftar di [https://railway.app](https://railway.app).
2. Klik **New Project** -> **Deploy from GitHub repo**.
3. Pilih repositori aplikasi Anda.
4. Masuk ke tab **Variables** di Railway, tambahkan variabel yang sama (`JWT_SECRET`, `SUPABASE_URL`, dll).
5. Railway akan mendeteksi `npm run build` dan `npm start` secara otomatis dari `package.json`.
6. Buka tab **Settings** -> **Domains** -> **Generate Domain** untuk mendapatkan URL publik gratis.

---

## 3. Pilihan Hosting BERBAYAR (Paling Disarankan untuk Sekolah)

Untuk skala sekolah dengan ratusan siswa yang melakukan absensi serentak di pagi hari, **VPS (Virtual Private Server)** adalah pilihan terbaik karena server aktif 24 jam penuh tanpa *sleep*, akses sangat cepat, dan biayanya sangat murah (mulai dari Rp 30.000 - Rp 70.000 / bulan).

Penyedia VPS lokal Indonesia yang bagus:
- **IDCloudHost** (Cloud VPS mulai Rp 50.000/bln)
- **Niagahoster / Hostinger** (VPS KVM mulai Rp 65.000/bln)
- **DomaiNesia** / **Biznet Gio**

### Langkah-langkah Setup VPS Ubuntu 22.04 / 24.04:

#### 1. Masuk ke VPS via Terminal / SSH:
```bash
ssh root@IP_SERVER_ANDA
```

#### 2. Update Sistem & Install Node.js 20 & Nginx:
```bash
# Update paket
sudo apt update && sudo apt upgrade -y

# Install Node.js v20 LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs git nginx

# Install Process Manager (PM2)
sudo npm install -g pm2
```

#### 3. Clone Proyek dan Install Dependencies:
```bash
# Pindah ke direktori web
cd /var/www

# Clone repositori git Anda
git clone https://github.com/USERNAME_ANDA/absensi-nuba.git
cd absensi-nuba

# Buat file .env
nano .env
```
*(Paste variabel `PORT=3000`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, dll, lalu simpan dengan `Ctrl+O` kemudian `Ctrl+X`)*.

#### 4. Build dan Jalankan Aplikasi dengan PM2:
```bash
# Install paket dan build aplikasi
npm install
npm run build

# Jalankan server dengan PM2 agar otomatis hidup kembali jika VPS restart
pm2 start dist/server.cjs --name "absensi-nuba"
pm2 save
pm2 startup
```

#### 5. Konfigurasi Nginx Reverse Proxy (agar bisa diakses via Domain / Port 80):
```bash
sudo nano /etc/nginx/sites-available/absensi.conf
```
Isi konfigurasi berikut (ganti `absensi.nurulbayan.sch.id` dengan domain sekolah Anda):
```nginx
server {
    listen 80;
    server_name absensi.nurulbayan.sch.id;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Aktifkan konfigurasi dan restart Nginx:
```bash
sudo ln -s /etc/nginx/sites-available/absensi.conf /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

#### 6. Pasang SSL Gratis (HTTPS) dengan Certbot:
```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d absensi.nurulbayan.sch.id
```
*(Certbot akan otomatis memperbarui sertifikat SSL secara gratis seumur hidup)*.

---

## 4. Keunggulan PWA & Pembaruan Otomatis

Aplikasi ini sudah dilengkapi dengan fitur **Progressive Web App (PWA)**:
1. **Dapat Diinstall**: Siswa dan guru dapat memasang aplikasi ke layar utama (*Add to Home Screen*) di smartphone Android & iPhone tanpa perlu ke Play Store.
2. **Auto-Update**: Begitu Anda melakukan *git push* dan server Anda mengompilasi kode terbaru, Service Worker di HP siswa akan otomatis mendeteksi perubahan dan memperbarui kode aplikasi tanpa perlu install ulang.
3. **Offline Caching**: Aset UI dan font tersimpan di cache lokal sehingga aplikasi terbuka secepat kilat.
