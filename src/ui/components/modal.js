import { el, clear } from "../../utils/dom.js";

let modalRoot = null;

function getRoot() {
  if (!modalRoot) {
    modalRoot = document.getElementById("modal-root");
  }
  return modalRoot;
}

export function showModal({ title, content, actions = [], onClose }) {
  const root = getRoot();
  clear(root);
  const backdrop = el("div", { class: "modal-backdrop" });
  const modal = el("div", { class: "modal" });
  const header = el(
    "div",
    { class: "modal-header" },
    el("h3", { class: "modal-title", text: title || "" }),
    el(
      "button",
      {
        class: "btn btn-outline",
        onClick: () => close(),
        type: "button",
      },
      "Закрыть"
    )
  );

  const body = el("div", { class: "modal-body" }, content || "");
  const footer = el("div", { class: "inline-actions" });

  actions.forEach((action) => {
    const btn = el(
      "button",
      {
        class: `btn ${action.variant || "btn-outline"}`,
        type: "button",
        onClick: () => action.onClick?.(close),
      },
      action.label
    );
    footer.appendChild(btn);
  });

  modal.appendChild(header);
  modal.appendChild(body);
  if (actions.length > 0) {
    modal.appendChild(footer);
  }

  root.appendChild(backdrop);
  root.appendChild(modal);
  root.style.pointerEvents = "auto";

  const close = () => {
    modal.classList.remove("open");
    backdrop.classList.remove("open");
    setTimeout(() => {
      clear(root);
      root.style.pointerEvents = "none";
      if (onClose) onClose();
    }, 200);
    document.removeEventListener("keydown", onEsc);
  };

  const onEsc = (event) => {
    if (event.key === "Escape") close();
  };

  backdrop.addEventListener("click", close);
  document.addEventListener("keydown", onEsc);

  requestAnimationFrame(() => {
    modal.classList.add("open");
    backdrop.classList.add("open");
  });

  return close;
}

export function confirmModal({ title, message, confirmText = "Подтвердить", cancelText = "Отмена" }) {
  return new Promise((resolve) => {
    const content = el("div", {}, el("p", { text: message }));
    showModal({
      title,
      content,
      actions: [
        {
          label: cancelText,
          variant: "btn-outline",
          onClick: (close) => {
            close();
            resolve(false);
          },
        },
        {
          label: confirmText,
          variant: "btn-primary",
          onClick: (close) => {
            close();
            resolve(true);
          },
        },
      ],
    });
  });
}
