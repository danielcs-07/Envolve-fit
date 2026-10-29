import test from "node:test";
import assert from "node:assert/strict";
import { bestRepProgress } from "../assets/js/studio-metrics.mjs";
test("progressão de repetições por exercício, sem misturar outros movimentos", () => {
 const logs=[
 { createdAt: { seconds: 200 },exercises:[{name:"Supino",series:[{reps:8},{reps:12}]}]},
 { createdAt: { seconds: 100 },exercises:[{name:"Supino",series:[{reps:10}]},{name:"Puxada",series:[{reps:30}]}]}
 ];
 assert.deepEqual(bestRepProgress(logs,"supino").map(x=>x.value),[10,12]);
 assert.deepEqual(bestRepProgress(logs,"puxada").map(x=>x.value),[30]);
});
test("dados inválidos e registros antigos não inventam resultados",()=>{
 assert.deepEqual(bestRepProgress([], "supino"), []);
 assert.deepEqual(bestRepProgress([{exercises:[{name:"Supino",series:[{reps:null},{reps:-2}]}]}],"supino"),[]);
});
