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
- Asset Allocation Mix: ${investmentPlan.equityPercent}% Equity, ${investmentPlan.debtPercent}% Debt, ${investmentPlan.goldPercent}% Gold`
      : "No investment plan calculated yet.";

    // Broadened System Prompt
    const systemPrompt = `You are FinPilot AI, a knowledgeable, broad Personal Finance Assistant, Senior Financial Coach, and Chartered Accountant advisor speaking with ${userName}.

YOUR KNOWLEDGE & SCOPE:
- You answer ANY personal finance or economic question accurately and concisely (Taxes, Section 80C/ELSS, Credit Scores/CIBIL, Mortgages/Loans, Life & Health Insurance, Retirement accounts 401k/IRA/NPS, Inflation, Stock Market terms, SIPs, Budgeting rules like 50/30/20, Macroeconomics, etc.).
- When the user asks about their own money, goals, expenses, or investment strategy, reference their EXACT numbers from their live financial snapshot below.
- Keep responses reasonably concise (2-3 short paragraphs or clean bullet points) by default unless the user asks for deep elaboration.

LIVE FINANCIAL SNAPSHOT:
Profile: ${userName}, ${userCurrency} currency, ${userRisk} Risk Baseline.
Monthly Surplus: ${currencySymbol} ${monthlySurplus.toLocaleString()} / mo (Income: ${currencySymbol} ${totalIncome.toLocaleString()}, Expenses: ${currencySymbol} ${totalExpense.toLocaleString()}).
Spending Breakdown: ${categoryBreakdownStr || "None"}
Financial Goals:
${goalsContextStr}

AI Investment Plan:
${investmentPlanContextStr}`;

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

    // Comprehensive Fallback Knowledge Engine (Handles General Finance + Personal Data seamlessly)
    if (!assistantReply) {
      // 1. General Financial Concept Definitions (Taxes, Credit Score, SGB, Equity, Debt, SIP, Insurance, Loans)
      if (promptLower.includes("tax") || promptLower.includes("80c") || promptLower.includes("elss")) {
        assistantReply = `### Tax Planning & Section 80C Overview

**Section 80C** allows individuals in India to claim tax deductions up to **₹1,50,000 per financial year**:

- **ELSS Mutual Funds (Tax-Saving Funds)**: Has the shortest lock-in period (3 years) among 80C options and offers equity-linked growth (~12-14% CAGR).
- **Public Provident Fund (PPF)**: 15-year government scheme offering risk-free interest (~7.1% p.a.).
- **Employee Provident Fund (EPF) & NPS**: Contributions under EPF qualify for 80C, while NPS offers an extra ₹50,000 deduction under 80CCD(1B).

**Coaching Tip:** Investing part of your **${currencySymbol} ${monthlySurplus.toLocaleString()}/mo** surplus into ELSS builds wealth while cutting income tax!`;
      } else if (promptLower.includes("credit score") || promptLower.includes("cibil") || promptLower.includes("credit rating")) {
        assistantReply = `### Understanding Credit Scores (CIBIL)

A **Credit Score (CIBIL)** is a 3-digit number ranging from **300 to 900** that evaluates your creditworthiness:

- **750+ (Excellent)**: Unlocks the lowest home loan & personal loan interest rates.
- **650 – 749 (Fair)**: Eligible for credit cards and loans with standard rates.
- **Below 650 (Poor)**: Indicates high risk; loans may be rejected or charged higher interest.

**3 Rules to Boost Your Score:**
1. Pay 100% of credit card bills and loan EMIs on time before the due date.
2. Keep your Credit Utilization Ratio below **30%** of your total limit.
3. Avoid applying for multiple loan products simultaneously.`;
      } else if (promptLower.includes("sovereign gold bond") || promptLower.includes("sgb") || promptLower.includes("gold bond")) {
        assistantReply = `### Sovereign Gold Bonds (SGBs)

**Sovereign Gold Bonds (SGBs)** are government-backed securities issued by the Reserve Bank of India (RBI) denominated in grams of gold:

- **2.5% Fixed Annual Interest**: Paid semi-annually directly into your bank account.
- **Tax Exemption**: 100% tax-free capital gains if held until maturity (8 years).
- **Safety**: No risk of theft or making charges compared to physical gold.

In your FinPilot AI plan, **${investmentPlan?.goldPercent || 10}%** is allocated to Gold/SGBs to hedge your portfolio against inflation!`;
      } else if (promptLower.includes("equity") && !promptLower.includes("my equity")) {
        assistantReply = `### What is Equity?

**Equity** (stocks/shares) represents fractional ownership in a business:

- **Wealth Compounder**: Over 5-10+ year horizons, equity mutual funds (like Nifty 50 Index Funds) historically deliver **10%–14% CAGR**, beating inflation.
- **Risk & Reward**: Higher short-term price fluctuations in exchange for superior long-term capital appreciation.

