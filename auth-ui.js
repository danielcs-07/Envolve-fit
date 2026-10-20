const authForm = document.getElementById("auth-form");
const formTitle = document.getElementById("form-title");
const formSubtitle = document.getElementById("form-subtitle");
const nameGroup = document.getElementById("name-group");
const nameInput = document.getElementById("name");
const passwordInput = document.getElementById("password");
const submitBtn = document.getElementById("submit-btn");
const switchBtn = document.getElementById("switch-btn");
const switchText = document.getElementById("switch-text");
const authMessage = document.getElementById("auth-message");

let isRegistering = false;

switchBtn.addEventListener("click", () => {
    isRegistering = !isRegistering;

    authMessage.textContent = "";
    authForm.reset();

    nameGroup.hidden = !isRegistering;
    nameInput.required = isRegistering;

    if (isRegistering) {
        formTitle.textContent = "Crie sua conta";
        formSubtitle.textContent = "Comece sua evolução com o Evolve Fit.";
        submitBtn.textContent = "Criar minha conta";
        switchText.textContent = "Já tem uma conta?";
        switchBtn.textContent = "Entrar";
        passwordInput.autocomplete = "new-password";
    } else {
        formTitle.textContent = "Bem-vindo de volta!";
        formSubtitle.textContent = "Entre na sua conta para continuar.";
        submitBtn.textContent = "Entrar na minha conta";
        switchText.textContent = "Ainda não tem uma conta?";
        switchBtn.textContent = "Criar conta";
        passwordInput.autocomplete = "current-password";
    }
});

authForm.addEventListener("submit", (event) => {
    event.preventDefault();

    authMessage.textContent = "Estamos preparando o acesso seguro ao Evolve Fit.";
});
