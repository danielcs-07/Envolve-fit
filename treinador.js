alert("O JavaScript do painel carregou!");

import { auth, db } from "./firebase-config.js";

import {
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/12.4.0/firebase-auth.js";

import {
  doc,
  getDoc
} from "https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js";

const loading = document.getElementById("dashboard-loading");
const app = document.getElementById("dashboard-app");
const logoutBtn = document.getElementById("logout-btn");

const navButtons = document.querySelectorAll(".nav-item");
const sections = document.querySelectorAll(".dashboard-section");
const pageTitle = document.getElementById("page-title");

const titles = {
  inicio: "Visão geral",
  alunos: "Meus alunos",
  treinos: "Treinos",
  evolucao: "Evolução",
  historico: "Histórico",
  perfil: "Meu perfil"
};

const workouts = {
  segunda: {
    title: "Segunda-feira — Quadríceps",
    exercises: [
      ["Cadeira extensora", "4 séries de 12"],
      ["Agachamento Smith", "4 séries de 12"],
      ["Leg press 45°", "4 séries de 12"],
      ["Agachamento hack", "3 séries de 12"],
      ["Cadeira adutora", "4 séries de 12"],
      ["Panturrilha", "4 séries de 12"],
      ["Abdômen máquina ou com peso", "3 séries de 12"]
    ]
  },

  terca: {
    title: "Terça-feira — Costas e bíceps",
    exercises: [
      ["Puxada frente", "4 séries de 12"],
      ["Puxada frente com triângulo", "4 séries de 12"],
      ["Remada baixa pulley com triângulo", "4 séries de 12"],
      ["Remada pronada na máquina", "3 séries de 12"],
      ["Rosca direta com halteres ou pulley", "4 séries de 12"],
      ["Rosca martelo com halteres", "4 séries de 12"],
      ["Rosca Scott ou concentrada", "4 séries de 12"]
    ]
  },

  quarta: {
    title: "Quarta-feira — Posterior e glúteos",
    exercises: [
      ["Agachamento Smith", "4 séries de 12"],
      ["Flexora deitada ou sentada", "4 séries de 12"],
      ["Flexora unilateral", "4 séries de 12"],
      ["Stiff ou agachamento sumô", "3 séries de 12"],
      ["Elevação pélvica", "4 séries de 12"],
      ["Cadeira abdutora", "4 séries de 12"],
      ["Panturrilha", "3 séries de 12"]
    ]
  },

  quinta: {
    title: "Quinta-feira — Peito e tríceps",
    exercises: [
      ["Supino inclinado", "4 séries de 12"],
      ["Supino reto", "4 séries de 12"],
      ["Supino declinado", "4 séries de 12"],
      ["Fly máquina", "3 séries de 12"],
      ["Tríceps pulley", "4 séries de 12"],
      ["Tríceps testa", "4 séries de 12"],
      ["Tríceps francês", "4 séries de 12"]
    ]
  },

  sexta: {
    title: "Sexta-feira — Ombros e antebraço",
    exercises: [
      ["Desenvolvimento com halteres", "4 séries de 12"],
      ["Elevação lateral", "4 séries de 12"],
      ["Elevação frontal", "4 séries de 12"],
      ["Elevação de ombros com halteres", "3 séries de 12"],
      ["Rosca inversa com barra", "4 séries de 12"],
      ["Rosca de punho com barra", "4 séries de 12"]
    ]
  }
};

function showSection(sectionName) {
  navButtons.forEach(button => {
    button.classList.toggle(
      "active",
      button.dataset.section === sectionName
    );
  });

  sections.forEach(section => {
    section.classList.toggle(
      "active",
      section.id === `section-${sectionName}`
    );
  });

  pageTitle.textContent = titles[sectionName] || "Painel";

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });
}

navButtons.forEach(button => {
  button.addEventListener("click", () => {
    showSection(button.dataset.section);
  });
});

const workoutButtons = document.querySelectorAll(".workout-open");
const workoutDetails = document.getElementById("workout-details");
const workoutTitle = document.getElementById("workout-details-title");
const workoutExercises = document.getElementById("workout-exercises");
const closeWorkout = document.getElementById("close-workout");

workoutButtons.forEach(button => {
  button.addEventListener("click", () => {
    const day = button.dataset.day;
    const workout = workouts[day];

    if (!workout) return;

    workoutTitle.textContent = workout.title;
    workoutExercises.replaceChildren();

    workout.exercises.forEach(([name, sets]) => {
      const row = document.createElement("div");
      row.className = "exercise-row";

      const exerciseName = document.createElement("strong");
      exerciseName.textContent = name;

      const exerciseSets = document.createElement("span");
      exerciseSets.textContent = sets;

      row.append(exerciseName, exerciseSets);
      workoutExercises.appendChild(row);
    });

    workoutDetails.hidden = false;

    workoutDetails.scrollIntoView({
      behavior: "smooth",
      block: "start"
    });
  });
});

closeWorkout.addEventListener("click", () => {
  workoutDetails.hidden = true;
});

function displayTrainer(profile, email) {
  const name = profile.name || "Treinador";
  const firstName = name.trim().split(/\s+/)[0];

  document.getElementById("trainer-name").textContent = firstName;
  document.getElementById("profile-name").textContent = name;
  document.getElementById("profile-email").textContent = email || "";
  document.getElementById("trainer-avatar").textContent =
    firstName.charAt(0).toUpperCase();

  loading.hidden = true;
  app.hidden = false;

  showSection("inicio");
}

function showAccessError(text) {
  loading.replaceChildren();

  const title = document.createElement("h2");
  title.textContent = "Evolve Fit";

  const message = document.createElement("p");
  message.textContent = text;

  const link = document.createElement("a");
  link.href = "index.html";
  link.textContent = "Voltar para o login";

  loading.append(title, message, link);
  loading.hidden = false;
  app.hidden = true;
}

onAuthStateChanged(auth, async user => {
  if (!user) {
    window.location.replace("index.html");
    return;
  }

  try {
    const profileSnap = await getDoc(
      doc(db, "users", user.uid)
    );

    if (!profileSnap.exists()) {
      showAccessError("Seu perfil não foi autorizado.");
      return;
    }

    const profile = profileSnap.data();

    if (profile.role !== "trainer" || profile.active !== true) {
      showAccessError("Esta área é exclusiva para treinadores.");
      return;
    }

    displayTrainer(profile, user.email);
  } catch (error) {
    console.error(error);
    showAccessError("Não foi possível verificar seu acesso.");
  }
});

logoutBtn.addEventListener("click", async () => {
  logoutBtn.disabled = true;

  try {
    await signOut(auth);
    window.location.replace("index.html");
  } catch (error) {
    console.error(error);
    alert("Não foi possível sair. Tente novamente.");
    logoutBtn.disabled = false;
  }
});
       
