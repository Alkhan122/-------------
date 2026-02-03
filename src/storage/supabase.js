import { SUPABASE_URL, SUPABASE_ANON_KEY } from "../config.js";
import { parseMoneyToInt } from "../utils/format.js";
import { uid } from "../utils/id.js";

const supabaseLib = window.supabase;
if (!supabaseLib) {
  throw new Error("Supabase library not loaded. Проверьте подключение vendor/supabase.min.js");
}

const client = supabaseLib.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});

export function getClient() {
  return client;
}

export async function init() {
  return client.auth.getSession();
}

export async function getSession() {
  const { data, error } = await client.auth.getSession();
  if (error) throw error;
  return data.session;
}

export function onAuthStateChange(callback) {
  return client.auth.onAuthStateChange(callback);
}

export async function signIn({ email, password }) {
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function signUp({ email, password }) {
  const { data, error } = await client.auth.signUp({ email, password });
  if (error) throw error;
  return data;
}

export async function signOut() {
  const { error } = await client.auth.signOut();
  if (error) throw error;
}

async function requireUserId() {
  const session = await getSession();
  const userId = session?.user?.id;
  if (!userId) throw new Error("Нет активной сессии");
  return userId;
}

function normalizeBigint(value) {
  if (value === null || value === undefined) return 0;
  if (typeof value === "string") return Number(value);
  return value;
}

function normalizeAccount(row) {
  if (!row) return row;
  return { ...row, opening_balance: normalizeBigint(row.opening_balance) };
}

function normalizeTransaction(row) {
  if (!row) return row;
  return { ...row, amount: normalizeBigint(row.amount) };
}

function normalizeAccountPayload(data, userId) {
  const opening = typeof data.opening_balance === "number" ? data.opening_balance : parseMoneyToInt(data.opening_balance) ?? 0;
  return {
    id: data.id || uid(),
    user_id: userId,
    name: data.name ?? "",
    type: data.type ?? "cash",
    currency: data.currency ?? "RUB",
    opening_balance: opening,
    archived: data.archived ?? false,
    created_at: data.created_at,
  };
}

function normalizeCategoryPayload(data, userId) {
  return {
    id: data.id || uid(),
    user_id: userId,
    name: data.name ?? "",
    type: data.type ?? "expense",
    parent_id: data.parent_id ?? null,
    color: data.color ?? "#00e5ff",
    created_at: data.created_at,
  };
}

function normalizeTransactionPayload(data, userId) {
  const amount = typeof data.amount === "number" ? data.amount : parseMoneyToInt(data.amount) ?? 0;
  return {
    id: data.id || uid(),
    user_id: userId,
    date: data.date,
    type: data.type,
    account_id: data.account_id ?? null,
    to_account_id: data.to_account_id ?? null,
    transfer_id: data.transfer_id ?? null,
    amount,
    currency: data.currency ?? "RUB",
    category_id: data.category_id ?? null,
    payee: data.payee ?? "",
    note: data.note ?? "",
    tags: data.tags ?? [],
    created_at: data.created_at,
    updated_at: data.updated_at ?? new Date().toISOString(),
  };
}

function cleanPayload(payload) {
  const cleaned = {};
  Object.entries(payload).forEach(([key, value]) => {
    if (value !== undefined) cleaned[key] = value;
  });
  return cleaned;
}

export async function getAccounts() {
  const { data, error } = await client.from("accounts").select("*").order("created_at", { ascending: true });
  if (error) throw error;
  return data.map(normalizeAccount);
}

export async function getCategories() {
  const { data, error } = await client.from("categories").select("*").order("created_at", { ascending: true });
  if (error) throw error;
  return data;
}

export async function getTransactions() {
  const { data, error } = await client.from("transactions").select("*").order("date", { ascending: false }).order("created_at", { ascending: false });
  if (error) throw error;
  return data.map(normalizeTransaction);
}

export async function getAccountById(id) {
  const { data, error } = await client.from("accounts").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return normalizeAccount(data);
}

export async function getCategoryById(id) {
  const { data, error } = await client.from("categories").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data;
}

export async function getTransactionById(id) {
  const { data, error } = await client.from("transactions").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return normalizeTransaction(data);
}

export async function upsertAccount(data) {
  const userId = await requireUserId();
  const payload = cleanPayload(normalizeAccountPayload(data, userId));
  const { data: result, error } = await client.from("accounts").upsert(payload, { onConflict: "id" }).select("*").maybeSingle();
  if (error) throw error;
  return normalizeAccount(result);
}

export async function upsertCategory(data) {
  const userId = await requireUserId();
  const payload = cleanPayload(normalizeCategoryPayload(data, userId));
  const { data: result, error } = await client.from("categories").upsert(payload, { onConflict: "id" }).select("*").maybeSingle();
  if (error) throw error;
  return result;
}

export async function upsertTransaction(data) {
  const userId = await requireUserId();
  const payload = cleanPayload(normalizeTransactionPayload(data, userId));
  const { data: result, error } = await client.from("transactions").upsert(payload, { onConflict: "id" }).select("*").maybeSingle();
  if (error) throw error;
  return normalizeTransaction(result);
}

export async function deleteAccount(id) {
  const hasTx = await hasTransactionsForAccount(id);
  if (hasTx) {
    const { error } = await client.from("accounts").update({ archived: true }).eq("id", id);
    if (error) throw error;
    return { archived: true };
  }
  const { error } = await client.from("accounts").delete().eq("id", id);
  if (error) throw error;
  return { deleted: true };
}

export async function deleteCategory(id) {
  const hasTx = await hasTransactionsForCategory(id);
  if (hasTx) return { blocked: true };
  const { error } = await client.from("categories").delete().eq("id", id);
  if (error) throw error;
  return { deleted: true };
}

export async function deleteTransaction(id) {
  const { error } = await client.from("transactions").delete().eq("id", id);
  if (error) throw error;
}

export async function deleteTransactionsByTransferId(transferId) {
  const { error } = await client.from("transactions").delete().eq("transfer_id", transferId);
  if (error) throw error;
}

export async function queryTransactionsFiltered(filters = {}) {
  let query = client.from("transactions").select("*");

  if (filters.from) query = query.gte("date", filters.from);
  if (filters.to) query = query.lte("date", filters.to);
  if (filters.accountId) query = query.eq("account_id", filters.accountId);
  if (filters.categoryId) query = query.eq("category_id", filters.categoryId);
  if (filters.type) {
    if (filters.type === "transfer") {
      query = query.not("transfer_id", "is", null);
    } else {
      query = query.eq("type", filters.type).is("transfer_id", null);
    }
  }
  if (filters.search) {
    const escaped = filters.search.replace(/%/g, "\\%").replace(/_/g, "\\_");
    query = query.or(`payee.ilike.%${escaped}%,note.ilike.%${escaped}%`);
  }

  const { data, error } = await query.order("date", { ascending: false }).order("created_at", { ascending: false });
  if (error) throw error;
  return data.map(normalizeTransaction);
}

export async function hasTransactionsForAccount(accountId) {
  const { count, error } = await client
    .from("transactions")
    .select("*", { count: "exact", head: true })
    .eq("account_id", accountId);
  if (error) throw error;
  return (count ?? 0) > 0;
}

export async function hasTransactionsForCategory(categoryId) {
  const { count, error } = await client
    .from("transactions")
    .select("*", { count: "exact", head: true })
    .eq("category_id", categoryId);
  if (error) throw error;
  return (count ?? 0) > 0;
}

export async function exportData() {
  const [accounts, categories, transactions] = await Promise.all([
    getAccounts(),
    getCategories(),
    getTransactions(),
  ]);
  return {
    meta: {
      version: 2,
      exported_at: new Date().toISOString(),
      provider: "supabase",
    },
    accounts,
    categories,
    transactions,
  };
}

export async function importData(data) {
  if (!data || !Array.isArray(data.accounts) || !Array.isArray(data.categories) || !Array.isArray(data.transactions)) {
    throw new Error("Некорректный формат файла.");
  }
  const userId = await requireUserId();

  await client.from("transactions").delete().eq("user_id", userId);
  await client.from("categories").delete().eq("user_id", userId);
  await client.from("accounts").delete().eq("user_id", userId);

  const accountsPayload = data.accounts.map((acc) => cleanPayload(normalizeAccountPayload({ ...acc, user_id: userId }, userId)));
  const categoriesPayload = data.categories.map((cat) => cleanPayload(normalizeCategoryPayload({ ...cat, user_id: userId }, userId)));
  const transactionsPayload = data.transactions.map((tx) => cleanPayload(normalizeTransactionPayload({ ...tx, user_id: userId }, userId)));

  if (accountsPayload.length) {
    const { error } = await client.from("accounts").insert(accountsPayload);
    if (error) throw error;
  }
  if (categoriesPayload.length) {
    const { error } = await client.from("categories").insert(categoriesPayload);
    if (error) throw error;
  }
  if (transactionsPayload.length) {
    const { error } = await client.from("transactions").insert(transactionsPayload);
    if (error) throw error;
  }
}

export async function resetAll() {
  const userId = await requireUserId();
  await client.from("transactions").delete().eq("user_id", userId);
  await client.from("categories").delete().eq("user_id", userId);
  await client.from("accounts").delete().eq("user_id", userId);
}

export async function seedDemoData() {
  const userId = await requireUserId();
  await resetAll();

  const accounts = [
    normalizeAccountPayload({ name: "Карта Neon", type: "card", currency: "RUB", opening_balance: 125000 }, userId),
    normalizeAccountPayload({ name: "Наличные", type: "cash", currency: "RUB", opening_balance: 15000 }, userId),
  ];

  const categories = [
    normalizeCategoryPayload({ name: "Еда", type: "expense", color: "#ff7ad9" }, userId),
    normalizeCategoryPayload({ name: "Транспорт", type: "expense", color: "#00e5ff" }, userId),
    normalizeCategoryPayload({ name: "Подписки", type: "expense", color: "#9bff47" }, userId),
    normalizeCategoryPayload({ name: "Зарплата", type: "income", color: "#39ffb6" }, userId),
  ];

  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

  const transactions = [
    normalizeTransactionPayload({
      date: today,
      type: "income",
      account_id: accounts[0].id,
      amount: 120000,
      currency: "RUB",
      category_id: categories[3].id,
      payee: "Компания",
      note: "Зарплата",
    }, userId),
    normalizeTransactionPayload({
      date: today,
      type: "expense",
      account_id: accounts[0].id,
      amount: 8500,
      currency: "RUB",
      category_id: categories[0].id,
      payee: "Кафе",
      note: "Ланч",
    }, userId),
    normalizeTransactionPayload({
      date: today,
      type: "expense",
      account_id: accounts[0].id,
      amount: 2200,
      currency: "RUB",
      category_id: categories[1].id,
      payee: "Метро",
      note: "Проезд",
    }, userId),
    normalizeTransactionPayload({
      date: today,
      type: "expense",
      account_id: accounts[1].id,
      amount: 990,
      currency: "RUB",
      category_id: categories[2].id,
      payee: "Сервис",
      note: "Подписка",
    }, userId),
  ];

  const { error: accError } = await client.from("accounts").insert(accounts);
  if (accError) throw accError;
  const { error: catError } = await client.from("categories").insert(categories);
  if (catError) throw catError;
  const { error: txError } = await client.from("transactions").insert(transactions);
  if (txError) throw txError;
}

export function createTransferPair({ date, fromAccountId, toAccountId, amount, currency, note, transferId }) {
  const id = transferId || uid();
  const outTx = {
    id: uid(),
    date,
    type: "expense",
    account_id: fromAccountId,
    to_account_id: toAccountId,
    transfer_id: id,
    amount,
    currency,
    note: note || "",
  };
  const inTx = {
    id: uid(),
    date,
    type: "income",
    account_id: toAccountId,
    to_account_id: fromAccountId,
    transfer_id: id,
    amount,
    currency,
    note: note || "",
  };
  return { transferId: id, outTx, inTx };
}

export async function upsertTransfer({ transferId, date, fromAccountId, toAccountId, amount, currency, note, outId, inId }) {
  const userId = await requireUserId();
  const id = transferId || uid();
  const outTx = normalizeTransactionPayload({
    id: outId || uid(),
    date,
    type: "expense",
    account_id: fromAccountId,
    to_account_id: toAccountId,
    transfer_id: id,
    amount,
    currency,
    note: note || "",
  }, userId);
  const inTx = normalizeTransactionPayload({
    id: inId || uid(),
    date,
    type: "income",
    account_id: toAccountId,
    to_account_id: fromAccountId,
    transfer_id: id,
    amount,
    currency,
    note: note || "",
  }, userId);

  const { error } = await client.from("transactions").upsert([outTx, inTx], { onConflict: "id" });
  if (error) throw error;
  return { outTx: normalizeTransaction(outTx), inTx: normalizeTransaction(inTx) };
}
