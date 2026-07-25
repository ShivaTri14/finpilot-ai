"use client";

import { useSession } from "next-auth/react";
import { useState, useEffect } from "react";
import Link from "next/link";
import {
  TrendingUp,
  Receipt,
  Target,
  LineChart,
  MessageSquareText,
  ShieldCheck,
  ArrowRight,
  Sparkles,
  Wallet,
  PieChart,
  Award,
  Loader2,
} from "lucide-react";

export default function DashboardPage() {
  const { data: session } = useSession();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const userName = session?.user?.name || "Financial Explorer";
  const currency = (session?.user as any)?.currency || "INR";
  const riskAppetite = (session?.user as any)?.riskAppetite || "Medium";

  const currencySymbolMap: Record<string, string> = {
    INR: "₹",
    USD: "$",
    EUR: "€",
    GBP: "£",
  };

  const symbol = currencySymbolMap[currency] || "₹";

  const fetchDashboardStats = async () => {
    setLoading(true);
    try {
      const [txRes, goalsRes, invRes] = await Promise.all([
        fetch("/api/transactions/summary"),
        fetch("/api/goals"),
        fetch("/api/investment"),
      ]);

      const txData = await txRes.json();
      const goalsData = await goalsRes.json();
      const invData = await invRes.json();

      setStats({
        monthlySurplus: txData.summary?.netSurplus || 0,
        totalExpenses: txData.summary?.totalExpenses || 0,
        overspendingAlerts: txData.alerts || [],
        goalsCount: goalsData.goals?.length || 0,
        onTrackGoals: goalsData.goals?.filter((g: any) => g.status === "ON_TRACK")?.length || 0,
        projectedCorpus: invData.plan?.projectedCorpus || 0,
        equityPercent: invData.plan?.equityPercent || 60,
      });
    } catch (err) {
      console.error("Dashboard stats load error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-slate-900 to-emerald-950/40 border border-slate-800 p-6 sm:p-8 shadow-2xl">
        <div className="relative z-10 max-w-2xl space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold">
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>Authenticated Financial Session Active</span>
          </div>

          <h1 className="text-3xl font-extrabold text-white tracking-tight sm:text-4xl">
            Welcome back, {userName}!
          </h1>

          <p className="text-slate-400 text-xs sm:text-sm leading-relaxed">
            Your personal AI coach is active with <strong className="text-white">{symbol} {currency}</strong> currency and a <strong className="text-emerald-400">{riskAppetite} Risk</strong> appetite baseline.
          </p>
        </div>

        <div className="absolute top-1/2 -right-10 -translate-y-1/2 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* Live Financial KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 shadow-xl space-y-2 relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Net Monthly Surplus
            </span>
            <div className="h-8 w-8 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <Wallet className="h-4 w-4" />
            </div>
          </div>

          {loading ? (
            <div className="h-8 w-28 bg-slate-800 animate-pulse rounded-lg" />
          ) : (
            <p className="text-2xl font-extrabold text-white">
              {symbol} {(stats?.monthlySurplus || 0).toLocaleString()}/mo
            </p>
          )}
          <span className="text-[10px] text-emerald-400 font-medium block">
            Available Inflow for Goals & Investments
          </span>
        </div>

        <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 shadow-xl space-y-2 relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Total Monthly Spend
            </span>
            <div className="h-8 w-8 rounded-xl bg-rose-500/10 text-rose-400 flex items-center justify-center">
              <Receipt className="h-4 w-4" />
            </div>
          </div>

          {loading ? (
            <div className="h-8 w-28 bg-slate-800 animate-pulse rounded-lg" />
          ) : (
            <p className="text-2xl font-extrabold text-white">
              {symbol} {(stats?.totalExpenses || 0).toLocaleString()}
            </p>
          )}
          <span className="text-[10px] text-slate-400 block">
            {stats?.overspendingAlerts?.length > 0 ? (
              <span className="text-rose-400 font-bold">{stats.overspendingAlerts.length} Budget Alert Active</span>
            ) : (
              "Recorded Monthly Outflow"
            )}
          </span>
        </div>

        <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 shadow-xl space-y-2 relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Active Goals Tracker
            </span>
            <div className="h-8 w-8 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center">
              <Target className="h-4 w-4" />
            </div>
          </div>

          {loading ? (
            <div className="h-8 w-28 bg-slate-800 animate-pulse rounded-lg" />
          ) : (
            <p className="text-2xl font-extrabold text-white">
              {stats?.goalsCount || 0} Configured Goals
            </p>
          )}
          <span className="text-[10px] text-cyan-400 font-medium block">
            {stats?.onTrackGoals || 0} Goals On Track
          </span>
        </div>

        <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 shadow-xl space-y-2 relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Projected SIP Corpus
            </span>
            <div className="h-8 w-8 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center">
              <LineChart className="h-4 w-4" />
            </div>
          </div>

          {loading ? (
            <div className="h-8 w-28 bg-slate-800 animate-pulse rounded-lg" />
          ) : (
            <p className="text-2xl font-extrabold text-purple-400">
              {symbol} {(stats?.projectedCorpus || 0).toLocaleString()}
            </p>
          )}
          <span className="text-[10px] text-purple-300 font-medium block">
            {stats?.equityPercent || 60}% Equity Portfolio Strategy
          </span>
        </div>
      </div>

      {/* Core Feature Quick Navigation Grid */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-emerald-400" />
          <span>FinPilot Financial Modules</span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Link
            href="/transactions"
            className="group p-6 rounded-3xl bg-slate-900/80 border border-slate-800 hover:border-emerald-500/40 transition-all duration-300 shadow-xl flex flex-col justify-between"
          >
            <div>
              <div className="h-11 w-11 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Receipt className="h-6 w-6" />
              </div>
              <h3 className="font-bold text-white text-lg group-hover:text-emerald-400 transition-colors">
                Expense Tracker
              </h3>
              <p className="text-slate-400 text-xs mt-2 leading-relaxed">
                Upload PDF bank statements, paste SMS text, auto-categorize, and monitor spending limits.
              </p>
            </div>
            <div className="mt-6 flex items-center gap-1 text-xs font-bold text-emerald-400">
              <span>Open Tracker</span>
              <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>

          <Link
            href="/goals"
            className="group p-6 rounded-3xl bg-slate-900/80 border border-slate-800 hover:border-cyan-500/40 transition-all duration-300 shadow-xl flex flex-col justify-between"
          >
            <div>
              <div className="h-11 w-11 rounded-2xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Target className="h-6 w-6" />
              </div>
              <h3 className="font-bold text-white text-lg group-hover:text-cyan-400 transition-colors">
                Goal Planner
              </h3>
              <p className="text-slate-400 text-xs mt-2 leading-relaxed">
                Configure goals with quick presets and compare required monthly savings against live surplus.
              </p>
            </div>
            <div className="mt-6 flex items-center gap-1 text-xs font-bold text-cyan-400">
              <span>Open Goals</span>
              <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>

          <Link
            href="/investment"
            className="group p-6 rounded-3xl bg-slate-900/80 border border-slate-800 hover:border-purple-500/40 transition-all duration-300 shadow-xl flex flex-col justify-between"
          >
            <div>
              <div className="h-11 w-11 rounded-2xl bg-purple-500/10 text-purple-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <LineChart className="h-6 w-6" />
              </div>
              <h3 className="font-bold text-white text-lg group-hover:text-purple-400 transition-colors">
                AI Investment Model
              </h3>
              <p className="text-slate-400 text-xs mt-2 leading-relaxed">
                Deterministic SIP compound growth formulas, specific fund recommendations, and step-up plans.
              </p>
            </div>
            <div className="mt-6 flex items-center gap-1 text-xs font-bold text-purple-400">
              <span>Open Model</span>
              <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>

          <Link
            href="/chat"
            className="group p-6 rounded-3xl bg-slate-900/80 border border-slate-800 hover:border-amber-500/40 transition-all duration-300 shadow-xl flex flex-col justify-between"
          >
            <div>
              <div className="h-11 w-11 rounded-2xl bg-amber-500/10 text-amber-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <MessageSquareText className="h-6 w-6" />
              </div>
              <h3 className="font-bold text-white text-lg group-hover:text-amber-400 transition-colors">
                AI Coach Chatbot
              </h3>
              <p className="text-slate-400 text-xs mt-2 leading-relaxed">
                Ask broad finance questions (Taxes, Credit Scores, Terms) or inquire about your own numbers.
              </p>
            </div>
            <div className="mt-6 flex items-center gap-1 text-xs font-bold text-amber-400">
              <span>Launch Coach</span>
              <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
