"use client";

import React, { useTransition } from "react";
import { Trash2, ArrowUpRight, ArrowDownRight, Wallet, Percent, ShieldAlert } from "lucide-react";
import { formatRupiah, formatDate } from "@/lib/format";
import { deleteCashTransaction } from "@/app/actions";

interface CashItem {
  id: string;
  type: string;
  amount: number;
  date: Date | string;
  notes?: string | null;
  broker?: string | null;
}

interface CashListProps {
  cashItems: CashItem[];
}

export function CashList({ cashItems }: CashListProps) {
  const [isPending, startTransition] = useTransition();

  const handleDelete = (id: string) => {
    if (confirm("Hapus catatan mutasi kas RDN ini?")) {
      startTransition(async () => {
        await deleteCashTransaction(id);
      });
    }
  };

  if (cashItems.length === 0) {
    return (
      <div className="p-8 text-center text-slate-500 text-xs">
        Belum ada catatan mutasi kas RDN.
      </div>
    );
  }

  const getTypeBadge = (type: string) => {
    switch (type) {
      case "DEPOSIT":
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <ArrowDownRight className="w-3 h-3" /> SETOR DANA (Top Up)
          </span>
        );
      case "WITHDRAW":
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <ArrowUpRight className="w-3 h-3" /> TARIK DANA
          </span>
        );
      case "INTEREST":
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
            <Percent className="w-3 h-3" /> BUNGA RDN
          </span>
        );
      case "TAX_FEE":
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <ShieldAlert className="w-3 h-3" /> BIAYA / PAJAK
          </span>
        );
      default:
        return (
          <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
            {type}
          </span>
        );
    }
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-xs">
        <thead className="bg-slate-950/60 text-slate-400 border-b border-slate-800 uppercase tracking-wider font-semibold">
          <tr>
            <th className="py-3 px-4">Tanggal</th>
            <th className="py-3 px-4">Jenis Mutasi</th>
            <th className="py-3 px-4 text-right">Nominal</th>
            <th className="py-3 px-4">Rekening RDN</th>
            <th className="py-3 px-4">Keterangan</th>
            <th className="py-3 px-4 text-center">Aksi</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800/60">
          {cashItems.map((item) => {
            const isPlus = item.type === "DEPOSIT" || item.type === "INTEREST";
            return (
              <tr key={item.id} className="hover:bg-slate-800/40 transition-colors">
                <td className="py-3 px-4 text-slate-400 whitespace-nowrap">
                  {formatDate(item.date)}
                </td>
                <td className="py-3 px-4 whitespace-nowrap">{getTypeBadge(item.type)}</td>
                <td className="py-3 px-4 text-right">
                  <span
                    className={`font-bold font-mono text-sm ${
                      isPlus ? "text-emerald-400" : "text-rose-400"
                    }`}
                  >
                    {isPlus ? "+" : "-"}
                    {formatRupiah(item.amount)}
                  </span>
                </td>
                <td className="py-3 px-4 text-slate-300">
                  <span className="text-[11px] px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                    {item.broker || "Default"}
                  </span>
                </td>
                <td className="py-3 px-4 text-slate-400">{item.notes || "-"}</td>
                <td className="py-3 px-4 text-center">
                  <button
                    onClick={() => handleDelete(item.id)}
                    disabled={isPending}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                    title="Hapus Catatan"
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

