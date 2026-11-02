import YahooFinance from "yahoo-finance2";
import { roundToIDXTick } from "./format";
export { POPULAR_IDX_STOCKS, type PopularStock } from "./stock-constants";

const yf = new YahooFinance({
  suppressNotices: ["yahooSurvey"],
});

export interface StockQuoteData {
  ticker: string;
  name: string;
  currentPrice: number;
  changePercent: number;
  sector?: string;
  currency?: string;
}

export interface TradingPlan {
  action: "BUY ON WEAKNESS" | "BUY ON BREAKOUT" | "WAIT AND SEE";
  actionLabel: string;
  entryMin: number;
  entryMax: number;
  entryTarget: number;
  stopLoss: number;
  stopLossPercent: number;
  tp1: number;
  tp1Percent: number;
  tp2: number;
  tp2Percent: number;
  riskRewardRatio: string;
  supportLevel: number;
  resistanceLevel: number;
}

export interface StockDeepAnalysis {
  ticker: string;
  name: string;
  sector: string;
  currentPrice: number;
  changePercent: number;
  marketCap: number;
  marketCapFormatted: string;

  // Valuasi
  per: number;
  forwardPer: number;
  pbv: number;
  eps: number;
  bvps: number;
  grahamNumber: number;
  marginOfSafety: number;
  valuationStatus: "UNDERVALUED" | "FAIR" | "OVERVALUED";

  // Profitabilitas & Kualitas
  roe: number;
  roa: number;
  npm: number;
  opm: number;
  earningsGrowthYoY: number;
  revenueGrowthYoY: number;
  qualityStatus: "EXCELLENT" | "GOOD" | "AVERAGE" | "LOW";

  // Dividen
  dividendYield: number;
  dividendRate: number;
  payoutRatio: number;

  // Konsensus Analis
  recommendation: string;
  analystCount: number;
  targetPrice: number;
  targetUpside: number;
  targetHigh: number;
  targetLow: number;

  // Tren Teknikal & Rentang 52 Minggu
  ma50: number;
  ma200: number;
  isAboveMA200: boolean;
  fiftyTwoWeekLow: number;
  fiftyTwoWeekHigh: number;
  fiftyTwoWeekPositionPercent: number;

  // Ringkasan Cepat
  summaryHighlights: string[];

  // Trading Plan (Entry, SL, TP, RRR)
  tradingPlan: TradingPlan;
}

export function formatTicker(rawTicker: string): string {
  const clean = rawTicker.trim().toUpperCase();
  if (clean.includes(".")) {
    return clean;
  }
  // Standard 4-letter Indonesian stock code (e.g. BBCA, BBRI, ASII, BMRI)
  if (/^[A-Z]{4}$/.test(clean)) {
    return `${clean}.JK`;
  }
  return clean;
}

export function cleanTicker(formattedTicker: string): string {
  return formattedTicker.replace(".JK", "").toUpperCase();
}

export async function fetchStockQuote(symbol: string): Promise<StockQuoteData | null> {
  const formatted = formatTicker(symbol);
  try {
    const quote = await yf.quote(formatted);
    if (!quote || quote.regularMarketPrice === undefined) {
      return null;
    }

    return {
      ticker: cleanTicker(symbol),
      name: quote.shortName || quote.longName || cleanTicker(symbol),
      currentPrice: quote.regularMarketPrice ?? 0,
      changePercent: quote.regularMarketChangePercent ?? 0,
      currency: quote.currency || "IDR",
    };
  } catch (error) {
    console.error(`Failed to fetch quote for ${formatted}:`, error);
    return null;
  }
}

