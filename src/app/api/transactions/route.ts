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
    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category");
    const source = searchParams.get("source");

    const transactions = await prisma.transaction.findMany({
      where: {
        userId,
        ...(category && category !== "All" ? { category } : {}),
        ...(source && source !== "All" ? { source } : {}),
      },
      orderBy: { date: "desc" },
    });

    return NextResponse.json({ transactions });
  } catch (error: any) {
    console.error("GET /api/transactions error:", error);
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

    // Check if body is array for bulk insertion or single object
    if (Array.isArray(body)) {
      if (body.length === 0) {
        return NextResponse.json({ error: "Empty transactions array" }, { status: 400 });
      }

      const formatted = body.map((tx: any) => ({
        userId,
        amount: Number(tx.amount),
        type: tx.type || "debit",
        category: tx.category || "Miscellaneous",
        date: tx.date ? new Date(tx.date) : new Date(),
        description: tx.description || "Manual Entry",
        paymentMethod: tx.paymentMethod || "UPI / Net Banking",
        source: tx.source || "MANUAL",
      }));

      const created = await prisma.transaction.createMany({
        data: formatted,
      });

      return NextResponse.json({ message: "Transactions added", count: created.count }, { status: 201 });
    } else {
      const { amount, type, category, date, description, paymentMethod, source } = body;

      if (!amount || isNaN(Number(amount))) {
        return NextResponse.json({ error: "Valid amount is required" }, { status: 400 });
      }

      const transaction = await prisma.transaction.create({
        data: {
          userId,
          amount: Number(amount),
          type: type || "debit",
          category: category || "Miscellaneous",
          date: date ? new Date(date) : new Date(),
          description: description ? description.trim() : "Manual Expense",
          paymentMethod: paymentMethod || "UPI / Net Banking",
          source: source || "MANUAL",
        },
      });

      return NextResponse.json({ transaction }, { status: 201 });
    }
  } catch (error: any) {
    console.error("POST /api/transactions error:", error);
    return NextResponse.json({ error: "Failed to save transaction(s)" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || !(session.user as any).id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Transaction ID is required" }, { status: 400 });
    }

    const tx = await prisma.transaction.findFirst({
      where: { id, userId },
    });

    if (!tx) {
      return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
    }

    await prisma.transaction.delete({
      where: { id },
    });

    return NextResponse.json({ message: "Transaction deleted" });
  } catch (error: any) {
    console.error("DELETE /api/transactions error:", error);
    return NextResponse.json({ error: "Failed to delete transaction" }, { status: 500 });
  }
}
