import { clear, el } from "../../utils/dom.js";
import { validateCategory } from "../../domain/validators.js";
import { labeledInput, labeledSelect } from "../components/form-controls.js";
import { createSegmented } from "../components/segmented-control.js";
import { showModal, confirmModal } from "../components/modal.js";
import { showToast } from "../components/toast.js";
import * as storage from "../../storage/storage.js";

export function renderCategories({ outlet }) {
  clear(outlet);
  let currentType = "expense";

  const header = el(
    "div",
    { class: "section-header" },
    el("h1", { class: "section-title", text: "Категории" }),
    el("button", { class: "btn btn-primary", type: "button", onClick: () => openCategoryModal() }, "+ Категория")
  );

  const segmented = createSegmented({
    options: [
      { value: "expense", label: "Расход" },
      { value: "income", label: "Доход" },
    ],
    value: currentType,
    onChange: (val) => {
      currentType = val;
      refresh();
    },
  });

  const list = el("div", { class: "list" });
  outlet.append(header, segmented.el, list);

  async function refresh() {
    const categories = (await storage.getCategories()).filter((cat) => cat.type === currentType);
    list.replaceChildren();

    if (!categories.length) {
      list.appendChild(
        el(
          "div",
          { class: "empty" },
          el("p", { text: "Категорий пока нет." }),
          el("button", { class: "btn btn-primary", type: "button", onClick: () => openCategoryModal() }, "Создать категорию")
        )
      );
      return;
    }

    categories.forEach((category) => {
      const left = el(
        "div",
        {},
        el("div", {},
          el("span", { class: "badge-dot", style: `background:${category.color || "#00e5ff"}` }),
          category.name
        ),
        category.parent_id ? el("div", { class: "label", text: "Подкатегория" }) : null
      );
      const right = el(
        "div",
        { class: "inline-actions" },
        el("button", { class: "btn btn-outline", type: "button", onClick: () => openCategoryModal(category) }, "Изменить"),
        el("button", { class: "btn btn-danger", type: "button", onClick: () => removeCategory(category) }, "Удалить")
      );
      list.appendChild(el("div", { class: "list-item" }, left, right));
    });
  }

  async function removeCategory(category) {
    const ok = await confirmModal({
      title: "Удалить категорию?",
      message: "Категория будет удалена, если не используется в операциях.",
      confirmText: "Удалить",
    });
    if (!ok) return;
    const result = await storage.deleteCategory(category.id);
    if (result.blocked) {
      showToast("Категория используется в операциях. Удаление запрещено.", "error");
      return;
    }
    showToast("Категория удалена", "success");
    refresh();
  }

  async function openCategoryModal(category = null) {
    const allCategories = await storage.getCategories();
    const sameType = allCategories.filter((cat) => cat.type === (category?.type || currentType) && cat.id !== category?.id);
    const parentOptions = [{ value: "", label: "Нет" }, ...sameType.map((cat) => ({ value: cat.id, label: cat.name }))];

    const nameField = labeledInput({ label: "Название", value: category?.name || "", name: "name" });
    const typeField = labeledSelect({
      label: "Тип",
      name: "type",
      options: [
        { value: "expense", label: "Расход" },
        { value: "income", label: "Доход" },
      ],
      value: category?.type || currentType,
    });
    const parentField = labeledSelect({ label: "Родительская", name: "parent_id", options: parentOptions, value: category?.parent_id || "" });
    const colorField = labeledInput({ label: "Цвет", value: category?.color || "#00e5ff", name: "color", type: "color" });

    const form = el("form", { class: "form-row" }, nameField.wrapper, typeField.wrapper, parentField.wrapper, colorField.wrapper);

    showModal({
      title: category ? "Редактировать категорию" : "Новая категория",
      content: form,
      actions: [
        {
          label: "Сохранить",
          variant: "btn-primary",
          onClick: async (close) => {
            const data = {
              id: category?.id,
              name: nameField.input.value.trim(),
              type: typeField.select.value,
              parent_id: parentField.select.value || null,
              color: colorField.input.value || "#00e5ff",
            };
            const errors = validateCategory(data);
            [nameField.error, typeField.error].forEach((node) => (node.textContent = ""));
            if (Object.keys(errors).length) {
              if (errors.name) nameField.error.textContent = errors.name;
              if (errors.type) typeField.error.textContent = errors.type;
              return;
            }
            await storage.upsertCategory(data);
            showToast("Категория сохранена", "success");
            close();
            refresh();
          },
        },
      ],
    });
  }

  refresh();
}
