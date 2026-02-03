import { el } from "../../utils/dom.js";

export function labeledInput({ label, type = "text", value = "", name, placeholder = "", required = false, step, min, max }) {
  const input = el("input", {
    class: "input",
    type,
    value,
    name,
    placeholder,
    required: required ? "true" : undefined,
    step,
    min,
    max,
  });
  const error = el("div", { class: "field-error" });
  const wrapper = el(
    "div",
    { class: "form-group" },
    el("label", { class: "label", text: label }),
    input,
    error
  );
  return { wrapper, input, error };
}

export function labeledTextarea({ label, value = "", name, placeholder = "" }) {
  const textarea = el("textarea", {
    class: "textarea",
    name,
    placeholder,
  });
  textarea.value = value;
  const error = el("div", { class: "field-error" });
  const wrapper = el(
    "div",
    { class: "form-group" },
    el("label", { class: "label", text: label }),
    textarea,
    error
  );
  return { wrapper, textarea, error };
}

export function labeledSelect({ label, name, options = [], value = "" }) {
  const select = el("select", { class: "select", name });
  options.forEach((opt) => {
    const option = el("option", { value: opt.value, text: opt.label });
    if (opt.value === value) option.selected = true;
    select.appendChild(option);
  });
  const error = el("div", { class: "field-error" });
  const wrapper = el(
    "div",
    { class: "form-group" },
    el("label", { class: "label", text: label }),
    select,
    error
  );
  return { wrapper, select, error };
}
