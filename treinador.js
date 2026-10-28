
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
  numberOfSeries, recordedSeriesCount, trainingConsistency, personalRecords,
  uniqueExercises, bestSetProgress
} from "./fitness-utils.mjs?v=20261021-pr-consistency";

import { renderPRList } from "./pr-ui.mjs";
import {
  draftKey, writeDraft, readDraft, removeDraft, clearUserDrafts
} from "./draft-storage.mjs";

import { WEEKLY_DRAFTS, WEEKLY_DRAFT_VERSION } from "./treino-semanal.mjs";


const $ = id => document.getElementById(id);

let currentUser = null;
let students = [];
let workouts = [];
let logs = [];
let measurements = [];
let busy = false;
let trainerFormHasEdits = false;
let trainerSessionRecovered = false;


const trainerStore = () => {
  try { return window.localStorage; } catch { return null; }
};
const trainerKey = kind => currentUser
  ? draftKey("trainer", currentUser.uid, kind) : null;

function rememberTrainerTab(tab) {
  if (!currentUser) return;
  writeDraft(trainerStore(), trainerKey("tab"), { tab });
}

function getRawEditorExercises() {
  return [...document.querySelectorAll(".exercise-editor")].map(card => {
    const field = name => card.querySelector('[data-field="' + name + '"]')?.value || "";
    return {
      name: field("name"), sets: field("sets"), reps: field("reps"),
      rest: field("rest"), video: field("video"), notes: field("notes"),
      videoAlternative: card.dataset.videoAlternative || ""
    };
  });
}

function saveTrainerDraft() {
  if (!currentUser || !trainerFormHasEdits || busy) return false;
  const data = {
    editingId: $("editing-id").value,
    name: $("workout-name").value,
    studentId: $("workout-student").value,
    day: $("workout-day").value,
    description: $("workout-description").value,
    exercises: getRawEditorExercises()
  };
  const saved = writeDraft(trainerStore(), trainerKey("workout-editor"), data);
  $("trainer-draft-status").textContent = saved
    ? "✓ Rascunho salvo automaticamente neste aparelho, ainda não enviado ao Firebase."
    : "⚠️ Salvamento local indisponível. Salve a ficha antes de sair.";
  return saved;
}

function markTrainerDraftChanged() {
  if (!currentUser || busy) return;
  trainerFormHasEdits = true;
  saveTrainerDraft();
}

function restoreTrainerSession() {
  if (!currentUser || trainerSessionRecovered) return;
  trainerSessionRecovered = true;
  const data = readDraft(trainerStore(), trainerKey("workout-editor"));
  if (data && Array.isArray(data.exercises) && data.exercises.length <= 100) {
    const existing = workouts.find(workout => workout.id === data.editingId);
    $("editing-id").value = existing ? existing.id : "";
    $("workout-name").value = typeof data.name === "string" ? data.name : "";
    $("workout-description").value =
      typeof data.description === "string" ? data.description : "";
    $("workout-day").value = typeof data.day === "string" ? data.day : "";
    if (students.some(student => student.id === data.studentId)) {
      $("workout-student").value = data.studentId;
    }
    $("exercise-list").replaceChildren();
    data.exercises.forEach(exercise => {
      if (exercise && typeof exercise === "object") addExercise(exercise);
    });
    if (!data.exercises.length) addExercise();
    trainerFormHasEdits = true;
    $("trainer-draft-status").textContent = existing || !data.editingId
      ? "✓ Sua ficha não publicada foi recuperada deste aparelho."
      : "✓ Dados recuperados. Como a ficha antiga não existe mais, salve como uma nova.";
  }
  const tab = readDraft(trainerStore(), trainerKey("tab"))?.tab;
  if (tab && Object.hasOwn(tabTitles, tab)) showTab(tab);
}

function confirmReplaceTrainerDraft() {
  return !trainerFormHasEdits || confirm(
    "Substituir o preenchimento atual? O rascunho local será descartado, mas fichas já salvas não mudam."
  );
}

$("workout-form").addEventListener("input", markTrainerDraftChanged);
$("workout-form").addEventListener("change", markTrainerDraftChanged);
function saveTrainerOnBackground() {
  if (currentUser) saveTrainerDraft();
}
document.addEventListener("visibilitychange", () => {
  if (document.hidden) saveTrainerOnBackground();
});
window.addEventListener("pagehide", saveTrainerOnBackground);

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
  rememberTrainerTab(name);
  window.scrollTo(0, 0);
}

document.querySelectorAll(".nav-item").forEach(button => {
  button.addEventListener("click", () => showTab(button.dataset.tab));
});

