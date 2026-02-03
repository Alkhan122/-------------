import { clear, el } from "../../utils/dom.js";
import { labeledInput } from "../components/form-controls.js";
import { showToast } from "../components/toast.js";
import * as storage from "../../storage/storage.js";

export function renderSignIn({ outlet }) {
  clear(outlet);

  const emailField = labeledInput({ label: "Email", name: "email", type: "email", placeholder: "you@example.com" });
  const passwordField = labeledInput({ label: "Пароль", name: "password", type: "password" });

  const submitBtn = el("button", { class: "btn btn-primary", type: "submit" }, "Войти");

  const form = el(
    "form",
    { class: "form-row" },
    emailField.wrapper,
    passwordField.wrapper,
    el("div", { class: "inline-actions" }, submitBtn)
  );

  const card = el(
    "div",
    { class: "card glow auth-card" },
    el("h1", { class: "section-title", text: "Вход" }),
    el("p", { class: "label", text: "Авторизуйтесь, чтобы синхронизировать данные." }),
    form,
    el(
      "p",
      { class: "label" },
      "Нет аккаунта? ",
      el("a", { href: "#/sign-up", class: "btn btn-outline", style: "margin-left:8px" }, "Регистрация")
    )
  );

  const wrapper = el("div", { class: "auth-wrapper" }, card);
  outlet.appendChild(wrapper);

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    emailField.error.textContent = "";
    passwordField.error.textContent = "";

    try {
      await storage.signIn({
        email: emailField.input.value.trim(),
        password: passwordField.input.value,
      });
      showToast("Добро пожаловать", "success");
    } catch (error) {
      console.error(error);
      showToast("Ошибка входа", "error");
    }
  });
}
