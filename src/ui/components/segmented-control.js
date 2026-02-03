import { el } from "../../utils/dom.js";

export function createSegmented({ options, value, onChange }) {
  const container = el("div", { class: "segmented" });
  const buttons = new Map();

  function setActive(val) {
    buttons.forEach((btn, key) => {
      btn.classList.toggle("active", key === val);
    });
  }

  options.forEach((opt) => {
    const btn = el(
      "button",
      {
        type: "button",
        onClick: () => {
          setActive(opt.value);
          onChange?.(opt.value);
        },
      },
      opt.label
    );
    buttons.set(opt.value, btn);
    container.appendChild(btn);
  });

  setActive(value);

  return {
    el: container,
    setValue: setActive,
  };
}
