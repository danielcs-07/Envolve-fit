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
  query,
  where,
  serverTimestamp,
  setDoc,
  deleteDoc
} from "https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js";

import {
  WEEK_DAYS, normalizeDay, localDay, weekDates, timestampDate, compareWorkoutDays,
  numberOfSeries, recordedSeriesCount, trainingConsistency,
  personalRecords, bestSetProgress, uniqueExercises
} from "./fitness-utils.mjs?v=20261021-pr-consistency";

import { renderPRList } from "./pr-ui.mjs";
import { bestRepProgress } from "./studio-metrics.mjs";
import { cleanWorkoutFeedback, validWorkoutFeedback, feedbackStars, feedbackEffort } from "./feedback-utils.mjs";
import { workoutSnapshot, usableSnapshot, resumeWorkout } from "./session-recovery.mjs";
import {
  draftKey, writeDraft, readDraft, removeDraft, clearUserDrafts
} from "./draft-storage.mjs";

const $ = id => document.getElementById(id);

let currentUser = null;
let workouts = [];
let logs = [];
let measurements = [];
let selectedWorkout = null;
let saving = false;
let feedbackOpen = false;
let restInterval = null;
let restRemaining = 0;
let restDeadline = 0;
let restPaused = false;
let restSelectedSeconds = 90;
let restExerciseIndex = 0;
let restChoices = {};
let exerciseReplacements = {};
let restStatus = "Escolha um exercício para descansar.";
let sessionStartedAt = 0;
let sessionInterval = null;
let sessionRecovered = false;
let cloudDraftTimer = null;
let cloudDraftGeneration = 0;
let cloudDraftQueue = Promise.resolve();
let cloudDraftAllowed = true;

function draftCloudRef() {
  return doc(db, "sessionDrafts", currentUser.uid);
}

function scheduleCloudDraft(data, immediate = false) {
  if (!currentUser || !cloudDraftAllowed) return;
  const uid = currentUser.uid;
  const generation = ++cloudDraftGeneration;
  clearTimeout(cloudDraftTimer);
  cloudDraftTimer = setTimeout(() => {
    cloudDraftQueue = cloudDraftQueue.catch(() => {}).then(async () => {
      if (generation !== cloudDraftGeneration || !cloudDraftAllowed || currentUser?.uid !== uid) return;
      try {
        const record = { ownerId: uid, role: "student", data, updatedAt: serverTimestamp() };
        try {
          await setDoc(doc(db, "sessionDrafts", uid), record);
        } catch (error) {
          // Regras antigas no Firebase ainda aceitam o formato anterior.
          if (error.code !== "permission-denied") throw error;
          await setDoc(doc(db, "sessionDrafts", uid), {
            ...record,
            data: {
              workoutId: data.workoutId, workout: data.workout,
              exercises: data.exercises, restDeadline: data.restDeadline
            }
          });
        }
        if (generation === cloudDraftGeneration && selectedWorkout) {
          $("student-draft-status").textContent =
            "✓ Progresso salvo neste aparelho e no Firebase.";
        }
      } catch (error) {
        if (error.code === "permission-denied") cloudDraftAllowed = false;
        console.warn("Backup na nuvem indisponível; rascunho local preservado.", error.code || error);
      }
    });
  }, immediate ? 0 : 700);
}

async function removeCloudDraft() {
  ++cloudDraftGeneration;
  clearTimeout(cloudDraftTimer);
  const uid = currentUser?.uid;
  if (!uid || !cloudDraftAllowed) return;
  try {
    await cloudDraftQueue.catch(() => {});
    await deleteDoc(doc(db, "sessionDrafts", uid));
  } catch (error) {
    if (error.code === "permission-denied") cloudDraftAllowed = false;
    console.warn("Não foi possível limpar backup remoto:", error.code || error);
  }
}

async function restoreCloudDraft() {
  if (!currentUser || !cloudDraftAllowed || selectedWorkout) return false;
  try {
    const snap = await getDoc(draftCloudRef());
    if (!snap.exists() || !currentUser || selectedWorkout) return false;
    const record = snap.data();
    const data = record.data;
    if (record.ownerId !== currentUser.uid || record.role !== "student" ||
        !data || typeof data.workoutId !== "string") return false;
    const match = workouts.find(w => w.id === data.workoutId);
    const workout = match || (usableSnapshot(data.workout, data.workoutId) ? data.workout : null);
    if (!workout || !Array.isArray(data.exercises)) return false;
    writeDraft(localStore(), workoutKey(workout.id), data);
    writeDraft(localStore(), studentKey("active-workout"), {
      workoutId: workout.id, workoutSnapshot: workoutSnapshot(workout)
    });
    startWorkout(workout, { scroll: false });
    $("student-draft-status").textContent = "✓ Seu treino foi recuperado do Firebase.";
    return true;
  } catch (error) {
    if (error.code === "permission-denied") cloudDraftAllowed = false;
    console.warn("Recuperação na nuvem indisponível; verificando cópia do aparelho.", error.code || error);
    return false;
  }
}


const localStore = () => {
  try { return window.localStorage; } catch { return null; }
};
const studentKey = kind => currentUser
  ? draftKey("student", currentUser.uid, kind) : null;
const workoutKey = id => studentKey("workout-" + id);

function rememberStudentTab(tab) {
  if (!currentUser) return;
  writeDraft(localStore(), studentKey("tab"), { tab });
}

function saveActiveWorkoutDraft(immediate = false) {
  if (!currentUser || !selectedWorkout) return false;
  const exercises = [...$("training-exercises").querySelectorAll(".series-grid")]
    .map(group => {
      const index = Number(group.dataset.exerciseIndex);
      return {
        name: selectedWorkout.exercises[index]?.name || "",
        series: [...group.querySelectorAll(".series-row")].map(row => ({
          weight: row.querySelector('[data-type="weight"]').value,
          reps: row.querySelector('[data-type="reps"]').value,
          done: row.querySelector('[data-type="done"]').checked
        }))
      };
    });

  const draft = {
    workoutId: selectedWorkout.id,
    workout: workoutSnapshot(selectedWorkout),
    exercises,
    restDeadline,
    restPaused,
    restRemaining,
    restSelectedSeconds,
    restExerciseIndex,
    restChoices,
    exerciseReplacements,
    sessionStartedAt
  };
  const saved = writeDraft(localStore(), workoutKey(selectedWorkout.id), draft);
  scheduleCloudDraft(draft, immediate);
  $("student-draft-status").textContent = saved
    ? "✓ Progresso salvo automaticamente neste aparelho. Conclua o treino para enviar ao treinador."
    : "⚠️ O navegador não permitiu salvar o rascunho. Não feche esta página sem concluir.";
  return saved;
}

