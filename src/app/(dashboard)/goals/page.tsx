"use client";

import { useSession } from "next-auth/react";
import { useState, useEffect } from "react";
import { Target, PlusCircle, Sparkles, TrendingUp, ShieldAlert, Loader2, ArrowRight } from "lucide-react";
import GoalCard, { CalculatedGoal } from "@/components/modules/goals/GoalCard";
import AddGoalModal from "@/components/modules/goals/AddGoalModal";
import Link from "next/link";

export default function GoalsPage() {
  const { data: session } = useSession();
  const [goals, setGoals] = useState<CalculatedGoal[]>([]);
  const [monthlySurplus, setMonthlySurplus] = useState(0);
  const [totalIncome, setTotalIncome] = useState(0);
  const [totalExpense, setTotalExpense] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const currencySymbolMap: Record<string, string> = {
    INR: "₹",
    USD: "$",
    EUR: "€",
    GBP: "£",
  };

  const userCurrency = (session?.user as any)?.currency || "INR";
  const symbol = currencySymbolMap[userCurrency] || "₹";

  const fetchGoals = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/goals");
      const data = await res.json();
      if (res.ok) {
        setGoals(data.goals || []);
        setMonthlySurplus(data.monthlySurplus || 0);
        setTotalIncome(data.totalIncome || 0);
        setTotalExpense(data.totalExpense || 0);
      }
    } catch (err) {
      console.error("Failed to load goals:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGoals();
  }, []);

  const handleDeleteGoal = async (id: string) => {
    try {
      const res = await fetch(`/api/goals?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        fetchGoals();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleReorderGoal = async (id: string, direction: "up" | "down") => {
    const idx = goals.findIndex((g) => g.id === id);
    if (idx === -1) return;

    const targetIdx = direction === "up" ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= goals.length) return;

    const currentGoal = goals[idx];
    const targetGoal = goals[targetIdx];

    try {
      await Promise.all([
        fetch("/api/goals", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: currentGoal.id, priority: targetGoal.priority }),
        }),
        fetch("/api/goals", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: targetGoal.id, priority: currentGoal.priority }),
        }),
      ]);
      fetchGoals();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Financial Goal Planner</h1>
          <p className="text-sm text-slate-400 mt-1">
            Required monthly savings vs. live monthly surplus feasibility & progress tracking.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center gap-2 py-2.5 px-4 rounded-xl text-xs font-semibold text-slate-950 bg-cyan-400 hover:bg-cyan-300 transition-all shadow-lg shadow-cyan-500/20"
        >
          <PlusCircle className="h-4 w-4" />
          <span>Add New Goal</span>
        </button>
      </div>

      {/* Monthly Surplus Engine Metric Card */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-slate-900 via-slate-900 to-cyan-950/40 border border-slate-800 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
              <TrendingUp className="h-3.5 w-3.5" />
              Live Financial Surplus Engine
            </span>
            <h2 className="text-xl font-bold text-white">
              Average Monthly Surplus: <span className="text-cyan-400">{symbol} {monthlySurplus.toLocaleString(undefined, { minimumFractionDigits: 2 })} / mo</span>
            </h2>
            <p className="text-xs text-slate-400">
              Calculated from your Module 3 transaction history (+{symbol} {totalIncome.toLocaleString()} income − {symbol} {totalExpense.toLocaleString()} spend)
            </p>
          </div>

          {monthlySurplus === 0 && (
            <Link
              href="/transactions"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-amber-400 bg-amber-500/10 border border-amber-500/20 hover:bg-amber-500/20"
            >
              <span>Add Transactions to compute surplus</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          )}
        </div>
      </div>

      {/* Goals List */}
      {loading ? (
        <div className="flex items-center justify-center min-h-[300px]">
          <Loader2 className="h-8 w-8 text-cyan-400 animate-spin" />
        </div>
      ) : goals.length === 0 ? (
        <div className="text-center py-16 px-4 rounded-3xl bg-slate-900/40 border border-slate-800 space-y-4">
          <Target className="h-12 w-12 text-slate-600 mx-auto" />
          <h3 className="text-lg font-bold text-white">No Financial Goals Set Yet</h3>
          <p className="text-slate-400 text-xs max-w-sm mx-auto">
            Create your first savings target (e.g. Emergency Fund, Laptop, House, Car) to calculate required monthly savings and feasibility.
          </p>
          <button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center gap-2 py-2.5 px-5 rounded-xl text-xs font-semibold text-slate-950 bg-cyan-400 hover:bg-cyan-300"
          >
            <PlusCircle className="h-4 w-4" />
            <span>Create First Goal</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {goals.map((goal) => (
            <GoalCard
              key={goal.id}
              goal={goal}
              monthlySurplus={monthlySurplus}
              currencySymbol={symbol}
              onUpdate={fetchGoals}
              onDelete={handleDeleteGoal}
              onReorder={handleReorderGoal}
            />
          ))}
        </div>
      )}

      {/* Modal */}
      <AddGoalModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={fetchGoals}
        currencySymbol={symbol}
      />
    </div>
  );
}
