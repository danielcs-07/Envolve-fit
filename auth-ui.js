
import { auth, db } from "./firebase-config.js";
import { trainerFromInvite, isTrainerSignup } from "./beta-access.mjs";

import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail
} from "https://www.gstatic.com/firebasejs/12.4.0/firebase-auth.js";

import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp
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

const requestedTrainerId = trainerFromInvite(location.search);
const trainerRegistration = isTrainerSignup(location.search);
const canRegister = Boolean(requestedTrainerId || trainerRegistration);
let isRegistering = canRegister;
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
    ? (trainerRegistration
      ? "Cadastro beta de treinador: sua conta será liberada manualmente pelo administrador."
      : requestedTrainerId
        ? "Cadastro por convite: aguarde a aprovação do seu personal."
        : "Peça ao treinador um link de convite.")
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

  switchButton.hidden = !canRegister;
  showMessage("");
}

function redirectToDashboard(role) {
  const destination = role === "trainer"
    ? "treinador.html"
    : "aluno.html";

  window.location.replace(destination);
}

async function getProfile(user) {
  const snapshot = await getDoc(
    doc(db, "users", user.uid)
  );

  if (!snapshot.exists()) {
    return null;
  }

  return snapshot.data();
}

switchButton.addEventListener("click", () => {
  if (isBusy || !canRegister) return;

  isRegistering = !isRegistering;
  updateForm();
});

async function registerAccount(email, password) {
  if (!canRegister) throw new Error("Solicite um link de convite ao seu treinador.");
  const role = trainerRegistration ? "trainer" : "student";
  const name = nameInput.value.trim();

  if (name.length < 2 || name.length > 100) {
    throw new Error("Digite seu nome completo.");
  }

  const credential = await createUserWithEmailAndPassword(
    auth,
    email,
    password
  );

  try {
    await setDoc(doc(db, "users", credential.user.uid), {
      name,
      email: credential.user.email,
      role,
      active: false,
      ...(role === "student" ? { trainerId: requestedTrainerId } : {}),
      createdAt: serverTimestamp()
    });

    await signOut(auth);

    form.reset();
    isRegistering = false;
    updateForm();

    showMessage(
      role === "trainer"
        ? "Solicitação beta recebida! Aguarde a liberação do administrador."
        : "Conta criada! Aguarde a aprovação do seu personal.",
      "success"
    );

  } catch (error) {
    await signOut(auth).catch(() => {});

    console.error("Erro ao salvar perfil:", error);

    throw new Error(
      "A conta foi criada, mas não foi possível finalizar seu perfil. Entre em contato com o treinador."
    );
  }
}

async function login(email, password) {
  const credential = await signInWithEmailAndPassword(
    auth,
    email,
    password
  );

  const profile = await getProfile(credential.user);

  if (!profile) {
    await signOut(auth);

    showMessage(
      "Seu perfil ainda não foi configurado. Entre em contato com o treinador.",
      "error"
    );
    return;
  }

  if (profile.active !== true) {
    await signOut(auth);

    showMessage(
      profile.role === "trainer"
        ? "Seu acesso beta está aguardando liberação pelo administrador."
        : "Seu cadastro está aguardando aprovação do treinador. 💙",
      "error"
    );
    return;
  }

  if (!["trainer", "student"].includes(profile.role)) {
    await signOut(auth);

    showMessage(
      "Sua conta não tem um perfil válido.",
      "error"
    );
    return;
  }

  redirectToDashboard(profile.role);
}

form.addEventListener("submit", async event => {
  event.preventDefault();

  if (isBusy) return;

  isBusy = true;
  submitButton.disabled = true;

  showMessage(
    isRegistering
      ? "Criando sua conta..."
      : "Verificando seus dados..."
  );

  try {
    const email = emailInput.value.trim();
    const password = passwordInput.value;

    if (isRegistering) {
      await registerAccount(email, password);
    } else {
      await login(email, password);
    }

  } catch (error) {
    console.error("Erro de autenticação:", error);

    const errors = {
      "auth/invalid-email": "Digite um e-mail válido.",
      "auth/invalid-credential": "E-mail ou senha incorretos.",
      "auth/email-already-in-use": "Este e-mail já está cadastrado.",
      "auth/weak-password": "A senha deve ter pelo menos 6 caracteres.",
      "auth/too-many-requests": "Muitas tentativas. Tente novamente mais tarde.",
      "auth/network-request-failed": "Verifique sua conexão com a internet.",
      "permission-denied": "O Firebase não permitiu concluir o cadastro."
    };

    showMessage(
      errors[error.code] ||
      error.message ||
      "Não foi possível concluir a operação.",
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
    const profile = await getProfile(user);

    if (
      profile?.active === true &&
      ["trainer", "student"].includes(profile.role)
    ) {
      redirectToDashboard(profile.role);
    }

  } catch (error) {
    console.error("Erro ao verificar sessão:", error);
  }
});


document.getElementById("forgot-password").addEventListener("click", async () => {
  if (isBusy) return;
  const email = emailInput.value.trim();
  if (!email || !emailInput.checkValidity()) {
    showMessage("Digite seu e-mail no campo acima para receber o link de redefinição.", "error");
    emailInput.focus();
    return;
  }
  const button = document.getElementById("forgot-password");
  button.disabled = true;
  showMessage("Solicitando link de redefinição...");
  try {
    await sendPasswordResetEmail(auth, email);
    showMessage("Se houver uma conta com esse e-mail, você receberá um link para redefinir a senha.", "success");
  } catch (error) {
    console.error(error);
    showMessage(error.code === "auth/too-many-requests"
      ? "Muitas tentativas. Aguarde alguns minutos antes de tentar novamente."
      : "Não foi possível enviar o link. Confira seu e-mail e tente novamente.", "error");
  } finally {
    button.disabled = false;
  }
});

updateForm();
