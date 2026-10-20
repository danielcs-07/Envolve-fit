
import { auth, db } from "./firebase-config.js";

import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut
} from "https://www.gstatic.com/firebasejs/12.4.0/firebase-auth.js";

import {
  doc,
  getDoc
} from "https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js";

const form = document.getElementById("auth-form");
const title = document.getElementById("form-title");
const subtitle = document.getElementById("form-subtitle");
const nameGroup = document.getElementById("name-group");
const nameInput = document.getElementById("name");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const message = document.getElementById("auth-message");
const submitBtn = document.getElementById("submit-btn");
const switchText = document.getElementById("switch-text");
const switchBtn = document.getElementById("switch-btn");

let isRegistering = false;

function showMessage(text) {
  message.textContent = text;
}

function updateForm() {
  title.textContent = isRegistering ? "Criar conta" : "Entrar";
  subtitle.textContent = isRegistering
    ? "Crie sua conta para começar."
    : "Entre para acessar seus treinos.";

  nameGroup.hidden = !isRegistering;
  nameInput.required = isRegistering;

  submitBtn.textContent = isRegistering
    ? "Criar conta"
    : "Entrar";

  switchText.textContent = isRegistering
    ? "Já tem uma conta?"
    : "Ainda não tem uma conta?";

  switchBtn.textContent = isRegistering
    ? "Entrar"
    : "Cadastre-se";

  showMessage("");
}

switchBtn.addEventListener("click", () => {
  isRegistering = !isRegistering;
  updateForm();
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const email = emailInput.value.trim();
  const password = passwordInput.value;

  submitBtn.disabled = true;
  showMessage("Aguarde...");

  try {
    if (isRegistering) {
      await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );

      await signOut(auth);

      showMessage(
        "Conta criada! Aguarde a liberação do treinador."
      );

      return;
    }

    const credential = await signInWithEmailAndPassword(
      auth,
      email,
      password
    );

    const profileRef = doc(
      db,
      "users",
      credential.user.uid
    );

    const profileSnap = await getDoc(profileRef);

    if (!profileSnap.exists()) {
      await signOut(auth);
      showMessage(
        "Sua conta ainda não foi liberada."
      );
      return;
    }

    const profile = profileSnap.data();

    if (profile.active !== true) {
      await signOut(auth);
      showMessage("Sua conta está desativada.");
      return;
    }

    if (profile.role === "trainer") {
  window.location.replace("treinador.html");
    } else if (profile.role === "student") {
      showMessage("Login realizado! Bem-vindo, aluno.");
    } else {
      await signOut(auth);
      showMessage("Perfil não autorizado.");
    }
  } catch (error) {
    console.error(error);

    if (
      error.code === "auth/invalid-credential" ||
      error.code === "auth/wrong-password" ||
      error.code === "auth/user-not-found"
    ) {
      showMessage("E-mail ou senha incorretos.");
    } else if (error.code === "auth/email-already-in-use") {
      showMessage("Este e-mail já está cadastrado.");
    } else if (error.code === "auth/weak-password") {
      showMessage("Use uma senha com pelo menos 6 caracteres.");
    } else if (error.code === "auth/invalid-email") {
      showMessage("Digite um e-mail válido.");
    } else {
      showMessage(
        "Não foi possível concluir. Tente novamente."
      );
    }
  } finally {
    submitBtn.disabled = false;
  }
});

updateForm();
