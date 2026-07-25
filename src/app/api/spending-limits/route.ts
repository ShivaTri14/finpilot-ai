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
    const spendingLimits = await prisma.spendingLimit.findMany({
      where: { userId },
    });

    return NextResponse.json({ spendingLimits });
  } catch (error: any) {
    console.error("GET /api/spending-limits error:", error);
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
    const { category, limit, period } = await req.json();

    if (!category || limit === undefined || isNaN(Number(limit))) {
      return NextResponse.json({ error: "Category and valid numerical limit are required" }, { status: 400 });
    }

    const numLimit = Number(limit);

    const spendingLimit = await prisma.spendingLimit.upsert({
      where: {
        userId_category: {
          userId,
          category,
        },
      },
      update: {
        limit: numLimit,
        period: period || "monthly",
      },
      create: {
        userId,
        category,
        limit: numLimit,
        period: period || "monthly",
      },
    });

    return NextResponse.json({ spendingLimit }, { status: 200 });
  } catch (error: any) {
    console.error("POST /api/spending-limits error:", error);
    return NextResponse.json({ error: "Failed to save spending limit" }, { status: 500 });
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
      return NextResponse.json({ error: "ID is required" }, { status: 400 });
    }

    await prisma.spendingLimit.deleteMany({
      where: { id, userId },
    });

    return NextResponse.json({ message: "Spending limit removed" });
  } catch (error: any) {
    console.error("DELETE /api/spending-limits error:", error);
    return NextResponse.json({ error: "Failed to delete limit" }, { status: 500 });
  }
}
