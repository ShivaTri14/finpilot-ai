"use client";

import { useState } from "react";
import {
  CheckCircle,
  AlertTriangle,
  XCircle,
  Calendar,
  PlusCircle,
  Trash2,
  TrendingUp,
  ArrowUp,
  ArrowDown,
  Loader2,
} from "lucide-react";

export interface CalculatedGoal {
  id: string;
  name: string;
  targetAmount: number;
  currentSavings: number;
  deadline: string;
  category: string;
  priority: number;
  monthsRemaining: number;
  requiredMonthlySavings: number;
  progressPercent: number;
  status: "ON_TRACK" | "AT_RISK" | "UNREALISTIC";
  projectedDate: string;
}

interface GoalCardProps {
  goal: CalculatedGoal;
  monthlySurplus: number;
  currencySymbol: string;
  onUpdate: () => void;
  onDelete: (id: string) => void;
  onReorder?: (id: string, direction: "up" | "down") => void;
}

export default function GoalCard({
  goal,
  monthlySurplus,
  currencySymbol,
  onUpdate,
  onDelete,
  onReorder,
}: GoalCardProps) {
  const [depositing, setDepositing] = useState(false);
  const [depositAmount, setDepositAmount] = useState("");
  const [showDepositInput, setShowDepositInput] = useState(false);

  const deadlineFormatted = new Date(goal.deadline).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  const getStatusBadge = () => {
    switch (goal.status) {
      case "ON_TRACK":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <CheckCircle className="h-3.5 w-3.5" />
            On Track
          </span>
        );
      case "AT_RISK":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <AlertTriangle className="h-3.5 w-3.5" />
            At Risk
          </span>
        );
      case "UNREALISTIC":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <XCircle className="h-3.5 w-3.5" />
            Unrealistic
          </span>
        );
    }
  };

  const handleDeposit = async () => {
    const val = parseFloat(depositAmount);
    if (isNaN(val) || val <= 0) return;

    setDepositing(true);
    try {
      const res = await fetch("/api/goals", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: goal.id, depositAmount: val }),
      });
      if (res.ok) {
        setDepositAmount("");
        setShowDepositInput(false);
        onUpdate();
      }
    } catch (err) {
      console.error("Deposit error:", err);
    } finally {
      setDepositing(false);
    }
  };

  return (
    <div className="rounded-3xl bg-slate-900/80 border border-slate-800 p-6 space-y-5 shadow-xl hover:border-slate-700 transition-all">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Priority #{goal.priority}
            </span>
            <span className="text-slate-600">•</span>
            <span className="text-xs text-slate-400">{goal.category}</span>
          </div>
          <h3 className="text-xl font-bold text-white mt-1">{goal.name}</h3>
        </div>

        <div className="flex items-center gap-2">
          {getStatusBadge()}

          {onReorder && (
            <div className="flex items-center gap-1">
              <button
                onClick={() => onReorder(goal.id, "up")}
                className="p-1 rounded bg-slate-950 text-slate-400 hover:text-white"
                title="Move Priority Up"
              >
                <ArrowUp className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => onReorder(goal.id, "down")}
                className="p-1 rounded bg-slate-950 text-slate-400 hover:text-white"
                title="Move Priority Down"
              >
                <ArrowDown className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          <button
            onClick={() => onDelete(goal.id)}
            className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Amounts & Progress Bar */}
      <div className="space-y-2">
        <div className="flex items-baseline justify-between text-xs font-semibold">
          <span className="text-slate-300">
            Savings: <strong className="text-white text-sm">{currencySymbol} {goal.currentSavings.toLocaleString()}</strong>
          </span>
          <span className="text-slate-400">
            Target: <strong className="text-emerald-400 text-sm">{currencySymbol} {goal.targetAmount.toLocaleString()}</strong>
          </span>
        </div>

        <div className="h-3 w-full bg-slate-950 rounded-full overflow-hidden border border-slate-800">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              goal.status === "ON_TRACK"
                ? "bg-emerald-400"
                : goal.status === "AT_RISK"
                ? "bg-amber-400"
                : "bg-rose-400"
            }`}
            style={{ width: `${goal.progressPercent}%` }}
          />
        </div>

        <div className="flex justify-between text-[11px] text-slate-400">
          <span>{goal.progressPercent}% Completed</span>
          <span>{currencySymbol} {(goal.targetAmount - goal.currentSavings).toLocaleString()} Remaining</span>
        </div>
      </div>

      {/* Plan Math Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-4 rounded-2xl bg-slate-950/60 border border-slate-800 text-xs">
        <div>
          <span className="text-slate-500 text-[10px] uppercase font-semibold block">Required Monthly Savings</span>
          <span className="font-extrabold text-white text-sm">
            {currencySymbol} {goal.requiredMonthlySavings.toLocaleString()} / mo
          </span>
        </div>

        <div>
          <span className="text-slate-500 text-[10px] uppercase font-semibold block">Monthly Surplus</span>
          <span className="font-bold text-cyan-400 text-sm">
            {currencySymbol} {monthlySurplus.toLocaleString()} / mo
          </span>
        </div>

        <div className="col-span-2 sm:col-span-1">
          <span className="text-slate-500 text-[10px] uppercase font-semibold block">Projected Completion</span>
          <span className="font-semibold text-slate-200">{goal.projectedDate}</span>
        </div>
      </div>

      {/* Quick Deposit Actions */}
      <div className="pt-2 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 text-xs text-slate-400">
          <Calendar className="h-3.5 w-3.5 text-emerald-400" />
          <span>Deadline: {deadlineFormatted} ({goal.monthsRemaining} months left)</span>
        </div>

        {showDepositInput ? (
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <input
              type="number"
              placeholder="Deposit amount"
              value={depositAmount}
              onChange={(e) => setDepositAmount(e.target.value)}
              className="px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs w-32 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
            <button
              onClick={handleDeposit}
              disabled={depositing}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-950 bg-emerald-400 hover:bg-emerald-300 disabled:opacity-50"
            >
              {depositing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Save Deposit"}
            </button>
            <button
              onClick={() => setShowDepositInput(false)}
              className="text-xs text-slate-400 hover:text-white px-1"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowDepositInput(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/20 transition-all"
          >
            <PlusCircle className="h-3.5 w-3.5" />
            <span>Deposit Savings</span>
          </button>
        )}
      </div>
    </div>
  );
}