function restoreWorkoutDraft(workout) {
  const draft = readDraft(localStore(), workoutKey(workout.id));
  if (!draft || draft.workoutId !== workout.id || !Array.isArray(draft.exercises)) return false;
  let recovered = 0;

  [...$("training-exercises").querySelectorAll(".series-grid")].forEach(group => {
    const index = Number(group.dataset.exerciseIndex);
    const expected = workout.exercises[index];
    const stored = draft.exercises[index];
    // Não encaixar cargas de outro exercício se a ficha foi modificada.
    if (!expected || !stored || expected.name !== stored.name || !Array.isArray(stored.series)) return;
    const rows = [...group.querySelectorAll(".series-row")];
    rows.forEach((row, seriesIndex) => {
      const series = stored.series[seriesIndex];
      if (!series || typeof series !== "object") return;
      const weight = row.querySelector('[data-type="weight"]');
      const reps = row.querySelector('[data-type="reps"]');
      const checked = row.querySelector('[data-type="done"]');
      if (typeof series.weight === "string" && series.weight.length <= 20) weight.value = series.weight;
      if (typeof series.reps === "string" && series.reps.length <= 20) reps.value = series.reps;
      checked.checked = series.done === true;
      recovered++;
    });
  });

  if (!recovered) {
    $("student-draft-status").textContent =
      "Sua ficha mudou desde o último preenchimento. Nenhuma carga foi aplicada ao exercício errado.";
    return false;
  }
  const now = Date.now();
  if (Number.isFinite(draft.sessionStartedAt) &&
      draft.sessionStartedAt > now - 7 * 24 * 3600000 &&
      draft.sessionStartedAt <= now + 60000) {
    sessionStartedAt = draft.sessionStartedAt;
  }
  restChoices = {};
  if (draft.restChoices && typeof draft.restChoices === "object" && !Array.isArray(draft.restChoices)) {
    Object.entries(draft.restChoices).forEach(([key, value]) => {
      const index = Number(key);
      if (Number.isInteger(index) && index >= 0 &&
          index < selectedWorkout.exercises.length &&
          Number.isFinite(value) && value >= 15 && value <= 600) {
        restChoices[index] = value;
      }
    });
  }
  restExerciseIndex = Number.isInteger(draft.restExerciseIndex) &&
    draft.restExerciseIndex >= 0 && draft.restExerciseIndex < selectedWorkout.exercises.length
    ? draft.restExerciseIndex : 0;
  restSelectedSeconds = clampRestSeconds(
    restChoices[restExerciseIndex] ?? draft.restSelectedSeconds ?? suggestedRestSeconds(restExerciseIndex)
  );
  if (draft.restPaused === true && Number.isFinite(draft.restRemaining) &&
      draft.restRemaining > 0) {
    restPaused = true;
    restRemaining = Math.min(600, Math.ceil(draft.restRemaining));
    restStatus = "Descanso pausado. Continue quando estiver pronto.";
    renderRestTimer();
  } else if (Number.isFinite(draft.restDeadline) && draft.restDeadline > now) {
    startRestTimer(0, draft.restDeadline);
  } else {
    restRemaining = restSelectedSeconds;
    renderRestTimer();
  }
  updateSessionClock();
  updateSetProgress();
  $("student-draft-status").textContent =
    "✓ Preenchimento recuperado deste aparelho: cargas, repetições e séries marcadas.";
  return true;
}

function saveMeasurementDraft() {
  if (!currentUser) return;
  const weight = $("body-weight").value;
  const height = $("body-height").value;
  if (!weight && !height) {
    removeDraft(localStore(), studentKey("measurements"));
  } else {
    writeDraft(localStore(), studentKey("measurements"), { weight, height });
  }
}

function restoreStudentSession() {
  if (!currentUser || sessionRecovered) return Boolean(selectedWorkout);
  sessionRecovered = true;
  const measurement = readDraft(localStore(), studentKey("measurements"));
  if (measurement) {
    if (typeof measurement.weight === "string") $("body-weight").value = measurement.weight;
    if (typeof measurement.height === "string") $("body-height").value = measurement.height;
  }

  const pending = readDraft(localStore(), studentKey("active-workout"));
  const active = resumeWorkout(pending, workouts);
  if (active) {
    // Recupera a ficha do cache mesmo quando a conexão ao Firebase falha.
    startWorkout(active, { scroll: false });
    return true;
  }
  // Nunca apagar a referência automaticamente ao receber lista vazia/incompleta.
  const tab = readDraft(localStore(), studentKey("tab"))?.tab;
  if (tab && Object.hasOwn(tabTitles, tab)) showTab(tab);
  return false;
}

$("training-exercises").addEventListener("input", saveActiveWorkoutDraft);
$("training-exercises").addEventListener("change", saveActiveWorkoutDraft);
$("measurement-form").addEventListener("input", saveMeasurementDraft);
$("measurement-form").addEventListener("change", saveMeasurementDraft);

function saveStudentFormsOnBackground() {
  if (!currentUser) return;
  if (selectedWorkout) saveActiveWorkoutDraft(true);
  saveMeasurementDraft();
}
document.addEventListener("visibilitychange", () => {
  if (document.hidden) saveStudentFormsOnBackground();
  else if (restDeadline) updateRestCountdown();
});
window.addEventListener("pagehide", saveStudentFormsOnBackground);

const tabTitles = {
  dashboard: "Início",
  workouts: "Meus treinos",
  history: "Histórico",
  progress: "Minha evolução",
  explore: "Ferramentas",
  profile: "Meu perfil"
};

// O comentário é rascunhado localmente antes do envio definitivo do treino.
function feedbackDraftKey(workoutId) {
  return studentKey("feedback-" + workoutId);
}

function saveFeedbackDraft() {
  if (!currentUser || !selectedWorkout || !feedbackOpen) return;
  const rating = document.querySelector('input[name="workout-rating"]:checked')?.value || "";
  const effort = document.querySelector('input[name="workout-effort"]:checked')?.value || "balanced";
  writeDraft(localStore(), feedbackDraftKey(selectedWorkout.id), {
    open: true, rating, effort, comment: $("workout-feedback-comment").value.slice(0, 500)
  });
}

function clearFeedbackUI() {
  feedbackOpen = false;
  $("training-feedback").hidden = true;
  $("finish-workout").hidden = false;
  $("training-message").textContent = "";
  $("feedback-validation").textContent = "";
  $("workout-feedback-comment").value = "";
  $("feedback-count").textContent = "0";
  document.querySelectorAll('input[name="workout-rating"]').forEach(radio => { radio.checked = false; });
  document.querySelector('input[name="workout-effort"][value="balanced"]').checked = true;
}

function restoreFeedbackStep(workout) {
  clearFeedbackUI();
  const draft = readDraft(localStore(), feedbackDraftKey(workout.id));
  if (!draft || draft.open !== true) return;
  if (["1", "2", "3", "4", "5"].includes(String(draft.rating))) {
    const radio = document.querySelector('input[name="workout-rating"][value="' + draft.rating + '"]');
    if (radio) radio.checked = true;
  }
  const chosenEffort = ["easy", "balanced", "hard"].includes(draft.effort) ? draft.effort : "balanced";
  document.querySelector('input[name="workout-effort"][value="' + chosenEffort + '"]').checked = true;
  $("workout-feedback-comment").value = typeof draft.comment === "string" ? draft.comment.slice(0, 500) : "";
  $("feedback-count").textContent = String($("workout-feedback-comment").value.length);
  feedbackOpen = true;
  $("training-feedback").hidden = false;
  $("finish-workout").hidden = true;
  $("training-message").textContent = "Sua avaliação foi recuperada. Confirme para finalizar.";
}

