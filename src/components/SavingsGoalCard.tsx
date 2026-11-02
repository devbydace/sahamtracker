"use client";

import React, { useState, useTransition } from "react";
import { Target, CheckCircle, Edit3, Flame, TrendingUp } from "lucide-react";
import { formatRupiah } from "@/lib/format";
import { updateMonthlySavingsGoal } from "@/app/actions";

interface SavingsGoalCardProps {
  monthlySavings: {
    yearMonth: string;
    targetAmount: number;
    actualSaved: number;
    progressPercent: number;
  };
}

export function SavingsGoalCard({ monthlySavings }: SavingsGoalCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [newTarget, setNewTarget] = useState(monthlySavings.targetAmount.toString());
  const [isPending, startTransition] = useTransition();

  const handleSaveTarget = () => {
    const val = Number(newTarget);
    if (isNaN(val) || val <= 0) return;
    startTransition(async () => {
      await updateMonthlySavingsGoal(val);
      setIsEditing(false);
    });
  };

  const isCompleted = monthlySavings.progressPercent >= 100;
  const remaining = Math.max(0, monthlySavings.targetAmount - monthlySavings.actualSaved);

  const [year, month] = monthlySavings.yearMonth.split("-");
  const monthName = new Date(Number(year), Number(month) - 1).toLocaleDateString("id-ID", {
    month: "long",
    year: "numeric",
  });

  return (
    <div className="p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900 to-indigo-950/40 border border-slate-800/80 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Left: Info */}
        <div className="flex items-start gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center shrink-0 mt-0.5">
            <Target className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-white">
                Target Tabungan Saham ({monthName})
              </h3>
              {isCompleted ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <CheckCircle className="w-3 h-3" /> Target Tercapai!
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                  <Flame className="w-3 h-3 text-amber-400" /> DCA Rutin
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Terkumpul:{" "}
              <strong className="text-emerald-400 font-semibold">
                {formatRupiah(monthlySavings.actualSaved)}
              </strong>{" "}
              dari target{" "}
              <strong className="text-slate-200">
                {formatRupiah(monthlySavings.targetAmount)}
              </strong>
              {!isCompleted && remaining > 0 && (
                <span className="text-slate-400"> (Sisa {formatRupiah(remaining)} lagi)</span>
              )}
            </p>
          </div>
        </div>

        {/* Right: Quick Edit / Target input */}
        <div className="flex items-center gap-2 self-end sm:self-center">
          {isEditing ? (
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={newTarget}
                onChange={(e) => setNewTarget(e.target.value)}
                className="w-32 px-2.5 py-1.5 text-xs rounded-lg bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-indigo-500"
                placeholder="Target Rp"
                step="500000"
              />
              <button
                onClick={handleSaveTarget}
                disabled={isPending}
                className="text-xs px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium"
              >
                {isPending ? "Simpan..." : "Simpan"}
              </button>
              <button
                onClick={() => setIsEditing(false)}
                className="text-xs px-2 py-1.5 text-slate-400 hover:text-white"
              >
                Batal
              </button>
            </div>
          ) : (
            <button
              onClick={() => setIsEditing(true)}
              className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 px-2.5 py-1.5 rounded-lg hover:bg-slate-800 transition-colors"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Ubah Target</span>
            </button>
          )}
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mt-4">
        <div className="w-full h-3 rounded-full bg-slate-800 overflow-hidden relative">
          <div
            className={`h-full transition-all duration-500 rounded-full ${
              isCompleted
                ? "bg-gradient-to-r from-emerald-500 to-teal-400"
                : "bg-gradient-to-r from-indigo-500 to-emerald-400"
            }`}
            style={{ width: `${Math.min(100, monthlySavings.progressPercent)}%` }}
          />
        </div>
        <div className="flex justify-between items-center text-[11px] text-slate-400 mt-1.5 font-medium">
          <span>0%</span>
          <span className="text-white font-semibold">{monthlySavings.progressPercent.toFixed(0)}% Selesai</span>
          <span>100%</span>
        </div>
      </div>
    </div>
  );
}

