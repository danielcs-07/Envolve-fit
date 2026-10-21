
import { auth, db } from "./firebase-config.js";

import {
  onAuthStateChanged,
  signOut,
  sendPasswordResetEmail
} from "https://www.gstatic.com/firebasejs/12.4.0/firebase-auth.js";

import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  writeBatch
} from "https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js";

import {
  WEEK_DAYS, normalizeDay, timestampDate, recentLogs, compareWorkoutDays,
  numberOfSeries, trainingVolume, uniqueExercises, bestSetProgress
} from "./fitness-utils.mjs?v=20261020-order";

import { WEEKLY_DRAFTS, WEEKLY_DRAFT_VERSION } from "./treino-semanal.mjs";

import { FIVE_DAY_PLAN, FIVE_DAY_PLAN_ID } from "./treino-cinco-dias.mjs";

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
  card.dataset.videoAlternative = validVideo(data.videoAlternative) ? (data.videoAlternative || "") : "";
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
      notes: value("notes"),
      ...(card.dataset.videoAlternative ? { videoAlternative: card.dataset.videoAlternative } : {})
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

  const search = $("trainer-workout-search").value.trim().toLocaleLowerCase("pt-BR");
  const status = $("trainer-workout-status").value;
  const studentId = $("trainer-workout-student").value;
  const items = workouts.filter(workout => {
    const haystack = [workout.name, workout.description,
      ...(workout.exercises || []).map(ex => ex.name)].join(" ").toLocaleLowerCase("pt-BR");
    return (!search || haystack.includes(search)) &&
      (!status || workout.status === status) &&
      (!studentId || workout.studentId === studentId);
  });

  if (!items.length) {
    container.append(emptyMessage(workouts.length
      ? "Nenhuma ficha corresponde aos filtros."
      : "Nenhum treino criado ainda."));
    return;
  }

  const dayName = day => WEEK_DAYS.find(d => d.key === normalizeDay(day))?.label || "Dia livre";
  items.forEach(workout => {
    const card = element("article", "panel-card workout-card");
    const heading = element("div", "card-heading");
    const left = element("div");
    const title = element("h3", "", workout.name);
    const student = students.find(item => item.id === workout.studentId);

    left.append(title, element("p", "muted",
      student ? `Aluno: ${student.name}` : "Aluno não selecionado"));

    const badge = element("span", workout.status === "published"
      ? "status-published" : "status-draft", workout.status === "published" ? "Publicado" : "Rascunho");
    heading.append(left, badge);

    const summary = element("p", "muted",
      `${(workout.exercises || []).length} exercícios · ${numberOfSeries(workout)} séries · ${dayName(workout.day)}`);

    const actions = element("div", "form-actions");
    const edit = element("button", "secondary-btn", "✏️ Editar");
    const duplicate = element("button", "outline-btn", "⧉ Duplicar");
    const remove = element("button", "danger-outline", "🗑️ Excluir");

    edit.type = "button";
    duplicate.type = "button";
    remove.type = "button";
    edit.onclick = () => editWorkout(workout);
    duplicate.onclick = () => {
      editWorkout(workout);
      $("editing-id").value = "";
      $("workout-name").value = `${workout.name} (cópia)`;
      $("form-message").textContent = "Cópia pronta para editar. Salve como rascunho ou publique para o aluno.";
    };
    remove.onclick = () => removeWorkout(workout);

    actions.append(edit, duplicate, remove);
    card.append(heading, summary, actions);
    container.append(card);
  });
}
$("trainer-workout-search").addEventListener("input", renderWorkouts);
$("trainer-workout-status").addEventListener("change", renderWorkouts);
$("trainer-workout-student").addEventListener("change", renderWorkouts);

