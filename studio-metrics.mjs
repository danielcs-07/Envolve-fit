// Métricas calculadas somente a partir do histórico disponível.
export function bestRepProgress(logs, exerciseName) {
  const target = String(exerciseName || "").trim().toLocaleLowerCase("pt-BR");
  if (!target || !Array.isArray(logs)) return [];
  return [...logs].sort((a,b) =>
    (a.createdAt?.seconds ?? 0) - (b.createdAt?.seconds ?? 0)
  ).flatMap(log => {
    const series = (log.exercises || []).filter(ex =>
      String(ex.name || "").trim().toLocaleLowerCase("pt-BR") === target)
      .flatMap(ex => Array.isArray(ex.series) ? ex.series : []);
    const reps = series.reduce((max, item) => {
      const n = Number(item.reps);
      return Number.isInteger(n) && n > 0 && n <= 1000 ? Math.max(max,n) : max;
    },0);
    if (!reps) return [];
    const date = log.createdAt?.toDate?.() ||
      (Number.isFinite(log.createdAt?.seconds) ?
        new Date(log.createdAt.seconds * 1000) : null);
    return [{
      value: reps,
      label: date && Number.isFinite(date.getTime())
        ? date.toLocaleDateString("pt-BR",{day:"2-digit",month:"2-digit"})
        : "Sessão"
    }];
  });
}
