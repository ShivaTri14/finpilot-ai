import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { categorizeTransaction } from "@/lib/categorizer";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || !(session.user as any).id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const { smsText } = await req.json();

    if (!smsText || typeof smsText !== "string") {
      return NextResponse.json({ error: "No SMS text provided" }, { status: 400 });
    }

    // Split pasted text into lines (supports single SMS or bulk pasted lines)
    const lines = smsText
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.length > 5);

    const parsedRows: Array<{
      date: string;
      description: string;
      amount: number;
      type: "debit" | "credit";
      category: string;
      paymentMethod: string;
      source: string;
    }> = [];

    // Regex pattern for common bank SMS formats:
    // e.g., "Spent Rs. 1450.00 at Swiggy on 24-Jul-24 via HDFC Card ending 4012"
    // e.g., "Rs 2800 debited from A/c xx4912 for Shell Petrol on 22/07/2026"
    // e.g., "Received Rs. 50000.00 credited to A/c xx1092 on 01-Jul-2026"
    const amountRegex = /(?:rs\.?|inr|\$|€|£)\s*([\d,]+(?:\.\d{2})?)|([\d,]+(?:\.\d{2})?)\s*(?:debited|credited|spent)/i;
    const merchantRegex = /(?:at|vpa|to|info|for|paid to|towards)\s+([A-Za-z0-9\s&'-]+?)(?=\s+(?:on|via|using|ref|bal|a\/c|\.|$))/i;

    for (const line of lines) {
      const amtMatch = line.match(amountRegex);
      const isCredit = /credited|received|deposited|refund/i.test(line);
      const isDebit = /debited|spent|paid|withdrawn/i.test(line);

      if (amtMatch) {
        const rawAmt = (amtMatch[1] || amtMatch[2]).replace(/,/g, "");
        const amount = parseFloat(rawAmt);

        if (!isNaN(amount) && amount > 0) {
          const merchMatch = line.match(merchantRegex);
          let description = merchMatch ? merchMatch[1].trim() : "Bank SMS Transaction";

          // Clean up merchant name
          description = description.replace(/\s+/g, " ").substring(0, 50);

          const catResult = await categorizeTransaction(description || line, userId);

          parsedRows.push({
            date: new Date().toISOString().split("T")[0],
            description,
            amount,
            type: isCredit ? "credit" : "debit",
            category: catResult.category,
            paymentMethod: "SMS Paste",
            source: "SMS_PASTE",
          });
        }
      }
    }

    return NextResponse.json({
      message: `Parsed ${parsedRows.length} transactions from SMS text`,
      rows: parsedRows,
    });
  } catch (error: any) {
    console.error("SMS parse error:", error);
    return NextResponse.json({ error: "Failed to parse SMS text" }, { status: 500 });
  }
}
