import { prisma } from "./prisma";
import { formatRupiah, formatPercent, formatNumber, formatDate } from "./format";
import { PortfolioSummary, StockHolding } from "./portfolio";
import { fetchStockQuote, StockDeepAnalysis } from "./yahoo-finance";

export interface TelegramConfig {
  botToken: string;
  chatId: string;
  notifyTrades: boolean;
  notifyDividends: boolean;
  notifyCash: boolean;
}

export async function getTelegramConfig(): Promise<TelegramConfig> {
  const settings = await prisma.setting.findMany({
    where: {
      key: {
        in: [
          "telegram_bot_token",
          "telegram_chat_id",
          "telegram_notify_trades",
          "telegram_notify_dividends",
          "telegram_notify_cash",
        ],
      },
    },
  });

  const map = new Map(settings.map((s) => [s.key, s.value]));

  const botToken = map.get("telegram_bot_token") || process.env.TELEGRAM_BOT_TOKEN || "";
  const chatId = map.get("telegram_chat_id") || process.env.TELEGRAM_CHAT_ID || "";
  const notifyTrades = map.get("telegram_notify_trades") === "true";
  const notifyDividends = map.get("telegram_notify_dividends") === "true";
  const notifyCash = map.get("telegram_notify_cash") === "true";

  return {
    botToken,
    chatId,
    notifyTrades,
    notifyDividends,
    notifyCash,
  };
}

export async function saveTelegramConfig(config: {
  botToken: string;
  chatId: string;
  notifyTrades?: boolean;
  notifyDividends?: boolean;
  notifyCash?: boolean;
}) {
  const entries = [
    { key: "telegram_bot_token", value: config.botToken.trim() },
    { key: "telegram_chat_id", value: config.chatId.trim() },
    { key: "telegram_notify_trades", value: String(config.notifyTrades ?? true) },
    { key: "telegram_notify_dividends", value: String(config.notifyDividends ?? true) },
    { key: "telegram_notify_cash", value: String(config.notifyCash ?? true) },
  ];

  for (const entry of entries) {
    await prisma.setting.upsert({
      where: { key: entry.key },
      create: entry,
      update: { value: entry.value },
    });
  }

  return { success: true };
}

export async function sendTelegramMessage(
  htmlText: string,
  overrideConfig?: { botToken?: string; chatId?: string }
): Promise<{ success: boolean; error?: string }> {
  try {
    const config = await getTelegramConfig();
    const token = overrideConfig?.botToken || config.botToken;
    const chatId = overrideConfig?.chatId || config.chatId;

    if (!token || !chatId) {
      return {
        success: false,
        error: "Bot Token atau Chat ID Telegram belum dikonfigurasi.",
      };
    }

    const url = `https://api.telegram.org/bot${token}/sendMessage`;
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: htmlText,
        parse_mode: "HTML",
        disable_web_page_preview: true,
      }),
    });

    const data = await response.json();
    if (!data.ok) {
      return {
        success: false,
        error: data.description || "Gagal mengirim pesan ke Telegram.",
      };
    }

    return { success: true };
  } catch (err: any) {
    console.error("Telegram send error:", err);
    return {
      success: false,
      error: err.message || "Terjadi kesalahan jaringan saat menghubungi Telegram API.",
    };
  }
}

