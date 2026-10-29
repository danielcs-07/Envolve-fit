import { testFilePath } from "./test-paths.mjs";
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const read = path => readFileSync(new URL("../" + testFilePath(path),import.meta.url),"utf8");

test("painéis carregam dock moderno mantendo todas as telas originais", () => {
  for(const file of ["aluno.html","treinador.html"]){
    const html=read(file);
    const tabs=[...html.matchAll(/data-tab="([^"]+)"/g)].map(match=>match[1]);
    const screens=[...html.matchAll(/id="tab-([^"]+)"/g)].map(match=>match[1]);
    assert.ok(html.includes("studio-navigation.css?v=20261028-dock-v1"));
    assert.ok(html.includes("studio-navigation.js?v=20261028-dock-v1"));
    assert.ok(tabs.length>=6);
    assert.ok(tabs.every(tab=>screens.includes(tab)), "Faltou tela para botão em "+file);
    assert.equal(tabs.length,new Set(tabs).size);
  }
});

test("dock com quatro ações principais, Mais e menu acessível",()=>{
  const code=read("studio-navigation.js");
  assert.ok(code.includes('primary: ["dashboard","history","workouts","progress"]'));
  assert.ok(code.includes('primary: ["dashboard","students","create","workouts"]'));
  assert.ok(code.includes('more: ["explore","profile"]'));
  assert.ok(code.includes('more: ["models","history","progress","profile"]'));
  for(const literal of [
    'aria-modal','aria-labelledby','aria-controls','aria-expanded','aria-current',
    'MutationObserver','Escape','Tab','focus','closeSheet','document.getElementById("logout")'
  ]) assert.ok(code.includes(literal), literal + " não encontrado");
  assert.ok(code.includes("button.click()"),"Deve reutilizar o fluxo de navegação existente");
  assert.ok(!code.includes("firebase-config"),"Dock não pode acessar dados privados");
});

test("dock prioriza área segura, 5 colunas e modo escuro",()=>{
  const css=read("studio-navigation.css");
  assert.ok(css.includes("repeat(5, minmax(0, 1fr))"));
  assert.ok(css.includes("safe-area-inset-bottom"));
  assert.ok(css.includes('data-studio-theme="dark"'));
  assert.ok(css.includes(".studio-more-overlay:not([hidden])"));
  assert.ok(css.includes(".dashboard-page .sidebar {\n    display: none !important;"));
  assert.ok(css.includes("@media (max-width:900px)"));
  assert.ok(css.includes("@media (min-width:901px)"));
  assert.ok(read("sw.js").includes("studio-navigation.js"));
  assert.equal((css.match(/\{/g)||[]).length,(css.match(/\}/g)||[]).length);
});

test("script é parseável e mantém eventos nativos das abas",()=>{
  assert.doesNotThrow(()=>new Function(read("studio-navigation.js")));
  assert.ok(read("aluno.js").includes("querySelectorAll(\".nav-item\")"));
  assert.ok(read("treinador.js").includes("querySelectorAll(\".nav-item\")"));
});
