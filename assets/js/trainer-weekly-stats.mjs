// Cálculo independente de Firebase, usando o calendário local do treinador.
export function sessionsLastSevenDays(logs, reference = new Date()) {
  const end = new Date(reference.getFullYear(), reference.getMonth(), reference.getDate());
  const days = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(end);
    date.setDate(end.getDate() - 6 + index);
    return { date, key: date.getFullYear() + "-" + (date.getMonth() + 1) + "-" + date.getDate(),
      label: new Intl.DateTimeFormat("pt-BR", { weekday: "short" }).format(date).replace(".", ""), value: 0 };
  });
  const counts = new Map(days.map(day => [day.key, day]));
  for (const log of Array.isArray(logs) ? logs : []) {
    const value = log?.createdAt;
    const timestamp = typeof value?.toDate === "function" ? value.toDate() :
      Number.isFinite(value?.seconds) ? new Date(value.seconds * 1000) :
      value instanceof Date ? value : null;
    if (!(timestamp instanceof Date) || !Number.isFinite(timestamp.getTime())) continue;
    const key = timestamp.getFullYear() + "-" + (timestamp.getMonth() + 1) + "-" + timestamp.getDate();
    const target = counts.get(key);
    if (target && timestamp <= reference) target.value += 1;
  }
  return days.map(({label, value}) => ({label, value}));
}
