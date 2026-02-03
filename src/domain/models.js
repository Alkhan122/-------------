import { uid } from "../utils/id.js";
import { todayISO } from "../utils/format.js";

export function createAccount(data = {}) {
  return {
    id: data.id ?? uid(),
    name: data.name ?? "",
    type: data.type ?? "cash",
    currency: data.currency ?? "RUB",
    opening_balance: data.opening_balance ?? 0,
    archived: data.archived ?? false,
    created_at: data.created_at ?? new Date().toISOString(),
  };
}

export function createCategory(data = {}) {
  return {
    id: data.id ?? uid(),
    name: data.name ?? "",
    type: data.type ?? "expense",
    parent_id: data.parent_id ?? null,
    color: data.color ?? "#00e5ff",
  };
}

export function createTransaction(data = {}) {
  return {
    id: data.id ?? uid(),
    date: data.date ?? todayISO(),
    type: data.type ?? "expense",
    account_id: data.account_id ?? null,
    to_account_id: data.to_account_id ?? null,
    transfer_id: data.transfer_id ?? null,
    amount: data.amount ?? 0,
    currency: data.currency ?? "RUB",
    category_id: data.category_id ?? null,
    payee: data.payee ?? "",
    note: data.note ?? "",
    tags: data.tags ?? [],
    created_at: data.created_at ?? new Date().toISOString(),
    updated_at: data.updated_at ?? new Date().toISOString(),
  };
}
