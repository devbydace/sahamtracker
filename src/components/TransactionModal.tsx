"use client";

import React, { useState, useEffect, useTransition } from "react";
import { X, ArrowRight, Calculator, Plus, AlertCircle } from "lucide-react";
import { formatRupiah, calculateBrokerFee, formatNumber } from "@/lib/format";
import { POPULAR_IDX_STOCKS } from "@/lib/stock-constants";
import { addStockTransaction } from "@/app/actions";

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTicker?: string;
  initialType?: "BUY" | "SELL";
}

export function TransactionModal({
  isOpen,
  onClose,
  initialTicker = "",
  initialType = "BUY",
}: TransactionModalProps) {
  const [type, setType] = useState<"BUY" | "SELL">(initialType);
  const [ticker, setTicker] = useState(initialTicker);
  const [lots, setLots] = useState<number | string>(1);
  const [pricePerShare, setPricePerShare] = useState<number | string>("");
  const [broker, setBroker] = useState("Stockbit");
  const [feeRate, setFeeRate] = useState<number>(0.15); // %
  const [customFee, setCustomFee] = useState<string>("");
  const [date, setDate] = useState<string>(() => new Date().toISOString().split("T")[0]);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (initialTicker) setTicker(initialTicker);
    if (initialType) {
      setType(initialType);
      setFeeRate(initialType === "BUY" ? 0.15 : 0.25);
    }
  }, [initialTicker, initialType, isOpen]);

  if (!isOpen) return null;

  const handleTypeChange = (newType: "BUY" | "SELL") => {
    setType(newType);
    setFeeRate(newType === "BUY" ? 0.15 : 0.25);
  };

  const numLots = Number(lots) || 0;
  const numPrice = Number(pricePerShare) || 0;
  const shares = numLots * 100;
  const grossAmount = shares * numPrice;

  const calculatedFee =
    customFee !== ""
      ? Number(customFee) || 0
      : calculateBrokerFee(grossAmount, type, feeRate);

  const netTotal = type === "BUY" ? grossAmount + calculatedFee : grossAmount - calculatedFee;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!ticker.trim()) {
      setError("Silakan masukkan kode saham (contoh: BBCA, BBRI).");
      return;
    }
    if (numLots <= 0) {
      setError("Jumlah lot harus lebih besar dari 0.");
      return;
    }
    if (numPrice <= 0) {
      setError("Harga per lembar saham harus lebih besar dari 0.");
      return;
    }

    startTransition(async () => {
      const res = await addStockTransaction({
        ticker: ticker.trim().toUpperCase(),
        type,
        lots: numLots,
        pricePerShare: numPrice,
        date,
        broker,
        feePercent: feeRate,
        customFee: customFee !== "" ? Number(customFee) : undefined,
        notes,
      });

      if (res.success) {
        onClose();
      } else {
        setError(res.error || "Gagal menyimpan transaksi.");
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl my-8">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-white">Catat Transaksi Saham</h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Type Selector (BUY / SELL) */}
          <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-slate-950 border border-slate-800">
            <button
              type="button"
              onClick={() => handleTypeChange("BUY")}
              className={`py-2 text-xs font-bold rounded-lg transition-all ${
                type === "BUY"
                  ? "bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              BELI (Buy)
            </button>
            <button
              type="button"
              onClick={() => handleTypeChange("SELL")}
              className={`py-2 text-xs font-bold rounded-lg transition-all ${
                type === "SELL"
                  ? "bg-rose-500 text-white shadow-md shadow-rose-500/20"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              JUAL (Sell)
            </button>
          </div>

          {/* Ticker & Popular chips */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Kode Saham (Ticker IDX)
            </label>
            <input
              type="text"
              placeholder="e.g. BBCA, BBRI, ASII"
              value={ticker}
              onChange={(e) => setTicker(e.target.value.toUpperCase())}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono text-sm tracking-wide focus:outline-none focus:border-emerald-500"
              required
            />
            <div className="flex flex-wrap gap-1.5 mt-2">
              {POPULAR_IDX_STOCKS.slice(0, 6).map((s) => (
                <button
                  key={s.ticker}
                  type="button"
                  onClick={() => setTicker(s.ticker)}
                  className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-slate-800/80 hover:bg-slate-700 text-slate-300 transition-colors"
                >
                  {s.ticker}
                </button>
              ))}
            </div>
          </div>

          {/* Lots & Price per Share */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Jumlah Lot (1 lot = 100 lbr)
              </label>
              <input
                type="number"
                min="1"
                step="1"
                value={lots}
                onChange={(e) => setLots(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:outline-none focus:border-emerald-500"
                required
              />
              <span className="text-[11px] text-slate-500 mt-1 block">
                = {formatNumber(shares)} lembar
              </span>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Harga per Lembar (Rp)
              </label>
              <input
                type="number"
                min="1"
                step="1"
                placeholder="e.g. 5000"
                value={pricePerShare}
                onChange={(e) => setPricePerShare(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:outline-none focus:border-emerald-500"
                required
              />
              <span className="text-[11px] text-slate-500 mt-1 block">
                Nilai kotor: {formatRupiah(grossAmount)}
              </span>
            </div>
          </div>

          {/* Fee & Broker */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Fee Broker ({feeRate}%)
              </label>
              <input
                type="number"
                placeholder={`Est: Rp ${calculatedFee}`}
                value={customFee}
                onChange={(e) => setCustomFee(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:outline-none focus:border-emerald-500"
              />
              <span className="text-[11px] text-slate-500 mt-1 block">
                Default: {formatRupiah(calculateBrokerFee(grossAmount, type, feeRate))}
              </span>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Sekuritas / Broker
              </label>
              <select
                value={broker}
                onChange={(e) => setBroker(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:outline-none focus:border-emerald-500"
              >
                <option value="Stockbit">Stockbit (Bibit)</option>
                <option value="Ajaib">Ajaib Sekuritas</option>
                <option value="IPOT">IPOT (Indo Premier)</option>
                <option value="Mirae">Mirae Asset</option>
                <option value="Mandiri">Mandiri Sekuritas (MOST)</option>
                <option value="BCA">BCA Sekuritas (BEST)</option>
                <option value="Lainnya">Lainnya</option>
              </select>
            </div>
          </div>

          {/* Date & Notes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Tanggal Transaksi
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:outline-none focus:border-emerald-500"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Catatan (Opsional)
              </label>
              <input
                type="text"
                placeholder="e.g. DCA Gaji, Averaging down"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Total Calculation Card */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
            <div>
              <span className="text-xs text-slate-400 block">
                {type === "BUY" ? "Total Dana Dikeluarkan" : "Total Dana Diterima (Net)"}
              </span>
              <span className="text-[11px] text-slate-500">
                Termasuk fee sekuritas {formatRupiah(calculatedFee)}
              </span>
            </div>
            <div className="text-right">
              <span className="text-lg font-bold text-emerald-400 font-mono">
                {formatRupiah(netTotal)}
              </span>
            </div>
          </div>

          {/* Submit Button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isPending}
              className={`w-full py-3 rounded-xl font-bold text-sm transition-all shadow-lg ${
                type === "BUY"
                  ? "bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-500/20"
                  : "bg-rose-500 hover:bg-rose-400 text-white shadow-rose-500/20"
              }`}
            >
              {isPending
                ? "Menyimpan Transaksi..."
                : type === "BUY"
                ? `Simpan Pembelian ${ticker || ""}`
                : `Simpan Penjualan ${ticker || ""}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
