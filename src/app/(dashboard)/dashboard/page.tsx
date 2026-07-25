"use client";

import { useSession } from "next-auth/react";
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
} from "lucide-react";

export default function DashboardPage() {
  const { data: session } = useSession();

  const userName = session?.user?.name || "Financial Explorer";
  const currency = (session?.user as any)?.currency || "INR";
  const riskAppetite = (session?.user as any)?.riskAppetite || "Medium";

  const currencySymbol: Record<string, string> = {
    INR: "₹",
    USD: "$",
    EUR: "€",
    GBP: "£",
  };

  const symbol = currencySymbol[currency] || "₹";

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-slate-900 to-emerald-950/40 border border-slate-800 p-8 shadow-xl">
        <div className="relative z-10 max-w-2xl space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold">
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>Authenticated Financial Session Active</span>
          </div>

          <h1 className="text-3xl font-extrabold text-white tracking-tight sm:text-4xl">
            Welcome back, {userName}!
          </h1>

          <p className="text-slate-400 text-sm leading-relaxed">
            Your personalized AI coach is configured with <strong className="text-white">{symbol} {currency}</strong> as your primary currency and a <strong className="text-emerald-400">{riskAppetite} Risk</strong> appetite strategy.
          </p>
        </div>

        <div className="absolute top-1/2 -right-10 -translate-y-1/2 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* Module Overview Quick Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Link
          href="/transactions"
          className="group p-6 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-emerald-500/40 transition-all duration-200 shadow-lg hover:shadow-emerald-500/5 flex flex-col justify-between"
        >
          <div>
            <div className="h-10 w-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <Receipt className="h-5 w-5" />
            </div>
            <h3 className="font-bold text-white text-lg group-hover:text-emerald-400 transition-colors">
              Expense Tracker
            </h3>
            <p className="text-slate-400 text-xs mt-1.5 leading-relaxed">
              Upload bank statements, parse bank SMS text, and manage spending alerts.
            </p>
          </div>
          <div className="mt-6 flex items-center gap-1 text-xs font-semibold text-emerald-400">
            <span>Module 2 & 3</span>
            <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>

        <Link
          href="/goals"
          className="group p-6 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-cyan-500/40 transition-all duration-200 shadow-lg hover:shadow-cyan-500/5 flex flex-col justify-between"
        >
          <div>
            <div className="h-10 w-10 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <Target className="h-5 w-5" />
            </div>
            <h3 className="font-bold text-white text-lg group-hover:text-cyan-400 transition-colors">
              Goal Planner
            </h3>
            <p className="text-slate-400 text-xs mt-1.5 leading-relaxed">
              Set savings goals and calculate real-time Surplus vs. Goal feasibility.
            </p>
          </div>
          <div className="mt-6 flex items-center gap-1 text-xs font-semibold text-cyan-400">
            <span>Module 4</span>
            <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>

        <Link
          href="/investment"
          className="group p-6 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-purple-500/40 transition-all duration-200 shadow-lg hover:shadow-purple-500/5 flex flex-col justify-between"
        >
          <div>
            <div className="h-10 w-10 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <LineChart className="h-5 w-5" />
            </div>
            <h3 className="font-bold text-white text-lg group-hover:text-purple-400 transition-colors">
              AI Investment Model
            </h3>
            <p className="text-slate-400 text-xs mt-1.5 leading-relaxed">
              Deterministic SIP compound growth & LLM personalized investment strategy.
            </p>
          </div>
          <div className="mt-6 flex items-center gap-1 text-xs font-semibold text-purple-400">
            <span>Module 5</span>
            <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>

        <Link
          href="/chat"
          className="group p-6 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-amber-500/40 transition-all duration-200 shadow-lg hover:shadow-amber-500/5 flex flex-col justify-between"
        >
          <div>
            <div className="h-10 w-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <MessageSquareText className="h-5 w-5" />
            </div>
            <h3 className="font-bold text-white text-lg group-hover:text-amber-400 transition-colors">
              AI Coach Chatbot
            </h3>
            <p className="text-slate-400 text-xs mt-1.5 leading-relaxed">
              Conversational Q&A with direct context awareness of your goals & transactions.
            </p>
          </div>
          <div className="mt-6 flex items-center gap-1 text-xs font-semibold text-amber-400">
            <span>Module 6</span>
            <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>
      </div>
    </div>
  );
}