function showFeedbackStep() {
  feedbackOpen = true;
  $("training-feedback").hidden = false;
  $("finish-workout").hidden = true;
  $("training-message").textContent = "";
  $("feedback-validation").textContent = "";
  saveFeedbackDraft();
  $("training-feedback").scrollIntoView({ behavior: "smooth", block: "start" });
}

$("training-feedback").addEventListener("change", saveFeedbackDraft);
$("workout-feedback-comment").addEventListener("input", () => {
  $("feedback-count").textContent = String($("workout-feedback-comment").value.length);
  saveFeedbackDraft();
});
$("feedback-back").onclick = () => {
  feedbackOpen = false;
  $("training-feedback").hidden = true;
  $("finish-workout").hidden = false;
  $("training-message").textContent = "Seu treino continua aberto. Você pode editar as séries.";
  if (selectedWorkout) removeDraft(localStore(), feedbackDraftKey(selectedWorkout.id));
};
$("feedback-skip").onclick = () => { void persistCompletedWorkout(null); };
$("feedback-submit").onclick = () => {
  const rating = document.querySelector('input[name="workout-rating"]:checked')?.value;
  const effort = document.querySelector('input[name="workout-effort"]:checked')?.value;
  const feedback = cleanWorkoutFeedback(rating, effort, $("workout-feedback-comment").value);
  if (!feedback) {
    $("feedback-validation").textContent = "Escolha de 1 a 5 estrelas ou use Pular avaliação.";
    return;
  }
  $("feedback-validation").textContent = "";
  void persistCompletedWorkout(feedback);
};

function make(tag, className = "", text = "") {
  const node = document.createElement(tag);
  node.className = className;
  node.textContent = text;
  return node;
}

function showTab(tab) {
  document.querySelectorAll(".tab").forEach(section => {
    section.classList.toggle("active", section.id === `tab-${tab}`);
  });

  document.querySelectorAll(".nav-item").forEach(button => {
    button.classList.toggle("active", button.dataset.tab === tab);
  });

  $("page-title").textContent = tabTitles[tab] || "Evolve Fit";
  rememberStudentTab(tab);
  window.scrollTo(0, 0);
}

document.querySelectorAll(".nav-item").forEach(button => {
  button.onclick = () => showTab(button.dataset.tab);
});

$("go-workouts").onclick = () => showTab("workouts");
$("go-pr-records").onclick = () => {
  showTab("progress");
  $("student-pr-section").scrollIntoView({ behavior: "smooth", block: "start" });
};

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

function dateText(timestamp) {
  return timestamp?.toDate
    ? timestamp.toDate().toLocaleString("pt-BR")
    : "Data indisponível";
}

function ptNumber(value, decimals = 0) {
  return Number(value || 0).toLocaleString("pt-BR", {
    maximumFractionDigits: decimals
  });
}

function updateSetProgress() {
  const rows = [...document.querySelectorAll("#training-exercises .series-row")];
  const checked = rows.filter(row => row.querySelector('[data-type="done"]')?.checked).length;
  const progress = $("workout-progress");
  progress.max = Math.max(1, rows.length);
  progress.value = checked;
  $("workout-progress-text").textContent = `${checked} de ${rows.length} séries`;
  rows.forEach(row => {
    row.classList.toggle("set-done", Boolean(row.querySelector('[data-type="done"]')?.checked));
  });
}

function formatClock(totalSeconds, hours = false) {
  const total = Math.max(0, Math.floor(Number(totalSeconds) || 0));
  const pad = value => String(value).padStart(2, "0");
  return hours
    ? pad(Math.floor(total / 3600)) + ":" + pad(Math.floor(total % 3600 / 60)) + ":" + pad(total % 60)
    : pad(Math.floor(total / 60)) + ":" + pad(total % 60);
}

function elapsedTrainingSeconds() {
  return sessionStartedAt > 0
    ? Math.max(0, Math.floor((Date.now() - sessionStartedAt) / 1000)) : 0;
}

function updateSessionClock() {
  $("session-elapsed").textContent = formatClock(elapsedTrainingSeconds(), true);
}

function stopSessionClock() {
  if (sessionInterval !== null) clearInterval(sessionInterval);
  sessionInterval = null;
}

function startSessionClock() {
  stopSessionClock();
  updateSessionClock();
  sessionInterval = setInterval(updateSessionClock, 1000);
}

function clampRestSeconds(value) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.min(600, Math.max(15, Math.round(number))) : 60;
}

function suggestedRestSeconds(index) {
  return clampRestSeconds(selectedWorkout?.exercises?.[index]?.rest ?? 60);
}

function renderRestTimer() {
  const showingComplete = restStatus.startsWith("Descanso concluído");
  $("rest-time").textContent = showingComplete
    ? "00:00"
    : formatClock(restDeadline || restPaused ? restRemaining : restSelectedSeconds);
  const exercise = selectedWorkout?.exercises?.[restExerciseIndex];
  $("rest-suggestion").textContent = exercise
    ? "Sugestão do treinador: " + suggestedRestSeconds(restExerciseIndex) + "s · " + exercise.name
    : "Você escolhe quanto descansar";
  $("rest-hint").textContent = restStatus;
  $("rest-toggle").textContent = restDeadline ? "Pausar" : restPaused ? "Continuar" : "Iniciar";
  $("rest-stop").disabled = !restDeadline && !restPaused;
}

function stopRestTimer(reset = true) {
  if (restInterval !== null) clearInterval(restInterval);
  restInterval = null;
  restDeadline = 0;
  restRemaining = restSelectedSeconds;
  restPaused = false;
  if (reset) restStatus = "Pronto para o próximo descanso.";
  renderRestTimer();
}

function updateRestCountdown() {
  if (!restDeadline) return;
  restRemaining = Math.max(0, Math.ceil((restDeadline - Date.now()) / 1000));
  if (restRemaining === 0) {
    stopRestTimer(false);
    restStatus = "Descanso concluído ✓";
    renderRestTimer();
    if (selectedWorkout) saveActiveWorkoutDraft();
    return;
  }
  restStatus = "Descanso em andamento. Você pode ajustar ou pausar.";
  renderRestTimer();
}

function startRestTimer(seconds, deadline = 0) {
  stopRestTimer(false);
  restDeadline = deadline > Date.now()
    ? deadline : Date.now() + Math.max(0, Number(seconds) || 0) * 1000;
  if (restDeadline <= Date.now()) {
    stopRestTimer(false);
    restStatus = "Descanso concluído ✓";
    renderRestTimer();
  } else {
    updateRestCountdown();
    restInterval = setInterval(updateRestCountdown, 1000);
  }
  if (selectedWorkout) saveActiveWorkoutDraft();
}

