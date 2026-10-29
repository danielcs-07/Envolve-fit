const passwordInput = document.getElementById("password");

if (passwordInput) {
  const field = passwordInput.closest(".form-group");

  if (field) {
    field.classList.add("password-field");

    const toggle = document.createElement("button");
    toggle.type = "button";
    toggle.className = "password-toggle";
    toggle.textContent = "Mostrar";
    toggle.setAttribute("aria-label", "Mostrar senha");
    toggle.setAttribute("aria-pressed", "false");
    toggle.setAttribute("aria-controls", "password");

    toggle.addEventListener("click", () => {
      const visible = passwordInput.type === "password";

      passwordInput.type = visible ? "text" : "password";
      toggle.textContent = visible ? "Ocultar" : "Mostrar";
      toggle.setAttribute("aria-label", visible ? "Ocultar senha" : "Mostrar senha");
      toggle.setAttribute("aria-pressed", String(visible));
    });

    // Mantém o controle de visibilidade ancorado ao campo, não à página.
    const inputWrapper = document.createElement("div");
    inputWrapper.className = "password-input-wrap";
    passwordInput.before(inputWrapper);
    inputWrapper.append(passwordInput, toggle);
  }
}
