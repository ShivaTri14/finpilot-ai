import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || !(session.user as any).id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const { searchParams } = new URL(req.url);
    const period = searchParams.get("period") || "monthly"; // daily | weekly | monthly | yearly

    const transactions = await prisma.transaction.findMany({
      where: { userId },
      orderBy: { date: "asc" },
    });

    const spendingLimits = await prisma.spendingLimit.findMany({
      where: { userId },
    });

    const categorySpend: Record<string, number> = {};
    const chartDataMap: Record<string, { label: string; income: number; expense: number }> = {};

    transactions.forEach((tx) => {
      const isDebit = tx.type === "debit";
      const txDate = new Date(tx.date);

      // Category total tracking
      if (isDebit) {
        categorySpend[tx.category] = (categorySpend[tx.category] || 0) + tx.amount;
      }

      // Chart timeframe keying
      let key = "";
      if (period === "daily") {
        key = txDate.toISOString().split("T")[0]; // YYYY-MM-DD
      } else if (period === "weekly") {
        // Week number format
        const firstDayOfYear = new Date(txDate.getFullYear(), 0, 1);
        const pastDaysOfYear = (txDate.getTime() - firstDayOfYear.getTime()) / 86400000;
        const weekNum = Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
        key = `W${weekNum}-${txDate.getFullYear()}`;
      } else if (period === "yearly") {
        key = `${txDate.getFullYear()}`;
      } else {
        // monthly default
        key = txDate.toLocaleString("en-US", { month: "short", year: "numeric" });
      }

      if (!chartDataMap[key]) {
        chartDataMap[key] = { label: key, income: 0, expense: 0 };
      }

      if (isDebit) {
        chartDataMap[key].expense += tx.amount;
      } else {
        chartDataMap[key].income += tx.amount;
      }
    });

    const timeSeries = Object.values(chartDataMap);

    // Overspending alerts evaluation
    const alerts = spendingLimits
      .map((limitObj) => {
        const actualSpend = categorySpend[limitObj.category] || 0;
        const isExceeded = actualSpend > limitObj.limit;
        const excess = actualSpend - limitObj.limit;
        const percentage = limitObj.limit > 0 ? Math.round((actualSpend / limitObj.limit) * 100) : 0;

        return {
          id: limitObj.id,
          category: limitObj.category,
          limit: limitObj.limit,
          actualSpend,
          isExceeded,
          excess,
          percentage,
        };
      })
      .filter((alert) => alert.isExceeded);

    // Category breakdown list
    const totalExpenses = Object.values(categorySpend).reduce((a, b) => a + b, 0);
    const categoryBreakdown = Object.entries(categorySpend).map(([category, amount]) => ({
      category,
      amount,
      percentage: totalExpenses > 0 ? Math.round((amount / totalExpenses) * 100) : 0,
    }));

    return NextResponse.json({
      timeSeries,
      categoryBreakdown,
      spendingLimits,
      alerts,
      totalExpenses,
    });
  } catch (error: any) {
    console.error("GET /api/transactions/summary error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
