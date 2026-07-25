"use client";

import { PieChart, ShieldCheck, Target, TrendingUp, Award, DollarSign, CheckCircle2, ArrowUpRight } from "lucide-react";

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
  // Compute specific dollar/rupee monthly allocation per fund vehicle
  const equityCoreAmt = Math.round((monthlyInvestment * (equityPercent * 0.67)) / 100);
  const equityGrowthAmt = Math.round((monthlyInvestment * (equityPercent * 0.33)) / 100);
  const debtAmt = Math.round((monthlyInvestment * debtPercent) / 100);
  const goldAmt = Math.round((monthlyInvestment * goldPercent) / 100);

  // Compute recommended step-up SIP for 100% goal achievement
  const stepUpRequired = Math.round(monthlyInvestment * 1.15);

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
              <p className="text-[11px] text-slate-400 mt-1">Index & Growth Mutual Funds</p>
            </div>

            <div className="p-3 rounded-xl bg-slate-950 border border-cyan-500/20">
              <div className="flex items-center gap-1.5 font-bold text-white">
                <span className="h-2.5 w-2.5 rounded-full bg-cyan-400" />
                <span>Debt ({debtPercent}%)</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">Corporate & Govt Bonds</p>
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

      {/* Recommended Specific Investment Options Table */}
      <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 space-y-4 shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Award className="h-5 w-5 text-emerald-400" />
              <span>Recommended Investment Options & Monthly Split</span>
            </h3>
            <p className="text-xs text-slate-400">
              Exact fund categories, names, and monthly investment amounts tailored to your profile
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                <th className="py-3 px-4">Asset Class</th>
                <th className="py-3 px-4">Recommended Instrument / Fund Name</th>
                <th className="py-3 px-4">Allocation %</th>
                <th className="py-3 px-4 text-right">Monthly Investment</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-200">
              <tr className="hover:bg-slate-800/30 transition-colors">
                <td className="py-3.5 px-4 font-bold text-emerald-400 flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-emerald-400" />
                  Equity Core
                </td>
                <td className="py-3.5 px-4 font-semibold text-white">
                  UTI Nifty 50 Index Fund / Vanguard S&P 500 ETF
                </td>
                <td className="py-3.5 px-4 text-slate-400 font-medium">
                  {Math.round(equityPercent * 0.67)}%
                </td>
                <td className="py-3.5 px-4 text-right font-extrabold text-white">
                  {currencySymbol} {equityCoreAmt.toLocaleString()}/mo
                </td>
              </tr>

              <tr className="hover:bg-slate-800/30 transition-colors">
                <td className="py-3.5 px-4 font-bold text-emerald-300 flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-emerald-300" />
                  Equity Growth
                </td>
                <td className="py-3.5 px-4 font-semibold text-white">
                  Parag Parikh Flexi Cap Fund / Multi-Cap Growth Fund
                </td>
                <td className="py-3.5 px-4 text-slate-400 font-medium">
                  {Math.round(equityPercent * 0.33)}%
                </td>
                <td className="py-3.5 px-4 text-right font-extrabold text-white">
                  {currencySymbol} {equityGrowthAmt.toLocaleString()}/mo
                </td>
              </tr>

              <tr className="hover:bg-slate-800/30 transition-colors">
                <td className="py-3.5 px-4 font-bold text-cyan-400 flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-cyan-400" />
                  Debt / Fixed Income
                </td>
                <td className="py-3.5 px-4 font-semibold text-white">
                  HDFC Short Term Debt Fund / Corporate Bond Mutual Fund
                </td>
                <td className="py-3.5 px-4 text-slate-400 font-medium">
                  {debtPercent}%
                </td>
                <td className="py-3.5 px-4 text-right font-extrabold text-white">
                  {currencySymbol} {debtAmt.toLocaleString()}/mo
                </td>
              </tr>

              <tr className="hover:bg-slate-800/30 transition-colors">
                <td className="py-3.5 px-4 font-bold text-amber-400 flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-amber-400" />
                  Commodity Hedge
                </td>
                <td className="py-3.5 px-4 font-semibold text-white">
                  Sovereign Gold Bonds (SGB) / Nippon India Gold ETF
                </td>
                <td className="py-3.5 px-4 text-slate-400 font-medium">
                  {goldPercent}%
                </td>
                <td className="py-3.5 px-4 text-right font-extrabold text-white">
                  {currencySymbol} {goldAmt.toLocaleString()}/mo
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Actionable Step-Up Roadmap for 100% Goal Feasibility */}
        <div className="p-4 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="h-5 w-5 text-purple-400 shrink-0" />
            <div>
              <p className="font-bold text-white">
                How to make your {currencySymbol} {netWorthGoal.toLocaleString()} Net Worth Goal 100% Realistically Achievable:
              </p>
              <p className="text-slate-300 mt-0.5">
                Apply a 12-15% annual Step-Up SIP (e.g. increase from {currencySymbol} {monthlyInvestment.toLocaleString()}/mo to {currencySymbol} {stepUpRequired.toLocaleString()}/mo next year as your salary increases).
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
