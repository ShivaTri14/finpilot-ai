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

    // 1. Pull user transactions to calculate average monthly surplus
    const transactions = await prisma.transaction.findMany({
      where: { userId },
      orderBy: { date: "asc" },
    });

    let totalIncome = 0;
    let totalExpense = 0;
    let earliestDate = new Date();

    if (transactions.length > 0) {
      earliestDate = new Date(transactions[0].date);
      transactions.forEach((tx) => {
        if (tx.type === "credit") totalIncome += tx.amount;
        if (tx.type === "debit") totalExpense += tx.amount;
      });
    }

    const now = new Date();
    const monthsSpan = Math.max(
      1,
      (now.getFullYear() - earliestDate.getFullYear()) * 12 +
        (now.getMonth() - earliestDate.getMonth()) +
        1
    );

    const netSurplus = totalIncome - totalExpense;
    const monthlySurplus = Math.max(0, netSurplus / monthsSpan);

    // 2. Fetch User Goals
    const rawGoals = await prisma.goal.findMany({
      where: { userId },
      orderBy: { priority: "asc" },
    });

    // 3. Compute feasibility & projected timeline per goal
    const goals = rawGoals.map((goal) => {
      const target = goal.targetAmount;
      const current = goal.currentSavings;
      const remaining = Math.max(0, target - current);
      const deadline = new Date(goal.deadline);

      // Months remaining until deadline
      const diffMs = deadline.getTime() - now.getTime();
      const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
      const monthsRemaining = Math.max(1, Math.ceil(diffDays / 30));

      // Required monthly savings math: (Target - Current) / monthsRemaining
      const requiredMonthlySavings = Math.round(remaining / monthsRemaining);

      // Progress percentage
      const progressPercent = target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0;

      // Status calculation: On Track / At Risk / Unrealistic
      let status: "ON_TRACK" | "AT_RISK" | "UNREALISTIC" = "ON_TRACK";
      if (current >= target) {
        status = "ON_TRACK";
      } else if (monthlySurplus <= 0) {
        status = "UNREALISTIC";
      } else {
        const ratio = requiredMonthlySavings / monthlySurplus;
        if (ratio <= 0.8) {
          status = "ON_TRACK";
        } else if (ratio <= 1.2) {
          status = "AT_RISK";
        } else {
          status = "UNREALISTIC";
        }
      }

      // Projected completion date at current surplus rate
      let projectedDate: string | null = null;
      if (current >= target) {
        projectedDate = "Completed";
      } else if (monthlySurplus > 0 && remaining > 0) {
        const projectedMonthsNeeded = Math.ceil(remaining / monthlySurplus);
        const projDateObj = new Date(now);
        projDateObj.setMonth(projDateObj.getMonth() + projectedMonthsNeeded);
        projectedDate = projDateObj.toLocaleDateString("en-US", {
          month: "short",
          year: "numeric",
        });
      } else {
        projectedDate = "Indefinite (No Surplus)";
      }

      return {
        ...goal,
        monthsRemaining,
        requiredMonthlySavings,
        progressPercent,
        status,
        projectedDate,
      };
    });

    return NextResponse.json({
      goals,
      monthlySurplus,
      totalIncome,
      totalExpense,
    });
  } catch (error: any) {
    console.error("GET /api/goals error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || !(session.user as any).id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const { name, targetAmount, currentSavings, deadline, category, priority } = await req.json();

    if (!name || !targetAmount || !deadline) {
      return NextResponse.json(
        { error: "Goal name, target amount, and deadline are required" },
        { status: 400 }
      );
    }

    const numTarget = Number(targetAmount);
    const numCurrent = Number(currentSavings || 0);

    if (isNaN(numTarget) || numTarget <= 0) {
      return NextResponse.json({ error: "Valid target amount required" }, { status: 400 });
    }

    const goalCount = await prisma.goal.count({ where: { userId } });

    const goal = await prisma.goal.create({
      data: {
        userId,
        name: name.trim(),
        targetAmount: numTarget,
        currentSavings: numCurrent,
        deadline: new Date(deadline),
        category: category || "Custom",
        priority: priority || goalCount + 1,
      },
    });

    return NextResponse.json({ goal }, { status: 201 });
  } catch (error: any) {
    console.error("POST /api/goals error:", error);
    return NextResponse.json({ error: "Failed to create goal" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || !(session.user as any).id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const { id, depositAmount, currentSavings, targetAmount, deadline, priority } = await req.json();

    if (!id) {
      return NextResponse.json({ error: "Goal ID is required" }, { status: 400 });
    }

    const existingGoal = await prisma.goal.findFirst({
      where: { id, userId },
    });

    if (!existingGoal) {
      return NextResponse.json({ error: "Goal not found" }, { status: 404 });
    }

    let updatedSavings = existingGoal.currentSavings;
    if (depositAmount !== undefined && !isNaN(Number(depositAmount))) {
      updatedSavings += Number(depositAmount);
    } else if (currentSavings !== undefined && !isNaN(Number(currentSavings))) {
      updatedSavings = Number(currentSavings);
    }

    const goal = await prisma.goal.update({
      where: { id },
      data: {
        currentSavings: Math.max(0, updatedSavings),
        ...(targetAmount && { targetAmount: Number(targetAmount) }),
        ...(deadline && { deadline: new Date(deadline) }),
        ...(priority !== undefined && { priority: Number(priority) }),
      },
    });

    return NextResponse.json({ goal });
  } catch (error: any) {
    console.error("PATCH /api/goals error:", error);
    return NextResponse.json({ error: "Failed to update goal" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || !(session.user as any).id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Goal ID is required" }, { status: 400 });
    }

    await prisma.goal.deleteMany({
      where: { id, userId },
    });

    return NextResponse.json({ message: "Goal deleted" });
  } catch (error: any) {
    console.error("DELETE /api/goals error:", error);
    return NextResponse.json({ error: "Failed to delete goal" }, { status: 500 });
  }
}
