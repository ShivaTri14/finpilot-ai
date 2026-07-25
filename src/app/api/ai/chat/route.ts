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
- When recommending investment options, structure your response with:
  🎯 Risk Profile
  📘 Personalized Investment Plan & Financial Health
  📊 Recommended Asset Allocation (Mutual Funds, Index Funds, Debt, Gold, Emergency Reserve)
  💰 Monthly SIP Recommendation
  🛡️ Tax Saving Suggestions (Sec 80C, ELSS, NPS)
  💡 Important Coaching Advice
- Reference the user's EXACT live numbers (${userName}, ${userCurrency} currency, ${userRisk} Risk) when available.
- Keep responses clean, beautifully formatted with markdown headings and emojis.

LIVE FINANCIAL SNAPSHOT:
Profile: ${userName}, ${userCurrency} currency, ${userRisk} Risk Baseline.
Monthly Surplus: ${currencySymbol} ${monthlySurplus.toLocaleString()} / mo (Income: ${currencySymbol} ${totalIncome.toLocaleString()}, Expenses: ${currencySymbol} ${totalExpense.toLocaleString()}).
Spending Breakdown: ${categoryBreakdownStr || "None"}
Financial Goals:
${goalsContextStr}

AI Investment Plan:
${investmentPlanContextStr}`;

    let assistantReply = "";

    const pastMessages = await prisma.chatMessage.findMany({
      where: { userId },
      orderBy: { createdAt: "asc" },
      take: 10,
    });

    // 3. Check for Groq API Key first (Ultra-Fast 800+ tokens/sec LLaMA-3.3-70B model)
    const groqApiKey = process.env.GROQ_API_KEY || (process.env.LLM_API_KEY?.startsWith("gsk_") ? process.env.LLM_API_KEY : null);

    if (groqApiKey) {
      try {
        const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${groqApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "llama-3.3-70b-versatile",
            messages: [
              { role: "system", content: systemPrompt },
              ...pastMessages.map((msg) => ({
                role: msg.role === "assistant" ? "assistant" : "user",
                content: msg.content,
              })),
              { role: "user", content: userPrompt },
            ],
            temperature: 0.7,
            max_tokens: 1024,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          assistantReply = data.choices?.[0]?.message?.content?.trim() || "";
        }
      } catch (err) {
        console.warn("Groq API call error:", err);
      }
    }

    // 4. Try Gemini API if Groq wasn't used or unavailable
    if (!assistantReply) {
      const llmApiKey = process.env.LLM_API_KEY;
      if (llmApiKey && llmApiKey !== "your-llm-api-key" && !llmApiKey.startsWith("gsk_")) {
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
    }

    // 5. Universal Knowledge & Structured Advisory Engine (Guaranteed structured answer)
    if (!assistantReply) {
      if (promptLower.includes("buy stock") || promptLower.includes("how to invest") || promptLower.includes("demat") || promptLower.includes("broker")) {
        assistantReply = `🎯 **Risk Profile**: ${userRisk}
📘 **Personalized Investment Guidance**

### Financial Health Snapshot
You currently retain **${currencySymbol} ${monthlySurplus.toLocaleString()}/mo** in net monthly surplus (${totalIncome > 0 ? Math.round((monthlySurplus / totalIncome) * 100) : 60}% savings rate). This provides a strong foundation for building long-term wealth.

### Recommended Allocation
- **Equity Mutual Funds (Core Growth)**: **${investmentPlan?.equityPercent || 60}%** (Index Funds & Flexi-Cap Funds)
- **Debt & Fixed Income (Stability)**: **${investmentPlan?.debtPercent || 30}%** (Corporate Bonds & Short Term Debt Funds)
- **Gold & Inflation Hedge**: **${investmentPlan?.goldPercent || 10}%** (Sovereign Gold Bonds / Gold ETFs)

### Monthly SIP Recommendation
Invest a monthly SIP of **${currencySymbol} ${investmentPlan?.monthlyInvestment?.toLocaleString() || "20,000"} to ${currencySymbol} ${monthlySurplus.toLocaleString()}** split across Nifty 50 Index Funds and Flexi-Cap Funds.

### Tax Saving Suggestions
Consider investing in **ELSS (Equity-Linked Savings Scheme)** mutual funds or **NPS** under Section 80C to reduce income tax while earning 12%+ market growth.

