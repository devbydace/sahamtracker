import { PrismaClient } from "@prisma/client";

const DEFAULT_SQLITE_URL = "file:./dev.db";

if (!process.env.DATABASE_URL || !process.env.DATABASE_URL.startsWith("file:")) {
  process.env.DATABASE_URL = DEFAULT_SQLITE_URL;
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  sqliteInitialized: boolean | undefined;
};

function createPrismaClient(): PrismaClient {
  const client = new PrismaClient({
    datasources: {
      db: {
        url: process.env.DATABASE_URL || DEFAULT_SQLITE_URL,
      },
    },
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

  return client;
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

/**
 * Mengaktifkan optimasi SQLite (WAL Mode, Busy Timeout, Foreign Keys)
 * agar aman diakses bersamaan oleh Next.js Web UI & Telegram Bot Poller.
 */
export async function ensureSqliteOptimized(): Promise<void> {
  if (globalForPrisma.sqliteInitialized) return;
  try {
    await prisma.$queryRawUnsafe("PRAGMA journal_mode = WAL;");
    await prisma.$queryRawUnsafe("PRAGMA busy_timeout = 5000;");
    await prisma.$queryRawUnsafe("PRAGMA synchronous = NORMAL;");
    await prisma.$queryRawUnsafe("PRAGMA foreign_keys = ON;");
    globalForPrisma.sqliteInitialized = true;
  } catch {
    // Abaikan jika gagal pada saat build statis
  }
}

// Jalankan optimasi secara non-blocking saat modul dimuat di runtime
void ensureSqliteOptimized();