function chooseRestExercise(index) {
  stopRestTimer(false);
  restExerciseIndex = index;
  restSelectedSeconds = clampRestSeconds(
    restChoices[index] ?? suggestedRestSeconds(index)
  );
  restRemaining = restSelectedSeconds;
  restStatus = "Tempo sugerido pelo treinador — ajuste como preferir.";
  renderRestTimer();
  startRestTimer(restSelectedSeconds);
  $("rest-timer").scrollIntoView({ behavior: "smooth", block: "nearest" });
}

function adjustRest(delta) {
  const chosen = clampRestSeconds(restSelectedSeconds + delta);
  const difference = chosen - restSelectedSeconds;
  if (!difference) return;
  restSelectedSeconds = chosen;
  restChoices[restExerciseIndex] = chosen;
  if (restDeadline) {
    restDeadline += difference * 1000;
    updateRestCountdown();
  } else if (restPaused) {
    restRemaining = Math.max(1, Math.min(600, restRemaining + difference));
    renderRestTimer();
  } else {
    restRemaining = chosen;
    restStatus = "Tempo personalizado. Clique em iniciar quando quiser.";
    renderRestTimer();
  }
  saveActiveWorkoutDraft();
}

$("rest-minus").onclick = () => adjustRest(-15);
$("rest-plus").onclick = () => adjustRest(15);
$("rest-toggle").onclick = () => {
  if (restDeadline) {
    restRemaining = Math.max(1, Math.ceil((restDeadline - Date.now()) / 1000));
    if (restInterval !== null) clearInterval(restInterval);
    restInterval = null;
    restDeadline = 0;
    restPaused = true;
    restStatus = "Descanso pausado.";
    renderRestTimer();
    saveActiveWorkoutDraft();
  } else {
    startRestTimer(restPaused ? restRemaining : restSelectedSeconds);
  }
};
$("rest-stop").onclick = () => {
  stopRestTimer();
  restStatus = "Descanso pulado. Você pode iniciar outro quando quiser.";
  renderRestTimer();
  saveActiveWorkoutDraft();
};

function lastWorkoutLog(workout) {
  return logs.find(log => log.workoutId === workout.id);
}

function weekSchedule() {
  const strip = $("week-strip");
  strip.replaceChildren();
  weekDates().forEach(day => {
    const dayWorkouts = workouts.filter(w => normalizeDay(w.day) === day.key);
    const button = make("button", `week-day${day.today ? " is-today" : ""}`);
    button.type = "button";
    const shortName = make("span", "week-day-name", day.short);
    const date = make("strong", "week-date", String(day.date.getDate()).padStart(2, "0"));
    const indicator = make("span", "week-count", dayWorkouts.length
      ? `${dayWorkouts.length} treino${dayWorkouts.length > 1 ? "s" : ""}`
      : "Descanso");
    button.append(shortName, date, indicator);
    button.setAttribute("aria-label", `${day.label}: ${indicator.textContent}`);
    button.onclick = () => {
      $("student-day-filter").value = day.key;
      renderWorkouts();
      showTab("workouts");
    };
    strip.append(button);
  });

  const todayWorkouts = workouts.filter(w => normalizeDay(w.day) === localDay());
  const flexible = workouts.filter(w => !normalizeDay(w.day));
  const feature = $("student-today-feature");
  feature.replaceChildren();

  if (todayWorkouts.length) {
    const wrapper = make("div", "today-inner");
    const content = make("div");
    content.append(make("span", "today-kicker", "⚡ PROGRAMADO PARA HOJE"));
    content.append(make("h3", "", todayWorkouts.map(w => w.name).join(" · ")));
    content.append(make("p", "", "Seu treino está pronto. Registre as séries quando terminar."));
    const go = make("button", "primary-btn", "Começar meu treino ↗");
    go.type = "button";
    go.onclick = () => startWorkout(todayWorkouts[0]);
    wrapper.append(content, go);
    feature.append(wrapper);
  } else {
    const wrapper = make("div", "today-inner");
    const content = make("div");
    content.append(make("span", "today-kicker", "SUA ROTINA"));
    content.append(make("h3", "", "Sem treino programado para hoje"));
    content.append(make("p", "", flexible.length
      ? "Você também tem treinos sem dia fixo para realizar quando combinado com seu treinador."
      : "Aproveite para recuperar as energias e seguir seu planejamento."));
    const open = make("button", "outline-btn", "Ver minhas fichas");
    open.type = "button";
    open.onclick = () => showTab("workouts");
    wrapper.append(content, open);
    feature.append(wrapper);
  }
}

