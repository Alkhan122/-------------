import { renderLayout, getQuickAddButton, getSignOutButton } from "./ui/layout.js";
import { createRouter } from "./router.js";
import * as storage from "./storage/storage.js";
import { showToast } from "./ui/components/toast.js";
import { renderDashboard } from "./ui/pages/dashboard.js";
import { renderTransactions } from "./ui/pages/transactions.js";
import { renderAccounts } from "./ui/pages/accounts.js";
import { renderCategories } from "./ui/pages/categories.js";
import { renderReports } from "./ui/pages/reports.js";
import { renderSettings } from "./ui/pages/settings.js";
import { renderSignIn } from "./ui/pages/sign-in.js";
import { renderSignUp } from "./ui/pages/sign-up.js";

async function initApp() {
  const root = document.getElementById("app");
  const { view, setActiveRoute } = renderLayout(root);

  await storage.init();
  const authRoutes = new Set(["/sign-in", "/sign-up"]);
  let session = null;

  const quickAdd = getQuickAddButton();
  const signOutBtn = getSignOutButton();

  const updateAuthUI = ({ isAuthRoute, hasSession }) => {
    document.body.classList.toggle("auth-mode", isAuthRoute);
    if (quickAdd) quickAdd.style.display = hasSession ? "" : "none";
    if (signOutBtn) signOutBtn.style.display = hasSession ? "" : "none";
  };

  const router = createRouter({
    outlet: view,
    routes: {
      "/dashboard": renderDashboard,
      "/transactions": renderTransactions,
      "/accounts": renderAccounts,
      "/categories": renderCategories,
      "/reports": renderReports,
      "/settings": renderSettings,
      "/sign-in": renderSignIn,
      "/sign-up": renderSignUp,
    },
    onRouteChange: setActiveRoute,
    beforeEach: async ({ path }) => {
      const isAuthRoute = authRoutes.has(path);
      try {
        session = await storage.getSession();
      } catch (error) {
        session = null;
      }
      if (!session && !isAuthRoute) {
        updateAuthUI({ isAuthRoute: true, hasSession: false });
        return "/sign-in";
      }
      if (session && isAuthRoute) {
        updateAuthUI({ isAuthRoute: false, hasSession: true });
        return "/dashboard";
      }
      updateAuthUI({ isAuthRoute, hasSession: Boolean(session) });
      return null;
    },
  });

  if (quickAdd) {
    quickAdd.addEventListener("click", () => {
      router.navigate("/transactions?new=1");
    });
  }

  if (signOutBtn) {
    signOutBtn.addEventListener("click", async () => {
      try {
        await storage.signOut();
        showToast("Вы вышли из системы", "success");
      } catch (error) {
        console.error(error);
        showToast("Ошибка выхода", "error");
      }
    });
  }

  storage.onAuthStateChange((_event, newSession) => {
    session = newSession;
    const currentPath = window.location.hash.replace(/^#/, "").split("?")[0] || "/dashboard";
    const isAuthRoute = authRoutes.has(currentPath);
    if (!session && !isAuthRoute) {
      router.navigate("/sign-in");
      updateAuthUI({ isAuthRoute: true, hasSession: false });
      return;
    }
    if (session && isAuthRoute) {
      router.navigate("/dashboard");
      updateAuthUI({ isAuthRoute: false, hasSession: true });
      return;
    }
    updateAuthUI({ isAuthRoute, hasSession: Boolean(session) });
  });

  router.start();
}

window.addEventListener("error", (event) => {
  showToast(`Ошибка: ${event.message}`, "error");
});

initApp().catch((error) => {
  console.error(error);
  showToast("Не удалось инициализировать приложение", "error");
});
