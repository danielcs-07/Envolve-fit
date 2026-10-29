import { testFilePath } from "./test-paths.mjs";
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const read = path => readFileSync(new URL("../" + testFilePath(path),import.meta.url),"utf8");

test("cartão de continuação e recursos de série presentes na tela do aluno",()=>{
  const html=read("aluno.html");
  for(const id of ["studio-session-banner","studio-session-name","studio-session-count",
    "studio-session-progress","studio-resume-workout"])
    assert.ok(html.includes('id="'+id+'"'),"ID ausente: "+id);
  assert.ok(html.includes("Minimizar"));
  assert.ok(html.includes("studio-session.css?v=20261028-session-v1"));
});

test("minimizar não encerra, apaga ou reinicia treino ativo",()=>{
  const js=read("aluno.js");
  const begin=js.indexOf('$("close-workout").onclick = () => {');
  const end=js.indexOf('$("discard-workout-draft").onclick',begin);
  assert.ok(begin>0 && end>begin);
  const minimize=js.slice(begin,end);
  assert.ok(minimize.includes("saveActiveWorkoutDraft(true)"));
  assert.ok(minimize.includes('showTab("dashboard")'));
  assert.ok(minimize.includes('$("active-workout").hidden = true'));
  for(const forbidden of ["selectedWorkout = null","stopSessionClock()","stopRestTimer()",
    "removeCloudDraft()","removeDraft(","sessionStartedAt = 0","clearFeedbackUI()"])
    assert.ok(!minimize.includes(forbidden),"Minimizar pode descartar informação: "+forbidden);
});

test("retomar mesma ficha não reinicia o cronômetro ou séries",()=>{
  const js=read("aluno.js");
  assert.ok(js.includes('selectedWorkout?.id === workout.id && !ignoreDraft'));
  assert.ok(js.includes('Há outro treino em andamento.'));
  assert.ok(js.includes('updateFloatingSession()'));
  assert.ok(js.includes('"studio-session-count"'));
  assert.ok(js.includes('selectedWorkout.id !== workout.id'));
  assert.ok(js.includes('saveActiveWorkoutDraft(true)'));
});

test("repetir série copia somente carga e repetições e mantém conclusão manual",()=>{
  const js=read("aluno.js");
  const start=js.indexOf('const repeat = make("button", "studio-repeat-set"');
  const end=js.indexOf('row.append(repeat)',start);
  assert.ok(start>0 && end>start);
  const logic=js.slice(start,end);
  assert.ok(logic.includes("weight.value = kg"));
  assert.ok(logic.includes("reps.value = count"));
  assert.ok(!logic.includes("checked = true"));
  assert.ok(logic.includes("saveActiveWorkoutDraft(true)"));
});

test("barra visível acima da navegação móvel e com cores de modo escuro",()=>{
 const css=read("studio-session.css");
 assert.equal((css.match(/\{/g)||[]).length,(css.match(/\}/g)||[]).length);
 for(const required of ["safe-area-inset-bottom","studio-session-banner[hidden]",
   'data-studio-theme="dark"',"studio-repeat-set","max-width:900px"])
   assert.ok(css.includes(required),required);
 assert.ok(read("sw.js").includes("studio-session.css"));
});