function renderStudents() {
  const container = $("student-list");
  const select = $("workout-student");
  const selected = select.value;
  const search = $("trainer-student-search").value.trim().toLocaleLowerCase("pt-BR");

  const selectConfigs = [
    [select, "Selecione um aluno", true],
    [$("trainer-workout-student"), "Todos os alunos", false],
    [$("trainer-history-student"), "Todos os alunos", false],
    [$("trainer-progress-student"), "Selecione um aluno", false]
  ];
  selectConfigs.forEach(([node, placeholder, defaultFirst]) => {
    const previous = node.value;
    node.replaceChildren(new Option(placeholder, ""));
    students.forEach(student => node.add(new Option(student.name, student.id)));
    if (students.some(student => student.id === previous)) {
      node.value = previous;
    } else if (!defaultFirst && node.id === "trainer-progress-student" && students.length) {
      node.value = students[0].id;
    }
  });

  if (students.some(student => student.id === selected)) select.value = selected;

  container.replaceChildren();
  const items = students.filter(student =>
    [student.name, student.email].join(" ").toLocaleLowerCase("pt-BR").includes(search));

  $("trainer-student-count").textContent =
    `${items.length} de ${students.length} aluno${students.length === 1 ? "" : "s"}`;

  items.forEach(student => {
    const card = element("article", "student-row");
    const info = element("div");
    info.append(
      element("strong", "", student.name || "Aluno"),
      element("p", "muted", student.email || "Conta ativa")
    );

    const button = element("button", "outline-btn", "Criar treino");
    button.type = "button";
    button.onclick = () => {
      clearForm();
      $("workout-student").value = student.id;
      showTab("create");
    };
    const history = element("button", "secondary-btn", "Histórico");
    history.type = "button";
    history.onclick = () => {
      $("trainer-history-student").value = student.id;
      renderLogs();
      showTab("history");
    };
    const viewWorkouts = element("button", "outline-btn", "Ver treinos");
    viewWorkouts.type = "button";
    viewWorkouts.onclick = () => {
      $("trainer-workout-search").value = "";
      $("trainer-workout-status").value = "";
      $("trainer-workout-student").value = student.id;
      renderWorkouts();
      showTab("workouts");
    };
    const actions = element("div", "form-actions compact-actions");
    actions.append(button, viewWorkouts, history);
    card.append(info, actions);
    container.append(card);
  });

  if (!items.length) {
    container.append(emptyMessage(students.length
      ? "Nenhum aluno encontrado."
      : "Nenhum aluno autorizado ainda."));
  }
}

$("trainer-student-search").addEventListener("input", renderStudents);

function dateLabel(timestamp) {
  if (!timestamp?.toDate) return "Data não disponível";
  return timestamp.toDate().toLocaleString("pt-BR");
}

function renderLogs() {
  const container = $("log-list");
  const recent = $("recent-activity");
  container.replaceChildren();
  recent.replaceChildren();

  const studentId = $("trainer-history-student").value;
  const search = $("trainer-history-search").value.trim().toLocaleLowerCase("pt-BR");
  const items = logs.filter(log =>
    (!studentId || log.studentId === studentId)
      && (!search || String(log.workoutName || "").toLocaleLowerCase("pt-BR").includes(search)));

  if (!items.length) {
    container.append(emptyMessage(logs.length
      ? "Nenhum treino encontrado com esses filtros."
      : "Nenhum treino registrado."));
  }

  items.forEach(log => {
    const student = students.find(s => s.id === log.studentId);
    const card = element("article", "panel-card history-card");
    const heading = element("div", "card-heading");
    const content = element("div");
    content.append(
      element("h3", "", log.workoutName || "Treino"),
      element("p", "muted", `${student?.name || "Aluno"} · ${dateLabel(log.createdAt)}`)
    );
    const volume = element("span", "volume-pill",
      `${trainingVolume(log).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} kg de volume`);
    heading.append(content, volume);
    card.append(heading);

    (log.exercises || []).forEach(exercise => {
      const block = element("div", "log-exercise");
      block.append(element("strong", "", exercise.name));
      (exercise.series || []).forEach((series, i) => {
        block.append(element("p", "muted",
          `Série ${i + 1}: ${series.weight} kg · ${series.reps} repetições`));
      });
      card.append(block);
    });
    container.append(card);
  });

  if (!logs.length) {
    recent.append(emptyMessage("Aguardando atividades dos alunos."));
  } else {
    logs.slice(0, 4).forEach(log => {
      const student = students.find(s => s.id === log.studentId);
      recent.append(element("p", "activity-item",
        `${student?.name || "Aluno"} · ${log.workoutName || "Treino"} · ${dateLabel(log.createdAt)}`));
    });
  }
}
$("trainer-history-student").addEventListener("change", renderLogs);
$("trainer-history-search").addEventListener("input", renderLogs);

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
  const studentId = $("trainer-progress-student").value;
  const student = students.find(s => s.id === studentId);
  const selectedLogs = logs.filter(log => log.studentId === studentId);
  const selectedMeasurements = measurements
    .filter(item => item.studentId === studentId)
    .sort((a,b) => (timestampDate(a.createdAt)?.getTime() || 0)
      - (timestampDate(b.createdAt)?.getTime() || 0));

  const select = $("trainer-progress-exercise");
  const previous = select.value;
  const names = uniqueExercises(selectedLogs);
  select.replaceChildren(new Option("Selecione um exercício", ""));
  names.forEach(name => select.add(new Option(name, name)));
  if (names.includes(previous)) select.value = previous;
  else if (names.length) select.value = names[0];

  const weightPoints = selectedMeasurements.map(item => {
    const date = timestampDate(item.createdAt);
    return {
      value: Number(item.weight) || 0,
      label: date ? date.toLocaleDateString("pt-BR", {
        day: "2-digit", month: "2-digit"
      }) : "—"
    };
  }).filter(item => item.value > 0);

  drawBars($("trainer-weight-chart"), weightPoints, "kg");
  drawBars($("trainer-strength-chart"),
    bestSetProgress(selectedLogs, select.value), "kg");

  const summary = $("trainer-progress-summary");
  summary.replaceChildren();
  const volume = selectedLogs.reduce((total, log) => total + trainingVolume(log), 0);
  const cards = [
    ["👤", "Aluno selecionado", student?.name || "Nenhum"],
    ["✅", "Treinos concluídos", String(selectedLogs.length)],
    ["📅", "Treinos em 7 dias", String(recentLogs(selectedLogs).length)],
    ["🏋️", "Volume acumulado", `${volume.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} kg`]
  ];
  cards.forEach(([icon, label, value]) => {
    const card = element("div", "mini-stat");
    card.append(
      element("span", "mini-stat-icon", icon),
      element("span", "mini-stat-label", label),
      element("strong", "", value)
    );
    summary.append(card);
  });

  const container = $("measurement-list");
  container.replaceChildren();

  if (!studentId) {
    container.append(emptyMessage("Selecione um aluno para ver a evolução individual."));
  } else if (!selectedMeasurements.length) {
    container.append(emptyMessage("Este aluno ainda não registrou medidas."));
  }

  [...selectedMeasurements].reverse().forEach(item => {
    const card = element("article", "panel-card");
    card.append(
      element("h3", "", student?.name || "Aluno"),
      element("p", "muted",
        `${item.weight} kg · ${item.height || "—"} cm · ${dateLabel(item.createdAt)}`)
    );
    container.append(card);
  });
}
$("trainer-progress-student").addEventListener("change", renderProgress);
$("trainer-progress-exercise").addEventListener("change", () => {
  const selectedLogs = logs.filter(log =>
    log.studentId === $("trainer-progress-student").value);
  drawBars($("trainer-strength-chart"),
    bestSetProgress(selectedLogs, $("trainer-progress-exercise").value), "kg");
});

