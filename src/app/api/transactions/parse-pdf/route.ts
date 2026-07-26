import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { EXPENSE_CATEGORIES } from "@/lib/constants";

// Enable maximum serverless execution time for bulk statement uploads
export const maxDuration = 60;

// Fast in-memory rule dictionary for bulk statement categorization
const FAST_KEYWORD_RULES: Record<string, string[]> = {
  "Food & Dining": ["swiggy", "zomato", "mcdonald", "starbucks", "restaurant", "cafe", "pizza", "burger", "kfc", "domino", "subway", "bar", "diner", "coffee", "baking", "bakery", "fast food", "hotel", "canteen", "eatery", "tiffin"],
  Transportation: ["uber", "ola", "rapido", "metro", "cab", "taxi", "train", "irctc", "transit", "toll", "auto", "bus", "fastag", "parking"],
  Shopping: ["amazon", "flipkart", "myntra", "zara", "h&m", "retail", "shopping", "store", "mall", "fashion", "apparel", "clothing", "meesho", "ajio", "trends", "pantaloons", "decathlon"],
  Bills: ["electricity", "water", "gas", "broadband", "wifi", "recharge", "mobile bill", "airtel", "jio", "vi", "bescom", "utility", "postpaid", "dth", "tata play", "electricity bill", "power"],
  Entertainment: ["netflix", "spotify", "bookmyshow", "cinema", "movie", "hotstar", "prime video", "playstation", "steam", "theatre", "concert", "gaming", "pvr", "inox"],
  Healthcare: ["pharmacy", "apollo", "medplus", "hospital", "doctor", "clinic", "lab", "pharmeasy", "medical", "health", "diagnostic", "dental", "chemist"],
  Travel: ["makemytrip", "indigo", "flight", "hotel", "airbnb", "booking.com", "goibibo", "resort", "trip", "airline", "stay", "cleartrip"],
  Education: ["udemy", "coursera", "tuition", "school", "college", "university", "course", "book", "fee", "academy", "class"],
  Groceries: ["supermarket", "nature's basket", "blinkit", "zepto", "instamart", "bigbasket", "grocery", "mart", "reliance fresh", "spencer", "d-mart", "dmart", "provision", "vegetable"],
  Fuel: ["petrol", "diesel", "shell", "hpcl", "bpcl", "iocl", "fuel", "gas station", "oil", "petroleum"],
  Investment: ["zerodha", "groww", "mutual fund", "sip", "equity", "coin", "stocks", "kite", "angelone", "upstox", "indmoney", "ppf", "fd", "nps", "smallcase"],
  Insurance: ["hdfc ergo", "lic", "insurance", "max bupa", "policybazaar", "premium", "term plan", "health shield", "acko", "care health"],
};

export async function POST(req: Request) {
  const startTime = Date.now();
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

    // Single batch query for all user merchant overrides (0 sequential queries inside the loop!)
    const userOverrides = await prisma.merchantOverride.findMany({
      where: { userId },
    });
    const overrideMap: Record<string, string> = {};
    userOverrides.forEach((o) => {
      overrideMap[o.merchant.toLowerCase().trim()] = o.category;
    });

    // Fast in-memory categorization function (Instant: <0.01ms per row, 0 network calls!)
    const fastCategorize = (desc: string): string => {
      if (!desc) return "Miscellaneous";
      const normalized = desc.toLowerCase().trim();

      // 1. Check batch-loaded user merchant override map
      if (overrideMap[normalized]) {
        return overrideMap[normalized];
      }
      for (const [m, cat] of Object.entries(overrideMap)) {
        if (normalized.includes(m)) return cat;
      }

      // 2. Fast in-memory rule dictionary match
      for (const [cat, keywords] of Object.entries(FAST_KEYWORD_RULES)) {
        for (const kw of keywords) {
          if (normalized.includes(kw)) {
            return cat;
          }
        }
      }

      // 3. Default to "Miscellaneous" (User can quickly edit via confirmation table dropdown)
      return "Miscellaneous";
    };

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

    let currentDateStr = new Date().toISOString().split("T")[0];

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
        const description = rawPayee || "PhonePe Transaction";

        if (!isNaN(amount) && amount > 0) {
          // Instant in-memory categorization (<0.01ms, zero network/LLM calls)
          const category = fastCategorize(description);

          extractedRows.push({
            date: currentDateStr,
            description,
            amount,
            type,
            category,
            paymentMethod: "PhonePe Statement PDF",
            source: "PDF_UPLOAD",
          });
        }
      }
    }

    const durationMs = Date.now() - startTime;
    console.log(`[PDF BATCH PARSER SUCCESS] Extracted ${extractedRows.length} rows across ${numPages} pages in ${durationMs}ms`);

    return NextResponse.json({
      message: `Successfully extracted ${extractedRows.length} transactions from PhonePe PDF statement across ${numPages} pages in ${durationMs}ms`,
      rows: extractedRows,
      durationMs,
    });
  } catch (error: any) {
    console.error("PDF parse error:", error);
    return NextResponse.json({ error: "Failed to parse PDF statement" }, { status: 500 });
  }
}
