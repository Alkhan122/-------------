import { clear, el } from "../../utils/dom.js";
import { formatMoney } from "../../utils/format.js";
import { calculateAccountBalances, calculateTotalsByCurrency, getTopExpenseCategories } from "../../domain/calculations.js";
import { getMonthRange } from "../../utils/format.js";
import * as storage from "../../storage/storage.js";

export function renderDashboard({ outlet }) {
  clear(outlet);

  const header = el(
    "div",
    { class: "section-header" },
    el("h1", { class: "section-title", text: "Обзор" })
  );

  const statsGrid = el("div", { class: "grid two" });
  const accountsCard = el("div", { class: "card" });
  const topCard = el("div", { class: "card" });

  const container = el("div", { class: "grid" }, header, statsGrid, accountsCard, topCard);
  outlet.appendChild(container);

  async function load() {
    const [accounts, categories, transactions] = await Promise.all([
      storage.getAccounts(),
      storage.getCategories(),
      storage.getTransactions(),
    ]);

    const balances = calculateAccountBalances(accounts, transactions);
    const totals = calculateTotalsByCurrency(accounts, balances);

    const balanceCard = el("div", { class: "card glow" });
    const totalsList = el("div", { class: "list" });

    Object.entries(totals).forEach(([currency, amount]) => {
      totalsList.appendChild(
        el(
          "div",
          { class: "list-item" },
          el("span", { text: currency }),
          el("strong", { text: formatMoney(amount, currency) })
        )
      );
    });

    if (!Object.keys(totals).length) {
      totalsList.appendChild(
        el("div", { class: "empty" }, "Пока нет счетов. Создайте первый счёт, чтобы увидеть баланс.")
      );
    }

    balanceCard.appendChild(
      el("div", { class: "stat" },
        el("div", { class: "stat-label", text: "Общий баланс" }),
        totalsList
      )
    );

    statsGrid.replaceChildren(balanceCard);

    const accountsHeader = el(
      "div",
      { class: "section-header" },
      el("h2", { class: "section-title", text: "Счета" }),
      el("a", { class: "btn btn-outline", href: "#/accounts" }, "Управлять")
    );
    const accountList = el("div", { class: "list" });

    if (!accounts.length) {
      accountList.appendChild(
        el(
          "div",
          { class: "empty" },
          el("p", { text: "Нет счетов. Создайте счёт, чтобы начать учёт." }),
          el("a", { class: "btn btn-primary", href: "#/accounts" }, "Создать счёт")
        )
      );
    } else {
      accounts.forEach((account) => {
        const amount = balances[account.id] ?? account.opening_balance ?? 0;
        const meta = account.archived ? "Архив" : account.type;
        accountList.appendChild(
          el(
            "div",
            { class: "list-item" },
            el("div", {},
              el("div", { text: account.name }),
              el("div", { class: "label", text: meta })
            ),
            el("strong", { text: formatMoney(amount, account.currency) })
          )
        );
      });
    }

    accountsCard.replaceChildren(accountsHeader, accountList);

    const topHeader = el(
      "div",
      { class: "section-header" },
      el("h2", { class: "section-title", text: "Топ расходов месяца" })
    );

    const range = getMonthRange(0);
    const top = getTopExpenseCategories(transactions, categories, range, 5);
    const topList = el("div", { class: "list" });

    if (!top.length) {
      topList.appendChild(el("div", { class: "empty" }, "Нет расходов за текущий месяц."));
    } else {
      top.forEach((item) => {
        topList.appendChild(
          el(
            "div",
            { class: "list-item" },
            el("div", {},
              el("div", { text: item.category.name }),
              el("div", { class: "label", text: "Расход" })
            ),
            el("strong", { text: formatMoney(item.amount, "RUB") })
          )
        );
      });
    }

    topCard.replaceChildren(topHeader, topList);
  }

  load();
}
