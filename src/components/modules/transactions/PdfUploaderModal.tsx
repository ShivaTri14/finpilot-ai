"use client";

import { useState } from "react";
import { Upload, FileText, CheckCircle, AlertCircle, Loader2, X, Plus, Terminal } from "lucide-react";
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

interface PdfUploaderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  currencySymbol: string;
}

export default function PdfUploaderModal({
  isOpen,
  onClose,
  onSuccess,
  currencySymbol,
}: PdfUploaderModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [parsing, setParsing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [debugData, setDebugData] = useState<{ rawTextPreview: string; rawTextLength: number; charCodeDump: any[] } | null>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setError(null);
      setDebugData(null);
    }
  };

  const handleParsePdf = async () => {
    if (!file) {
      setError("Please select a PDF bank statement file first.");
      return;
    }

    setParsing(true);
    setError(null);
    setDebugData(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      // Append ?debug=1 to request debug payload
      const res = await fetch("/api/transactions/parse-pdf?debug=1", {
        method: "POST",
        body: formData,
      });

      if (res.status === 504) {
        setError("Server took too long processing this file — try a smaller statement or contact support.");
        return;
      }

      let data: any = {};
      const contentType = res.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        try {
          data = await res.json();
        } catch (jsonErr) {
          setError("Failed to parse server response.");
          return;
        }
      } else {
        setError("Server returned invalid response format. Please try again.");
        return;
      }

      if (data.isDebug) {
        console.log("[DEBUG MODE RAW TEXT PREVIEW]:", data.rawTextPreview);
        console.log("[DEBUG MODE CHAR CODE DUMP]:", data.charCodeDump);
        setDebugData({
          rawTextPreview: data.rawTextPreview,
          rawTextLength: data.rawTextLength,
          charCodeDump: data.charCodeDump,
        });
      }

      if (!res.ok) {
        setError(data.error || "Failed to parse PDF file.");
      } else {
        const rows = data.rows || [];
        if (rows.length === 0) {
          setError("No transactions could be extracted from this file. This may be an unsupported format or a scanned/image-only PDF — see debug dump below.");
        } else {
          setParsedRows(rows);
        }
      }
    } catch (err: any) {
      setError("Server took too long processing this file — try a smaller statement or contact support.");
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
        setFile(null);
        setDebugData(null);
      } else {
        setError("Failed to save confirmed transactions.");
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
            <div className="h-9 w-9 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Bank Statement PDF Extraction (Debug Mode Active)</h2>
              <p className="text-xs text-slate-400">Extract, review, & confirm transaction rows before saving</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1">
          {error && (
            <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0 text-amber-400" />
              <span>{error}</span>
            </div>
          )}

          {debugData && (
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between text-xs font-bold text-cyan-400">
                <span className="flex items-center gap-1.5">
                  <Terminal className="h-4 w-4" />
                  RAW DEBUG PREVIEW ({debugData.rawTextLength} chars extracted)
                </span>
                <span className="text-slate-500">First 3,000 chars visible</span>
              </div>
              <textarea
                readOnly
                value={debugData.rawTextPreview}
                className="w-full h-40 bg-black/80 border border-slate-800 rounded-xl p-3 font-mono text-[11px] text-slate-300 focus:outline-none"
              />
              <div className="text-[10px] text-slate-500">
                First 10 Char Codes: {JSON.stringify(debugData.charCodeDump.slice(0, 10))}
              </div>
            </div>
          )}

          {parsedRows.length === 0 ? (
            <div className="space-y-4">
              <div className="border-2 border-dashed border-slate-800 hover:border-purple-500/40 rounded-2xl p-8 text-center bg-slate-950/40 transition-colors">
                <Upload className="h-10 w-10 text-purple-400 mx-auto mb-3" />
                <p className="text-sm font-semibold text-white">Upload Bank Statement (.pdf)</p>
                <p className="text-xs text-slate-400 mt-1">PhonePe, HDFC, ICICI, SBI, Axis, or standard bank statement PDFs</p>
                <input
                  type="file"
                  accept=".pdf"
                  onChange={handleFileChange}
                  className="mt-4 block w-full text-xs text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-purple-500/10 file:text-purple-400 hover:file:bg-purple-500/20 cursor-pointer"
                />
              </div>

              {file && (
                <div className="flex justify-end">
                  <button
                    onClick={handleParsePdf}
                    disabled={parsing}
                    className="inline-flex items-center gap-2 py-2.5 px-6 rounded-xl font-semibold text-slate-950 bg-purple-400 hover:bg-purple-300 disabled:opacity-50 text-xs shadow-lg shadow-purple-500/20 transition-all"
                  >
                    {parsing ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Parsing Statement...</span>
                      </>
                    ) : (
                      <>
                        <FileText className="h-4 w-4" />
                        <span>Extract Transactions (Debug)</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          ) : (
            /* Editable Preview Table */
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1.5">
                  <CheckCircle className="h-4 w-4" />
                  Extracted {parsedRows.length} transactions (Review & Edit before saving):
                </span>
              </div>

              <div className="border border-slate-800 rounded-xl overflow-x-auto max-h-[350px]">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-950 text-slate-400 border-b border-slate-800">
                      <th className="p-2.5">Date</th>
                      <th className="p-2.5">Description</th>
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
                  Clear & Upload Different File
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
