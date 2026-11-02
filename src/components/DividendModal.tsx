"use client";

import React, { useState, useTransition } from "react";
import { X, DollarSign, AlertCircle, Info } from "lucide-react";
import { formatRupiah, formatNumber } from "@/lib/format";
import { addDividendRecord } from "@/app/actions";
import { StockHolding } from "@/lib/portfolio";

interface DividendModalProps {
  isOpen: boolean;
  onClose: () => void;
  holdings: StockHolding[];
}

export function DividendModal({ isOpen, onClose, holdings }: DividendModalProps) {
  const [ticker, setTicker] = useState("");
  const [dps, setDps] = useState<string>("");
  const [totalShares, setTotalShares] = useState<string>("");
  const [taxExempt, setTaxExempt] = useState(false);
  const [paymentDate, setPaymentDate] = useState<string>(
    () => new Date().toISOString().split("T")[0]
  );
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  if (!isOpen) return null;

  const handleStockSelect = (selectedTicker: string) => {
    setTicker(selectedTicker);
    const found = holdings.find((h) => h.ticker === selectedTicker);
    if (found) {
      setTotalShares(found.currentShares.toString());
    }
  };

  const numDps = Number(dps) || 0;
  const numShares = Number(totalShares) || 0;
  const gross = numDps * numShares;
  const taxRate = taxExempt ? 0 : 0.1;
  const taxAmount = gross * taxRate;
  const net = gross - taxAmount;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!ticker.trim()) {
      setError("Silakan pilih kode saham.");
      return;
    }
    if (numDps <= 0) {
      setError("DPS (Dividen per lembar) harus lebih besar dari 0.");
      return;
    }
    if (numShares <= 0) {
      setError("Jumlah lembar saham harus lebih besar dari 0.");
      return;
    }

    startTransition(async () => {
      const res = await addDividendRecord({
        ticker: ticker.trim().toUpperCase(),
        dps: numDps,
        totalShares: numShares,
        taxExempt,
        paymentDate,
        notes,
      });

      if (res.success) {
        onClose();
        setTicker("");
        setDps("");
        setTotalShares("");
        setNotes("");
      } else {
        setError(res.error || "Gagal menyimpan catatan dividen.");
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
            <h3 className="text-base font-bold text-white">Catat Dividen Saham</h3>
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

          {/* Quick select from active holdings */}
          {holdings.length > 0 && (
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">
                Pilih Dari Saham Yang Dimiliki:
              </label>
              <div className="flex flex-wrap gap-1.5">
                {holdings.map((h) => (
                  <button
                    key={h.ticker}
                    type="button"
                    onClick={() => handleStockSelect(h.ticker)}
                    className={`text-xs px-2.5 py-1 rounded-lg border font-mono transition-colors ${
                      ticker === h.ticker
                        ? "bg-amber-500/20 border-amber-500 text-amber-300"
                        : "bg-slate-950 border-slate-800 text-slate-300 hover:bg-slate-800"
                    }`}
                  >
                    {h.ticker} ({h.currentLots} lot)
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Ticker input */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Kode Saham (Ticker)
            </label>
            <input
              type="text"
              placeholder="e.g. BBCA, BBRI"
              value={ticker}
              onChange={(e) => setTicker(e.target.value.toUpperCase())}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono text-sm focus:outline-none focus:border-amber-500"
              required
            />
          </div>

          {/* DPS & Shares */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                DPS (Rp / lembar)
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                placeholder="e.g. 175"
                value={dps}
                onChange={(e) => setDps(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:outline-none focus:border-amber-500"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Jumlah Lembar
              </label>
              <input
                type="number"
                step="1"
                min="1"
                placeholder="e.g. 2000"
                value={totalShares}
                onChange={(e) => setTotalShares(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:outline-none focus:border-amber-500"
                required
              />
            </div>
          </div>

          {/* Tax Exemption Option */}
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={taxExempt}
                onChange={(e) => setTaxExempt(e.target.checked)}
                className="mt-0.5 rounded text-amber-500 focus:ring-0"
              />
              <div className="text-xs">
                <span className="font-semibold text-slate-200 block">
                  Bebas Pajak (0% PPh Final)
                </span>
                <span className="text-slate-400 text-[11px] block mt-0.5">
                  Sesuai PMK / UU Cipta Kerja jika dividen diinvestasikan kembali ke instrumen dalam negeri.
                </span>
              </div>
            </label>
          </div>

          {/* Date & Notes */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Tanggal Masuk
              </label>
              <input
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:outline-none focus:border-amber-500"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Keterangan
              </label>
              <input
                type="text"
                placeholder="e.g. Dividen Final 2025"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          {/* Net Calculation Summary */}
          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1 text-xs">
            <div className="flex justify-between text-slate-400">
              <span>Dividen Kotor:</span>
              <span>{formatRupiah(gross)}</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Pajak ({taxRate * 100}%):</span>
              <span className="text-rose-400">-{formatRupiah(taxAmount)}</span>
            </div>
            <div className="flex justify-between font-bold text-emerald-400 text-sm pt-1 border-t border-slate-800">
              <span>Dividen Bersih Masuk RDN:</span>
              <span>{formatRupiah(net)}</span>
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isPending}
              className="w-full py-3 rounded-xl font-bold text-sm bg-amber-500 hover:bg-amber-400 text-slate-950 transition-all shadow-lg shadow-amber-500/20"
            >
              {isPending ? "Menyimpan Catatan..." : "Simpan Dividen"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

