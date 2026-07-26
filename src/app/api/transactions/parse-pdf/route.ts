import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Require pdf-parse core library directly to bypass index.js default test file check
const pdfParse = require("pdf-parse/lib/pdf-parse.js");

// Enable maximum serverless execution time for bulk statement uploads
export const maxDuration = 60;

// Fast in-memory rule dictionary for bulk statement categorization
const FAST_KEYWORD_RULES: Record<string, string[]> = {
  "Food & Dining": ["swiggy", "zomato", "mcdonald", "starbucks", "restaurant", "cafe", "pizza", "burger", "kfc", "domino", "subway", "bar", "diner", "coffee", "baking", "bakery", "fast food", "hotel", "canteen", "eatery", "tiffin", "food"],
  Transportation: ["uber", "ola", "rapido", "metro", "cab", "taxi", "train", "irctc", "transit", "toll", "auto", "bus", "fastag", "parking"],
  Shopping: ["amazon", "flipkart", "myntra", "zara", "h&m", "retail", "shopping", "store", "mall", "fashion", "apparel", "clothing", "meesho", "ajio", "trends", "pantaloons", "decathlon"],
  Bills: ["electricity", "water", "gas", "broadband", "wifi", "recharge", "mobile bill", "airtel", "jio", "vi", "bescom", "utility", "postpaid", "dth", "tata play", "electricity bill", "power", "bill"],
  Entertainment: ["netflix", "spotify", "bookmyshow", "cinema", "movie", "hotstar", "prime video", "playstation", "steam", "theatre", "concert", "gaming", "pvr", "inox"],
  Healthcare: ["pharmacy", "apollo", "medplus", "hospital", "doctor", "clinic", "lab", "pharmeasy", "medical", "health", "diagnostic", "dental", "chemist"],
  Travel: ["makemytrip", "indigo", "flight", "hotel", "airbnb", "booking.com", "goibibo", "resort", "trip", "airline", "stay", "cleartrip"],
  Education: ["udemy", "coursera", "tuition", "school", "college", "university", "course", "book", "fee", "academy", "class"],
  Groceries: ["supermarket", "nature's basket", "blinkit", "zepto", "instamart", "bigbasket", "grocery", "mart", "reliance fresh", "spencer", "d-mart", "dmart", "provision", "vegetable"],
  Fuel: ["petrol", "diesel", "shell", "hpcl", "bpcl", "iocl", "fuel", "gas station", "oil", "petroleum"],
  Investment: ["zerodha", "groww", "mutual fund", "sip", "equity", "coin", "stocks", "kite", "angelone", "upstox", "indmoney", "ppf", "fd", "nps", "smallcase"],
  Insurance: ["hdfc ergo", "lic", "insurance", "max bupa", "policybazaar", "premium", "term plan", "health shield", "acko", "care health"],
};

function parseMonthYearDay(rawDateStr: string): string {
  const months: Record<string, string> = {
    jan: "01", feb: "02", mar: "03", apr: "04", may: "05", jun: "06",
    jul: "07", aug: "08", sep: "09", oct: "10", nov: "11", dec: "12"
  };
  const m = rawDateStr.match(/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{1,2}),?\s+(\d{4})/i);
  if (m) {
    const mon = months[m[1].toLowerCase()] || "01";
    const day = m[2].padStart(2, "0");
    const yr = m[3];
    return `${yr}-${mon}-${day}`;
  }
  return new Date().toISOString().split("T")[0];
}

