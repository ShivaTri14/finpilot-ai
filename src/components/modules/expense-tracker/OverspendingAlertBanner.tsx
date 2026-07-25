"use client";

import { AlertTriangle, TrendingUp, ShieldAlert, ArrowRight } from "lucide-react";

export interface OverspendingAlert {
  id: string;
  category: string;
  limit: number;
  actualSpend: number;
  isExceeded: boolean;
  excess: number;
  percentage: number;
}

interface OverspendingAlertBannerProps {
  alerts: OverspendingAlert[];
  currencySymbol: string;
}

export default function OverspendingAlertBanner({
  alerts,
  currencySymbol,
}: OverspendingAlertBannerProps) {
  if (alerts.length === 0) return null;

  return (
    <div className="rounded-2xl bg-rose-500/10 border border-rose-500/30 p-5 space-y-3 shadow-lg shadow-rose-500/5 animate-in fade-in duration-300">
      <div className="flex items-center gap-2 text-rose-400 font-bold text-sm">
        <AlertTriangle className="h-5 w-5 shrink-0" />
        <span>Overspending Alert ({alerts.length} Categories Exceeded Limits)</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {alerts.map((alert) => (
          <div
            key={alert.id}
            className="p-3.5 rounded-xl bg-slate-950/80 border border-rose-500/20 space-y-1.5"
          >
            <div className="flex items-center justify-between">
              <span className="font-bold text-white text-xs">{alert.category}</span>
              <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-400 border border-rose-500/30">
                {alert.percentage}% of Limit
              </span>
            </div>

            <div className="text-xs text-slate-300">
              Spend: <span className="font-semibold text-rose-400">{currencySymbol} {alert.actualSpend.toLocaleString()}</span> / Limit: {currencySymbol} {alert.limit.toLocaleString()}
            </div>

            <p className="text-[11px] text-rose-400 font-medium pt-0.5">
              Exceeded by +{currencySymbol} {alert.excess.toLocaleString()}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
