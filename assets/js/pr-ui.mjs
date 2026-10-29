import { WEEK_DAYS } from "./fitness-utils.mjs";

const el = (tag, className = "", text = "") => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  node.textContent = text;
  return node;
};

const kgLabel = weight => Number(weight).toLocaleString("pt-BR", {
  maximumFractionDigits: 2
});

function recordCard(record) {
  const card = el("article", "pr-card");
  const heading = el("div", "pr-card-heading");
  const name = el("h4", "", record.name);
  const dayName = WEEK_DAYS.find(day => day.key === record.day)?.label || "Dia livre";
  const day = el("span", "pr-day",
    record.daySource === "ficha" ? "📅 Ficha: " + dayName : "📅 Registro: " + dayName);
  heading.append(name, day);

  const best = el("strong", "pr-best",
    kgLabel(record.weight) + " kg × " + record.reps +
      (record.reps === 1 ? " repetição" : " repetições"));
  const changes = el("div", "pr-changes");
  if (record.gainKg != null && record.gainKg > 0) {
    changes.append(el("span", "pr-gain", "↗ +" + kgLabel(record.gainKg) +
      " kg em relação ao PR anterior de carga"));
  }
  if (record.gainReps != null && record.gainReps > 0) {
    changes.append(el("span", "pr-gain", "↗ +" + record.gainReps +
      " repetições com a mesma carga"));
  }
  if (!changes.childNodes.length) {
    changes.append(el("span", "pr-baseline", "Primeiro recorde de carga registrado"));
  }
  const date = el("p", "pr-date",
    "Recorde em " + record.date.toLocaleDateString("pt-BR"));
  card.append(heading, best, changes, date);
  return card;
}

export function renderPRList(container, records, limit = 8) {
  container.replaceChildren();
  if (!records.length) {
    container.append(el("p", "empty-text",
      "Ainda não há recordes de carga. Registre séries com peso e repetições para começar."));
    return;
  }

  const first = el("div", "pr-grid");
  records.slice(0, limit).forEach(record => first.append(recordCard(record)));
  container.append(first);
  if (records.length <= limit) return;

  const remaining = records.length - limit;
  const more = document.createElement("details");
  more.className = "pr-more";
  more.append(el("summary", "", "Ver mais " + remaining +
    (remaining === 1 ? " exercício e seu PR" : " exercícios e seus PRs")));
  const extra = el("div", "pr-grid");
  records.slice(limit).forEach(record => extra.append(recordCard(record)));
  more.append(extra);
  container.append(more);
}
