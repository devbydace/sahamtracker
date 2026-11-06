"use server";

import fs from "fs";
import path from "path";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { calculatePortfolio, refreshAllStockPrices } from "@/lib/portfolio";
import { fetchStockQuote, fetchStockDeepAnalysis, POPULAR_IDX_STOCKS } from "@/lib/yahoo-finance";
import { calculateBrokerFee } from "@/lib/format";
import {
  getTelegramConfig,
  saveTelegramConfig,
  sendTelegramMessage,
  formatPortfolioReportHtml,
  formatTradeNotificationHtml,
  formatDividendNotificationHtml,
  formatCashNotificationHtml,
  formatStockAnalysisHtml,
} from "@/lib/telegram";

function safeRevalidate() {
  try {
    revalidatePath("/");
  } catch {
    // Ignore outside request context
  }
}

export async function getDashboardData() {
  try {
    const portfolio = await calculatePortfolio();

    const recentTransactions = await prisma.transaction.findMany({
      take: 20,
      orderBy: { date: "desc" },
      include: { stock: true },
    });

    const recentCash = await prisma.cashTransaction.findMany({
      take: 20,
      orderBy: { date: "desc" },
    });

    const recentDividends = await prisma.dividend.findMany({
      take: 20,
      orderBy: { paymentDate: "desc" },
      include: { stock: true },
    });

    return {
      success: true,
      data: {
        portfolio,
        recentTransactions,
        recentCash,
        recentDividends,
      },
    };
  } catch (error: any) {
    console.error("Error fetching dashboard data:", error);
    return {
      success: false,
      error: error?.message || "Gagal memuat data portofolio.",
    };
  }
}

export async function addStockTransaction(formData: {
  ticker: string;
  type: "BUY" | "SELL";
  lots: number;
  pricePerShare: number;
  date?: string;
  feePercent?: number;
  customFee?: number;
  broker?: string;
  notes?: string;
}) {
  try {
    const cleanTicker = formData.ticker.trim().toUpperCase().replace(".JK", "");
    const lots = Math.max(1, Number(formData.lots));
    const shares = lots * 100;
    const pricePerShare = Number(formData.pricePerShare);
    const grossAmount = shares * pricePerShare;

    let fee = 0;
    if (formData.customFee !== undefined && formData.customFee >= 0) {
      fee = formData.customFee;
    } else {
      fee = calculateBrokerFee(grossAmount, formData.type, formData.feePercent);
    }

    const totalAmount = formData.type === "BUY" ? grossAmount + fee : grossAmount - fee;

    // Check if stock exists or create it
    let stock = await prisma.stock.findUnique({
      where: { ticker: cleanTicker },
    });

    if (!stock) {
      // Find info from popular list or fetch from Yahoo Finance
      const popular = POPULAR_IDX_STOCKS.find((s) => s.ticker === cleanTicker);
      let name = popular?.name || cleanTicker;
      let sector = popular?.sector || "General";
      let currentPrice = pricePerShare;
      let changePercent = 0;

      const quote = await fetchStockQuote(cleanTicker);
      if (quote) {
        name = quote.name || name;
        currentPrice = quote.currentPrice || currentPrice;
        changePercent = quote.changePercent || 0;
      }

      stock = await prisma.stock.create({
        data: {
          ticker: cleanTicker,
          name,
          sector,
          currentPrice,
          changePercent,
          lastUpdated: new Date(),
        },
      });
    }

    const transaction = await prisma.transaction.create({
      data: {
        stockTicker: cleanTicker,
        type: formData.type,
        lots,
        shares,
        pricePerShare,
        fee,
        totalAmount,
        date: formData.date ? new Date(formData.date) : new Date(),
        broker: formData.broker || "Default",
        notes: formData.notes || null,
      },
    });

    // Send Telegram alert if enabled
    try {
      const tgConfig = await getTelegramConfig();
      if (tgConfig.botToken && tgConfig.chatId && tgConfig.notifyTrades) {
        const msg = formatTradeNotificationHtml({
          ticker: cleanTicker,
          stockName: stock.name,
          type: formData.type,
          lots,
          shares,
          pricePerShare,
          fee,
          totalAmount,
          broker: formData.broker,
          notes: formData.notes,
        });
        await sendTelegramMessage(msg);
      }
    } catch (tgErr) {
      console.warn("Could not dispatch Telegram trade alert:", tgErr);
    }

    safeRevalidate();
    return { success: true, transaction };
  } catch (error) {
    console.error("Error creating stock transaction:", error);
    return { success: false, error: "Gagal menyimpan transaksi saham." };
  }
}

