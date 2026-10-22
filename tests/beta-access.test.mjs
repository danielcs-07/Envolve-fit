import test from "node:test";
import assert from "node:assert/strict";
import { trainerFromInvite, isTrainerSignup, buildStudentInvite } from "../beta-access.mjs";

const uid = "abc12345678901234567";
test("o link aceita somente UIDs de treinador no formato esperado", () => {
  assert.equal(trainerFromInvite("?personal=" + uid), uid);
  assert.equal(trainerFromInvite("?personal=../outro"), "");
  assert.equal(trainerFromInvite("?personal="), "");
});
test("solicitacao de personal exige a URL beta", () => {
  assert.equal(isTrainerSignup("?beta=personal"), true);
  assert.equal(isTrainerSignup("?beta=aluno"), false);
});
test("convite aponta para a pagina de cadastro correta", () => {
  const link = buildStudentInvite("https://exemplo.com/Envolve-fit/treinador.html", uid);
  assert.equal(link, "https://exemplo.com/Envolve-fit/index.html?personal=" + uid);
  assert.throws(() => buildStudentInvite("https://exemplo.com", "invalido"));
});
