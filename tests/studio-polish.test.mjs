import { testFilePath } from "./test-paths.mjs";
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const file = path => readFileSync(new URL("../" + testFilePath(path), import.meta.url), "utf8");

test("todas as páginas usam a identidade Studio sem estilos verdes antigos", () => {
  for (const page of ["index.html", "aluno.html", "treinador.html"]) {
    assert.ok(file(page).includes("studio.css"), page + " está sem tema");
  }
  for (const path of ["style.css", "evolve-ui.css", "pro-features.css", "studio.css", "app-icon.svg"]) {
    const css = file(path);
    const matches = [...css.matchAll(/#[a-f\d]{6}\b/gi)];
    const greens = matches.filter(match => {
      const channels = [1,3,5].map(i => parseInt(match[0].slice(i,i+2),16)/255);
      const max = Math.max(...channels), min = Math.min(...channels), delta = max - min;
      if (!delta) return false;
      const lightness = (max + min)/2;
      const saturation = delta/(1-Math.abs(2*lightness-1));
      let hue;
      switch(channels.indexOf(max)) {
        case 0: hue=((channels[1]-channels[2])/delta)%6;break;
        case 1: hue=(channels[2]-channels[0])/delta+2;break;
        default:hue=(channels[0]-channels[1])/delta+4;
      }
      hue=(hue*60+360)%360;
      return hue>=65 && hue<=190 && saturation>.12;
    });
    assert.deepEqual(greens.map(x=>x[0]),[],path + " contém verde legado");
  }
});

test("Ferramentas mantém biblioteca, calculadoras e player oficial", () => {
  const html=file("aluno.html"),tools=file("studio-tools.js"),music=file("studio-explore.js");
  for (const id of ["studio-exercise-library","studio-exercise-search","studio-plate-form",
    "studio-rm-form","studio-playlist-form","studio-playlist-preview","studio-playlist-player"])
    assert.ok(html.includes('id="'+id+'"'),"faltando "+id);
  assert.ok(html.includes("Ferramentas"));
  assert.ok(tools.includes("evolve:student-data"));
  assert.ok(music.includes("open.spotify.com/embed/"));
  assert.ok(music.includes("A-Za-z0-9"));
  assert.ok(!tools.includes("firebase-config"));
});

test("substituições ficam no rascunho local e não escrevem a ficha original", () => {
  const js=file("aluno.js");
  assert.ok(js.includes("exerciseReplacements"));
  assert.ok(js.includes("saveActiveWorkoutDraft(true)"));
  assert.ok(js.includes("A ficha do treinador não será alterada"));
  assert.ok(js.includes("workouts.flatMap(item => item.exercises || [])"));
  assert.ok(js.includes("Object.assign(exercise"));
  assert.ok(js.includes("workoutSnapshot(selectedWorkout)"));
});

test("gráficos contemplam peso, carga e repetições", () => {
  const student=file("aluno.html"),coach=file("treinador.html");
  assert.ok(student.includes('id="student-strength-metric"'));
  assert.ok(coach.includes('id="trainer-progress-metric"'));
  assert.ok(file("aluno.js").includes("bestRepProgress"));
  assert.ok(file("treinador.js").includes("bestRepProgress"));
});
