import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const read = name => readFileSync(new URL("../" + name, import.meta.url), "utf8");

test("Studio tem navegação íntegra nos dois painéis", () => {
  for (const file of ["aluno.html", "treinador.html"]) {
    const html = read(file);
    const tabs = [...html.matchAll(/data-tab="([^"]+)"/g)].map(match => match[1]);
    const sections = [...html.matchAll(/id="tab-([^"]+)"/g)].map(match => match[1]);
    assert.ok(tabs.length >= 6);
    for (const tab of tabs) assert.ok(sections.includes(tab), file + ": tab ausente " + tab);
    const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
    assert.equal(ids.length, new Set(ids).size, file + ": ID duplicado");
    assert.ok(html.includes("studio.css"), file + ": CSS não carregado");
    assert.ok(html.includes("studio-shell.js"), file + ": tema não carregado");
    assert.ok(html.includes("data-studio-logout"), file + ": falta saída no celular");
  }
});

test("Explorar e modelos não dependem de alteração no Firebase", () => {
  const aluno = read("aluno.html");
  const trainer = read("treinador.html");
  assert.ok(aluno.includes('id="tab-explore"'));
  assert.ok(aluno.includes('id="studio-playlist-form"'));
  assert.ok(aluno.includes('id="studio-playlist-open"'));
  assert.ok(trainer.includes('id="tab-models"'));
  for (const name of ["full", "upper", "lower"]) assert.ok(trainer.includes('data-studio-model="' + name + '"'));
  const js = read("studio-explore.js");
  assert.ok(!js.includes("firebase-config"));
  assert.ok(!js.includes("collection("));
});

test("novos scripts e CSS têm estrutura válida", () => {
  for (const filename of ["studio-shell.js", "studio-explore.js"]) {
    assert.doesNotThrow(() => new Function(read(filename)), filename);
  }
  const css = read("studio.css");
  assert.equal((css.match(/{/g) || []).length, (css.match(/}/g) || []).length);
  assert.ok(css.includes('data-studio-theme="dark"'));
  assert.ok(css.includes('@media(max-width:900px)'));
  assert.ok(read("sw.js").includes('"./studio.css"'));
});
