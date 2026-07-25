"use client";

import { useState, useEffect } from "react";
import { X, ShieldAlert, Save, Loader2, DollarSign } from "lucide-react";
import { EXPENSE_CATEGORIES } from "@/lib/constants";

interface SpendingLimitItem {
  id: string;
  category: string;
  limit: number;
  period: string;
}

interface SpendingLimitsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  currencySymbol: string;
}

export default function SpendingLimitsModal({
  isOpen,
  onClose,
  onSuccess,
  currencySymbol,
}: SpendingLimitsModalProps) {
  const [category, setCategory] = useState<string>(EXPENSE_CATEGORIES[0]);
  const [limit, setLimit] = useState("");
  const [limitsList, setLimitsList] = useState<SpendingLimitItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchLimits = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/spending-limits");
      const data = await res.json();
      if (res.ok && data.spendingLimits) {
        setLimitsList(data.spendingLimits);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchLimits();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const numLimit = parseFloat(limit);
    if (isNaN(numLimit) || numLimit <= 0) {
      setError("Please enter a valid positive numerical limit.");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/spending-limits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category, limit: numLimit, period: "monthly" }),
      });

      if (res.ok) {
        setLimit("");
        await fetchLimits();
        onSuccess();
      } else {
        setError("Failed to save limit.");
      }
    } catch (err) {
      setError("An unexpected error occurred.");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteLimit = async (id: string) => {
    try {
      const res = await fetch(`/api/spending-limits?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        await fetchLimits();
        onSuccess();
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-800 bg-slate-950/40">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
              <ShieldAlert className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Set Category Spending Limits</h2>
              <p className="text-xs text-slate-400">Configure monthly spending caps & alert thresholds</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs">
              {error}
            </div>
          )}

          {/* Add Limit Form */}
          <form onSubmit={handleSubmit} className="space-y-4 p-4 rounded-2xl bg-slate-950/60 border border-slate-800">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs"
                >
                  {EXPENSE_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Monthly Limit ({currencySymbol})</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-xs">
                    {currencySymbol}
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="e.g. 5000"
                    value={limit}
                    onChange={(e) => setLimit(e.target.value)}
                    className="w-full pl-7 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full flex justify-center items-center gap-2 py-2 px-4 rounded-xl text-xs font-semibold text-slate-950 bg-amber-400 hover:bg-amber-300 disabled:opacity-50 transition-all shadow-md shadow-amber-500/20"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  <span>Set Limit Threshold</span>
                </>
              )}
            </button>
          </form>

          {/* Active Limits List */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Active Category Limits</h3>

            {loading ? (
              <div className="text-center py-4 text-xs text-slate-500">Loading limits...</div>
            ) : limitsList.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-4">No limits set yet.</p>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {limitsList.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs"
                  >
                    <span className="font-semibold text-white">{item.category}</span>
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-amber-400">
                        {currencySymbol} {item.limit.toLocaleString()} / mo
                      </span>
                      <button
                        type="button"
                        onClick={() => handleDeleteLimit(item.id)}
                        className="text-slate-500 hover:text-rose-400"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
