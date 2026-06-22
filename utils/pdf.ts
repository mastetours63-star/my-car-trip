import type { Trip, Member, Expense, Settlement } from "@/types";
import { CATEGORY_COLORS } from "@/constants/categories";
import { getCategoryBreakdown, formatCurrency, formatDate, formatTime } from "./settlement";

function buildPieSliceSVG(
  breakdown: Array<{ category: string; amount: number; percentage: number }>
): string {
  const cx = 100;
  const cy = 100;
  const r = 80;
  const total = breakdown.reduce((s, b) => s + b.amount, 0);
  if (total === 0) return "";

  let currentAngle = -90;
  let paths = "";

  for (const item of breakdown) {
    const sliceAngle = (item.amount / total) * 360;
    const endAngle = currentAngle + sliceAngle;
    const startRad = ((currentAngle) * Math.PI) / 180;
    const endRad = ((endAngle) * Math.PI) / 180;
    const x1 = cx + r * Math.cos(startRad);
    const y1 = cy + r * Math.sin(startRad);
    const x2 = cx + r * Math.cos(endRad);
    const y2 = cy + r * Math.sin(endRad);
    const largeArc = sliceAngle > 180 ? 1 : 0;
    const color = CATEGORY_COLORS[item.category as keyof typeof CATEGORY_COLORS] ?? "#94A3B8";
    paths += `<path d="M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z" fill="${color}" />`;
    currentAngle = endAngle;
  }

  // Donut hole
  paths += `<circle cx="${cx}" cy="${cy}" r="45" fill="white" />`;

  return `<svg width="200" height="200" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">${paths}</svg>`;
}

