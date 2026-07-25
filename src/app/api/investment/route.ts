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

    try {
      const llmApiKey = process.env.LLM_API_KEY;
      if (llmApiKey) {
        const prompt = `You are FinPilot AI, a Senior Financial Coach and Chartered Accountant advisor.
Analyze the following DETERMINISTICALLY CALCULATED investment strategy for a ${inputs.age}-year-old user with a ${inputs.riskAppetite} Risk Profile:

- Monthly Investment (SIP): ${symbol} ${inputs.monthlyInvestment.toLocaleString()}
- Horizon: ${inputs.investmentDurationYrs} Years (${results.expectedAnnualReturn}% p.a. expected return assumption)
- Total Principal Invested: ${symbol} ${results.totalInvested.toLocaleString()}
- Projected Target Corpus: ${symbol} ${results.projectedCorpus.toLocaleString()} (Estimated Gains: ${symbol} ${results.estimatedReturns.toLocaleString()})
- Net Worth Goal: ${symbol} ${inputs.netWorthGoal.toLocaleString()}
- Achievement Confidence Likelihood: ${results.achievementLikelihood}%
- Recommended Asset Allocation: ${results.equityPercent}% Equity (Mutual Funds / Stocks), ${results.debtPercent}% Debt (Bonds / Fixed Income), ${results.goldPercent}% Gold / Commodities.

Write a professional, structured 3-paragraph financial advisory response explaining:
1. Why this ${results.equityPercent}% Equity / ${results.debtPercent}% Debt / ${results.goldPercent}% Gold allocation is tailored to their age (${inputs.age}) and ${inputs.riskAppetite} risk appetite.
2. An assessment of their ${results.achievementLikelihood}% probability of reaching their ${symbol} ${inputs.netWorthGoal.toLocaleString()} goal.
3. 2 actionable coaching tips to optimize their portfolio compound returns over the next ${inputs.investmentDurationYrs} years.

Do NOT change or invent any new numbers — explain ONLY the numbers provided above. Keep your tone encouraging, practical, and highly authoritative.`;

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
      }
    } catch (err) {
      console.warn("LLM Narrative fallback trigger:", err);
    }

    // Default Fallback Advisory Narrative if API key unavailable
    if (!llmNarrative) {
      llmNarrative = `### Asset Allocation & Strategy Breakdown
Based on your age of **${inputs.age}** and **${inputs.riskAppetite} Risk** appetite, your portfolio is structured with **${results.equityPercent}% Equity**, **${results.debtPercent}% Debt**, and **${results.goldPercent}% Gold**.

- **Equity (${results.equityPercent}%):** Provides capital appreciation over your ${inputs.investmentDurationYrs}-year timeline to beat inflation and compound wealth.
- **Debt & Fixed Income (${results.debtPercent}%):** Provides capital protection and downside buffer during market downturns.
- **Gold & Commodities (${results.goldPercent}%):** Serves as a macro hedge against systemic market volatility.

### Goal Achievement Feasibility
Your monthly SIP contribution of **${symbol} ${inputs.monthlyInvestment.toLocaleString()}** over **${inputs.investmentDurationYrs} years** achieves an estimated corpus of **${symbol} ${results.projectedCorpus.toLocaleString()}**, representing a **${results.achievementLikelihood}% likelihood** of reaching your **${symbol} ${inputs.netWorthGoal.toLocaleString()}** Net Worth Goal.

*Disclaimer: Projections are computed using standard SIP compound formulas (${results.expectedAnnualReturn}% p.a. return assumption) and are for educational planning purposes.*`;
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
