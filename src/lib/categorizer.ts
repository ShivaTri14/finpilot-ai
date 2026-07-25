import { prisma } from "@/lib/prisma";
import { EXPENSE_CATEGORIES } from "@/lib/constants";

// Rule-based keyword dictionary matching PRD categories
const KEYWORD_RULES: Record<string, string[]> = {
  "Food & Dining": ["swiggy", "zomato", "mcdonald", "starbucks", "restaurant", "cafe", "pizza", "burger", "kfc", "domino", "subway", "bar", "diner", "coffee", "baking", "bakery"],
  Transportation: ["uber", "ola", "rapido", "metro", "cab", "taxi", "train", "irctc", "transit", "toll", "auto", "bus"],
  Shopping: ["amazon", "flipkart", "myntra", "zara", "h&m", "retail", "shopping", "store", "mall", "fashion", "apparel", "clothing", "meesho", "ajio"],
  Bills: ["electricity", "water", "gas", "broadband", "wifi", "recharge", "mobile bill", "airtel", "jio", "vi", "bescom", "utility", "postpaid", "dth", "tata play"],
  Entertainment: ["netflix", "spotify", "bookmyshow", "cinema", "movie", "hotstar", "prime video", "playstation", "steam", "theatre", "concert", "gaming"],
  Healthcare: ["pharmacy", "apollo", "medplus", "hospital", "doctor", "clinic", "lab", "pharmeasy", "medical", "health", "diagnostic", "dental"],
  Travel: ["makemytrip", "indigo", "flight", "hotel", "airbnb", "booking.com", "goibibo", "resort", "trip", "airline", "stay"],
  Education: ["udemy", "coursera", "tuition", "school", "college", "university", "course", "book", "fee", "academy", "class"],
  Groceries: ["supermarket", "nature's basket", "blinkit", "zepto", "instamart", "bigbasket", "grocery", "mart", "reliance fresh", "spencer", "d-mart", "dmart"],
  Fuel: ["petrol", "diesel", "shell", "hpcl", "bpcl", "iocl", "fuel", "gas station", "oil"],
  Investment: ["zerodha", "groww", "mutual fund", "sip", "equity", "coin", "stocks", "kite", "angelone", "upstox", "indmoney", "ppf", "fd", "nps"],
  Insurance: ["hdfc ergo", "lic", "insurance", "max bupa", "policybazaar", "premium", "term plan", "health shield", "acko"],
};

export async function categorizeTransaction(
  description: string,
  userId?: string
): Promise<{ category: string; method: "OVERRIDE" | "RULE" | "LLM" | "FALLBACK" }> {
  if (!description) return { category: "Miscellaneous", method: "FALLBACK" };

  const normalized = description.toLowerCase().trim();

  // 1. User Merchant Override check (Highest Priority)
  if (userId) {
    const override = await prisma.merchantOverride.findFirst({
      where: {
        userId,
        merchant: {
          contains: normalized,
        },
      },
    });

    if (override && EXPENSE_CATEGORIES.includes(override.category as any)) {
      return { category: override.category, method: "OVERRIDE" };
    }
  }

  // 2. Rule-based keyword matching (Fast, free, deterministic)
  for (const [category, keywords] of Object.entries(KEYWORD_RULES)) {
    for (const keyword of keywords) {
      if (normalized.includes(keyword)) {
        return { category, method: "RULE" };
      }
    }
  }

  // 3. Server-side LLM Fallback Call for ambiguous merchant names
  try {
    const llmApiKey = process.env.LLM_API_KEY;
    if (llmApiKey) {
      const prompt = `Categorize this bank transaction/payee description into EXACTLY one of these categories:
[${EXPENSE_CATEGORIES.join(", ")}].
Description: "${description}".
Respond ONLY with the category name string, nothing else.`;

      // Call Gemini API if available
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${llmApiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const output = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
        if (output && EXPENSE_CATEGORIES.includes(output as any)) {
          return { category: output, method: "LLM" };
        }
      }
    }
  } catch (err) {
    console.warn("LLM auto-categorization fallback failed:", err);
  }

  // Default fallback if no match
  return { category: "Miscellaneous", method: "FALLBACK" };
}
