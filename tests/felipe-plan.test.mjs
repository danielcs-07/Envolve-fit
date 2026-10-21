import test from "node:test";
import assert from "node:assert/strict";
import { FIVE_DAY_PLAN } from "../treino-cinco-dias.mjs";
import { WEEKLY_DRAFTS } from "../treino-semanal.mjs";
import { FELIPE_MALE_PLAN, FELIPE_MALE_PLAN_ID, FELIPE_MALE_VIDEOS } from "../treino-masculino-felipe.mjs";

test("Felipe tem seis dias e apenas a quinta difere do treino masculino original", () => {
  assert.equal(FELIPE_MALE_PLAN.length, 6);
  assert.deepEqual(FELIPE_MALE_PLAN.map(workout => workout.day),
    ["segunda", "terca", "quarta", "quinta", "sexta", "sabado"]);
  assert.equal(FELIPE_MALE_PLAN_ID.includes("felipe-male"), true);
  for (let i = 0; i < FELIPE_MALE_PLAN.length; i++) {
    const actual = FELIPE_MALE_PLAN[i];
    const original = WEEKLY_DRAFTS[i];
    assert.equal(actual.day, original.day);
    assert.equal(actual.name, original.name);
    if (actual.day === "quinta") continue;
    assert.equal(actual.description, original.description);
    assert.deepEqual(actual.exercises.map(({ video, ...exercise }) => exercise),
      original.exercises.map(({ video, ...exercise }) => exercise));
  }
});

test("Quinta-feira tem máquina, solo com peso, oblíquos e esteira", () => {
  const day = FELIPE_MALE_PLAN.find(workout => workout.day === "quinta");
  assert.deepEqual(day.exercises.map(exercise => exercise.name), [
    "Abdominal na máquina",
    "Abdominal supra no chão com anilha",
    "Rotação de tronco na máquina (oblíquos)",
    "Esteira"
  ]);
  assert.deepEqual(day.exercises.map(exercise => exercise.sets), [4, 3, 3, 1]);
  assert.deepEqual(day.exercises.map(exercise => exercise.reps), [
    "12–15 (aquecimento), 12, 10, 8",
    "12–15",
    "12 por lado",
    "20–30 minutos"
  ]);
});

test("Os 29 exercícios do Felipe têm links de vídeo próprios", () => {
  const exercises = FELIPE_MALE_PLAN.flatMap(workout => workout.exercises);
  assert.equal(exercises.length, 29);
  assert.equal(Object.keys(FELIPE_MALE_VIDEOS).length, 29);
  for (const exercise of exercises) {
    assert.match(exercise.video, /^https:\/\/www\.youtube\.com\/watch\?v=[A-Za-z0-9_-]{11}$/);
    assert.equal(exercise.video, FELIPE_MALE_VIDEOS[exercise.name]);
  }
});

test("Plano da Vitória permanece separado da ficha masculina do Felipe", () => {
  assert.equal(FIVE_DAY_PLAN.length, 5);
  assert.equal(WEEKLY_DRAFTS.find(day => day.day === "quinta").exercises[0].name,
    "Abdominal na polia");
  assert.equal(FIVE_DAY_PLAN.find(day => day.day === "quinta").name,
    "Quinta — Bíceps e tríceps");
});