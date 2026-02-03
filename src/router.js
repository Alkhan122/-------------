import { qs } from "./utils/dom.js";

function parseHash() {
  const hash = window.location.hash.replace(/^#/, "") || "/dashboard";
  const [path, queryString] = hash.split("?");
  const query = {};
  if (queryString) {
    queryString.split("&").forEach((part) => {
      const [key, value] = part.split("=");
      if (key) query[decodeURIComponent(key)] = decodeURIComponent(value || "");
    });
  }
  return { path: path.startsWith("/") ? path : `/${path}`, query };
}

export function createRouter({ routes, outlet, onRouteChange, beforeEach }) {
  let cleanup = null;

  const render = async () => {
    const { path, query } = parseHash();
    if (beforeEach) {
      const result = await beforeEach({ path, query });
      if (result === false) return;
      if (typeof result === "string" && result !== path) {
        const next = result.startsWith("/") ? result : `/${result}`;
        window.location.hash = `#${next}`;
        return;
      }
    }
    const route = routes[path] || routes["/dashboard"];
    if (cleanup) cleanup();
    if (!route) return;
    cleanup = route({ path, query, outlet }) || null;
    if (onRouteChange) onRouteChange(path);
  };

  const navigate = (path) => {
    const next = path.startsWith("/") ? path : `/${path}`;
    window.location.hash = `#${next}`;
  };

  const start = () => {
    window.addEventListener("hashchange", render);
    render();
  };

  return { start, navigate };
}

export function replaceHash(path) {
  const next = path.startsWith("/") ? path : `/${path}`;
  window.location.replace(`#${next}`);
}

export function getOutlet() {
  return qs("#view");
}
