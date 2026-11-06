import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import { prisma, ensureSqliteOptimized } from "../src/lib/prisma";

const rootDir = process.cwd();
const dbFilePath = path.join(rootDir, "prisma", "dev.db");
const backupDir = path.join(rootDir, "backups");

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

async function showStatus() {
  console.log("====================================================");
  console.log("       🗄️  SahamTracker SQLite Database Status      ");
  console.log("====================================================\n");

  const exists = fs.existsSync(dbFilePath);
  const size = exists ? fs.statSync(dbFilePath).size : 0;

  await ensureSqliteOptimized();

  let journalMode = "unknown";
  try {
    const res = await prisma.$queryRawUnsafe<Array<{ journal_mode: string }>>(
      "PRAGMA journal_mode;"
    );
    journalMode = res?.[0]?.journal_mode || "unknown";
  } catch {
    // ignore
  }

  const [stockCount, txCount, cashCount, divCount, goalCount, settings] =
    await Promise.all([
      prisma.stock.count(),
      prisma.transaction.count(),
      prisma.cashTransaction.count(),
      prisma.dividend.count(),
      prisma.savingsGoal.count(),
      prisma.setting.findMany(),
    ]);

  const tgToken = settings.find((s) => s.key === "telegram_bot_token")?.value;
  const tgChat = settings.find((s) => s.key === "telegram_chat_id")?.value;

  console.log(`📁 Lokasi File     : ${dbFilePath}`);
  console.log(`💾 Ukuran Database : ${formatBytes(size)}`);
  console.log(`⚡ Mode Jurnal     : ${journalMode.toUpperCase()} (Concurrent Ready)`);
  console.log("----------------------------------------------------");
  console.log(`📈 Emiten Saham    : ${stockCount}`);
  console.log(`🛒 Transaksi Saham : ${txCount}`);
  console.log(`💵 Mutasi Kas RDN  : ${cashCount}`);
  console.log(`🎁 Catatan Dividen : ${divCount}`);
  console.log(`🎯 Target Bulanan  : ${goalCount}`);
  console.log(
    `🤖 Bot Telegram    : ${
      tgToken && tgChat ? `Terhubung (Chat ID: ${tgChat})` : "Belum diatur"
    }`
  );
  console.log("====================================================\n");
}

async function initDatabase() {
  console.log("🔄 Menginisialisasi & menyinkronkan database SQLite...");

  try {
    execSync("npx prisma db push --skip-generate", {
      stdio: "inherit",
      env: { ...process.env, DATABASE_URL: "file:./dev.db" },
    });
  } catch (err) {
    console.warn("⚠️ Peringatan saat db push:", (err as Error).message);
  }

  await ensureSqliteOptimized();

  // Pastikan target tabungan bulan berjalan tersedia
  const now = new Date();
  const currentYearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  const existingGoal = await prisma.savingsGoal.findUnique({
    where: { yearMonth: currentYearMonth },
  });

  if (!existingGoal) {
    await prisma.savingsGoal.create({
      data: {
        yearMonth: currentYearMonth,
        targetAmount: 2000000,
        notes: "Target nabung saham bulanan",
      },
    });
    console.log(`✅ Target tabungan default (${currentYearMonth}) berhasil dibuat.`);
  }

  // Pastikan konfigurasi Telegram dari .env tersimpan jika belum ada di tabel Setting
  const envToken = process.env.TELEGRAM_BOT_TOKEN;
  const envChatId = process.env.TELEGRAM_CHAT_ID;

  if (envToken) {
    await prisma.setting.upsert({
      where: { key: "telegram_bot_token" },
      update: {},
      create: { key: "telegram_bot_token", value: envToken },
    });
  }

  if (envChatId) {
    await prisma.setting.upsert({
      where: { key: "telegram_chat_id" },
      update: {},
      create: { key: "telegram_chat_id", value: envChatId },
    });
  }

  console.log("✅ Database SQLite siap digunakan!\n");
  await showStatus();
}