export async function POST(req: Request) {
  const startTime = Date.now();
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || !(session.user as any).id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const url = new URL(req.url);
    const isDebug = url.searchParams.get("debug") === "1" || url.searchParams.has("debug");

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
      const parsedPdf = await pdfParse(buffer);
      pdfText = parsedPdf.text || "";
      numPages = parsedPdf.numpages || 1;
    } catch (e: any) {
      console.error("[PDF PARSE ERROR]", e.message);
      return NextResponse.json(
        {
          error: `PDF text extraction error: ${e.message || String(e)}`,
          pdfParseError: e.message || String(e),
        },
        { status: 400 }
      );
    }

    // DEBUG MODE RAW TEXT PREVIEW & CHAR CODE DUMP
    let rawTextPreview = "";
    let charCodeDump: Array<{ index: number; char: string; code: number }> = [];

    if (isDebug) {
      const slice = pdfText.substring(0, 3000);
      rawTextPreview = slice
        .replace(/\r/g, "\\r")
        .replace(/\n/g, "\\n\n")
        .replace(/\t/g, "\\t")
        .replace(/\u00A0/g, "[NBSP]")
        .replace(/[\u1680\u180e\u2000-\u200b\u202f\u205f\u3000\ufeff]/g, (m) => `[U+${m.charCodeAt(0).toString(16).toUpperCase()}]`);

      const dumpSlice = pdfText.substring(0, 200);
      charCodeDump = Array.from(dumpSlice).map((char, index) => ({
        index,
        char: char === "\n" ? "\\n" : char === "\r" ? "\\r" : char === "\t" ? "\\t" : char === "\u00A0" ? "[NBSP]" : char,
        code: char.charCodeAt(0),
      }));
    }

    // Text Normalization
    const normalizedPdfText = pdfText.replace(/[\u00A0\u1680\u180e\u2000-\u200b\u202f\u205f\u3000\ufeff]/g, " ");

    const userOverrides = await prisma.merchantOverride.findMany({
      where: { userId },
    });
    const overrideMap: Record<string, string> = {};
    userOverrides.forEach((o) => {
      overrideMap[o.merchant.toLowerCase().trim()] = o.category;
    });

    const fastCategorize = (desc: string): string => {
      if (!desc) return "Miscellaneous";
      const normalized = desc.toLowerCase().trim();

      if (overrideMap[normalized]) return overrideMap[normalized];
      for (const [m, cat] of Object.entries(overrideMap)) {
        if (normalized.includes(m)) return cat;
      }

      for (const [cat, keywords] of Object.entries(FAST_KEYWORD_RULES)) {
        for (const kw of keywords) {
          if (normalized.includes(kw)) return cat;
        }
      }

      return "Miscellaneous";
    };

    const rawLines = normalizedPdfText.split("\n").map((l) => l.trim()).filter(Boolean);
    const extractedRows: Array<{
      date: string;
      description: string;
      amount: number;
      type: "debit" | "credit";
      category: string;
      paymentMethod: string;
      source: string;
    }> = [];

    const phonepeDateRegex = /(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2},\s+\d{4}/i;
    let currentDateStr = new Date().toISOString().split("T")[0];

    for (let i = 0; i < rawLines.length; i++) {
      const line = rawLines[i];

      if (
        /page \d+ of \d+/i.test(line) ||
        /phonepe transaction statement|support\.phonepe\.com|transaction details/i.test(line)
      ) {
        continue;
      }

      const dateMatch = line.match(phonepeDateRegex);
      if (dateMatch) {
        currentDateStr = parseMonthYearDay(dateMatch[0]);
        continue;
      }

      const paidToMatch = line.match(/(?:Paid to|Received from)\s+(.+?)\s+(DEBIT|CREDIT)\s+[₹$€£]?\s*([\d,]+(?:\.\d{1,2})?)/i);

      if (paidToMatch) {
        const rawPayee = paidToMatch[1].trim();
        const typeKeyword = paidToMatch[2].toUpperCase();
        const rawAmount = paidToMatch[3].replace(/,/g, "");
        const amount = parseFloat(rawAmount);

        const type: "debit" | "credit" = typeKeyword === "CREDIT" ? "credit" : "debit";
        const description = rawPayee || "PhonePe Transaction";

        if (!isNaN(amount) && amount > 0) {
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

    if (extractedRows.length === 0) {
      const blockRegex = /(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec\s+\d{1,2},\s+\d{4})[\s\S]*?(?:Paid to|Received from)\s+(.+?)\s+(DEBIT|CREDIT)\s+[₹$€£]?\s*([\d,]+(?:\.\d{1,2})?)/gi;
      let bMatch;
      while ((bMatch = blockRegex.exec(normalizedPdfText)) !== null) {
        const dateStr = parseMonthYearDay(bMatch[1]);
        const description = bMatch[2].trim();
        const typeStr = bMatch[3].toUpperCase();
        const amount = parseFloat(bMatch[4].replace(/,/g, ""));

        if (!isNaN(amount) && amount > 0) {
          extractedRows.push({
            date: dateStr,
            description,
            amount,
            type: typeStr === "CREDIT" ? "credit" : "debit",
            category: fastCategorize(description),
            paymentMethod: "PhonePe Statement PDF",
            source: "PDF_UPLOAD",
          });
        }
      }
    }

    const durationMs = Date.now() - startTime;

    console.log("[PDF STATEMENT PARSER SUMMARY]", {
      numPages,
      pdfTextLength: pdfText.length,
      extractedRowCount: extractedRows.length,
      durationMs,
      isDebug,
    });

    return NextResponse.json({
      message: `Successfully extracted ${extractedRows.length} transactions from PhonePe PDF statement across ${numPages} pages in ${durationMs}ms`,
      rows: extractedRows,
      durationMs,
      ...(isDebug && {
        isDebug: true,
        rawTextLength: pdfText.length,
        rawTextPreview,
        charCodeDump,
      }),
    });
  } catch (error: any) {
    console.error("PDF parse error:", error);
    return NextResponse.json({ error: `Failed to parse PDF statement: ${error.message || String(error)}` }, { status: 500 });
  }
}
