export interface InvestmentInputs {
  age: number;
  monthlySalary: number;
  monthlyExpenses: number;
  currentSavings: number;
  emergencyFund: number;
  netWorthGoal: number;
  monthlyInvestment: number;
  investmentDurationYrs: number;
  riskAppetite: "Low" | "Medium" | "High";
}

export interface YearGrowthPoint {
  year: number;
  label: string;
  totalInvested: number;
  expectedCorpus: number;
  bestCaseCorpus: number;
  worstCaseCorpus: number;
}

export interface ComputedInvestmentResults {
  projectedCorpus: number;
  bestCaseCorpus: number;
  worstCaseCorpus: number;
  totalInvested: number;
  estimatedReturns: number;
  achievementLikelihood: number;
  equityPercent: number;
  debtPercent: number;
  goldPercent: number;
  expectedAnnualReturn: number;
  chartData: YearGrowthPoint[];
}

export function calculateSipGrowth(
  monthlyInvestment: number,
  annualRate: number,
  years: number,
  initialSavings: number = 0
): number {
  if (years <= 0) return initialSavings;
  const p = monthlyInvestment;
  const r = annualRate / 12;
  const n = years * 12;

  // SIP Future Value formula: P * [((1+r)^n - 1)/r] * (1+r)
  const sipFv = p > 0 && r > 0 ? p * (((Math.pow(1 + r, n) - 1) / r) * (1 + r)) : p * n;

  // Initial capital lump sum growth formula: Initial * (1 + AnnualRate)^Years
  const initialFv = initialSavings * Math.pow(1 + annualRate, years);

  return Math.round(sipFv + initialFv);
}

export function computeInvestmentPlan(inputs: InvestmentInputs): ComputedInvestmentResults {
  const {
    age,
    currentSavings,
    netWorthGoal,
    monthlyInvestment,
    investmentDurationYrs,
    riskAppetite,
  } = inputs;

  // Assumed return rates tied to Risk Appetite
  let expectedRate = 0.105; // 10.5% default Medium
  let bestRate = 0.13; // 13.0%
  let worstRate = 0.07; // 7.0%

  if (riskAppetite === "Low") {
    expectedRate = 0.065; // 6.5%
    bestRate = 0.09; // 9.0%
    worstRate = 0.04; // 4.0%
  } else if (riskAppetite === "High") {
    expectedRate = 0.135; // 13.5%
    bestRate = 0.165; // 16.5%
    worstRate = 0.095; // 9.5%
  }

  // Calculate Final Year Values
  const projectedCorpus = calculateSipGrowth(
    monthlyInvestment,
    expectedRate,
    investmentDurationYrs,
    currentSavings
  );

  const bestCaseCorpus = calculateSipGrowth(
    monthlyInvestment,
    bestRate,
    investmentDurationYrs,
    currentSavings
  );

  const worstCaseCorpus = calculateSipGrowth(
    monthlyInvestment,
    worstRate,
    investmentDurationYrs,
    currentSavings
  );

  const totalInvested = Math.round(
    currentSavings + monthlyInvestment * investmentDurationYrs * 12
  );

  const estimatedReturns = Math.max(0, projectedCorpus - totalInvested);

  // Achievement Likelihood Confidence Score
  const rawRatio = netWorthGoal > 0 ? projectedCorpus / netWorthGoal : 1;
  const achievementLikelihood = Math.min(100, Math.max(5, Math.round(rawRatio * 100)));

  // Asset Allocation Matrix (% Equity / Debt / Gold)
  let equityPercent = 60;
  let debtPercent = 30;
  let goldPercent = 10;

  if (riskAppetite === "Low" || age >= 50) {
    equityPercent = 30;
    debtPercent = 60;
    goldPercent = 10;
  } else if (riskAppetite === "High" && age < 35) {
    equityPercent = 80;
    debtPercent = 15;
    goldPercent = 5;
  } else if (riskAppetite === "High") {
    equityPercent = 70;
    debtPercent = 20;
    goldPercent = 10;
  }

  // Generate Year-by-Year Growth Points for Recharts
  const chartData: YearGrowthPoint[] = [];
  const currentYear = new Date().getFullYear();

  for (let y = 1; y <= investmentDurationYrs; y++) {
    const yInvested = Math.round(currentSavings + monthlyInvestment * y * 12);
    const yExpected = calculateSipGrowth(monthlyInvestment, expectedRate, y, currentSavings);
    const yBest = calculateSipGrowth(monthlyInvestment, bestRate, y, currentSavings);
    const yWorst = calculateSipGrowth(monthlyInvestment, worstRate, y, currentSavings);

    chartData.push({
      year: y,
      label: `Year ${y} (${currentYear + y})`,
      totalInvested: yInvested,
      expectedCorpus: yExpected,
      bestCaseCorpus: yBest,
      worstCaseCorpus: yWorst,
    });
  }

  return {
    projectedCorpus,
    bestCaseCorpus,
    worstCaseCorpus,
    totalInvested,
    estimatedReturns,
    achievementLikelihood,
    equityPercent,
    debtPercent,
    goldPercent,
    expectedAnnualReturn: Math.round(expectedRate * 1000) / 10,
    chartData,
  };
}
