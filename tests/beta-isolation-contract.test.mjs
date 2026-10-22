import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const get = path => readFileSync(new URL("../" + path, import.meta.url), "utf8");

test("nenhuma consulta global sobre registros pessoais no painel do treinador", () => {
  const source = get("treinador.js");
  for (const collectionName of ["users", "workouts", "trainingLogs", "measurements"]) {
    assert.doesNotMatch(source, new RegExp('getDocs\\(collection\\(db,\\s*["\\x27]' + collectionName));
    assert.match(source, new RegExp('where\\("trainerId",\\s*"==",\\s*currentUser.uid\\)'));
  }
});
test("aprovacao de alunos exige filtro por treinador", () => {
  const source = get("aprovacao.js");
  assert.match(source, /where\("trainerId",\s*"==",\s*trainerId\)/);
  assert.match(source, /await loadPendingStudents\(user.uid\)/);
});
test("logs e medidas novos carregam identificador do treinador", () => {
  const source = get("aluno.js");
  assert.match(source, /trainerId:\s*currentTrainerId,\s*workoutId/);
  assert.match(source, /trainerId:\s*currentTrainerId,\s*weight/);
});
test("regras beta requerem propriedade do treinador", () => {
  const source = get("firestore.beta.rules");
  for (const collectionName of ["users", "workouts", "trainingLogs", "measurements"]) {
    assert.ok(source.includes("match /" + collectionName + "/{"));
  }
  assert.match(source, /resource\.data\.trainerId == request\.auth\.uid/);
  assert.match(source, /request\.resource\.data\.trainerId == myTrainerId\(\)/);
});
