import { parseMoneyToInt } from "../utils/format.js";

export function validateAccount(data) {
  const errors = {};
  if (!data.name || data.name.trim().length < 2) {
    errors.name = "Введите название счёта (минимум 2 символа).";
  }
  if (!data.currency || data.currency.length !== 3) {
    errors.currency = "Код валюты должен состоять из 3 букв.";
  }
  const opening = parseMoneyToInt(data.opening_balance);
  if (opening === null) {
    errors.opening_balance = "Введите корректный стартовый баланс.";
  }
  return errors;
}

export function validateCategory(data) {
  const errors = {};
  if (!data.name || data.name.trim().length < 2) {
    errors.name = "Введите название категории (минимум 2 символа).";
  }
  if (!data.type || !["expense", "income"].includes(data.type)) {
    errors.type = "Выберите тип категории.";
  }
  return errors;
}

export function validateTransaction(data) {
  const errors = {};
  if (!data.date) {
    errors.date = "Выберите дату операции.";
  }
  if (!data.type || !["expense", "income", "transfer"].includes(data.type)) {
    errors.type = "Выберите тип операции.";
  }
  const amount = parseMoneyToInt(data.amount);
  if (amount === null || amount <= 0) {
    errors.amount = "Сумма должна быть больше нуля.";
  }

  if (data.type === "transfer") {
    if (!data.from_account_id) {
      errors.from_account_id = "Выберите счёт списания.";
    }
    if (!data.to_account_id) {
      errors.to_account_id = "Выберите счёт зачисления.";
    }
    if (data.from_account_id && data.to_account_id && data.from_account_id === data.to_account_id) {
      errors.to_account_id = "Счета списания и зачисления должны отличаться.";
    }
  } else {
    if (!data.account_id) {
      errors.account_id = "Выберите счёт.";
    }
    if (!data.category_id) {
      errors.category_id = "Выберите категорию.";
    }
  }
  return errors;
}