### Important Advice
1. **Annual Step-Up**: Increase your SIP by 10-15% every year as your income grows.
2. **Emergency Reserve**: Keep 3-6 months living expenses liquid before taking equity bets.`;
      } else if (promptLower.includes("pe ratio") || promptLower.includes("price to earnings")) {
        assistantReply = `### What is the P/E Ratio (Price-to-Earnings)?

The **Price-to-Earnings (P/E) Ratio** evaluates how much investors pay per $1 or ₹1 of company profit:

- **Formula**: $\\text{P/E} = \\frac{\\text{Stock Price}}{\\text{Earnings Per Share (EPS)}}$
- **Guidance**: A P/E under 20 often indicates value, while >35 reflects high growth expectations or overvaluation.`;
      } else if (promptLower.includes("tax") || promptLower.includes("80c") || promptLower.includes("elss")) {
        assistantReply = `🎯 **Tax Optimization Strategy**

### Section 80C & Tax-Saving Options (Up to ₹1,50,000/yr)
- **ELSS Mutual Funds**: Shortest 3-year lock-in with equity returns (~12-14% CAGR).
- **NPS (National Pension System)**: Additional ₹50,000 deduction under Sec 80CCD(1B).
- **PPF**: 15-year tax-free government interest (~7.1% p.a.).`;
      } else if (promptLower.includes("sovereign gold bond") || promptLower.includes("sgb") || promptLower.includes("gold bond")) {
        assistantReply = `🎯 **Sovereign Gold Bonds (SGBs) Overview**

- **2.5% p.a. Fixed Interest**: Paid semi-annually directly into your bank account.
- **100% Tax-Free**: Capital gains are tax-exempt if held to 8-year maturity.
- **Allocation**: Allocated at **${investmentPlan?.goldPercent || 10}%** in your FinPilot AI plan!`;
      } else if (promptLower.includes("equity") && !promptLower.includes("my equity")) {
        assistantReply = `### What is Equity?

**Equity** (stocks/shares) represents company ownership:
- **Returns**: Historically delivers **10%–14% CAGR** over 5-10+ years.
- **Strategy**: Core wealth compounder in your portfolio (**${investmentPlan?.equityPercent || 60}%** allocation).`;
      } else if (
        promptLower.includes("my plan") ||
        promptLower.includes("my strategy") ||
        promptLower.includes("my allocation") ||
        promptLower.includes("my portfolio") ||
        promptLower.includes("why did the ai recommend")
      ) {
        assistantReply = `🎯 **Risk Profile**: ${userRisk}
📘 **Personalized FinPilot AI Plan**

### Financial Health Snapshot
You retain a net monthly surplus of **${currencySymbol} ${monthlySurplus.toLocaleString()}/mo** across your income and expenses.

### Recommended Allocation
- **Equity Funds**: **${investmentPlan?.equityPercent || 60}%** (UTI Nifty 50 Index Fund & Parag Parikh Flexi Cap)
- **Debt Funds**: **${investmentPlan?.debtPercent || 30}%** (HDFC Short Term Debt Fund)
- **Gold Hedge**: **${investmentPlan?.goldPercent || 10}%** (Sovereign Gold Bonds)

### Monthly SIP & Corpus Goal
Investing **${currencySymbol} ${investmentPlan?.monthlyInvestment?.toLocaleString() || "25,000"}/mo** over **${investmentPlan?.investmentDurationYrs || 10} years** projects a corpus of **${currencySymbol} ${(investmentPlan?.projectedCorpus || 5834882).toLocaleString()}** (${investmentPlan?.achievementLikelihood || 58}% confidence likelihood).

### Important Advice
Step up your monthly SIP by 10-15% annually to make your net worth goal **100% realistically achievable**!`;
      } else {
        const cleanTopic = userPrompt.replace(/^(what is|how to|can you explain|tell me about|what are|define)\s+/i, "");

        assistantReply = `🎯 **Financial Coaching Insights**: ${cleanTopic.charAt(0).toUpperCase() + cleanTopic.slice(1)}

### Core Strategy Breakdown
1. **Key Concept**: In personal finance, ${cleanTopic} is essential for balancing risk, tax efficiency, and capital compounding.
2. **Action Plan**: Maintain an emergency reserve (3-6 months living expenses) before allocating into growth assets.
3. **Profile Integration**: With your monthly surplus of **${currencySymbol} ${monthlySurplus.toLocaleString()}/mo**, structure your capital across Nifty 50 Index Funds, Debt Instruments, and Gold.`;
      }
    }

    // 6. Save Assistant Reply to Database
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
