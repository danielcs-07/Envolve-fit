import test from "node:test";
import assert from "node:assert/strict";
import { sessionsLastSevenDays } from "../assets/js/trainer-weekly-stats.mjs";

test("gráfico semanal usa registros reais e sete dias em ordem", () => {
  const reference = new Date(2026, 10, 10, 18);
  const today = new Date(2026, 10, 10, 10);
  const yesterday = new Date(2026, 10, 9, 20);
  const before = new Date(2026, 10, 3, 12);
  const points = sessionsLastSevenDays([
    { createdAt: { seconds: Math.floor(today.getTime() / 1000) } },
    { createdAt: { seconds: Math.floor(today.getTime() / 1000) } },
    { createdAt: { toDate: () => yesterday } },
    { createdAt: { seconds: Math.floor(before.getTime() / 1000) } },
    { createdAt: null }
  ], reference);
  assert.equal(points.length, 7);
  assert.deepEqual(points.map(p => p.value), [0, 0, 0, 0, 0, 1, 2]);
  assert.equal(points.reduce((sum, p) => sum + p.value, 0), 3);
});
test("sem registros não inventa atividade", () => {
  const points = sessionsLastSevenDays([], new Date(2026, 10, 10, 13));
  assert.equal(points.length, 7);
  assert.ok(points.every(p => p.value === 0));
});
test("registros futuros são ignorados", () => {
  const reference = new Date(2026, 10, 10, 12);
  const future = new Date(2026, 10, 10, 16);
  assert.equal(sessionsLastSevenDays([{createdAt:future}],reference).at(-1).value,0);
});