export async function deleteStockTransaction(id: string) {
  try {
    await prisma.transaction.delete({
      where: { id },
    });
    safeRevalidate();
    return { success: true };
  } catch (error) {
    console.error("Error deleting stock transaction:", error);
    return { success: false, error: "Gagal menghapus transaksi saham." };
  }
}

export async function addCashTransaction(formData: {
  type: "DEPOSIT" | "WITHDRAW" | "INTEREST" | "TAX_FEE";
  amount: number;
  date?: string;
  broker?: string;
  notes?: string;
}) {
  try {
    const amount = Math.abs(Number(formData.amount));
    const cash = await prisma.cashTransaction.create({
      data: {
        type: formData.type,
        amount,
        date: formData.date ? new Date(formData.date) : new Date(),
        broker: formData.broker || "Default",
        notes: formData.notes || null,
      },
    });

    // Send Telegram alert if enabled
    try {
      const tgConfig = await getTelegramConfig();
      if (tgConfig.botToken && tgConfig.chatId && tgConfig.notifyCash) {
        const msg = formatCashNotificationHtml({
          type: formData.type,
          amount,
          broker: formData.broker,
          notes: formData.notes,
        });
        await sendTelegramMessage(msg);
      }
    } catch (tgErr) {
      console.warn("Could not dispatch Telegram cash alert:", tgErr);
    }

    safeRevalidate();
    return { success: true, cash };
  } catch (error) {
    console.error("Error adding cash transaction:", error);
    return { success: false, error: "Gagal menyimpan mutasi kas RDN." };
  }
}

export async function deleteCashTransaction(id: string) {
  try {
    await prisma.cashTransaction.delete({
      where: { id },
    });
    safeRevalidate();
    return { success: true };
  } catch (error) {
    console.error("Error deleting cash transaction:", error);
    return { success: false, error: "Gagal menghapus mutasi kas RDN." };
  }
}

export async function addDividendRecord(formData: {
  ticker: string;
  paymentDate?: string;
  dps: number;
  totalShares: number;
  taxExempt?: boolean;
  notes?: string;
}) {
  try {
    const cleanTicker = formData.ticker.trim().toUpperCase().replace(".JK", "");
    const dps = Number(formData.dps);
    const totalShares = Number(formData.totalShares);
    const grossAmount = dps * totalShares;
    const taxRate = formData.taxExempt ? 0 : 0.1; // Bebas pajak 0% jika diinvestasikan kembali, default 10%
    const taxAmount = grossAmount * taxRate;
    const netAmount = grossAmount - taxAmount;

    // Check stock
    let stock = await prisma.stock.findUnique({
      where: { ticker: cleanTicker },
    });

    if (!stock) {
      stock = await prisma.stock.create({
        data: {
          ticker: cleanTicker,
          name: cleanTicker,
          sector: "General",
        },
      });
    }

    const dividend = await prisma.dividend.create({
      data: {
        stockTicker: cleanTicker,
        paymentDate: formData.paymentDate ? new Date(formData.paymentDate) : new Date(),
        dps,
        totalShares,
        grossAmount,
        taxRate,
        taxAmount,
        netAmount,
        notes: formData.notes || null,
      },
    });

    // Send Telegram alert if enabled
    try {
      const tgConfig = await getTelegramConfig();
      if (tgConfig.botToken && tgConfig.chatId && tgConfig.notifyDividends) {
        const msg = formatDividendNotificationHtml({
          ticker: cleanTicker,
          dps,
          totalShares,
          grossAmount,
          taxRate,
          taxAmount,
          netAmount,
          notes: formData.notes,
        });
        await sendTelegramMessage(msg);
      }
    } catch (tgErr) {
      console.warn("Could not dispatch Telegram dividend alert:", tgErr);
    }

    safeRevalidate();
    return { success: true, dividend };
  } catch (error) {
    console.error("Error recording dividend:", error);
    return { success: false, error: "Gagal menyimpan dividen." };
  }
}

