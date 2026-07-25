"use client";

import { useState } from "react";
import { X, Tag, Save, Loader2, CheckCircle, Square } from "lucide-react";
import { EXPENSE_CATEGORIES } from "@/lib/constants";

interface EditCategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  transactionId: string;
  merchantDescription: string;
  currentCategory: string;
}

export default function EditCategoryModal({
  isOpen,
  onClose,
  onSuccess,
  transactionId,
  merchantDescription,
  currentCategory,
}: EditCategoryModalProps) {
  const [category, setCategory] = useState(currentCategory);
  const [rememberRule, setRememberRule] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (rememberRule) {
        // Save Merchant Override rule & auto-update past occurrences
        await fetch("/api/merchant-overrides", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            merchant: merchantDescription,
            category,
            updatePast: true,
          }),
        });
      } else {
        // Single transaction update
        await fetch("/api/transactions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: transactionId,
            category,
          }),
        });
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError("Failed to update category.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl">
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-800 bg-slate-950/40">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <Tag className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Re-Categorize Merchant</h2>
              <p className="text-xs text-slate-400">Override category for "{merchantDescription}"</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">New Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs cursor-pointer focus:ring-2 focus:ring-emerald-500/50"
            >
              {EXPENSE_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          <div
            onClick={() => setRememberRule(!rememberRule)}
            className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-950 border border-slate-800 cursor-pointer hover:border-slate-700 transition-colors"
          >
            {rememberRule ? (
              <CheckCircle className="h-4 w-4 text-emerald-400 mt-0.5 shrink-0" />
            ) : (
              <Square className="h-4 w-4 text-slate-500 mt-0.5 shrink-0" />
            )}
            <div className="text-xs">
              <p className="font-semibold text-white">Remember correction for this merchant</p>
              <p className="text-slate-400 text-[11px]">
                System will automatically apply "{category}" to all past and future transactions for "{merchantDescription}".
              </p>
            </div>
          </div>

          <div className="pt-2 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="py-2 px-4 rounded-xl text-xs font-medium text-slate-400 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-2 py-2 px-6 rounded-xl font-semibold text-slate-950 bg-emerald-400 hover:bg-emerald-300 disabled:opacity-50 text-xs shadow-lg shadow-emerald-500/20"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  <span>Save Categorization Rule</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
