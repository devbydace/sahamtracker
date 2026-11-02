"use client";

import React, { useTransition } from "react";
import { TrendingUp, RefreshCw, PlusCircle, Wallet, Award, Database, Send, BarChart2 } from "lucide-react";
import { refreshAllStockPricesAction, seedDemoDataAction, resetPortfolioDataAction } from "@/app/actions";

interface NavbarProps {
  onOpenTradeModal: () => void;
  onOpenCashModal: () => void;
  onOpenDividendModal: () => void;
  onOpenCalcModal: () => void;
  onOpenTelegramModal: () => void;
  onOpenAnalysisModal: () => void;
  hasData: boolean;
}

export function Navbar({
  onOpenTradeModal,
  onOpenCashModal,
  onOpenDividendModal,
  onOpenCalcModal,
  onOpenTelegramModal,
  onOpenAnalysisModal,
  hasData,
}: NavbarProps) {
  const [isPendingRefresh, startTransitionRefresh] = useTransition();
  const [isPendingReset, startTransitionReset] = useTransition();

  const handleRefresh = () => {
    startTransitionRefresh(async () => {
      await refreshAllStockPricesAction();
    });
  };

  const handleResetPortfolio = () => {
    if (
      confirm(
        "Apakah Anda yakin ingin mengosongkan seluruh riwayat transaksi saham dan mutasi kas? (Koneksi bot Telegram tetap aman dipertahankan)."
      )
    ) {
      startTransitionReset(async () => {
        await resetPortfolioDataAction();
      });
    }
  };

  return (
    <header className="sticky top-0 z-30 border-b border-slate-800 bg-slate-950/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-slate-950 font-bold shadow-lg shadow-emerald-500/20">
            <TrendingUp className="w-6 h-6 stroke-[2.5]" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
              SahamTracker <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">IDX</span>
            </h1>
            <p className="text-xs text-slate-400 hidden sm:block">Tabungan & Portofolio Saham Pribadi</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          {hasData && (
            <button
              onClick={handleResetPortfolio}
              disabled={isPendingReset}
              className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-2 rounded-lg bg-slate-800/60 hover:bg-rose-500/10 text-slate-400 hover:text-rose-400 border border-slate-800 hover:border-rose-500/20 transition-colors"
              title="Kosongkan data portofolio"
            >
              <Database className="w-3.5 h-3.5" />
              <span className="hidden lg:inline">{isPendingReset ? "Mereset..." : "Kosongkan Data"}</span>
            </button>
          )}

          <button
            onClick={handleRefresh}
            disabled={isPendingRefresh}
            className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-lg bg-slate-800/80 hover:bg-slate-800 text-slate-200 border border-slate-700 transition-colors"
            title="Perbarui harga pasar terkini dari Yahoo Finance"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isPendingRefresh ? "animate-spin text-emerald-400" : ""}`} />
            <span className="hidden sm:inline">{isPendingRefresh ? "Sinkronisasi..." : "Cek Harga Live"}</span>
          </button>

          <button
            onClick={onOpenAnalysisModal}
            className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 transition-colors"
            title="Analisa Fundamental & Teknikal Saham IDX"
          >
            <BarChart2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Analisa</span>
          </button>

          <button
            onClick={onOpenTelegramModal}
            className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-lg bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 border border-sky-500/30 transition-colors"
            title="Integrasi Bot Telegram & Kirim Notifikasi"
          >
            <Send className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Telegram</span>
          </button>

          <button
            onClick={onOpenCalcModal}
            className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-lg bg-slate-800/80 hover:bg-slate-800 text-slate-200 border border-slate-700 transition-colors"
          >
            <Award className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">Kalkulator</span>
          </button>

          <button
            onClick={onOpenCashModal}
            className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-lg bg-slate-800/80 hover:bg-slate-800 text-slate-200 border border-slate-700 transition-colors"
          >
            <Wallet className="w-3.5 h-3.5 text-blue-400" />
            <span>Kas RDN</span>
          </button>

          <button
            onClick={onOpenTradeModal}
            className="inline-flex items-center gap-1.5 text-xs font-semibold px-3.5 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-md shadow-emerald-500/20 transition-all font-sans"
          >
            <PlusCircle className="w-4 h-4" />
            <span>+ Transaksi</span>
          </button>
        </div>
      </div>
    </header>
  );
}
