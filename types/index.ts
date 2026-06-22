import type { ExpenseCategory } from "@/constants/categories";

export interface Trip {
  id: string;
  name: string;
  departureDate: string;
  returnDate: string;
  totalBudget: number;
  createdAt: string;
}

export interface Member {
  id: string;
  tripId: string;
  name: string;
  advanceAmount: number;
}

export interface Expense {
  id: string;
  tripId: string;
  category: ExpenseCategory;
  amount: number;
  date: string;
  time: string;
  location: string;
  description: string;
  createdAt: string;
}

export interface Settlement {
  from: string;
  to: string;
  amount: number;
}

export interface CategorySummary {
  category: ExpenseCategory;
  total: number;
  percentage: number;
  color: string;
}