export function formatPortfolioReportHtml(portfolio: PortfolioSummary): string {
  const now = new Date();
  const dateStr = now.toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  const timeStr = now.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });

  const isProfit = portfolio.totalUnrealizedPnL >= 0;
  const pnlIcon = isProfit ? "🟢" : "🔴";

  // Holdings list
  let holdingsText = "";
  if (portfolio.holdings.length === 0) {
    holdingsText = "<i>Belum ada saham aktif di portofolio.</i>";
  } else {
    holdingsText = portfolio.holdings
      .map((h) => {
        const itemProfit = h.unrealizedPnL >= 0;
        const itemIcon = itemProfit ? "🟢" : "🔴";
        return (
          `• <b>${h.ticker}</b> (${h.currentLots} lot / ${formatNumber(h.currentShares)} lbr)\n` +
          `  Modal: ${formatRupiah(h.avgPrice)} | Pasar: <b>${formatRupiah(h.currentPrice)}</b>\n` +
          `  Floating: ${itemIcon} <b>${formatRupiah(h.unrealizedPnL)}</b> (${formatPercent(h.unrealizedPnLPercent)})\n` +
          `  Nilai: ${formatRupiah(h.marketValue)} (Porsi: ${h.allocationPercent.toFixed(1)}%)`
        );
      })
      .join("\n\n");
  }

  // Savings progress bar
  const progressBars = Math.min(10, Math.round(portfolio.monthlySavings.progressPercent / 10));
  const barStr = "█".repeat(progressBars) + "░".repeat(10 - progressBars);

  return (
    `📊 <b>REKAP PORTOFOLIO SAHAM IDX</b>\n` +
    `🗓 <i>${dateStr} - ${timeStr} WIB</i>\n\n` +
    `💎 <b>Total Net Worth:</b> <code>${formatRupiah(portfolio.totalNetWorth)}</code>\n` +
    `📈 <b>Nilai Saham:</b> ${formatRupiah(portfolio.totalStockValue)}\n` +
    `💵 <b>Kas RDN Siap Pakai:</b> ${formatRupiah(portfolio.cashBalance)}\n\n` +
    `⚡ <b>Floating PnL:</b> ${pnlIcon} <b>${formatRupiah(portfolio.totalUnrealizedPnL)}</b> (${formatPercent(portfolio.totalUnrealizedPnLPercent)})\n` +
    `💰 <b>Cuan Realized + Dividen:</b> ${formatRupiah(portfolio.totalRealizedPnL + portfolio.totalDividends)}\n\n` +
    `🎯 <b>Nabung Saham Bulan Ini:</b>\n` +
    `[<code>${barStr}</code>] <b>${portfolio.monthlySavings.progressPercent.toFixed(0)}%</b>\n` +
    `Terkumpul: ${formatRupiah(portfolio.monthlySavings.actualSaved)} / ${formatRupiah(portfolio.monthlySavings.targetAmount)}\n\n` +
    `📋 <b>Daftar Saham:</b>\n` +
    `${holdingsText}\n\n` +
    `🤖 <i>SahamTracker IDX Personal Assistant</i>`
  );
}

export function formatTradeNotificationHtml(trade: {
  ticker: string;
  type: string;
  lots: number;
  shares: number;
  pricePerShare: number;
  fee: number;
  totalAmount: number;
  broker?: string | null;
  notes?: string | null;
  stockName?: string;
}): string {
  const isBuy = trade.type === "BUY";
  const icon = isBuy ? "🛒" : "💰";
  const typeText = isBuy ? "BELI (BUY)" : "JUAL (SELL)";

  return (
    `${icon} <b>NOTIFIKASI TRANSAKSI SAHAM</b>\n\n` +
    `Aksi: <b>${typeText}</b>\n` +
    `Emiten: <b>${trade.ticker}</b> ${trade.stockName ? `(${trade.stockName})` : ""}\n` +
    `Volume: <b>${formatNumber(trade.lots)} Lot</b> (${formatNumber(trade.shares)} Lembar)\n` +
    `Harga: <b>${formatRupiah(trade.pricePerShare)}</b> / lbr\n` +
    `Fee Sekuritas: ${formatRupiah(trade.fee)}\n` +
    `Total Bersih: <b>${formatRupiah(trade.totalAmount)}</b>\n` +
    `Sekuritas: ${trade.broker || "Default"}\n` +
    (trade.notes ? `Catatan: <i>${trade.notes}</i>\n` : "") +
    `\n<i>Saldo Kas RDN otomatis diperbarui di aplikasi.</i>`
  );
}

export function formatDividendNotificationHtml(div: {
  ticker: string;
  dps: number;
  totalShares: number;
  grossAmount: number;
  taxRate: number;
  taxAmount: number;
  netAmount: number;
  notes?: string | null;
}): string {
  const isExempt = div.taxRate === 0;

  return (
    `🎉 <b>DIVIDEN SAHAM DITERIMA</b>\n\n` +
    `Emiten: <b>${div.ticker}</b>\n` +
    `DPS: <b>${formatRupiah(div.dps)}</b> / lembar\n` +
    `Kepemilikan: <b>${formatNumber(div.totalShares)} lembar</b>\n` +
    `Dividen Kotor: ${formatRupiah(div.grossAmount)}\n` +
    `Pajak PPh: ${isExempt ? "Bebas Pajak (0%)" : `-${formatRupiah(div.taxAmount)} (10%)`}\n` +
    `<b>Net Masuk RDN: +${formatRupiah(div.netAmount)}</b> 💵\n` +
    (div.notes ? `Keterangan: <i>${div.notes}</i>\n` : "") +
    `\n<i>Kas RDN Anda telah otomatis bertambah.</i>`
  );
}

