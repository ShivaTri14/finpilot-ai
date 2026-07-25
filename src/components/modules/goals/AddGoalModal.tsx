"use client";

import { useState } from "react";
import { GOAL_TEMPLATES, GoalTemplate } from "@/lib/goal-templates";
import { X, Target, Sparkles, Plus, Loader2, DollarSign, Calendar } from "lucide-react";

interface AddGoalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  currencySymbol: string;
}

export default function AddGoalModal({
  isOpen,
  onClose,
  onSuccess,
  currencySymbol,
}: AddGoalModalProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<GoalTemplate | null>(null);

  const [name, setName] = useState("");
  const [targetAmount, setTargetAmount] = useState("");
  const [currentSavings, setCurrentSavings] = useState("");
  const [deadline, setDeadline] = useState("");
  const [category, setCategory] = useState("Custom");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSelectTemplate = (template: GoalTemplate) => {
    setSelectedTemplate(template);
    setName(template.name);
    setTargetAmount(template.defaultTarget.toString());
    setCategory(template.category);

    const defaultDate = new Date();
    defaultDate.setMonth(defaultDate.getMonth() + template.defaultMonths);
    setDeadline(defaultDate.toISOString().split("T")[0]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const numTarget = parseFloat(targetAmount);
    const numCurrent = parseFloat(currentSavings || "0");

    if (!name.trim()) {
      setError("Please enter a goal name.");
      return;
    }

    if (isNaN(numTarget) || numTarget <= 0) {
      setError("Please enter a valid target amount.");
      return;
    }

    if (!deadline) {
      setError("Please select a target deadline date.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/goals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          targetAmount: numTarget,
          currentSavings: isNaN(numCurrent) ? 0 : numCurrent,
          deadline,
          category,
        }),
      });

      if (res.ok) {
        // Reset
        setName("");
        setTargetAmount("");
        setCurrentSavings("");
        setDeadline("");
        setSelectedTemplate(null);
        onSuccess();
        onClose();
      } else {
        const data = await res.json();
        setError(data.error || "Failed to create goal.");
      }
    } catch (err) {
      setError("An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-800 bg-slate-950/40">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center">
              <Target className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Create Financial Goal</h2>
              <p className="text-xs text-slate-400">Select a preset template or configure a custom target</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 space-y-6 overflow-y-auto flex-1">
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs">
              {error}
            </div>
          )}

          {/* Quick-add Template Grid */}
          <div className="space-y-3">
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
              Quick-Add Preset Templates:
            </label>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {GOAL_TEMPLATES.map((tmpl) => {
                const isSelected = selectedTemplate?.category === tmpl.category;
                return (
                  <button
                    key={tmpl.category}
                    type="button"
                    onClick={() => handleSelectTemplate(tmpl)}
                    className={`p-3 rounded-2xl border text-left transition-all flex flex-col justify-between ${
                      isSelected
                        ? "bg-cyan-500/10 border-cyan-400 text-white shadow-md shadow-cyan-500/10"
                        : "bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-white"
                    }`}
                  >
                    <div>
                      <span className="text-xs font-bold block">{tmpl.name}</span>
                      <span className="text-[10px] text-slate-500 block mt-0.5">
                        {currencySymbol} {(tmpl.defaultTarget / 1000).toFixed(0)}k • {tmpl.defaultMonths}m
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Goal Input Form */}
          <form onSubmit={handleSubmit} className="space-y-4 pt-2 border-t border-slate-800">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">Goal Name</label>
              <input
                type="text"
                required
                placeholder="e.g. Dream Apartment Down Payment"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs focus:ring-2 focus:ring-cyan-500/50"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">Target Amount ({currencySymbol})</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="0.00"
                  value={targetAmount}
                  onChange={(e) => setTargetAmount(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs focus:ring-2 focus:ring-cyan-500/50"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">Initial / Current Savings ({currencySymbol})</label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={currentSavings}
                  onChange={(e) => setCurrentSavings(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs focus:ring-2 focus:ring-cyan-500/50"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">Target Deadline</label>
                <input
                  type="date"
                  required
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs focus:ring-2 focus:ring-cyan-500/50"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">Category</label>
                <input
                  type="text"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs focus:ring-2 focus:ring-cyan-500/50"
                />
              </div>
            </div>

            <div className="pt-3 flex justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="py-2.5 px-4 rounded-xl text-xs font-medium text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="inline-flex items-center gap-2 py-2.5 px-6 rounded-xl font-semibold text-slate-950 bg-cyan-400 hover:bg-cyan-300 disabled:opacity-50 text-xs shadow-lg shadow-cyan-500/20"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <span>Create Goal Plan</span>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
