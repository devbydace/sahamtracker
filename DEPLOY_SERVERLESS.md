# Panduan Deploy Serverless 24/7 (Vercel + Neon PostgreSQL + Telegram Webhook)

Panduan lengkap untuk mendeploy aplikasi **SahamTracker** secara 100% gratis, aman, dan aktif 24 jam nonstop tanpa perlu menyalakan laptop.

---

## Arsitektur Serverless

```
[ Telegram App (HP/PC) ]
         │ (Perintah: /analisa BBCA, /portfolio, /harga)
         ▼
[ Vercel Serverless Function ] (/api/telegram/webhook)
         │
         ├──► [ Yahoo Finance API ] (Harga Real-time, Valuasi, Consensus)
         │
         ▼
[ Neon.tech PostgreSQL ] (Database cloud gratis, auto-scaling & sleep-to-zero)
```

---

## Langkah 1: Buat Database Cloud Gratis di Neon.tech

1. Buka [https://neon.tech](https://neon.tech) dan daftar/masuk dengan akun GitHub atau Google Anda.
2. Buat project baru, beri nama misalnya: `saham-tracker-db`.
3. Pilih Region yang paling dekat dengan Indonesia: **Singapore (ap-southeast-1)**.
4. Setelah selesai, Anda akan mendapatkan **Connection String (URI)**.
   Contohnya:
   ```env
   postgresql://neondb_owner:AbCdEfGh123@ep-cool-mountain-a1b2c3d4.ap-southeast-1.aws.neon.tech/neondb?sslmode=require
   ```
5. Simpan connection string tersebut untuk Langkah 2 dan Langkah 4.

---

## Langkah 2: Switch Schema & Buat Tabel di PostgreSQL

Di terminal komputer Anda (folder `tracking-saham`), jalankan:

### 1. Alihkan Schema ke PostgreSQL
```bash
npm run use:pg
```
*Script ini otomatis mengubah `prisma/schema.prisma` ke provider PostgreSQL dan menjalankan `prisma generate`.*

### 2. Push Tabel ke Database Neon
Ganti URL di bawah dengan connection string Neon Anda:

**Di PowerShell (Windows):**
```powershell
$env:DATABASE_URL="postgresql://neondb_owner:AbCdEfGh123@ep-cool-mountain-a1b2c3d4.ap-southeast-1.aws.neon.tech/neondb?sslmode=require"
npm run db:push
```

**Di Git Bash / Linux / Mac:**
```bash
DATABASE_URL="postgresql://neondb_owner:AbCdEfGh123@ep-cool-mountain-a1b2c3d4.ap-southeast-1.aws.neon.tech/neondb?sslmode=require" npm run db:push
```

*Semua tabel (`Stock`, `Transaction`, `Dividend`, `CashTransaction`, `SavingsGoal`, `Setting`) akan langsung dibuat di cloud.*

---

## Langkah 3: Push Source Code ke GitHub

Buat repositori baru di akun GitHub Anda (misal: `tracking-saham`), lalu jalankan:

```bash
git add .
git commit -m "feat: serverless setup ready for vercel"
git branch -M main
git remote add origin https://github.com/<username-anda>/tracking-saham.git
git push -u origin main
```

*(Catatan: File konfigurasi rahasia seperti `.env` dan database lokal `dev.db` sudah otomatis diamankan di `.gitignore`).*

---

## Langkah 4: Deploy ke Vercel (100% Gratis)

1. Buka [https://vercel.com](https://vercel.com) dan masuk dengan akun GitHub Anda.
2. Klik tombol **"Add New..."** -> **"Project"**.
3. Pilih repository **`tracking-saham`** yang baru saja Anda push.
4. Pada bagian **Environment Variables**, tambahkan 4 variabel berikut:

| Key | Value (Contoh) |
|---|---|
| `DATABASE_URL` | `postgresql://neondb_owner:...@ep-...neon.tech/neondb?sslmode=require` |
| `TELEGRAM_BOT_TOKEN` | Token BotFather Anda (`9241771038:AAGYxAjVhCejEdrlDV9M7j98Ithwhz4C62k`) |
| `TELEGRAM_CHAT_ID` | Chat ID Anda (`8827226655`) |
| `NEXT_PUBLIC_APP_URL` | Domain Vercel Anda, misal: `https://tracking-saham.vercel.app` |

5. Klik **"Deploy"**.
6. Tunggu sekitar 1-2 menit hingga build selesai. Anda akan mendapatkan URL live seperti:
   `https://tracking-saham-xxxx.vercel.app`

---

## Langkah 5: Aktifkan Webhook Telegram 24/7

Setelah web Anda live di Vercel, Telegram bot perlu diarahkan ke URL Webhook Vercel:

### Cara A: Melalui Web UI (Paling Praktis)
1. Buka website Vercel Anda di browser.
2. Klik tombol **Telegram** di pojok kanan atas header.
3. Di bagian **Mode Cloud Serverless 24/7 (Vercel)**, pastikan input URL berisi domain Vercel Anda (misal `https://tracking-saham.vercel.app`).
4. Klik tombol **"Aktifkan Webhook Cloud 24/7"**.
5. Status akan berubah hijau: **"Webhook Aktif"**.

### Cara B: Melalui Terminal Lokal
```bash
npm run webhook:set https://tracking-saham.vercel.app
```

### Cara C: Langsung Melalui Browser URL
Buka link ini di browser Anda (ganti `<TOKEN>` dan `<DOMAIN-VERCEL>`):
```
https://api.telegram.org/bot<TOKEN>/setWebhook?url=https://<DOMAIN-VERCEL>/api/telegram/webhook
```

---

## Verifikasi & Tes

Buka aplikasi Telegram di HP Anda dan kirim pesan ke bot:
- `/portfolio` → Rekap nilai aset, profit/loss, kas RDN, dan alokasi
- `/analisa BBCA` → Analisa fundamental, valuasi, target konsensus analis, & trading plan (Buy, SL, TP1, TP2, RRR)
- `/harga BBCA` → Cek harga real-time IHSG
- `/dca` → Rekomendasi saham prioritas untuk averaging down

Bot sekarang merespon instan 24 jam tanpa perlu menjalankan PC/laptop!

---

## Tips Pengembangan Lokal vs Cloud

Jika di masa depan Anda ingin kembali melakukan pengetesan secara offline / lokal:

1. **Kembalikan schema ke SQLite lokal**:
   ```bash
   npm run use:sqlite
   ```
2. **Matikan webhook cloud** (agar Telegram mengizinkan polling lokal):
   ```bash
   npm run webhook:clear
   ```
3. **Jalankan dev server & bot poller lokal**:
   ```bash
   npm run dev
   npm run bot
   ```

