let deferredInstall = null;

const showInstallButton = () => {
  if (document.getElementById("app-install")) return;
  const button = document.createElement("button");
  button.id = "app-install";
  button.className = "install-app-btn";
  button.type = "button";
  button.textContent = "📲 Instalar Evolve Fit";
  const target = document.querySelector(".sidebar-bottom") ||
    document.querySelector(".login-footer");
  if (!target) return;
  target.prepend(button);
  button.addEventListener("click", async () => {
    if (!deferredInstall) return;
    deferredInstall.prompt();
    await deferredInstall.userChoice;
    deferredInstall = null;
    button.remove();
  });
};

window.addEventListener("beforeinstallprompt", event => {
  event.preventDefault();
  deferredInstall = event;
  showInstallButton();
});

window.addEventListener("appinstalled", () => {
  deferredInstall = null;
  document.getElementById("app-install")?.remove();
});

if ("serviceWorker" in navigator && location.protocol === "https:") {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch(error => {
      console.warn("Instalação do aplicativo indisponível:", error);
    });
  });
}
