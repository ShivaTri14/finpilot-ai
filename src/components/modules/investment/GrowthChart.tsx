"use client";

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts";
import { TrendingUp, ShieldCheck } from "lucide-react";

interface GrowthChartProps {
  chartData: any[];
  currencySymbol: string;
  expectedRate: number;
}

export default function GrowthChart({
  chartData,
  currencySymbol,
  expectedRate,
}: GrowthChartProps) {
  return (
    <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 space-y-4 shadow-xl">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
        <div>
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-purple-400" />
            <span>SIP Growth Projection & Scenario Confidence Bands</span>
          </h3>
          <p className="text-xs text-slate-400">
            Deterministic SIP math ($FV$) across Expected (~{expectedRate}% p.a.), Best Case, & Worst Case scenarios
          </p>
        </div>

        <span className="text-[11px] font-semibold text-slate-400 bg-slate-950 px-3 py-1 rounded-full border border-slate-800">
          Illustrative Projections (Not Guarantees)
        </span>
      </div>

      <div className="h-80 w-full pt-4">
        {chartData.length === 0 ? (
          <div className="h-full flex items-center justify-center text-xs text-slate-500">
            Submit form to render projected SIP growth curve.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="colorBest" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="colorExpected" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#a855f7" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#a855f7" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="colorWorst" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#f43f5e" stopOpacity={0.0} />
                </linearGradient>
              </defs>
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
              <Legend wrapperStyle={{ fontSize: "12px", paddingTop: "12px" }} />
              <Area
                type="monotone"
                dataKey="bestCaseCorpus"
                name="Best Case Scenario"
                stroke="#10b981"
                fillOpacity={1}
                fill="url(#colorBest)"
                strokeWidth={2}
              />
              <Area
                type="monotone"
                dataKey="expectedCorpus"
                name="Expected Corpus (Layer 1 Math)"
                stroke="#a855f7"
                fillOpacity={1}
                fill="url(#colorExpected)"
                strokeWidth={3}
              />
              <Area
                type="monotone"
                dataKey="worstCaseCorpus"
                name="Worst Case Scenario"
                stroke="#f43f5e"
                fillOpacity={1}
                fill="url(#colorWorst)"
                strokeWidth={2}
              />
              <Area
                type="monotone"
                dataKey="totalInvested"
                name="Total Principal Invested"
                stroke="#94a3b8"
                strokeDasharray="4 4"
                fill="none"
                strokeWidth={1.5}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
