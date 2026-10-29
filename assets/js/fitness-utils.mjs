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

export function compareWorkoutDays(a, b) {
  const rank = day => {
    const index = WEEK_DAYS.findIndex(item => item.key === normalizeDay(day));
    return index < 0 ? WEEK_DAYS.length : index;
  };
  return rank(a.day) - rank(b.day);
}


// O histórico não distingue "concluído por inteiro" de "salvo parcialmente".
// Esta contagem inclui apenas séries efetivamente registradas.
export function recordedSeriesCount(log) {
  return (log?.exercises || []).reduce((total, exercise) =>
    total + (Array.isArray(exercise.series) ? exercise.series.length : 0), 0);
}

// Consistência = semanas com ao menos um treino salvo nas 4 semanas de calendário
// mais recentes (incluindo a semana atual). Não é frequência prescrita.
export function trainingConsistency(logs, today = new Date(), weeks = 4) {
  const totalWeeks = Number.isFinite(weeks)
    ? Math.max(1, Math.min(12, Math.trunc(weeks))) : 4;
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7) - (totalWeeks - 1) * 7);
  const active = new Set();
  for (const log of logs || []) {
    const date = timestampDate(log.createdAt);
    if (!date || !Number.isFinite(date.getTime()) || date < start || date > today) continue;
    const monday = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
    active.add([monday.getFullYear(), monday.getMonth(), monday.getDate()].join("-"));
  }
  return {
    activeWeeks: active.size,
    totalWeeks,
    percent: Math.round(active.size / totalWeeks * 100)
  };
}

// PR de carga: série de maior peso (em empate, maior número de repetições)
// para cada exercício. O ganho em kg é comparado ao recorde anterior, não
// ao volume somado da sessão. As séries de peso corporal (0 kg) ficam fora.
export function personalRecords(logs, workouts = []) {
  const workoutDays = new Map((workouts || [])
    .filter(workout => workout?.id && normalizeDay(workout.day))
    .map(workout => [workout.id, normalizeDay(workout.day)]));

  const datedLogs = (logs || []).map((log, index) => ({
    log, index, date: timestampDate(log.createdAt)
  })).filter(item => item.date && Number.isFinite(item.date.getTime()))
    .sort((a, b) => a.date - b.date || a.index - b.index);

  const records = new Map();
  for (const { log, date } of datedLogs) {
    for (const exercise of log.exercises || []) {
      const name = String(exercise.name || "").trim();
      if (!name) continue;

      let sessionBest = null;
      for (const series of exercise.series || []) {
        const weight = Number(series.weight);
        const reps = Number(series.reps);
        if (!Number.isFinite(weight) || weight <= 0 ||
            !Number.isInteger(reps) || reps <= 0) continue;
        if (!sessionBest || weight > sessionBest.weight ||
            (weight === sessionBest.weight && reps > sessionBest.reps)) {
          sessionBest = { weight, reps };
        }
      }
      if (!sessionBest) continue;

      const key = name.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        .toLocaleLowerCase("pt-BR");
      const previous = records.get(key);
      if (previous && (sessionBest.weight < previous.weight ||
        (sessionBest.weight === previous.weight && sessionBest.reps <= previous.reps))) {
        continue;
      }

      const prescribedDay = workoutDays.get(log.workoutId);
      const day = prescribedDay || localDay(date);
      records.set(key, {
        name,
        day,
        daySource: prescribedDay ? "ficha" : "registro",
        weight: sessionBest.weight,
        reps: sessionBest.reps,
        date,
        // Mantém o último ganho real em kg quando o atleta melhora
        // só as repetições com o mesmo peso.
        gainKg: previous
          ? sessionBest.weight > previous.weight
            ? sessionBest.weight - previous.weight
            : previous.gainKg
          : null,
        gainReps: previous && sessionBest.weight === previous.weight
          ? sessionBest.reps - previous.reps
          : null,
        hasPrevious: Boolean(previous)
      });
    }
  }
  return [...records.values()].sort((a, b) =>
    b.date - a.date || a.name.localeCompare(b.name, "pt-BR"));
}