export async function fetchStockDeepAnalysis(symbol: string): Promise<StockDeepAnalysis | null> {
  const formatted = formatTicker(symbol);
  const cleanSymbol = cleanTicker(symbol);

  try {
    // Fetch summary modules from Yahoo Finance
    const [summary, quote] = await Promise.all([
      yf.quoteSummary(formatted, {
        modules: [
          "summaryDetail",
          "financialData",
          "defaultKeyStatistics",
          "assetProfile",
        ],
      }),
      yf.quote(formatted),
    ]);

    if (!summary || !quote || quote.regularMarketPrice === undefined) {
      return null;
    }

    const sd: any = summary.summaryDetail || {};
    const fd: any = summary.financialData || {};
    const ks: any = summary.defaultKeyStatistics || {};
    const ap: any = summary.assetProfile || {};
    const q: any = quote;

    const currentPrice = quote.regularMarketPrice ?? 0;
    const changePercent = quote.regularMarketChangePercent ?? 0;
    const name = quote.shortName || quote.longName || cleanSymbol;
    const sector = (ap as any).sector || "General";

    // Market Cap
    const marketCap = Number(sd.marketCap || quote.marketCap || 0);
    let marketCapFormatted = "";
    if (marketCap >= 1_000_000_000_000) {
      marketCapFormatted = `Rp ${(marketCap / 1_000_000_000_000).toFixed(2)} T`;
    } else if (marketCap >= 1_000_000_000) {
      marketCapFormatted = `Rp ${(marketCap / 1_000_000_000).toFixed(2)} Miliar`;
    } else {
      marketCapFormatted = `Rp ${marketCap.toLocaleString("id-ID")}`;
    }

    // Valuation Metrics
    const per = Number(sd.trailingPE || (ks as any).trailingPE || 0);
    const forwardPer = Number(sd.forwardPE || (ks as any).forwardPE || 0);
    const pbv = Number(ks.priceToBook || 0);
    const eps = Number(ks.trailingEps || (fd as any).revenuePerShare || 0);
    const bvps = Number(ks.bookValue || 0);

    // Graham Number: sqrt(22.5 * EPS * BVPS)
    let grahamNumber = 0;
    let marginOfSafety = 0;
    if (eps > 0 && bvps > 0) {
      grahamNumber = Math.round(Math.sqrt(22.5 * eps * bvps));
      if (grahamNumber > 0) {
        marginOfSafety = ((grahamNumber - currentPrice) / grahamNumber) * 100;
      }
    }

    let valuationStatus: "UNDERVALUED" | "FAIR" | "OVERVALUED" = "FAIR";
    if (marginOfSafety >= 15 || (per > 0 && per <= 10 && pbv <= 1.5)) {
      valuationStatus = "UNDERVALUED";
    } else if (marginOfSafety <= -20 || (per > 25 && pbv > 4)) {
      valuationStatus = "OVERVALUED";
    }

    // Profitability & Quality Metrics
    const roe = Number(fd.returnOnEquity || 0) * 100;
    const roa = Number(fd.returnOnAssets || 0) * 100;
    const npm = Number(fd.profitMargins || 0) * 100;
    const opm = Number(fd.operatingMargins || 0) * 100;
    const earningsGrowthYoY = Number(ks.earningsQuarterlyGrowth || fd.earningsGrowth || 0) * 100;
    const revenueGrowthYoY = Number(fd.revenueGrowth || 0) * 100;

    let qualityStatus: "EXCELLENT" | "GOOD" | "AVERAGE" | "LOW" = "AVERAGE";
    if (roe >= 18 && npm >= 15) {
      qualityStatus = "EXCELLENT";
    } else if (roe >= 12 && npm >= 8) {
      qualityStatus = "GOOD";
    } else if (roe < 6 || npm < 0) {
      qualityStatus = "LOW";
    }

    // Dividends
    const dividendYield = Number(sd.dividendYield || 0) * 100;
    const dividendRate = Number(sd.dividendRate || sd.trailingAnnualDividendRate || 0);
    const payoutRatio = Number(sd.payoutRatio || 0) * 100;

    // Analyst Consensus & Price Targets
    let rawRec = (fd.recommendationKey || "N/A").toLowerCase();
    let recommendation = "N/A";
    if (rawRec.includes("strong_buy")) recommendation = "Strong Buy";
    else if (rawRec.includes("buy")) recommendation = "Buy";
    else if (rawRec.includes("hold")) recommendation = "Hold";
    else if (rawRec.includes("underperform")) recommendation = "Underperform";
    else if (rawRec.includes("sell")) recommendation = "Sell";

    const analystCount = Number(fd.numberOfAnalystOpinions || 0);
    const targetPrice = Number(fd.targetMeanPrice || fd.targetMedianPrice || 0);
    const targetHigh = Number(fd.targetHighPrice || 0);
    const targetLow = Number(fd.targetLowPrice || 0);
    const targetUpside =
      targetPrice > 0 && currentPrice > 0
        ? ((targetPrice - currentPrice) / currentPrice) * 100
        : 0;

    // Technical / 52-Week Context
    const ma50 = Number(sd.fiftyDayAverage || 0);
    const ma200 = Number(sd.twoHundredDayAverage || 0);
    const isAboveMA200 = ma200 > 0 ? currentPrice >= ma200 : true;

    const fiftyTwoWeekLow = Number(sd.fiftyTwoWeekLow || 0);
    const fiftyTwoWeekHigh = Number(sd.fiftyTwoWeekHigh || 0);
    let fiftyTwoWeekPositionPercent = 50;
    if (fiftyTwoWeekHigh > fiftyTwoWeekLow) {
      fiftyTwoWeekPositionPercent = Math.max(
        0,
        Math.min(
          100,
          ((currentPrice - fiftyTwoWeekLow) / (fiftyTwoWeekHigh - fiftyTwoWeekLow)) * 100
        )
      );
    }

    // Highlights synthesis
    const highlights: string[] = [];

    if (roe >= 15) {
      highlights.push(`ROE ${roe.toFixed(1)}% tergolong istimewa (kriteria Warren Buffett >15%).`);
    }
    if (valuationStatus === "UNDERVALUED") {
      highlights.push(
        `Valuasi diskon dengan Margin of Safety ${marginOfSafety > 0 ? "+" : ""}${marginOfSafety.toFixed(1)}% di bawah Graham Number.`
      );
    } else if (valuationStatus === "OVERVALUED") {
      highlights.push(`Valuasi harga berada di level premium (PER ${per.toFixed(1)}x / PBV ${pbv.toFixed(1)}x).`);
    } else {
      highlights.push(`Valuasi harga saat ini relatif wajar (Fair Value).`);
    }

    if (dividendYield >= 5) {
      highlights.push(`Dividen yield ${dividendYield.toFixed(2)}% tergolong tinggi di atas rata-rata IHSG.`);
    }

    if (targetUpside >= 15 && analystCount >= 3) {
      highlights.push(`Konsensus ${analystCount} analis memproyeksikan potensi upside +${targetUpside.toFixed(1)}% ke Rp ${targetPrice.toLocaleString("id-ID")}.`);
    }

    if (!isAboveMA200 && ma200 > 0) {
      highlights.push(`Harga di bawah MA200 (Rp ${ma200.toLocaleString("id-ID")}), indikasi fase koreksi jangka panjang.`);
    } else if (isAboveMA200 && ma200 > 0) {
      highlights.push(`Harga bertahan di atas MA200 (Rp ${ma200.toLocaleString("id-ID")}), tren jangka panjang terjaga kuat.`);
    }

    // Trading Plan Calculation (Entry Buy, SL, TP, RRR)
    const supportLevel = roundToIDXTick(
      ma50 > 0 && ma50 < currentPrice
        ? ma50
        : ma200 > 0 && ma200 < currentPrice
        ? ma200
        : currentPrice * 0.95
    );

    const resistanceLevel = roundToIDXTick(
      fiftyTwoWeekHigh > currentPrice ? fiftyTwoWeekHigh : currentPrice * 1.15
    );

    let action: "BUY ON WEAKNESS" | "BUY ON BREAKOUT" | "WAIT AND SEE" = "BUY ON WEAKNESS";
    let actionLabel = "Buy on Weakness (BoW)";
    if (fiftyTwoWeekHigh > 0 && currentPrice >= fiftyTwoWeekHigh * 0.97) {
      action = "BUY ON BREAKOUT";
      actionLabel = "Buy on Breakout (Dekat High 52W)";
    } else if (valuationStatus === "OVERVALUED" && !isAboveMA200) {
      action = "WAIT AND SEE";
      actionLabel = "Wait and See (Tunggu Support Kuat)";
    } else {
      action = "BUY ON WEAKNESS";
      actionLabel = "Buy on Weakness (Area Diskon Support)";
    }

    // Entry Range
    const entryMin = roundToIDXTick(
      Math.min(currentPrice * 0.98, Math.max(supportLevel, currentPrice * 0.94))
    );
    const entryMax = roundToIDXTick(currentPrice);
    const entryTarget = roundToIDXTick((entryMin + entryMax) / 2);

    // Stop Loss (SL): 3-5% under entryMin
    let stopLoss = roundToIDXTick(entryMin * 0.95);
    if (stopLoss >= entryMin) {
      stopLoss = roundToIDXTick(entryMin * 0.93);
    }
    const stopLossPercent = entryTarget > 0 ? ((stopLoss - entryTarget) / entryTarget) * 100 : -5;

    // Take Profit 1 (TP1): Swing Target around +7% to +10%
    let tp1 = roundToIDXTick(entryTarget * 1.08);
    if (resistanceLevel > entryTarget && resistanceLevel <= tp1 * 1.05) {
      tp1 = resistanceLevel;
    }
    const tp1Percent = entryTarget > 0 ? ((tp1 - entryTarget) / entryTarget) * 100 : 8;

    // Take Profit 2 (TP2): Consensus Target or +18% to +25%
    let tp2 = roundToIDXTick(entryTarget * 1.18);
    if (targetPrice > tp1) {
      tp2 = roundToIDXTick(targetPrice);
    } else if (grahamNumber > tp1) {
      tp2 = roundToIDXTick(grahamNumber);
    }
    const tp2Percent = entryTarget > 0 ? ((tp2 - entryTarget) / entryTarget) * 100 : 18;

    // Risk / Reward Ratio (RRR)
    const risk = Math.max(1, entryTarget - stopLoss);
    const reward = Math.max(1, tp1 - entryTarget);
    const rrrVal = (reward / risk).toFixed(1);
    const riskRewardRatio = `1 : ${rrrVal}`;

    const tradingPlan: TradingPlan = {
      action,
      actionLabel,
      entryMin,
      entryMax,
      entryTarget,
      stopLoss,
      stopLossPercent,
      tp1,
      tp1Percent,
      tp2,
      tp2Percent,
      riskRewardRatio,
      supportLevel,
      resistanceLevel,
    };

    return {
      ticker: cleanSymbol,
      name,
      sector,
      currentPrice,
      changePercent,
      marketCap,
      marketCapFormatted,
      per,
      forwardPer,
      pbv,
      eps,
      bvps,
      grahamNumber,
      marginOfSafety,
      valuationStatus,
      roe,
      roa,
      npm,
      opm,
      earningsGrowthYoY,
      revenueGrowthYoY,
      qualityStatus,
      dividendYield,
      dividendRate,
      payoutRatio,
      recommendation,
      analystCount,
      targetPrice,
      targetUpside,
      targetHigh,
      targetLow,
      ma50,
      ma200,
      isAboveMA200,
      fiftyTwoWeekLow,
      fiftyTwoWeekHigh,
      fiftyTwoWeekPositionPercent,
      summaryHighlights: highlights,
      tradingPlan,
    };
  } catch (error) {
    console.error(`Error calculating deep analysis for ${formatted}:`, error);
    return null;
  }
}
