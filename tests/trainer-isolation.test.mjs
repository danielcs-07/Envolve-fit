import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const load = file => readFileSync(new URL("../" + file, import.meta.url), "utf8");

test("regras protegem clientes e históricos contra outros treinadores", () => {
  const rules = load("firestore.session-drafts.rules");
  assert.ok(rules.includes("function trainerOwnsStudent(studentId)"));
  assert.ok(rules.includes('data.get("trainerId", "") == request.auth.uid'));
  assert.ok(rules.includes('resource.data.trainerId == request.auth.uid'));
  assert.ok(rules.includes('trainerOwnsStudent(resource.data.studentId)'));
  assert.ok(rules.includes('trainerOwnsStudent(request.resource.data.studentId)'));
  assert.ok(!rules.includes('allow read: if isTrainer()\n        ||'));
  assert.ok(!rules.includes('allow list: if isTrainer();'));
  assert.ok(rules.includes('affectedKeys().hasOnly(["active"])'));
  assert.ok(rules.includes('request.resource.data.role == "student"'));
  assert.ok(rules.includes('activeTrainerProfile(request.resource.data.trainerId)'));
});

test("consultas do painel só carregam alunos e fichas associados", () => {
  const code=load("treinador.js");
  assert.ok(code.includes('where("trainerId", "==", currentUser.uid)'));
  assert.ok(code.includes('where("studentId", "==", student.id)'));
  assert.ok(!code.includes('getDocs(collection(db, "users"))'));
  assert.ok(!code.includes('getDocs(collection(db, "workouts"))'));
  assert.ok(!code.includes("importWeeklyDrafts"));
  assert.ok(!code.includes("ensureWeeklyDrafts"));
  assert.ok(!code.includes("WEEKLY_DRAFTS"));
  assert.ok(code.includes('inviteUrl.searchParams.set("trainer", user.uid)'));
});

test("aprovação só lista alunos associados ao treinador logado", () => {
  const code=load("aprovacao.js");
  assert.ok(code.includes('where("trainerId", "==", auth.currentUser.uid)'));
  assert.ok(code.includes('item.trainerId === auth.currentUser?.uid'));
  assert.ok(!code.includes('getDocs(collection(db, "users"))'));
});

test("cadastro requer convite e não permite trocar papel nem ativar por conta própria", () => {
  const auth=load("auth-ui.js");
  assert.ok(auth.includes('validTrainerInvite'));
  assert.ok(auth.includes('trainerId: invitedTrainerId'));
  assert.ok(auth.includes('role: "student"'));
  assert.ok(auth.includes('active: false'));
  assert.ok(auth.includes("Para criar sua conta, abra o link de convite"));
  const trainer=load("treinador.html");
  assert.ok(trainer.includes('id="trainer-copy-invite"'));
  assert.ok(trainer.includes('id="trainer-invite-url"'));
  assert.ok(trainer.includes('id="trainer-invite-status"'));
});

test("regressão: scripts ES module continuam válidos e estudante mantém histórico", () => {
  for (const path of ["auth-ui.js","treinador.js","aprovacao.js"]) {
    const code=load(path).replace(/^import\s+[\s\S]*?\s+from\s+["'][^"']+["'];\s*/gm,"");
    assert.doesNotThrow(() => new Function(code), path);
  }
  const student=load("aluno.js");
  assert.ok(student.includes('where("studentId", "==", currentUser.uid)'));
});
