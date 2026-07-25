"use client";

import { useState } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts";
import { Calendar, Tag, BarChart3 } from "lucide-react";

interface TimeSeriesPoint {
  label: string;
  income: number;
  expense: number;
}

interface CategoryBreakdownPoint {
  category: string;
  amount: number;
  percentage: number;
}

interface ExpenseChartsProps {
  timeSeries: TimeSeriesPoint[];
  categoryBreakdown: CategoryBreakdownPoint[];
  period: "daily" | "weekly" | "monthly" | "yearly";
  onPeriodChange: (p: "daily" | "weekly" | "monthly" | "yearly") => void;
  currencySymbol: string;
}

export default function ExpenseCharts({
  timeSeries,
  categoryBreakdown,
  period,
  onPeriodChange,
  currencySymbol,
}: ExpenseChartsProps) {
  return (
    <div className="space-y-6">
      {/* Timeframe Controls */}
      <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-900/80 border border-slate-800">
        <div className="flex items-center gap-2 text-sm font-bold text-white">
          <BarChart3 className="h-5 w-5 text-emerald-400" />
          <span>Expense & Inflow Analysis</span>
        </div>

        <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800">
          {(["daily", "weekly", "monthly", "yearly"] as const).map((p) => (
            <button
              key={p}
              onClick={() => onPeriodChange(p)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all ${
                period === p
                  ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recharts Bar Graph */}
        <div className="lg:col-span-2 p-6 rounded-3xl bg-slate-900/80 border border-slate-800 space-y-4 shadow-xl">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Calendar className="h-4 w-4 text-emerald-400" />
            <span>Spending Trends ({period.toUpperCase()})</span>
          </h3>

          <div className="h-72 w-full">
            {timeSeries.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-500">
                No data points for selected timeframe.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={timeSeries} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis dataKey="label" stroke="#64748b" fontSize={11} tickLine={false} />
                  <YAxis stroke="#64748b" fontSize={11} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#0f172a",
                      borderColor: "#334155",
                      borderRadius: "12px",
                      color: "#fff",
                      fontSize: "12px",
                    }}
                    formatter={(val: any) => [`${currencySymbol} ${Number(val).toLocaleString()}`, ""]}
                  />
                  <Legend wrapperStyle={{ fontSize: "12px", paddingTop: "10px" }} />
                  <Bar dataKey="expense" name="Outflow / Expense" fill="#ef4444" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="income" name="Inflow / Income" fill="#10b981" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Category Breakdown Progress Bars */}
        <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 space-y-4 shadow-xl flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-4">
              <Tag className="h-4 w-4 text-emerald-400" />
              <span>Category Share</span>
            </h3>

            {categoryBreakdown.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-10">No expenses recorded yet.</p>
            ) : (
              <div className="space-y-3.5 max-h-60 overflow-y-auto pr-1">
                {categoryBreakdown.map((cat) => (
                  <div key={cat.category} className="space-y-1 text-xs">
                    <div className="flex justify-between font-semibold">
                      <span className="text-slate-200">{cat.category}</span>
                      <span className="text-slate-400">
                        {currencySymbol} {cat.amount.toLocaleString()} ({cat.percentage}%)
                      </span>
                    </div>
                    <div className="h-2 w-full bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                      <div
                        className="h-full bg-emerald-400 rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(cat.percentage, 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
