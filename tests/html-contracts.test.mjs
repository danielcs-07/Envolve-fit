import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync, existsSync} from "node:fs";

const html = name => readFileSync(new URL("../"+name,import.meta.url),"utf8");

test("páginas mantêm IDs exclusivos e recursos essenciais", () => {
  const pages=[
    ["index.html",["auth-form","email","password","forgot-password","submit-btn"]],
    ["aluno.html",["student-workout-list","active-workout","training-form","week-strip","student-progress-summary","student-password-reset","student-day-filter","workout-progress","rest-time","training-feedback","workout-feedback-comment","feedback-submit","feedback-skip","student-history-notice"]],
    ["treinador.html",["student-list","workout-list","workout-form","trainer-workout-search","trainer-progress-student","trainer-export-csv","trainer-password-reset","trainer-latest-feedback"]]
  ];
  for(const [file,ids] of pages) {
    const source=html(file);
    const allIds=[...source.matchAll(/\bid="([^"]+)"/g)].map(match=>match[1]);
    assert.equal(allIds.length,new Set(allIds).size,file+" contains repeated IDs");
    for(const id of ids) assert.ok(allIds.includes(id),file+" missing "+id);
    assert.ok(source.includes("pro-features.css"),file+" missing feature stylesheet");
    assert.ok(source.includes("manifest.webmanifest"),file+" missing manifest");
    assert.equal((source.match(/<\/body>/g)||[]).length,1);
    assert.equal((source.match(/<\/html>/g)||[]).length,1);
  }
});

test("PWA has a valid manifest and static resources", () => {
  const manifest=JSON.parse(readFileSync(new URL("../manifest.webmanifest",import.meta.url),"utf8"));
  assert.equal(manifest.start_url,"./index.html");
  assert.equal(manifest.scope,"./");
  for(const filename of ["sw.js","app-icon.svg","offline.html","fitness-utils.mjs","pro-features.css"]) {
    assert.ok(existsSync(new URL("../"+filename,import.meta.url)),filename+" missing");
  }
});

test("regras mantêm logs antigos e validam avaliação opcional", () => {
  const rules=readFileSync(new URL("../firestore.session-drafts.rules",import.meta.url),"utf8");
  assert.ok(rules.includes('"durationSeconds", "feedback"'));
  assert.ok(rules.includes('request.resource.data.feedback.rating'));
  assert.ok(rules.includes('request.resource.data.feedback.comment.size() <= 500'));
  assert.ok(rules.includes('request.resource.data.feedback.keys().hasOnly'));
});
