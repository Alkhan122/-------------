import { clear, el } from "../../utils/dom.js";
import { showToast } from "../components/toast.js";
import { confirmModal } from "../components/modal.js";
import * as storage from "../../storage/storage.js";

export function renderSettings({ outlet }) {
  clear(outlet);

  const header = el("div", { class: "section-header" }, el("h1", { class: "section-title", text: "Настройки" }));

  const exportBtn = el("button", { class: "btn btn-primary", type: "button" }, "Экспорт JSON");
  const importInput = el("input", { type: "file", accept: ".json", class: "input" });
  const importBtn = el("button", { class: "btn btn-outline", type: "button" }, "Импорт JSON");
  const resetBtn = el("button", { class: "btn btn-danger", type: "button" }, "Сбросить данные");
  const seedBtn = el("button", { class: "btn btn-outline", type: "button" }, "Заполнить демо" );

  const dataCard = el(
    "div",
    { class: "card" },
    el("h2", { class: "section-title", text: "Данные" }),
    el("p", { class: "label", text: "Экспортируйте данные или восстановите из файла." }),
    el("div", { class: "inline-actions" }, exportBtn, importBtn),
    el("div", { class: "form-row" }, el("label", { class: "label", text: "Файл для импорта" }), importInput),
    el("div", { class: "inline-actions" }, seedBtn, resetBtn)
  );

  outlet.append(header, dataCard);

  exportBtn.addEventListener("click", async () => {
    const data = await storage.exportData();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `finance_export_${Date.now()}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    showToast("Экспорт готов", "success");
  });

  importBtn.addEventListener("click", async () => {
    const file = importInput.files?.[0];
    if (!file) {
      showToast("Выберите файл для импорта", "error");
      return;
    }
    const ok = await confirmModal({
      title: "Импорт данных",
      message: "Текущие данные будут перезаписаны. Продолжить?",
      confirmText: "Импортировать",
    });
    if (!ok) return;

    try {
      const text = await file.text();
      const data = JSON.parse(text);
      await storage.importData(data);
      showToast("Импорт завершён", "success");
    } catch (error) {
      console.error(error);
      showToast("Ошибка импорта файла", "error");
    }
  });

  resetBtn.addEventListener("click", async () => {
    const ok = await confirmModal({
      title: "Сброс данных",
      message: "Все локальные данные будут удалены. Продолжить?",
      confirmText: "Сбросить",
    });
    if (!ok) return;
    await storage.resetAll();
    showToast("Данные удалены", "success");
  });

  seedBtn.addEventListener("click", async () => {
    const ok = await confirmModal({
      title: "Заполнить демо",
      message: "Данные будут заменены демо-набором. Продолжить?",
      confirmText: "Заполнить",
    });
    if (!ok) return;
    await storage.seedDemoData();
    showToast("Демо-данные загружены", "success");
  });
}
