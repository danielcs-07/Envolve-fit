// Funções puras para retomar treinos após o navegador reiniciar.
export function workoutSnapshot(workout) {
  return {
    id: workout.id,
    name: workout.name,
    description: workout.description || "",
    day: workout.day || "",
    exercises: (workout.exercises || []).map(ex => ({
      name: ex.name, sets: ex.sets, reps: ex.reps, rest: ex.rest,
      notes: ex.notes || "", video: ex.video || "",
      videoAlternative: ex.videoAlternative || ""
    }))
  };
}

export function usableSnapshot(workout, expectedId) {
  return Boolean(workout && workout.id === expectedId &&
    typeof workout.name === "string" &&
    Array.isArray(workout.exercises) &&
    workout.exercises.length > 0 &&
    workout.exercises.length <= 100 &&
    workout.exercises.every(ex => ex &&
      typeof ex.name === "string" && Number(ex.sets) > 0 && Number(ex.sets) <= 20));
}

export function resumeWorkout(pending, availableWorkouts) {
  if (!pending || typeof pending.workoutId !== "string") return null;
  return availableWorkouts.find(workout => workout.id === pending.workoutId) ||
    (usableSnapshot(pending.workoutSnapshot, pending.workoutId)
      ? pending.workoutSnapshot : null);
}