export async function deleteDividendRecord(id: string) {
  try {
    await prisma.dividend.delete({
      where: { id },
    });
    safeRevalidate();
    return { success: true };
  } catch (error) {
    console.error("Error deleting dividend:", error);
    return { success: false, error: "Gagal menghapus catatan dividen." };
  }
}

export async function updateMonthlySavingsGoal(targetAmount: number) {
  try {
    const now = new Date();
    const currentYearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

    await prisma.savingsGoal.upsert({
      where: { yearMonth: currentYearMonth },
      create: {
        yearMonth: currentYearMonth,
        targetAmount: Number(targetAmount),
      },
      update: {
        targetAmount: Number(targetAmount),
      },
    });

    safeRevalidate();
    return { success: true };
  } catch (error) {
    console.error("Error updating savings goal:", error);
    return { success: false, error: "Gagal memperbarui target tabungan." };
  }
}

export async function refreshAllStockPricesAction() {
  try {
    const result = await refreshAllStockPrices();
    safeRevalidate();
    return { success: true, ...result };
  } catch (error) {
    console.error("Error refreshing prices:", error);
    return { success: false, error: "Gagal memperbarui harga pasar." };
  }
}

export async function seedDemoDataAction() {
  try {
    // Clear existing
    await prisma.transaction.deleteMany();
    await prisma.dividend.deleteMany();
    await prisma.cashTransaction.deleteMany();
    await prisma.savingsGoal.deleteMany();
    await prisma.stock.deleteMany();

    // 1. Initial Cash Deposit into RDN
    await prisma.cashTransaction.createMany({
      data: [
        {
          date: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
          type: "DEPOSIT",
          amount: 25000000,
          notes: "Setoran Awal Tabungan Saham",
          broker: "Stockbit",
        },
        {
          date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          type: "DEPOSIT",
          amount: 3000000,
          notes: "Nabung Saham Gaji Bulan Lalu",
          broker: "Stockbit",
        },
        {
          date: new Date(),
          type: "DEPOSIT",
          amount: 3000000,
          notes: "Nabung Saham Rutin Bulan Ini",
          broker: "Stockbit",
        },
      ],
    });

    // 2. Insert Stocks
    const sampleStocks = [
      { ticker: "BBCA", name: "Bank Central Asia Tbk", sector: "Financials", price: 5000 },
      { ticker: "BBRI", name: "Bank Rakyat Indonesia Tbk", sector: "Financials", price: 4750 },
      { ticker: "TLKM", name: "Telkom Indonesia Tbk", sector: "Telecommunication", price: 2850 },
      { ticker: "ASII", name: "Astra International Tbk", sector: "Industrials", price: 4980 },
      { ticker: "ICBP", name: "Indofood CBP Sukses Makmur Tbk", sector: "Consumer Non-Cyclical", price: 11200 },
    ];

    for (const s of sampleStocks) {
      await prisma.stock.create({
        data: {
          ticker: s.ticker,
          name: s.name,
          sector: s.sector,
          currentPrice: s.price,
          changePercent: 1.25,
          lastUpdated: new Date(),
        },
      });
    }

    // 3. Transactions (Buy BBCA, BBRI, TLKM, ASII)
    await prisma.transaction.createMany({
      data: [
        // BBCA (20 lots = 2000 lembar @ 4800)
        {
          stockTicker: "BBCA",
          type: "BUY",
          date: new Date(Date.now() - 55 * 24 * 60 * 60 * 1000),
          lots: 20,
          shares: 2000,
          pricePerShare: 4800,
          fee: 14400,
          totalAmount: 9600000 + 14400,
          broker: "Stockbit",
          notes: "DCA Pertama",
        },
        // BBRI (25 lots = 2500 lembar @ 4650)
        {
          stockTicker: "BBRI",
          type: "BUY",
          date: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000),
          lots: 25,
          shares: 2500,
          pricePerShare: 4650,
          fee: 17437,
          totalAmount: 11625000 + 17437,
          broker: "Stockbit",
          notes: "Koleksi Perbankan BUMN",
        },
        // TLKM (15 lots = 1500 lembar @ 2900)
        {
          stockTicker: "TLKM",
          type: "BUY",
          date: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000),
          lots: 15,
          shares: 1500,
          pricePerShare: 2900,
          fee: 6525,
          totalAmount: 4350000 + 6525,
          broker: "Stockbit",
          notes: "Cicil Telekomunikasi",
        },
      ],
    });

    // 4. Dividend sample (BBCA)
    await prisma.dividend.create({
      data: {
        stockTicker: "BBCA",
        paymentDate: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
        dps: 175,
        totalShares: 2000,
        grossAmount: 350000,
        taxRate: 0.1,
        taxAmount: 35000,
        netAmount: 315000,
        notes: "Dividen Final BBCA Buku 2025",
      },
    });

    // 5. Savings goal
    const now = new Date();
    const currentYearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    await prisma.savingsGoal.create({
      data: {
        yearMonth: currentYearMonth,
        targetAmount: 3000000,
        notes: "Target nabung saham bulanan",
      },
    });

    // Refresh live prices
    await refreshAllStockPrices();

    safeRevalidate();
    return { success: true };
  } catch (error) {
    console.error("Error seeding demo data:", error);
    return { success: false, error: "Gagal memasukkan data demo." };
  }
}