function startWorkout(workout, { scroll = true, ignoreDraft = false } = {}) {
  if (selectedWorkout) saveActiveWorkoutDraft();
  const pendingDraft = ignoreDraft ? null : readDraft(localStore(), workoutKey(workout.id));
  selectedWorkout = { ...workout, exercises: (workout.exercises || []).map(ex => ({ ...ex })) };
  exerciseReplacements = {};
  if (pendingDraft?.exerciseReplacements && typeof pendingDraft.exerciseReplacements === "object") {
    Object.entries(pendingDraft.exerciseReplacements).forEach(([key, replacement]) => {
      const index = Number(key), original = selectedWorkout.exercises[index];
      if (!Number.isInteger(index) || !original || !replacement ||
          original.name !== replacement.originalName || typeof replacement.name !== "string") return;
      const alternative = workouts.flatMap(item => item.exercises || [])
        .find(item => item.name === replacement.name);
      if (!alternative) return;
      exerciseReplacements[index] = { originalName: original.name, name: alternative.name };
      Object.assign(original, {
        name: alternative.name, video: alternative.video || "",
        videoAlternative: alternative.videoAlternative || "",
        notes: alternative.notes || ""
      });
    });
  }
  sessionStartedAt = Date.now();
  restChoices = {};
  restExerciseIndex = 0;
  restSelectedSeconds = suggestedRestSeconds(0);
  restRemaining = restSelectedSeconds;
  stopRestTimer();
  startSessionClock();
  writeDraft(localStore(), studentKey("active-workout"), {
    workoutId: workout.id,
    workoutSnapshot: workoutSnapshot(selectedWorkout)
  });

  $("active-workout").hidden = false;
  $("active-workout-name").textContent = workout.name;
  $("active-workout-description").textContent =
    workout.description || "Siga as orientações do seu treinador.";

  const container = $("training-exercises");
  container.replaceChildren();

  const previousLog = lastWorkoutLog(workout);
  (selectedWorkout.exercises || []).forEach((exercise, exerciseIndex) => {
    const card = make("article", "training-exercise");

    card.append(
      make("h3", "", `${exerciseIndex + 1}. ${exercise.name}`),
      make("p", "muted",
        `${exercise.sets} séries • ${exercise.reps} repetições • descanso sugerido: ${suggestedRestSeconds(exerciseIndex)}s`
      )
    );

    if (exercise.notes) {
      card.append(make("p", "exercise-notes", exercise.notes));
    }

    const id = youtubeId(exercise.video);

    if (/^[A-Za-z0-9_-]{11}$/.test(id)) {
      const videoDetails = document.createElement("details");
      videoDetails.className = "studio-video-details";
      videoDetails.append(make("summary", "video-link", "▶ Ver execução"));
      const video = document.createElement("iframe");
      video.className = "exercise-video";
      video.src = `https://www.youtube-nocookie.com/embed/${id}`;
      video.title = `Vídeo: ${exercise.name}`;
      video.loading = "lazy";
      video.allow =
        "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share";
      video.allowFullscreen = true;
      video.referrerPolicy = "strict-origin-when-cross-origin";
      videoDetails.append(video);

      const link = make("a", "video-link", "Abrir vídeo no YouTube");
      link.href = `https://www.youtube.com/watch?v=${id}`;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      videoDetails.append(link);
      const alternativeId = youtubeId(exercise.videoAlternative);
      if (/^[A-Za-z0-9_-]{11}$/.test(alternativeId)) {
        const alternative = make("a", "video-link", "Ver execução da alternativa");
        alternative.href = `https://www.youtube.com/watch?v=${alternativeId}`;
        alternative.target = "_blank";
        alternative.rel = "noopener noreferrer";
        videoDetails.append(document.createElement("br"), alternative);
      }
      card.append(videoDetails);
    }

    const rest = make("button", "outline-btn rest-action",
      `⏱️ Descansar · sugestão ${suggestedRestSeconds(exerciseIndex)}s`);
    rest.type = "button";
    rest.onclick = () => chooseRestExercise(exerciseIndex);
    card.append(rest);

    const sets = make("div", "series-grid");
    sets.dataset.exerciseIndex = exerciseIndex;

    for (let i = 0; i < Number(exercise.sets); i++) {
      const row = make("div", "series-row");
      row.append(make("strong", "", `Série ${i + 1}`));

      const weightLabel = make("label", "series-input");
      weightLabel.append(make("span", "", "Kg"));

      const weight = document.createElement("input");
      weight.type = "number";
      weight.min = "0";
      weight.max = "1000";
      weight.step = "0.5";
      weight.placeholder = "0";
      weight.dataset.type = "weight";
      weight.setAttribute("aria-label", `Carga em kg da série ${i + 1} de ${exercise.name}`);
      weight.inputMode = "decimal";
      const previous = (previousLog?.exercises || [])
        .find(ex => String(ex.name).trim().toLowerCase() === String(exercise.name).trim().toLowerCase());
      const oldSeries = previous?.series?.[i];
      if (oldSeries?.weight != null) weight.value = oldSeries.weight;
      weightLabel.append(weight);

      const repsLabel = make("label", "series-input");
      repsLabel.append(make("span", "", "Reps"));

      const reps = document.createElement("input");
      reps.type = "number";
      reps.min = "0";
      reps.max = "1000";
      reps.step = "1";
      reps.placeholder = "12";
      reps.dataset.type = "reps";
      reps.setAttribute("aria-label", `Repetições da série ${i + 1} de ${exercise.name}`);
      reps.inputMode = "numeric";
      if (oldSeries?.reps != null) reps.value = oldSeries.reps;
      repsLabel.append(reps);

      const checkLabel = make("label", "set-check");
      const check = document.createElement("input");
      check.type = "checkbox";
      check.dataset.type = "done";
      check.setAttribute("aria-label", `Concluir série ${i + 1} de ${exercise.name}`);
      check.addEventListener("change", updateSetProgress);
      checkLabel.append(check, make("span", "", "Feita"));
      row.append(weightLabel, repsLabel, checkLabel);
      sets.append(row);
    }

    card.append(sets);
    const alternatives = [...new Map(workouts.flatMap(item => item.exercises || [])
      .filter(item => item && typeof item.name === "string" && item.name.trim())
      .map(item => [item.name.toLocaleLowerCase("pt-BR"), item])).values()]
      .filter(item => item.name !== exercise.name);
    if (alternatives.length) {
      const picker = document.createElement("details");
      picker.className = "studio-swap";
      picker.append(make("summary", "", "⇄ Substituir nesta sessão"));
      picker.append(make("p", "muted",
        "Escolha um exercício de outra ficha já publicada. A ficha do treinador não será alterada."));
      const select = document.createElement("select");
      select.setAttribute("aria-label", "Exercício alternativo");
      select.append(new Option("Escolher alternativa", ""));
      alternatives.forEach(ex => select.add(new Option(ex.name, ex.name)));
      const apply = make("button", "outline-btn", "Aplicar substituição");
      apply.type = "button";
      apply.onclick = () => {
        const chosen = alternatives.find(ex => ex.name === select.value);
        if (!chosen || !selectedWorkout || feedbackOpen) return;
        if ([...sets.querySelectorAll(".series-row")].some(row =>
          row.querySelector('[data-type="weight"]').value !== "" ||
          row.querySelector('[data-type="reps"]').value !== "" ||
          row.querySelector('[data-type="done"]').checked) &&
          !confirm("A troca apaga apenas as séries preenchidas deste exercício. Continuar?")) return;
        const originalName = exerciseReplacements[exerciseIndex]?.originalName || exercise.name;
        exerciseReplacements[exerciseIndex] = { originalName, name: chosen.name };
        Object.assign(exercise, {
          name: chosen.name, video: chosen.video || "", notes: chosen.notes || "",
          videoAlternative: chosen.videoAlternative || ""
        });
        card.querySelector("h3").textContent = (exerciseIndex + 1) + ". " + chosen.name;
        let notes = card.querySelector(".exercise-notes");
        if (notes) notes.remove();
        if (exercise.notes) {
          notes = make("p", "exercise-notes", exercise.notes);
          card.querySelector("h3").after(notes);
        }
        card.querySelector(".studio-video-details")?.remove();
        const newVideoId = youtubeId(chosen.video);
        if (/^[A-Za-z0-9_-]{11}$/.test(newVideoId)) {
          const details = document.createElement("details");
          details.className = "studio-video-details";
          details.append(make("summary", "video-link", "▶ Ver execução"));
          const frame = document.createElement("iframe");
          frame.className = "exercise-video";
          frame.src = "https://www.youtube-nocookie.com/embed/" + newVideoId;
          frame.title = "Vídeo: " + chosen.name;
          frame.loading = "lazy";
          frame.allowFullscreen = true;
          frame.referrerPolicy = "strict-origin-when-cross-origin";
          details.append(frame);
          card.insertBefore(details, rest);
        }
        card.querySelector(".studio-swap-notice")?.remove();
        const label = make("p", "studio-swap-notice", "↪ Substituiu " + originalName + " somente nesta sessão");
        picker.after(label);
        sets.querySelectorAll(".series-row").forEach(row => {
          row.querySelector('[data-type="weight"]').value = "";
          row.querySelector('[data-type="reps"]').value = "";
          row.querySelector('[data-type="done"]').checked = false;
        });
        updateSetProgress();
        saveActiveWorkoutDraft(true);
      };
      picker.append(select, apply);
      card.append(picker);
    }
    if (exerciseReplacements[exerciseIndex]) {
      card.append(make("p", "studio-swap-notice", "↪ Substituiu " +
        exerciseReplacements[exerciseIndex].originalName + " somente nesta sessão"));
    }
    container.append(card);
  });

  $("training-message").textContent = "";
  $("student-draft-status").textContent =
    "Seu preenchimento será salvo automaticamente neste aparelho.";
  if (ignoreDraft) {
    removeDraft(localStore(), feedbackDraftKey(workout.id));
    clearFeedbackUI();
  } else {
    restoreFeedbackStep(selectedWorkout);
    restoreWorkoutDraft(selectedWorkout);
  }
  saveActiveWorkoutDraft(true);
  updateSetProgress();
  showTab("workouts");
  if (scroll) $("active-workout").scrollIntoView({ behavior: "smooth" });
}

