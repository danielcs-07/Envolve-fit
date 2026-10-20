export const WEEK_DAYS = [
  { key: "segunda", short: "SEG", label: "Segunda-feira" },
  { key: "terca", short: "TER", label: "Terça-feira" },
  { key: "quarta", short: "QUA", label: "Quarta-feira" },
  { key: "quinta", short: "QUI", label: "Quinta-feira" },
  { key: "sexta", short: "SEX", label: "Sexta-feira" },
  { key: "sabado", short: "SÁB", label: "Sábado" },
  { key: "domingo", short: "DOM", label: "Domingo" }
];

export function normalizeDay(day) {
  const value = String(day || "").trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const names = {
    segunda: "segunda", "segunda-feira": "segunda",
    terca: "terca", "terca-feira": "terca",
    quarta: "quarta", "quarta-feira": "quarta",
    quinta: "quinta", "quinta-feira": "quinta",
    sexta: "sexta", "sexta-feira": "sexta",
    sabado: "sabado", domingo: "domingo"
  };
  return names[value] || "";
}

export function localDay(date = new Date()) {
  return WEEK_DAYS[(date.getDay() + 6) % 7].key;
}

export function weekDates(reference = new Date()) {
  const monday = new Date(reference.getFullYear(), reference.getMonth(), reference.getDate());
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
  return WEEK_DAYS.map((day, i) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + i);
    return { ...day, date, today: date.toDateString() === reference.toDateString() };
  });
}

export function timestampDate(timestamp) {
  if (timestamp?.toDate) return timestamp.toDate();
  if (timestamp?.seconds != null) return new Date(timestamp.seconds * 1000);
  if (timestamp instanceof Date) return timestamp;
  return null;
}

export function recentLogs(logs, days = 7, today = new Date()) {
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  start.setDate(start.getDate() - (days - 1));
  return logs.filter(log => {
    const date = timestampDate(log.createdAt);
    return date && date >= start && date <= today;
  });
}

export function numberOfSeries(workout) {
  return (workout?.exercises || []).reduce((sum, exercise) => sum + (Number(exercise.sets) || 0), 0);
}

export function trainingVolume(log) {
  return (log?.exercises || []).reduce((sum, exercise) => sum +
    (exercise.series || []).reduce((total, series) =>
      total + (Number(series.weight) || 0) * (Number(series.reps) || 0), 0), 0);
}

export function bestSetProgress(logs, exerciseName) {
  if (!exerciseName) return [];
  const target = exerciseName.trim().toLocaleLowerCase("pt-BR");
  return [...logs].sort((a, b) =>
    (timestampDate(a.createdAt)?.getTime() || 0) -
    (timestampDate(b.createdAt)?.getTime() || 0)
  ).map(log => {
    const matching = (log.exercises || []).filter(ex =>
      String(ex.name || "").trim().toLocaleLowerCase("pt-BR") === target
    );
    const best = Math.max(0, ...matching.flatMap(ex =>
      (ex.series || []).map(s => Number(s.weight) || 0)
    ));
    const date = timestampDate(log.createdAt);
    return best > 0 && date ? {
      value: best,
      label: date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })
    } : null;
  }).filter(Boolean);
}

export function uniqueExercises(logs) {
  return [...new Set(logs.flatMap(log =>
    (log.exercises || []).map(ex => String(ex.name || "").trim()).filter(Boolean)
  ))].sort((a,b) => a.localeCompare(b, "pt-BR"));
}