export async function resetPortfolioDataAction() {
  try {
    await prisma.transaction.deleteMany();
    await prisma.dividend.deleteMany();
    await prisma.cashTransaction.deleteMany();
    await prisma.stock.deleteMany();
    // Setting telegram tetap aman dipertahankan
    safeRevalidate();
    return { success: true };
  } catch (error: any) {
    console.error("Error resetting portfolio data:", error);
    return { success: false, error: "Gagal mengosongkan data portofolio." };
  }
}

export async function getDatabaseStatsAction() {
  try {
    const isPostgres = Boolean(process.env.DATABASE_URL?.includes("postgres"));
    const providerName = isPostgres ? "PostgreSQL (Supabase Cloud)" : "SQLite (Local File)";
    const hostInfo = isPostgres ? "Supabase Pooler (Singapore)" : "prisma/dev.db";

    const [stocks, transactions, dividends, cashTransactions, savingsGoals] =
      await Promise.all([
        prisma.stock.count(),
        prisma.transaction.count(),
        prisma.dividend.count(),
        prisma.cashTransaction.count(),
        prisma.savingsGoal.count(),
      ]);

    return {
      success: true,
      stats: {
        provider: providerName,
        fileName: hostInfo,
        sizeBytes: 0,
        journalMode: isPostgres ? "Cloud Managed" : "WAL",
        counts: {
          stocks,
          transactions,
          dividends,
          cashTransactions,
          savingsGoals,
        },
      },
    };
  } catch (error: any) {
    return { success: false, error: error.message || "Gagal mengambil info database." };
  }
}

export async function exportDatabaseJsonAction() {
  try {
    const [stocks, transactions, dividends, cashTransactions, savingsGoals, settings] =
      await Promise.all([
        prisma.stock.findMany(),
        prisma.transaction.findMany({ orderBy: { date: "asc" } }),
        prisma.dividend.findMany({ orderBy: { paymentDate: "asc" } }),
        prisma.cashTransaction.findMany({ orderBy: { date: "asc" } }),
        prisma.savingsGoal.findMany(),
        prisma.setting.findMany(),
      ]);

    const payload = {
      app: "SahamTracker IDX",
      database: "sqlite",
      exportedAt: new Date().toISOString(),
      data: {
        stocks,
        transactions,
        dividends,
        cashTransactions,
        savingsGoals,
        settings,
      },
    };

    return {
      success: true,
      json: JSON.stringify(payload, null, 2),
    };
  } catch (error: any) {
    return { success: false, error: error.message || "Gagal mengekspor database." };
  }
}

