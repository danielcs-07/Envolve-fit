import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { testFilePath } from "./test-paths.mjs";

const read = path => readFileSync(new URL("../" + testFilePath(path), import.meta.url), "utf8");

test("Painel profissional preserva identificadores e módulos originais", () => {
  const html = read("treinador.html");
  const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
  assert.equal(ids.length, new Set(ids).size, "IDs duplicados");
  for (const id of [
    "welcome-name", "quick-create", "stat-students", "stat-workouts", "stat-logs",
    "stat-published", "premium-week-count", "premium-week-student-count",
    "dashboard-student-search", "dashboard-student-filter", "premium-missing-count",
    "premium-idle-count", "trainer-attention-list", "recent-activity",
    "overview-progress", "trainer-weekly-stats", "trainer-latest-feedback",
    "workout-form", "student-list", "trainer-copy-invite", "trainer-progress-student"
  ]) assert.ok(ids.includes(id), "Falta elemento " + id);
  assert.ok(html.includes('href="assets/css/trainer-premium.css'));
  assert.ok(html.includes('<tbody id="trainer-attention-list"'));
  assert.ok(!html.includes("Marina Oliveira"), "Dados fictícios não podem ir para produção");
});

test("Busca e filtros de alunos preservam navegação e isolamento por treinador", () => {
  const code = read("treinador.js");
  assert.ok(code.includes('function renderTrainerRoster()'));
  assert.ok(code.includes('addEventListener("input", renderTrainerRoster)'));
  assert.ok(code.includes('addEventListener("change", renderTrainerRoster)'));
  assert.ok(code.includes('where("trainerId", "==", currentUser.uid)'));
  assert.ok(code.includes('showTab("workouts")'));
  assert.ok(code.includes('sessionsLastSevenDays(logs)'));
});

test("Tema premium usa estilo isolado e tem adaptações para celular", () => {
  const css = read("trainer-premium.css");
  assert.equal((css.match(/{/g) || []).length, (css.match(/}/g) || []).length);
  assert.ok(css.includes(".premium-trainer"));
  assert.ok(css.includes(".premium-roster-table"));
  assert.ok(css.includes("@media(max-width:700px)"));
  assert.ok(css.includes(':root[data-studio-theme="dark"]'));
});
