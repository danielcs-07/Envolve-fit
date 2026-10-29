// Dados opcionais do feedback; registros antigos continuam válidos.
export const EFFORT_LABELS = Object.freeze({
  easy: "Fácil",
  balanced: "Na medida",
  hard: "Muito puxado"
});

export function cleanWorkoutFeedback(rating, effort, comment) {
  const stars = Number(rating);
  if (!Number.isInteger(stars) || stars < 1 || stars > 5) return null;
  const intensity = Object.hasOwn(EFFORT_LABELS, effort) ? effort : "balanced";
  return {
    rating: stars,
    effort: intensity,
    comment: String(comment || "").trim().slice(0, 500)
  };
}

export function validWorkoutFeedback(value) {
  return Boolean(value && typeof value === "object" && !Array.isArray(value) &&
    Number.isInteger(value.rating) && value.rating >= 1 && value.rating <= 5 &&
    Object.hasOwn(EFFORT_LABELS, value.effort) &&
    typeof value.comment === "string" && value.comment.length <= 500);
}

export function feedbackStars(feedback) {
  return validWorkoutFeedback(feedback) ? "★".repeat(feedback.rating) + "☆".repeat(5 - feedback.rating) : "";
}

export function feedbackEffort(feedback) {
  return validWorkoutFeedback(feedback) ? EFFORT_LABELS[feedback.effort] : "";
}
