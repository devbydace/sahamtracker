"use client";

import React, { useState } from "react";
import { Navbar } from "./Navbar";
import { PortfolioOverview } from "./PortfolioOverview";
import { SavingsGoalCard } from "./SavingsGoalCard";
import { HoldingsTable } from "./HoldingsTable";
import { PortfolioCharts } from "./PortfolioCharts";
import { TransactionsList } from "./TransactionsList";
import { CashList } from "./CashList";
import { DividendList } from "./DividendList";
import { TransactionModal } from "./TransactionModal";
import { CashModal } from "./CashModal";
import { DividendModal } from "./DividendModal";
import { CalculatorModal } from "./CalculatorModal";
import { TelegramModal } from "./TelegramModal";
import { StockAnalysisModal } from "./StockAnalysisModal";
import { PortfolioSummary } from "@/lib/portfolio";
import { Layers, History, Wallet, DollarSign } from "lucide-react";

interface DashboardContainerProps {
  portfolio: PortfolioSummary;
  recentTransactions: any[];
  recentCash: any[];
  recentDividends: any[];
}

export function DashboardContainer({
  portfolio,
  recentTransactions,
  recentCash,
  recentDividends,
}: DashboardContainerProps) {
  // Modals state
  const [isTradeModalOpen, setIsTradeModalOpen] = useState(false);
  const [tradeInitialTicker, setTradeInitialTicker] = useState("");
  const [tradeInitialType, setTradeInitialType] = useState<"BUY" | "SELL">("BUY");

  const [isCashModalOpen, setIsCashModalOpen] = useState(false);
  const [isDividendModalOpen, setIsDividendModalOpen] = useState(false);
  const [isCalcModalOpen, setIsCalcModalOpen] = useState(false);
  const [isTelegramModalOpen, setIsTelegramModalOpen] = useState(false);
  const [isAnalysisModalOpen, setIsAnalysisModalOpen] = useState(false);
  const [analysisTicker, setAnalysisTicker] = useState("BBCA");

  // Active tab under dashboard
  const [activeTab, setActiveTab] = useState<"holdings" | "transactions" | "cash" | "dividends">(
    "holdings"
  );

  const handleOpenAnalysis = (ticker: string = "BBCA") => {
    setAnalysisTicker(ticker);
    setIsAnalysisModalOpen(true);
  };

  const handleTradeStock = (ticker: string, defaultType: "BUY" | "SELL") => {
    setTradeInitialTicker(ticker);
    setTradeInitialType(defaultType);
    setIsTradeModalOpen(true);
  };

  const handleOpenNewTrade = () => {
    setTradeInitialTicker("");
    setTradeInitialType("BUY");
    setIsTradeModalOpen(true);
  };

  const hasData =
    portfolio.holdings.length > 0 ||
    recentTransactions.length > 0 ||
    recentCash.length > 0;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-emerald-500/30 selection:text-emerald-300">
      {/* Top Navbar */}
      <Navbar
        onOpenTradeModal={handleOpenNewTrade}
        onOpenCashModal={() => setIsCashModalOpen(true)}
        onOpenDividendModal={() => setIsDividendModalOpen(true)}
        onOpenCalcModal={() => setIsCalcModalOpen(true)}
        onOpenTelegramModal={() => setIsTelegramModalOpen(true)}
        onOpenAnalysisModal={() => handleOpenAnalysis("BBCA")}
        hasData={hasData}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* 1. Primary Portfolio Metric Cards */}
        <PortfolioOverview
          summary={portfolio}
          onOpenCashModal={() => setIsCashModalOpen(true)}
          onOpenDividendModal={() => setIsDividendModalOpen(true)}
        />

        {/* 2. Monthly Savings Goal (DCA Tracker) */}
        <SavingsGoalCard monthlySavings={portfolio.monthlySavings} />

        {/* 3. Charts (if holdings exist) */}
        {portfolio.holdings.length > 0 && (
          <PortfolioCharts
            holdings={portfolio.holdings}
            sectorAllocations={portfolio.sectorAllocations}
          />
        )}

        {/* 4. Tabs Section */}
        <div className="space-y-4">
          <div className="border-b border-slate-800 flex items-center justify-between gap-4 overflow-x-auto pb-px">
            <div className="flex gap-2">
              <button
                onClick={() => setActiveTab("holdings")}
                className={`inline-flex items-center gap-2 py-3 px-4 text-xs font-bold border-b-2 transition-all whitespace-nowrap ${
                  activeTab === "holdings"
                    ? "border-emerald-500 text-emerald-400"
                    : "border-transparent text-slate-400 hover:text-slate-200"
                }`}
              >
                <Layers className="w-4 h-4" />
                <span>Portofolio Saham ({portfolio.holdings.length})</span>
              </button>

              <button
                onClick={() => setActiveTab("transactions")}
                className={`inline-flex items-center gap-2 py-3 px-4 text-xs font-bold border-b-2 transition-all whitespace-nowrap ${
                  activeTab === "transactions"
                    ? "border-emerald-500 text-emerald-400"
                    : "border-transparent text-slate-400 hover:text-slate-200"
                }`}
              >
                <History className="w-4 h-4" />
                <span>Riwayat Transaksi ({recentTransactions.length})</span>
              </button>

              <button
                onClick={() => setActiveTab("cash")}
                className={`inline-flex items-center gap-2 py-3 px-4 text-xs font-bold border-b-2 transition-all whitespace-nowrap ${
                  activeTab === "cash"
                    ? "border-emerald-500 text-emerald-400"
                    : "border-transparent text-slate-400 hover:text-slate-200"
                }`}
              >
                <Wallet className="w-4 h-4" />
                <span>Mutasi Kas RDN ({recentCash.length})</span>
              </button>

              <button
                onClick={() => setActiveTab("dividends")}
                className={`inline-flex items-center gap-2 py-3 px-4 text-xs font-bold border-b-2 transition-all whitespace-nowrap ${
                  activeTab === "dividends"
                    ? "border-emerald-500 text-emerald-400"
                    : "border-transparent text-slate-400 hover:text-slate-200"
                }`}
              >
                <DollarSign className="w-4 h-4" />
                <span>Dividen Masuk ({recentDividends.length})</span>
              </button>
            </div>
          </div>

          {/* Active Tab Content */}
          <div className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden shadow-sm">
            {activeTab === "holdings" && (
              <HoldingsTable
                holdings={portfolio.holdings}
                onTradeStock={handleTradeStock}
                onAnalyzeStock={handleOpenAnalysis}
              />
            )}

            {activeTab === "transactions" && (
              <TransactionsList transactions={recentTransactions} />
            )}

            {activeTab === "cash" && <CashList cashItems={recentCash} />}

            {activeTab === "dividends" && <DividendList dividends={recentDividends} />}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-950 py-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p>SahamTracker IDX • Platform Pencatatan Investasi Saham Pribadi</p>
          <p className="text-[11px] text-slate-600">
            Data harga pasar diintegrasikan dari Yahoo Finance (IDX .JK ticker)
          </p>
        </div>
      </footer>

      {/* Modals */}
      <TransactionModal
        isOpen={isTradeModalOpen}
        onClose={() => setIsTradeModalOpen(false)}
        initialTicker={tradeInitialTicker}
        initialType={tradeInitialType}
      />

      <CashModal
        isOpen={isCashModalOpen}
        onClose={() => setIsCashModalOpen(false)}
      />

      <DividendModal
        isOpen={isDividendModalOpen}
        onClose={() => setIsDividendModalOpen(false)}
        holdings={portfolio.holdings}
      />

      <CalculatorModal
        isOpen={isCalcModalOpen}
        onClose={() => setIsCalcModalOpen(false)}
        holdings={portfolio.holdings}
      />

      <TelegramModal
        isOpen={isTelegramModalOpen}
        onClose={() => setIsTelegramModalOpen(false)}
      />

      <StockAnalysisModal
        isOpen={isAnalysisModalOpen}
        onClose={() => setIsAnalysisModalOpen(false)}
        initialTicker={analysisTicker}
        holdings={portfolio.holdings}
      />
    </div>
  );
}

