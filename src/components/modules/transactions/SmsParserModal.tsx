"use client";

import { useState } from "react";
import { MessageSquare, CheckCircle, AlertCircle, Loader2, X } from "lucide-react";
import { EXPENSE_CATEGORIES } from "@/lib/constants";

interface ParsedRow {
  date: string;
  description: string;
  amount: number;
  type: "debit" | "credit";
  category: string;
  paymentMethod: string;
  source: string;
}

interface SmsParserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  currencySymbol: string;
}

export default function SmsParserModal({
  isOpen,
  onClose,
  onSuccess,
  currencySymbol,
}: SmsParserModalProps) {
  const [smsText, setSmsText] = useState("");
  const [parsing, setParsing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const sampleSmsText = `Spent Rs. 1450.00 at Swiggy on 24-Jul-2026 via HDFC Credit Card.
Rs 2800.00 debited from A/c xx4912 for Shell Petrol on 22-Jul-2026.
Received Rs. 85000.00 credited to A/c xx1092 from TechCorp Salary on 01-Jul-2026.
Paid Rs 3200 at Nature Basket Supermarket on 20-Jul-2026.`;

  const handleParseSms = async () => {
    if (!smsText.trim()) {
      setError("Please paste bank SMS text to parse.");
      return;
    }

    setParsing(true);
    setError(null);

    try {
      const res = await fetch("/api/transactions/parse-sms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ smsText }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to parse SMS text.");
      } else {
        setParsedRows(data.rows || []);
      }
    } catch (err: any) {
      setError("An unexpected error occurred.");
    } finally {
      setParsing(false);
    }
  };

  const handleRowChange = (index: number, field: keyof ParsedRow, value: any) => {
    const updated = [...parsedRows];
    (updated[index] as any)[field] = value;
    setParsedRows(updated);
  };

  const handleRemoveRow = (index: number) => {
    setParsedRows(parsedRows.filter((_, i) => i !== index));
  };

  const handleSaveConfirmedRows = async () => {
    if (parsedRows.length === 0) return;

    setSaving(true);
    try {
      const res = await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsedRows),
      });

      if (res.ok) {
        onSuccess();
        onClose();
        setParsedRows([]);
        setSmsText("");
      } else {
        setError("Failed to save confirmed SMS transactions.");
      }
    } catch (err) {
      setError("Failed to save transactions.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-800 bg-slate-950/40">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center">
              <MessageSquare className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Paste Bank SMS Parser</h2>
              <p className="text-xs text-slate-400">Regex + LLM auto-categorization fallback engine</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1">
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs">
              {error}
            </div>
          )}

          {parsedRows.length === 0 ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-medium text-slate-300">
                  Paste Bank SMS Text (One or multiple SMS lines):
                </label>
                <button
                  type="button"
                  onClick={() => setSmsText(sampleSmsText)}
                  className="text-xs text-cyan-400 hover:text-cyan-300 font-semibold"
                >
                  Insert Sample SMS Text
                </button>
              </div>

              <textarea
                rows={6}
                value={smsText}
                onChange={(e) => setSmsText(e.target.value)}
                placeholder="e.g. Spent Rs 1450.00 at Swiggy on 24-Jul-2026..."
                className="w-full p-4 bg-slate-950 border border-slate-800 rounded-2xl text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 text-xs font-mono"
              />

              <div className="flex justify-end">
                <button
                  onClick={handleParseSms}
                  disabled={parsing}
                  className="inline-flex items-center gap-2 py-2.5 px-6 rounded-xl font-semibold text-slate-950 bg-cyan-400 hover:bg-cyan-300 disabled:opacity-50 text-xs shadow-lg shadow-cyan-500/20 transition-all"
                >
                  {parsing ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Parsing SMS Text...</span>
                    </>
                  ) : (
                    <>
                      <MessageSquare className="h-4 w-4" />
                      <span>Parse SMS & Auto-Categorize</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : (
            /* Editable Preview Table */
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1.5">
                  <CheckCircle className="h-4 w-4" />
                  Parsed {parsedRows.length} SMS transactions (Review & Edit before saving):
                </span>
              </div>

              <div className="border border-slate-800 rounded-xl overflow-x-auto max-h-[350px]">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-950 text-slate-400 border-b border-slate-800">
                      <th className="p-2.5">Date</th>
                      <th className="p-2.5">Merchant / Description</th>
                      <th className="p-2.5">Type</th>
                      <th className="p-2.5">Category</th>
                      <th className="p-2.5 text-right">Amount</th>
                      <th className="p-2.5 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {parsedRows.map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-800/30">
                        <td className="p-2">
                          <input
                            type="date"
                            value={row.date}
                            onChange={(e) => handleRowChange(idx, "date", e.target.value)}
                            className="bg-slate-950 border border-slate-800 rounded p-1 text-white text-xs w-28"
                          />
                        </td>
                        <td className="p-2">
                          <input
                            type="text"
                            value={row.description}
                            onChange={(e) => handleRowChange(idx, "description", e.target.value)}
                            className="bg-slate-950 border border-slate-800 rounded p-1 text-white text-xs w-full"
                          />
                        </td>
                        <td className="p-2">
                          <select
                            value={row.type}
                            onChange={(e) => handleRowChange(idx, "type", e.target.value)}
                            className="bg-slate-950 border border-slate-800 rounded p-1 text-white text-xs"
                          >
                            <option value="debit">Debit (-)</option>
                            <option value="credit">Credit (+)</option>
                          </select>
                        </td>
                        <td className="p-2">
                          <select
                            value={row.category}
                            onChange={(e) => handleRowChange(idx, "category", e.target.value)}
                            className="bg-slate-950 border border-slate-800 rounded p-1 text-white text-xs"
                          >
                            {EXPENSE_CATEGORIES.map((cat) => (
                              <option key={cat} value={cat}>
                                {cat}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="p-2 text-right font-semibold text-white">
                          <input
                            type="number"
                            step="0.01"
                            value={row.amount}
                            onChange={(e) => handleRowChange(idx, "amount", parseFloat(e.target.value))}
                            className="bg-slate-950 border border-slate-800 rounded p-1 text-white text-xs w-20 text-right"
                          />
                        </td>
                        <td className="p-2 text-center">
                          <button
                            onClick={() => handleRemoveRow(idx)}
                            className="text-rose-400 hover:text-rose-300 p-1"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-between items-center pt-2">
                <button
                  onClick={() => setParsedRows([])}
                  className="text-xs text-slate-400 hover:text-white"
                >
                  Clear & Paste Different Text
                </button>
                <button
                  onClick={handleSaveConfirmedRows}
                  disabled={saving}
                  className="inline-flex items-center gap-2 py-2.5 px-6 rounded-xl font-semibold text-slate-950 bg-emerald-400 hover:bg-emerald-300 disabled:opacity-50 text-xs shadow-lg shadow-emerald-500/20"
                >
                  {saving ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Saving to Database...</span>
                    </>
                  ) : (
                    <span>Confirm & Save {parsedRows.length} Transactions</span>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
