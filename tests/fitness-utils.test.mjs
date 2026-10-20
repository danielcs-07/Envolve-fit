import test from "node:test";
import assert from "node:assert/strict";
import {
  normalizeDay, localDay, weekDates, numberOfSeries,
  trainingVolume, bestSetProgress, uniqueExercises, recentLogs
} from "../fitness-utils.mjs";

const date = (year, month, day) => new Date(year, month - 1, day);

test("normaliza dias da semana e respeita calendário de segunda a domingo", () => {
  assert.equal(normalizeDay("terça-feira"), "terca");
  assert.equal(normalizeDay("Sábado"), "sabado");
  assert.equal(normalizeDay(""), "");
  const monday = date(2026, 10, 19);
  assert.equal(localDay(monday), "segunda");
  const items = weekDates(date(2026, 10, 20));
  assert.equal(items.length, 7);
  assert.equal(items[0].date.getDate(), 19);
  assert.equal(items[6].date.getDate(), 25);
  assert.equal(items.filter(item => item.today).length, 1);
});

test("calcula séries e volume de treino mesmo com conjuntos parciais", () => {
  assert.equal(numberOfSeries({exercises: [{sets: 3}, {sets: 4}]}), 7);
  assert.equal(trainingVolume({exercises: [
    {name:"Supino",series:[{weight:10,reps:12},{weight:12,reps:10}]},
    {name:"Flexão",series:[{weight:0,reps:15}]}
  ]}), 240);
  assert.equal(trainingVolume({exercises:[]}), 0);
});

test("progressão separa exercícios e respeita datas", () => {
  const logs = [
    {createdAt:{seconds:2000}, exercises:[{name:"Remada",series:[{weight:30,reps:10}]},{name:"Supino",series:[{weight:20,reps:10}]}]},
    {createdAt:{seconds:1000}, exercises:[{name:"Supino",series:[{weight:15,reps:10}]}]},
    {createdAt:{seconds:3000}, exercises:[{name:"Supino",series:[{weight:25,reps:12}]}]}
  ];
  assert.deepEqual(bestSetProgress(logs,"Supino").map(point => point.value),[15,20,25]);
  assert.deepEqual(bestSetProgress(logs,"Remada").map(point => point.value),[30]);
  assert.deepEqual(uniqueExercises(logs),["Remada","Supino"]);
});

test("contagem recente não inclui sessões fora da janela", () => {
  const today=date(2026,10,20);
  today.setHours(16);
  const logs=[
    {createdAt:{seconds:Math.floor(date(2026,10,18).getTime()/1000)}},
    {createdAt:{seconds:Math.floor(date(2026,10,5).getTime()/1000)}}
  ];
  assert.equal(recentLogs(logs,7,today).length,1);
});