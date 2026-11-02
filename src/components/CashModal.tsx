"use client";

import React, { useState, useTransition } from "react";
import { X, Wallet, AlertCircle } from "lucide-react";
import { formatRupiah } from "@/lib/format";
import { addCashTransaction } from "@/app/actions";

interface CashModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CashModal({ isOpen, onClose }: CashModalProps) {
  const [type, setType] = useState<"DEPOSIT" | "WITHDRAW" | "INTEREST" | "TAX_FEE">("DEPOSIT");
  const [amount, setAmount] = useState<string>("");
  const [broker, setBroker] = useState("Stockbit");
  const [date, setDate] = useState<string>(() => new Date().toISOString().split("T")[0]);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  if (!isOpen) return null;

  const numAmount = Number(amount) || 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (numAmount <= 0) {
      setError("Nominal harus lebih besar dari Rp 0.");
      return;
    }

    startTransition(async () => {
      const res = await addCashTransaction({
        type,
        amount: numAmount,
        broker,
        date,
        notes,
      });

      if (res.success) {
        onClose();
        setAmount("");
        setNotes("");
      } else {
        setError(res.error || "Gagal menyimpan mutasi kas RDN.");
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center">
              <Wallet className="w-4 h-4" />
            </div>
            <h3 className="text-base font-bold text-white">Mutasi Kas RDN</h3>
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

          {/* Type Selector */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Jenis Mutasi Kas
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setType("DEPOSIT")}
                className={`py-2 px-3 text-xs font-semibold rounded-xl border text-center transition-all ${
                  type === "DEPOSIT"
                    ? "bg-emerald-500/10 border-emerald-500 text-emerald-400"
                    : "border-slate-800 bg-slate-950 text-slate-400 hover:text-white"
                }`}
              >
                + Setor Dana (Top Up)
              </button>
              <button
                type="button"
                onClick={() => setType("WITHDRAW")}
                className={`py-2 px-3 text-xs font-semibold rounded-xl border text-center transition-all ${
                  type === "WITHDRAW"
                    ? "bg-rose-500/10 border-rose-500 text-rose-400"
                    : "border-slate-800 bg-slate-950 text-slate-400 hover:text-white"
                }`}
              >
                - Tarik Dana (Withdraw)
              </button>
              <button
                type="button"
                onClick={() => setType("INTEREST")}
                className={`py-2 px-3 text-xs font-semibold rounded-xl border text-center transition-all ${
                  type === "INTEREST"
                    ? "bg-blue-500/10 border-blue-500 text-blue-400"
                    : "border-slate-800 bg-slate-950 text-slate-400 hover:text-white"
                }`}
              >
                + Bunga Saldo RDN
              </button>
              <button
                type="button"
                onClick={() => setType("TAX_FEE")}
                className={`py-2 px-3 text-xs font-semibold rounded-xl border text-center transition-all ${
                  type === "TAX_FEE"
                    ? "bg-amber-500/10 border-amber-500 text-amber-400"
                    : "border-slate-800 bg-slate-950 text-slate-400 hover:text-white"
                }`}
              >
                - Biaya Admin / Pajak
              </button>
            </div>
          </div>

          {/* Nominal */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Nominal (Rp)
            </label>
            <input
              type="number"
              min="1000"
              step="1000"
              placeholder="e.g. 1000000"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:outline-none focus:border-blue-500"
              required
            />
            {numAmount > 0 && (
              <span className="text-xs text-emerald-400 mt-1 block font-medium">
                {formatRupiah(numAmount)}
              </span>
            )}
          </div>

          {/* Broker */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Rekening Dana Nasabah (Sekuritas)
            </label>
            <select
              value={broker}
              onChange={(e) => setBroker(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:outline-none focus:border-blue-500"
            >
              <option value="Stockbit">Stockbit (Bank RDN BCA / Jago)</option>
              <option value="Ajaib">Ajaib (Bank RDN Permata / BCA)</option>
              <option value="IPOT">IPOT (Indo Premier)</option>
              <option value="Mirae">Mirae Asset</option>
              <option value="Mandiri">Mandiri Sekuritas</option>
              <option value="Lainnya">Lainnya</option>
            </select>
          </div>

          {/* Date & Notes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Tanggal Mutasi
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:outline-none focus:border-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Catatan (Opsional)
              </label>
              <input
                type="text"
                placeholder="e.g. Setoran Gaji Bulanan"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isPending}
              className="w-full py-3 rounded-xl font-bold text-sm bg-blue-600 hover:bg-blue-500 text-white transition-all shadow-lg shadow-blue-600/20"
            >
              {isPending ? "Menyimpan Mutasi..." : "Simpan Mutasi Kas"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

