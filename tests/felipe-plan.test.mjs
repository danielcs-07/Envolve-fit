import test from "node:test";
import assert from "node:assert/strict";
import { FIVE_DAY_PLAN } from "../treino-cinco-dias.mjs";
import { WEEKLY_DRAFTS } from "../treino-semanal.mjs";
import { FELIPE_MALE_PLAN, FELIPE_MALE_PLAN_ID, FELIPE_MALE_VIDEOS } from "../treino-masculino-felipe.mjs";

test("Plano exclusivo do Felipe mantém os seis dias do treino masculino", () => {
  assert.equal(FELIPE_MALE_PLAN.length, 6);
  assert.deepEqual(FELIPE_MALE_PLAN.map(workout => workout.day),
    ["segunda", "terca", "quarta", "quinta", "sexta", "sabado"]);
  assert.deepEqual(FELIPE_MALE_PLAN.map(workout => workout.name),
    WEEKLY_DRAFTS.map(workout => workout.name));
  assert.equal(FELIPE_MALE_PLAN_ID.includes("felipe-male"), true);
});

test("Os 29 exercícios do Felipe têm vídeos do YouTube e mantêm suas séries", () => {
  const exercises = FELIPE_MALE_PLAN.flatMap(workout => workout.exercises);
  assert.equal(exercises.length, 29);
  assert.equal(Object.keys(FELIPE_MALE_VIDEOS).length, 29);
  for (let i = 0; i < FELIPE_MALE_PLAN.length; i++) {
    const original = WEEKLY_DRAFTS[i];
    const withVideos = FELIPE_MALE_PLAN[i];
    assert.equal(withVideos.exercises.length, original.exercises.length);
    for (let j = 0; j < original.exercises.length; j++) {
      const exercise = withVideos.exercises[j];
      const originalExercise = original.exercises[j];
      assert.equal(exercise.name, originalExercise.name);
      assert.equal(exercise.sets, originalExercise.sets);
      assert.equal(exercise.reps, originalExercise.reps);
      assert.equal(exercise.rest, originalExercise.rest);
      assert.match(exercise.video, /^https:\/\/www\.youtube\.com\/watch\?v=[A-Za-z0-9_-]{11}$/);
    }
  }
});

test("Vídeos masculinos não são aplicados ao plano da Vitória", () => {
  assert.equal(FIVE_DAY_PLAN.length, 5);
  assert.equal(WEEKLY_DRAFTS[0].exercises[0].video, "");
  assert.notEqual(FELIPE_MALE_PLAN[0].exercises[0].video,
    WEEKLY_DRAFTS[0].exercises[0].video);
});