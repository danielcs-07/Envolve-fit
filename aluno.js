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
  query,
  where,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js";

const $ = id => document.getElementById(id);

let currentUser = null;
let workouts = [];
let logs = [];
let measurements = [];
let selectedWorkout = null;
let saving = false;

const tabTitles = {
  dashboard: "Início",
  workouts: "Meus treinos",
  history: "Histórico",
  progress: "Minha evolução",
  profile: "Meu perfil"
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

  $("page-title").textContent = tabTitles[tab];
  window.scrollTo(0, 0);
}

document.querySelectorAll(".nav-item").forEach(button => {
  button.onclick = () => showTab(button.dataset.tab);
});

$("go-workouts").onclick = () => showTab("workouts");

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

function startWorkout(workout) {
  selectedWorkout = workout;

  $("active-workout").hidden = false;
  $("active-workout-name").textContent = workout.name;
  $("active-workout-description").textContent =
    workout.description || "Siga as orientações do seu treinador.";

  const container = $("training-exercises");
  container.replaceChildren();

  workout.exercises.forEach((exercise, exerciseIndex) => {
    const card = make("article", "training-exercise");

    card.append(
      make("h3", "", `${exerciseIndex + 1}. ${exercise.name}`),
      make("p", "muted",
        `${exercise.sets} séries • ${exercise.reps} repetições • ${exercise.rest} s de descanso`
      )
    );

    if (exercise.notes) {
      card.append(make("p", "exercise-notes", exercise.notes));
    }

    const id = youtubeId(exercise.video);

    if (/^[A-Za-z0-9_-]{11}$/.test(id)) {
      const video = document.createElement("iframe");
      video.className = "exercise-video";
      video.src = `https://www.youtube-nocookie.com/embed/${id}`;
      video.title = `Vídeo: ${exercise.name}`;
      video.loading = "lazy";
      video.allow =
        "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share";
      video.allowFullscreen = true;
      video.referrerPolicy = "strict-origin-when-cross-origin";
      card.append(video);

      const link = make("a", "video-link", "Abrir vídeo no YouTube");
      link.href = `https://www.youtube.com/watch?v=${id}`;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      card.append(link);
    }

    const sets = make("div", "series-grid");
    sets.dataset.exerciseIndex = exerciseIndex;

    for (let i = 0; i < Number(exercise.sets); i++) {
      const row = make("div", "series-row");
      row.append(make("strong", "", `Série ${i + 1}`));

      const weightLabel = make("label", "series-input");
      weightLabel.append(make("span", "", "Carga (kg)"));

      const weight = document.createElement("input");
      weight.type = "number";
      weight.min = "0";
      weight.max = "1000";
      weight.step = "0.5";
      weight.required = true;
      weight.placeholder = "0";
      weight.dataset.type = "weight";
      weightLabel.append(weight);

      const repsLabel = make("label", "series-input");
      repsLabel.append(make("span", "", "Repetições"));

      const reps = document.createElement("input");
      reps.type = "number";
      reps.min = "0";
      reps.max = "1000";
      reps.step = "1";
      reps.required = true;
      reps.placeholder = "12";
      reps.dataset.type = "reps";
      repsLabel.append(reps);

      row.append(weightLabel, repsLabel);
      sets.append(row);
    }

    card.append(sets);
    container.append(card);
  });

  $("training-message").textContent = "";
  showTab("workouts");
  $("active-workout").scrollIntoView({ behavior: "smooth" });
}

$("close-workout").onclick = () => {
  selectedWorkout = null;
  $("active-workout").hidden = true;
};

function renderWorkouts() {
  const list = $("student-workout-list");
  const upcoming = $("upcoming-workouts");

  list.replaceChildren();
  upcoming.replaceChildren();

  if (!workouts.length) {
    const empty = make(
      "p",
      "empty-text",
      "Seu treinador ainda não publicou nenhum treino para você."
    );

    list.append(empty);
    upcoming.append(empty.cloneNode(true));
    return;
  }

  workouts.forEach(workout => {
    const card = make("article", "panel-card workout-card");

    card.append(
      make("h3", "", workout.name),
      make("p", "muted",
        `${workout.exercises.length} exercícios • ${workout.day || "Dia livre"}`
      )
    );

    if (workout.description) {
      card.append(make("p", "", workout.description));
    }

    const button = make("button", "primary-btn", "▶️ Iniciar treino");
    button.onclick = () => startWorkout(workout);
    card.append(button);
    list.append(card);

    const small = make("div", "student-row");
    small.append(make("strong", "", workout.name));

    const open = make("button", "outline-btn", "Abrir");
    open.onclick = () => startWorkout(workout);
    small.append(open);
    upcoming.append(small);
  });
}

