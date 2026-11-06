"use client";

import React, { useState, useEffect, useTransition, useRef } from "react";
import {
  X,
  Database,
  Download,
  Upload,
  Trash2,
  Sparkles,
  CheckCircle,
  AlertCircle,
  HardDrive,
  Activity,
} from "lucide-react";
import {
  getDatabaseStatsAction,
  exportDatabaseJsonAction,
  importDatabaseJsonAction,
  seedDemoDataAction,
  resetPortfolioDataAction,
} from "@/app/actions";

interface DatabaseModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface DbStats {
  provider: string;
  fileName: string;
  sizeBytes: number;
  journalMode: string;
  counts: {
    stocks: number;
    transactions: number;
    dividends: number;
    cashTransactions: number;
    savingsGoals: number;
  };
}

function formatBytes(bytes: number): string {
  if (!bytes || bytes === 0) return "0 KB";
  return `${(bytes / 1024).toFixed(1)} KB`;
}

export function DatabaseModal({ isOpen, onClose }: DatabaseModalProps) {
  const [stats, setStats] = useState<DbStats | null>(null);
  const [statusMsg, setStatusMsg] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const [isPending, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const loadStats = () => {
    getDatabaseStatsAction().then((res) => {
      if (res.success && res.stats) {
        setStats(res.stats);
      }
    });
  };

  useEffect(() => {
    if (isOpen) {
      setStatusMsg(null);
      loadStats();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleExportBackup = () => {
    setStatusMsg(null);
    startTransition(async () => {
      const res = await exportDatabaseJsonAction();
      if (res.success && res.json) {
        const blob = new Blob([res.json], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        const dateStr = new Date().toISOString().slice(0, 10);
        a.href = url;
        a.download = `sahamtracker-sqlite-backup-${dateStr}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        setStatusMsg({
          type: "success",
          text: "Backup database SQLite (.json) berhasil diunduh ke perangkat Anda.",
        });
      } else {
        setStatusMsg({
          type: "error",
          text: res.error || "Gagal mengekspor backup database.",
        });
      }
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (!content) return;

      startTransition(async () => {
        const res = await importDatabaseJsonAction(content);
        if (res.success) {
          loadStats();
          setStatusMsg({
            type: "success",
            text: "Seluruh data portofolio berhasil dipulihkan dari file backup!",
          });
        } else {
          setStatusMsg({
            type: "error",
            text: res.error || "Gagal mengimpor file backup.",
          });
        }
      });
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const handleSeedDemo = () => {
    if (
      !confirm(
        "Isi database SQLite dengan sampel data simulasi saham IDX (BBCA, BBRI, TLKM)?"
      )
    ) {
      return;
    }
    setStatusMsg(null);
    startTransition(async () => {
      const res = await seedDemoDataAction();
      if (res.success) {
        loadStats();
        setStatusMsg({
          type: "success",
          text: "Data sampel simulasi berhasil dimasukkan ke SQLite.",
        });
      } else {
        setStatusMsg({
          type: "error",
          text: res.error || "Gagal mengisi data sampel.",
        });
      }
    });
  };

  const handleReset = () => {
    if (
      !confirm(
        "Kosongkan seluruh riwayat transaksi saham, dividen, dan mutasi kas? (Koneksi Bot Telegram tetap dipertahankan)."
      )
    ) {
      return;
    }
    setStatusMsg(null);
    startTransition(async () => {
      const res = await resetPortfolioDataAction();
      if (res.success) {
        loadStats();
        setStatusMsg({
          type: "success",
          text: "Database transaksi telah dikosongkan dan siap diisi dari awal.",
        });
      } else {
        setStatusMsg({
          type: "error",
          text: res.error || "Gagal mengosongkan database.",
        });
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl my-8">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <Database className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                Database Lokal SQLite
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  {stats?.journalMode || "WAL"} Aktif
                </span>
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {statusMsg && (
            <div
              className={`p-3.5 rounded-xl text-xs flex items-start gap-2.5 ${
                statusMsg.type === "success"
                  ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400"
                  : "bg-rose-500/10 border border-rose-500/20 text-rose-400"
              }`}
            >
              {statusMsg.type === "success" ? (
                <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              )}
              <span className="font-medium leading-relaxed">{statusMsg.text}</span>
            </div>
          )}

          {/* SQLite Info Card */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400 flex items-center gap-1.5">
                <HardDrive className="w-3.5 h-3.5 text-emerald-400" />
                Engine & Lokasi File:
              </span>
              <span className="font-mono text-slate-200 font-semibold">
                {stats?.fileName || "prisma/dev.db"} ({formatBytes(stats?.sizeBytes || 0)})
              </span>
            </div>

            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400 flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-sky-400" />
                Mode Konkurensi:
              </span>
              <span className="text-slate-300">
                Write-Ahead Logging ({stats?.journalMode || "WAL"})
              </span>
            </div>

            <div className="grid grid-cols-4 gap-2 pt-2 border-t border-slate-800/80 text-center">
              <div className="p-2 rounded-lg bg-slate-900/80">
                <div className="text-sm font-bold text-white">
                  {stats?.counts.stocks ?? 0}
                </div>
                <div className="text-[10px] text-slate-400">Emiten</div>
              </div>
              <div className="p-2 rounded-lg bg-slate-900/80">
                <div className="text-sm font-bold text-white">
                  {stats?.counts.transactions ?? 0}
                </div>
                <div className="text-[10px] text-slate-400">Transaksi</div>
              </div>
              <div className="p-2 rounded-lg bg-slate-900/80">
                <div className="text-sm font-bold text-white">
                  {stats?.counts.cashTransactions ?? 0}
                </div>
                <div className="text-[10px] text-slate-400">Mutasi Kas</div>
              </div>
              <div className="p-2 rounded-lg bg-slate-900/80">
                <div className="text-sm font-bold text-white">
                  {stats?.counts.dividends ?? 0}
                </div>
                <div className="text-[10px] text-slate-400">Dividen</div>
              </div>
            </div>
          </div>

          {/* Backup & Restore Section */}
          <div className="space-y-2">
            <span className="text-xs font-semibold text-slate-300 block">
              Cadangkan & Pulihkan Data (Backup / Restore)
            </span>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={handleExportBackup}
                disabled={isPending}
                className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-semibold transition-colors disabled:opacity-50"
              >
                <Download className="w-4 h-4" />
                <span>Download Backup JSON</span>
              </button>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isPending}
                className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 border border-sky-500/30 text-xs font-semibold transition-colors disabled:opacity-50"
              >
                <Upload className="w-4 h-4" />
                <span>Restore Backup JSON</span>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,application/json"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>
          </div>

          {/* Data Operations */}
          <div className="space-y-2 pt-2 border-t border-slate-800">
            <span className="text-xs font-semibold text-slate-300 block">
               Manajemen Isi Database
            </span>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={handleSeedDemo}
                disabled={isPending}
                className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium transition-colors disabled:opacity-50"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Isi Data Simulasi</span>
              </button>

              <button
                type="button"
                onClick={handleReset}
                disabled={isPending}
                className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 text-xs font-medium transition-colors disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Kosongkan Portofolio</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

