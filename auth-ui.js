
import { auth, db } from "./firebase-config.js";

import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.4.0/firebase-auth.js";

import {
  doc,
  getDoc
} from "https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js";

const form = document.getElementById("auth-form");
const formTitle = document.getElementById("form-title");
const formSubtitle = document.getElementById("form-subtitle");
const nameGroup = document.getElementById("name-group");
const nameInput = document.getElementById("name");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const submitButton = document.getElementById("submit-btn");
const switchButton = document.getElementById("switch-btn");
const switchText = document.getElementById("switch-text");
const message = document.getElementById("auth-message");

let isRegistering = false;
let isBusy = false;

function showMessage(text, type = "") {
  message.textContent = text;
  message.className = "auth-message";

  if (type) {
    message.classList.add(type);
  }
}

function updateForm() {
  formTitle.textContent = isRegistering
    ? "Crie sua conta"
    : "Bem-vindo de volta!";

  formSubtitle.textContent = isRegistering
    ? "Cadastre-se para começar sua evolução."
    : "Entre na sua conta para continuar evoluindo.";

  nameGroup.hidden = !isRegistering;
  nameInput.required = isRegistering;

  passwordInput.autocomplete = isRegistering
    ? "new-password"
    : "current-password";

  submitButton.textContent = isRegistering
    ? "Criar minha conta"
    : "Entrar na minha conta";

  switchText.textContent = isRegistering
    ? "Já possui uma conta?"
    : "Ainda não tem uma conta?";

  switchButton.textContent = isRegistering
    ? "Fazer login"
    : "Criar conta";

  showMessage("");
}

async function getAuthorizedProfile(user) {
  const profileSnapshot = await getDoc(
    doc(db, "users", user.uid)
  );

  if (!profileSnapshot.exists()) {
    return null;
  }

  const profile = profileSnapshot.data();

  if (
    profile.active !== true ||
    !["trainer", "student"].includes(profile.role)
  ) {
    return null;
  }

  return profile;
}

function redirectToDashboard(role) {
  const destination = role === "trainer"
    ? "treinador.html"
    : "aluno.html";

  window.location.replace(destination);
}

switchButton.addEventListener("click", () => {
  if (isBusy) return;

  isRegistering = !isRegistering;
  updateForm();
});

form.addEventListener("submit", async event => {
  event.preventDefault();

  if (isBusy) return;

  isBusy = true;
  submitButton.disabled = true;
  showMessage("Aguarde, estamos verificando...");

  try {
    const email = emailInput.value.trim();
    const password = passwordInput.value;

    if (isRegistering) {
      await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );

      await signOut(auth);

      form.reset();
      isRegistering = false;
      updateForm();

      showMessage(
        "Conta criada! Aguarde a autorização do treinador.",
        "success"
      );

      return;
    }

    const credential = await signInWithEmailAndPassword(
      auth,
      email,
      password
    );

    const profile = await getAuthorizedProfile(
      credential.user
    );

    if (!profile) {
      await signOut(auth);

      showMessage(
        "Sua conta ainda não está autorizada.",
        "error"
      );

      return;
    }

    redirectToDashboard(profile.role);

  } catch (error) {
    console.error("Erro de autenticação:", error);

    const errors = {
      "auth/invalid-email": "Digite um e-mail válido.",
      "auth/invalid-credential": "E-mail ou senha incorretos.",
      "auth/email-already-in-use": "Este e-mail já está cadastrado.",
      "auth/weak-password": "A senha deve ter pelo menos 6 caracteres.",
      "auth/too-many-requests": "Muitas tentativas. Tente novamente mais tarde.",
      "auth/network-request-failed": "Verifique sua conexão com a internet.",
      "permission-denied": "Você não tem permissão para acessar estes dados."
    };

    showMessage(
      errors[error.code] ||
      "Não foi possível concluir a operação. Tente novamente.",
      "error"
    );

  } finally {
    isBusy = false;
    submitButton.disabled = false;
  }
});

onAuthStateChanged(auth, async user => {
  if (!user || isBusy || isRegistering) return;

  try {
    const profile = await getAuthorizedProfile(user);

    if (profile) {
      redirectToDashboard(profile.role);
    }
  } catch (error) {
    console.error("Erro ao verificar sessão:", error);
  }
});

updateForm();
