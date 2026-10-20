
import { auth, db } from "./firebase-config.js";

import {
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/12.4.0/firebase-auth.js";

import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js";

const $ = id => document.getElementById(id);

let currentUser = null;
let students = [];
let workouts = [];
let logs = [];
let measurements = [];
let busy = false;

const tabTitles = {
  dashboard: "Visão geral",
  create: "Criar treino",
  workouts: "Meus treinos",
  students: "Meus alunos",
  history: "Histórico",
  progress: "Evolução",
  profile: "Meu perfil"
};

function showTab(name) {
  document.querySelectorAll(".tab").forEach(section => {
    section.classList.toggle("active", section.id === `tab-${name}`);
  });

  document.querySelectorAll(".nav-item").forEach(button => {
    button.classList.toggle("active", button.dataset.tab === name);
  });

  $("page-title").textContent = tabTitles[name] || "Evolve Fit";
  window.scrollTo(0, 0);
}

document.querySelectorAll(".nav-item").forEach(button => {
  button.addEventListener("click", () => showTab(button.dataset.tab));
});

$("quick-create").onclick = () => showTab("create");
$("new-workout").onclick = () => {
  clearForm();
  showTab("create");
};

function element(tag, className = "", content = "") {
  const node = document.createElement(tag);
  if (className) node.className = className;
  node.textContent = content;
  return node;
}

function inputField(labelText, type, value, placeholder = "") {
  const wrapper = element("label", "form-field");
  const label = element("span", "", labelText);
  const input = document.createElement(
    type === "textarea" ? "textarea" : "input"
  );

  if (type !== "textarea") input.type = type;
  input.value = value;
  input.placeholder = placeholder;
  wrapper.append(label, input);

  return { wrapper, input };
}

function addExercise(data = {}) {
  const card = element("article", "exercise-editor");
  const header = element("div", "exercise-editor-header");
  const title = element("h4", "", "🏋️ Exercício");
  const remove = element("button", "danger-outline", "Remover");
  remove.type = "button";
  remove.onclick = () => {
    card.remove();
    renumberExercises();
  };

  header.append(title, remove);
  card.append(header);

  const grid = element("div", "form-grid");

  const name = inputField(
    "Nome do exercício *",
    "text",
    data.name || "",
    "Ex.: Supino reto"
  );
  name.input.required = true;
  name.input.maxLength = 120;
  name.input.dataset.field = "name";

  const sets = inputField(
    "Quantidade de séries",
    "number",
    data.sets || 4
  );
  sets.input.min = 1;
  sets.input.max = 20;
  sets.input.required = true;
  sets.input.dataset.field = "sets";

  const reps = inputField(
    "Repetições",
    "text",
    data.reps || "12, 10, 8, 6",
    "Ex.: 12, 10, 8, 6"
  );
  reps.input.required = true;
  reps.input.maxLength = 80;
  reps.input.dataset.field = "reps";

  const rest = inputField(
    "Descanso (segundos)",
    "number",
    data.rest ?? 60
  );
  rest.input.min = 0;
  rest.input.max = 3600;
  rest.input.dataset.field = "rest";

  const video = inputField(
    "Link do vídeo no YouTube",
    "url",
    data.video || "",
    "https://www.youtube.com/watch?v=..."
  );
  video.input.dataset.field = "video";

  const notes = inputField(
    "Orientações do exercício",
    "textarea",
    data.notes || "",
    "Postura, execução e cuidados"
  );
  notes.input.maxLength = 1500;
  notes.input.dataset.field = "notes";

  [name, sets, reps, rest, video, notes].forEach(field => {
    grid.append(field.wrapper);
  });

  card.append(grid);
  $("exercise-list").append(card);
  renumberExercises();
}

function renumberExercises() {
  document.querySelectorAll(".exercise-editor").forEach((card, index) => {
    card.querySelector("h4").textContent =
      `🏋️ Exercício ${index + 1}`;
  });
}

$("add-exercise").onclick = () => addExercise();

function clearForm() {
  $("workout-form").reset();
  $("editing-id").value = "";
  $("exercise-list").replaceChildren();
  $("form-message").textContent = "";
  addExercise();
}

$("clear-form").onclick = clearForm;

function getExerciseData() {
  return [...document.querySelectorAll(".exercise-editor")].map(card => {
    const value = field =>
      card.querySelector(`[data-field="${field}"]`).value.trim();

    return {
      name: value("name"),
      sets: Number(value("sets")),
      reps: value("reps"),
      rest: Number(value("rest")),
      video: value("video"),
      notes: value("notes")
    };
  });
}

function youtubeId(url) {
  if (!url) return "";

  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase().replace(/^www\./, "");

    if (host === "youtu.be") {
      return parsed.pathname.slice(1).split("/")[0];
    }

    if (["youtube.com", "m.youtube.com"].includes(host)) {
      if (parsed.pathname === "/watch") {
        return parsed.searchParams.get("v") || "";
      }

      const match = parsed.pathname.match(/^\/(shorts|embed)\/([^/]+)/);
      return match ? match[2] : "";
    }
  } catch {
    return "";
  }

  return "";
}