$("close-workout").onclick = () => {
  saveActiveWorkoutDraft();
  clearFeedbackUI();
  selectedWorkout = null;
  stopRestTimer();
  stopSessionClock();
  sessionStartedAt = 0;
  removeDraft(localStore(), studentKey("active-workout"));
  void removeCloudDraft();
  $("active-workout").hidden = true;
};

$("discard-workout-draft").onclick = () => {
  if (!selectedWorkout ||
      !confirm("Descartar o preenchimento não enviado deste treino? Os registros já concluídos serão mantidos.")) return;
  const workout = selectedWorkout;
  removeDraft(localStore(), workoutKey(workout.id));
  removeDraft(localStore(), feedbackDraftKey(workout.id));
  void removeCloudDraft();
  selectedWorkout = null;
  startWorkout(workout, { scroll: false, ignoreDraft: true });
  $("student-draft-status").textContent = "Rascunho descartado. Você pode começar um novo preenchimento.";
};

function renderWorkouts() {
  const list = $("student-workout-list");
  const upcoming = $("upcoming-workouts");
  list.replaceChildren();
  upcoming.replaceChildren();

  const text = $("student-workout-search").value.trim().toLocaleLowerCase("pt-BR");
  const day = $("student-day-filter").value;

  const filtered = workouts.filter(workout => {
    const haystack = [workout.name, workout.description,
      ...(workout.exercises || []).map(ex => ex.name)]
      .join(" ").toLocaleLowerCase("pt-BR");
    return (!text || haystack.includes(text))
      && (!day || normalizeDay(workout.day) === day);
  });

  if (!filtered.length) {
    list.append(make("p", "empty-text", workouts.length
      ? "Nenhum treino corresponde à sua busca."
      : "Seu treinador ainda não publicou nenhum treino para você."));
  }

  const dayName = day => WEEK_DAYS.find(d => d.key === normalizeDay(day))?.label || "Dia livre";
  filtered.forEach(workout => {
    const card = make("article", "panel-card workout-card");
    const label = make("span", "workout-day-tag", dayName(workout.day));
    card.append(label);
    card.append(
      make("h3", "", workout.name),
      make("p", "muted",
        `${(workout.exercises || []).length} exercícios · ${numberOfSeries(workout)} séries`)
    );

    if (workout.description) card.append(make("p", "workout-instructions", workout.description));

    const last = lastWorkoutLog(workout);
    if (last) {
      const date = timestampDate(last.createdAt);
      if (date) card.append(make("p", "last-session",
        `✓ Último registro: ${date.toLocaleDateString("pt-BR")}`));
    }

    const button = make("button", "primary-btn", "▶ Iniciar treino");
    button.type = "button";
    button.onclick = () => startWorkout(workout);
    card.append(button);
    list.append(card);
  });

  if (!workouts.length) {
    upcoming.append(make("p", "empty-text", "Nenhuma ficha publicada até o momento."));
  } else {
    workouts.forEach(workout => {
      const small = make("div", "student-row");
      const info = make("div");
      info.append(make("strong", "", workout.name));
      info.append(make("p", "muted", dayName(workout.day)));
      const open = make("button", "outline-btn", "Abrir ↗");
      open.type = "button";
      open.onclick = () => startWorkout(workout);
      small.append(info, open);
      upcoming.append(small);
    });
  }
  weekSchedule();
}

$("student-workout-search").addEventListener("input", renderWorkouts);
$("student-day-filter").addEventListener("change", renderWorkouts);


function renderHistory() {
  const container = $("student-history");
  container.replaceChildren();
  const term = $("student-history-search").value.trim().toLocaleLowerCase("pt-BR");
  const filtered = logs.filter(log => String(log.workoutName || "Treino").toLocaleLowerCase("pt-BR").includes(term));

  $("student-history-summary").textContent =
    `${filtered.length} treino${filtered.length === 1 ? "" : "s"} registrado${filtered.length === 1 ? "" : "s"}`;

  if (!filtered.length) {
    container.append(make("p", "empty-text",
      logs.length ? "Nenhum registro encontrado." : "Você ainda não concluiu treinos."));
    return;
  }

  filtered.forEach(log => {
    const card = make("article", "panel-card history-card");
    const heading = make("div", "card-heading");
    const info = make("div");
    info.append(make("h3", "", log.workoutName || "Treino"));
    info.append(make("p", "muted", dateText(log.createdAt)));
    if (Number.isFinite(log.durationSeconds) && log.durationSeconds >= 0) {
      info.append(make("p", "muted", "⏱️ Duração: " + formatClock(log.durationSeconds, true)));
    }
    const seriesCount = recordedSeriesCount(log);
    const indicator = make("span", "volume-pill",
      `${seriesCount} ${seriesCount === 1 ? "série registrada" : "séries registradas"}`);
    heading.append(info, indicator);
    card.append(heading);
    if (validWorkoutFeedback(log.feedback)) {
      const note = make("div", "feedback-history-card");
      note.append(
        make("strong", "feedback-history-rating", feedbackStars(log.feedback) + " · " + feedbackEffort(log.feedback)),
        make("span", "feedback-history-label", "Sua avaliação do treino")
      );
      if (log.feedback.comment) note.append(make("p", "feedback-history-comment", log.feedback.comment));
      card.append(note);
    }

    (log.exercises || []).forEach(exercise => {
      const block = make("div", "log-exercise");
      block.append(make("strong", "", exercise.name));

      (exercise.series || []).forEach((series, index) => {
        block.append(make("p", "muted",
          `Série ${index + 1}: ${series.weight} kg · ${series.reps} repetições`));
      });

      card.append(block);
    });
    container.append(card);
  });
}
$("student-history-search").addEventListener("input", renderHistory);

function drawBars(container, entries, unit) {
  container.replaceChildren();

  if (!entries.length) {
    container.append(
      make("p", "empty-text", "Sem dados registrados.")
    );
    return;
  }

  const max = Math.max(1, ...entries.map(entry => entry.value));
  const chart = make("div", "bar-chart");

  entries.slice(-8).forEach(entry => {
    const column = make("div", "bar-column");
    const bar = make("div", "bar");

    bar.style.height =
      `${Math.max(5, entry.value / max * 140)}px`;

    column.append(
      make("small", "", `${entry.value} ${unit}`),
      bar,
      make("span", "", entry.label)
    );

    chart.append(column);
  });

  container.append(chart);
}

