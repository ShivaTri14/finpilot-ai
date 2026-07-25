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

    // 2. Fetch User Financial Snapshot across all modules for Context Injection
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
- Recommended Fund Allocation: UTI Nifty 50 Index Fund (${Math.round((investmentPlan.monthlyInvestment * (investmentPlan.equityPercent * 0.67)) / 100).toLocaleString()}/mo), Parag Parikh Flexi Cap (${Math.round((investmentPlan.monthlyInvestment * (investmentPlan.equityPercent * 0.33)) / 100).toLocaleString()}/mo), HDFC Short Term Debt (${Math.round((investmentPlan.monthlyInvestment * investmentPlan.debtPercent) / 100).toLocaleString()}/mo), Sovereign Gold Bonds (${Math.round((investmentPlan.monthlyInvestment * investmentPlan.goldPercent) / 100).toLocaleString()}/mo).`
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
Answer the user's specific question concisely, professionally, and accurately. If they ask a general financial definition (e.g. "what is equity", "what are sovereign gold bonds"), explain the financial concept clearly in plain language like ChatGPT. If they ask about their personal money, goals, surplus, or investment strategy, reference their exact live numbers.`;

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

    // Professional Intent Router (ChatGPT-grade answers for definition & personal questions)
    if (!assistantReply) {
      // 1. Specific General Educational Definitions (ChatGPT Style)
      if (promptLower.includes("what is equity") || promptLower === "equity" || promptLower === "what's equity") {
        assistantReply = `### What is Equity?

**Equity** (also called stocks or shares) represents fractional ownership in a company.

When you buy equity or invest in an **Equity Mutual Fund** (like a Nifty 50 Index Fund):
1. **Ownership**: You become a part-owner of the businesses in that portfolio.
2. **Wealth Creation**: As companies grow their profits, the value of your shares increases (capital appreciation), beating inflation over long horizons.
3. **Returns & Risk**: Historically, equity mutual funds deliver **10% – 14% CAGR** over 5-10+ years, though short-term market prices fluctuate.

In your FinPilot AI portfolio, **${investmentPlan?.equityPercent || 60}%** is allocated to Equity to drive long-term compound growth for your net worth goal!`;
      } else if (
        promptLower.includes("sovereign gold bond") ||
        promptLower.includes("sgb") ||
        promptLower.includes("what is gold bond") ||
        promptLower.includes("what are sovereign gold bonds")
      ) {
        assistantReply = `### What are Sovereign Gold Bonds (SGBs)?

**Sovereign Gold Bonds (SGBs)** are government-backed securities denominated in grams of gold issued by the Reserve Bank of India (RBI). They are an ideal substitute for holding physical gold.

**Key Benefits:**
1. **Capital Appreciation**: Your investment value tracks the market price of gold.
2. **2.5% p.a. Fixed Interest**: You earn a 2.5% annual interest payout on your initial investment amount, paid semi-annually into your bank account.
3. **Tax Exemption**: Capital gains are **100% tax-free** if held until full maturity (8 years).
4. **Safety**: Zero risk of theft, storage fees, or making charges associated with physical gold jewelry or coins.

In your FinPilot AI portfolio, **${investmentPlan?.goldPercent || 10}%** is allocated to Gold/SGBs to hedge your wealth against market inflation!`;
      } else if (promptLower.includes("what is debt") || promptLower.includes("what are debt funds") || promptLower.includes("bond")) {
        assistantReply = `### What is Debt / Fixed Income?

**Debt investments** (such as Corporate Bonds, Government Securities, and Debt Mutual Funds) involve lending money to corporations or the government in exchange for regular interest payments.

**Why Debt is Essential in a Portfolio:**
- **Capital Protection**: Lower volatility compared to stock market equities.
- **Predictable Income**: Generates steady 6%–8% returns.
- **Downside Buffer**: Protects your net worth during stock market downturns.

In your FinPilot AI portfolio, **${investmentPlan?.debtPercent || 30}%** is allocated to Debt Funds (like HDFC Short Term Debt Fund) to keep your capital secure!`;
      } else if (promptLower.includes("what is mutual fund") || promptLower.includes("mutual fund")) {
        assistantReply = `### What is a Mutual Fund?

A **Mutual Fund** pools money from thousands of investors to purchase a diversified portfolio of stocks, bonds, or commodities managed by professional fund managers.

**Why Invest via Mutual Funds:**
- **Instant Diversification**: A single ₹500 SIP spreads your money across 50+ top companies (like Reliance, HDFC, TCS, Infosys).
- **Rupee-Cost Averaging**: Regular monthly SIPs buy more units when prices drop and fewer when prices rise.
- **Professional Management**: Managed by experienced fund managers following strict regulatory guidelines.`;
      } else if (
        promptLower.includes("spend") ||
        promptLower.includes("expense") ||
        promptLower.includes("cost") ||
        promptLower.includes("where am i spending")
      ) {
        if (sortedCategories.length > 0) {
          const top1 = sortedCategories[0];
          const top2 = sortedCategories[1];

          assistantReply = `### Your Live Expense Breakdown

Your total recorded expense this month is **${currencySymbol} ${totalExpense.toLocaleString()}**.

**Top Spending Categories:**
1. **${top1[0]}**: **${currencySymbol} ${top1[1].toLocaleString()}** (${Math.round((top1[1] / (totalExpense || 1)) * 100)}% of total spend)
${top2 ? `2. **${top2[0]}**: **${currencySymbol} ${top2[1].toLocaleString()}** (${Math.round((top2[1] / (totalExpense || 1)) * 100)}% of total spend)` : ""}

You retain **${currencySymbol} ${monthlySurplus.toLocaleString()}/mo** in net monthly surplus for your goals!`;
        } else {
          assistantReply = `You haven't recorded any expenses yet! Go to the **Transactions** page to upload a bank statement PDF or paste SMS messages.`;
        }
      } else if (promptLower.includes("goal") || promptLower.includes("track") || promptLower.includes("target")) {
        if (rawGoals.length > 0) {
          const goalListFormatted = rawGoals
            .map((g) => {
              const diffMs = new Date(g.deadline).getTime() - now.getTime();
              const m = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24 * 30)));
              const req = Math.round(Math.max(0, g.targetAmount - g.currentSavings) / m);
              const status = req <= monthlySurplus * 0.8 ? "🟢 On Track" : req <= monthlySurplus * 1.2 ? "🟡 At Risk" : "🔴 Unrealistic";
              return `- **${g.name}**: Target ${currencySymbol} ${g.targetAmount.toLocaleString()} (${g.currentSavings > 0 ? `Saved ${currencySymbol} ${g.currentSavings.toLocaleString()}` : "0 saved"}). Requires **${currencySymbol} ${req.toLocaleString()}/mo** $\rightarrow$ **${status}**`;
            })
            .join("\n");

          assistantReply = `### Financial Goals Feasibility Analysis

You have **${rawGoals.length} active financial goals** vs your average monthly surplus of **${currencySymbol} ${monthlySurplus.toLocaleString()}/mo**:

${goalListFormatted}`;
        } else {
          assistantReply = `You haven't configured any financial goals yet! Head over to the **Goals** page to add goals using presets like *Emergency Fund* or *Buy a Laptop*.`;
        }
      } else if (
        promptLower.includes("my plan") ||
        promptLower.includes("my strategy") ||
        promptLower.includes("my allocation") ||
        promptLower.includes("my portfolio") ||
        promptLower.includes("why did the ai recommend")
      ) {
        const eq = investmentPlan?.equityPercent || 60;
        const db = investmentPlan?.debtPercent || 30;
        const gd = investmentPlan?.goldPercent || 10;
        const sip = investmentPlan?.monthlyInvestment || 25000;
        const corpus = investmentPlan?.projectedCorpus || 5834882;
        const target = investmentPlan?.netWorthGoal || 10000000;

        assistantReply = `### Your Tailored Investment Strategy

Based on your **${userRisk} Risk** profile and age of **${investmentPlan?.age || 28}**, FinPilot AI assigned:

- **${eq}% Equity** (UTI Nifty 50 Index Fund & Parag Parikh Flexi Cap Fund)
- **${db}% Debt** (HDFC Short Term Debt Fund)
- **${gd}% Gold** (Sovereign Gold Bonds / Nippon Gold ETF)

Investing **${currencySymbol} ${sip.toLocaleString()}/mo** over **${investmentPlan?.investmentDurationYrs || 10} years** projects a total corpus of **${currencySymbol} ${corpus.toLocaleString()}** toward your **${currencySymbol} ${target.toLocaleString()}** goal.`;
      } else {
        assistantReply = `Hello ${userName}! As your personal FinPilot AI coach, I'm analyzing your profile (**${userRisk} Risk**, Currency **${currencySymbol}**).

Currently, you have recorded **${currencySymbol} ${monthlySurplus.toLocaleString()}** in net monthly surplus and **${rawGoals.length}** active financial goals.

How can I help you understand financial concepts, evaluate your expense budget, or optimize your SIP investments today?`;
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
