import { clear, el } from "../../utils/dom.js";
import { formatMoney } from "../../utils/format.js";
import { calculateAccountBalances } from "../../domain/calculations.js";
import { validateAccount } from "../../domain/validators.js";
import { labeledInput, labeledSelect } from "../components/form-controls.js";
import { showModal, confirmModal } from "../components/modal.js";
import { showToast } from "../components/toast.js";
import * as storage from "../../storage/storage.js";

const ACCOUNT_TYPES = [
  { value: "cash", label: "Наличные" },
  { value: "card", label: "Карта" },
  { value: "bank", label: "Банк" },
  { value: "savings", label: "Сбережения" },
  { value: "other", label: "Другое" },
];

export function renderAccounts({ outlet }) {
  clear(outlet);

  const header = el(
    "div",
    { class: "section-header" },
    el("h1", { class: "section-title", text: "Счета" }),
    el("button", { class: "btn btn-primary", type: "button", onClick: () => openAccountModal() }, "+ Новый счёт")
  );

  const list = el("div", { class: "list" });
  outlet.append(header, list);

  async function refresh() {
    const [accounts, transactions] = await Promise.all([
      storage.getAccounts(),
      storage.getTransactions(),
    ]);
    const balances = calculateAccountBalances(accounts, transactions);

    list.replaceChildren();

    if (!accounts.length) {
      list.appendChild(
        el(
          "div",
          { class: "empty" },
          el("p", { text: "Счётов пока нет." }),
          el("button", { class: "btn btn-primary", type: "button", onClick: () => openAccountModal() }, "Создать счёт")
        )
      );
      return;
    }

    accounts.forEach((account) => {
      const balance = balances[account.id] ?? account.opening_balance ?? 0;
      const left = el("div", {},
        el("div", { text: account.name }),
        el("div", { class: "label", text: account.archived ? "Архив" : account.type })
      );
      const right = el("div", { class: "inline-actions" },
        el("strong", { text: formatMoney(balance, account.currency) }),
        el("button", { class: "btn btn-outline", type: "button", onClick: () => openAccountModal(account) }, "Изменить"),
        el("button", { class: "btn btn-outline", type: "button", onClick: () => toggleArchive(account) }, account.archived ? "Вернуть" : "Архив"),
        el("button", { class: "btn btn-danger", type: "button", onClick: () => removeAccount(account) }, "Удалить")
      );

      list.appendChild(el("div", { class: "list-item" }, left, right));
    });
  }

  async function toggleArchive(account) {
    await storage.upsertAccount({ ...account, archived: !account.archived });
    showToast(account.archived ? "Счёт возвращён" : "Счёт перемещён в архив", "success");
    refresh();
  }

  async function removeAccount(account) {
    const ok = await confirmModal({
      title: "Удалить счёт?",
      message: "Если по счёту есть операции, он будет только архивирован.",
      confirmText: "Удалить",
    });
    if (!ok) return;
    const result = await storage.deleteAccount(account.id);
    if (result.archived) {
      showToast("Счёт архивирован, т.к. есть операции", "info");
    } else {
      showToast("Счёт удалён", "success");
    }
    refresh();
  }

  function openAccountModal(account = null) {
    const nameField = labeledInput({ label: "Название", value: account?.name || "", name: "name" });
    const typeField = labeledSelect({
      label: "Тип",
      name: "type",
      options: ACCOUNT_TYPES,
      value: account?.type || "cash",
    });
    const currencyField = labeledInput({ label: "Валюта (код)", value: account?.currency || "RUB", name: "currency" });
    const balanceField = labeledInput({
      label: "Стартовый баланс",
      value: account ? String((account.opening_balance || 0) / 100) : "0",
      name: "opening_balance",
    });

    const form = el("form", { class: "form-row" }, nameField.wrapper, typeField.wrapper, currencyField.wrapper, balanceField.wrapper);

    showModal({
      title: account ? "Редактировать счёт" : "Новый счёт",
      content: form,
      actions: [
        {
          label: "Сохранить",
          variant: "btn-primary",
          onClick: async (close) => {
            const data = {
              id: account?.id,
              name: nameField.input.value.trim(),
              type: typeField.select.value,
              currency: currencyField.input.value.trim().toUpperCase(),
              opening_balance: balanceField.input.value,
              archived: account?.archived ?? false,
            };
            const errors = validateAccount(data);
            [nameField.error, currencyField.error, balanceField.error].forEach((node) => (node.textContent = ""));
            if (Object.keys(errors).length) {
              if (errors.name) nameField.error.textContent = errors.name;
              if (errors.currency) currencyField.error.textContent = errors.currency;
              if (errors.opening_balance) balanceField.error.textContent = errors.opening_balance;
              return;
            }
            await storage.upsertAccount(data);
            showToast("Счёт сохранён", "success");
            close();
            refresh();
          },
        },
      ],
    });
  }

  refresh();
}
