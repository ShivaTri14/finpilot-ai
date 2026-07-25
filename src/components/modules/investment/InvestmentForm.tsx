"use client";

import { useState } from "react";
import { LineChart, Calculator, Loader2, Sparkles, ShieldAlert } from "lucide-react";

interface InvestmentFormProps {
  initialValues?: any;
  onSubmit: (data: any) => void;
  loading: boolean;
  currencySymbol: string;
}

export default function InvestmentForm({
  initialValues,
  onSubmit,
  loading,
  currencySymbol,
}: InvestmentFormProps) {
  const [age, setAge] = useState(initialValues?.age || 28);
  const [monthlySalary, setMonthlySalary] = useState(initialValues?.monthlySalary || 85000);
  const [monthlyExpenses, setMonthlyExpenses] = useState(initialValues?.monthlyExpenses || 35000);
  const [currentSavings, setCurrentSavings] = useState(initialValues?.currentSavings || 150000);
  const [emergencyFund, setEmergencyFund] = useState(initialValues?.emergencyFund || 200000);
  const [netWorthGoal, setNetWorthGoal] = useState(initialValues?.netWorthGoal || 10000000);
  const [monthlyInvestment, setMonthlyInvestment] = useState(initialValues?.monthlyInvestment || 25000);
  const [investmentDurationYrs, setInvestmentDurationYrs] = useState(initialValues?.investmentDurationYrs || 10);
  const [riskAppetite, setRiskAppetite] = useState<"Low" | "Medium" | "High">(initialValues?.riskAppetite || "Medium");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      age,
      monthlySalary,
      monthlyExpenses,
      currentSavings,
      emergencyFund,
      netWorthGoal,
      monthlyInvestment,
      investmentDurationYrs,
      riskAppetite,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xl backdrop-blur-xl">
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center">
            <Calculator className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Financial & Risk Profile Inputs</h2>
            <p className="text-xs text-slate-400">Configure parameters for SIP compound growth & portfolio narrative</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1">Your Age (Years)</label>
          <input
            type="number"
            required
            min={18}
            max={80}
            value={age}
            onChange={(e) => setAge(Number(e.target.value))}
            className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs focus:ring-2 focus:ring-purple-500/50"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1">Monthly Salary ({currencySymbol})</label>
          <input
            type="number"
            required
            value={monthlySalary}
            onChange={(e) => setMonthlySalary(Number(e.target.value))}
            className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs focus:ring-2 focus:ring-purple-500/50"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1">Monthly Expenses ({currencySymbol})</label>
          <input
            type="number"
            required
            value={monthlyExpenses}
            onChange={(e) => setMonthlyExpenses(Number(e.target.value))}
            className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs focus:ring-2 focus:ring-purple-500/50"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1">Current Savings ({currencySymbol})</label>
          <input
            type="number"
            required
            value={currentSavings}
            onChange={(e) => setCurrentSavings(Number(e.target.value))}
            className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs focus:ring-2 focus:ring-purple-500/50"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1">Emergency Reserve ({currencySymbol})</label>
          <input
            type="number"
            required
            value={emergencyFund}
            onChange={(e) => setEmergencyFund(Number(e.target.value))}
            className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs focus:ring-2 focus:ring-purple-500/50"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1">Net Worth Goal ({currencySymbol})</label>
          <input
            type="number"
            required
            value={netWorthGoal}
            onChange={(e) => setNetWorthGoal(Number(e.target.value))}
            className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs focus:ring-2 focus:ring-purple-500/50"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1">Monthly SIP Investment ({currencySymbol})</label>
          <input
            type="number"
            required
            value={monthlyInvestment}
            onChange={(e) => setMonthlyInvestment(Number(e.target.value))}
            className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs focus:ring-2 focus:ring-purple-500/50"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1">Investment Duration (Years)</label>
          <input
            type="number"
            required
            min={1}
            max={40}
            value={investmentDurationYrs}
            onChange={(e) => setInvestmentDurationYrs(Number(e.target.value))}
            className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs focus:ring-2 focus:ring-purple-500/50"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1">Risk Appetite Strategy</label>
          <select
            value={riskAppetite}
            onChange={(e) => setRiskAppetite(e.target.value as any)}
            className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs cursor-pointer focus:ring-2 focus:ring-purple-500/50"
          >
            <option value="Low">Low Risk (~6.5% p.a. Conservative)</option>
            <option value="Medium">Medium Risk (~10.5% p.a. Balanced)</option>
            <option value="High">High Risk (~13.5% p.a. Aggressive)</option>
          </select>
        </div>
      </div>

      <div className="pt-2 flex justify-end">
        <button
          type="submit"
          disabled={loading}
          className="inline-flex items-center gap-2 py-3 px-6 rounded-xl font-semibold text-slate-950 bg-purple-400 hover:bg-purple-300 disabled:opacity-50 text-xs shadow-lg shadow-purple-500/20 transition-all"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Computing Layer 1 Math & AI Strategy...</span>
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4" />
              <span>Calculate SIP Projections & AI Plan</span>
            </>
          )}
        </button>
      </div>
    </form>
  );
}
