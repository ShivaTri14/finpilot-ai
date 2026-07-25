import Link from "next/link";
import { Shield, TrendingUp, Sparkles, PieChart, Target, Bot } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between selection:bg-emerald-500 selection:text-slate-950">
      {/* Background Gradient Mesh */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-gradient-to-b from-emerald-500/10 via-cyan-500/5 to-transparent blur-3xl rounded-full" />
      </div>

      {/* Navigation Header */}
      <header className="border-b border-slate-800/60 bg-slate-950/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-emerald-500 to-cyan-400 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <TrendingUp className="h-5 w-5 text-slate-950 stroke-[2.5]" />
            </div>
            <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
              FinPilot <span className="text-emerald-400 font-extrabold">AI</span>
            </span>
          </div>

          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              System Online
            </span>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 max-w-5xl mx-auto px-6 py-20 flex flex-col items-center justify-center text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-900 border border-slate-800 text-slate-300 text-sm mb-8 shadow-inner">
          <Sparkles className="h-4 w-4 text-emerald-400" />
          <span>AI-Powered Personal Financial Coach & Advisory Platform</span>
        </div>

        <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-white max-w-3xl leading-[1.15]">
          Autonomous Wealth Coaching & Personalized Financial Clarity
        </h1>

        <p className="mt-6 text-lg md:text-xl text-slate-400 max-w-2xl font-normal leading-relaxed">
          FinPilot AI consolidates your income, expenses, goals, and risk profile to deliver personalized budgeting insights, SIP projections, and conversational financial coaching.
        </p>

        {/* Feature Grid Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-16 w-full text-left">
          <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800/80 hover:border-emerald-500/30 transition-all duration-200">
            <div className="h-10 w-10 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-4">
              <PieChart className="h-5 w-5" />
            </div>
            <h3 className="font-semibold text-lg text-white mb-2">Smart Expense Engine</h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              Automated PDF bank statement extraction, paste-based SMS parsing, and intelligent spending threshold alert system.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800/80 hover:border-emerald-500/30 transition-all duration-200">
            <div className="h-10 w-10 rounded-lg bg-cyan-500/10 text-cyan-400 flex items-center justify-center mb-4">
              <Target className="h-5 w-5" />
            </div>
            <h3 className="font-semibold text-lg text-white mb-2">Goal Feasibility Planner</h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              Real-time surplus math measuring current savings against targets with On-Track, At-Risk, or Unrealistic feedback.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800/80 hover:border-emerald-500/30 transition-all duration-200">
            <div className="h-10 w-10 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center mb-4">
              <Bot className="h-5 w-5" />
            </div>
            <h3 className="font-semibold text-lg text-white mb-2">AI Advisory & Chatbot</h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              SIP compound growth models paired with LLM narrative explanations tailored directly to your financial profile.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/60 bg-slate-950/80 py-8 text-center text-sm text-slate-500">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <p>© {new Date().getFullYear()} FinPilot AI — Capstone Engineering Project.</p>
          <div className="flex items-center gap-6 text-slate-400">
            <span className="flex items-center gap-1.5 text-xs text-slate-500">
              <Shield className="h-3.5 w-3.5 text-emerald-400" /> Vercel Ready Architecture
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
