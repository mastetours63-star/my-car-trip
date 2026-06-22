import type { Member, Settlement } from "@/types";

export function calculateSettlement(
  members: Member[],
  totalExpenses: number
): Settlement[] {
  if (members.length === 0 || totalExpenses === 0) return [];

  const fairShare = totalExpenses / members.length;
  const balances = members.map((m) => ({
    name: m.name,
    balance: Math.round((m.advanceAmount - fairShare) * 100) / 100,
  }));

  const transactions: Settlement[] = [];
  const debtors = balances
    .filter((b) => b.balance < -0.01)
    .sort((a, b) => a.balance - b.balance);
  const creditors = balances
    .filter((b) => b.balance > 0.01)
    .sort((a, b) => b.balance - a.balance);

  let di = 0;
  let ci = 0;
  while (di < debtors.length && ci < creditors.length) {
    const amount = Math.min(-debtors[di].balance, creditors[ci].balance);
    transactions.push({
      from: debtors[di].name,
      to: creditors[ci].name,
      amount: Math.round(amount * 100) / 100,
    });
    debtors[di].balance += amount;
    creditors[ci].balance -= amount;
    if (Math.abs(debtors[di].balance) < 0.01) di++;
    if (Math.abs(creditors[ci].balance) < 0.01) ci++;
  }

  return transactions;
}

export function getCategoryBreakdown(
  expenses: Array<{ category: string; amount: number }>
) {
  const totals: Record<string, number> = {};
  const total = expenses.reduce((sum, e) => sum + e.amount, 0);
  for (const e of expenses) {
    totals[e.category] = (totals[e.category] ?? 0) + e.amount;
  }
  return Object.entries(totals).map(([category, amount]) => ({
    category,
    amount,
    percentage: total > 0 ? Math.round((amount / total) * 100) : 0,
  }));
}

export function formatCurrency(amount: number): string {
  return `₹${amount.toLocaleString("en-IN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}

export function formatDate(dateStr: string): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function formatTime(timeStr: string): string {
  if (!timeStr) return "";
  const [h, m] = timeStr.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const hour = h % 12 || 12;
  return `${hour}:${String(m).padStart(2, "0")} ${ampm}`;
}
