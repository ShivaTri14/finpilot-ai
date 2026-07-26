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
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No PDF statement file provided" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    let pdfText = "";
    let numPages = 1;

    try {
      const pdf = require("pdf-parse");
      const parsedPdf = await pdf(buffer);
      pdfText = parsedPdf.text || "";
      numPages = parsedPdf.numpages || 1;
    } catch (e) {
      console.warn("pdf-parse extraction fallback:", e);
      pdfText = buffer.toString("utf-8");
    }

    // Split entire multi-page PDF text into raw lines
    const rawLines = pdfText.split("\n");
    const extractedRows: Array<{
      date: string;
      description: string;
      amount: number;
      type: "debit" | "credit";
      category: string;
      paymentMethod: string;
      source: string;
    }> = [];

    // Real PhonePe PDF Statement Block Parser
    // Block Date Header: "Jul 24, 2026 08:27 pm" or "Jul 24, 2026"
    // Transaction Line: "Paid to Rajesh fast food DEBIT ₹13 Transaction ID T... UTR No. ... Paid by XXXXXX2985"
    // Credit Line: "Received from Mr Saurabh Mishra CREDIT ₹1,000 Transaction ID T... UTR No. ... Credited to XXXXXX2985"
    const phonepeDateRegex = /^([A-Z][a-z]{2}\s+\d{1,2},\s+\d{4})/i;

    let currentDateStr = "";

    for (let i = 0; i < rawLines.length; i++) {
      const line = rawLines[i].trim();
      if (!line) continue;

      // Filter out header/footer noise
      if (
        /page \d+ of \d+/i.test(line) ||
        /phonepe transaction statement|support\.phonepe\.com|transaction details/i.test(line)
      ) {
        continue;
      }

      // Check if line is a Date Header
      const dateMatch = line.match(phonepeDateRegex);
      if (dateMatch) {
        // Standardize Date string to YYYY-MM-DD
        const rawDate = dateMatch[1]; // e.g. "Jul 24, 2026"
        try {
          const parsedD = new Date(rawDate);
          if (!isNaN(parsedD.getTime())) {
            currentDateStr = parsedD.toISOString().split("T")[0];
          }
        } catch (e) {
          currentDateStr = new Date().toISOString().split("T")[0];
        }
        continue;
      }

      // Check for PhonePe Paid to / Received from transaction line
      const paidToMatch = line.match(/(?:Paid to|Received from)\s+(.+?)\s+(DEBIT|CREDIT)\s+[₹$€£]?\s*([\d,]+(?:\.\d{1,2})?)/i);

      if (paidToMatch) {
        const rawPayee = paidToMatch[1].trim();
        const typeKeyword = paidToMatch[2].toUpperCase();
        const rawAmount = paidToMatch[3].replace(/,/g, "");
        const amount = parseFloat(rawAmount);

        const type: "debit" | "credit" = typeKeyword === "CREDIT" ? "credit" : "debit";

        // Clean payee description (handles emojis like Papa❤ gracefully)
        const description = rawPayee || "PhonePe Transaction";

        if (!isNaN(amount) && amount > 0) {
          const catResult = await categorizeTransaction(description, userId);

          extractedRows.push({
            date: currentDateStr || new Date().toISOString().split("T")[0],
            description,
            amount,
            type,
            category: catResult.category,
            paymentMethod: "PhonePe Statement PDF",
            source: "PDF_UPLOAD",
          });
        }
      }
    }

    // DIAGNOSTIC LOGGING (Requested by User)
    console.log("==========================================");
    console.log(`[REAL PHONEPE PDF LOG] Pages Detected: ${numPages}`);
    console.log(`[REAL PHONEPE PDF LOG] Total Characters Extracted: ${pdfText.length}`);
    console.log(`[REAL PHONEPE PDF LOG] Total Transactions Extracted: ${extractedRows.length}`);
    if (extractedRows.length > 0) {
      console.log(`[REAL PHONEPE PDF LOG] First 3 Rows Sample:`, JSON.stringify(extractedRows.slice(0, 3), null, 2));
    }
    console.log("==========================================");

    return NextResponse.json({
      message: `Successfully extracted ${extractedRows.length} transactions from PhonePe PDF statement across ${numPages} pages`,
      rows: extractedRows,
    });
  } catch (error: any) {
    console.error("PDF parse error:", error);
    return NextResponse.json({ error: "Failed to parse PDF statement" }, { status: 500 });
  }
}
