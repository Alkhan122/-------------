import { el } from "../../utils/dom.js";

let toastRoot = null;

function getRoot() {
  if (!toastRoot) {
    toastRoot = document.getElementById("toast-root");
  }
  return toastRoot;
}

export function showToast(message, type = "info", timeout = 3200) {
  const root = getRoot();
  const toast = el("div", { class: `toast ${type}` }, message);
  root.appendChild(toast);
  const timer = setTimeout(() => {
    toast.remove();
  }, timeout);
  toast.addEventListener("click", () => {
    clearTimeout(timer);
    toast.remove();
  });
}