In your plan, **${investmentPlan?.equityPercent || 60}%** is allocated to Equity to compound your net worth!`;
      } else if (promptLower.includes("debt") && !promptLower.includes("my debt")) {
        assistantReply = `### What is Debt / Fixed Income?

**Debt investments** (Bonds, Fixed Deposits, Debt Mutual Funds) involve lending capital to corporations or government bodies:

- **Capital Preservation**: Lower risk and steady interest returns (~6%–8% p.a.).
- **Market Buffer**: Shields your net worth when stock markets experience corrections.

In your plan, **${investmentPlan?.debtPercent || 30}%** is allocated to Debt Funds for capital stability!`;
      } else if (promptLower.includes("insurance") || promptLower.includes("term insurance") || promptLower.includes("health insurance")) {
        assistantReply = `### Insurance Essentials

1. **Term Life Insurance**: Provides a pure death benefit payload (e.g. 10x–15x your annual income) for your dependents at low premium rates.
2. **Health Insurance**: Protects your emergency reserve from catastrophic medical bills.

**Rule of Thumb:** Secure your term life cover and health insurance BEFORE starting heavy equity investments!`;
      } else if (promptLower.includes("loan") || promptLower.includes("mortgage") || promptLower.includes("emi")) {
        assistantReply = `### Smart Debt & Loan Strategy

- **Good Debt (Home Loans / Education Loans)**: Low interest rates (8-9%) backed by appreciating assets or income capacity, plus tax benefits under Sec 24(b).
- **Bad Debt (Credit Cards / Personal Loans)**: High interest rates (18-42% p.a.). Pay these off aggressively before investing!`;
      }
      // 2. Personal Financial Snapshot Questions
      else if (
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

- **${eq}% Equity**: UTI Nifty 50 Index Fund (${currencySymbol} ${Math.round((sip * eq * 0.67) / 100).toLocaleString()}/mo) & Parag Parikh Flexi Cap (${currencySymbol} ${Math.round((sip * eq * 0.33) / 100).toLocaleString()}/mo)
- **${db}% Debt**: HDFC Short Term Debt Fund (${currencySymbol} ${Math.round((sip * db) / 100).toLocaleString()}/mo)
- **${gd}% Gold**: Sovereign Gold Bonds / Nippon Gold ETF (${currencySymbol} ${Math.round((sip * gd) / 100).toLocaleString()}/mo)

Investing **${currencySymbol} ${sip.toLocaleString()}/mo** over **${investmentPlan?.investmentDurationYrs || 10} years** projects a total corpus of **${currencySymbol} ${corpus.toLocaleString()}** toward your **${currencySymbol} ${target.toLocaleString()}** goal.`;
      } else if (promptLower.includes("spend") || promptLower.includes("expense") || promptLower.includes("my spending")) {
        if (sortedCategories.length > 0) {
          const top1 = sortedCategories[0];
          const top2 = sortedCategories[1];

          assistantReply = `### Your Live Expense Breakdown

Total monthly expenses: **${currencySymbol} ${totalExpense.toLocaleString()}**.

**Top Categories:**
1. **${top1[0]}**: **${currencySymbol} ${top1[1].toLocaleString()}** (${Math.round((top1[1] / (totalExpense || 1)) * 100)}%)
${top2 ? `2. **${top2[0]}**: **${currencySymbol} ${top2[1].toLocaleString()}** (${Math.round((top2[1] / (totalExpense || 1)) * 100)}%)` : ""}

You retain **${currencySymbol} ${monthlySurplus.toLocaleString()}/mo** in net monthly surplus for your financial goals!`;
        } else {
          assistantReply = `You haven't recorded any expenses yet! Upload a bank statement PDF or paste SMS text on the **Transactions** page to view your spending breakdown.`;
        }
      } else if (promptLower.includes("my goal") || promptLower.includes("my track") || promptLower.includes("my target")) {
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

          assistantReply = `### Your Financial Goals Analysis

You have **${rawGoals.length} active goals** vs monthly surplus of **${currencySymbol} ${monthlySurplus.toLocaleString()}/mo**:

${goalListFormatted}`;
        } else {
          assistantReply = `You haven't set up any goals yet. Add goals on the **Goals** page using presets like *Emergency Fund* or *Buy a Laptop*.`;
        }
      } else {
        assistantReply = `Hello ${userName}! As your personal FinPilot AI coach, I'm here to help with any personal finance topic (**Taxes, Credit Scores, Insurance, Mutual Funds, Loans**) or analyze your personal financial snapshot:

- **Net Monthly Surplus:** ${currencySymbol} ${monthlySurplus.toLocaleString()}/mo
- **Active Financial Goals:** ${rawGoals.length} goals
- **Projected SIP Corpus:** ${currencySymbol} ${(investmentPlan?.projectedCorpus || 5834882).toLocaleString()} (${investmentPlan?.equityPercent || 60}% Equity / ${investmentPlan?.debtPercent || 30}% Debt / ${investmentPlan?.goldPercent || 10}% Gold)

How can I help you today?`;
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
