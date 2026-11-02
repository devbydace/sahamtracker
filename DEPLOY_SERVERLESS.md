# Panduan Deploy Serverless 24/7 (Vercel + Supabase/Neon PostgreSQL + Telegram Webhook)

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
[ Supabase / Neon PostgreSQL ] (Database cloud gratis & reliable)
```

---

## Langkah 1: Setup Database Supabase Otomatis (1 Langkah)

Project Supabase Anda telah terdeteksi (`hoecvsslwgsyofxzcbbn`). Supabase versi gratis memerlukan **Connection Pooler (IPv4)** agar dapat diakses dari jaringan internet Indonesia.

Kami telah membuatkan script otomatis untuk Anda! Cukup jalankan di terminal:

```bash
npm run setup:supabase
```

Script ini akan:
1. Menanyakan password database Supabase Anda.
2. Mengonfigurasi host IPv4 (`aws-0-ap-southeast-1.pooler.supabase.com:5432`).
3. Mengubah schema Prisma ke PostgreSQL.
4. Membuat seluruh tabel (`Stock`, `Transaction`, `Dividend`, `CashTransaction`, `SavingsGoal`, `Setting`) di Supabase.
5. Menyimpan kredensial Telegram Bot Anda ke database cloud.

*(Atau Anda bisa langsung menjalankan dengan argumen: `npm run setup:supabase "PASSWORD_ANDA"`)*

---

## Opsi Manual: Jika Ingin Menjalankan Sendiri

Jika Anda ingin menjalankan secara manual, gunakan connection string **Connection Pooler IPv4**:

**Di PowerShell (Windows):**
```powershell
# 1. Alihkan schema ke PostgreSQL
npm run use:pg

# 2. Set URL Pooler IPv4 (Ganti YOUR_PASSWORD dengan password Supabase Anda)
$env:DATABASE_URL="postgresql://postgres.hoecvsslwgsyofxzcbbn:YOUR_PASSWORD@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres?sslmode=require"

# 3. Push tabel ke Supabase
npm run db:push
```

> **PENTING untuk Supabase:**
> - Jangan gunakan host `db.hoecvsslwgsyofxzcbbn.supabase.co` karena hanya IPv6.
> - Gunakan host pooler: `aws-0-ap-southeast-1.pooler.supabase.com` (Port 5432).
> - Username adalah: `postgres.hoecvsslwgsyofxzcbbn` (bukan hanya `postgres`).
> - Jika password mengandung simbol (seperti `@`, `#`, `?`), encode ke URL (misal `@` menjadi `%40`).

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