export async function importDatabaseJsonAction(jsonString: string) {
  try {
    const parsed = JSON.parse(jsonString);
    const data = parsed?.data;
    if (!data) {
      return { success: false, error: "Format file JSON backup tidak valid." };
    }

    await prisma.$transaction(async (tx) => {
      await tx.transaction.deleteMany();
      await tx.dividend.deleteMany();
      await tx.cashTransaction.deleteMany();
      await tx.savingsGoal.deleteMany();
      await tx.stock.deleteMany();

      if (Array.isArray(data.stocks)) {
        for (const s of data.stocks) {
          await tx.stock.create({
            data: {
              ticker: s.ticker,
              name: s.name,
              sector: s.sector,
              currentPrice: Number(s.currentPrice || 0),
              changePercent: Number(s.changePercent || 0),
              lastUpdated: s.lastUpdated ? new Date(s.lastUpdated) : new Date(),
            },
          });
        }
      }

      if (Array.isArray(data.transactions)) {
        for (const t of data.transactions) {
          await tx.transaction.create({
            data: {
              id: t.id,
              stockTicker: t.stockTicker,
              type: t.type,
              date: new Date(t.date),
              lots: Number(t.lots),
              shares: Number(t.shares),
              pricePerShare: Number(t.pricePerShare),
              fee: Number(t.fee || 0),
              totalAmount: Number(t.totalAmount),
              notes: t.notes || null,
              broker: t.broker || "Default",
            },
          });
        }
      }

      if (Array.isArray(data.dividends)) {
        for (const d of data.dividends) {
          await tx.dividend.create({
            data: {
              id: d.id,
              stockTicker: d.stockTicker,
              paymentDate: new Date(d.paymentDate),
              dps: Number(d.dps),
              totalShares: Number(d.totalShares),
              grossAmount: Number(d.grossAmount),
              taxRate: Number(d.taxRate ?? 0.1),
              taxAmount: Number(d.taxAmount || 0),
              netAmount: Number(d.netAmount),
              notes: d.notes || null,
            },
          });
        }
      }

      if (Array.isArray(data.cashTransactions)) {
        for (const c of data.cashTransactions) {
          await tx.cashTransaction.create({
            data: {
              id: c.id,
              date: new Date(c.date),
              type: c.type,
              amount: Number(c.amount),
              notes: c.notes || null,
              broker: c.broker || "Default",
            },
          });
        }
      }

      if (Array.isArray(data.savingsGoals)) {
        for (const g of data.savingsGoals) {
          await tx.savingsGoal.create({
            data: {
              id: g.id,
              yearMonth: g.yearMonth,
              targetAmount: Number(g.targetAmount),
              notes: g.notes || null,
            },
          });
        }
      }

      if (Array.isArray(data.settings)) {
        for (const st of data.settings) {
          await tx.setting.upsert({
            where: { key: st.key },
            update: { value: String(st.value) },
            create: { key: st.key, value: String(st.value) },
          });
        }
      }
    });

    safeRevalidate();
    return { success: true };
  } catch (error: any) {
    console.error("Error importing database JSON:", error);
    return { success: false, error: error.message || "Gagal memulihkan data backup." };
  }
}