function validVideo(url) {
  if (!url) return true;
  return /^[A-Za-z0-9_-]{11}$/.test(youtubeId(url));
}

async function saveWorkout(status) {
  if (busy) return;

  const name = $("workout-name").value.trim();
  const studentId = $("workout-student").value;
  const exercises = getExerciseData();

  if (!name) {
    $("form-message").textContent = "Informe o nome do treino.";
    return;
  }

  if (!exercises.length) {
    $("form-message").textContent = "Adicione pelo menos um exercício.";
    return;
  }

  if (exercises.some(ex =>
    !ex.name || ex.sets < 1 || ex.sets > 20 || !ex.reps ||
    ex.rest < 0 || ex.rest > 3600 || !validVideo(ex.video)
  )) {
    $("form-message").textContent =
      "Confira os exercícios e os links do YouTube.";
    return;
  }

  if (status === "published" && !studentId) {
    $("form-message").textContent =
      "Selecione um aluno antes de publicar.";
    return;
  }

  if (studentId && !students.some(student => student.id === studentId)) {
    $("form-message").textContent = "Aluno não autorizado.";
    return;
  }

  busy = true;
  $("save-draft").disabled = true;
  $("publish").disabled = true;
  $("form-message").textContent = "Salvando treino...";

  try {
    const data = {
      trainerId: currentUser.uid,
      studentId,
      name,
      description: $("workout-description").value.trim(),
      day: $("workout-day").value,
      exercises,
      status,
      updatedAt: serverTimestamp()
    };

    const editingId = $("editing-id").value;

    if (editingId) {
      const previous = workouts.find(item => item.id === editingId);

      if (!previous) {
        throw new Error("Treino não encontrado.");
      }

      await updateDoc(doc(db, "workouts", editingId), data);
    } else {
      await addDoc(collection(db, "workouts"), {
        ...data,
        createdAt: serverTimestamp()
      });
    }

    clearForm();
    await refreshData();
    showTab("workouts");

  } catch (error) {
    console.error(error);
    $("form-message").textContent =
      "Erro ao salvar. Confira as regras do Firestore.";
  } finally {
    busy = false;
    $("save-draft").disabled = false;
    $("publish").disabled = false;
  }
}

$("workout-form").onsubmit = async event => {
  event.preventDefault();
  await saveWorkout("draft");
};

$("publish").onclick = async () => {
  if (!$("workout-form").reportValidity()) return;
  await saveWorkout("published");
};

function editWorkout(workout) {
  clearForm();

  $("editing-id").value = workout.id;
  $("workout-name").value = workout.name;
  $("workout-student").value = workout.studentId || "";
  $("workout-day").value = workout.day || "";
  $("workout-description").value = workout.description || "";

  $("exercise-list").replaceChildren();
  workout.exercises.forEach(addExercise);

  showTab("create");
}

async function removeWorkout(workout) {
  if (!confirm(`Excluir o treino "${workout.name}"?`)) return;

  try {
    await deleteDoc(doc(db, "workouts", workout.id));
    await refreshData();
  } catch (error) {
    console.error(error);
    alert("Não foi possível excluir o treino.");
  }
}

function emptyMessage(text) {
  return element("p", "empty-text", text);
}

