import { testFilePath } from "./test-paths.mjs";
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const load = file => readFileSync(new URL("../" + testFilePath(file), import.meta.url), "utf8");

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
  assert.ok(rules.includes('activeTrainerProfile(data.trainerId)'));
  assert.ok(rules.includes('validStudentCoach(request.resource.data)'));
  assert.ok(rules.includes('getAfter(/databases/$(database)/documents/trainerCodes/'));
  assert.ok(rules.includes('allow update, delete: if false;'));
  assert.ok(rules.includes('function validTrainerCode(code)'));
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
  assert.ok(code.includes('inviteUrl.searchParams.set("trainer", code)'));
});

test("aprovação só lista alunos associados ao treinador logado", () => {
  const code=load("aprovacao.js");
  assert.ok(code.includes('where("trainerId", "==", auth.currentUser.uid)'));
  assert.ok(code.includes('item.trainerId === auth.currentUser?.uid'));
  assert.ok(!code.includes('getDocs(collection(db, "users"))'));
});

test("cadastro requer convite e não permite trocar papel nem ativar por conta própria", () => {
  const auth=load("auth-ui.js");
  assert.ok(auth.includes('registerTrainer(email, password)'));
  assert.ok(auth.includes('getDoc(doc(db, "trainerCodes", code))'));
  assert.ok(auth.includes('trainerId: coachSnap.data().trainerId'));
  assert.ok(auth.includes('trainerCode: code'));
  assert.ok(auth.includes('generateCoachCode(crypto.getRandomValues(new Uint8Array(12)))'));
  assert.ok(auth.includes('batch.commit()'));
  assert.ok(auth.includes('role: "student"'));
  assert.ok(auth.includes('active: false'));
  assert.ok(auth.includes("Informe um código válido fornecido pelo treinador."));
  assert.ok(auth.includes('doc(db, "trainerCodes", "signup-rules-check")'));
  assert.ok(!auth.includes("__signup_rules_check__"));
  assert.ok(auth.indexOf('doc(db, "trainerCodes", "signup-rules-check")') < auth.indexOf("createUserWithEmailAndPassword(auth, email, password)", auth.indexOf("async function registerTrainer")));
  const trainer=load("treinador.html");
  assert.ok(trainer.includes('id="trainer-copy-invite"'));
  assert.ok(trainer.includes('id="trainer-invite-url"'));
  assert.ok(trainer.includes('id="trainer-invite-status"'));
  assert.ok(trainer.includes('id="trainer-coach-code"'));
  assert.ok(trainer.includes('id="trainer-copy-code"'));
});

test("regressão: scripts ES module continuam válidos e estudante mantém histórico", () => {
  for (const path of ["auth-ui.js","treinador.js","aprovacao.js"]) {
    const code=load(path).replace(/^import\s+[\s\S]*?\s+from\s+["'][^"']+["'];\s*/gm,"");
    assert.doesNotThrow(() => new Function(code), path);
  }
  const student=load("aluno.js");
  assert.ok(student.includes('where("studentId", "==", currentUser.uid)'));
});

test("cadastro de treinador exige documento de código criado atomicamente", () => {
  const rules=load("firestore.session-drafts.rules");
  assert.ok(rules.includes("match /trainerCodes/{code}"));
  assert.ok(rules.includes('request.resource.data.role == "trainer"'));
  assert.ok(rules.includes('request.resource.data.active == true'));
  assert.ok(rules.includes('request.resource.data.coachCode'));
  assert.ok(rules.includes('existsAfter(/databases/$(database)/documents/users/$(request.auth.uid))'));
  assert.ok(rules.includes('getAfter(/databases/$(database)/documents/users/$(request.auth.uid)).data.coachCode == code'));
  assert.ok(rules.includes('request.resource.data.diff(resource.data).affectedKeys().hasOnly(["coachCode"])'));
  assert.ok(!rules.includes('allow list: if true;'));
});
