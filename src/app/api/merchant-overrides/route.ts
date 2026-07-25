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
    const { merchant, category, updatePast } = await req.json();

    if (!merchant || !category) {
      return NextResponse.json({ error: "Merchant and category are required" }, { status: 400 });
    }

    const normalizedMerchant = merchant.toLowerCase().trim();

    // Upsert merchant override rule
    const override = await prisma.merchantOverride.upsert({
      where: {
        userId_merchant: {
          userId,
          merchant: normalizedMerchant,
        },
      },
      update: { category },
      create: {
        userId,
        merchant: normalizedMerchant,
        category,
      },
    });

    let updatedCount = 0;
    if (updatePast !== false) {
      // Bulk update existing transactions matching this merchant name
      const res = await prisma.transaction.updateMany({
        where: {
          userId,
          description: {
            contains: normalizedMerchant,
          },
        },
        data: { category },
      });
      updatedCount = res.count;
    }

    return NextResponse.json({
      message: `Categorization rule saved for ${merchant}`,
      override,
      updatedCount,
    });
  } catch (error: any) {
    console.error("POST /api/merchant-overrides error:", error);
    return NextResponse.json({ error: "Failed to save merchant override rule" }, { status: 500 });
  }
}