function renderDashboard() {
  $("stat-students").textContent = students.length;
  $("stat-workouts").textContent = workouts.length;
  $("stat-published").textContent =
    workouts.filter(w => w.status === "published").length;
  $("stat-logs").textContent = logs.length;
  const weekly = $("trainer-weekly-stats");
  weekly.replaceChildren();
  const weekLogs = recentLogs(logs);
  [
    ["📅", "Treinos desta semana", String(weekLogs.length)],
    ["💪", "Alunos que treinaram", String(new Set(weekLogs.map(log => log.studentId)).size)],
    ["⏱️", "Último registro", logs.length ? dateLabel(logs[0].createdAt) : "Ainda não há"]
  ].forEach(([icon, label, value]) => {
    const card = element("div", "mini-stat");
    card.append(element("span", "mini-stat-icon", icon),
      element("span", "mini-stat-label", label), element("strong", "", value));
    weekly.append(card);
  });

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

  workouts.sort(compareWorkoutDays);
  renderStudents();
  renderFiveDayStudents();
  renderWorkouts();
  renderLogs();
  renderProgress();
  renderDashboard();
}


async function ensureWeeklyDrafts() {
  const refs = WEEKLY_DRAFTS.map(workout =>
    doc(db, "workouts", `${WEEKLY_DRAFT_VERSION}-${currentUser.uid}-${workout.day}`));
  const snapshot = await getDocs(collection(db, "workouts"));
  const existing = new Set(snapshot.docs.map(item => item.id));
  const batch = writeBatch(db);
  let added = 0;
  WEEKLY_DRAFTS.forEach((workout, index) => {
    if (existing.has(refs[index].id)) return;
    batch.set(refs[index], {
      ...workout,
      trainerId: currentUser.uid,
      studentId: "",
      status: "draft",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    added++;
  });
  if (added) await batch.commit();
  return added;
}


const draftPanel = element("section", "panel-card");
const draftMessage = element("p", "status-message", "Treino de segunda a sábado • aquecimento + 12, 10 e 8 • sem aluno vinculado.");
draftMessage.setAttribute("role", "status");
const importDraftsButton = element("button", "primary-btn", "Importar meus 6 rascunhos");
importDraftsButton.type = "button";
draftPanel.append(element("h3", "", "Seu treino semanal"), draftMessage, importDraftsButton);
$("workout-list").before(draftPanel);
let importingDrafts = false;
async function importWeeklyDrafts() {
  if (!currentUser || importingDrafts) return;
  importingDrafts = true;
  importDraftsButton.disabled = true;
  draftMessage.textContent = "Conferindo e salvando seus rascunhos...";
  try {
    const added = await ensureWeeklyDrafts();
    await refreshData();
    draftMessage.textContent = added
      ? `${added} rascunho(s) salvo(s), sem aluno vinculado. Veja as fichas abaixo.`
      : "Os seis treinos já foram importados. Confira as fichas abaixo.";
    $("trainer-workout-search").value = "";
    $("trainer-workout-status").value = "";
    $("trainer-workout-student").value = "";
    renderWorkouts();
  } catch (error) {
    console.error("Erro ao importar rascunhos:", error);
    draftMessage.textContent = `Não foi possível importar: ${error.code || error.message || "erro desconhecido"}. Tente novamente ou informe esta mensagem.`;
  } finally {
    importingDrafts = false;
    importDraftsButton.disabled = false;
  }
}
importDraftsButton.onclick = importWeeklyDrafts;


const fiveDayPanel = element("section", "panel-card");
const fiveDaySelect = document.createElement("select");
fiveDaySelect.id = "five-day-student";
const fiveDayLabel = element("label", "form-field", "Perfil que receberá os cinco treinos");
fiveDayLabel.htmlFor = fiveDaySelect.id;
fiveDayLabel.append(fiveDaySelect);
const fiveDayMessage = element("p", "status-message", "Selecione o perfil da Vitória e publique as cinco fichas com os vídeos.");
fiveDayMessage.setAttribute("role", "status");
const fiveDayButton = element("button", "primary-btn", "Publicar os 5 treinos para o perfil selecionado");
fiveDayButton.type = "button";
fiveDayButton.disabled = true;
const fiveDayPreview = document.createElement("details");
fiveDayPreview.append(element("summary", "", "Conferir exercícios e vídeos"));
FIVE_DAY_PLAN.forEach(workout => {
  const section = element("div", "log-exercise");
  section.append(element("h4", "", workout.name));
  const list = document.createElement("ol");
  workout.exercises.forEach(ex => {
    const item = element("li");
    const link = element("a", "", ex.name);
    link.href = ex.video;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    item.append(link);
    list.append(item);
  });
  section.append(list);
  fiveDayPreview.append(section);
});
fiveDayPanel.append(element("h3", "", "Plano de cinco dias com vídeos"),
  element("p", "muted", "Segunda: glúteo · Terça: ombros e costas · Quarta: quadríceps e glúteo · Quinta: bíceps e tríceps · Sexta: posterior e glúteo. Aquecimento + 12, 10 e 8."),
  fiveDayPreview, fiveDayLabel, fiveDayButton, fiveDayMessage);
$("workout-list").before(fiveDayPanel);
let publishingFiveDays = false;
function renderFiveDayStudents() {
  const previous = fiveDaySelect.value;
  fiveDaySelect.replaceChildren(new Option("Selecione o perfil da Vitória", ""));
  students.forEach(student => fiveDaySelect.add(
    new Option(`${student.name || "Aluno"} — ${student.email || student.id}`, student.id)));
  if (students.some(student => student.id === previous)) fiveDaySelect.value = previous;
  fiveDayButton.disabled = publishingFiveDays || !fiveDaySelect.value;
}
fiveDaySelect.onchange = () => {
  fiveDayButton.disabled = publishingFiveDays || !fiveDaySelect.value;
};
fiveDayButton.onclick = async () => {
  if (publishingFiveDays || !currentUser) return;
  const student = students.find(item => item.id === fiveDaySelect.value);
  if (!student) {
    fiveDayMessage.textContent = "Selecione um aluno ativo antes de publicar.";
    return;
  }
  publishingFiveDays = true;
  fiveDayButton.disabled = true;
  fiveDaySelect.disabled = true;
  fiveDayMessage.textContent = `Salvando as fichas para ${student.name}...`;
  try {
    const profile = await getDoc(doc(db, "users", student.id));
    if (!profile.exists() || profile.data().role !== "student" || profile.data().active !== true) {
      throw new Error("Este perfil não está ativo como aluno.");
    }
    const snapshot = await getDocs(collection(db, "workouts"));
    const existing = new Map(snapshot.docs.map(item => [item.id, item.data()]));
    const batch = writeBatch(db);
    const ids = [];
    let added = 0;
    FIVE_DAY_PLAN.forEach(workout => {
      const id = `${FIVE_DAY_PLAN_ID}-${currentUser.uid}-${student.id}-${workout.day}`;
      ids.push(id);
      if (existing.has(id)) {
        const saved = existing.get(id);
        if (saved.studentId !== student.id || saved.trainerId !== currentUser.uid || saved.status !== "published") {
          throw new Error("Uma ficha deste plano foi alterada. Confira em Meus treinos antes de publicar novamente.");
        }
        return;
      }
      batch.set(doc(db, "workouts", id), {
        ...workout, trainerId: currentUser.uid, studentId: student.id,
        status: "published", createdAt: serverTimestamp(), updatedAt: serverTimestamp()
      });
      added++;
    });
    if (added) await batch.commit();
    await refreshData();
    if (!ids.every(id => workouts.some(w => w.id === id && w.studentId === student.id && w.status === "published"))) {
      throw new Error("Não foi possível confirmar todas as fichas. Confira a lista e tente novamente.");
    }
    $("trainer-workout-search").value = "";
    $("trainer-workout-status").value = "published";
    $("trainer-workout-student").value = student.id;
    renderWorkouts();
    fiveDayMessage.textContent = `Confirmado: os 5 treinos estão publicados para ${student.name}, com vídeos. ${added ? "" : "Nenhuma ficha foi duplicada."}`;
  } catch (error) {
    console.error("Falha na publicação do plano:", error);
    fiveDayMessage.textContent = `Não foi possível concluir: ${error.code || error.message}. Você pode tentar novamente sem duplicar as fichas.`;
  } finally {
    publishingFiveDays = false;
    fiveDaySelect.disabled = false;
    fiveDayButton.disabled = !fiveDaySelect.value;
  }
};


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
      await importWeeklyDrafts();
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
      alert("Painel aberto, mas alguns dados não puderam ser carregados. Confira as regras do Firestore.");
    }

  } catch (error) {
    console.error(error);
    accessError("Não foi possível verificar sua conta.");
  }
});


