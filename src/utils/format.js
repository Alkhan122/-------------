const formatterCache = new Map();

function getFormatter(currency) {
  if (!formatterCache.has(currency)) {
    let formatter;
    try {
      formatter = new Intl.NumberFormat("ru-RU", {
        style: "currency",
        currency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
    } catch (error) {
      formatter = new Intl.NumberFormat("ru-RU", {
        style: "currency",
        currency: "RUB",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
    }
    formatterCache.set(currency, formatter);
  }
  return formatterCache.get(currency);
}

export function formatMoney(amount, currency = "RUB") {
  const value = Number.isFinite(amount) ? amount / 100 : 0;
  return getFormatter(currency).format(value);
}

export function formatNumber(amount) {
  const value = Number.isFinite(amount) ? amount / 100 : 0;
  return new Intl.NumberFormat("ru-RU", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function parseMoneyToInt(value) {
  if (value === null || value === undefined) return null;
  const raw = String(value).trim();
  if (!raw) return null;
  const cleaned = raw.replace(/\s+/g, "").replace(",", ".").replace(/[^0-9.-]/g, "");
  const num = Number.parseFloat(cleaned);
  if (Number.isNaN(num)) return null;
  return Math.round(num * 100);
}

export function formatDate(iso) {
  if (!iso) return "";
  const parts = iso.split("-").map(Number);
  const date = parts.length === 3 ? new Date(parts[0], parts[1] - 1, parts[2]) : new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat("ru-RU").format(date);
}

export function formatMonthLabel(monthValue) {
  if (!monthValue) return "";
  const [year, month] = monthValue.split("-").map(Number);
  if (!year || !month) return monthValue;
  const date = new Date(year, month - 1, 1);
  return new Intl.DateTimeFormat("ru-RU", { month: "long", year: "numeric" }).format(date);
}

export function todayISO() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function getMonthRange(offset = 0) {
  const now = new Date();
  const first = new Date(now.getFullYear(), now.getMonth() + offset, 1);
  const last = new Date(now.getFullYear(), now.getMonth() + offset + 1, 0);
  return {
    from: `${first.getFullYear()}-${String(first.getMonth() + 1).padStart(2, "0")}-${String(first.getDate()).padStart(2, "0")}`,
    to: `${last.getFullYear()}-${String(last.getMonth() + 1).padStart(2, "0")}-${String(last.getDate()).padStart(2, "0")}`,
  };
}

export function getLastNDaysRange(days) {
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - (days - 1));
  const from = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, "0")}-${String(start.getDate()).padStart(2, "0")}`;
  const to = `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, "0")}-${String(end.getDate()).padStart(2, "0")}`;
  return { from, to };
}
