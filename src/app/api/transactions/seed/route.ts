import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || !(session.user as any).id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as any).id;

    // Generate realistic demo transactions relative to today's date
    const now = new Date();
    const daysAgo = (days: number) => {
      const d = new Date(now);
      d.setDate(d.getDate() - days);
      return d;
    };

    const demoTransactions = [
      {
        userId,
        amount: 85000,
        type: "credit",
        category: "Miscellaneous",
        date: daysAgo(25),
        description: "Monthly Salary Deposit - TechCorp Inc",
        paymentMethod: "Bank Transfer",
        source: "MANUAL",
      },
      {
        userId,
        amount: 3200,
        type: "debit",
        category: "Groceries",
        date: daysAgo(2),
        description: "Nature's Basket Supermarket",
        paymentMethod: "Credit Card",
        source: "MANUAL",
      },
      {
        userId,
        amount: 1450,
        type: "debit",
        category: "Food & Dining",
        date: daysAgo(4),
        description: "Swiggy Gourmet Dining",
        paymentMethod: "UPI / Net Banking",
        source: "MANUAL",
      },
      {
        userId,
        amount: 2800,
        type: "debit",
        category: "Fuel",
        date: daysAgo(6),
        description: "Shell Petrol Station Filling",
        paymentMethod: "Debit Card",
        source: "MANUAL",
      },
      {
        userId,
        amount: 4500,
        type: "debit",
        category: "Bills",
        date: daysAgo(9),
        description: "Electricity & Broadband Utility Bill",
        paymentMethod: "UPI / Net Banking",
        source: "MANUAL",
      },
      {
        userId,
        amount: 12000,
        type: "debit",
        category: "Investment",
        date: daysAgo(12),
        description: "Zerodha Mutual Fund SIP Equity",
        paymentMethod: "Bank Transfer",
        source: "MANUAL",
      },
      {
        userId,
        amount: 5400,
        type: "debit",
        category: "Shopping",
        date: daysAgo(15),
        description: "Amazon India Electronics & Books",
        paymentMethod: "Credit Card",
        source: "MANUAL",
      },
      {
        userId,
        amount: 890,
        type: "debit",
        category: "Entertainment",
        date: daysAgo(18),
        description: "Netflix & Spotify Monthly Subscriptions",
        paymentMethod: "Credit Card",
        source: "MANUAL",
      },
      {
        userId,
        amount: 3500,
        type: "debit",
        category: "Healthcare",
        date: daysAgo(21),
        description: "Apollo Pharmacy Health Checkup",
        paymentMethod: "UPI / Net Banking",
        source: "MANUAL",
      },
    ];

    const result = await prisma.transaction.createMany({
      data: demoTransactions,
    });

    return NextResponse.json({
      message: "Sample demo transactions seeded successfully!",
      count: result.count,
    });
  } catch (error: any) {
    console.error("POST /api/transactions/seed error:", error);
    return NextResponse.json({ error: "Failed to seed demo transactions" }, { status: 500 });
  }
}
