"use client";

import React, { useTransition } from "react";
import { Trash2, ArrowUpRight, ArrowDownRight, Clock } from "lucide-react";
import { formatRupiah, formatDate, formatNumber } from "@/lib/format";
import { deleteStockTransaction } from "@/app/actions";

interface TransactionItem {
  id: string;
  stockTicker: string;
  type: string;
  date: Date | string;
  lots: number;
  shares: number;
  pricePerShare: number;
  fee: number;
  totalAmount: number;
  notes?: string | null;
  broker?: string | null;
  stock?: {
    name: string;
  };
}

interface TransactionsListProps {
  transactions: TransactionItem[];
}

export function TransactionsList({ transactions }: TransactionsListProps) {
  const [isPending, startTransition] = useTransition();

  const handleDelete = (id: string, ticker: string) => {
    if (confirm(`Hapus riwayat transaksi saham ${ticker}?`)) {
      startTransition(async () => {
        await deleteStockTransaction(id);
      });
    }
  };

  if (transactions.length === 0) {
    return (
      <div className="p-8 text-center text-slate-500 text-xs">
        Belum ada riwayat transaksi saham.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-xs">
        <thead className="bg-slate-950/60 text-slate-400 border-b border-slate-800 uppercase tracking-wider font-semibold">
          <tr>
            <th className="py-3 px-4">Tanggal</th>
            <th className="py-3 px-4">Tipe</th>
            <th className="py-3 px-4">Saham</th>
            <th className="py-3 px-4 text-right">Lot & Lembar</th>
            <th className="py-3 px-4 text-right">Harga</th>
            <th className="py-3 px-4 text-right">Fee Broker</th>
            <th className="py-3 px-4 text-right">Total Transaksi</th>
            <th className="py-3 px-4">Sekuritas</th>
            <th className="py-3 px-4 text-center">Aksi</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800/60">
          {transactions.map((tx) => {
            const isBuy = tx.type === "BUY";
            return (
              <tr key={tx.id} className="hover:bg-slate-800/40 transition-colors">
                <td className="py-3 px-4 text-slate-400 whitespace-nowrap">
                  {formatDate(tx.date)}
                </td>
                <td className="py-3 px-4 whitespace-nowrap">
                  <span
                    className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full ${
                      isBuy
                        ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                        : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                    }`}
                  >
                    {isBuy ? <ArrowDownRight className="w-3 h-3" /> : <ArrowUpRight className="w-3 h-3" />}
                    {isBuy ? "BELI" : "JUAL"}
                  </span>
                </td>
                <td className="py-3 px-4">
                  <div className="font-bold text-white font-mono">{tx.stockTicker}</div>
                  {tx.notes && <div className="text-[11px] text-slate-400">{tx.notes}</div>}
                </td>
                <td className="py-3 px-4 text-right">
                  <div className="font-semibold text-slate-200">{formatNumber(tx.lots)} lot</div>
                  <div className="text-[11px] text-slate-500">{formatNumber(tx.shares)} lbr</div>
                </td>
                <td className="py-3 px-4 text-right font-medium text-slate-200">
                  {formatRupiah(tx.pricePerShare)}
                </td>
                <td className="py-3 px-4 text-right text-slate-400">
                  {formatRupiah(tx.fee)}
                </td>
                <td className="py-3 px-4 text-right">
                  <div
                    className={`font-bold font-mono ${
                      isBuy ? "text-slate-200" : "text-emerald-400"
                    }`}
                  >
                    {formatRupiah(tx.totalAmount)}
                  </div>
                </td>
                <td className="py-3 px-4 text-slate-400">
                  <span className="text-[11px] px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                    {tx.broker || "Default"}
                  </span>
                </td>
                <td className="py-3 px-4 text-center">
                  <button
                    onClick={() => handleDelete(tx.id, tx.stockTicker)}
                    disabled={isPending}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                    title="Hapus Transaksi"
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
  );
}