function renderWorkouts() {
  const container = $("workout-list");
  container.replaceChildren();

  if (!workouts.length) {
    container.append(emptyMessage("Nenhum treino criado ainda."));
    return;
  }

  workouts.forEach(workout => {
    const card = element("article", "panel-card workout-card");
    const heading = element("div", "card-heading");
    const left = element("div");
    const title = element("h3", "", workout.name);
    const student = students.find(s => s.id === workout.studentId);

    left.append(
      title,
      element("p", "muted",
        student ? `Aluno: ${student.name}` : "Aluno não selecionado"
      )
    );

    const badge = element(
      "span",
      workout.status === "published" ? "status-published" : "status-draft",
      workout.status === "published" ? "Publicado" : "Rascunho"
    );

    heading.append(left, badge);

    const summary = element(
      "p",
      "muted",
      `${workout.exercises.length} exercícios • ${workout.day || "Sem dia definido"}`
    );

    const actions = element("div", "form-actions");
    const edit = element("button", "secondary-btn", "✏️ Editar");
    const remove = element("button", "danger-outline", "🗑️ Excluir");

    edit.onclick = () => editWorkout(workout);
    remove.onclick = () => removeWorkout(workout);

    actions.append(edit, remove);
    card.append(heading, summary, actions);
    container.append(card);
  });
}

function renderStudents() {
  const container = $("student-list");
  const select = $("workout-student");
  const selected = select.value;

  container.replaceChildren();
  select.replaceChildren(new Option("Selecione um aluno", ""));

  students.forEach(student => {
    select.add(new Option(student.name, student.id));

    const card = element("article", "student-row");
    const info = element("div");
    info.append(
      element("strong", "", student.name),
      element("p", "muted", "Aluno ativo")
    );

    const button = element("button", "outline-btn", "Criar treino");
    button.onclick = () => {
      clearForm();
      $("workout-student").value = student.id;
      showTab("create");
    };

    card.append(info, button);
    container.append(card);
  });

  if (students.some(student => student.id === selected)) {
    select.value = selected;
  }

  if (!students.length) {
    container.append(
      emptyMessage("Nenhum aluno autorizado ainda.")
    );
  }
}

function dateLabel(timestamp) {
  if (!timestamp?.toDate) return "Data não disponível";
  return timestamp.toDate().toLocaleString("pt-BR");
}

function renderLogs() {
  const container = $("log-list");
  const recent = $("recent-activity");

  container.replaceChildren();
  recent.replaceChildren();

  if (!logs.length) {
    container.append(emptyMessage("Nenhum treino registrado."));
    recent.append(emptyMessage("Aguardando atividades dos alunos."));
    return;
  }

  logs.forEach((log, index) => {
    const student = students.find(s => s.id === log.studentId);
    const card = element("article", "panel-card");
    card.append(
      element("h3", "", log.workoutName || "Treino"),
      element("p", "muted",
        `${student?.name || "Aluno"} • ${dateLabel(log.createdAt)}`
      )
    );

    (log.exercises || []).forEach(exercise => {
      const block = element("div", "log-exercise");
      block.append(element("strong", "", exercise.name));

      (exercise.series || []).forEach((series, i) => {
        block.append(
          element(
            "p",
            "muted",
            `Série ${i + 1}: ${series.weight} kg • ${series.reps} repetições`
          )
        );
      });

      card.append(block);
    });

    container.append(card);

    if (index < 3) {
      recent.append(
        element(
          "p",
          "activity-item",
          `${student?.name || "Aluno"} concluiu ${log.workoutName || "um treino"}`
        )
      );
    }
  });
}

function drawBars(container, entries, unit) {
  container.replaceChildren();

  if (!entries.length) {
    container.append(emptyMessage("Sem registros suficientes."));
    return;
  }

  const max = Math.max(...entries.map(item => item.value), 1);
  const chart = element("div", "bar-chart");

  entries.slice(-8).forEach(entry => {
    const column = element("div", "bar-column");
    const bar = element("div", "bar");
    bar.style.height = `${Math.max(5, entry.value / max * 140)}px`;

    column.append(
      element("small", "", `${entry.value} ${unit}`),
      bar,
      element("span", "", entry.label)
    );
    chart.append(column);
  });

  container.append(chart);
}

