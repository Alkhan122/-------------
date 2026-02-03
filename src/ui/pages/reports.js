import { clear, el } from "../../utils/dom.js";
import { formatMoney, todayISO } from "../../utils/format.js";
import { aggregateExpensesByCategory } from "../../domain/calculations.js";
import * as storage from "../../storage/storage.js";

function getMonthValue() {
  const today = todayISO();
  return today.slice(0, 7);
}

function getRangeFromMonth(monthValue) {
  const [year, month] = monthValue.split("-").map(Number);
  const first = new Date(year, month - 1, 1);
  const last = new Date(year, month, 0);
  const from = `${first.getFullYear()}-${String(first.getMonth() + 1).padStart(2, "0")}-${String(first.getDate()).padStart(2, "0")}`;
  const to = `${last.getFullYear()}-${String(last.getMonth() + 1).padStart(2, "0")}-${String(last.getDate()).padStart(2, "0")}`;
  return { from, to };
}

export function renderReports({ outlet }) {
  clear(outlet);

  const header = el("div", { class: "section-header" }, el("h1", { class: "section-title", text: "Отчёты" }));
  const monthField = el("input", { class: "input", type: "month", value: getMonthValue() });
  const filters = el("div", { class: "form-row" }, el("label", { class: "label", text: "Месяц" }), monthField);
  const chartCard = el("div", { class: "card" });

  outlet.append(header, filters, chartCard);

  const renderReport = async () => {
    const [transactions, categories] = await Promise.all([
      storage.getTransactions(),
      storage.getCategories(),
    ]);
    const range = getRangeFromMonth(monthField.value);
    const data = aggregateExpensesByCategory(transactions, categories, range);

    chartCard.replaceChildren();

    if (!data.length) {
      chartCard.appendChild(el("div", { class: "empty" }, "Нет расходов за выбранный месяц."));
      return;
    }

    const total = data.reduce((sum, item) => sum + item.amount, 0);
    chartCard.appendChild(
      el("div", { class: "stat" },
        el("div", { class: "stat-label", text: "Всего расходов" }),
        el("div", { class: "stat-value", text: formatMoney(total, "RUB") })
      )
    );

    const max = Math.max(...data.map((item) => item.amount));
    const chart = el("div", { class: "chart" });

    data.forEach((item) => {
      const percent = max ? Math.round((item.amount / max) * 100) : 0;
      const bar = el("div", { class: "chart-bar", style: `width:${percent}%` });
      chart.appendChild(
        el(
          "div",
          { class: "chart-row" },
          el("div", { text: item.category.name }),
          bar,
          el("strong", { text: formatMoney(item.amount, "RUB") })
        )
      );
    });

    chartCard.appendChild(chart);
  };

  monthField.addEventListener("change", renderReport);
  renderReport();
}