$("quick-create").onclick = () => showTab("create");
$("new-workout").onclick = () => {
  if (!confirmReplaceTrainerDraft()) return;
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
    markTrainerDraftChanged();
  };

  header.append(title, remove);
  card.append(header);

  const grid = element("div", "form-grid");

  const name = inputField(
    "Nome do exercício *",
    "text",
    data.name ?? "",
    "Ex.: Supino reto"
  );
  name.input.required = true;
  name.input.maxLength = 120;
  name.input.dataset.field = "name";

  const sets = inputField(
    "Quantidade de séries",
    "number",
    data.sets ?? 4
  );
  sets.input.min = 1;
  sets.input.max = 20;
  sets.input.required = true;
  sets.input.dataset.field = "sets";

  const reps = inputField(
    "Repetições",
    "text",
    data.reps ?? "12, 10, 8, 6",
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
    data.video ?? "",
    "https://www.youtube.com/watch?v=..."
  );
  video.input.dataset.field = "video";

  const notes = inputField(
    "Orientações do exercício",
    "textarea",
    data.notes ?? "",
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

$("add-exercise").onclick = () => {
  addExercise();
  markTrainerDraftChanged();
};

function clearForm({ preserveDraft = false } = {}) {
  if (!preserveDraft && currentUser) {
    removeDraft(trainerStore(), trainerKey("workout-editor"));
  }
  trainerFormHasEdits = false;
  $("workout-form").reset();
  $("editing-id").value = "";
  $("exercise-list").replaceChildren();
  $("form-message").textContent = "";
  $("trainer-draft-status").textContent =
    "As alterações nesta ficha serão salvas automaticamente neste aparelho.";
  addExercise();
}

$("clear-form").onclick = () => {
  if (!confirmReplaceTrainerDraft()) return;
  clearForm();
};

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

  saveTrainerDraft();
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
  if (!confirmReplaceTrainerDraft()) return false;
  clearForm();

  $("editing-id").value = workout.id;
  $("workout-name").value = workout.name;
  $("workout-student").value = workout.studentId || "";
  $("workout-day").value = workout.day || "";
  $("workout-description").value = workout.description || "";

  $("exercise-list").replaceChildren();
  workout.exercises.forEach(addExercise);

  trainerFormHasEdits = true;
  saveTrainerDraft();
  showTab("create");
  return true;
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
      if (!editWorkout(workout)) return;
      $("editing-id").value = "";
      $("workout-name").value = `${workout.name} (cópia)`;
      $("form-message").textContent = "Cópia pronta para editar. Salve como rascunho ou publique para o aluno.";
      saveTrainerDraft();
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
    const seriesCount = recordedSeriesCount(log);
    const indicator = element("span", "volume-pill",
      `${seriesCount} ${seriesCount === 1 ? "série registrada" : "séries registradas"}`);
    heading.append(content, indicator);
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

  const consistency = trainingConsistency(selectedLogs);
  // Use somente as fichas do aluno selecionado, evitando misturar seus PRs.
  const studentWorkouts = workouts.filter(workout =>
    workout.studentId === studentId);
  const records = personalRecords(selectedLogs, studentWorkouts);

  const summary = $("trainer-progress-summary");
  summary.replaceChildren();
  const cards = [
    ["✅", "Treinos registrados", String(selectedLogs.length)],
    ["📅", "Treinos em 7 dias", String(recentLogs(selectedLogs).length)],
    ["🔥", "Consistência (últimas 4 semanas)",
      consistency.activeWeeks + "/" + consistency.totalWeeks + " semanas"],
    ["🏆", "Exercícios com PR de carga", String(records.length)]
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

  $("trainer-pr-student-name").textContent =
    student ? "Recordes de " + student.name : "Selecione um aluno para ver os recordes";
  renderPRList($("trainer-pr-records"), records, 8);

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
  renderWorkouts();
  renderLogs();
  renderProgress();
  renderDashboard();
}


async function ensureWeeklyDrafts() {
  const refs = WEEKLY_DRAFTS.map(workout =>
    doc(db, "workouts", `${WEEKLY_DRAFT_VERSION}-${currentUser.uid}-${workout.day}`));
  const snapshot = await getDocs(collection(db, "workouts"));
  const existing = new Map(snapshot.docs.map(item => [item.id, item.data()]));
  const batch = writeBatch(db);
  let added = 0;
  let updated = 0;
  WEEKLY_DRAFTS.forEach((workout, index) => {
    const saved = existing.get(refs[index].id);
    if (saved) {
      // Atualize somente vídeos faltantes nos rascunhos originais sem aluno.
      // Fichas publicadas e fichas modificadas pelo treinador permanecem intactas.
      if (saved.trainerId !== currentUser.uid || saved.studentId ||
          saved.status !== "draft" ||
          !Array.isArray(saved.exercises) ||
          saved.exercises.length !== workout.exercises.length ||
          !saved.exercises.every((ex, i) =>
            ex.name === workout.exercises[i].name)) return;

      const updatedExercises = saved.exercises.map((ex, i) =>
        ex.video ? ex : { ...ex, video: workout.exercises[i].video });
      if (!updatedExercises.some((ex, i) =>
          ex.video !== saved.exercises[i].video)) return;

      batch.update(refs[index], {
        exercises: updatedExercises,
        updatedAt: serverTimestamp()
      });
      updated++;
      return;
    }
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
  if (added || updated) await batch.commit();
  return { added, updated };
}


const draftPanel = element("section", "panel-card");
const draftMessage = element("p", "status-message", "Treino de segunda a sábado • aquecimento + 12, 10 e 8 • sem aluno vinculado.");
draftMessage.setAttribute("role", "status");
const importDraftsButton = element("button", "primary-btn", "Importar / atualizar vídeos dos 6 treinos");
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
    const { added, updated } = await ensureWeeklyDrafts();
    await refreshData();
    draftMessage.textContent = added || updated
      ? `${added} rascunho(s) criado(s) e ${updated} atualizado(s) com vídeos. Veja as fichas abaixo.`
      : "Os rascunhos já têm vídeos ou foram personalizados/publicados; nada foi alterado.";
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

    clearForm({ preserveDraft: true });

    try {
      await refreshData();
      await importWeeklyDrafts();
      restoreTrainerSession();
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
      restoreTrainerSession();
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
  if (currentUser) clearUserDrafts(trainerStore(), "trainer", currentUser.uid);
  currentUser = null;
  await signOut(auth);
  location.replace("index.html");
};
