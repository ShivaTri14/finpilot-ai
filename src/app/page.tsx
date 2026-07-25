import Link from "next/link";
import { Shield, TrendingUp, Sparkles, PieChart, Target, Bot, ArrowRight, ShieldCheck, CheckCircle2 } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-[#060911] text-slate-100 flex flex-col justify-between selection:bg-emerald-500 selection:text-slate-950 font-sans">
      {/* Background Ambient Glow Mesh */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1200px] h-[600px] bg-gradient-to-b from-emerald-500/15 via-purple-500/5 to-transparent blur-3xl rounded-full" />
      </div>

      {/* Navigation Header */}
      <header className="border-b border-slate-800/80 bg-slate-950/70 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-emerald-500 to-emerald-300 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <TrendingUp className="h-5 w-5 text-slate-950 stroke-[2.5]" />
            </div>
            <span className="text-xl font-bold tracking-tight text-white">
              FinPilot <span className="text-emerald-400 font-extrabold">AI</span>
            </span>
          </div>

          <div className="flex items-center gap-4">
            <Link
              href="/login"
              className="text-xs font-semibold text-slate-300 hover:text-white transition-colors"
            >
              Sign In
            </Link>
            <Link
              href="/signup"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-emerald-400 hover:bg-emerald-300 text-slate-950 shadow-lg shadow-emerald-500/20 transition-all hover:scale-105"
            >
              <span>Get Started</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 max-w-6xl mx-auto px-6 py-16 sm:py-24 flex flex-col items-center justify-center text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-900/90 border border-slate-800 text-slate-300 text-xs mb-8 shadow-xl backdrop-blur-xl">
          <Sparkles className="h-4 w-4 text-emerald-400" />
          <span className="font-medium">AI-Powered Personal Financial Coach & Advisory Platform</span>
        </div>

        <h1 className="text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-tight text-white max-w-4xl leading-[1.12]">
          Autonomous Wealth Coaching & <span className="gradient-text-emerald">Personalized Clarity</span>
        </h1>

        <p className="mt-6 text-base sm:text-xl text-slate-400 max-w-2xl font-normal leading-relaxed">
          Consolidate your income, expenses, goals, and risk profile. FinPilot AI delivers real-time surplus math, SIP growth projections, and conversational financial advice.
        </p>

        {/* Primary CTA Buttons */}
        <div className="mt-10 flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
          <Link
            href="/login"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 rounded-2xl font-bold text-slate-950 bg-emerald-400 hover:bg-emerald-300 text-sm shadow-xl shadow-emerald-500/20 transition-all hover:scale-105"
          >
            <span>Launch Live Demo</span>
            <ArrowRight className="h-4 w-4" />
          </Link>

          <Link
            href="/signup"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 rounded-2xl font-semibold text-slate-300 hover:text-white bg-slate-900/80 border border-slate-800 hover:border-slate-700 text-sm transition-all"
          >
            <span>Create Account</span>
          </Link>
        </div>

        {/* Live Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-20 w-full text-left">
          <div className="p-8 rounded-3xl bg-slate-900/60 border border-slate-800/80 hover:border-emerald-500/30 transition-all duration-300 shadow-xl group">
            <div className="h-12 w-12 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <PieChart className="h-6 w-6" />
            </div>
            <h3 className="font-bold text-xl text-white mb-2">Smart Expense Engine</h3>
            <p className="text-slate-400 text-xs sm:text-sm leading-relaxed">
              Automated PDF statement extraction, paste-based SMS parsing, keyword rules engine, and overspending alert warnings.
            </p>
          </div>

          <div className="p-8 rounded-3xl bg-slate-900/60 border border-slate-800/80 hover:border-emerald-500/30 transition-all duration-300 shadow-xl group">
            <div className="h-12 w-12 rounded-2xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <Target className="h-6 w-6" />
            </div>
            <h3 className="font-bold text-xl text-white mb-2">Goal Feasibility Planner</h3>
            <p className="text-slate-400 text-xs sm:text-sm leading-relaxed">
              Real-time surplus math measuring current savings against deadlines with On-Track, At-Risk, or Unrealistic feedback.
            </p>
          </div>

          <div className="p-8 rounded-3xl bg-slate-900/60 border border-slate-800/80 hover:border-purple-500/30 transition-all duration-300 shadow-xl group">
            <div className="h-12 w-12 rounded-2xl bg-purple-500/10 text-purple-400 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <Bot className="h-6 w-6" />
            </div>
            <h3 className="font-bold text-xl text-white mb-2">AI Investment & Chatbot</h3>
            <p className="text-slate-400 text-xs sm:text-sm leading-relaxed">
              Deterministic SIP compound growth models, specific fund option recommendations, and context-aware conversational coaching.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/60 bg-slate-950/80 py-8 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© {new Date().getFullYear()} FinPilot AI — Personal Financial Coach Platform.</p>
          <div className="flex items-center gap-6 text-slate-400">
            <span className="flex items-center gap-1.5 text-xs text-slate-500">
              <ShieldCheck className="h-4 w-4 text-emerald-400" /> Production-Grade Architecture
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
