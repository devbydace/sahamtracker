"use client";

import React from "react";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  PieChart,
  Wallet,
  Coins,
  CheckCircle2,
} from "lucide-react";
import { formatRupiah, formatPercent } from "@/lib/format";
import { PortfolioSummary } from "@/lib/portfolio";

interface PortfolioOverviewProps {
  summary: PortfolioSummary;
  onOpenCashModal: () => void;
  onOpenDividendModal: () => void;
}

export function PortfolioOverview({
  summary,
  onOpenCashModal,
  onOpenDividendModal,
}: PortfolioOverviewProps) {
  const isProfit = summary.totalUnrealizedPnL >= 0;
  const isRealizedProfit = summary.totalRealizedPnL >= 0;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* 1. Total Net Worth */}
      <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800/80 shadow-sm relative overflow-hidden">
        <div className="flex items-center justify-between text-slate-400 mb-2">
          <span className="text-xs font-medium uppercase tracking-wider">Total Kekayaan Bersih</span>
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
            <Coins className="w-4 h-4" />
          </div>
        </div>
        <div className="text-2xl lg:text-3xl font-extrabold text-white tracking-tight">
          {formatRupiah(summary.totalNetWorth)}
        </div>
        <div className="mt-2 text-xs text-slate-400 flex items-center gap-1.5">
          <span>Saham: <strong className="text-slate-200">{formatRupiah(summary.totalStockValue, true)}</strong></span>
          <span>•</span>
          <span>Kas: <strong className="text-slate-200">{formatRupiah(summary.cashBalance, true)}</strong></span>
        </div>
      </div>

      {/* 2. Floating Profit / Loss (Unrealized) */}
      <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800/80 shadow-sm relative overflow-hidden">
        <div className="flex items-center justify-between text-slate-400 mb-2">
          <span className="text-xs font-medium uppercase tracking-wider">Floating Gain / Loss</span>
          <div
            className={`w-8 h-8 rounded-lg flex items-center justify-center ${
              isProfit
                ? "bg-emerald-500/10 text-emerald-400"
                : "bg-rose-500/10 text-rose-400"
            }`}
          >
            {isProfit ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
          </div>
        </div>
        <div className="flex items-baseline gap-2">
          <div
            className={`text-2xl lg:text-3xl font-extrabold tracking-tight ${
              isProfit ? "text-emerald-400" : "text-rose-400"
            }`}
          >
            {formatRupiah(summary.totalUnrealizedPnL)}
          </div>
        </div>
        <div className="mt-2 flex items-center gap-2">
          <span
            className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
              isProfit
                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
            }`}
          >
            {formatPercent(summary.totalUnrealizedPnLPercent)}
          </span>
          <span className="text-xs text-slate-400">
            Modal: {formatRupiah(summary.totalCostBasis, true)}
          </span>
        </div>
      </div>

      {/* 3. Saldo Kas RDN */}
      <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800/80 shadow-sm relative overflow-hidden">
        <div className="flex items-center justify-between text-slate-400 mb-2">
          <span className="text-xs font-medium uppercase tracking-wider">Saldo Kas RDN</span>
          <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center">
            <Wallet className="w-4 h-4" />
          </div>
        </div>
        <div className="text-2xl lg:text-3xl font-extrabold text-white tracking-tight">
          {formatRupiah(summary.cashBalance)}
        </div>
        <div className="mt-2 flex items-center justify-between">
          <span className="text-xs text-slate-400">Siap belanja saham</span>
          <button
            onClick={onOpenCashModal}
            className="text-xs font-semibold text-blue-400 hover:text-blue-300 underline underline-offset-2"
          >
            + Setor/Tarik
          </button>
        </div>
      </div>

      {/* 4. Realized PnL & Dividen */}
      <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800/80 shadow-sm relative overflow-hidden">
        <div className="flex items-center justify-between text-slate-400 mb-2">
          <span className="text-xs font-medium uppercase tracking-wider">Cuan Terealisasi & Dividen</span>
          <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center">
            <DollarSign className="w-4 h-4" />
          </div>
        </div>
        <div className="text-2xl lg:text-3xl font-extrabold text-white tracking-tight">
          {formatRupiah(summary.totalRealizedPnL + summary.totalDividends)}
        </div>
        <div className="mt-2 flex items-center justify-between text-xs text-slate-400">
          <span>Dividen: <strong className="text-amber-400">{formatRupiah(summary.totalDividends, true)}</strong></span>
          <button
            onClick={onOpenDividendModal}
            className="text-xs font-semibold text-amber-400 hover:text-amber-300 underline underline-offset-2"
          >
            + Dividen
          </button>
        </div>
      </div>
    </div>
  );
}

