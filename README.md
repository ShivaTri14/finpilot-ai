# FinPilot AI — Personal Financial Coach

FinPilot AI is a full personal financial-coaching web application that ingests real financial data, reasons over it, and delivers personalized budgeting insights, goal-planning, SIP investment guidance, and conversational financial education with clear numbers, timelines, and confidence probabilities.

---

## 🌟 Key Features & Core Modules

1. **User Authentication & Profile (Module 1)**:
   - Credentials sign-up & login with `bcryptjs` password hashing and NextAuth.js JWT session protection.
   - Token-based password reset flow.
   - User profile customization (Name, Currency: ₹ INR, $ USD, € EUR, £ GBP, and Default Risk Appetite: Low, Medium, High).

2. **Financial Data Collection (Module 2)**:
   - **Bank Statement PDF Upload**: Server-side PDF extraction of transaction rows (`pdf-parse`) into an editable confirmation table before saving to the DB.
   - **Paste Bank SMS Parsing**: UI clearly labeled "Paste Bank SMS" (per Section 5 SMS Feasibility Constraint) using Regex + LLM fallback for irregular formats.
   - **Manual Entry**: Modal entry form with quick single and bulk entry options.

3. **AI Expense Tracker (Module 3)**:
   - Auto-categorization across 13 fixed categories (`Food & Dining`, `Transportation`, `Shopping`, `Bills`, `Entertainment`, `Healthcare`, `Travel`, `Education`, `Groceries`, `Fuel`, `Investment`, `Insurance`, `Miscellaneous`).
   - Rule-based keyword engine + User Merchant Override rules + LLM fallback.
   - Recharts trend analysis (Daily, Weekly, Monthly, Yearly).
   - Per-category Spending Limits and Overspending Alert banners when limits are exceeded.

4. **Financial Goal Planner (Module 4)**:
   - Preset quick-add templates (`Buy a Car`, `Buy a House`, `Buy a Laptop`, `Vacation`, `Wedding`, `Emergency Fund`, `Retirement`, `Education`) & custom targets.
   - Live Surplus Engine math: compares required monthly savings against actual average monthly surplus pulled directly from transaction data.
   - Feasibility status badges: **`On Track`**, **`At Risk`**, and **`Unrealistic`**, plus projected completion date at current savings rate.

5. **AI Investment Model (Module 5)**:
   - **Layer 1 (Deterministic Financial Math)**: Monthly SIP compounding formula $FV = P \times \left[ \frac{(1+r)^n - 1}{r} \right] \times (1+r)$, assumed return rates (Low 6.5%, Medium 10.5%, High 13.5% p.a.), and deterministic scenario bands (Expected, Best-Case +2.5%, Worst-Case -3.5%) rendered on Recharts Area Charts.
   - **Layer 2 (LLM Narrative)**: Server-side LLM advisory narrative explaining the exact computed asset allocation (% Equity / Debt / Gold) and reasoning without inventing numbers.

6. **AI Financial Chatbot (Module 6)**:
   - Context-aware chatbot that dynamically ingests the user's live profile, Module 3 expenses, Module 4 goals, and Module 5 investment plan into the system prompt on every request.
   - Persisted message history (`ChatMessage` table), interactive suggested starter questions, typing indicator, and 1-click copy support.

---

## 📌 Technical Constraint Note: SMS Parsing

A web application deployed on Vercel **cannot read a user's phone SMS inbox directly** — web browsers have no operating system API for reading native phone SMS messages. Per **Section 5 of the Product Requirements Document (PRD)**:

- This feature is implemented as a **"Paste Bank SMS"** tool. The user copy-pastes the text of bank SMS messages (single or bulk), and the backend/AI parses the text to extract transaction details (amount, payee, date, debit/credit).
- This is the intended and honest implementation pattern for web deployment.

---

## 🛠️ Tech Stack & Architecture

- **Framework**: Next.js 16 (App Router) + TypeScript
- **Styling**: Tailwind CSS v4 + Lucide React Icons
- **Database & ORM**: Prisma ORM v7 + PostgreSQL (Supabase / Neon / Vercel Postgres ready)
- **Auth**: NextAuth.js (Credentials provider)
- **Charts**: Recharts
- **PDF Extraction**: `pdf-parse`
- **AI / LLM API**: Google Gemini / OpenAI API (Server-side API routes only)

---

## ⚙️ Environment Variables (`.env.local`)

Copy `.env.example` to `.env.local` and configure:

```env
DATABASE_URL="postgresql://postgres:[PASSWORD]@[HOST]:5432/finpilot"
DIRECT_URL="postgresql://postgres:[PASSWORD]@[HOST]:5432/finpilot"
NEXTAUTH_SECRET="your-super-secret-nextauth-key"
NEXTAUTH_URL="http://localhost:3000"
LLM_PROVIDER="gemini"
LLM_API_KEY="your-llm-api-key"
DEFAULT_CURRENCY="INR"
```

---

## 🚀 Quick Start & Local Setup

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Generate Prisma Client**:
   ```bash
   npx prisma generate
   ```

3. **Seed Demo Account & Transactions**:
   ```bash
   npm run db:seed
   ```

4. **Start Development Server**:
   ```bash
   npm run dev
   ```
   Open `http://localhost:3000` in your browser.

5. **Demo Account Credentials**:
   - **Email**: `demo@finpilot.ai`
   - **Password**: `password123`

---

## 🚢 Deployment to Vercel

1. Push code repository to GitHub.
2. Import project into Vercel Dashboard.
3. Add environment variables from `.env.example` under **Settings $\rightarrow$ Environment Variables**.
4. Click **Deploy**. Vercel will run `next build` and deploy the serverless application cleanly.
