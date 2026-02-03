import { clear, el } from "../../utils/dom.js";
import { formatMoney, todayISO, getMonthRange, getLastNDaysRange, parseMoneyToInt, formatDate } from "../../utils/format.js";
import { sortTransactions } from "../../domain/calculations.js";
import { validateTransaction } from "../../domain/validators.js";
import { labeledInput, labeledSelect, labeledTextarea } from "../components/form-controls.js";
import { createSegmented } from "../components/segmented-control.js";
import { showModal, confirmModal } from "../components/modal.js";
import { showToast } from "../components/toast.js";
import { uid } from "../../utils/id.js";
import * as storage from "../../storage/storage.js";

export function renderTransactions({ outlet, query }) {
  clear(outlet);

  const header = el(
    "div",
    { class: "section-header" },
    el("h1", { class: "section-title", text: "Операции" }),
    el("button", { class: "btn btn-primary", type: "button", onClick: () => openTransactionModal() }, "+ Операция")
  );

  const filtersWrap = el("div", { class: "filters" });
  const list = el("div", { class: "list" });

  outlet.append(header, filtersWrap, list);

  let accounts = [];
  let categories = [];
  let transactions = [];

  const periodField = labeledSelect({
    label: "Период",
    name: "period",
    options: [
      { value: "current", label: "Текущий месяц" },
      { value: "previous", label: "Прошлый месяц" },
      { value: "7", label: "Последние 7 дней" },
      { value: "30", label: "Последние 30 дней" },
      { value: "all", label: "Все" },
    ],
    value: "current",
  });

  const accountField = labeledSelect({ label: "Счёт", name: "account", options: [{ value: "", label: "Все" }] });
  const categoryField = labeledSelect({ label: "Категория", name: "category", options: [{ value: "", label: "Все" }] });
  const typeField = labeledSelect({
    label: "Тип",
    name: "type",
    options: [
      { value: "", label: "Все" },
      { value: "expense", label: "Расход" },
      { value: "income", label: "Доход" },
      { value: "transfer", label: "Перевод" },
    ],
  });
  const searchField = labeledInput({ label: "Поиск", name: "search", placeholder: "Получатель или заметка" });

  filtersWrap.append(
    periodField.wrapper,
    accountField.wrapper,
    categoryField.wrapper,
    typeField.wrapper,
    searchField.wrapper
  );

  const refresh = async () => {
    [accounts, categories, transactions] = await Promise.all([
      storage.getAccounts(),
      storage.getCategories(),
      storage.getTransactions(),
    ]);

    accountField.select.replaceChildren(el("option", { value: "", text: "Все" }));
    accounts.filter((acc) => !acc.archived).forEach((acc) => {
      accountField.select.appendChild(el("option", { value: acc.id, text: acc.name }));
    });

    categoryField.select.replaceChildren(el("option", { value: "", text: "Все" }));
    categories.forEach((cat) => {
      categoryField.select.appendChild(el("option", { value: cat.id, text: cat.name }));
    });

    renderList();
  };

  const getRangeByPeriod = () => {
    const period = periodField.select.value;
    if (period === "current") return getMonthRange(0);
    if (period === "previous") return getMonthRange(-1);
    if (period === "7") return getLastNDaysRange(7);
    if (period === "30") return getLastNDaysRange(30);
    return { from: null, to: null };
  };

  const renderList = async () => {
    const range = getRangeByPeriod();
    const filters = {
      from: range.from,
      to: range.to,
      accountId: accountField.select.value || null,
      categoryId: categoryField.select.value || null,
      type: typeField.select.value || null,
      search: searchField.input.value.trim() || null,
    };

    const filtered = await storage.queryTransactionsFiltered(filters);
    const items = buildDisplayItems(filtered, accounts, categories);

    list.replaceChildren();

    if (!items.length) {
      list.appendChild(
        el(
          "div",
          { class: "empty" },
          el("p", { text: "Нет операций по выбранным фильтрам." }),
          el("button", { class: "btn btn-primary", type: "button", onClick: () => openTransactionModal() }, "Добавить операцию")
        )
      );
      return;
    }

    items.forEach((item) => {
      const badgeClass = item.kind === "transfer" ? "transfer" : item.type;
      const badgeLabel = item.kind === "transfer" ? "Перевод" : item.type === "income" ? "Доход" : "Расход";
      const title = item.title;
      const subtitle = item.subtitle;
      const amountText = formatMoney(item.amount, item.currency || "RUB");

      const left = el(
        "div",
        {},
        el("div", { text: title }),
        el("div", { class: "label", text: subtitle })
      );
      const right = el(
        "div",
        { class: "inline-actions" },
        el("span", { class: `badge ${badgeClass}`, text: badgeLabel }),
        el("strong", { text: amountText }),
        el("button", { class: "btn btn-outline", type: "button", onClick: () => openTransactionModal(item) }, "Изменить"),
        el("button", { class: "btn btn-danger", type: "button", onClick: () => removeItem(item) }, "Удалить" )
      );
      list.appendChild(el("div", { class: "list-item" }, left, right));
    });
  };

  function buildDisplayItems(rawTransactions, accountList, categoryList) {
    const accountMap = new Map(accountList.map((acc) => [acc.id, acc]));
    const categoryMap = new Map(categoryList.map((cat) => [cat.id, cat]));

    const transfers = new Map();
    const singles = [];

    sortTransactions(rawTransactions).forEach((tx) => {
      if (tx.transfer_id) {
        const group = transfers.get(tx.transfer_id) || [];
        group.push(tx);
        transfers.set(tx.transfer_id, group);
      } else {
        singles.push({ kind: "single", tx });
      }
    });

    const mergedTransfers = [];
    transfers.forEach((group, transferId) => {
      const outTx = group.find((tx) => tx.type === "expense") || group[0];
      const inTx = group.find((tx) => tx.type === "income") || group[1];
      const fromId = outTx?.account_id || inTx?.to_account_id || outTx?.to_account_id;
      const toId = inTx?.account_id || outTx?.to_account_id || inTx?.to_account_id;
      const from = accountMap.get(fromId)?.name || "—";
      const to = accountMap.get(toId)?.name || "—";
      mergedTransfers.push({
        kind: "transfer",
        transfer_id: transferId,
        date: outTx?.date || inTx?.date || "",
        amount: outTx?.amount || inTx?.amount || 0,
        currency: outTx?.currency || inTx?.currency || "RUB",
        title: `${from} → ${to}`,
        subtitle: `${formatDate(outTx?.date || inTx?.date)} · ${outTx?.note || inTx?.note || "Перевод между счетами"}`,
        outTx,
        inTx,
      });
    });

    const items = [
      ...singles.map(({ tx }) => ({
        kind: "transaction",
        id: tx.id,
        type: tx.type,
        date: tx.date,
        amount: tx.amount,
        currency: tx.currency,
        title: tx.payee || (tx.type === "income" ? "Доход" : "Расход"),
        subtitle: `${formatDate(tx.date)} · ${accountMap.get(tx.account_id)?.name || "—"} · ${categoryMap.get(tx.category_id)?.name || "Без категории"}`,
        tx,
      })),
      ...mergedTransfers,
    ];

    return items.sort((a, b) => b.date.localeCompare(a.date));
  }

  async function removeItem(item) {
    const ok = await confirmModal({
      title: "Удалить операцию?",
      message: item.kind === "transfer" ? "Будут удалены обе операции перевода." : "Операция будет удалена без возможности восстановления.",
      confirmText: "Удалить",
    });
    if (!ok) return;
    if (item.kind === "transfer") {
      await storage.deleteTransactionsByTransferId(item.transfer_id);
    } else {
      await storage.deleteTransaction(item.id);
    }
    showToast("Операция удалена", "success");
    refresh();
  }

  function openTransactionModal(item = null) {
    const isTransfer = item?.kind === "transfer" || item?.type === "transfer";
    let mode = isTransfer ? "transfer" : item?.tx?.type || "expense";

    const typeSegment = createSegmented({
      options: [
        { value: "expense", label: "Расход" },
        { value: "income", label: "Доход" },
        { value: "transfer", label: "Перевод" },
      ],
      value: mode,
      onChange: (val) => {
        mode = val;
        renderFields();
      },
    });

    const dateField = labeledInput({ label: "Дата", name: "date", type: "date", value: item?.date || item?.tx?.date || todayISO() });
    const amountField = labeledInput({ label: "Сумма", name: "amount", value: item?.amount ? String(item.amount / 100) : item?.tx?.amount ? String(item.tx.amount / 100) : "" });
    const noteField = labeledTextarea({ label: "Заметка", name: "note", value: item?.outTx?.note || item?.tx?.note || item?.subtitle || "" });
    const payeeField = labeledInput({ label: "Получатель", name: "payee", value: item?.tx?.payee || "" });

    const accountOptions = [{ value: "", label: "Выберите" }, ...accounts.filter((acc) => !acc.archived).map((acc) => ({ value: acc.id, label: acc.name }))];
    const categoryOptions = [{ value: "", label: "Выберите" }, ...categories.filter((cat) => cat.type === mode).map((cat) => ({ value: cat.id, label: cat.name }))];

    const accountField = labeledSelect({ label: "Счёт", name: "account_id", options: accountOptions, value: item?.tx?.account_id || "" });
    const categoryField = labeledSelect({ label: "Категория", name: "category_id", options: categoryOptions, value: item?.tx?.category_id || "" });

    const fromAccountField = labeledSelect({
      label: "Счёт списания",
      name: "from_account_id",
      options: accountOptions,
      value: item?.outTx?.account_id || "",
    });
    const toAccountField = labeledSelect({
      label: "Счёт зачисления",
      name: "to_account_id",
      options: accountOptions,
      value: item?.inTx?.account_id || "",
    });

    const form = el("form", { class: "form-row" });

    function renderFields() {
      form.replaceChildren();
      form.appendChild(typeSegment.el);
      form.appendChild(dateField.wrapper);
      form.appendChild(amountField.wrapper);
      if (mode === "transfer") {
        form.appendChild(fromAccountField.wrapper);
        form.appendChild(toAccountField.wrapper);
        form.appendChild(noteField.wrapper);
      } else {
        categoryField.select.replaceChildren(el("option", { value: "", text: "Выберите" }));
        categories.filter((cat) => cat.type === mode).forEach((cat) => {
          categoryField.select.appendChild(el("option", { value: cat.id, text: cat.name }));
        });
        if (item?.tx?.category_id) categoryField.select.value = item.tx.category_id;
        form.appendChild(accountField.wrapper);
        form.appendChild(categoryField.wrapper);
        form.appendChild(payeeField.wrapper);
        form.appendChild(noteField.wrapper);
      }
    }

    renderFields();

    showModal({
      title: item ? "Редактировать операцию" : "Новая операция",
      content: form,
      actions: [
        {
          label: "Сохранить",
          variant: "btn-primary",
          onClick: async (close) => {
            const data = {
              date: dateField.input.value,
              type: mode,
              amount: amountField.input.value,
              account_id: accountField.select?.value,
              category_id: categoryField.select?.value,
              payee: payeeField.input?.value?.trim(),
              note: noteField.textarea.value.trim(),
              from_account_id: fromAccountField.select?.value,
              to_account_id: toAccountField.select?.value,
            };

            const errors = validateTransaction(data);
            [dateField.error, amountField.error, accountField.error, categoryField.error, fromAccountField.error, toAccountField.error].forEach((node) => {
              if (node) node.textContent = "";
            });
            if (Object.keys(errors).length) {
              if (errors.date) dateField.error.textContent = errors.date;
              if (errors.amount) amountField.error.textContent = errors.amount;
              if (errors.account_id) accountField.error.textContent = errors.account_id;
              if (errors.category_id) categoryField.error.textContent = errors.category_id;
              if (errors.from_account_id) fromAccountField.error.textContent = errors.from_account_id;
              if (errors.to_account_id) toAccountField.error.textContent = errors.to_account_id;
              return;
            }

            const accountCurrency = (accountId) => accounts.find((acc) => acc.id === accountId)?.currency || "RUB";
            if (mode === "transfer") {
              await storage.upsertTransfer({
                transferId: item?.transfer_id || uid(),
                outId: item?.outTx?.id,
                inId: item?.inTx?.id,
                date: data.date,
                fromAccountId: data.from_account_id,
                toAccountId: data.to_account_id,
                amount: parseMoneyToInt(data.amount),
                currency: accountCurrency(data.from_account_id),
                note: data.note,
              });
              showToast("Перевод сохранён", "success");
            } else {
              await storage.upsertTransaction({
                id: item?.tx?.id,
                date: data.date,
                type: mode,
                account_id: data.account_id,
                amount: data.amount,
                currency: accountCurrency(data.account_id),
                category_id: data.category_id,
                payee: data.payee,
                note: data.note,
                created_at: item?.tx?.created_at,
              });
              showToast("Операция сохранена", "success");
            }
            close();
            refresh();
          },
        },
      ],
    });
  }

  [periodField.select, accountField.select, categoryField.select, typeField.select, searchField.input].forEach((control) => {
    control.addEventListener("change", renderList);
    control.addEventListener("input", renderList);
  });

  refresh().then(() => {
    if (query?.new === "1") {
      openTransactionModal();
    }
  });
}
