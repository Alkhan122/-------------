import { formatMonthLabel } from "../utils/format.js";

export function calculateAccountBalances(accounts, transactions) {
  const balances = {};
  accounts.forEach((account) => {
    balances[account.id] = account.opening_balance || 0;
  });

  transactions.forEach((tx) => {
    if (!tx.account_id) return;
    if (!(tx.account_id in balances)) {
      balances[tx.account_id] = 0;
    }
    if (tx.type === "income") {
      balances[tx.account_id] += tx.amount || 0;
    } else if (tx.type === "expense") {
      balances[tx.account_id] -= tx.amount || 0;
    }
  });

  return balances;
}

export function calculateTotalsByCurrency(accounts, balances) {
  const totals = {};
  accounts.forEach((account) => {
    const amount = balances[account.id] ?? account.opening_balance ?? 0;
    if (!totals[account.currency]) {
      totals[account.currency] = 0;
    }
    totals[account.currency] += amount;
  });
  return totals;
}

export function aggregateExpensesByCategory(transactions, categories, range) {
  const categoryMap = new Map(categories.map((cat) => [cat.id, cat]));
  const summary = new Map();

  transactions.forEach((tx) => {
    if (tx.type !== "expense" || tx.transfer_id) return;
    if (range) {
      if (range.from && tx.date < range.from) return;
      if (range.to && tx.date > range.to) return;
    }
    const category = categoryMap.get(tx.category_id) || { id: "uncategorized", name: "Без категории" };
    const current = summary.get(category.id) || { category, amount: 0 };
    current.amount += tx.amount || 0;
    summary.set(category.id, current);
  });

  return Array.from(summary.values()).sort((a, b) => b.amount - a.amount);
}

export function getTopExpenseCategories(transactions, categories, range, limit = 5) {
  return aggregateExpensesByCategory(transactions, categories, range).slice(0, limit);
}

export function getReportTitle(monthValue) {
  return formatMonthLabel(monthValue);
}

export function sortTransactions(transactions) {
  return [...transactions].sort((a, b) => {
    if (a.date === b.date) {
      return (b.created_at || "").localeCompare(a.created_at || "");
    }
    return b.date.localeCompare(a.date);
  });
}
