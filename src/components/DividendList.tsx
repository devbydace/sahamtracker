"use client";

import React, { useTransition } from "react";
import { Trash2, DollarSign, ShieldCheck } from "lucide-react";
import { formatRupiah, formatDate, formatNumber } from "@/lib/format";
import { deleteDividendRecord } from "@/app/actions";

interface DividendItem {
  id: string;
  stockTicker: string;
  paymentDate: Date | string;
  dps: number;
  totalShares: number;
  grossAmount: number;
  taxRate: number;
  taxAmount: number;
  netAmount: number;
  notes?: string | null;
}

interface DividendListProps {
  dividends: DividendItem[];
}

export function DividendList({ dividends }: DividendListProps) {
  const [isPending, startTransition] = useTransition();

  const handleDelete = (id: string, ticker: string) => {
    if (confirm(`Hapus catatan dividen saham ${ticker}?`)) {
      startTransition(async () => {
        await deleteDividendRecord(id);
      });
    }
  };

  if (dividends.length === 0) {
    return (
      <div className="p-8 text-center text-slate-500 text-xs">
        Belum ada catatan dividen yang diterima.
      </div>
    );
  }

  const totalDividendsReceived = dividends.reduce((acc, d) => acc + d.netAmount, 0);

  return (
    <div>
      <div className="p-4 bg-slate-950/40 border-b border-slate-800 flex items-center justify-between">
        <span className="text-xs text-slate-400">Total Dividen Bersih Diterima:</span>
        <span className="text-sm font-bold text-amber-400 font-mono">
          {formatRupiah(totalDividendsReceived)}
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-950/60 text-slate-400 border-b border-slate-800 uppercase tracking-wider font-semibold">
            <tr>
              <th className="py-3 px-4">Tanggal Masuk</th>
              <th className="py-3 px-4">Saham</th>
              <th className="py-3 px-4 text-right">DPS (Rp/lbr)</th>
              <th className="py-3 px-4 text-right">Lembar Berhak</th>
              <th className="py-3 px-4 text-right">Dividen Kotor</th>
              <th className="py-3 px-4 text-right">Pajak (PPh)</th>
              <th className="py-3 px-4 text-right">Dividen Bersih (Net)</th>
              <th className="py-3 px-4">Keterangan</th>
              <th className="py-3 px-4 text-center">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {dividends.map((div) => {
              const isExempt = div.taxRate === 0;
              return (
                <tr key={div.id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="py-3 px-4 text-slate-400 whitespace-nowrap">
                    {formatDate(div.paymentDate)}
                  </td>
                  <td className="py-3 px-4">
                    <span className="font-bold text-white font-mono">{div.stockTicker}</span>
                  </td>
                  <td className="py-3 px-4 text-right font-medium text-slate-200">
                    {formatRupiah(div.dps)}
                  </td>
                  <td className="py-3 px-4 text-right text-slate-300">
                    {formatNumber(div.totalShares)} lbr
                  </td>
                  <td className="py-3 px-4 text-right text-slate-400">
                    {formatRupiah(div.grossAmount)}
                  </td>
                  <td className="py-3 px-4 text-right">
                    {isExempt ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400">
                        <ShieldCheck className="w-3 h-3" /> Bebas 0%
                      </span>
                    ) : (
                      <span className="text-rose-400 font-medium">
                        -{formatRupiah(div.taxAmount)}
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <span className="font-bold font-mono text-emerald-400 text-sm">
                      +{formatRupiah(div.netAmount)}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-slate-400">{div.notes || "-"}</td>
                  <td className="py-3 px-4 text-center">
                    <button
                      onClick={() => handleDelete(div.id, div.stockTicker)}
                      disabled={isPending}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                      title="Hapus Dividen"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
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

