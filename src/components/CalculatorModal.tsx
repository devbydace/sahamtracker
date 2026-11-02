"use client";

import React, { useState } from "react";
import { X, Calculator, ArrowRight, Target, TrendingUp, HelpCircle } from "lucide-react";
import { formatRupiah, formatNumber } from "@/lib/format";
import { StockHolding } from "@/lib/portfolio";

interface CalculatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  holdings: StockHolding[];
}

export function CalculatorModal({ isOpen, onClose, holdings }: CalculatorModalProps) {
  const [tab, setTab] = useState<"avg_down" | "take_profit">("avg_down");

  // Average down state
  const [existingLots, setExistingLots] = useState<string>("10");
  const [existingAvgPrice, setExistingAvgPrice] = useState<string>("5000");
  const [newBuyPrice, setNewBuyPrice] = useState<string>("4500");
  const [newLotsToBuy, setNewLotsToBuy] = useState<string>("10");

  // Take profit state
  const [tpShares, setTpShares] = useState<string>("1000");
  const [tpAvgPrice, setTpAvgPrice] = useState<string>("5000");
  const [targetSellPrice, setTargetSellPrice] = useState<string>("6000");

  if (!isOpen) return null;

  const handleSelectHolding = (h: StockHolding) => {
    setExistingLots(h.currentLots.toString());
    setExistingAvgPrice(h.avgPrice.toString());
    setNewBuyPrice(h.currentPrice.toString());

    setTpShares(h.currentShares.toString());
    setTpAvgPrice(h.avgPrice.toString());
    setTargetSellPrice(Math.round(h.avgPrice * 1.15).toString()); // default 15% TP
  };

  // Calculations for Average Down
  const curLots = Number(existingLots) || 0;
  const curAvg = Number(existingAvgPrice) || 0;
  const buyPrice = Number(newBuyPrice) || 0;
  const addLots = Number(newLotsToBuy) || 0;

  const curShares = curLots * 100;
  const addShares = addLots * 100;
  const totalShares = curShares + addShares;
  const totalLots = curLots + addLots;

  const existingCapital = curShares * curAvg;
  const newCapitalRequired = addShares * buyPrice;
  const totalCapital = existingCapital + newCapitalRequired;

  const finalAvgPrice = totalShares > 0 ? Math.round(totalCapital / totalShares) : 0;
  const priceReduction = curAvg > 0 ? curAvg - finalAvgPrice : 0;
  const priceReductionPercent = curAvg > 0 ? (priceReduction / curAvg) * 100 : 0;

  // Calculations for Take Profit
  const numTpShares = Number(tpShares) || 0;
  const numTpAvg = Number(tpAvgPrice) || 0;
  const numTargetSell = Number(targetSellPrice) || 0;

  const buyCost = numTpShares * numTpAvg;
  const grossSell = numTpShares * numTargetSell;
  const feeSell = Math.round(grossSell * 0.0025); // 0.25% broker fee sell
  const netSell = grossSell - feeSell;
  const netProfit = netSell - buyCost;
  const profitPercent = buyCost > 0 ? (netProfit / buyCost) * 100 : 0;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl my-8">
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
              <Calculator className="w-4 h-4" />
            </div>
            <h3 className="text-base font-bold text-white">Simulasi & Kalkulator Saham</h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switch */}
        <div className="p-4 border-b border-slate-800/80 bg-slate-950">
          <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-slate-900 border border-slate-800">
            <button
              onClick={() => setTab("avg_down")}
              className={`py-2 text-xs font-bold rounded-lg transition-all ${
                tab === "avg_down"
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Kalkulator Average Down
            </button>
            <button
              onClick={() => setTab("take_profit")}
              className={`py-2 text-xs font-bold rounded-lg transition-all ${
                tab === "take_profit"
                  ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/20"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Simulasi Target Profit (TP)
            </button>
          </div>

          {holdings.length > 0 && (
            <div className="mt-3">
              <span className="text-[11px] text-slate-400 block mb-1">
                Gunakan data saham dari portofolio Anda:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {holdings.map((h) => (
                  <button
                    key={h.ticker}
                    onClick={() => handleSelectHolding(h)}
                    className="text-xs px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700"
                  >
                    {h.ticker} ({h.currentLots} lot @ {formatRupiah(h.avgPrice)})
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="p-6">
          {tab === "avg_down" ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Lot Dimiliki Saat Ini
                  </label>
                  <input
                    type="number"
                    value={existingLots}
                    onChange={(e) => setExistingLots(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Harga Rata-rata Saat Ini (Rp)
                  </label>
                  <input
                    type="number"
                    value={existingAvgPrice}
                    onChange={(e) => setExistingAvgPrice(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Harga Beli Baru (Diskon)
                  </label>
                  <input
                    type="number"
                    value={newBuyPrice}
                    onChange={(e) => setNewBuyPrice(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Rencana Tambah (Lot)
                  </label>
                  <input
                    type="number"
                    value={newLotsToBuy}
                    onChange={(e) => setNewLotsToBuy(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm"
                  />
                </div>
              </div>

              {/* Result card */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2 text-xs">
                <div className="flex justify-between text-slate-400">
                  <span>Dana Yang Dibutuhkan:</span>
                  <span className="font-semibold text-white font-mono">
                    {formatRupiah(newCapitalRequired)}
                  </span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Total Lot Setelah Beli:</span>
                  <span className="font-semibold text-white">
                    {formatNumber(totalLots)} lot ({formatNumber(totalShares)} lembar)
                  </span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Penurunan Harga Rata-rata:</span>
                  <span className="font-semibold text-emerald-400">
                    -{formatRupiah(priceReduction)} ({priceReductionPercent.toFixed(1)}%)
                  </span>
                </div>
                <div className="pt-2 border-t border-slate-800 flex justify-between items-center text-sm">
                  <span className="font-bold text-slate-200">Harga Rata-rata Baru:</span>
                  <span className="font-extrabold text-indigo-400 text-base font-mono">
                    {formatRupiah(finalAvgPrice)}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Jumlah Lembar Saham
                  </label>
                  <input
                    type="number"
                    value={tpShares}
                    onChange={(e) => setTpShares(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Harga Modal Beli (Rp)
                  </label>
                  <input
                    type="number"
                    value={tpAvgPrice}
                    onChange={(e) => setTpAvgPrice(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Target Harga Jual (Take Profit)
                </label>
                <input
                  type="number"
                  value={targetSellPrice}
                  onChange={(e) => setTargetSellPrice(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm"
                />
              </div>

              {/* TP Result card */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2 text-xs">
                <div className="flex justify-between text-slate-400">
                  <span>Modal Awal Beli:</span>
                  <span>{formatRupiah(buyCost)}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Hasil Penjualan Bersih (Net):</span>
                  <span>{formatRupiah(netSell)}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Estimasi Fee Jual (0.25%):</span>
                  <span className="text-slate-500">-{formatRupiah(feeSell)}</span>
                </div>
                <div className="pt-2 border-t border-slate-800 flex justify-between items-center text-sm">
                  <span className="font-bold text-slate-200">Estimasi Cuan Bersih:</span>
                  <div className="text-right">
                    <span className="font-extrabold text-emerald-400 text-base font-mono block">
                      +{formatRupiah(netProfit)}
                    </span>
                    <span className="text-xs text-emerald-400 font-bold">
                      +{profitPercent.toFixed(2)}%
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

