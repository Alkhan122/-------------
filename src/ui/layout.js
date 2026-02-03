import { el, createIcon, qs, qsa } from "../utils/dom.js";

const NAV_ITEMS = [
  { path: "/dashboard", label: "Обзор", icon: "M4 13h6V4H4v9zm0 7h6v-5H4v5zm10 0h6V11h-6v9zm0-18v5h6V2h-6z" },
  { path: "/transactions", label: "Операции", icon: "M4 6h16M4 12h10M4 18h16" },
  { path: "/accounts", label: "Счета", icon: "M3 7h18v10H3z M7 7V5h10v2" },
  { path: "/categories", label: "Категории", icon: "M4 5h6v6H4z M14 5h6v6h-6z M4 13h6v6H4z M14 13h6v6h-6z" },
  { path: "/reports", label: "Отчёты", icon: "M5 19V5m5 14V9m5 10V7m5 12V11" },
  { path: "/settings", label: "Настройки", icon: "M12 8a4 4 0 100 8 4 4 0 000-8zm9 4l-2.1.7a7.9 7.9 0 01-.7 1.7l1.2 1.9-1.4 1.4-1.9-1.2a7.9 7.9 0 01-1.7.7L12 21l-1-2.1a7.9 7.9 0 01-1.7-.7l-1.9 1.2-1.4-1.4 1.2-1.9a7.9 7.9 0 01-.7-1.7L3 12l2.1-.7a7.9 7.9 0 01.7-1.7L4.6 7.7 6 6.3l1.9 1.2a7.9 7.9 0 011.7-.7L12 3l1 2.1a7.9 7.9 0 011.7.7l1.9-1.2 1.4 1.4-1.2 1.9a7.9 7.9 0 01.7 1.7L21 12z" },
];

export function renderLayout(root) {
  const topbar = el(
    "header",
    { class: "topbar" },
    el("div", { class: "brand" }, el("span", { class: "brand-dot" }), "Neon Ledger"),
    el(
      "div",
      { class: "inline-actions" },
      el("button", { class: "btn btn-primary", id: "quick-add", type: "button" }, "+ Операция"),
      el("button", { class: "btn btn-outline", id: "sign-out", type: "button" }, "Выйти")
    )
  );

  const sidebar = el("nav", { class: "sidebar" });
  const bottomNav = el("nav", { class: "bottom-nav" });

  NAV_ITEMS.forEach((item) => {
    const link = el(
      "a",
      { class: "nav-link", href: `#${item.path}`, dataset: { path: item.path } },
      createIcon(item.icon),
      item.label
    );
    const bottomLink = el(
      "a",
      { class: "nav-link", href: `#${item.path}`, dataset: { path: item.path } },
      createIcon(item.icon),
      item.label
    );
    sidebar.appendChild(link);
    bottomNav.appendChild(bottomLink);
  });

  const view = el("main", { id: "view", class: "view" });
  const content = el("div", { class: "content" }, sidebar, view);
  const shell = el("div", { class: "app-shell" }, topbar, content, bottomNav);

  root.appendChild(shell);

  function setActiveRoute(path) {
    qsa(".nav-link", root).forEach((link) => {
      link.classList.toggle("active", link.dataset.path === path);
    });
  }

  return { view, setActiveRoute };
}

export function getQuickAddButton() {
  return qs("#quick-add");
}

export function getSignOutButton() {
  return qs("#sign-out");
}
