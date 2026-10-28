// Interface compartilhada. Não acessa Firebase nem modifica dados dos alunos.
(() => {
  "use strict";
  const THEME_KEY = "evolve-fit:studio:theme";
  const store = {
    get() { try { return localStorage.getItem(THEME_KEY) || "light"; } catch { return "light"; } },
    set(value) { try { localStorage.setItem(THEME_KEY, value); } catch {} }
  };
  const themes = new Set(["light", "dark", "system"]);
  const media = window.matchMedia?.("(prefers-color-scheme: dark)");
  let theme = themes.has(store.get()) ? store.get() : "light";

  function resolved() {
    return theme === "system" ? (media?.matches ? "dark" : "light") : theme;
  }
  function apply() {
    const mode = resolved();
    document.documentElement.dataset.studioTheme = mode;
    document.documentElement.style.colorScheme = mode;
    document.querySelectorAll("[data-theme-option]").forEach(button => {
      const active = button.dataset.themeOption === theme;
      button.setAttribute("aria-pressed", String(active));
      button.classList.toggle("is-selected", active);
    });
    const toggle = document.querySelector("[data-theme-toggle]");
    if (toggle) {
      toggle.textContent = mode === "dark" ? "☀" : "☾";
      toggle.title = mode === "dark" ? "Usar tema claro" : "Usar tema escuro";
      toggle.setAttribute("aria-label", toggle.title);
    }
  }
  function setTheme(value) {
    if (!themes.has(value)) return;
    theme = value;
    store.set(value);
    apply();
  }
  apply();
  media?.addEventListener?.("change", apply);

  function todayLabel() {
    return new Intl.DateTimeFormat("pt-BR", { weekday: "long", day: "numeric", month: "long" })
      .format(new Date());
  }

  function setup() {
    apply();
    const topbar = document.querySelector(".dashboard-page .topbar");
    if (topbar && !topbar.querySelector("[data-theme-toggle]")) {
      const controls = topbar.querySelector(".topbar-user");
      if (controls) {
        const toggle = document.createElement("button");
        toggle.type = "button";
        toggle.className = "studio-theme-toggle";
        toggle.dataset.themeToggle = "";
        toggle.addEventListener("click", () => setTheme(resolved() === "light" ? "dark" : "light"));
        controls.prepend(toggle);
      }
    }
    const date = document.querySelector("[data-today-label]");
    if (date) date.textContent = todayLabel();
    document.querySelectorAll("[data-theme-option]").forEach(button => {
      button.addEventListener("click", () => setTheme(button.dataset.themeOption));
    });
    document.querySelectorAll("[data-studio-logout]").forEach(button => {
      button.addEventListener("click", () => document.getElementById("logout")?.click());
    });
    document.querySelectorAll("[data-nav-to]").forEach(button => {
      button.addEventListener("click", () => {
        const target = document.querySelector('.nav-item[data-tab="' + button.dataset.navTo + '"]');
        target?.click();
      });
    });
    document.querySelectorAll("[data-external-link]").forEach(link => {
      link.setAttribute("target", "_blank");
      link.setAttribute("rel", "noopener noreferrer");
    });
    apply();
    // Tabs continuam sendo controladas pelos scripts originais do aluno/treinador.
    const navbar = document.querySelector(".sidebar-nav");
    if (navbar && typeof MutationObserver !== "undefined") {
      const update = () => {
        const active = navbar.querySelector(".nav-item.active");
        if (!active) return;
        navbar.querySelectorAll(".nav-item").forEach(button =>
          button.setAttribute("aria-current", button === active ? "page" : "false"));
      };
      new MutationObserver(update).observe(navbar, {
        attributes: true, subtree: true, attributeFilter: ["class"]
      });
      update();
    }
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", setup);
  else setup();
})();
