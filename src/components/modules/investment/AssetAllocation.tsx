"use client";

import { PieChart, ShieldCheck, Target, TrendingUp, Award, DollarSign } from "lucide-react";

interface AssetAllocationProps {
  equityPercent: number;
  debtPercent: number;
  goldPercent: number;
  achievementLikelihood: number;
  projectedCorpus: number;
  totalInvested: number;
  estimatedReturns: number;
  monthlyInvestment: number;
  netWorthGoal: number;
  currencySymbol: string;
}

export default function AssetAllocation({
  equityPercent,
  debtPercent,
  goldPercent,
  achievementLikelihood,
  projectedCorpus,
  totalInvested,
  estimatedReturns,
  monthlyInvestment,
  netWorthGoal,
  currencySymbol,
}: AssetAllocationProps) {
  return (
    <div className="space-y-6">
      {/* Numeric Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-lg space-y-1">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
            Monthly SIP Amount
          </span>
          <p className="text-2xl font-extrabold text-white">
            {currencySymbol} {monthlyInvestment.toLocaleString()}
          </p>
          <span className="text-[10px] text-slate-500">Fixed Monthly SIP Contribution</span>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-lg space-y-1">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
            Projected Corpus (FV)
          </span>
          <p className="text-2xl font-extrabold text-purple-400">
            {currencySymbol} {projectedCorpus.toLocaleString()}
          </p>
          <span className="text-[10px] text-emerald-400 font-medium">
            + {currencySymbol} {estimatedReturns.toLocaleString()} Est. Compound Wealth Gain
          </span>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-lg space-y-1">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
            Target Net Worth Goal
          </span>
          <p className="text-2xl font-extrabold text-cyan-400">
            {currencySymbol} {netWorthGoal.toLocaleString()}
          </p>
          <span className="text-[10px] text-slate-500">Target Corpus Milestone</span>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-lg space-y-1">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
            Goal Likelihood
          </span>
          <div className="flex items-center gap-2">
            <p className="text-2xl font-extrabold text-emerald-400">{achievementLikelihood}%</p>
            <span
              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                achievementLikelihood >= 80
                  ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                  : achievementLikelihood >= 50
                  ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                  : "bg-rose-500/20 text-rose-400 border border-rose-500/30"
              }`}
            >
              {achievementLikelihood >= 80 ? "High Confidence" : achievementLikelihood >= 50 ? "Moderate" : "Adjust SIP"}
            </span>
          </div>
          <span className="text-[10px] text-slate-500">Scenario Confidence Indicator</span>
        </div>
      </div>

      {/* Asset Allocation Breakdown */}
      <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 space-y-4 shadow-xl">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <PieChart className="h-4 w-4 text-purple-400" />
          <span>Recommended Asset Allocation (% Mix)</span>
        </h3>

        <div className="space-y-3">
          <div className="h-4 w-full bg-slate-950 rounded-full overflow-hidden flex border border-slate-800">
            <div
              className="h-full bg-emerald-400 transition-all duration-500"
              style={{ width: `${equityPercent}%` }}
              title={`Equity ${equityPercent}%`}
            />
            <div
              className="h-full bg-cyan-400 transition-all duration-500"
              style={{ width: `${debtPercent}%` }}
              title={`Debt ${debtPercent}%`}
            />
            <div
              className="h-full bg-amber-400 transition-all duration-500"
              style={{ width: `${goldPercent}%` }}
              title={`Gold ${goldPercent}%`}
            />
          </div>

          <div className="grid grid-cols-3 gap-4 text-xs">
            <div className="p-3 rounded-xl bg-slate-950 border border-emerald-500/20">
              <div className="flex items-center gap-1.5 font-bold text-white">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
                <span>Equity ({equityPercent}%)</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">Stocks, Index & Growth Mutual Funds</p>
            </div>

            <div className="p-3 rounded-xl bg-slate-950 border border-cyan-500/20">
              <div className="flex items-center gap-1.5 font-bold text-white">
                <span className="h-2.5 w-2.5 rounded-full bg-cyan-400" />
                <span>Debt ({debtPercent}%)</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">Fixed Income, Corporate & Govt Bonds</p>
            </div>

            <div className="p-3 rounded-xl bg-slate-950 border border-amber-500/20">
              <div className="flex items-center gap-1.5 font-bold text-white">
                <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
                <span>Gold ({goldPercent}%)</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">Sovereign Gold Bonds & ETFs</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
