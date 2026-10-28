import test from "node:test";
import assert from "node:assert/strict";
import { generateCoachCode, validCoachCode, normalizeCoachCode } from "../coach-codes.mjs";
test("código exclusivo possui formato consistente e 12 caracteres aleatórios", () => {
 const code = generateCoachCode(Uint8Array.from([0,1,2,3,4,5,6,7,8,9,10,11]));
 assert.equal(code.length,15);
 assert.ok(validCoachCode(code));
 assert.equal(normalizeCoachCode(" ef-abcd efgh jklm "), "EF-ABCDEFGHIJKL");
 assert.ok(!validCoachCode("EF-ABCDEF"));
 assert.ok(!validCoachCode("EF-000000000000"));
});
test("gerador rejeita fontes aleatórias inválidas",() => {
 assert.throws(()=>generateCoachCode([]));
 assert.throws(()=>generateCoachCode(new Array(12).fill(999)));
});