async function backupDatabase() {
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  const now = new Date();
  const timestamp = now
    .toISOString()
    .replace(/[:.]/g, "-")
    .replace("T", "_")
    .slice(0, 19);

  // 1. Copy binary SQLite file
  if (fs.existsSync(dbFilePath)) {
    const dbBackupFile = path.join(backupDir, `dev_${timestamp}.db`);
    fs.copyFileSync(dbFilePath, dbBackupFile);
    console.log(`✅ Backup file SQLite dibuat : ${dbBackupFile}`);
  }

  // 2. Export JSON snapshot
  const [stocks, transactions, dividends, cashTransactions, savingsGoals, settings] =
    await Promise.all([
      prisma.stock.findMany(),
      prisma.transaction.findMany({ orderBy: { date: "asc" } }),
      prisma.dividend.findMany({ orderBy: { paymentDate: "asc" } }),
      prisma.cashTransaction.findMany({ orderBy: { date: "asc" } }),
      prisma.savingsGoal.findMany(),
      prisma.setting.findMany(),
    ]);

  const jsonBackupFile = path.join(backupDir, `backup_${timestamp}.json`);
  const payload = {
    exportedAt: now.toISOString(),
    database: "sqlite",
    data: {
      stocks,
      transactions,
      dividends,
      cashTransactions,
      savingsGoals,
      settings,
    },
  };

  fs.writeFileSync(jsonBackupFile, JSON.stringify(payload, null, 2), "utf-8");
  console.log(`✅ Backup JSON dibuat        : ${jsonBackupFile}`);
}

async function restoreDatabase(fileArg?: string) {
  if (!fileArg) {
    console.error("❌ Harap sertakan path file JSON backup. Contoh:");
    console.log("   npm run db:restore backups/backup_2026-11-06.json");
    process.exit(1);
  }

  const targetPath = path.isAbsolute(fileArg)
    ? fileArg
    : path.join(rootDir, fileArg);

  if (!fs.existsSync(targetPath)) {
    console.error(`❌ File backup tidak ditemukan: ${targetPath}`);
    process.exit(1);
  }

  const raw = fs.readFileSync(targetPath, "utf-8");
  const parsed = JSON.parse(raw);
  const data = parsed.data;

  if (!data) {
    console.error("❌ Format file JSON backup tidak valid.");
    process.exit(1);
  }

  console.log("🔄 Memulihkan data ke SQLite...");

  await prisma.$transaction(async (tx) => {
    await tx.transaction.deleteMany();
    await tx.dividend.deleteMany();
    await tx.cashTransaction.deleteMany();
    await tx.savingsGoal.deleteMany();
    await tx.stock.deleteMany();

    if (Array.isArray(data.stocks)) {
      for (const s of data.stocks) {
        await tx.stock.create({ data: s });
      }
    }
    if (Array.isArray(data.transactions)) {
      for (const t of data.transactions) {
        await tx.transaction.create({ data: t });
      }
    }
    if (Array.isArray(data.dividends)) {
      for (const d of data.dividends) {
        await tx.dividend.create({ data: d });
      }
    }
    if (Array.isArray(data.cashTransactions)) {
      for (const c of data.cashTransactions) {
        await tx.cashTransaction.create({ data: c });
      }
    }
    if (Array.isArray(data.savingsGoals)) {
      for (const g of data.savingsGoals) {
        await tx.savingsGoal.create({ data: g });
      }
    }
    if (Array.isArray(data.settings)) {
      for (const st of data.settings) {
        await tx.setting.upsert({
          where: { key: st.key },
          update: { value: st.value },
          create: { key: st.key, value: st.value },
        });
      }
    }
  });

  console.log("✅ Data berhasil dipulihkan dari backup!\n");
  await showStatus();
}

async function resetPortfolio() {
  console.log("🗑️  Mengosongkan data transaksi portofolio (menyimpan pengaturan Telegram)...");
  await prisma.transaction.deleteMany();
  await prisma.dividend.deleteMany();
  await prisma.cashTransaction.deleteMany();
  await prisma.stock.deleteMany();
  console.log("✅ Data portofolio berhasil dikosongkan!\n");
  await showStatus();
}

async function main() {
  const cmd = (process.argv[2] || "status").toLowerCase();

  switch (cmd) {
    case "status":
    case "info":
      await showStatus();
      break;
    case "init":
    case "setup":
      await initDatabase();
      break;
    case "backup":
    case "export":
      await backupDatabase();
      break;
    case "restore":
    case "import":
      await restoreDatabase(process.argv[3]);
      break;
    case "reset":
    case "clear":
      await resetPortfolio();
      break;
    default:
      console.log("Perintah Database SQLite yang tersedia:");
      console.log("  npm run db:status   - Lihat status & ringkasan isi database SQLite");
      console.log("  npm run db:init     - Inisialisasi & optimasi skema SQLite (WAL mode)");
      console.log("  npm run db:backup   - Buat backup file .db & snapshot .json ke folder backups/");
      console.log("  npm run db:restore  - Pulihkan database dari file backup JSON");
      console.log("  npm run db:reset    - Kosongkan transaksi portofolio (Telegram tetap aman)");
      console.log("  npm run db:studio   - Buka GUI Prisma Studio di browser");
      break;
  }

  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error("❌ Database Manager Error:", err);
  await prisma.$disconnect();
  process.exit(1);
});