function downloadCsv(filename, rows) {
  const escapeCell = value => {
    let text = String(value ?? "");
    if (/^[\s]*[=+@-]/.test(text)) text = "'" + text;
    return '"' + text.replaceAll('"', '""') + '"';
  };
  const csv = "\uFEFF" + rows.map(row => row.map(escapeCell).join(";")).join("\r\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

$("trainer-export-csv").addEventListener("click", () => {
  const studentId = $("trainer-history-student").value;
  const text = $("trainer-history-search").value.trim().toLocaleLowerCase("pt-BR");
  const selected = logs.filter(log =>
    (!studentId || log.studentId === studentId) &&
    (!text || String(log.workoutName || "").toLocaleLowerCase("pt-BR").includes(text)));
  const rows = [["Aluno", "Treino", "Data", "Exercício", "Série", "Carga (kg)", "Repetições"]];
  selected.forEach(log => {
    const student = students.find(item => item.id === log.studentId);
    (log.exercises || []).forEach(exercise =>
      (exercise.series || []).forEach((set, index) => {
        rows.push([student?.name || "Aluno", log.workoutName || "",
          dateLabel(log.createdAt), exercise.name, index + 1, set.weight, set.reps]);
      })
    );
  });
  if (rows.length < 2) {
    alert("Nenhum registro com séries para exportar.");
    return;
  }
  downloadCsv("evolve-fit-historico.csv", rows);
});

$("trainer-password-reset").addEventListener("click", async () => {
  const button = $("trainer-password-reset");
  const feedback = $("trainer-profile-message");
  if (!currentUser?.email) {
    feedback.textContent = "Não há e-mail cadastrado.";
    return;
  }
  button.disabled = true;
  feedback.textContent = "Enviando link...";
  try {
    await sendPasswordResetEmail(auth, currentUser.email);
    feedback.textContent = "Link de redefinição enviado para o seu e-mail.";
  } catch (error) {
    console.error(error);
    feedback.textContent = "Não foi possível enviar o e-mail. Tente novamente.";
  } finally {
    button.disabled = false;
  }
});

$("logout").onclick = async () => {
  await signOut(auth);
  location.replace("index.html");
};
