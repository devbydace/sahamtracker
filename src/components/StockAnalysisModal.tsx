"use client";

import React, { useState, useEffect, useTransition } from "react";
import {
  X,
  Search,
  Send,
  TrendingUp,
  TrendingDown,
  CheckCircle,
  AlertCircle,
  Sparkles,
  Award,
  Layers,
  Target,
  BarChart2,
  Percent,
  Compass,
} from "lucide-react";
import { formatRupiah, formatNumber, formatPercent } from "@/lib/format";
import { POPULAR_IDX_STOCKS } from "@/lib/stock-constants";
import { getStockAnalysisAction, sendStockAnalysisToTelegramAction } from "@/app/actions";
import { StockDeepAnalysis } from "@/lib/yahoo-finance";
import { StockHolding } from "@/lib/portfolio";

interface StockAnalysisModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTicker?: string;
  holdings: StockHolding[];
}

export function StockAnalysisModal({
  isOpen,
  onClose,
  initialTicker = "BBCA",
  holdings,
}: StockAnalysisModalProps) {
  const [tickerInput, setTickerInput] = useState(initialTicker);
  const [analysis, setAnalysis] = useState<StockDeepAnalysis | null>(null);
  const [userHolding, setUserHolding] = useState<StockHolding | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const [isLoading, startTransitionLoad] = useTransition();
  const [isSendingTelegram, startTransitionTelegram] = useTransition();

  const handleFetchAnalysis = (symbolToFetch: string) => {
    if (!symbolToFetch.trim()) return;
    setError(null);
    setStatusMessage(null);

    startTransitionLoad(async () => {
      const res = await getStockAnalysisAction(symbolToFetch);
      if (res.success && res.analysis) {
        setAnalysis(res.analysis);
        setUserHolding(res.holding);
      } else {
        setError(res.error || `Gagal menganalisa saham ${symbolToFetch}.`);
      }
    });
  };

  useEffect(() => {
    if (isOpen) {
      const target = initialTicker || "BBCA";
      setTickerInput(target);
      handleFetchAnalysis(target);
    }
  }, [isOpen, initialTicker]);

  if (!isOpen) return null;

  const handleSendToTelegram = () => {
    if (!analysis) return;
    setStatusMessage(null);

    startTransitionTelegram(async () => {
      const res = await sendStockAnalysisToTelegramAction(analysis.ticker);
      if (res.success) {
        setStatusMessage("Analisa kilat berhasil dikirim ke Telegram Anda!");
      } else {
        setError(res.error || "Gagal mengirim ke Telegram.");
      }
    });
  };

  const isDailyPlus = analysis ? analysis.changePercent >= 0 : true;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl my-6 max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-slate-800 flex items-center justify-between shrink-0 bg-slate-950/70">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <BarChart2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                Analisa Saham Kilat & Profesional
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                  Fundamental & Teknikal
                </span>
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search bar & quick chips */}
        <div className="p-4 border-b border-slate-800 bg-slate-950 shrink-0">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleFetchAnalysis(tickerInput);
            }}
            className="flex items-center gap-2"
          >
            <div className="relative flex-1">
              <input
                type="text"
                placeholder="Ketik kode saham IDX (contoh: BBCA, BBRI, ASII, ICBP)..."
                value={tickerInput}
                onChange={(e) => setTickerInput(e.target.value.toUpperCase())}
                className="w-full px-3.5 py-2 pl-9 rounded-xl bg-slate-900 border border-slate-800 text-white font-mono text-xs focus:outline-none focus:border-emerald-500"
              />
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-3" />
            </div>
            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-md shadow-emerald-500/20 transition-all shrink-0"
            >
              {isLoading ? "Menganalisa..." : "Analisa"}
            </button>
          </form>

          {/* Popular chips */}
          <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
            <span className="text-[10px] text-slate-500 mr-1">Rekomendasi:</span>
            {POPULAR_IDX_STOCKS.slice(0, 7).map((s) => (
              <button
                key={s.ticker}
                type="button"
                onClick={() => {
                  setTickerInput(s.ticker);
                  handleFetchAnalysis(s.ticker);
                }}
                className={`text-[11px] font-semibold px-2 py-0.5 rounded-md border transition-colors ${
                  analysis?.ticker === s.ticker
                    ? "bg-emerald-500/20 border-emerald-500 text-emerald-300"
                    : "bg-slate-900 border-slate-800 text-slate-400 hover:text-white"
                }`}
              >
                {s.ticker}
              </button>
            ))}
          </div>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {error && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {statusMessage && (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center gap-2">
              <CheckCircle className="w-4 h-4 shrink-0" />
              <span>{statusMessage}</span>
            </div>
          )}

          {isLoading ? (
            <div className="py-16 text-center space-y-3">
              <div className="w-10 h-10 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs text-slate-400 font-medium">
                Sedang mengolah laporan keuangan, rasio valuasi, dan konsensus analis...
              </p>
            </div>
          ) : analysis ? (
            <div className="space-y-4">
              {/* Overview Header Banner */}
              <div className="p-4 rounded-xl bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-extrabold text-white font-mono">
                      {analysis.ticker}
                    </span>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
                      {analysis.sector}
                    </span>
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5">{analysis.name}</div>
                  <div className="text-[11px] text-slate-500 mt-1">
                    Market Cap: <strong className="text-slate-300">{analysis.marketCapFormatted}</strong>
                  </div>
                </div>

                <div className="flex sm:flex-col items-baseline sm:items-end justify-between gap-1">
                  <div className="text-xl font-extrabold text-white font-mono">
                    {formatRupiah(analysis.currentPrice)}
                  </div>
                  <div
                    className={`text-xs font-bold inline-flex items-center gap-0.5 ${
                      isDailyPlus ? "text-emerald-400" : "text-rose-400"
                    }`}
                  >
                    {isDailyPlus ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                    {formatPercent(analysis.changePercent)}
                  </div>
                  <button
                    onClick={handleSendToTelegram}
                    disabled={isSendingTelegram}
                    className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 text-xs font-bold shadow-md shadow-sky-500/20 transition-all"
                    title="Kirim hasil analisa ini ke chat bot Telegram Anda"
                  >
                    <Send className="w-3 h-3" />
                    <span>{isSendingTelegram ? "Mengirim..." : "Kirim ke Telegram"}</span>
                  </button>
                </div>
              </div>

              {/* TRADING PLAN: ENTRY, SL, TP, RRR */}
              <div className="p-4 rounded-xl bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 border border-emerald-500/30 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-md bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                      <Target className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-xs font-bold text-white">Trading Plan & Rekomendasi Level Harga</span>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    {analysis.tradingPlan.actionLabel}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                  {/* Entry Buy */}
                  <div className="p-3 rounded-lg bg-slate-950/90 border border-slate-800">
                    <span className="text-[11px] text-slate-400 block mb-0.5">Area Entry Beli:</span>
                    <span className="font-extrabold text-white text-xs sm:text-sm block font-mono">
                      {formatRupiah(analysis.tradingPlan.entryMin)} — {formatRupiah(analysis.tradingPlan.entryMax)}
                    </span>
                    <span className="text-[10px] text-slate-500 block mt-0.5">Support: {formatRupiah(analysis.tradingPlan.supportLevel)}</span>
                  </div>

                  {/* Stop Loss (SL) */}
                  <div className="p-3 rounded-lg bg-slate-950/90 border border-rose-500/20">
                    <span className="text-[11px] text-slate-400 block mb-0.5">Stop Loss (SL):</span>
                    <span className="font-extrabold text-rose-400 text-xs sm:text-sm block font-mono">
                      {formatRupiah(analysis.tradingPlan.stopLoss)}
                    </span>
                    <span className="text-[10px] text-rose-400/90 font-semibold block mt-0.5">
                      {analysis.tradingPlan.stopLossPercent.toFixed(1)}% Cut Loss
                    </span>
                  </div>

                  {/* Take Profit 1 (TP1) */}
                  <div className="p-3 rounded-lg bg-slate-950/90 border border-emerald-500/20">
                    <span className="text-[11px] text-slate-400 block mb-0.5">Take Profit 1 (TP1):</span>
                    <span className="font-extrabold text-emerald-400 text-xs sm:text-sm block font-mono">
                      {formatRupiah(analysis.tradingPlan.tp1)}
                    </span>
                    <span className="text-[10px] text-emerald-400 font-semibold block mt-0.5">
                      +{analysis.tradingPlan.tp1Percent.toFixed(1)}% Target Swing
                    </span>
                  </div>

                  {/* Take Profit 2 (TP2) */}
                  <div className="p-3 rounded-lg bg-slate-950/90 border border-indigo-500/20">
                    <span className="text-[11px] text-slate-400 block mb-0.5">Take Profit 2 (TP2):</span>
                    <span className="font-extrabold text-indigo-400 text-xs sm:text-sm block font-mono">
                      {formatRupiah(analysis.tradingPlan.tp2)}
                    </span>
                    <span className="text-[10px] text-indigo-400 font-semibold block mt-0.5">
                      +{analysis.tradingPlan.tp2Percent.toFixed(1)}% Target Konsensus
                    </span>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                  <span>Risk/Reward Ratio (RRR): <strong className="text-white font-mono">{analysis.tradingPlan.riskRewardRatio}</strong></span>
                  <span>Resistance: <strong className="text-slate-300 font-mono">{formatRupiah(analysis.tradingPlan.resistanceLevel)}</strong></span>
                </div>
              </div>

              {/* Grid 1: Valuasi & Kualitas */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* 1. Valuasi & Harga Wajar */}
                <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2.5">
                  <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                    <span className="text-xs font-bold text-white flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                      Valuasi & Nilai Wajar
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        analysis.valuationStatus === "UNDERVALUED"
                          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                          : analysis.valuationStatus === "OVERVALUED"
                          ? "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                          : "bg-slate-800 text-slate-300"
                      }`}
                    >
                      {analysis.valuationStatus === "UNDERVALUED"
                        ? "Diskon"
                        : analysis.valuationStatus === "OVERVALUED"
                        ? "Premium"
                        : "Fair Value"}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-slate-400 block text-[11px]">PER (TTM):</span>
                      <span className="font-semibold text-white font-mono">
                        {analysis.per > 0 ? `${analysis.per.toFixed(2)}x` : "N/A"}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[11px]">PBV:</span>
                      <span className="font-semibold text-white font-mono">
                        {analysis.pbv > 0 ? `${analysis.pbv.toFixed(2)}x` : "N/A"}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[11px]">EPS:</span>
                      <span className="font-semibold text-white">
                        {formatRupiah(Math.round(analysis.eps))}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[11px]">BVPS:</span>
                      <span className="font-semibold text-white">
                        {formatRupiah(Math.round(analysis.bvps))}
                      </span>
                    </div>
                  </div>

                  {analysis.grahamNumber > 0 && (
                    <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between text-xs">
                      <div>
                        <span className="text-slate-400 text-[11px] block">
                          Harga Wajar Graham:
                        </span>
                        <span className="font-bold text-indigo-400 font-mono">
                          {formatRupiah(analysis.grahamNumber)}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-slate-400 text-[11px] block">Margin of Safety:</span>
                        <span
                          className={`font-bold font-mono ${
                            analysis.marginOfSafety >= 0 ? "text-emerald-400" : "text-rose-400"
                          }`}
                        >
                          {analysis.marginOfSafety >= 0 ? "+" : ""}
                          {analysis.marginOfSafety.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* 2. Profitabilitas & Kualitas */}
                <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2.5">
                  <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                    <span className="text-xs font-bold text-white flex items-center gap-1.5">
                      <Award className="w-3.5 h-3.5 text-emerald-400" />
                      Profitabilitas Bisnis
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        analysis.qualityStatus === "EXCELLENT"
                          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                          : analysis.qualityStatus === "GOOD"
                          ? "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                          : "bg-slate-800 text-slate-400"
                      }`}
                    >
                      {analysis.qualityStatus === "EXCELLENT"
                        ? "Istimewa"
                        : analysis.qualityStatus === "GOOD"
                        ? "Bagus"
                        : "Rata-rata"}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-slate-400 block text-[11px]">ROE (Laba Modal):</span>
                      <span
                        className={`font-bold text-sm ${
                          analysis.roe >= 15 ? "text-emerald-400" : "text-white"
                        }`}
                      >
                        {analysis.roe.toFixed(2)}%
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[11px]">ROA (Laba Aset):</span>
                      <span className="font-semibold text-white font-mono">
                        {analysis.roa.toFixed(2)}%
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[11px]">Net Profit Margin:</span>
                      <span className="font-semibold text-white font-mono">
                        {analysis.npm.toFixed(2)}%
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[11px]">Pertumbuhan Laba:</span>
                      <span
                        className={`font-semibold font-mono ${
                          analysis.earningsGrowthYoY >= 0 ? "text-emerald-400" : "text-rose-400"
                        }`}
                      >
                        {analysis.earningsGrowthYoY >= 0 ? "+" : ""}
                        {analysis.earningsGrowthYoY.toFixed(1)}%
                      </span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-800/60 text-[11px] text-slate-400">
                    Operating Margin (OPM):{" "}
                    <strong className="text-slate-200">{analysis.opm.toFixed(2)}%</strong>
                  </div>
                </div>
              </div>

              {/* Grid 2: Dividen & Konsensus Analis */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* 3. Dividen */}
                <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2">
                  <span className="text-xs font-bold text-white flex items-center gap-1.5 border-b border-slate-800/80 pb-2">
                    <Percent className="w-3.5 h-3.5 text-amber-400" />
                    Dividen Tunai
                  </span>
                  <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                    <div>
                      <span className="text-slate-400 block text-[11px]">Dividend Yield:</span>
                      <span className="font-bold text-amber-400 text-sm">
                        {analysis.dividendYield.toFixed(2)}%
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[11px]">Payout Ratio (DPR):</span>
                      <span className="font-semibold text-white font-mono">
                        {analysis.payoutRatio > 0 ? `${analysis.payoutRatio.toFixed(1)}%` : "N/A"}
                      </span>
                    </div>
                  </div>
                  {analysis.dividendRate > 0 && (
                    <div className="text-[11px] text-slate-400 pt-1">
                      Dividen Tahunan:{" "}
                      <strong className="text-slate-200">{formatRupiah(analysis.dividendRate)}</strong> / lbr
                    </div>
                  )}
                </div>

                {/* 4. Konsensus Analis */}
                <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                    <span className="text-xs font-bold text-white flex items-center gap-1.5">
                      <Target className="w-3.5 h-3.5 text-sky-400" />
                      Konsensus Analis ({analysis.analystCount || 0} Analis)
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/20">
                      {analysis.recommendation}
                    </span>
                  </div>

                  {analysis.targetPrice > 0 ? (
                    <div className="flex items-center justify-between text-xs pt-1">
                      <div>
                        <span className="text-slate-400 text-[11px] block">Target Rata-rata:</span>
                        <span className="font-bold text-white text-sm">
                          {formatRupiah(analysis.targetPrice)}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-slate-400 text-[11px] block">Potensi Upside:</span>
                        <span
                          className={`font-bold font-mono text-sm ${
                            analysis.targetUpside >= 0 ? "text-emerald-400" : "text-rose-400"
                          }`}
                        >
                          {analysis.targetUpside >= 0 ? "+" : ""}
                          {analysis.targetUpside.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="text-xs text-slate-500 pt-2">
                      Data target konsensus analis belum tersedia.
                    </div>
                  )}
                </div>
              </div>

              {/* Technical / 52-Week Range */}
              <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2">
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Compass className="w-3.5 h-3.5 text-indigo-400" />
                  Tren Harga & Rentang 52 Minggu
                </span>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                  <div className="text-slate-300">
                    Posisi MA200:{" "}
                    <strong className="text-white font-mono">
                      {analysis.ma200 > 0 ? formatRupiah(Math.round(analysis.ma200)) : "N/A"}
                    </strong>{" "}
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                        analysis.isAboveMA200
                          ? "bg-emerald-500/10 text-emerald-400"
                          : "bg-rose-500/10 text-rose-400"
                      }`}
                    >
                      {analysis.isAboveMA200 ? "Di Atas MA200 (Uptrend)" : "Di Bawah MA200 (Koreksi)"}
                    </span>
                  </div>
                </div>

                {/* 52-Week Range Bar */}
                <div className="pt-1.5">
                  <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                    <span>52W Low: {formatRupiah(analysis.fiftyTwoWeekLow)}</span>
                    <span className="text-slate-300 font-medium">
                      Posisi Siklus: {analysis.fiftyTwoWeekPositionPercent.toFixed(0)}%
                    </span>
                    <span>52W High: {formatRupiah(analysis.fiftyTwoWeekHigh)}</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden relative">
                    <div
                      className="h-full bg-gradient-to-r from-emerald-500 to-indigo-500 rounded-full"
                      style={{ width: `${Math.min(100, analysis.fiftyTwoWeekPositionPercent)}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Status di Portofolio Pengguna (jika ada) */}
              {userHolding && userHolding.currentLots > 0 && (
                <div className="p-4 rounded-xl bg-gradient-to-r from-slate-900 via-indigo-950/30 to-slate-900 border border-indigo-800/40 text-xs space-y-1.5">
                  <div className="flex items-center justify-between font-bold text-white">
                    <span className="flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-indigo-400" />
                      Status di Portofolio Anda
                    </span>
                    <span
                      className={
                        userHolding.unrealizedPnL >= 0 ? "text-emerald-400" : "text-rose-400"
                      }
                    >
                      Floating PnL: {formatRupiah(userHolding.unrealizedPnL)} (
                      {formatPercent(userHolding.unrealizedPnLPercent)})
                    </span>
                  </div>
                  <div className="text-slate-300 text-[11px]">
                    Memiliki: <strong>{userHolding.currentLots} lot</strong> ({formatNumber(userHolding.currentShares)} lbr) • Modal rata-rata: {formatRupiah(userHolding.avgPrice)} • Porsi di aset: {userHolding.allocationPercent.toFixed(1)}%
                  </div>
                </div>
              )}

              {/* Highlights / Ringkasan Cepat */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
                <span className="text-xs font-bold text-slate-300 block">
                  💡 Kesimpulan Cepat Analis:
                </span>
                <ul className="space-y-1 text-xs text-slate-300 leading-relaxed">
                  {analysis.summaryHighlights.map((h, i) => (
                    <li key={i} className="flex items-start gap-1.5">
                      <span className="text-emerald-400 font-bold">•</span>
                      <span>{h}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

