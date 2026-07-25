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
    const systemPrompt = `You are FinPilot AI, a Senior Financial Coach and Chartered Accountant advisor speaking with ${userName}.

YOUR KNOWLEDGE & SCOPE:
- You answer ANY personal finance or economic question accurately and thoroughly (Taxes, Section 80C/ELSS, Credit Scores/CIBIL, Mortgages/Loans, Life & Health Insurance, Retirement accounts 401k/IRA/NPS, Inflation, Stock Market terms, SIPs, Budgeting rules like 50/30/20, Macroeconomics, buying stocks, PE ratios, REITs, Crypto, etc.).
- When giving investment advice, format your response in this EXACT structured layout:
  🎯 Risk Profile: ${userRisk}
  📘 Personalized Investment Plan & Financial Health
  ## Financial Health Overview
  (Detail salary, expenses, savings rate %, and risk profile fit)

  ## Recommended Asset Allocation
  (List exact percentage breakdown for Mutual Funds, Index Funds, Gold, Fixed Deposits, PPF, Emergency Fund)

  ## Monthly SIP Recommendation
  (Detail monthly SIP split and growth trajectory)

  ## Tax Saving Suggestions
  (Detail ELSS, Section 80C, 80D, 80E, NPS)

  ## Important Advice
  (5 actionable bullet points: Review & Adjust, Diversification, Long-Term Focus, Insurance, Financial Discipline)

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

    // 3. Connect to Groq API using env var (llama-3.3-70b-versatile model)
    const groqApiKey =
      process.env.GROQ_API_KEY ||
      (process.env.LLM_API_KEY?.startsWith("gsk_") ? process.env.LLM_API_KEY : null);

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
            max_tokens: 1200,
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
📘 **Personalized Investment Plan**

## Financial Health Overview
You have a monthly income and expenses that leave a net surplus of **${currencySymbol} ${monthlySurplus.toLocaleString()}/mo**. Considering your **${userRisk} Risk** profile, we can explore investment options that have the potential for higher returns while managing risks.

## Recommended Asset Allocation
- **Mutual Funds**: **40%** (Aggressive hybrid or equity-oriented flexi-cap funds to tap into growth potential)
- **Index Funds**: **20%** (UTI Nifty 50 Index Fund to provide broad market exposure and diversification)
- **Gold**: **10%** (Sovereign Gold Bonds / Gold ETFs as a hedge against market volatility and inflation)
- **Fixed Deposit**: **5%** (For stability and immediate liquidity)
- **PPF**: **10%** (For long-term tax-free returns and retirement planning)
- **Emergency Fund**: **15%** (Approximately 3-6 months' expenses)

## Monthly SIP Recommendation
To achieve your investment goals, I recommend a monthly SIP (Systematic Investment Plan) of **${currencySymbol} ${investmentPlan?.monthlyInvestment?.toLocaleString() || "15,000"} to ${currencySymbol} ${monthlySurplus.toLocaleString()}**, allocated across the recommended investment options.

## Tax Saving Suggestions
Consider investing in tax-saving instruments like **ELSS (Equity-Linked Savings Scheme)** mutual funds or **NPS (National Pension System)** to reduce your taxable income. You can also explore tax deductions under Section 80C, 80D, and 80E of the Income Tax Act.

## Important Advice
- **Review and Adjust**: Regularly review your investment portfolio (at least once a year) to ensure it remains aligned with your financial goals and risk profile.
- **Diversification**: Spread your investments across different asset classes to minimize risk and maximize returns.
- **Long-Term Focus**: Resist the temptation to withdraw from your investments during market fluctuations; focus on long-term growth.
- **Insurance**: Consider purchasing adequate life and health insurance coverage to protect your financial well-being.
- **Financial Discipline**: Maintain a consistent investment approach and prioritize your financial goals.`;
      } else {
        assistantReply = `🎯 **Risk Profile**: ${userRisk}
📘 **Personalized Investment Plan**

## Financial Health Overview
You have a monthly income of **${currencySymbol} ${(totalIncome || 50000).toLocaleString()}** and expenses of **${currencySymbol} ${(totalExpense || 20000).toLocaleString()}**, translating to a net monthly surplus of **${currencySymbol} ${(monthlySurplus || 30000).toLocaleString()}/mo**.

## Recommended Asset Allocation
- **Mutual Funds**: **40%** (Flexi-Cap and Growth Equity Funds)
- **Index Funds**: **20%** (Nifty 50 Index Funds)
- **Gold**: **10%** (Sovereign Gold Bonds)
- **Fixed Deposit**: **5%** (Liquid Stability)
- **PPF**: **10%** (Tax-free Long-term wealth)
- **Emergency Fund**: **15%** (3-6 Months Liquid Reserves)

## Monthly SIP Recommendation
Recommend a monthly SIP of **${currencySymbol} ${(investmentPlan?.monthlyInvestment || 15000).toLocaleString()}**, allocated across the recommended asset classes.

## Tax Saving Suggestions
Explore ELSS tax-saving mutual funds and NPS contributions under Section 80C and Section 80CCD(1B).

## Important Advice
- **Review and Adjust**: Rebalance portfolio annually.
- **Diversification**: Spread across Equity, Debt, and Gold.
- **Long-Term Focus**: Stay invested through market cycles.
- **Insurance**: Maintain term life and health insurance.
- **Financial Discipline**: Automate your monthly SIP.`;
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