function renderStudentExerciseChart() {
  const exercise = $("student-exercise-filter").value;
  const metric = $("student-strength-metric").value;
  drawBars($("student-strength-chart"),
    metric === "reps" ? bestRepProgress(logs, exercise) : bestSetProgress(logs, exercise),
    metric === "reps" ? "reps" : "kg");
}

function renderProgress() {
  const sorted = [...measurements].sort((a, b) =>
    (timestampDate(a.createdAt)?.getTime() || 0) -
    (timestampDate(b.createdAt)?.getTime() || 0)
  );
  const weights = sorted.map(item => {
    const date = timestampDate(item.createdAt);
    return {
      value: Number(item.weight) || 0,
      label: date ? date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }) : "—"
    };
  }).filter(item => item.value > 0);
  drawBars($("student-weight-chart"), weights, "kg");

  const select = $("student-exercise-filter");
  const previous = select.value;
  const names = uniqueExercises(logs);
  select.replaceChildren(new Option("Selecione um exercício", ""));
  names.forEach(name => select.add(new Option(name, name)));
  if (names.includes(previous)) select.value = previous;
  else if (names.length) select.value = names[0];

  renderStudentExerciseChart();

  const latest = sorted.at(-1);
  $("stat-weight").textContent = latest ? `${latest.weight} kg` : "—";

  const consistency = trainingConsistency(logs);
  const records = personalRecords(logs, workouts);
  $("stat-consistency").textContent =
    consistency.activeWeeks + "/" + consistency.totalWeeks;

  const summary = $("student-progress-summary");
  summary.replaceChildren();
  const cards = [
    ["✅", "Treinos registrados", String(logs.length)],
    ["🔥", "Consistência (últimas 4 semanas)",
      consistency.activeWeeks + "/" + consistency.totalWeeks + " semanas"],
    ["🏆", "Exercícios com PR de carga", String(records.length)]
  ];
  cards.forEach(([icon, title, value]) => {
    const card = make("div", "mini-stat");
    card.append(
      make("span", "mini-stat-icon", icon),
      make("span", "mini-stat-label", title),
      make("strong", "", value)
    );
    summary.append(card);
  });

  renderPRList($("student-pr-dashboard"), records, 3);
  renderPRList($("student-pr-records"), records, 8);

  const list = $("student-measurements");
  list.replaceChildren();
  if (!sorted.length) {
    list.append(make("p", "empty-text", "Nenhum registro de medidas ainda."));
  }
  [...sorted].reverse().forEach(item => {
    const card = make("article", "panel-card");
    card.append(
      make("strong", "", `${item.weight} kg · ${item.height} cm`),
      make("p", "muted", dateText(item.createdAt))
    );
    list.append(card);
  });
}

$("student-exercise-filter").addEventListener("change", renderStudentExerciseChart);
$("student-strength-metric").addEventListener("change", renderStudentExerciseChart);

async function refreshData() {
  // A recuperação não depende de histórico/medidas responderem ao mesmo tempo.
  const [workoutResult, logResult, measurementResult] = await Promise.allSettled([
    getDocs(query(
      collection(db, "workouts"),
      where("studentId", "==", currentUser.uid),
      where("status", "==", "published")
    )),
    getDocs(query(
      collection(db, "trainingLogs"),
      where("studentId", "==", currentUser.uid)
    )),
    getDocs(query(
      collection(db, "measurements"),
      where("studentId", "==", currentUser.uid)
    ))
  ]);
  if (workoutResult.status !== "fulfilled") throw workoutResult.reason;
  const workoutSnap = workoutResult.value;
  const logSnap = logResult.status === "fulfilled" ? logResult.value : { docs: [] };
  const measurementSnap = measurementResult.status === "fulfilled" ? measurementResult.value : { docs: [] };
  if (logResult.status !== "fulfilled") console.warn("Histórico indisponível:", logResult.reason);
  if (measurementResult.status !== "fulfilled") console.warn("Medidas indisponíveis:", measurementResult.reason);

  workouts = workoutSnap.docs
    .map(snapshot => ({
      id: snapshot.id,
      ...snapshot.data()
    }));

  workouts.sort(compareWorkoutDays);

  logs = logSnap.docs
    .map(snapshot => ({
      id: snapshot.id,
      ...snapshot.data()
    }))
    .sort((a, b) =>
      (b.createdAt?.seconds || 0) -
      (a.createdAt?.seconds || 0)
    );

  measurements = measurementSnap.docs
    .map(snapshot => ({
      id: snapshot.id,
      ...snapshot.data()
    }));

  $("stat-workouts").textContent = workouts.length;
  $("stat-completed").textContent = logs.length;

  renderWorkouts();
  renderHistory();
  renderProgress();
  document.dispatchEvent(new CustomEvent("evolve:student-data", {
    detail: { workouts, logs }
  }));
}

$("training-form").onsubmit = event => {
  event.preventDefault();
  if (!selectedWorkout || saving || feedbackOpen) return;

  const rows = [...document.querySelectorAll("#training-exercises .series-row")];
  const completed = rows.filter(row => row.querySelector('[data-type="done"]')?.checked);
  if (!completed.length) {
    $("training-message").textContent = "Marque pelo menos uma série como concluída antes de salvar.";
    return;
  }
  for (const row of completed) {
    const weight = row.querySelector('[data-type="weight"]');
    const reps = row.querySelector('[data-type="reps"]');
    if (weight.value.trim() === "" || reps.value.trim() === "" ||
      !Number.isFinite(Number(weight.value)) || !Number.isFinite(Number(reps.value)) ||
      Number(weight.value) < 0 || Number(weight.value) > 1000 ||
      !Number.isInteger(Number(reps.value)) || Number(reps.value) < 1 || Number(reps.value) > 1000) {
      $("training-message").textContent = "Preencha carga e repetições válidas em cada série marcada.";
      weight.focus();
      return;
    }
  }
  if (completed.length < rows.length && !confirm(
    `Você marcou ${completed.length} de ${rows.length} séries. Salvar somente as concluídas?`
  )) return;
  showFeedbackStep();
};

