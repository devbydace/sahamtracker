"use client";

import React from "react";
import { TrendingUp, TrendingDown, Layers, ArrowUpRight, ArrowDownRight, Plus, Minus, BarChart2 } from "lucide-react";
import { formatRupiah, formatPercent, formatNumber } from "@/lib/format";
import { StockHolding } from "@/lib/portfolio";

interface HoldingsTableProps {
  holdings: StockHolding[];
  onTradeStock: (ticker: string, defaultType: "BUY" | "SELL") => void;
  onAnalyzeStock?: (ticker: string) => void;
}

export function HoldingsTable({ holdings, onTradeStock, onAnalyzeStock }: HoldingsTableProps) {
  if (holdings.length === 0) {
    return (
      <div className="p-10 sm:p-14 text-center rounded-2xl bg-slate-900/40 border border-slate-800 border-dashed">
        <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mx-auto mb-4 border border-emerald-500/20">
          <Layers className="w-7 h-7" />
        </div>
        <h4 className="text-base font-bold text-white">Portofolio Saham Masih Kosong</h4>
        <p className="text-xs text-slate-400 mt-1.5 max-w-md mx-auto leading-relaxed">
          Database Anda siap digunakan untuk data investasi riil. Catat saham pertama Anda (misal BBCA, BBRI, dsb) untuk mulai melacak performa portofolio secara otomatis.
        </p>
        <div className="mt-5 flex items-center justify-center gap-3">
          <button
            onClick={() => onTradeStock("", "BUY")}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/20 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>+ Catat Pembelian Saham</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden shadow-sm">
      <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-white tracking-tight">Kepemilikan Saham (Holdings)</h3>
          <p className="text-xs text-slate-400 mt-0.5">Daftar portofolio aktif dihitung dengan metode Average Cost</p>
        </div>
        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
          {holdings.length} Saham
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-950/60 text-slate-400 border-b border-slate-800 uppercase tracking-wider font-semibold">
            <tr>
              <th className="py-3 px-4">Emiten</th>
              <th className="py-3 px-4 text-right">Lot & Lembar</th>
              <th className="py-3 px-4 text-right">Harga Beli Rata-rata</th>
              <th className="py-3 px-4 text-right">Harga Pasar</th>
              <th className="py-3 px-4 text-right">Nilai Pasar</th>
              <th className="py-3 px-4 text-right">Floating PnL</th>
              <th className="py-3 px-4 text-right">Alokasi</th>
              <th className="py-3 px-4 text-center">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {holdings.map((stock) => {
              const isProfit = stock.unrealizedPnL >= 0;
              const isDailyProfit = stock.changePercent >= 0;

              return (
                <tr key={stock.ticker} className="hover:bg-slate-800/40 transition-colors">
                  {/* Ticker & Name */}
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center text-xs">
                        {stock.ticker.slice(0, 2)}
                      </div>
                      <div>
                        <div className="font-bold text-white text-sm flex items-center gap-1.5">
                          {stock.ticker}
                          <span className="text-[10px] font-medium px-1.5 py-0.2 rounded bg-slate-800 text-slate-400">
                            {stock.sector}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-400 truncate max-w-[180px]">
                          {stock.name}
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Lots & Shares */}
                  <td className="py-3.5 px-4 text-right">
                    <div className="font-semibold text-white">{formatNumber(stock.currentLots)} lot</div>
                    <div className="text-[11px] text-slate-400">{formatNumber(stock.currentShares)} lembar</div>
                  </td>

                  {/* Avg Price */}
                  <td className="py-3.5 px-4 text-right">
                    <div className="font-semibold text-slate-200">{formatRupiah(stock.avgPrice)}</div>
                    <div className="text-[11px] text-slate-400">Modal: {formatRupiah(stock.costBasis, true)}</div>
                  </td>

                  {/* Current Market Price */}
                  <td className="py-3.5 px-4 text-right">
                    <div className="font-semibold text-white">{formatRupiah(stock.currentPrice)}</div>
                    <div
                      className={`text-[11px] font-medium inline-flex items-center gap-0.5 ${
                        isDailyProfit ? "text-emerald-400" : "text-rose-400"
                      }`}
                    >
                      {isDailyProfit ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                      {formatPercent(stock.changePercent)}
                    </div>
                  </td>

                  {/* Market Value */}
                  <td className="py-3.5 px-4 text-right">
                    <div className="font-bold text-white text-sm">{formatRupiah(stock.marketValue)}</div>
                    {stock.totalDividends > 0 && (
                      <div className="text-[10px] text-amber-400">
                        Dividen: {formatRupiah(stock.totalDividends, true)} ({stock.yieldOnCost.toFixed(1)}% YoC)
                      </div>
                    )}
                  </td>

                  {/* Unrealized PnL */}
                  <td className="py-3.5 px-4 text-right">
                    <div
                      className={`font-bold ${isProfit ? "text-emerald-400" : "text-rose-400"}`}
                    >
                      {formatRupiah(stock.unrealizedPnL)}
                    </div>
                    <span
                      className={`inline-block text-[10px] font-bold px-1.5 py-0.5 rounded ${
                        isProfit
                          ? "bg-emerald-500/10 text-emerald-400"
                          : "bg-rose-500/10 text-rose-400"
                      }`}
                    >
                      {formatPercent(stock.unrealizedPnLPercent)}
                    </span>
                  </td>

                  {/* Allocation % */}
                  <td className="py-3.5 px-4 text-right">
                    <div className="font-semibold text-slate-200">{stock.allocationPercent.toFixed(1)}%</div>
                    <div className="w-16 h-1.5 rounded-full bg-slate-800 ml-auto mt-1 overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 rounded-full"
                        style={{ width: `${Math.min(100, stock.allocationPercent)}%` }}
                      />
                    </div>
                  </td>

                  {/* Quick Action (Buy / Sell / Analisa) */}
                  <td className="py-3.5 px-4 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      {onAnalyzeStock && (
                        <button
                          onClick={() => onAnalyzeStock(stock.ticker)}
                          className="p-1.5 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/20 transition-colors"
                          title={`Analisa Fundamental & Teknikal ${stock.ticker}`}
                        >
                          <BarChart2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button
                        onClick={() => onTradeStock(stock.ticker, "BUY")}
                        className="p-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 transition-colors"
                        title="Beli Tambah (Average Down / Up)"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => onTradeStock(stock.ticker, "SELL")}
                        className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 transition-colors"
                        title="Jual Sebagian / Seluruhnya"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

