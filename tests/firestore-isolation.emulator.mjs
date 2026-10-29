import { readFileSync } from "node:fs";
import { before, after, test } from "node:test";
import { initializeTestEnvironment, assertFails, assertSucceeds } from "@firebase/rules-unit-testing";
import { collection, doc, getDoc, getDocs, setDoc, updateDoc, serverTimestamp, where, query, writeBatch } from "firebase/firestore";

let env;
let trainerA, trainerB, studentA, studentB;

const user = (id, role, active = true, trainerId = undefined) => ({
  name: id, email: id + "@example.com", role, active,
  createdAt: new Date(),
  ...(trainerId ? { trainerId } : {})
});

before(async () => {
  env = await initializeTestEnvironment({
    projectId: "demo-evolve-fit",
    firestore: { rules: readFileSync(new URL("../firestore.session-drafts.rules", import.meta.url), "utf8") }
  });
  await env.withSecurityRulesDisabled(async ctx => {
    const db = ctx.firestore();
    for (const [id, data] of [
      ["trainerA", user("trainerA", "trainer")],
      ["trainerB", user("trainerB", "trainer")],
      ["studentA", user("studentA", "student", true, "trainerA")],
      ["studentB", user("studentB", "student", true, "trainerB")],
    ]) await setDoc(doc(db, "users", id), data);
    await setDoc(doc(db, "workouts", "wa"), { trainerId: "trainerA", studentId: "studentA", status: "published", name: "Treino A" });
    await setDoc(doc(db, "workouts", "wb"), { trainerId: "trainerB", studentId: "studentB", status: "published", name: "Treino B" });
    await setDoc(doc(db, "trainingLogs", "la"), { studentId: "studentA", workoutId: "wa", exercises: [{ name: "Teste" }] });
    await setDoc(doc(db, "measurements", "ma"), { studentId: "studentA", weight: 68, height: 170 });
  });
  trainerA = env.authenticatedContext("trainerA", { email: "trainerA@example.com" }).firestore();
  trainerB = env.authenticatedContext("trainerB", { email: "trainerB@example.com" }).firestore();
  studentA = env.authenticatedContext("studentA", { email: "studentA@example.com" }).firestore();
  studentB = env.authenticatedContext("studentB", { email: "studentB@example.com" }).firestore();
});
after(async () => { if (env) await env.cleanup(); });

test("treinadores visualizam só os próprios alunos e consultas precisam filtrar", async () => {
  await assertSucceeds(getDocs(query(collection(trainerA, "users"), where("trainerId", "==", "trainerA"))));
  await assertFails(getDoc(doc(trainerA, "users", "studentB")));
  await assertFails(getDocs(collection(trainerA, "users")));
  await assertSucceeds(getDoc(doc(trainerA, "users", "studentA")));
  await assertFails(getDoc(doc(trainerB, "users", "studentA")));
});

test("treinadores não visualizam nem alteram fichas de outros treinadores", async () => {
  await assertSucceeds(getDocs(query(collection(trainerA, "workouts"), where("trainerId", "==", "trainerA"))));
  await assertFails(getDoc(doc(trainerA, "workouts", "wb")));
  await assertFails(getDocs(collection(trainerA, "workouts")));
  await assertFails(updateDoc(doc(trainerA, "workouts", "wb"), { name: "Invadido" }));
  await assertFails(setDoc(doc(trainerB, "workouts", "extra"), { trainerId: "trainerB", studentId: "studentA", status: "published" }));
});

test("somente aluno dono lê a ficha publicada", async () => {
  await assertSucceeds(getDoc(doc(studentA, "workouts", "wa")));
  await assertFails(getDoc(doc(studentB, "workouts", "wa")));
  await assertFails(updateDoc(doc(studentA, "workouts", "wa"), { name: "Editado" }));
});

