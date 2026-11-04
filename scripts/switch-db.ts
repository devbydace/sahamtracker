import fs from "fs";
import path from "path";
import { execSync } from "child_process";

const target = (process.argv[2] || "").toLowerCase();

const rootDir = process.cwd();
const schemaDest = path.join(rootDir, "prisma", "schema.prisma");
const sqliteSource = path.join(rootDir, "prisma", "schema.sqlite.prisma");
const pgSource = path.join(rootDir, "prisma", "schema.postgresql.prisma");
const envPath = path.join(rootDir, ".env");

function updateEnvForPostgres() {
  if (!fs.existsSync(envPath)) return;
  let envContent = fs.readFileSync(envPath, "utf-8");
  const savedPgMatch = envContent.match(/POSTGRES_DATABASE_URL=["'](.*?)["']/);
  if (savedPgMatch && savedPgMatch[1]) {
    envContent = envContent.replace(/DATABASE_URL=.*/, `DATABASE_URL="${savedPgMatch[1]}"`);
    fs.writeFileSync(envPath, envContent, "utf-8");
    console.log("    ✅ DATABASE_URL di .env dipulihkan ke PostgreSQL Cloud.");
  }
}

function updateEnvForSqlite() {
  if (!fs.existsSync(envPath)) return;
  let envContent = fs.readFileSync(envPath, "utf-8");
  const currentDbMatch = envContent.match(/DATABASE_URL=["'](.*?)["']/);
  const currentUrl = currentDbMatch ? currentDbMatch[1] : "";

  if (currentUrl.startsWith("postgres://") || currentUrl.startsWith("postgresql://")) {
    if (!envContent.includes("POSTGRES_DATABASE_URL=")) {
      envContent += `\n# Simpanan URL Postgres:\nPOSTGRES_DATABASE_URL="${currentUrl}"\n`;
    } else {
      envContent = envContent.replace(/POSTGRES_DATABASE_URL=.*/, `POSTGRES_DATABASE_URL="${currentUrl}"`);
    }
  }

  envContent = envContent.replace(/DATABASE_URL=.*/, `DATABASE_URL="file:./dev.db"`);
  fs.writeFileSync(envPath, envContent, "utf-8");
  console.log("    ✅ DATABASE_URL di .env otomatis diatur ke 'file:./dev.db'.");
}

if (target === "postgres" || target === "pg" || target === "neon" || target === "supabase") {
  console.log("🔄 Mengalihkan database schema ke: PostgreSQL (Serverless Cloud)...");
  fs.copyFileSync(pgSource, schemaDest);
  console.log("✅ prisma/schema.prisma diatur ke provider = 'postgresql'");
  updateEnvForPostgres();
  try {
    console.log("⚙️  Menjalankan prisma generate...");
    execSync("npx prisma generate", { stdio: "inherit" });
  } catch {
    console.log("ℹ️  (Prisma generate lokal dilewati karena dev server sedang aktif di Windows).");
    console.log("    Tidak ada masalah! Schema sudah beralih dan di Vercel build akan otomatis men-generate).");
  }
  console.log("\n🚀 Siap untuk deploy ke Vercel dengan database PostgreSQL (Neon/Supabase)!");
} else if (target === "sqlite" || target === "local") {
  console.log("🔄 Mengalihkan database schema ke: SQLite (Local)...");
  fs.copyFileSync(sqliteSource, schemaDest);
  console.log("✅ prisma/schema.prisma diatur ke provider = 'sqlite'");
  updateEnvForSqlite();
  try {
    console.log("⚙️  Menjalankan prisma generate...");
    execSync("npx prisma generate", { stdio: "inherit" });
  } catch {
    console.log("ℹ️  (Prisma generate lokal dilewati karena dev server sedang aktif di Windows).");
  }
  console.log("\n💻 Siap untuk dijalankan secara lokal dengan file ./dev.db!");
} else {
  console.error("Gunakan perintah: npx tsx scripts/switch-db.ts [postgres | sqlite]");
  process.exit(1);
}

