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
    const categoryBreakdownStr = Object.entries(catMap)
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
- User Strategy Narrative Summary: ${investmentPlan.llmNarrative.substring(0, 300)}...`
      : "No investment plan calculated yet.";

    // System Prompt with Injected Financial Context
    const systemPrompt = `You are FinPilot AI, a Senior Personal Financial Coach and Chartered Accountant advisor.
You are having a conversation with ${userName}.

Here is ${userName}'s LIVE FINANCIAL SNAPSHOT (Ingested directly from their account):

=== USER PROFILE ===
- Name: ${userName}
- Primary Currency: ${currencySymbol} (${userCurrency})
- Risk Appetite Baseline: ${userRisk} Risk

=== EXPENSE TRACKER SUMMARY (MODULE 3 DATA) ===
- Average Monthly Surplus: ${currencySymbol} ${monthlySurplus.toLocaleString()} / month
- Total Income Recorded: ${currencySymbol} ${totalIncome.toLocaleString()}
- Total Expenses Recorded: ${currencySymbol} ${totalExpense.toLocaleString()}
- Category Spending Breakdown: ${categoryBreakdownStr || "No expenses recorded yet"}

=== FINANCIAL GOALS PLANNER (MODULE 4 DATA) ===
${goalsContextStr}

=== AI INVESTMENT PLAN (MODULE 5 DATA) ===
${investmentPlanContextStr}

=== INSTRUCTIONS FOR YOUR ADVISORY RESPONSES ===
1. CONTEXT AWARENESS: Whenever the user asks about their money, goals, asset allocation, or "Why did the AI recommend this strategy?", reference their EXACT numbers, goals, surplus, and asset allocation percentages shown above.
2. ACCURACY: Do NOT invent numbers that contradict their snapshot.
3. CONVERSATIONAL TEACHING: Explain concepts like SIP, Mutual Funds, Asset Allocation, Diversification, Risk, and Emergency Funds clearly in simple, engaging terms.
4. TONE: Empathetic, professional, highly encouraging, and authoritative (like a personal private wealth coach).`;

    // Fetch conversation history for prompt threading
    const pastMessages = await prisma.chatMessage.findMany({
      where: { userId },
      orderBy: { createdAt: "asc" },
      take: 10,
    });

    let assistantReply = "";

    try {
      const llmApiKey = process.env.LLM_API_KEY;
      if (llmApiKey) {
        // Construct Gemini messages array
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
      console.warn("Chatbot LLM API fallback trigger:", err);
    }

    // Fallback contextual response if API key is not provided
    if (!assistantReply) {
      if (userPrompt.toLowerCase().includes("strategy") || userPrompt.toLowerCase().includes("recommend")) {
        assistantReply = `Based on your **${userRisk} Risk** profile and age of **${investmentPlan?.age || 28}**, the AI recommended an asset allocation of **${investmentPlan?.equityPercent || 60}% Equity**, **${investmentPlan?.debtPercent || 30}% Debt**, and **${investmentPlan?.goldPercent || 10}% Gold**.

This mix is tailored specifically because:
1. **Equity (${investmentPlan?.equityPercent || 60}%):** Drives long-term wealth compounding over your ${investmentPlan?.investmentDurationYrs || 10}-year horizon.
2. **Debt (${investmentPlan?.debtPercent || 30}%):** Protects your capital during market downturns.
3. **Gold (${investmentPlan?.goldPercent || 10}%):** Serves as an inflation hedge.

Your current monthly surplus of **${currencySymbol} ${monthlySurplus.toLocaleString()}** gives you a solid foundation to maintain your **${currencySymbol} ${investmentPlan?.monthlyInvestment?.toLocaleString() || "20,000"}** SIP!`;
      } else {
        assistantReply = `Hello ${userName}! As your personal FinPilot AI coach, I'm analyzing your profile (${userRisk} Risk, Primary Currency ${currencySymbol}).

Currently, you have recorded **${currencySymbol} ${monthlySurplus.toLocaleString()}** in net monthly surplus across your transactions and **${rawGoals.length}** active financial goals.

How can I help you optimize your portfolio, mutual fund SIPs, or goal timelines today?`;
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
