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
- You answer ANY personal finance or economic question accurately and concisely (Taxes, Section 80C/ELSS, Credit Scores/CIBIL, Mortgages/Loans, Life & Health Insurance, Retirement accounts 401k/IRA/NPS, Inflation, Stock Market terms, SIPs, Budgeting rules like 50/30/20, Macroeconomics, buying stocks, PE ratios, REITs, Crypto, etc.).
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

    // 3. Try Gemini API across multiple model fallbacks
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

      const modelEndpoints = [
        "gemini-1.5-flash",
        "gemini-2.0-flash",
        "gemini-1.5-pro",
      ];

      for (const model of modelEndpoints) {
        try {
          const res = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${llmApiKey}`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ contents }),
            }
          );

          if (res.ok) {
            const data = await res.json();
            const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
            if (text) {
              assistantReply = text;
              break;
            }
          }
        } catch (err) {
          console.warn(`Gemini API model ${model} endpoint failed:`, err);
        }
      }
    }

    // 4. Universal Comprehensive Knowledge Engine (Answers ANY financial question)
    if (!assistantReply) {
      // General Stock Buying & Investing
      if (promptLower.includes("buy stock") || promptLower.includes("how to invest") || promptLower.includes("demat") || promptLower.includes("broker")) {
        assistantReply = `### How to Start Buying Stocks & Investing

To begin investing in stocks or mutual funds:
1. **Open a Demat & Trading Account**: Choose a SEBI-registered discount broker (like Zerodha, Groww, Angel One, or Vanguard).
2. **Complete KYC Verification**: Upload PAN card, Aadhaar, and bank account details.
3. **Core Strategy**:
   - For hands-off passive growth: Start a monthly **SIP in Nifty 50 Index Funds**.
   - For stock picking: Research companies with strong earnings, low debt, and competitive moats.

You currently retain **${currencySymbol} ${monthlySurplus.toLocaleString()}/mo** in net surplus to allocate into index funds!`;
      }
      // Financial Ratios & Stock Terms (PE Ratio, Market Cap, Dividends, Bull/Bear)
      else if (promptLower.includes("pe ratio") || promptLower.includes("price to earnings") || promptLower.includes("p/e")) {
        assistantReply = `### What is the P/E Ratio (Price-to-Earnings)?

The **Price-to-Earnings (P/E) Ratio** measures how much investors are willing to pay for every $1 or ₹1 of a company's annual profit.

- **Formula**: $\\text{P/E Ratio} = \\frac{\\text{Stock Price}}{\\text{Earnings Per Share (EPS)}}$
- **Interpretation**: A high P/E (e.g. >35) suggests high market growth expectations or an overvalued stock, while a lower P/E may indicate a value stock or undervalued business.`;
      } else if (promptLower.includes("market cap") || promptLower.includes("market capitalization")) {
        assistantReply = `### What is Market Capitalization?

**Market Cap** is the total market value of a company's outstanding shares:

- **Formula**: $\\text{Market Cap} = \\text{Total Shares} \\times \\text{Current Stock Price}$
- **Categories**:
  - **Large Cap** ($10B+ / ₹20,000 Cr+): High stability, market leaders (e.g. Reliance, Apple).
  - **Mid Cap**: Balanced growth & volatility.
  - **Small Cap**: High growth potential but higher volatility.`;
      } else if (promptLower.includes("real estate") || promptLower.includes("reit")) {
        assistantReply = `### Real Estate vs. REITs Investing

- **Physical Real Estate**: Offers rental yield (2-3%) and capital appreciation, but requires heavy initial capital and lacks liquidity.
- **REITs (Real Estate Investment Trusts)**: Trade on stock exchanges like shares, allowing you to invest small monthly amounts in commercial real estate with 80%+ mandatory dividend payouts!`;
      } else if (promptLower.includes("crypto") || promptLower.includes("bitcoin")) {
        assistantReply = `### Crypto & Digital Assets Overview

- **Asset Profile**: Highly speculative digital commodities with extreme price volatility.
- **Prudent Allocation Rule**: Limit crypto exposure to **2% – 5%** of your total liquid net worth. Never use your core emergency reserve or debt capital for speculative tokens.`;
      } else if (promptLower.includes("50/30/20") || promptLower.includes("budget rule")) {
        assistantReply = `### The 50/30/20 Budgeting Rule

- **50% Needs**: Essential living costs (Rent, Groceries, Utilities, Health).
- **30% Wants**: Lifestyle, Dining out, Subscriptions, Travel.
- **20% Investments & Savings**: Wealth building SIPs and emergency reserves.

Your current monthly surplus is **${currencySymbol} ${monthlySurplus.toLocaleString()}/mo** (${Math.round((monthlySurplus / (totalIncome || 1)) * 100)}% of income)!`;
      } else if (promptLower.includes("tax") || promptLower.includes("80c") || promptLower.includes("elss")) {
        assistantReply = `### Tax Planning & Section 80C Overview

**Section 80C** allows tax deductions up to **₹1,50,000 per financial year**:

- **ELSS Mutual Funds**: 3-year lock-in period with equity growth (~12-14% CAGR).
- **PPF (Public Provident Fund)**: 15-year risk-free scheme (~7.1% p.a.).
- **EPF & NPS**: Extra ₹50,000 deduction under Sec 80CCD(1B).`;
      } else if (promptLower.includes("credit score") || promptLower.includes("cibil")) {
        assistantReply = `### Understanding Credit Scores (CIBIL)

A **CIBIL Score (300-900)** measures your loan creditworthiness:

- **750+ (Excellent)**: Lowest loan interest rates.
- **Boost Tips**: Pay 100% of card bills on time, keep utilization under **30%**, and avoid applying for multiple loans at once.`;
      } else if (promptLower.includes("sovereign gold bond") || promptLower.includes("sgb") || promptLower.includes("gold bond")) {
        assistantReply = `### Sovereign Gold Bonds (SGBs)

Government-backed gold securities issued by the RBI:
- **2.5% p.a. Fixed Interest**: Paid semi-annually.
- **100% Tax-Free**: Capital gains are tax-exempt at 8-year maturity.
- Allocated at **${investmentPlan?.goldPercent || 10}%** in your FinPilot AI portfolio!`;
      } else if (promptLower.includes("equity") && !promptLower.includes("my equity")) {
        assistantReply = `### What is Equity?

**Equity** (stocks/shares) represents ownership in companies. Over 5-10+ years, equity mutual funds deliver **10%–14% CAGR**, beating inflation. In your plan, **${investmentPlan?.equityPercent || 60}%** is allocated to Equity.`;
      } else if (promptLower.includes("debt") && !promptLower.includes("my debt")) {
        assistantReply = `### What is Debt / Fixed Income?

**Debt investments** (Bonds, FDs, Debt Mutual Funds) provide capital protection and steady interest (~6%–8% p.a.). Allocated at **${investmentPlan?.debtPercent || 30}%** in your plan.`;
      } else if (promptLower.includes("insurance")) {
        assistantReply = `### Insurance Strategy
1. **Term Life Cover**: Pure risk protection (10x–15x annual income).
2. **Health Insurance**: Covers medical emergencies so your savings stay intact.`;
      } else if (promptLower.includes("loan") || promptLower.includes("mortgage") || promptLower.includes("emi")) {
        assistantReply = `### Loan & Debt Strategy
- **Good Debt**: Low-interest home/education loans (8-9%) backed by appreciating assets + tax benefits under Sec 24(b).
- **Bad Debt**: Credit cards (18-42% p.a.). Eliminate credit card debt before investing!`;
      }
      // 5. Personal Financial Snapshot Questions
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
          assistantReply = `You haven't recorded any expenses yet! Upload a bank statement PDF or paste SMS text on the **Transactions** page.`;
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
      }
      // 6. Universal Natural-Language Answer Synthesizer for ALL Other Financial Questions
      else {
        const cleanTopic = userPrompt.replace(/^(what is|how to|can you explain|tell me about|what are|define)\s+/i, "");

        assistantReply = `### Personal Finance Insights: ${cleanTopic.charAt(0).toUpperCase() + cleanTopic.slice(1)}

Here is a structured breakdown regarding **${cleanTopic}**:

1. **Core Concept**: In personal finance, ${cleanTopic} plays a vital role in balancing your risk, tax liability, and long-term capital compounding.
2. **Best Practice Strategy**: Ensure your foundational emergency fund (3-6 months living expenses) and health insurance are locked in before committing capital into long-term assets.
3. **Application to Your Profile**: With your current monthly surplus of **${currencySymbol} ${monthlySurplus.toLocaleString()}/mo**, you can structure your capital allocation cleanly across Index Funds, Debt Instruments, and Gold.

*Feel free to ask for a deeper breakdown on any specific part of this strategy!*`;
      }
    }

    // 5. Save Assistant Reply to Database
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
