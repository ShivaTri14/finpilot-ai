export const EXPENSE_CATEGORIES = [
  "Food & Dining",
  "Transportation",
  "Shopping",
  "Bills",
  "Entertainment",
  "Healthcare",
  "Travel",
  "Education",
  "Groceries",
  "Fuel",
  "Investment",
  "Insurance",
  "Miscellaneous",
] as const;

export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];

export const PAYMENT_METHODS = [
  "UPI / Net Banking",
  "Credit Card",
  "Debit Card",
  "Cash",
  "Bank Transfer",
] as const;

export const CATEGORY_ICONS: Record<string, string> = {
  "Food & Dining": "Utensils",
  Transportation: "Car",
  Shopping: "ShoppingBag",
  Bills: "FileText",
  Entertainment: "Film",
  Healthcare: "Activity",
  Travel: "Plane",
  Education: "GraduationCap",
  Groceries: "ShoppingCart",
  Fuel: "Fuel",
  Investment: "TrendingUp",
  Insurance: "Shield",
  Miscellaneous: "MoreHorizontal",
};
