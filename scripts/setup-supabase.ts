import fs from "fs";
import path from "path";
import readline from "readline";
import { execSync } from "child_process";

const rootDir = process.cwd();
const schemaDest = path.join(rootDir, "prisma", "schema.prisma");
const pgSource = path.join(rootDir, "prisma", "schema.postgresql.prisma");
const envPath = path.join(rootDir, ".env");

const DEFAULT_PROJECT_REF = "hoecvsslwgsyofxzcbbn";
const DEFAULT_POOLER_HOST = "aws-0-ap-southeast-1.pooler.supabase.com";

function askQuestion(query: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) =>
    rl.question(query, (ans) => {
      rl.close();
      resolve(ans.trim());
    })
  );
}

async function main() {
  console.log("====================================================");
  console.log("      🚀 Setup Otomatis Database Supabase           ");
  console.log("====================================================\n");

  let input = process.argv[2];

  if (input === "--help" || input === "-h") {
    console.log("Cara penggunaan:");
    console.log("  npm run setup:supabase");
    console.log("  npm run setup:supabase <PASSWORD_DATABASE>");
    console.log('  npm run setup:supabase "<CONNECTION_STRING_SUPABASE>"');
    process.exit(0);
  }

  if (!input) {
    console.log("Supabase Project ID terdeteksi: " + DEFAULT_PROJECT_REF);
    console.log("Region: Singapore (ap-southeast-1)\n");
    input = await askQuestion("👉 Masukkan Password Database Supabase Anda: ");
  }

  if (!input) {
    console.error("❌ Password tidak boleh kosong!");
    console.log("Tip: Anda bisa mereset password di Supabase: Project Settings -> Database -> Reset database password");
    process.exit(1);
  }

  let connectionString = "";

  if (input.startsWith("postgresql://") || input.startsWith("postgres://")) {
    // Pengguna memasukkan connection string lengkap
    connectionString = input;
    // Jika masih menggunakan direct host (db....supabase.co), sarankan/ubah ke pooler
    if (connectionString.includes(`db.${DEFAULT_PROJECT_REF}.supabase.co:5432`)) {
      console.log("⚠️ Mengubah host direct IPv6 ke Supabase Connection Pooler IPv4...");
      connectionString = connectionString.replace(
        `db.${DEFAULT_PROJECT_REF}.supabase.co:5432`,
        `${DEFAULT_POOLER_HOST}:5432`
      );
      if (!connectionString.includes(`postgres.${DEFAULT_PROJECT_REF}:`)) {
        connectionString = connectionString.replace("postgres:", `postgres.${DEFAULT_PROJECT_REF}:`);
      }
    }
  } else {
    // Pengguna memasukkan password
    const password = input;
    const encodedPassword = encodeURIComponent(password);
    connectionString = `postgresql://postgres.${DEFAULT_PROJECT_REF}:${encodedPassword}@${DEFAULT_POOLER_HOST}:5432/postgres?sslmode=require`;
  }

  console.log("\n1️⃣  Menyiapkan schema Prisma untuk PostgreSQL...");
  fs.copyFileSync(pgSource, schemaDest);
  console.log("    ✅ prisma/schema.prisma diset ke PostgreSQL.");

  console.log("\n2️⃣  Memperbarui file .env...");
  let envContent = "";
  if (fs.existsSync(envPath)) {
    envContent = fs.readFileSync(envPath, "utf-8");
  }

  // Update or insert DATABASE_URL
  if (envContent.includes("DATABASE_URL=")) {
    envContent = envContent.replace(
      /DATABASE_URL=.*/,
      `DATABASE_URL="${connectionString}"`
    );
  } else {
    envContent += `\nDATABASE_URL="${connectionString}"\n`;
  }

  fs.writeFileSync(envPath, envContent, "utf-8");
  console.log("    ✅ DATABASE_URL di .env berhasil diperbarui dengan koneksi Supabase IPv4.");

  console.log("\n3️⃣  Menguji koneksi & membuat tabel di Supabase (prisma db push)...");
  try {
    process.env.DATABASE_URL = connectionString;
    execSync("npx prisma db push --skip-generate", {
      stdio: "inherit",
      env: { ...process.env, DATABASE_URL: connectionString },
    });
    console.log("\n🎉 SELAMAT! Seluruh tabel berhasil dibuat di Supabase Cloud!");
  } catch (err: any) {
    console.error("\n❌ Gagal menghubungkan ke Supabase!");
    console.error("Kemungkinan penyebab:");
    console.error("1. Password database yang Anda masukkan salah.");
    console.error("   -> Solusi: Buka dashboard Supabase -> Project Settings -> Database -> klik 'Reset database password'");
    console.error("2. Project Supabase sedang dijeda (paused).");
    console.error("   -> Solusi: Buka dashboard Supabase dan klik 'Restore project'\n");
    process.exit(1);
  }

  console.log("\n4️⃣  Menyimpan pengaturan awal (Telegram Bot) ke Supabase...");
  try {
    const { PrismaClient } = await import("@prisma/client");
    const prisma = new PrismaClient({
      datasources: { db: { url: connectionString } },
    });

    const BOT_TOKEN = "9241771038:AAGYxAjVhCejEdrlDV9M7j98Ithwhz4C62k";
    const CHAT_ID = "8827226655";

    await prisma.setting.upsert({
      where: { key: "telegram_bot_token" },
      update: { value: BOT_TOKEN },
      create: { key: "telegram_bot_token", value: BOT_TOKEN },
    });

    await prisma.setting.upsert({
      where: { key: "telegram_chat_id" },
      update: { value: CHAT_ID },
      create: { key: "telegram_chat_id", value: CHAT_ID },
    });

    await prisma.setting.upsert({
      where: { key: "telegram_notify_trades" },
      update: { value: "true" },
      create: { key: "telegram_notify_trades", value: "true" },
    });

    await prisma.setting.upsert({
      where: { key: "telegram_notify_dividends" },
      update: { value: "true" },
      create: { key: "telegram_notify_dividends", value: "true" },
    });

    await prisma.setting.upsert({
      where: { key: "telegram_notify_cash" },
      update: { value: "true" },
      create: { key: "telegram_notify_cash", value: "true" },
    });

    // Default savings goal
    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();
    const existingGoal = await prisma.savingsGoal.findFirst({
      where: { month, year },
    });
    if (!existingGoal) {
      await prisma.savingsGoal.create({
        data: {
          month,
          year,
          targetAmount: 2000000,
          currentAmount: 0,
        },
      });
    }

    await prisma.$disconnect();
    console.log("    ✅ Kredensial Telegram & Target Tabungan berhasil di-seed ke Supabase!");
  } catch (seedErr) {
    console.log("    ℹ️ Catatan seed setting:", (seedErr as Error).message);
  }

  console.log("\n====================================================");
  console.log("  ✨ DATABASE SUPABASE SUDAH SIAP 100%! ✨         ");
  console.log("====================================================");
  console.log("\nKoneksi database Anda (simpan juga untuk Vercel):");
  console.log(`\nDATABASE_URL="${connectionString}"\n`);
  console.log("👉 Langkah selanjutnya: Push ke GitHub & Deploy di Vercel!");
}

main().catch(console.error);
