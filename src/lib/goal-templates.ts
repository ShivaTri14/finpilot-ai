export interface GoalTemplate {
  name: string;
  category: string;
  defaultTarget: number;
  defaultMonths: number;
  icon: string;
  description: string;
}

export const GOAL_TEMPLATES: GoalTemplate[] = [
  {
    name: "Buy a Car",
    category: "Buy a Car",
    defaultTarget: 800000,
    defaultMonths: 24,
    icon: "Car",
    description: "Save up for a personal sedan or electric vehicle down payment",
  },
  {
    name: "Buy a House",
    category: "Buy a House",
    defaultTarget: 2500000,
    defaultMonths: 60,
    icon: "Home",
    description: "Accumulate down payment & registration costs for home ownership",
  },
  {
    name: "Buy a Laptop",
    category: "Buy a Laptop",
    defaultTarget: 120000,
    defaultMonths: 6,
    icon: "Laptop",
    description: "Purchase a high-performance workstation or MacBook",
  },
  {
    name: "Vacation Fund",
    category: "Vacation",
    defaultTarget: 150000,
    defaultMonths: 8,
    icon: "Palmtree",
    description: "International travel or luxury holiday retreat",
  },
  {
    name: "Wedding Fund",
    category: "Wedding",
    defaultTarget: 1000000,
    defaultMonths: 18,
    icon: "Heart",
    description: "Covers venue, catering, and celebration expenses",
  },
  {
    name: "Emergency Fund",
    category: "Emergency Fund",
    defaultTarget: 300000,
    defaultMonths: 12,
    icon: "ShieldAlert",
    description: "6 months of essential living expenses safety buffer",
  },
  {
    name: "Retirement Fund",
    category: "Retirement",
    defaultTarget: 5000000,
    defaultMonths: 120,
    icon: "PiggyBank",
    description: "Long-term nest egg corpus for financial independence",
  },
  {
    name: "Education Fund",
    category: "Education",
    defaultTarget: 600000,
    defaultMonths: 24,
    icon: "GraduationCap",
    description: "Master's degree, certifications, or professional courses",
  },
];