function renderProgress() {
  const weights = [...measurements]
    .filter(item => Number.isFinite(item.weight) && item.weight > 0)
    .sort((a, b) => (a.createdAt?.seconds || 0) - (b.createdAt?.seconds || 0))
    .map(item => ({
      value: item.weight,
      label: item.createdAt?.toDate
        ? item.createdAt.toDate().toLocaleDateString("pt-BR", {
            day: "2-digit", month: "2-digit"
          })
        : "—"
    }));

  drawBars($("trainer-weight-chart"), weights, "kg");

  const strength = [];

  [...logs].reverse().forEach(log => {
    let maxWeight = 0;

    (log.exercises || []).forEach(exercise => {
      (exercise.series || []).forEach(series => {
        maxWeight = Math.max(maxWeight, Number(series.weight) || 0);
      });
    });

    if (maxWeight > 0) {
      strength.push({
        value: maxWeight,
        label: log.createdAt?.toDate
          ? log.createdAt.toDate().toLocaleDateString("pt-BR", {
              day: "2-digit", month: "2-digit"
            })
          : "—"
      });
    }
  });

  drawBars($("trainer-strength-chart"), strength, "kg");

  const container = $("measurement-list");
  container.replaceChildren();

  [...measurements].reverse().forEach(item => {
    const student = students.find(s => s.id === item.studentId);
    const card = element("article", "panel-card");

    card.append(
      element("h3", "", student?.name || "Aluno"),
      element(
        "p",
        "muted",
        `${item.weight} kg • ${item.height || "—"} cm • ${dateLabel(item.createdAt)}`
      )
    );

    container.append(card);
  });
}

function renderDashboard() {
  $("stat-students").textContent = students.length;
  $("stat-workouts").textContent = workouts.length;
  $("stat-published").textContent =
    workouts.filter(w => w.status === "published").length;
  $("stat-logs").textContent = logs.length;

  const overview = $("overview-progress");
  overview.replaceChildren();

  const points = [...logs].reverse().map((log, index) => ({
    label: `${index + 1}`,
    value: (log.exercises || []).reduce((max, ex) =>
      Math.max(max, ...(ex.series || []).map(s => Number(s.weight) || 0)), 0)
  })).filter(point => point.value > 0);

  drawBars(overview, points, "kg");
}

async function refreshData() {
  const [userSnap, workoutSnap, logSnap, measureSnap] = await Promise.all([
    getDocs(collection(db, "users")),
    getDocs(collection(db, "workouts")),
    getDocs(collection(db, "trainingLogs")),
    getDocs(collection(db, "measurements"))
  ]);

  students = userSnap.docs
    .map(snapshot => ({ id: snapshot.id, ...snapshot.data() }))
    .filter(user => user.role === "student" && user.active === true);

  workouts = workoutSnap.docs
    .map(snapshot => ({ id: snapshot.id, ...snapshot.data() }))
    .filter(workout => workout.trainerId === currentUser.uid)
    .sort((a, b) =>
      (b.updatedAt?.seconds || 0) - (a.updatedAt?.seconds || 0)
    );

  logs = logSnap.docs
    .map(snapshot => ({ id: snapshot.id, ...snapshot.data() }))
    .filter(log => students.some(student => student.id === log.studentId))
    .sort((a, b) =>
      (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)
    );

  measurements = measureSnap.docs
    .map(snapshot => ({ id: snapshot.id, ...snapshot.data() }))
    .filter(item => students.some(student => student.id === item.studentId));

  renderStudents();
  renderWorkouts();
  renderLogs();
  renderProgress();
  renderDashboard();
}

function accessError(message) {
  $("app").hidden = true;
  $("loading").replaceChildren();

  $("loading").append(
    element("h2", "", "💪 Evolve Fit"),
    element("p", "", message)
  );

  const link = element("a", "primary-btn", "Voltar ao login");
  link.href = "index.html";
  $("loading").append(link);
}

onAuthStateChanged(auth, async user => {
  if (!user) {
    location.replace("index.html");
    return;
  }

  try {
    const profileSnap = await getDoc(doc(db, "users", user.uid));

    if (
      !profileSnap.exists() ||
      profileSnap.data().role !== "trainer" ||
      profileSnap.data().active !== true
    ) {
      accessError("Esta área é exclusiva para treinadores.");
      return;
    }

    currentUser = user;
    const profile = profileSnap.data();
    const name = profile.name || "Treinador";

    $("welcome-name").textContent = name.split(" ")[0];
    $("profile-name").textContent = name;
    $("profile-email").textContent = user.email || "";
    $("avatar").textContent = name.charAt(0).toUpperCase();

    $("loading").hidden = true;
    $("app").hidden = false;

    clearForm();

    try {
      await refreshData();
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
      alert("Painel aberto, mas alguns dados não puderam ser carregados. Confira as regras do Firestore.");
    }

  } catch (error) {
    console.error(error);
    accessError("Não foi possível verificar sua conta.");
  }
});

$("logout").onclick = async () => {
  await signOut(auth);
  location.replace("index.html");
};
