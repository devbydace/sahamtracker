import {
  sendTelegramMessage,
  formatPortfolioReportHtml,
  formatStockAnalysisHtml,
} from "./telegram";
import { calculatePortfolio } from "./portfolio";
import { fetchStockQuote, fetchStockDeepAnalysis } from "./yahoo-finance";
import { addStockTransaction } from "@/app/actions";
import { formatRupiah, formatNumber, formatPercent } from "./format";

export async function handleTelegramMessage(chatId: string, text: string) {
  const cleanText = text.trim();
  const parts = cleanText.split(/\s+/);
  const command = parts[0].toLowerCase();

  if (command === "/start" || command === "/help") {
    const helpMsg =
      `🤖 <b>SahamTracker IDX Telegram Bot</b>\n\n` +
      `Berikut perintah yang bisa Anda gunakan:\n` +
      `• <code>/portfolio</code> atau <code>/porto</code> : Rekap lengkap portofolio saham & kas\n` +
      `• <code>/analisa &lt;KODE&gt;</code> atau <code>/cek &lt;KODE&gt;</code> : Analisa finansial kilat (PER, PBV, Graham Number, ROE, Target Analis, MA200)\n` +
      `• <code>/harga &lt;KODE&gt;</code> : Cek harga pasar live (contoh: <code>/harga BBCA</code>)\n` +
      `• <code>/rdn</code> atau <code>/kas</code> : Cek saldo kas RDN yang tersedia\n` +
      `• <code>/dca</code> : Pantau target tabungan saham bulan ini\n` +
      `• <code>/beli &lt;KODE&gt; &lt;LOT&gt; &lt;HARGA&gt;</code> : Catat pembelian via bot (contoh: <code>/beli BBCA 5 4950</code>)\n` +
      `• <code>/jual &lt;KODE&gt; &lt;LOT&gt; &lt;HARGA&gt;</code> : Catat penjualan via bot\n\n` +
      `<i>Data otomatis tersinkronisasi dengan dashboard web.</i>`;

    await sendTelegramMessage(helpMsg, { chatId });
    return;
  }

  if (command === "/portfolio" || command === "/porto") {
    const portfolio = await calculatePortfolio();
    const report = formatPortfolioReportHtml(portfolio);
    await sendTelegramMessage(report, { chatId });
    return;
  }

  if (command === "/rdn" || command === "/kas") {
    const portfolio = await calculatePortfolio();
    const msg =
      `💵 <b>SALDO KAS RDN</b>\n\n` +
      `Tersedia: <b>${formatRupiah(portfolio.cashBalance)}</b>\n\n` +
      `<i>Total Net Worth (Saham + Kas): ${formatRupiah(portfolio.totalNetWorth)}</i>`;
    await sendTelegramMessage(msg, { chatId });
    return;
  }

  if (command === "/dca" || command === "/tabungan") {
    const portfolio = await calculatePortfolio();
    const s = portfolio.monthlySavings;
    const progressBars = Math.min(10, Math.round(s.progressPercent / 10));
    const barStr = "█".repeat(progressBars) + "░".repeat(10 - progressBars);

    const msg =
      `🎯 <b>TARGET TABUNGAN SAHAM BULAN INI</b>\n\n` +
      `Progress: [<code>${barStr}</code>] <b>${s.progressPercent.toFixed(0)}%</b>\n` +
      `Terkumpul: <b>${formatRupiah(s.actualSaved)}</b>\n` +
      `Target: <b>${formatRupiah(s.targetAmount)}</b>\n` +
      (s.targetAmount > s.actualSaved
        ? `Sisa kebutuhan: ${formatRupiah(s.targetAmount - s.actualSaved)}\n`
        : `🎉 Target bulan ini sudah tercapai!\n`);

    await sendTelegramMessage(msg, { chatId });
    return;
  }

  if (command === "/analisa" || command === "/cek" || command === "/analyze") {
    const ticker = parts[1]?.toUpperCase();
    if (!ticker) {
      await sendTelegramMessage(
        "⚠️ Mohon sertakan kode saham yang ingin dianalisa.\nContoh: <code>/analisa BBCA</code> atau <code>/cek BBRI</code>",
        { chatId }
      );
      return;
    }

    await sendTelegramMessage(`⏳ Sedang menganalisa fundamental & teknikal <b>${ticker}</b>...`, {
      chatId,
    });

    const analysis = await fetchStockDeepAnalysis(ticker);
    if (!analysis) {
      await sendTelegramMessage(
        `❌ Gagal mengambil data analisa untuk saham <b>${ticker}</b>. Pastikan kode ticker terdaftar di bursa IDX (BEI).`,
        { chatId }
      );
      return;
    }

    // Check if user owns this stock
    const portfolio = await calculatePortfolio();
    const holding = portfolio.holdings.find((h) => h.ticker === ticker);

    const html = formatStockAnalysisHtml(analysis, holding);
    await sendTelegramMessage(html, { chatId });
    return;
  }

  if (command === "/harga" || command === "/price") {
    const ticker = parts[1]?.toUpperCase();
    if (!ticker) {
      await sendTelegramMessage(
        "⚠️ Mohon sertakan kode saham. Contoh: <code>/harga BBCA</code>",
        { chatId }
      );
      return;
    }

    const quote = await fetchStockQuote(ticker);
    if (!quote) {
      await sendTelegramMessage(`❌ Gagal mengambil harga pasar untuk <b>${ticker}</b>.`, {
        chatId,
      });
      return;
    }

    // Check if user holds this stock
    const portfolio = await calculatePortfolio();
    const holding = portfolio.holdings.find((h) => h.ticker === ticker);

    const isDailyPlus = quote.changePercent >= 0;
    const dailyIcon = isDailyPlus ? "🔺" : "🔻";

    let holdingInfo = "";
    if (holding) {
      const itemProfit = holding.unrealizedPnL >= 0;
      holdingInfo =
        `\n💼 <b>Portofolio Anda:</b>\n` +
        `• Kepemilikan: <b>${holding.currentLots} lot</b> (${formatNumber(holding.currentShares)} lbr)\n` +
        `• Harga Beli Rata-rata: ${formatRupiah(holding.avgPrice)}\n` +
        `• Floating PnL: ${itemProfit ? "🟢" : "🔴"} <b>${formatRupiah(holding.unrealizedPnL)}</b> (${formatPercent(holding.unrealizedPnLPercent)})\n`;
    }

    const msg =
      `📈 <b>HARGA PASAR SAHAM IDX</b>\n\n` +
      `Emiten: <b>${quote.ticker}</b> (${quote.name})\n` +
      `Harga Terakhir: <b>${formatRupiah(quote.currentPrice)}</b>\n` +
      `Perubahan: ${dailyIcon} ${formatPercent(quote.changePercent)}\n` +
      holdingInfo;

    await sendTelegramMessage(msg, { chatId });
    return;
  }

  if (command === "/beli" || command === "/buy" || command === "/jual" || command === "/sell") {
    const isBuy = command === "/beli" || command === "/buy";
    const ticker = parts[1]?.toUpperCase();
    const lots = Number(parts[2]);
    const price = Number(parts[3]);

    if (!ticker || isNaN(lots) || lots <= 0 || isNaN(price) || price <= 0) {
      await sendTelegramMessage(
        `⚠️ Format salah. Gunakan:\n<code>${command} &lt;KODE&gt; &lt;LOT&gt; &lt;HARGA&gt;</code>\nContoh: <code>${command} BBCA 5 4980</code>`,
        { chatId }
      );
      return;
    }

    const result = await addStockTransaction({
      ticker,
      type: isBuy ? "BUY" : "SELL",
      lots,
      pricePerShare: price,
      broker: "Telegram Bot",
      notes: "Transaksi dicatat via Telegram Bot",
    });

    if (result.success) {
      await sendTelegramMessage(
        `✅ Berhasil mencatat ${isBuy ? "Pembelian" : "Penjualan"} <b>${ticker}</b>!\n` +
          `• Volume: ${lots} lot (${lots * 100} lembar)\n` +
          `• Harga: ${formatRupiah(price)}\n` +
          `• Total Transaksi: <b>${formatRupiah(result.transaction?.totalAmount || 0)}</b>`,
        { chatId }
      );
    } else {
      await sendTelegramMessage(`❌ Gagal mencatat transaksi: ${result.error}`, { chatId });
    }
    return;
  }

  // Fallback for unhandled text
  await sendTelegramMessage(
    `Perintah tidak dikenal. Ketik <code>/help</code> untuk melihat daftar perintah seperti <code>/analisa BBCA</code> atau <code>/portfolio</code>.`,
    { chatId }
  );
}

