import test from "node:test";
import assert from "node:assert/strict";
import {
  draftKey, writeDraft, readDraft, removeDraft, clearUserDrafts, DRAFT_TTL_MS
} from "../draft-storage.mjs";

function memoryStorage() {
  const values = new Map();
  return {
    get length() { return values.size; },
    key(index) { return [...values.keys()][index] ?? null; },
    getItem(key) { return values.get(key) ?? null; },
    setItem(key, value) { values.set(String(key), String(value)); },
    removeItem(key) { values.delete(key); }
  };
}

test("rascunho de séries mantém carga, repetições, marcação e cronômetro", () => {
  const store = memoryStorage();
  const key = draftKey("student", "aluno-A", "workout-ficha123");
  const payload = {
    workoutId: "ficha123",
    restDeadline: 543210,
    exercises: [{ name: "Remada baixa", series: [
      { weight: "30.5", reps: "12", done: true },
      { weight: "", reps: "10", done: false }
    ] }]
  };
  assert.equal(writeDraft(store, key, payload, 1000), true);
  assert.deepEqual(readDraft(store, key, 1001), payload);
});

test("alunos e treinadores não compartilham chave de rascunho", () => {
  const store = memoryStorage();
  const a = draftKey("student", "aluno-A", "workout-1");
  const b = draftKey("student", "aluno-B", "workout-1");
  const c = draftKey("trainer", "aluno-A", "workout-1");
  writeDraft(store, a, { value: "A" }, 1000);
  writeDraft(store, b, { value: "B" }, 1000);
  writeDraft(store, c, { value: "C" }, 1000);
  assert.deepEqual(readDraft(store, a, 1001), { value: "A" });
  assert.deepEqual(readDraft(store, b, 1001), { value: "B" });
  assert.deepEqual(readDraft(store, c, 1001), { value: "C" });
  assert.equal(clearUserDrafts(store, "student", "aluno-A"), true);
  assert.equal(readDraft(store, a, 1001), null);
  assert.deepEqual(readDraft(store, b, 1001), { value: "B" });
  assert.deepEqual(readDraft(store, c, 1001), { value: "C" });
});

test("salvamentos antigos e dados malformados expiram sem bloquear o aplicativo", () => {
  const store = memoryStorage();
  const key = draftKey("trainer", "treinador-A", "workout-editor");
  const time = 1234567890000;
  writeDraft(store, key, { name: "Fichas antigas" }, time);
  assert.deepEqual(readDraft(store, key, time + DRAFT_TTL_MS), {
    name: "Fichas antigas"
  });
  assert.equal(readDraft(store, key, time + DRAFT_TTL_MS + 1), null);
  assert.equal(store.getItem(key), null);
  store.setItem(key, "{invalid-json");
  assert.equal(readDraft(store, key, time), null);
  assert.equal(store.getItem(key), null);
});

test("sem armazenamento local ou em navegação privada o formulário não quebra", () => {
  const key = draftKey("student", "aluno-A", "measurements");
  const blocked = {
    getItem() { throw new Error("storage blocked"); },
    setItem() { throw new Error("quota exceeded"); },
    removeItem() { throw new Error("privacy mode"); }
  };
  assert.equal(writeDraft(null, key, {}, 1000), false);
  assert.equal(writeDraft(blocked, key, {}, 1000), false);
  assert.equal(readDraft(blocked, key, 1000), null);
  assert.equal(removeDraft(blocked, key), false);
  assert.equal(clearUserDrafts(blocked, "student", "aluno-A"), false);
});

test("chaves inválidas não permitem colisões entre usuários e rascunhos", () => {
  assert.throws(() => draftKey("staff", "uid", "workout"));
  assert.throws(() => draftKey("student", "../uid", "workout"));
  assert.throws(() => draftKey("student", "uid", "training:other"));
});
