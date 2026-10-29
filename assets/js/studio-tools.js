// Ferramentas do aluno: apenas cálculos locais e leitura de fichas já carregadas no app.
(() => {
  "use strict";
  const $ = id => document.getElementById(id);
  let library = [];
  const plates = [25, 20, 15, 10, 5, 2.5, 1.25];

  function parseYoutube(url) {
    try {
      const u = new URL(url);
      const host = u.hostname.replace(/^www\./, "");
      let id = "";
      if (host === "youtu.be") id = u.pathname.split("/")[1] || "";
      else if (["youtube.com", "m.youtube.com"].includes(host))
        id = u.pathname === "/watch" ? u.searchParams.get("v") || "" :
          (u.pathname.match(/^\/(?:embed|shorts)\/([A-Za-z0-9_-]{11})/)?.[1] || "");
      return /^[\w-]{11}$/.test(id) ? "https://www.youtube.com/watch?v=" + id : "";
    } catch { return ""; }
  }

  function exerciseEntries(workouts, logs) {
    const entries = new Map();
    (Array.isArray(workouts) ? workouts : []).forEach(workout => {
      if (!workout || !Array.isArray(workout.exercises)) return;
      workout.exercises.forEach(ex => {
        const name = typeof ex.name === "string" ? ex.name.trim() : "";
        if (!name || name.length > 120) return;
        const key = name.toLocaleLowerCase("pt-BR");
        const current = entries.get(key);
        if (!current) entries.set(key, {
          name, workouts: [String(workout.name || "Treino")],
          video: parseYoutube(ex.video), performed: false
        });
        else {
          const title = String(workout.name || "Treino");
          if (!current.workouts.includes(title)) current.workouts.push(title);
          if (!current.video) current.video = parseYoutube(ex.video);
        }
      });
    });
    const known = new Set();
    (Array.isArray(logs) ? logs : []).forEach(log =>
      (log.exercises || []).forEach(ex => known.add(String(ex.name || "").toLocaleLowerCase("pt-BR"))));
    return [...entries.values()].map(x => ({ ...x, performed: known.has(x.name.toLocaleLowerCase("pt-BR")) }))
      .sort((a,b) => a.name.localeCompare(b.name, "pt-BR"));
  }

  function renderLibrary() {
    const target = $("studio-exercise-library");
    if (!target) return;
    target.replaceChildren();
    const term = ($("studio-exercise-search")?.value || "").trim().toLocaleLowerCase("pt-BR");
    const items = library.filter(ex =>
      (ex.name + " " + ex.workouts.join(" ")).toLocaleLowerCase("pt-BR").includes(term));
    $("studio-exercise-count").textContent =
      items.length + " exercício" + (items.length === 1 ? "" : "s") + " encontrado" + (items.length === 1 ? "" : "s");
    if (!items.length) {
      const p = document.createElement("p");
      p.className = "studio-empty-tool";
      p.textContent = library.length ? "Nenhum exercício corresponde à busca." :
        "Sua biblioteca será preenchida com os exercícios das fichas publicadas pelo treinador.";
      target.append(p);
      return;
    }
    items.forEach(ex => {
      const card = document.createElement("article");
      card.className = "studio-library-card";
      const top = document.createElement("div");
      top.className = "studio-library-figure";
      top.textContent = "◫";
      const copy = document.createElement("div");
      copy.className = "studio-library-copy";
      const title = document.createElement("strong");
      title.textContent = ex.name;
      const desc = document.createElement("p");
      desc.textContent = ex.workouts.slice(0,2).join(" · ") + (ex.workouts.length > 2 ? " · +" + (ex.workouts.length - 2) : "");
      copy.append(title,desc);
      if (ex.performed) {
        const done = document.createElement("small");
        done.className = "studio-library-done";
        done.textContent = "✓ Já registrado";
        copy.append(done);
      }
      card.append(top,copy);
      if (ex.video) {
        const link = document.createElement("a");
        link.href = ex.video;
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        link.className = "studio-library-video";
        link.textContent = "▶ Vídeo";
        card.append(link);
      }
      target.append(card);
    });
  }

  function format(value) { return value.toLocaleString("pt-BR",{maximumFractionDigits:1}); }
  function calculatePlates(event) {
    event.preventDefault();
    const bar = Number($("studio-bar-weight").value);
    const total = Number($("studio-total-weight").value);
    const output = $("studio-plate-result");
    if (!Number.isFinite(bar) || !Number.isFinite(total) || bar < 0 || bar > 100 || total > 1000 || total < bar) {
      output.textContent = "A carga total deve ser maior ou igual ao peso da barra.";
      return;
    }
    let remaining = Math.round((total - bar) / 2 * 100) / 100;
    const chosen = [];
    for (const plate of plates) {
      const count = Math.floor((remaining + 0.0001) / plate);
      if (count > 0) { chosen.push(count + "× " + format(plate) + " kg"); remaining = Math.round((remaining - count * plate)*100)/100; }
    }
    output.textContent = (chosen.length ? "Cada lado: " + chosen.join(" + ") : "Somente a barra.") +
      (remaining > .01 ? " · Falta " + format(remaining) + " kg por lado para o valor exato." : " · Carga equilibrada.");
  }
  function calculateRM(event) {
    event.preventDefault();
    const weight = Number($("studio-rm-weight").value), reps = Number($("studio-rm-reps").value);
    const output = $("studio-rm-result");
    if (!Number.isFinite(weight) || weight <= 0 || weight > 1000 || !Number.isInteger(reps) || reps < 1 || reps > 12) {
      output.textContent = "Informe uma carga válida e de 1 a 12 repetições.";
      return;
    }
    const estimate = weight * (1 + reps / 30);
    output.textContent = "1RM estimada: " + format(estimate) +
      " kg (fórmula de Epley). Não é uma recomendação para tentar essa carga.";
  }
  function setup() {
    if (!$("studio-plate-form")) return;
    $("studio-plate-form").addEventListener("submit", calculatePlates);
    $("studio-rm-form").addEventListener("submit", calculateRM);
    $("studio-exercise-search").addEventListener("input", renderLibrary);
    document.addEventListener("evolve:student-data", event => {
      const detail = event.detail || {};
      library = exerciseEntries(detail.workouts, detail.logs);
      renderLibrary();
    });
    renderLibrary();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded",setup);
  else setup();
})();
