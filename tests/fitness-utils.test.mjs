import test from "node:test";
import assert from "node:assert/strict";
import {
  normalizeDay, localDay, weekDates, numberOfSeries,
  trainingVolume, bestSetProgress, uniqueExercises, recentLogs,
  recordedSeriesCount, trainingConsistency, personalRecords
} from "../assets/js/fitness-utils.mjs";

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

const logAt = (year, month, day, workoutId, exercises) => ({
  workoutId,
  createdAt: { seconds: Math.floor(date(year, month, day).getTime() / 1000) },
  exercises
});

test("consistência conta semanas distintas nas últimas quatro, sem contar o futuro", () => {
  const today = date(2026, 10, 21);
  today.setHours(20);
  const logs = [
    logAt(2026, 9, 27, "a", []), // fora da janela de quatro semanas
    logAt(2026, 9, 29, "a", []), // semana 1
    logAt(2026, 10, 5, "a", []), // semana 2
    logAt(2026, 10, 7, "b", []), // semana 2, não duplica
    logAt(2026, 10, 19, "a", []), // semana 4
    logAt(2026, 10, 26, "a", []) // futuro
  ];
  assert.deepEqual(trainingConsistency(logs, today), {
    activeWeeks: 3, totalWeeks: 4, percent: 75
  });
  assert.deepEqual(trainingConsistency([], today), {
    activeWeeks: 0, totalWeeks: 4, percent: 0
  });
});

test("PR registra a carga e repetição verdadeiras e calcula ganho versus PR anterior", () => {
  const logs = [
    logAt(2026, 10, 7, "w1", [
      { name: "Puxada frente", series: [{ weight: 23, reps: 8 }, { weight: 21, reps: 12 }] }
    ]),
    logAt(2026, 10, 5, "w1", [
      { name: "Puxada frente", series: [{ weight: 20, reps: 10 }] },
      { name: "Esteira", series: [{ weight: 0, reps: 30 }] }
    ]),
    logAt(2026, 10, 9, "w1", [
      { name: "puxada frente", series: [{ weight: 23, reps: 11 }] }
    ]),
    logAt(2026, 10, 11, "w1", [
      { name: "Puxada frente", series: [{ weight: 22, reps: 15 }] }
    ])
  ];
  const [record] = personalRecords(logs, [{ id: "w1", day: "terça" }]);
  assert.equal(personalRecords(logs, [{ id: "w1", day: "terça" }]).length, 1);
  assert.equal(record.weight, 23);
  assert.equal(record.reps, 11);
  assert.equal(record.gainKg, 3);
  assert.equal(record.gainReps, 3);
  assert.equal(record.day, "terca");
  assert.equal(record.daySource, "ficha");
  assert.equal(record.date.getDate(), 9);
  assert.equal(record.hasPrevious, true);
});

test("primeiro registro é referência e ficha excluída usa dia do registro", () => {
  const logs = [
    logAt(2026, 10, 9, "deleted-workout", [
      { name: "Remada", series: [{ weight: 18.5, reps: 12 }] }
    ])
  ];
  const [record] = personalRecords(logs, []);
  assert.equal(record.weight, 18.5);
  assert.equal(record.reps, 12);
  assert.equal(record.gainKg, null);
  assert.equal(record.gainReps, null);
  assert.equal(record.day, "sexta");
  assert.equal(record.daySource, "registro");
  assert.equal(record.hasPrevious, false);
});

test("ignora séries inválidas e conta somente séries efetivamente salvas", () => {
  const log = logAt(2026, 10, 19, "w1", [
    { name: "Supino", series: [
      { weight: 0, reps: 12 },
      { weight: -3, reps: 10 },
      { weight: 10, reps: 0 },
      { weight: 12, reps: 8 }
    ] },
    { name: "Abdominal", series: [{ weight: 0, reps: 15 }] }
  ]);
  assert.equal(recordedSeriesCount(log), 5);
  assert.equal(recordedSeriesCount({ exercises: [] }), 0);
  const records = personalRecords([log]);
  assert.equal(records.length, 1);
  assert.equal(records[0].name, "Supino");
  assert.equal(records[0].weight, 12);
  assert.equal(records[0].reps, 8);
});