export async function getTelegramSettingsAction() {
  try {
    const config = await getTelegramConfig();
    return { success: true, config };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function saveTelegramSettingsAction(config: {
  botToken: string;
  chatId: string;
  notifyTrades: boolean;
  notifyDividends: boolean;
  notifyCash: boolean;
}) {
  try {
    await saveTelegramConfig(config);
    safeRevalidate();
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function testTelegramMessageAction(botToken?: string, chatId?: string) {
  try {
    const now = new Date();
    const timeStr = now.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
    const msg =
      `🎉 <b>Koneksi Telegram Berhasil!</b>\n\n` +
      `Bot SahamTracker IDX Anda telah terhubung pada pukul ${timeStr} WIB.\n` +
      `Anda akan menerima notifikasi transaksi dan rekap portofolio melalui chat ini.`;

    const res = await sendTelegramMessage(
      msg,
      botToken && chatId ? { botToken, chatId } : undefined
    );
    return res;
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function sendTelegramPortfolioReportAction() {
  try {
    const portfolio = await calculatePortfolio();
    const reportHtml = formatPortfolioReportHtml(portfolio);
    const res = await sendTelegramMessage(reportHtml);
    return res;
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getStockAnalysisAction(ticker: string) {
  try {
    const clean = ticker.trim().toUpperCase().replace(".JK", "");
    const analysis = await fetchStockDeepAnalysis(clean);
    if (!analysis) {
      return {
        success: false,
        error: `Gagal memuat data analisa untuk ${clean}. Pastikan kode saham valid.`,
      };
    }

    const portfolio = await calculatePortfolio();
    const holding = portfolio.holdings.find((h) => h.ticker === clean);

    return {
      success: true,
      analysis,
      holding,
    };
  } catch (error: any) {
    console.error("Error in getStockAnalysisAction:", error);
    return { success: false, error: error.message || "Gagal memproses analisa saham." };
  }
}

export async function sendStockAnalysisToTelegramAction(ticker: string) {
  try {
    const clean = ticker.trim().toUpperCase().replace(".JK", "");
    const analysis = await fetchStockDeepAnalysis(clean);
    if (!analysis) {
      return { success: false, error: `Gagal mengambil analisa untuk ${clean}.` };
    }

    const portfolio = await calculatePortfolio();
    const holding = portfolio.holdings.find((h) => h.ticker === clean);

    const html = formatStockAnalysisHtml(analysis, holding);
    const res = await sendTelegramMessage(html);
    return res;
  } catch (error: any) {
    console.error("Error in sendStockAnalysisToTelegramAction:", error);
    return { success: false, error: error.message || "Gagal mengirim analisa ke Telegram." };
  }
}

export async function setTelegramWebhookAction(publicUrl: string) {
  try {
    const config = await getTelegramConfig();
    if (!config.botToken) {
      return { success: false, error: "Bot token belum dikonfigurasi." };
    }

    const cleanBaseUrl = publicUrl.trim().replace(/\/+$/, "");
    const webhookUrl = `${cleanBaseUrl}/api/telegram/webhook`;

    const res = await fetch(`https://api.telegram.org/bot${config.botToken}/setWebhook`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: webhookUrl }),
    });

    const data = await res.json();
    if (data.ok) {
      return { success: true, webhookUrl };
    } else {
      return { success: false, error: data.description || "Gagal mengatur webhook." };
    }
  } catch (error: any) {
    return { success: false, error: error.message || "Gagal menghubungi Telegram API." };
  }
}

export async function getTelegramWebhookInfoAction() {
  try {
    const config = await getTelegramConfig();
    if (!config.botToken) {
      return { success: false, error: "Bot token belum dikonfigurasi." };
    }

    const res = await fetch(`https://api.telegram.org/bot${config.botToken}/getWebhookInfo`);
    const data = await res.json();
    if (data.ok) {
      return { success: true, info: data.result };
    }
    return { success: false, error: data.description };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function deleteTelegramWebhookAction() {
  try {
    const config = await getTelegramConfig();
    if (!config.botToken) {
      return { success: false, error: "Bot token belum dikonfigurasi." };
    }

    const res = await fetch(`https://api.telegram.org/bot${config.botToken}/deleteWebhook`);
    const data = await res.json();
    if (data.ok) {
      return { success: true };
    }
    return { success: false, error: data.description };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

