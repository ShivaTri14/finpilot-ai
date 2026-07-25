"use client";

import { useState } from "react";
import { Trash2, FileText, ArrowDownLeft, ArrowUpRight, Tag, Search, Filter } from "lucide-react";
import { EXPENSE_CATEGORIES } from "@/lib/constants";

export interface TransactionItem {
  id: string;
  amount: number;
  type: string;
  category: string;
  date: string;
  description: string;
  paymentMethod: string;
  source: string;
}

interface TransactionTableProps {
  transactions: TransactionItem[];
  currencySymbol: string;
  onDelete: (id: string) => void;
}

export default function TransactionTable({
  transactions,
  currencySymbol,
  onDelete,
}: TransactionTableProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");

  const filtered = transactions.filter((tx) => {
    const matchesSearch =
      tx.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tx.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tx.paymentMethod.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCat = selectedCategory === "All" || tx.category === selectedCategory;

    return matchesSearch && matchesCat;
  });

  const getSourceBadge = (source: string) => {
    switch (source) {
      case "PDF_UPLOAD":
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-purple-500/10 text-purple-400 border border-purple-500/20">
            PDF Bank Statement
          </span>
        );
      case "SMS_PASTE":
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            SMS Paste
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-800 text-slate-400 border border-slate-700">
            Manual Entry
          </span>
        );
    }
  };

  return (
    <div className="space-y-4">
      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search payee or note..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-xs"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="h-4 w-4 text-slate-500 shrink-0" />
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full sm:w-48 px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/50 cursor-pointer"
          >
            <option value="All">All Categories ({transactions.length})</option>
            {EXPENSE_CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Table Frame */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/60 text-slate-400 font-semibold uppercase tracking-wider">
                <th className="py-3.5 px-4">Date</th>
                <th className="py-3.5 px-4">Description / Payee</th>
                <th className="py-3.5 px-4">Category</th>
                <th className="py-3.5 px-4">Source</th>
                <th className="py-3.5 px-4 text-right">Amount</th>
                <th className="py-3.5 px-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500 font-medium">
                    No transactions found. Add a transaction or seed demo data to get started.
                  </td>
                </tr>
              ) : (
                filtered.map((tx) => {
                  const formattedDate = new Date(tx.date).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  });

                  const isDebit = tx.type === "debit";

                  return (
                    <tr key={tx.id} className="hover:bg-slate-800/30 transition-colors group">
                      <td className="py-3.5 px-4 text-slate-300 font-medium whitespace-nowrap">
                        {formattedDate}
                      </td>

                      <td className="py-3.5 px-4 font-semibold text-white">
                        <div className="flex items-center gap-2">
                          <div
                            className={`h-7 w-7 rounded-lg flex items-center justify-center shrink-0 ${
                              isDebit ? "bg-rose-500/10 text-rose-400" : "bg-emerald-500/10 text-emerald-400"
                            }`}
                          >
                            {isDebit ? (
                              <ArrowDownLeft className="h-4 w-4" />
                            ) : (
                              <ArrowUpRight className="h-4 w-4" />
                            )}
                          </div>
                          <div>
                            <p className="text-slate-100">{tx.description}</p>
                            <p className="text-[10px] text-slate-500 font-normal">{tx.paymentMethod}</p>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 text-slate-300 text-[11px] font-medium">
                          <Tag className="h-3 w-3 text-emerald-400" />
                          {tx.category}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">{getSourceBadge(tx.source)}</td>

                      <td
                        className={`py-3.5 px-4 text-right font-bold whitespace-nowrap text-sm ${
                          isDebit ? "text-slate-200" : "text-emerald-400"
                        }`}
                      >
                        {isDebit ? "-" : "+"} {currencySymbol}{" "}
                        {tx.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>

                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <button
                          onClick={() => onDelete(tx.id)}
                          title="Delete Transaction"
                          className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors opacity-80 group-hover:opacity-100"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
