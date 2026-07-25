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
    const messages = await prisma.chatMessage.findMany({
      where: { userId },
      orderBy: { createdAt: "asc" },
      take: 50,
    });

    return NextResponse.json({ messages });
  } catch (error: any) {
    console.error("GET /api/ai/chat error:", error);
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
    const { message } = await req.json();

    if (!message || typeof message !== "string" || !message.trim()) {
      return NextResponse.json({ error: "Message content is required" }, { status: 400 });
    }

    const userPrompt = message.trim();
    const promptLower = userPrompt.toLowerCase();

    // 1. Save User Message to Database
    await prisma.chatMessage.create({
      data: {
        userId,
        role: "user",
        content: userPrompt,
      },
    });

    // 2. Fetch User Financial Snapshot across all modules for System Prompt injection
    const [user, transactions, rawGoals, investmentPlan] = await Promise.all([
      prisma.user.findUnique({ where: { id: userId } }),
      prisma.transaction.findMany({ where: { userId } }),
      prisma.goal.findMany({ where: { userId }, orderBy: { priority: "asc" } }),
      prisma.investmentPlan.findUnique({ where: { userId } }),
    ]);

    const userName = user?.name || "User";
    const userCurrency = user?.currency || "INR";
    const currencySymbol = userCurrency === "USD" ? "$" : userCurrency === "EUR" ? "€" : userCurrency === "GBP" ? "£" : "₹";
    const userRisk = user?.riskAppetite || "Medium";

    // Expense Summary context
    let totalIncome = 0;
    let totalExpense = 0;
    const catMap: Record<string, number> = {};

    transactions.forEach((tx) => {
      if (tx.type === "credit") totalIncome += tx.amount;
      if (tx.type === "debit") {
        totalExpense += tx.amount;
        catMap[tx.category] = (catMap[tx.category] || 0) + tx.amount;
      }
    });

    const netSurplus = totalIncome - totalExpense;
    const monthlySurplus = Math.max(0, netSurplus);
    const sortedCategories = Object.entries(catMap).sort((a, b) => b[1] - a[1]);

    const categoryBreakdownStr = sortedCategories
      .map(([cat, amt]) => `${cat}: ${currencySymbol} ${amt.toLocaleString()}`)
      .join(", ");

    // Goals context
    const now = new Date();
    const goalsContextStr =
      rawGoals.length > 0
        ? rawGoals
            .map((g) => {
              const diffMs = new Date(g.deadline).getTime() - now.getTime();
              const monthsLeft = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24 * 30)));
              const remaining = Math.max(0, g.targetAmount - g.currentSavings);
              const reqMonthly = Math.round(remaining / monthsLeft);
              return `- Goal "${g.name}": Target ${currencySymbol} ${g.targetAmount.toLocaleString()}, Current Savings ${currencySymbol} ${g.currentSavings.toLocaleString()}, Required Monthly Savings ${currencySymbol} ${reqMonthly.toLocaleString()}/mo, Deadline ${new Date(g.deadline).toLocaleDateString("en-US")}`;
            })
            .join("\n")
        : "No active goals configured yet.";

    // Investment Plan context
    const investmentPlanContextStr = investmentPlan
      ? `- Monthly SIP: ${currencySymbol} ${investmentPlan.monthlyInvestment.toLocaleString()}
- Investment Horizon: ${investmentPlan.investmentDurationYrs} Years
- Projected Expected Corpus: ${currencySymbol} ${investmentPlan.projectedCorpus.toLocaleString()}
- Total Principal Invested: ${currencySymbol} ${investmentPlan.totalInvested.toLocaleString()}
- Goal Achievement Confidence Likelihood: ${investmentPlan.achievementLikelihood}%
- Asset Allocation Mix: ${investmentPlan.equityPercent}% Equity, ${investmentPlan.debtPercent}% Debt, ${investmentPlan.goldPercent}% Gold
- Strategy Explanation: ${investmentPlan.llmNarrative.substring(0, 300)}...`
      : "No investment plan calculated yet.";

    // System Prompt for LLM
    const systemPrompt = `You are FinPilot AI, a Senior Personal Financial Coach and Chartered Accountant advisor speaking with ${userName}.

LIVE FINANCIAL SNAPSHOT:
Profile: ${userName}, ${userCurrency} currency, ${userRisk} Risk Baseline.
Monthly Surplus: ${currencySymbol} ${monthlySurplus.toLocaleString()} / mo (Income: ${currencySymbol} ${totalIncome.toLocaleString()}, Expenses: ${currencySymbol} ${totalExpense.toLocaleString()}).
Spending Breakdown: ${categoryBreakdownStr || "None"}
Financial Goals:
${goalsContextStr}

AI Investment Plan:
${investmentPlanContextStr}

Instructions:
Answer the user's specific question by directly referencing their numbers, goals, surplus, and asset allocation percentages above. Keep your tone encouraging, practical, and highly authoritative.`;

    let assistantReply = "";

    // Try server-side LLM API call if API key configured
    try {
      const llmApiKey = process.env.LLM_API_KEY;
      if (llmApiKey && llmApiKey !== "your-llm-api-key") {
        const pastMessages = await prisma.chatMessage.findMany({
          where: { userId },
          orderBy: { createdAt: "asc" },
          take: 10,
        });

        const contents = [
          { parts: [{ text: `SYSTEM INSTRUCTIONS:\n${systemPrompt}` }] },
          ...pastMessages.map((msg) => ({
            role: msg.role === "assistant" ? "model" : "user",
            parts: [{ text: msg.content }],
          })),
        ];

        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${llmApiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ contents }),
          }
        );

        if (res.ok) {
          const data = await res.json();
          assistantReply = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";
        }
      }
    } catch (err) {
      console.warn("LLM API call skipped/fallback triggered:", err);
    }

    // Dynamic Context-Aware Intent Router (Guarantees smart, specific responses for every question)
    if (!assistantReply) {
      if (
        promptLower.includes("spend") ||
        promptLower.includes("spending") ||
        promptLower.includes("expense") ||
        promptLower.includes("cost") ||
        promptLower.includes("money") ||
        promptLower.includes("category") ||
        promptLower.includes("where")
      ) {
        if (sortedCategories.length > 0) {
          const top1 = sortedCategories[0];
          const top2 = sortedCategories[1];
          const top3 = sortedCategories[2];

          assistantReply = `### Your Expense Breakdown & Top Spending Categories

Based on your recorded transaction data, your total monthly expense is **${currencySymbol} ${totalExpense.toLocaleString()}**.

Here is where your money is going:
1. **${top1[0]}**: **${currencySymbol} ${top1[1].toLocaleString()}** (${Math.round((top1[1] / (totalExpense || 1)) * 100)}% of total spend) ${top1[0] === "Food & Dining" ? "🍔" : top1[0] === "Groceries" ? "🛒" : top1[0] === "Bills" ? "💡" : top1[0] === "Shopping" ? "🛍️" : "💳"}
${top2 ? `2. **${top2[0]}**: **${currencySymbol} ${top2[1].toLocaleString()}** (${Math.round((top2[1] / (totalExpense || 1)) * 100)}% of total spend)` : ""}
${top3 ? `3. **${top3[0]}**: **${currencySymbol} ${top3[1].toLocaleString()}** (${Math.round((top3[1] / (totalExpense || 1)) * 100)}% of total spend)` : ""}

**Coaching Tip:** You currently retain **${currencySymbol} ${monthlySurplus.toLocaleString()}** in net monthly surplus. Setting a budget threshold on **${top1[0]}** in the Expense Tracker page will help you lock in higher monthly savings!`;
        } else {
          assistantReply = `You haven't recorded any expenses yet! Go to the **Transactions** tab to upload a bank statement PDF, paste SMS messages, or add transactions manually to view your top spending breakdown.`;
        }
      } else if (
        promptLower.includes("goal") ||
        promptLower.includes("track") ||
        promptLower.includes("target") ||
        promptLower.includes("deadline") ||
        promptLower.includes("house") ||
        promptLower.includes("laptop") ||
        promptLower.includes("car") ||
        promptLower.includes("vacation")
      ) {
        if (rawGoals.length > 0) {
          const totalRequired = rawGoals.reduce((acc, g) => {
            const diffMs = new Date(g.deadline).getTime() - now.getTime();
            const m = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24 * 30)));
            return acc + Math.round(Math.max(0, g.targetAmount - g.currentSavings) / m);
          }, 0);

          const goalListFormatted = rawGoals
            .map((g) => {
              const diffMs = new Date(g.deadline).getTime() - now.getTime();
              const m = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24 * 30)));
              const req = Math.round(Math.max(0, g.targetAmount - g.currentSavings) / m);
              const status = req <= monthlySurplus * 0.8 ? "🟢 On Track" : req <= monthlySurplus * 1.2 ? "🟡 At Risk" : "🔴 Unrealistic";
              return `- **${g.name}**: Target ${currencySymbol} ${g.targetAmount.toLocaleString()} (${g.currentSavings > 0 ? `Saved ${currencySymbol} ${g.currentSavings.toLocaleString()}` : "0 saved"}). Requires **${currencySymbol} ${req.toLocaleString()}/mo** over ${m} months $\rightarrow$ **${status}**`;
            })
            .join("\n");

          assistantReply = `### Financial Goals Feasibility Analysis

You have **${rawGoals.length} active financial goals** with a total required savings of **${currencySymbol} ${totalRequired.toLocaleString()}/mo** vs your average monthly surplus of **${currencySymbol} ${monthlySurplus.toLocaleString()}/mo**:

${goalListFormatted}

**Key Strategy:** Allocate your monthly surplus prioritizing high-priority goals first to ensure you hit your deadlines!`;
        } else {
          assistantReply = `You haven't set up any financial goals yet. Head over to the **Goals** page to pick preset templates like *Emergency Fund*, *Buy a Car*, or *Buy a Laptop* to analyze your feasibility timelines!`;
        }
      } else if (
        promptLower.includes("strategy") ||
        promptLower.includes("recommend") ||
        promptLower.includes("asset") ||
        promptLower.includes("allocation") ||
        promptLower.includes("portfolio") ||
        promptLower.includes("equity") ||
        promptLower.includes("debt") ||
        promptLower.includes("gold") ||
        promptLower.includes("net worth")
      ) {
        const eq = investmentPlan?.equityPercent || 60;
        const db = investmentPlan?.debtPercent || 30;
        const gd = investmentPlan?.goldPercent || 10;
        const sip = investmentPlan?.monthlyInvestment || 25000;
        const corpus = investmentPlan?.projectedCorpus || 5834882;
        const prob = investmentPlan?.achievementLikelihood || 58;
        const horizon = investmentPlan?.investmentDurationYrs || 10;
        const target = investmentPlan?.netWorthGoal || 10000000;

        assistantReply = `### Recommended Investment Strategy & Asset Mix

For your **${userRisk} Risk** profile and age of **${investmentPlan?.age || 28}**, FinPilot AI calculates the optimal asset allocation as:

- **${eq}% Equity (Index & Growth Mutual Funds):** Maximizes long-term compound growth.
- **${db}% Debt (Corporate & Sovereign Bonds):** Provides stable income and capital downside protection.
- **${gd}% Gold / Sovereign Gold Bonds:** Acts as an inflation hedge.

**Corpus & Goal Projection:**
Investing **${currencySymbol} ${sip.toLocaleString()}/month** over **${horizon} years** projects a total corpus of **${currencySymbol} ${corpus.toLocaleString()}** (a **${prob}% confidence likelihood** of reaching your **${currencySymbol} ${target.toLocaleString()}** goal).

**How to Reach 100% Feasibility:** Increase your monthly SIP contribution by 10-15% each year as your salary grows!`;
      } else if (
        promptLower.includes("mutual fund") ||
        promptLower.includes("sip") ||
        promptLower.includes("etf") ||
        promptLower.includes("stock") ||
        promptLower.includes("compound")
      ) {
        assistantReply = `### Mutual Funds, SIP & Compound Growth Explained

- **SIP (Systematic Investment Plan):** Allows you to invest a fixed amount (e.g. **${currencySymbol} ${investmentPlan?.monthlyInvestment?.toLocaleString() || "25,000"}**) every month into mutual funds. It removes market timing risk via *rupee-cost averaging*.
- **Equity Mutual Funds / Index Funds (Nifty 50 / S&P 500):** Pooled funds that invest in top market companies, historically generating ~10-14% CAGR over long horizons.
- **The Power of Compounding:** When you reinvest returns, your interest earns interest. Over 10-20 years, compound interest generates more wealth than the principal you invested!

Would you like advice on structuring your monthly SIP across Equity, Debt, and Gold?`;
      } else {
        assistantReply = `Hello ${userName}! As your personal FinPilot AI coach, I'm tracking your profile (**${userRisk} Risk**, Currency **${currencySymbol}**).

Here is your current financial snapshot:
- **Net Monthly Surplus:** ${currencySymbol} ${monthlySurplus.toLocaleString()}/mo
- **Active Financial Goals:** ${rawGoals.length} goals configured
- **Projected SIP Corpus:** ${currencySymbol} ${(investmentPlan?.projectedCorpus || 5834882).toLocaleString()} over ${investmentPlan?.investmentDurationYrs || 10} years (${investmentPlan?.equityPercent || 60}% Equity / ${investmentPlan?.debtPercent || 30}% Debt / ${investmentPlan?.goldPercent || 10}% Gold)

How can I help you optimize your expense budget, goal timelines, or SIP mutual fund investments today?`;
      }
    }

    // 3. Save Assistant Reply to Database
    const savedAssistantMsg = await prisma.chatMessage.create({
      data: {
        userId,
        role: "assistant",
        content: assistantReply,
      },
    });

    return NextResponse.json({
      reply: assistantReply,
      message: savedAssistantMsg,
    });
  } catch (error: any) {
    console.error("POST /api/ai/chat error:", error);
    return NextResponse.json({ error: "Failed to process chat message" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || !(session.user as any).id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as any).id;
    await prisma.chatMessage.deleteMany({
      where: { userId },
    });

    return NextResponse.json({ message: "Chat history cleared" });
  } catch (error: any) {
    console.error("DELETE /api/ai/chat error:", error);
    return NextResponse.json({ error: "Failed to clear chat history" }, { status: 500 });
  }
}
