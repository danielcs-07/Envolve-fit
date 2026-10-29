import test from "node:test";
import assert from "node:assert/strict";
import { workoutSnapshot, usableSnapshot, resumeWorkout } from "../assets/js/session-recovery.mjs";

const workout = {
  id: "treino-123", name: "Costas", day: "terca",
  exercises: [{ name: "Remada", sets: 4, reps: "12", rest: 90 }],
  createdAt: { seconds: 123 }, internal: "não incluir"
};

test("recupera treino quando o Firebase ainda não carregou as fichas", () => {
  const saved = workoutSnapshot(workout);
  assert.equal(saved.internal, undefined);
  assert.equal(saved.createdAt, undefined);
  assert.deepEqual(resumeWorkout({ workoutId: workout.id, workoutSnapshot: saved }, []), saved);
});

test("usa ficha do servidor quando ela está disponível", () => {
  const saved = workoutSnapshot(workout);
  const current = { ...saved, name: "Costas atualizado" };
  assert.deepEqual(resumeWorkout({ workoutId: workout.id, workoutSnapshot: saved }, [current]), current);
});

test("não restaura ficha incorreta ou inválida", () => {
  const saved = workoutSnapshot(workout);
  assert.equal(resumeWorkout({ workoutId: "outra", workoutSnapshot: saved }, []), null);
  assert.equal(usableSnapshot({ ...saved, exercises: [{ name: "X", sets: 0 }] }, saved.id), false);
  assert.equal(resumeWorkout({ workoutId: workout.id, workoutSnapshot: { ...saved, exercises: [] } }, []), null);
  assert.equal(resumeWorkout(null, []), null);
});