export function generateTripStatementHTML(
  trip: Trip,
  members: Member[],
  expenses: Expense[],
  settlements: Settlement[]
): string {
  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);
  const totalKitty = members.reduce((s, m) => s + m.advanceAmount, 0);
  const remaining = trip.totalBudget - totalExpenses;
  const kittyBalance = totalKitty - totalExpenses;
  const breakdown = getCategoryBreakdown(expenses);
  const serialNo = parseInt(trip.id.slice(-4), 36) % 9999 + 1;
  const pieChart = buildPieSliceSVG(breakdown);

  const expenseRows = expenses
    .map(
      (e, i) => `
      <tr class="${i % 2 === 0 ? "row-even" : "row-odd"}">
        <td>${i + 1}</td>
        <td>${formatDate(e.date)}</td>
        <td>${formatTime(e.time)}</td>
        <td>${e.location || "—"}</td>
        <td><span class="badge" style="background:${CATEGORY_COLORS[e.category] ?? "#94A3B8"}20;color:${CATEGORY_COLORS[e.category] ?? "#94A3B8"};border:1px solid ${CATEGORY_COLORS[e.category] ?? "#94A3B8"}40">${e.category}</span></td>
        <td>${e.description || "—"}</td>
        <td class="amount">${formatCurrency(e.amount)}</td>
      </tr>`
    )
    .join("");

  const memberRows = members
    .map(
      (m) => `
      <tr>
        <td>${m.name}</td>
        <td class="amount">${formatCurrency(m.advanceAmount)}</td>
        <td class="amount">${members.length > 0 ? formatCurrency(totalExpenses / members.length) : "—"}</td>
        <td class="amount ${m.advanceAmount - totalExpenses / members.length >= 0 ? "positive" : "negative"}">${
          formatCurrency(m.advanceAmount - totalExpenses / members.length)
        }</td>
      </tr>`
    )
    .join("");

  const settlementRows = settlements
    .map(
      (s) =>
        `<div class="settlement-item"><span class="from">${s.from}</span><span class="arrow"> → </span><span class="to">${s.to}</span><span class="s-amount">${formatCurrency(s.amount)}</span></div>`
    )
    .join("");

  const categoryRows = breakdown
    .map(
      (b) =>
        `<tr>
          <td><span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${CATEGORY_COLORS[b.category as keyof typeof CATEGORY_COLORS] ?? "#94A3B8"};margin-right:6px"></span>${b.category}</td>
          <td class="amount">${formatCurrency(b.amount)}</td>
          <td>${b.percentage}%</td>
          <td style="width:100px">
            <div style="background:#eee;border-radius:4px;height:8px;">
              <div style="background:${CATEGORY_COLORS[b.category as keyof typeof CATEGORY_COLORS] ?? "#94A3B8"};height:8px;border-radius:4px;width:${b.percentage}%"></div>
            </div>
          </td>
        </tr>`
    )
    .join("");

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #0F172A; background: #fff; padding: 24px; font-size: 13px; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #F97316; padding-bottom: 16px; margin-bottom: 20px; }
  .header-left h1 { font-size: 22px; font-weight: 700; color: #0F172A; }
  .header-left p { color: #64748B; margin-top: 4px; font-size: 12px; }
  .serial { background: #F97316; color: white; padding: 6px 14px; border-radius: 20px; font-weight: 700; font-size: 13px; }
  .section { margin-bottom: 20px; }
  .section-title { font-size: 14px; font-weight: 700; color: #0F172A; margin-bottom: 10px; padding-bottom: 4px; border-bottom: 1px solid #E2E8F0; text-transform: uppercase; letter-spacing: 0.5px; }
  .summary-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; }
  .summary-card { background: #F8FAFC; border-radius: 8px; padding: 12px; text-align: center; border: 1px solid #E2E8F0; }
  .summary-card .label { font-size: 10px; color: #64748B; text-transform: uppercase; letter-spacing: 0.5px; }
  .summary-card .value { font-size: 15px; font-weight: 700; margin-top: 4px; }
  .positive { color: #16A34A; }
  .negative { color: #DC2626; }
  table { width: 100%; border-collapse: collapse; }
  th { background: #F1F5F9; text-align: left; padding: 8px 10px; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: #64748B; }
  td { padding: 7px 10px; border-bottom: 1px solid #F1F5F9; vertical-align: middle; }
  .row-even { background: #fff; }
  .row-odd { background: #FAFAFA; }
  .amount { text-align: right; font-weight: 600; font-variant-numeric: tabular-nums; }
  .badge { padding: 2px 8px; border-radius: 12px; font-size: 11px; font-weight: 600; white-space: nowrap; }
  .settlement-item { display: flex; align-items: center; padding: 10px 0; border-bottom: 1px solid #F1F5F9; gap: 8px; }
  .from { font-weight: 600; color: #DC2626; }
  .to { font-weight: 600; color: #16A34A; }
  .arrow { color: #94A3B8; }
  .s-amount { margin-left: auto; font-weight: 700; color: #0F172A; }
  .chart-section { display: flex; gap: 20px; align-items: center; }
  .chart-legend { flex: 1; }
  .legend-item { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; font-size: 12px; }
  .footer { margin-top: 24px; text-align: center; font-size: 11px; color: #94A3B8; border-top: 1px solid #E2E8F0; padding-top: 12px; }
</style>
</head>
<body>
<div class="header">
  <div class="header-left">
    <h1>${trip.name}</h1>
    <p>${formatDate(trip.departureDate)} → ${formatDate(trip.returnDate)}</p>
    <p style="margin-top:4px;color:#64748B">Generated: ${new Date().toLocaleString("en-IN")}</p>
  </div>
  <div class="serial">Trip #${String(serialNo).padStart(4, "0")}</div>
</div>

<div class="section">
  <div class="section-title">Trip Summary</div>
  <div class="summary-grid">
    <div class="summary-card">
      <div class="label">Budget</div>
      <div class="value">${formatCurrency(trip.totalBudget)}</div>
    </div>
    <div class="summary-card">
      <div class="label">Spent</div>
      <div class="value negative">${formatCurrency(totalExpenses)}</div>
    </div>
    <div class="summary-card">
      <div class="label">Remaining</div>
      <div class="value ${remaining >= 0 ? "positive" : "negative"}">${formatCurrency(remaining)}</div>
    </div>
    <div class="summary-card">
      <div class="label">Kitty Balance</div>
      <div class="value ${kittyBalance >= 0 ? "positive" : "negative"}">${formatCurrency(kittyBalance)}</div>
    </div>
  </div>
</div>

<div class="section">
  <div class="section-title">Members & Contributions</div>
  <table>
    <tr><th>Member</th><th style="text-align:right">Advance</th><th style="text-align:right">Fair Share</th><th style="text-align:right">Balance</th></tr>
    ${memberRows}
  </table>
</div>

<div class="section">
  <div class="section-title">All Expenses (${expenses.length})</div>
  <table>
    <tr><th>#</th><th>Date</th><th>Time</th><th>Location</th><th>Category</th><th>Description</th><th style="text-align:right">Amount</th></tr>
    ${expenseRows}
    <tr><td colspan="6" style="text-align:right;font-weight:700;padding:10px">Total</td><td class="amount">${formatCurrency(totalExpenses)}</td></tr>
  </table>
</div>

<div class="section">
  <div class="section-title">Category Breakdown</div>
  <div class="chart-section">
    <div>${pieChart}</div>
    <div class="chart-legend">
      <table>
        <tr><th>Category</th><th style="text-align:right">Amount</th><th style="text-align:right">%</th><th>Bar</th></tr>
        ${categoryRows}
      </table>
    </div>
  </div>
</div>

${
  settlements.length > 0
    ? `<div class="section">
  <div class="section-title">Settlement (Who Pays Whom)</div>
  ${settlementRows}
</div>`
    : ""
}

<div class="footer">
  My Car Trip — Offline Trip Expense Manager • Generated ${new Date().toLocaleDateString("en-IN")}
</div>
</body>
</html>`;
}
