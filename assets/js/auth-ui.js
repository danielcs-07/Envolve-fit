
import { auth, db } from "./firebase-config.js";
import { generateCoachCode, normalizeCoachCode, validCoachCode } from "./coach-codes.mjs";

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
  writeBatch,
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
const roleGroup = document.getElementById("role-group");
const coachCodeGroup = document.getElementById("trainer-code-group");
const coachCodeInput = document.getElementById("trainer-code");
const coachHint = document.getElementById("trainer-register-hint");
const roleInputs = [...document.querySelectorAll('input[name="account-role"]')];

let isRegistering = false;
let isBusy = false;

// O link é apenas uma conveniência; também é possível digitar o código.
const urlCode = normalizeCoachCode(new URLSearchParams(location.search).get("trainer"));
if (validCoachCode(urlCode)) {
  const student = roleInputs.find(input => input.value === "student");
  if (student) student.checked = true;
  coachCodeInput.value = urlCode;
}
const selectedRole = () => roleInputs.find(input => input.checked)?.value || "student";

function showMessage(text, type = "") {
  message.textContent = text;
  message.className = "auth-message";

  if (type) {
    message.classList.add(type);
  }
}

function updateForm() {
  const trainer = selectedRole() === "trainer";
  formTitle.textContent = isRegistering ? (trainer ? "Crie sua conta de treinador" : "Crie sua conta") : "Bem-vindo de volta!";
  formSubtitle.textContent = isRegistering
    ? (trainer
      ? "Abra seu espaço e receba um código exclusivo para vincular seus alunos."
      : "Informe o código do seu treinador para criar sua conta.")
    : "Entre na sua conta para continuar evoluindo.";
  nameGroup.hidden = !isRegistering;
  nameInput.required = isRegistering;
  roleGroup.hidden = !isRegistering;
  coachCodeGroup.hidden = !isRegistering || trainer;
  coachHint.hidden = !isRegistering || !trainer;
  coachCodeInput.required = isRegistering && !trainer;
  passwordInput.autocomplete = isRegistering ? "new-password" : "current-password";
  submitButton.textContent = isRegistering
    ? (trainer ? "Criar conta de treinador" : "Criar conta de aluno")
    : "Entrar na minha conta";
  switchText.textContent = isRegistering ? "Já possui uma conta?" : "Ainda não tem uma conta?";
  switchButton.textContent = isRegistering ? "Fazer login" : "Criar conta";
  showMessage("");
}
roleInputs.forEach(input => input.addEventListener("change", updateForm));

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
  if (isBusy) return;

  isRegistering = !isRegistering;
  updateForm();
});

async function registerStudent(email, password) {
  const name = nameInput.value.trim();
  if (name.length < 2 || name.length > 100) throw new Error("Digite seu nome completo.");
  const code = normalizeCoachCode(coachCodeInput.value);
  if (!validCoachCode(code)) throw new Error("Informe um código válido fornecido pelo treinador.");
  // Um código inválido é identificado ANTES da criação do usuário no Firebase Auth.
  const coachSnap = await getDoc(doc(db, "trainerCodes", code));
  if (!coachSnap.exists() || typeof coachSnap.data().trainerId !== "string") {
    throw new Error("Código de treinador não encontrado. Confira e tente novamente.");
  }
  const credential = await createUserWithEmailAndPassword(auth, email, password);
  try {
    await setDoc(doc(db, "users", credential.user.uid), {
      name, email: credential.user.email,
      role: "student", active: false,
      trainerId: coachSnap.data().trainerId, trainerCode: code,
      createdAt: serverTimestamp()
    });
    await signOut(auth);
    form.reset(); isRegistering = false; updateForm();
    showMessage("Conta criada! Aguarde a aprovação do seu treinador.", "success");
  } catch (error) {
    await signOut(auth).catch(() => {});
    console.error("Erro ao registrar aluno:", error);
    throw new Error("A conta de autenticação foi criada, mas o perfil não foi concluído. Procure o suporte antes de tentar criar outra.");
  }
}

async function registerTrainer(email, password) {
  const name = nameInput.value.trim();
  if (name.length < 2 || name.length > 100) throw new Error("Digite seu nome completo.");
  // Impede criar contas órfãs enquanto o Firebase ainda usa as regras antigas.
  try {
    await getDoc(doc(db, "trainerCodes", "signup-rules-check"));
  } catch (error) {
    if (error.code === "permission-denied") {
      throw new Error("Cadastro de treinadores ainda não ativado. É necessário publicar as novas regras do Firebase.");
    }
    throw error;
  }
  const credential = await createUserWithEmailAndPassword(auth, email, password);
  try {
    let savedCode = "";
    // O ID da coleção trainerCodes garante unicidade. Uma colisão extremamente rara
    // ou concorrência rejeita o lote, sem sobrescrever um código de outro treinador.
    for (let attempt = 0; attempt < 4; attempt++) {
      const code = generateCoachCode(crypto.getRandomValues(new Uint8Array(12)));
      const batch = writeBatch(db);
      batch.set(doc(db, "users", credential.user.uid), {
        name, email: credential.user.email, role: "trainer",
        active: true, coachCode: code, createdAt: serverTimestamp()
      });
      batch.set(doc(db, "trainerCodes", code), {
        trainerId: credential.user.uid, createdAt: serverTimestamp()
      });
      try {
        await batch.commit();
        savedCode = code;
        break;
      } catch (error) {
        if (error.code !== "permission-denied" && error.code !== "already-exists")
          throw error;
        if (attempt === 3) throw error;
      }
    }
    await signOut(auth);
    form.reset(); isRegistering = false; updateForm();
    showMessage("Conta de treinador criada! Seu código exclusivo é " + savedCode +
      ". Entre com seu e-mail e senha para acessar o painel e copiá-lo.", "success");
  } catch (error) {
    await signOut(auth).catch(() => {});
    console.error("Erro ao registrar treinador:", error);
    throw new Error("A autenticação foi criada, mas não foi possível reservar o código. Não crie outra conta: entre em contato com o suporte para concluir o perfil.");
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
      "Seu cadastro está aguardando aprovação do treinador. 💙",
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
      if (selectedRole() === "trainer") await registerTrainer(email, password);
      else await registerStudent(email, password);
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
