import { Suspense } from "react";
import { getDashboardData } from "./actions";
import { DashboardContainer } from "@/components/DashboardContainer";
import { TrendingUp } from "lucide-react";

export const instant = false;

async function DashboardLoader() {
  const result = await getDashboardData();

  if (!result.success || !result.data) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-4">
        <div className="max-w-md text-center p-6 rounded-2xl bg-slate-900 border border-slate-800">
          <h2 className="text-lg font-bold text-rose-400">Gagal Memuat Data</h2>
          <p className="text-xs text-slate-400 mt-2">
            Terjadi kesalahan saat membaca database portofolio. Silakan periksa database.
          </p>
        </div>
      </div>
    );
  }

  const { portfolio, recentTransactions, recentCash, recentDividends } = result.data;

  return (
    <DashboardContainer
      portfolio={portfolio}
      recentTransactions={recentTransactions}
      recentCash={recentCash}
      recentDividends={recentDividends}
    />
  );
}

function DashboardSkeleton() {
  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6">
      <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-slate-950 font-bold mb-4 animate-pulse">
        <TrendingUp className="w-6 h-6 stroke-[2.5]" />
      </div>
      <h2 className="text-base font-bold text-white tracking-tight">Memuat SahamTracker IDX...</h2>
      <p className="text-xs text-slate-500 mt-1">Mengambil ringkasan tabungan dan nilai pasar terkini</p>
    </div>
  );
}

export default function HomePage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <DashboardLoader />
    </Suspense>
  );
}