export function formatCashNotificationHtml(cash: {
  type: string;
  amount: number;
  broker?: string | null;
  notes?: string | null;
}): string {
  const isDeposit = cash.type === "DEPOSIT";
  const icon = isDeposit ? "📥" : "📤";
  const typeLabel =
    cash.type === "DEPOSIT"
      ? "SETOR DANA (Top Up RDN)"
      : cash.type === "WITHDRAW"
      ? "TARIK DANA DARI RDN"
      : cash.type === "INTEREST"
      ? "BUNGA SALDO RDN"
      : "BIAYA ADMIN / PAJAK RDN";

  return (
    `${icon} <b>MUTASI KAS RDN</b>\n\n` +
    `Jenis: <b>${typeLabel}</b>\n` +
    `Nominal: <b>${formatRupiah(cash.amount)}</b>\n` +
    `Rekening RDN: ${cash.broker || "Default"}\n` +
    (cash.notes ? `Catatan: <i>${cash.notes}</i>\n` : "")
  );
}

export function formatStockAnalysisHtml(
  analysis: StockDeepAnalysis,
  userHolding?: StockHolding
): string {
  const isDailyPlus = analysis.changePercent >= 0;
  const dailyIcon = isDailyPlus ? "🔺" : "🔻";

  // Valuation badge
  const valBadge =
    analysis.valuationStatus === "UNDERVALUED"
      ? "🟢 Diskon (Undervalued)"
      : analysis.valuationStatus === "OVERVALUED"
      ? "🔴 Premium (Overvalued)"
      : "⚪ Wajar (Fair Value)";

  // Quality badge
  const roeIcon =
    analysis.roe >= 18
      ? "🟢 Sangat Unggul"
      : analysis.roe >= 12
      ? "🔵 Baik"
      : analysis.roe >= 6
      ? "🟡 Rata-rata"
      : "🔴 Rendah";

  // 52-week position indicator (10 segments)
  const posSegments = Math.max(0, Math.min(10, Math.round(analysis.fiftyTwoWeekPositionPercent / 10)));
  const rangeBar = "─".repeat(posSegments) + "●" + "─".repeat(10 - posSegments);

  // Technical trend
  const trendText =
    analysis.ma200 > 0
      ? analysis.isAboveMA200
        ? `Di atas MA200 (Rp ${formatNumber(Math.round(analysis.ma200))}) 🟢 Uptrend`
        : `Di bawah MA200 (Rp ${formatNumber(Math.round(analysis.ma200))}) 🔻 Koreksi`
      : "N/A";

  // Analyst recommendation badge
  const recBadge =
    analysis.recommendation === "Strong Buy" || analysis.recommendation === "Buy"
      ? `🟢 ${analysis.recommendation.toUpperCase()}`
      : analysis.recommendation === "Hold"
      ? `🟡 ${analysis.recommendation.toUpperCase()}`
      : `🔴 ${analysis.recommendation.toUpperCase()}`;

  // User holding context
  let holdingSection = "";
  if (userHolding && userHolding.currentLots > 0) {
    const isHoldProfit = userHolding.unrealizedPnL >= 0;
    holdingSection =
      `\n💼 <b>STATUS PORTOFOLIO ANDA</b>\n` +
      `• Kepemilikan: <b>${userHolding.currentLots} Lot</b> (${formatNumber(userHolding.currentShares)} lembar)\n` +
      `• Modal Beli Rata-rata: ${formatRupiah(userHolding.avgPrice)}\n` +
      `• Floating PnL: ${isHoldProfit ? "🟢" : "🔴"} <b>${formatRupiah(userHolding.unrealizedPnL)}</b> (${formatPercent(userHolding.unrealizedPnLPercent)})\n` +
      `• Porsi di Portofolio: ${userHolding.allocationPercent.toFixed(1)}%\n`;
  }

  // Highlights
  const highlightsText =
    analysis.summaryHighlights.length > 0
      ? analysis.summaryHighlights.map((h) => `• ${h}`).join("\n")
      : "• Fundamental terpantau stabil.";

  return (
    `📊 <b>ANALISA KILAT: ${analysis.ticker}</b>\n` +
    `<i>${analysis.name}</i>\n` +
    `Sektor: <b>${analysis.sector}</b>\n` +
    `Harga Terakhir: <b>${formatRupiah(analysis.currentPrice)}</b> (${dailyIcon} ${formatPercent(analysis.changePercent)})\n` +
    `Kapitalisasi Pasar: <b>${analysis.marketCapFormatted}</b>\n\n` +
    `💎 <b>VALUASI & HARGA WAJAR</b>\n` +
    `• PER (TTM): <b>${analysis.per > 0 ? analysis.per.toFixed(2) + "x" : "N/A"}</b> | PBV: <b>${analysis.pbv > 0 ? analysis.pbv.toFixed(2) + "x" : "N/A"}</b>\n` +
    `• EPS: <b>${formatRupiah(Math.round(analysis.eps))}</b> | BVPS: <b>${formatRupiah(Math.round(analysis.bvps))}</b>\n` +
    (analysis.grahamNumber > 0
      ? `• Nilai Wajar Graham: <b>${formatRupiah(analysis.grahamNumber)}</b>\n` +
        `• Margin of Safety (MoS): <b>${analysis.marginOfSafety > 0 ? "+" : ""}${analysis.marginOfSafety.toFixed(1)}%</b> (${valBadge})\n\n`
      : `• Status Valuasi: ${valBadge}\n\n`) +
    `🚀 <b>KUALITAS & PROFITABILITAS</b>\n` +
    `• ROE: <b>${analysis.roe.toFixed(2)}%</b> (${roeIcon})\n` +
    `• Net Profit Margin: <b>${analysis.npm.toFixed(2)}%</b> | OPM: <b>${analysis.opm.toFixed(2)}%</b>\n` +
    `• Pertumbuhan Laba (YoY): <b>${analysis.earningsGrowthYoY > 0 ? "+" : ""}${analysis.earningsGrowthYoY.toFixed(1)}%</b>\n\n` +
    `💰 <b>DIVIDEN & CASH RETURN</b>\n` +
    `• Dividend Yield: <b>${analysis.dividendYield.toFixed(2)}%</b>\n` +
    `• Dividend Payout Ratio: <b>${analysis.payoutRatio > 0 ? analysis.payoutRatio.toFixed(1) + "%" : "N/A"}</b>\n` +
    (analysis.dividendRate > 0 ? `• Dividen Tahunan: <b>${formatRupiah(analysis.dividendRate)}</b> / lembar\n\n` : "\n") +
    (analysis.analystCount > 0
      ? `🎯 <b>KONSENSUS ANALIS SEKURITAS (${analysis.analystCount} Analis)</b>\n` +
        `• Rekomendasi: <b>${recBadge}</b>\n` +
        `• Target Rata-rata: <b>${formatRupiah(analysis.targetPrice)}</b> (<b>+${analysis.targetUpside.toFixed(1)}%</b> Potensi)\n` +
        `• Rentang Target: ${formatRupiah(analysis.targetLow)} — ${formatRupiah(analysis.targetHigh)}\n\n`
      : "") +
    `🎯 <b>TRADING PLAN (ENTRY, SL, TP)</b>\n` +
    `• Aksi: <b>${analysis.tradingPlan.actionLabel}</b>\n` +
    `• <b>Area Entry Beli:</b> <code>${formatRupiah(analysis.tradingPlan.entryMin)} — ${formatRupiah(analysis.tradingPlan.entryMax)}</code>\n` +
    `• <b>Stop Loss (SL):</b> <code>${formatRupiah(analysis.tradingPlan.stopLoss)}</code> (<b>${analysis.tradingPlan.stopLossPercent.toFixed(1)}%</b>) 🛑\n` +
    `• <b>Take Profit 1 (TP1):</b> <code>${formatRupiah(analysis.tradingPlan.tp1)}</code> (<b>+${analysis.tradingPlan.tp1Percent.toFixed(1)}%</b>) 🎯\n` +
    `• <b>Take Profit 2 (TP2):</b> <code>${formatRupiah(analysis.tradingPlan.tp2)}</code> (<b>+${analysis.tradingPlan.tp2Percent.toFixed(1)}%</b>) 🚀\n` +
    `• <b>Risk / Reward Ratio:</b> <b>${analysis.tradingPlan.riskRewardRatio}</b>\n` +
    `• Support / Resistance: ${formatRupiah(analysis.tradingPlan.supportLevel)} / ${formatRupiah(analysis.tradingPlan.resistanceLevel)}\n\n` +
    `📈 <b>TREN TEKNIKAL & 52-WEEK RANGE</b>\n` +
    `• Tren MA200: ${trendText}\n` +
    `• 52W Range: [ ${formatRupiah(analysis.fiftyTwoWeekLow)} <code>${rangeBar}</code> ${formatRupiah(analysis.fiftyTwoWeekHigh)} ]\n` +
    holdingSection +
    `\n💡 <b>Kesimpulan Ringkas:</b>\n` +
    `${highlightsText}\n\n` +
    `🤖 <i>SahamTracker IDX Professional Analysis</i>`
  );
}

