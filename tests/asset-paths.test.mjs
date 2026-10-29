import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const site = "https://exemplo.test/Envolve-fit/";
const htmlPages = ["index.html", "aluno.html", "treinador.html"];
const read = filename => readFileSync(join(root, filename), "utf8");

function assertLocalReference(source, ref, context) {
  const url = new URL(ref, new URL(source, site));
  if (url.origin !== "https://exemplo.test") return;
  if (!url.pathname.startsWith("/Envolve-fit/")) return;
  const filename = decodeURIComponent(url.pathname.slice("/Envolve-fit/".length));
  assert.ok(existsSync(join(root, filename)), context + ": arquivo ausente " + filename);
}

test("páginas carregam todos os CSS, JS, ícone e manifesto após organização", () => {
  for (const page of htmlPages) {
    const content = read(page);
    for (const tag of content.matchAll(/<(?:script|link)\b[^>]*>/g)) {
      const src = /\b(?:href|src)="([^"]+)"/.exec(tag[0]);
      if (src) assertLocalReference(page, src[1], page);
    }
  }
});

test("módulos JavaScript preservam imports relativos válidos", () => {
  for (const filename of readdirSync(join(root, "assets/js"))) {
    if (!/\.(?:js|mjs)$/.test(filename)) continue;
    const source = "assets/js/" + filename;
    for (const imported of read(source).matchAll(/\bfrom\s*["'](\.[^"']+)["']/g)) {
      assertLocalReference(source, imported[1], source);
    }
  }
});

test("Service Worker pré-armazena apenas arquivos que existem", () => {
  const sw = read("sw.js");
  const match = sw.match(/const STATIC = (\[[^;]*\]);/);
  assert.ok(match, "Lista de recursos offline não encontrada");
  for (const asset of JSON.parse(match[1])) assertLocalReference("sw.js", asset, "cache offline");
  assert.ok(sw.includes("evolve-fit-v8-20261029-structure"), "Cache precisa mudar de versão");
});

test("rotas das páginas e escopo da PWA continuam na raiz", () => {
  for (const page of ["index.html", "treinador.html", "aluno.html", "offline.html", "sw.js"])
    assert.ok(existsSync(join(root, page)), "Rota essencial ausente: " + page);
  const manifest = JSON.parse(read("manifest.webmanifest"));
  assert.equal(manifest.start_url, "./index.html");
  assert.equal(manifest.scope, "./");
});