test("logs e medidas são privados para aluno e treinador responsáveis", async () => {
  await assertSucceeds(getDoc(doc(studentA, "trainingLogs", "la")));
  await assertSucceeds(getDoc(doc(trainerA, "trainingLogs", "la")));
  await assertSucceeds(getDocs(query(collection(trainerA, "trainingLogs"), where("studentId", "==", "studentA"))));
  await assertFails(getDoc(doc(trainerB, "trainingLogs", "la")));
  await assertFails(getDoc(doc(studentB, "trainingLogs", "la")));
  await assertSucceeds(getDoc(doc(trainerA, "measurements", "ma")));
  await assertFails(getDoc(doc(trainerB, "measurements", "ma")));
});

test("aluno pode salvar duração, avaliação, medidas e rascunho privado", async () => {
  await assertSucceeds(setDoc(doc(studentA, "trainingLogs", "newLog"), {
    studentId: "studentA", workoutId: "wa", workoutName: "Treino A",
    exercises: [{ name: "Exercício 1", series: [{ weight: 20, reps: 12 }] }],
    durationSeconds: 1200, feedback: { rating: 5, effort: "balanced", comment: "Bom" },
    createdAt: serverTimestamp()
  }));
  await assertSucceeds(setDoc(doc(studentA, "measurements", "newMeasurement"), {
    studentId: "studentA", weight: 69, height: 170, createdAt: serverTimestamp()
  }));
  await assertSucceeds(setDoc(doc(studentA, "sessionDrafts", "studentA"), {
    ownerId: "studentA", role: "student",
    data: { workoutId: "wa", workout: { name: "Treino A" }, exercises: [{ name: "Exercício 1" }], restDeadline: 0 },
    updatedAt: serverTimestamp()
  }));
  await assertSucceeds(getDoc(doc(studentA, "sessionDrafts", "studentA")));
  await assertFails(getDoc(doc(studentB, "sessionDrafts", "studentA")));
});

test("cadastro de treinador reserva código exclusivo em lote", async () => {
  const db = env.authenticatedContext("coachNew", { email: "coachNew@example.com" }).firestore();
  const code = "EF-AAAAAAAAAAAA";
  const batch = writeBatch(db);
  batch.set(doc(db, "users", "coachNew"), {
    name: "Novo Treinador", email: "coachNew@example.com",
    role: "trainer", active: true, coachCode: code,
    createdAt: serverTimestamp()
  });
  batch.set(doc(db, "trainerCodes", code), { trainerId: "coachNew", createdAt: serverTimestamp() });
  await assertSucceeds(batch.commit());
  await assertSucceeds(getDoc(doc(db, "users", "coachNew")));
  await assertFails(updateDoc(doc(db, "users", "coachNew"), { role: "student" }));
});

test("aluno novo usa código válido, permanece pendente e é aprovado pelo próprio treinador", async () => {
  const db = env.authenticatedContext("newStudent", { email: "newStudent@example.com" }).firestore();
  const code = "EF-AAAAAAAAAAAA";
  await assertSucceeds(getDoc(doc(db, "trainerCodes", code)));
  await assertSucceeds(setDoc(doc(db, "users", "newStudent"), {
    name: "Aluno Novo", email: "newStudent@example.com",
    role: "student", active: false, trainerId: "coachNew", trainerCode: code,
    createdAt: serverTimestamp()
  }));
  await assertFails(updateDoc(doc(trainerB, "users", "newStudent"), { active: true }));
  const coachNewDb = env.authenticatedContext("coachNew", { email: "coachNew@example.com" }).firestore();
  await assertSucceeds(updateDoc(doc(coachNewDb, "users", "newStudent"), { active: true }));
});

test("aluno não pode cadastrar perfil com treinador de outro código nem se promover", async () => {
  const db = env.authenticatedContext("fraud", { email: "fraud@example.com" }).firestore();
  await assertFails(setDoc(doc(db, "users", "fraud"), {
    name: "Perfil Fraudulento", email: "fraud@example.com",
    role: "student", active: true, trainerId: "coachNew", trainerCode: "EF-AAAAAAAAAAAA",
    createdAt: serverTimestamp()
  }));
  await assertFails(setDoc(doc(db, "users", "fraud"), {
    name: "Perfil Fraudulento", email: "fraud@example.com",
    role: "trainer", active: true, coachCode: "EF-BBBBBBBBBBBB",
    createdAt: serverTimestamp()
  }));
});
