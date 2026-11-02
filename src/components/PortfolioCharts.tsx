"use client";

import React from "react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
} from "recharts";
import { formatRupiah } from "@/lib/format";
import { StockHolding } from "@/lib/portfolio";

interface PortfolioChartsProps {
  holdings: StockHolding[];
  sectorAllocations: { sector: string; value: number; percent: number }[];
}

const COLORS = [
  "#10B981", // emerald
  "#3B82F6", // blue
  "#8B5CF6", // purple
  "#F59E0B", // amber
  "#EC4899", // pink
  "#06B6D4", // cyan
  "#14B8A6", // teal
  "#6366F1", // indigo
];

export function PortfolioCharts({ holdings, sectorAllocations }: PortfolioChartsProps) {
  if (holdings.length === 0) {
    return null;
  }

  const holdingsData = holdings.map((h) => ({
    name: h.ticker,
    value: h.marketValue,
    percent: h.allocationPercent,
  }));

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-slate-900 border border-slate-700 p-2.5 rounded-lg shadow-xl text-xs">
          <div className="font-bold text-white">{data.name || data.sector}</div>
          <div className="text-emerald-400 font-semibold">{formatRupiah(data.value)}</div>
          <div className="text-slate-400">{data.percent?.toFixed(1)}% dari portofolio</div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* 1. Alokasi Sektor */}
      <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm flex flex-col">
        <div className="mb-3">
          <h3 className="text-sm font-bold text-white">Alokasi Berdasarkan Sektor</h3>
          <p className="text-xs text-slate-400">Diversifikasi saham per sektor industri</p>
        </div>

        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={sectorAllocations}
                dataKey="value"
                nameKey="sector"
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={85}
                paddingAngle={4}
              >
                {sectorAllocations.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Legend */}
        <div className="mt-2 flex flex-wrap gap-2.5 justify-center">
          {sectorAllocations.map((item, idx) => (
            <div key={item.sector} className="flex items-center gap-1.5 text-xs text-slate-300">
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: COLORS[idx % COLORS.length] }}
              />
              <span className="font-medium">{item.sector}</span>
              <span className="text-slate-500 font-mono text-[11px]">({item.percent.toFixed(0)}%)</span>
            </div>
          ))}
        </div>
      </div>

      {/* 2. Proporsi Emiten Saham */}
      <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm flex flex-col">
        <div className="mb-3">
          <h3 className="text-sm font-bold text-white">Distribusi Bobot Emiten</h3>
          <p className="text-xs text-slate-400">Porsi nilai pasar per kode saham</p>
        </div>

        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={holdingsData}
              layout="vertical"
              margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
            >
              <XAxis type="number" hide />
              <YAxis
                type="category"
                dataKey="name"
                tick={{ fill: "#94a3b8", fontSize: 12, fontWeight: "bold" }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                {holdingsData.map((entry, index) => (
                  <Cell key={`bar-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="mt-2 text-center text-xs text-slate-400">
          Total Nilai Saham:{" "}
          <strong className="text-emerald-400">
            {formatRupiah(holdings.reduce((sum, h) => sum + h.marketValue, 0))}
          </strong>
        </div>
      </div>
    </div>
  );
}

