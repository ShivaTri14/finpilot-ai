"use client";

import { useSession } from "next-auth/react";
import { useState, useEffect } from "react";
import {
  PlusCircle,
  Sparkles,
  Receipt,
  FileText,
  MessageSquare,
  Loader2,
  ShieldAlert,
  BarChart3,
} from "lucide-react";
import ManualEntryModal from "@/components/modules/transactions/ManualEntryModal";
import PdfUploaderModal from "@/components/modules/transactions/PdfUploaderModal";
import SmsParserModal from "@/components/modules/transactions/SmsParserModal";
import TransactionTable, { TransactionItem } from "@/components/modules/transactions/TransactionTable";
import ExpenseCharts from "@/components/modules/expense-tracker/ExpenseCharts";
import SpendingLimitsModal from "@/components/modules/expense-tracker/SpendingLimitsModal";
import OverspendingAlertBanner, { OverspendingAlert } from "@/components/modules/expense-tracker/OverspendingAlertBanner";

export default function TransactionsPage() {
  const { data: session } = useSession();
  const [activeTab, setActiveTab] = useState<"manual" | "pdf" | "sms" | "analytics">("manual");

  const [transactions, setTransactions] = useState<TransactionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);

  // Modals state
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);
  const [isSmsModalOpen, setIsSmsModalOpen] = useState(false);
  const [isLimitsModalOpen, setIsLimitsModalOpen] = useState(false);

  // Analytics & Alerts state
  const [period, setPeriod] = useState<"daily" | "weekly" | "monthly" | "yearly">("monthly");
  const [timeSeries, setTimeSeries] = useState<any[]>([]);
  const [categoryBreakdown, setCategoryBreakdown] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<OverspendingAlert[]>([]);

  const currencySymbolMap: Record<string, string> = {
    INR: "₹",
    USD: "$",
    EUR: "€",
    GBP: "£",
  };

  const userCurrency = (session?.user as any)?.currency || "INR";
  const symbol = currencySymbolMap[userCurrency] || "₹";

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/transactions");
      const data = await res.json();
      if (res.ok && data.transactions) {
        setTransactions(data.transactions);
      }
    } catch (err) {
      console.error("Failed to load transactions", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchSummaryAnalytics = async (selectedPeriod = period) => {
    try {
      const res = await fetch(`/api/transactions/summary?period=${selectedPeriod}`);
      const data = await res.json();
      if (res.ok) {
        setTimeSeries(data.timeSeries || []);
        setCategoryBreakdown(data.categoryBreakdown || []);
        setAlerts(data.alerts || []);
      }
    } catch (err) {
      console.error("Failed to load analytics summary", err);
    }
  };

  useEffect(() => {
    fetchTransactions();
    fetchSummaryAnalytics(period);
  }, [period]);

  const handleDataChange = () => {
    fetchTransactions();
    fetchSummaryAnalytics(period);
  };

  const handleSeedDemoData = async () => {
    setSeeding(true);
    try {
      const res = await fetch("/api/transactions/seed", { method: "POST" });
      if (res.ok) {
        handleDataChange();
      }
    } catch (err) {
      console.error("Failed to seed transactions", err);
    } finally {
      setSeeding(false);
    }
  };

  const handleDeleteTransaction = async (id: string) => {
    try {
      const res = await fetch(`/api/transactions?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        handleDataChange();
      }
    } catch (err) {
      console.error("Failed to delete transaction", err);
    }
  };

  // Metrics
  const totalIncome = transactions
    .filter((t) => t.type === "credit")
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpense = transactions
    .filter((t) => t.type === "debit")
    .reduce((sum, t) => sum + t.amount, 0);

  const netSurplus = totalIncome - totalExpense;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">AI Expense Tracker & Data Collection</h1>
          <p className="text-sm text-slate-400 mt-1">
            Auto-categorized expenses, PDF/SMS parsing, spending limits & real-time overspending alerts.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => setIsLimitsModalOpen(true)}
            className="inline-flex items-center gap-2 py-2.5 px-3.5 rounded-xl text-xs font-semibold text-amber-400 bg-amber-500/10 border border-amber-500/20 hover:bg-amber-500/20 transition-all"
          >
            <ShieldAlert className="h-4 w-4" />
            <span>Set Spending Limits</span>
          </button>

          <button
            onClick={handleSeedDemoData}
            disabled={seeding}
            className="inline-flex items-center gap-2 py-2.5 px-3.5 rounded-xl text-xs font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/20 disabled:opacity-50 transition-all"
          >
            {seeding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            <span>Quick Seed Demo Data</span>
          </button>

          <button
            onClick={() => setIsManualModalOpen(true)}
            className="inline-flex items-center gap-2 py-2.5 px-4 rounded-xl text-xs font-semibold text-slate-950 bg-emerald-400 hover:bg-emerald-300 transition-all shadow-lg shadow-emerald-500/20"
          >
            <PlusCircle className="h-4 w-4" />
            <span>Add Entry</span>
          </button>
        </div>
      </div>

      {/* Overspending Alert Banner (PRD Module 3 Feature) */}
      <OverspendingAlertBanner alerts={alerts} currencySymbol={symbol} />

      {/* Overview Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-lg">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Inflow / Income</p>
          <p className="text-2xl font-extrabold text-emerald-400 mt-1">
            + {symbol} {totalIncome.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-lg">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Outflow / Expense</p>
          <p className="text-2xl font-extrabold text-slate-100 mt-1">
            - {symbol} {totalExpense.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-lg">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Net Surplus</p>
          <p
            className={`text-2xl font-extrabold mt-1 ${
              netSurplus >= 0 ? "text-cyan-400" : "text-rose-400"
            }`}
          >
            {symbol} {netSurplus.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </p>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="border-b border-slate-800 flex gap-4 overflow-x-auto">
        <button
          onClick={() => setActiveTab("manual")}
          className={`flex items-center gap-2 pb-3 text-sm font-semibold border-b-2 transition-all whitespace-nowrap ${
            activeTab === "manual"
              ? "border-emerald-400 text-emerald-400"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <Receipt className="h-4 w-4" />
          <span>Unified Transactions ({transactions.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("analytics")}
          className={`flex items-center gap-2 pb-3 text-sm font-semibold border-b-2 transition-all whitespace-nowrap ${
            activeTab === "analytics"
              ? "border-emerald-400 text-emerald-400"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <BarChart3 className="h-4 w-4" />
          <span>Analytics & Recharts Graphs</span>
        </button>

        <button
          onClick={() => {
            setActiveTab("pdf");
            setIsPdfModalOpen(true);
          }}
          className={`flex items-center gap-2 pb-3 text-sm font-semibold border-b-2 transition-all whitespace-nowrap ${
            activeTab === "pdf"
              ? "border-emerald-400 text-emerald-400"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <FileText className="h-4 w-4" />
          <span>Bank Statement PDF Upload</span>
        </button>

        <button
          onClick={() => {
            setActiveTab("sms");
            setIsSmsModalOpen(true);
          }}
          className={`flex items-center gap-2 pb-3 text-sm font-semibold border-b-2 transition-all whitespace-nowrap ${
            activeTab === "sms"
              ? "border-emerald-400 text-emerald-400"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <MessageSquare className="h-4 w-4" />
          <span>Paste Bank SMS</span>
        </button>
      </div>

      {/* Active Tab Panel Content */}
      {activeTab === "manual" && (
        <div className="space-y-6">
          {loading ? (
            <div className="flex items-center justify-center min-h-[300px]">
              <Loader2 className="h-8 w-8 text-emerald-400 animate-spin" />
            </div>
          ) : (
            <TransactionTable
              transactions={transactions}
              currencySymbol={symbol}
              onDelete={handleDeleteTransaction}
            />
          )}
        </div>
      )}

      {activeTab === "analytics" && (
        <ExpenseCharts
          timeSeries={timeSeries}
          categoryBreakdown={categoryBreakdown}
          period={period}
          onPeriodChange={(p) => {
            setPeriod(p);
            fetchSummaryAnalytics(p);
          }}
          currencySymbol={symbol}
        />
      )}

      {/* Modals */}
      <ManualEntryModal
        isOpen={isManualModalOpen}
        onClose={() => setIsManualModalOpen(false)}
        onSuccess={handleDataChange}
      />

      <PdfUploaderModal
        isOpen={isPdfModalOpen}
        onClose={() => setIsPdfModalOpen(false)}
        onSuccess={handleDataChange}
        currencySymbol={symbol}
      />

      <SmsParserModal
        isOpen={isSmsModalOpen}
        onClose={() => setIsSmsModalOpen(false)}
        onSuccess={handleDataChange}
        currencySymbol={symbol}
      />

      <SpendingLimitsModal
        isOpen={isLimitsModalOpen}
        onClose={() => setIsLimitsModalOpen(false)}
        onSuccess={handleDataChange}
        currencySymbol={symbol}
      />
    </div>
  );
}
