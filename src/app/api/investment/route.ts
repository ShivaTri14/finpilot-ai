import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { computeInvestmentPlan, InvestmentInputs } from "@/lib/financial-math";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || !(session.user as any).id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const plan = await prisma.investmentPlan.findUnique({
      where: { userId },
    });

    if (!plan) {
      return NextResponse.json({ plan: null });
    }

    return NextResponse.json({
      plan: {
        ...plan,
        chartData: JSON.parse(plan.chartDataJson),
      },
    });
  } catch (error: any) {
    console.error("GET /api/investment error:", error);
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
    const body = await req.json();

    const inputs: InvestmentInputs = {
      age: Number(body.age) || 28,
      monthlySalary: Number(body.monthlySalary) || 75000,
      monthlyExpenses: Number(body.monthlyExpenses) || 35000,
      currentSavings: Number(body.currentSavings) || 100000,
      emergencyFund: Number(body.emergencyFund) || 150000,
      netWorthGoal: Number(body.netWorthGoal) || 10000000,
      monthlyInvestment: Number(body.monthlyInvestment) || 20000,
      investmentDurationYrs: Number(body.investmentDurationYrs) || 10,
      riskAppetite: body.riskAppetite || "Medium",
    };

    // Layer 1: Execute Deterministic Financial Math Engine
    const results = computeInvestmentPlan(inputs);

    // Layer 2: LLM Advisory Narrative (Server-Side Only)
    let llmNarrative = "";
    const currency = (session.user as any)?.currency || "INR";
    const symbol = currency === "USD" ? "$" : currency === "EUR" ? "€" : currency === "GBP" ? "£" : "₹";

    // 1. Try Groq API LLaMA-3.3-70B model if key present
    const groqApiKey = process.env.GROQ_API_KEY || (process.env.LLM_API_KEY?.startsWith("gsk_") ? process.env.LLM_API_KEY : null);

    if (groqApiKey) {
      try {
        const prompt = `You are FinPilot AI, a Senior Personal Financial Coach and Chartered Accountant advisor.
Analyze the following DETERMINISTICALLY CALCULATED investment strategy for a ${inputs.age}-year-old user with a ${inputs.riskAppetite} Risk Profile:

- Monthly Salary: ${symbol} ${inputs.monthlySalary.toLocaleString()}
- Monthly Expenses: ${symbol} ${inputs.monthlyExpenses.toLocaleString()}
- Current Savings: ${symbol} ${inputs.currentSavings.toLocaleString()}
- Monthly Investment (SIP): ${symbol} ${inputs.monthlyInvestment.toLocaleString()}
- Horizon: ${inputs.investmentDurationYrs} Years (${results.expectedAnnualReturn}% p.a. expected return assumption)
- Total Principal Invested: ${symbol} ${results.totalInvested.toLocaleString()}
- Projected Target Corpus: ${symbol} ${results.projectedCorpus.toLocaleString()} (Estimated Gains: ${symbol} ${results.estimatedReturns.toLocaleString()})
- Net Worth Goal: ${symbol} ${inputs.netWorthGoal.toLocaleString()}
- Achievement Confidence Likelihood: ${results.achievementLikelihood}%
- Recommended Asset Allocation: ${results.equityPercent}% Equity, ${results.debtPercent}% Debt, ${results.goldPercent}% Gold.

Format your response EXACTLY with these markdown sections and emojis:
🎯 Risk Profile: ${inputs.riskAppetite}
📘 Personalized Investment Plan & Financial Health
## Financial Health Overview
(Detail salary, expenses, savings rate %, and risk profile fit)

## Recommended Asset Allocation
(List exact percentage breakdown for Mutual Funds, Index Funds, Debt, Gold, Emergency Reserve)

## Monthly SIP Recommendation
(Detail monthly SIP split and growth trajectory)

## Tax Saving Suggestions
(Detail ELSS, Section 80C, 80D, 80E, NPS)

## Important Advice
(5 actionable bullet points: Review & Adjust, Diversification, Long-Term Focus, Insurance, Financial Discipline)`;

        const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${groqApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "llama-3.3-70b-versatile",
            messages: [
              { role: "system", content: "You are FinPilot AI, a Senior Financial Coach and CA." },
              { role: "user", content: prompt },
            ],
            temperature: 0.7,
            max_tokens: 1024,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          llmNarrative = data.choices?.[0]?.message?.content?.trim() || "";
        }
      } catch (err) {
        console.warn("Groq API investment model error:", err);
      }
    }

    // 2. Try Gemini API fallback
    if (!llmNarrative) {
      const llmApiKey = process.env.LLM_API_KEY;
      if (llmApiKey && llmApiKey !== "your-llm-api-key" && !llmApiKey.startsWith("gsk_")) {
        try {
          const prompt = `You are FinPilot AI, a Senior Financial Coach and Chartered Accountant advisor.
Analyze the following investment strategy for a ${inputs.age}-year-old user with a ${inputs.riskAppetite} Risk Profile:

- Monthly Salary: ${symbol} ${inputs.monthlySalary.toLocaleString()}
- Monthly Expenses: ${symbol} ${inputs.monthlyExpenses.toLocaleString()}
- Current Savings: ${symbol} ${inputs.currentSavings.toLocaleString()}
- Monthly Investment (SIP): ${symbol} ${inputs.monthlyInvestment.toLocaleString()}
- Horizon: ${inputs.investmentDurationYrs} Years (${results.expectedAnnualReturn}% p.a. return)
- Projected Corpus: ${symbol} ${results.projectedCorpus.toLocaleString()}
- Net Worth Goal: ${symbol} ${inputs.netWorthGoal.toLocaleString()}
- Achievement Likelihood: ${results.achievementLikelihood}%
- Allocation: ${results.equityPercent}% Equity, ${results.debtPercent}% Debt, ${results.goldPercent}% Gold.

Format with sections:
🎯 Risk Profile: ${inputs.riskAppetite}
📘 Personalized Investment Plan & Financial Health
## Financial Health Overview
## Recommended Asset Allocation
## Monthly SIP Recommendation
## Tax Saving Suggestions
## Important Advice`;

          const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${llmApiKey}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
            }),
          });

          if (res.ok) {
            const data = await res.json();
            llmNarrative = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";
          }
        } catch (err) {
          console.warn("Gemini API investment model error:", err);
        }
      }
    }

    // 3. High-End Structured Fallback Advisory Narrative
    if (!llmNarrative) {
      const netSavingsRate = Math.round((Math.max(0, inputs.monthlySalary - inputs.monthlyExpenses) / (inputs.monthlySalary || 1)) * 100);
      const stepUpSipReq = Math.round(inputs.monthlyInvestment * 1.15);

      llmNarrative = `🎯 **Risk Profile**: ${inputs.riskAppetite}
📘 **Personalized Investment Plan**

## Financial Health Overview
You have a monthly salary of **${symbol} ${inputs.monthlySalary.toLocaleString()}** and expenses of **${symbol} ${inputs.monthlyExpenses.toLocaleString()}**, translating to a net savings rate of **${netSavingsRate}%** (${symbol} ${Math.max(0, inputs.monthlySalary - inputs.monthlyExpenses).toLocaleString()}/mo). Your current savings of **${symbol} ${inputs.currentSavings.toLocaleString()}** is a strong starting foundation. Considering your **${inputs.riskAppetite} Risk** profile, we structure high-growth equity assets paired with debt stability and gold hedging.

## Recommended Asset Allocation
- **Mutual Funds (Growth Equity)**: **${Math.round(results.equityPercent * 0.67)}%** (Flexi-Cap & Large/Mid-Cap Funds to capture market upside)
- **Index Funds (Broad Exposure)**: **${Math.round(results.equityPercent * 0.33)}%** (UTI Nifty 50 Index Fund for low-cost passive compounding)
- **Gold & Commodities**: **${results.goldPercent}%** (Sovereign Gold Bonds / Gold ETFs as an inflation hedge)
- **Fixed Debt / Debt Funds**: **${Math.round(results.debtPercent * 0.7)}%** (HDFC Short Term Debt Fund for capital preservation)
- **Emergency Reserve**: **${Math.round(results.debtPercent * 0.3)}%** (Liquid FDs covering 3-6 months living expenses)

## Monthly SIP Recommendation
To achieve your target Net Worth Goal of **${symbol} ${inputs.netWorthGoal.toLocaleString()}**, we recommend a monthly SIP of **${symbol} ${inputs.monthlyInvestment.toLocaleString()} to ${symbol} ${stepUpSipReq.toLocaleString()}** allocated across the recommended options. Over **${inputs.investmentDurationYrs} years**, this projects a total corpus of **${symbol} ${results.projectedCorpus.toLocaleString()}** (${results.achievementLikelihood}% confidence likelihood).

## Tax Saving Suggestions
Consider investing in tax-saving instruments like **ELSS (Equity-Linked Savings Scheme)** mutual funds (3-year lock-in with equity returns) or **NPS (National Pension System)** under Section 80C and 80CCD(1B) to reduce your taxable income.

## Important Advice
- **Review & Adjust**: Periodically review your portfolio annually to realign with your risk appetite.
- **Step-Up SIP**: Increase your monthly SIP by 10-15% every year as your salary increases to reach **100% goal feasibility**.
- **Long-Term Discipline**: Resist withdrawing during short-term market dips to let compound growth maximize wealth.
- **Insurance Protection**: Secure adequate term life and health insurance before taking heavy equity bets.
- **Financial Discipline**: Maintain a consistent investment approach and prioritize long-term financial goals.`;
    }

    // Save to InvestmentPlan table in database
    const plan = await prisma.investmentPlan.upsert({
      where: { userId },
      update: {
        age: inputs.age,
        monthlySalary: inputs.monthlySalary,
        monthlyExpenses: inputs.monthlyExpenses,
        currentSavings: inputs.currentSavings,
        emergencyFund: inputs.emergencyFund,
        netWorthGoal: inputs.netWorthGoal,
        monthlyInvestment: inputs.monthlyInvestment,
        investmentDurationYrs: inputs.investmentDurationYrs,
        riskAppetite: inputs.riskAppetite,
        projectedCorpus: results.projectedCorpus,
        bestCaseCorpus: results.bestCaseCorpus,
        worstCaseCorpus: results.worstCaseCorpus,
        totalInvested: results.totalInvested,
        estimatedReturns: results.estimatedReturns,
        achievementLikelihood: results.achievementLikelihood,
        equityPercent: results.equityPercent,
        debtPercent: results.debtPercent,
        goldPercent: results.goldPercent,
        llmNarrative,
        chartDataJson: JSON.stringify(results.chartData),
      },
      create: {
        userId,
        age: inputs.age,
        monthlySalary: inputs.monthlySalary,
        monthlyExpenses: inputs.monthlyExpenses,
        currentSavings: inputs.currentSavings,
        emergencyFund: inputs.emergencyFund,
        netWorthGoal: inputs.netWorthGoal,
        monthlyInvestment: inputs.monthlyInvestment,
        investmentDurationYrs: inputs.investmentDurationYrs,
        riskAppetite: inputs.riskAppetite,
        projectedCorpus: results.projectedCorpus,
        bestCaseCorpus: results.bestCaseCorpus,
        worstCaseCorpus: results.worstCaseCorpus,
        totalInvested: results.totalInvested,
        estimatedReturns: results.estimatedReturns,
        achievementLikelihood: results.achievementLikelihood,
        equityPercent: results.equityPercent,
        debtPercent: results.debtPercent,
        goldPercent: results.goldPercent,
        llmNarrative,
        chartDataJson: JSON.stringify(results.chartData),
      },
    });

    return NextResponse.json({
      plan: {
        ...plan,
        expectedAnnualReturn: results.expectedAnnualReturn,
        chartData: results.chartData,
      },
    });
  } catch (error: any) {
    console.error("POST /api/investment error:", error);
    return NextResponse.json({ error: "Failed to compute investment plan" }, { status: 500 });
  }
}
