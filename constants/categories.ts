export type ExpenseCategory =
  | "Fuel"
  | "Toll"
  | "Breakfast"
  | "Lunch"
  | "Dinner"
  | "Hotel Stay"
  | "Challan"
  | "Road Tax"
  | "Parking"
  | "Other";

export const EXPENSE_CATEGORIES: ExpenseCategory[] = [
  "Fuel",
  "Toll",
  "Breakfast",
  "Lunch",
  "Dinner",
  "Hotel Stay",
  "Challan",
  "Road Tax",
  "Parking",
  "Other",
];

export const CATEGORY_ICONS: Record<ExpenseCategory, string> = {
  Fuel: "flame",
  Toll: "swap-horizontal",
  Breakfast: "sunny",
  Lunch: "restaurant",
  Dinner: "moon",
  "Hotel Stay": "bed",
  Challan: "document-text",
  "Road Tax": "card",
  Parking: "car",
  Other: "ellipsis-horizontal",
};

export const CATEGORY_COLORS: Record<ExpenseCategory, string> = {
  Fuel: "#F97316",
  Toll: "#8B5CF6",
  Breakfast: "#F59E0B",
  Lunch: "#10B981",
  Dinner: "#6366F1",
  "Hotel Stay": "#0EA5E9",
  Challan: "#EF4444",
  "Road Tax": "#EC4899",
  Parking: "#14B8A6",
  Other: "#94A3B8",
};
