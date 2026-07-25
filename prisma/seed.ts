import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding FinPilot AI demo database...");

  // 1. Create or update Demo User
  const passwordHash = await bcrypt.hash("password123", 12);
  const user = await prisma.user.upsert({
    where: { email: "demo@finpilot.ai" },
    update: {
      name: "Alex Vance",
      passwordHash,
      currency: "INR",
      riskAppetite: "Medium",
    },
    create: {
      name: "Alex Vance",
      email: "demo@finpilot.ai",
      passwordHash,
      currency: "INR",
      riskAppetite: "Medium",
    },
  });

  console.log(`Demo user ready: ${user.email}`);

  // Clear existing records for demo user
  await prisma.transaction.deleteMany({ where: { userId: user.id } });
  await prisma.spendingLimit.deleteMany({ where: { userId: user.id } });
  await prisma.goal.deleteMany({ where: { userId: user.id } });
  await prisma.investmentPlan.deleteMany({ where: { userId: user.id } });

  // 2. Seed Realistic Transactions
  const now = new Date();
  const daysAgo = (d: number) => {
    const date = new Date(now);
    date.setDate(date.getDate() - d);
    return date;
  };

  await prisma.transaction.createMany({
    data: [
      {
        userId: user.id,
        amount: 95000,
        type: "credit",
        category: "Miscellaneous",
        date: daysAgo(26),
        description: "Monthly Salary Deposit - FinTech Corp",
        paymentMethod: "Bank Transfer",
        source: "MANUAL",
      },
      {
        userId: user.id,
        amount: 4500,
        type: "debit",
        category: "Groceries",
        date: daysAgo(2),
        description: "DMart Supermarket Groceries",
        paymentMethod: "Credit Card",
        source: "MANUAL",
      },
      {
        userId: user.id,
        amount: 1850,
        type: "debit",
        category: "Food & Dining",
        date: daysAgo(4),
        description: "Swiggy Gourmet Dinner",
        paymentMethod: "UPI / Net Banking",
        source: "SMS_PASTE",
      },
      {
        userId: user.id,
        amount: 2800,
        type: "debit",
        category: "Fuel",
        date: daysAgo(6),
        description: "Shell Petrol Station Tank Fill",
        paymentMethod: "Debit Card",
        source: "MANUAL",
      },
      {
        userId: user.id,
        amount: 6200,
        type: "debit",
        category: "Bills",
        date: daysAgo(9),
        description: "Electricity & Fiber Internet Bill",
        paymentMethod: "UPI / Net Banking",
        source: "PDF_UPLOAD",
      },
      {
        userId: user.id,
        amount: 20000,
        type: "debit",
        category: "Investment",
        date: daysAgo(12),
        description: "Zerodha Nifty 50 Index Mutual Fund SIP",
        paymentMethod: "Bank Transfer",
        source: "MANUAL",
      },
      {
        userId: user.id,
        amount: 8500,
        type: "debit",
        category: "Shopping",
        date: daysAgo(15),
        description: "Amazon India Electronics & Apparel",
        paymentMethod: "Credit Card",
        source: "MANUAL",
      },
      {
        userId: user.id,
        amount: 1290,
        type: "debit",
        category: "Entertainment",
        date: daysAgo(18),
        description: "Netflix & Spotify Monthly Subscriptions",
        paymentMethod: "Credit Card",
        source: "MANUAL",
      },
      {
        userId: user.id,
        amount: 3200,
        type: "debit",
        category: "Healthcare",
        date: daysAgo(21),
        description: "Apollo Pharmacy Health Checkup",
        paymentMethod: "UPI / Net Banking",
        source: "MANUAL",
      },
    ],
  });

  // 3. Seed Spending Limits & Overspending Trigger
  await prisma.spendingLimit.createMany({
    data: [
      {
        userId: user.id,
        category: "Food & Dining",
        limit: 1500, // Will trigger overspending alert!
        period: "monthly",
      },
      {
        userId: user.id,
        category: "Entertainment",
        limit: 2000,
        period: "monthly",
      },
      {
        userId: user.id,
        category: "Shopping",
        limit: 10000,
        period: "monthly",
      },
    ],
  });

  // 4. Seed Goals
  const futureDate = (months: number) => {
    const d = new Date();
    d.setMonth(d.getMonth() + months);
    return d;
  };

  await prisma.goal.createMany({
    data: [
      {
        userId: user.id,
        name: "Emergency Fund",
        targetAmount: 300000,
        currentSavings: 180000,
        deadline: futureDate(6),
        category: "Emergency Fund",
        priority: 1,
      },
      {
        userId: user.id,
        name: "Buy MacBook Pro",
        targetAmount: 160000,
        currentSavings: 80000,
        deadline: futureDate(4),
        category: "Buy a Laptop",
        priority: 2,
      },
      {
        userId: user.id,
        name: "Vacation in Japan",
        targetAmount: 250000,
        currentSavings: 50000,
        deadline: futureDate(12),
        category: "Vacation",
        priority: 3,
      },
    ],
  });

  // 5. Seed Investment Plan
  const chartData = [];
  const currentYear = new Date().getFullYear();
  for (let y = 1; y <= 10; y++) {
    chartData.push({
      year: y,
      label: `Year ${y} (${currentYear + y})`,
      totalInvested: 150000 + 25000 * y * 12,
      expectedCorpus: Math.round(150000 * Math.pow(1.105, y) + 25000 * (((Math.pow(1 + 0.105 / 12, y * 12) - 1) / (0.105 / 12)) * (1 + 0.105 / 12))),
      bestCaseCorpus: Math.round(150000 * Math.pow(1.13, y) + 25000 * (((Math.pow(1 + 0.13 / 12, y * 12) - 1) / (0.13 / 12)) * (1 + 0.13 / 12))),
      worstCaseCorpus: Math.round(150000 * Math.pow(1.07, y) + 25000 * (((Math.pow(1 + 0.07 / 12, y * 12) - 1) / (0.07 / 12)) * (1 + 0.07 / 12))),
    });
  }

  await prisma.investmentPlan.create({
    data: {
      userId: user.id,
      age: 28,
      monthlySalary: 95000,
      monthlyExpenses: 48000,
      currentSavings: 150000,
      emergencyFund: 200000,
      netWorthGoal: 10000000,
      monthlyInvestment: 25000,
      investmentDurationYrs: 10,
      riskAppetite: "Medium",
      projectedCorpus: 5834882,
      bestCaseCorpus: 6932104,
      worstCaseCorpus: 4821090,
      totalInvested: 3150000,
      estimatedReturns: 2684882,
      achievementLikelihood: 58,
      equityPercent: 60,
      debtPercent: 30,
      goldPercent: 10,
      llmNarrative: `### Asset Allocation & Strategy Breakdown
Based on your age of **28** and **Medium Risk** appetite, your portfolio is structured with **60% Equity**, **30% Debt**, and **10% Gold**.

- **Equity (60%):** Drives long-term wealth compounding over your 10-year horizon.
- **Debt (30%):** Protects capital during market corrections.
- **Gold (10%):** Serves as an inflation hedge.

### Goal Achievement Feasibility
Your monthly SIP contribution of **₹25,000** over **10 years** achieves an estimated corpus of **₹5,834,882**, representing a **58% likelihood** of reaching your **₹10,000,000** Net Worth Goal.`,
      chartDataJson: JSON.stringify(chartData),
    },
  });

  console.log("Seeding finished successfully!");
}

main()
  .catch((e) => {
    console.error("Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