async function persistCompletedWorkout(feedback) {
  if (saving || !selectedWorkout) return;
  const rows = [...document.querySelectorAll("#training-exercises .series-row")];
  const completed = rows.filter(row => row.querySelector('[data-type="done"]').checked);
  if (!completed.length) {
    $("feedback-validation").textContent = "Marque pelo menos uma série antes de finalizar.";
    return;
  }
  for (const row of completed) {
    const weight = Number(row.querySelector('[data-type="weight"]').value);
    const reps = Number(row.querySelector('[data-type="reps"]').value);
    if (!Number.isFinite(weight) || weight < 0 || weight > 1000 ||
        !Number.isInteger(reps) || reps < 1 || reps > 1000 ||
        row.querySelector('[data-type="weight"]').value.trim() === "" ||
        row.querySelector('[data-type="reps"]').value.trim() === "") {
      $("feedback-validation").textContent = "Revise suas séries: há cargas ou repetições inválidas.";
      return;
    }
  }
  saving = true;
  $("feedback-submit").disabled = true;
  $("feedback-skip").disabled = true;
  $("feedback-back").disabled = true;
  $("training-message").textContent = "Finalizando e salvando seu treino...";
  let created = false;
  let feedbackSaved = !feedback;
  let durationSaved = false;
  try {
    const exercises = (selectedWorkout.exercises || []).map((exercise, index) => {
      const group = document.querySelector('[data-exercise-index="' + index + '"]');
      const series = [...group.querySelectorAll(".series-row")]
        .filter(row => row.querySelector('[data-type="done"]').checked)
        .map(row => ({
          weight: Number(row.querySelector('[data-type="weight"]').value),
          reps: Number(row.querySelector('[data-type="reps"]').value)
        }));
      return { name: exercise.name, series };
    }).filter(exercise => exercise.series.length);

    const finishedWorkoutId = selectedWorkout.id;
    const durationSeconds = Math.min(604800, elapsedTrainingSeconds());
    const logData = {
      studentId: currentUser.uid,
      workoutId: finishedWorkoutId,
      workoutName: selectedWorkout.name,
      exercises,
      createdAt: serverTimestamp()
    };
    // O formulário só é encerrado depois de o Firestore confirmar o registro.
    try {
      await addDoc(collection(db, "trainingLogs"), {
        ...logData, durationSeconds, ...(feedback ? { feedback } : {})
      });
      durationSaved = true;
      feedbackSaved = true;
    } catch (error) {
      if (error.code !== "permission-denied") throw error;
      // Compatibilidade com regras anteriores: o treino deve ser salvo de qualquer modo.
      try {
        await addDoc(collection(db, "trainingLogs"), { ...logData, durationSeconds });
        durationSaved = true;
      } catch (legacyError) {
        if (legacyError.code !== "permission-denied") throw legacyError;
        await addDoc(collection(db, "trainingLogs"), logData);
      }
    }
    created = true;

    removeDraft(localStore(), workoutKey(finishedWorkoutId));
    removeDraft(localStore(), feedbackDraftKey(finishedWorkoutId));
    removeDraft(localStore(), studentKey("active-workout"));
    await removeCloudDraft();
    selectedWorkout = null;
    stopRestTimer();
    stopSessionClock();
    sessionStartedAt = 0;
    clearFeedbackUI();
    $("active-workout").hidden = true;

    const notice = feedback && !feedbackSaved
      ? "✓ Treino salvo, mas a avaliação não foi enviada: falta publicar as novas regras do Firebase."
      : !durationSaved
        ? "✓ Treino salvo. A duração ainda depende das novas regras do Firebase."
        : feedbackSaved && feedback
          ? "✓ Treino e avaliação enviados ao treinador!"
          : "✓ Treino concluído e salvo!";
    $("student-history-notice").textContent = notice;
    $("student-history-notice").hidden = false;

    try {
      await refreshData();
    } catch (reloadError) {
      console.warn("Treino salvo; histórico será atualizado na próxima conexão.", reloadError);
      $("student-history-notice").textContent += " Atualize o histórico quando houver conexão.";
    }
    showTab("history");
  } catch (error) {
    console.error("Erro ao salvar treino:", error);
    $("training-message").textContent = created
      ? "Treino salvo. Não foi possível atualizar a tela; confira o histórico."
      : "Não foi possível salvar. Seus dados continuam no rascunho; verifique sua conexão e tente novamente.";
  } finally {
    saving = false;
    $("feedback-submit").disabled = false;
    $("feedback-skip").disabled = false;
    $("feedback-back").disabled = false;
  }
}

$("measurement-form").onsubmit = async event => {
  event.preventDefault();

  const weight = Number($("body-weight").value);
  const height = Number($("body-height").value);

  if (
    !Number.isFinite(weight) ||
    !Number.isFinite(height) ||
    weight < 1 ||
    weight > 500 ||
    height < 50 ||
    height > 250
  ) {
    $("measurement-message").textContent =
      "Informe peso e altura válidos.";
    return;
  }

  try {
    await addDoc(collection(db, "measurements"), {
      studentId: currentUser.uid,
      weight,
      height,
      createdAt: serverTimestamp()
    });

    $("measurement-form").reset();
    removeDraft(localStore(), studentKey("measurements"));
    $("measurement-message").textContent = "Medidas salvas!";

    await refreshData();

  } catch (error) {
    console.error(error);

    $("measurement-message").textContent =
      "Não foi possível salvar as medidas.";
  }
};

function accessError(message) {
  $("loading").replaceChildren();

  $("loading").append(
    make("h2", "", "💪 Evolve Fit"),
    make("p", "", message)
  );

  const link = make("a", "primary-btn", "Voltar ao login");
  link.href = "index.html";
  $("loading").append(link);
}

onAuthStateChanged(auth, async user => {
  if (!user) {
    location.replace("index.html");
    return;
  }

  try {
    const profileSnap = await getDoc(
      doc(db, "users", user.uid)
    );

    if (
      !profileSnap.exists() ||
      profileSnap.data().role !== "student" ||
      profileSnap.data().active !== true
    ) {
      accessError(
        "Esta área é exclusiva para alunos autorizados."
      );
      return;
    }

    currentUser = user;

    const name = profileSnap.data().name || "Aluno";

    $("welcome-name").textContent = name.split(" ")[0];
    $("profile-name").textContent = name;
    $("profile-email").textContent = user.email || "";
    $("avatar").textContent = name.charAt(0).toUpperCase();

    $("loading").hidden = true;
    $("app").hidden = false;

    // Reabra imediatamente a ficha salva antes de esperar consultas da rede.
    // A sincronização de histórico e medidas continua em segundo plano.
    const pending = readDraft(localStore(), studentKey("active-workout"));
    let restoredLocally = false;
    if (usableSnapshot(pending?.workoutSnapshot, pending?.workoutId)) {
      restoredLocally = restoreStudentSession();
    }

    try {
      await refreshData();
    } catch (error) {
      console.error("Dados temporariamente indisponíveis:", error);
      $("training-message").textContent =
        "Sem conexão com o servidor. A cópia local do seu treino continua disponível.";
    }

    if (!restoredLocally) restoredLocally = restoreStudentSession();
    if (!restoredLocally) void restoreCloudDraft();

  } catch (error) {
    console.error(error);
    accessError("Não foi possível verificar sua conta.");
  }
});


$("student-password-reset").addEventListener("click", async () => {
  const button = $("student-password-reset");
  const feedback = $("student-profile-message");
  if (!currentUser?.email) {
    feedback.textContent = "Não há e-mail cadastrado nesta conta.";
    return;
  }
  button.disabled = true;
  feedback.textContent = "Enviando link...";
  try {
    await sendPasswordResetEmail(auth, currentUser.email);
    feedback.textContent = "Enviamos um link de redefinição para seu e-mail.";
  } catch (error) {
    console.error(error);
    feedback.textContent = "Não foi possível enviar o e-mail. Tente novamente.";
  } finally {
    button.disabled = false;
  }
});

$("logout").onclick = async () => {
  if (currentUser) {
    clearUserDrafts(localStore(), "student", currentUser.uid);
    void removeCloudDraft();
  }
  currentUser = null;
  await signOut(auth);
  location.replace("index.html");
};
