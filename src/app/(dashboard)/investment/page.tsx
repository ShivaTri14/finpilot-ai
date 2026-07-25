"use client";

import { useSession } from "next-auth/react";
import { useState, useEffect } from "react";
import { LineChart, Sparkles, Bot, ShieldCheck, Loader2, Award } from "lucide-react";
import InvestmentForm from "@/components/modules/investment/InvestmentForm";
import GrowthChart from "@/components/modules/investment/GrowthChart";
import AssetAllocation from "@/components/modules/investment/AssetAllocation";

export default function InvestmentPage() {
  const { data: session } = useSession();
  const [plan, setPlan] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [computing, setComputing] = useState(false);

  const currencySymbolMap: Record<string, string> = {
    INR: "₹",
    USD: "$",
    EUR: "€",
    GBP: "£",
  };

  const userCurrency = (session?.user as any)?.currency || "INR";
  const symbol = currencySymbolMap[userCurrency] || "₹";

  const fetchExistingPlan = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/investment");
      const data = await res.json();
      if (res.ok && data.plan) {
        setPlan(data.plan);
      }
    } catch (err) {
      console.error("Failed to load investment plan:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExistingPlan();
  }, []);

  const handleComputePlan = async (formData: any) => {
    setComputing(true);
    try {
      const res = await fetch("/api/investment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (res.ok && data.plan) {
        setPlan(data.plan);
      }
    } catch (err) {
      console.error("Compute plan error:", err);
    } finally {
      setComputing(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">AI Investment Model</h1>
          <p className="text-sm text-slate-400 mt-1">
            Layer 1 Deterministic SIP Compound Interest Math + Layer 2 LLM Portfolio Narrative Engine.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20">
          <ShieldCheck className="h-4 w-4" />
          <span>Core AI Advisory Engine</span>
        </div>
      </div>

      {/* Layer 1 Input Form */}
      <InvestmentForm
        initialValues={plan}
        onSubmit={handleComputePlan}
        loading={computing}
        currencySymbol={symbol}
      />

      {loading ? (
        <div className="flex items-center justify-center min-h-[300px]">
          <Loader2 className="h-8 w-8 text-purple-400 animate-spin" />
        </div>
      ) : plan ? (
        <div className="space-y-8 animate-in fade-in duration-500">
          {/* Layer 1 Numeric Summary & Asset Allocation */}
          <AssetAllocation
            equityPercent={plan.equityPercent}
            debtPercent={plan.debtPercent}
            goldPercent={plan.goldPercent}
            achievementLikelihood={plan.achievementLikelihood}
            projectedCorpus={plan.projectedCorpus}
            totalInvested={plan.totalInvested}
            estimatedReturns={plan.estimatedReturns}
            monthlyInvestment={plan.monthlyInvestment}
            netWorthGoal={plan.netWorthGoal}
            currencySymbol={symbol}
          />

          {/* Layer 1 Recharts Growth Curves */}
          <GrowthChart
            chartData={plan.chartData || []}
            currencySymbol={symbol}
            expectedRate={plan.expectedAnnualReturn || 10.5}
          />

          {/* Layer 2 LLM Written Narrative Explanation */}
          <div className="p-6 sm:p-8 rounded-3xl bg-slate-900/90 border border-purple-500/30 space-y-4 shadow-2xl relative overflow-hidden">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-gradient-to-tr from-purple-500 to-cyan-400 flex items-center justify-center text-slate-950 font-bold shadow-lg shadow-purple-500/20">
                <Bot className="h-6 w-6 stroke-[2.5]" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">AI Personal Financial Coach Analysis</h3>
                <p className="text-xs text-purple-300 font-medium">
                  Contextualized explanation of your computed Layer 1 numbers
                </p>
              </div>
            </div>

            <div className="prose prose-invert max-w-none text-xs text-slate-300 leading-relaxed whitespace-pre-line border-t border-slate-800/80 pt-4">
              {plan.llmNarrative}
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center py-12 px-4 rounded-3xl bg-slate-900/40 border border-slate-800 text-slate-400 text-xs">
          Submit the financial profile form above to generate your deterministic SIP projections and AI narrative.
        </div>
      )}
    </div>
  );
}
