# Panduan Lengkap Deploy SahamTracker IDX ke Vercel

Panduan langkah demi langkah mendeploy aplikasi **SahamTracker IDX** dari repositori GitHub Anda ke **Vercel** secara gratis.

---

## Persiapan Repositori

Repositori GitHub Anda sudah siap dan ter-push di:
👉 **`https://github.com/devbydace/sahamtracker`** (Branch: `main`)

---

## Langkah 1: Hubungkan Repositori di Vercel

1. Buka [https://vercel.com](https://vercel.com) dan login (disarankan menggunakan akun **GitHub** Anda).
2. Di halaman Dashboard Vercel, klik tombol **"Add New..."** lalu pilih **"Project"**.
3. Di daftar repositori GitHub yang muncul, cari **`sahamtracker`** (atau `devbydace/sahamtracker`).
4. Klik tombol **"Import"** di samping nama repositori tersebut.

---

## Langkah 2: Konfigurasi Project di Vercel

Pada form konfigurasi project Vercel:

1. **Project Name**: Biarkan default `sahamtracker` (atau nama lain yang Anda inginkan).
2. **Framework Preset**: Pastikan terpilih **Next.js**.
3. **Root Directory**: `./` (default).
4. **Build and Output Settings**:
   - Biarkan sesuai konfigurasi otomatis dari [`vercel.json`](vercel.json), yaitu:
     `npx prisma db push && next build`
   - Region otomatis diatur ke **Singapore (`sin1`)** untuk latensi tercepat ke Indonesia.

---

## Langkah 3: Isi Environment Variables

Buka bagian **"Environment Variables"** (klik untuk expand), lalu masukkan 4 variabel berikut:

| Key | Value | Keterangan |
| :--- | :--- | :--- |
| `DATABASE_URL` | `file:./dev.db` | Menggunakan database SQLite lokal |
| `TELEGRAM_BOT_TOKEN` | `9241771038:AAGYxAjVhCejEdrlDV9M7j98Ithwhz4C62k` | Token bot Telegram Anda |
| `TELEGRAM_CHAT_ID` | `8827226655` | Chat ID Telegram Anda |
| `NEXT_PUBLIC_APP_URL` | `https://sahamtracker.vercel.app` | Ganti dengan domain Vercel yang Anda dapatkan setelah deploy |

> [!NOTE]
> *Jika domain final Vercel Anda belum diketahui sebelumnya, isi sementara dengan `https://sahamtracker.vercel.app`. Anda bisa mengupdatenya setelah deployment pertama selesai.*

---

## Langkah 4: Klik Deploy!

1. Klik tombol **"Deploy"** di bagian bawah.
2. Tunggu proses build berjalan sekitar 1–2 menit.
3. Setelah selesai, Vercel akan menampilkan layar perayaan **"Congratulations!"** beserta screenshot dan tautan ke website live Anda (contoh: `https://sahamtracker-xxxx.vercel.app`).

---

## Langkah 5: Aktifkan Bot Telegram Cloud 24/7 (Webhook)

Agar bot Telegram Anda dapat menerima perintah interaktif (`/portfolio`, `/analisa BBCA`, `/harga BSSR`, `/dca`) langsung dari HP kapan saja:

### Cara Paling Mudah (Lewat Web):
1. Buka website Vercel yang baru saja Anda deploy.
2. Klik tombol **Telegram** di navbar atas.
3. Pada bagian **"Mode Cloud Serverless 24/7 (Vercel)"**, URL website Vercel Anda akan otomatis terdeteksi.
4. Klik tombol **"Aktifkan Webhook Cloud 24/7"**.
5. Status akan berubah hijau: **"Webhook Aktif"**.

Selesai! Sekarang aplikasi dan bot Telegram Anda telah berjalan live di cloud Vercel.
