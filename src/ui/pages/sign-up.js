import { clear, el } from "../../utils/dom.js";
import { labeledInput } from "../components/form-controls.js";
import { showToast } from "../components/toast.js";
import * as storage from "../../storage/storage.js";

export function renderSignUp({ outlet }) {
  clear(outlet);

  const emailField = labeledInput({ label: "Email", name: "email", type: "email", placeholder: "you@example.com" });
  const passwordField = labeledInput({ label: "Пароль", name: "password", type: "password" });

  const submitBtn = el("button", { class: "btn btn-primary", type: "submit" }, "Создать аккаунт");

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
    el("h1", { class: "section-title", text: "Регистрация" }),
    el("p", { class: "label", text: "Создайте аккаунт для синхронизации данных." }),
    form,
    el(
      "p",
      { class: "label" },
      "Уже есть аккаунт? ",
      el("a", { href: "#/sign-in", class: "btn btn-outline", style: "margin-left:8px" }, "Войти")
    )
  );

  const wrapper = el("div", { class: "auth-wrapper" }, card);
  outlet.appendChild(wrapper);

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    emailField.error.textContent = "";
    passwordField.error.textContent = "";

    try {
      await storage.signUp({
        email: emailField.input.value.trim(),
        password: passwordField.input.value,
      });
      showToast("Проверьте почту для подтверждения", "success");
    } catch (error) {
      console.error(error);
      showToast("Ошибка регистрации", "error");
    }
  });
}