function renderHistory() {
  const container = $("student-history");
  container.replaceChildren();

  if (!logs.length) {
    container.append(
      make("p", "empty-text", "Você ainda não concluiu treinos.")
    );
    return;
  }

  logs.forEach(log => {
    const card = make("article", "panel-card");

    card.append(
      make("h3", "", log.workoutName || "Treino"),
      make("p", "muted", dateText(log.createdAt))
    );

    (log.exercises || []).forEach(exercise => {
      const block = make("div", "log-exercise");
      block.append(make("strong", "", exercise.name));

      (exercise.series || []).forEach((series, index) => {
        block.append(
          make(
            "p",
            "muted",
            `Série ${index + 1}: ${series.weight} kg • ${series.reps} repetições`
          )
        );
      });

      card.append(block);
    });

    container.append(card);
  });
}

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

function renderProgress() {
  const sorted = [...measurements].sort(
    (a, b) =>
      (a.createdAt?.seconds || 0) -
      (b.createdAt?.seconds || 0)
  );

  const weightPoints = sorted.map(item => ({
    value: Number(item.weight),
    label: item.createdAt?.toDate
      ? item.createdAt.toDate().toLocaleDateString("pt-BR", {
          day: "2-digit",
          month: "2-digit"
        })
      : "—"
  }));

  drawBars($("student-weight-chart"), weightPoints, "kg");

  const strengthPoints = [...logs].reverse().map(log => {
    let maxWeight = 0;

    (log.exercises || []).forEach(exercise => {
      (exercise.series || []).forEach(series => {
        maxWeight = Math.max(
          maxWeight,
          Number(series.weight) || 0
        );
      });
    });

    return {
      value: maxWeight,
      label: log.createdAt?.toDate
        ? log.createdAt.toDate().toLocaleDateString("pt-BR", {
            day: "2-digit",
            month: "2-digit"
          })
        : "—"
    };
  }).filter(point => point.value > 0);

  drawBars($("student-strength-chart"), strengthPoints, "kg");

  const list = $("student-measurements");
  list.replaceChildren();

  [...measurements].reverse().forEach(item => {
    const card = make("article", "panel-card");

    card.append(
      make("strong", "", `${item.weight} kg • ${item.height} cm`),
      make("p", "muted", dateText(item.createdAt))
    );

    list.append(card);
  });

  const latest = sorted.at(-1);

  $("stat-weight").textContent = latest
    ? `${latest.weight} kg`
    : "—";

  $("stat-measurements").textContent = measurements.length;
}

async function refreshData() {
  const [workoutSnap, logSnap, measurementSnap] = await Promise.all([
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

  workouts = workoutSnap.docs
    .map(snapshot => ({
      id: snapshot.id,
      ...snapshot.data()
    }));

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
}

$("training-form").onsubmit = async event => {
  event.preventDefault();

  if (!selectedWorkout || saving) return;

  saving = true;
  $("finish-workout").disabled = true;
  $("training-message").textContent = "Salvando treino...";

  try {
    const exercises = selectedWorkout.exercises.map(
      (exercise, index) => {
        const group = document.querySelector(
          `[data-exercise-index="${index}"]`
        );

        const series = [
          ...group.querySelectorAll(".series-row")
        ].map(row => ({
          weight: Number(
            row.querySelector('[data-type="weight"]').value
          ),
          reps: Number(
            row.querySelector('[data-type="reps"]').value
          )
        }));

        return {
          name: exercise.name,
          series
        };
      }
    );

    await addDoc(collection(db, "trainingLogs"), {
      studentId: currentUser.uid,
      workoutId: selectedWorkout.id,
      workoutName: selectedWorkout.name,
      exercises,
      createdAt: serverTimestamp()
    });

    selectedWorkout = null;
    $("active-workout").hidden = true;

    await refreshData();
    showTab("history");

  } catch (error) {
    console.error(error);

    $("training-message").textContent =
      "Não foi possível salvar. Confira sua conexão e as permissões.";
  } finally {
    saving = false;
    $("finish-workout").disabled = false;
  }
};

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

    try {
      await refreshData();
    } catch (error) {
      console.error(error);
      alert(
        "Não foi possível carregar todos os dados. Verifique as regras do Firestore."
      );
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
