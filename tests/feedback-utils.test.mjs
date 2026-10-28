import test from "node:test";
import assert from "node:assert/strict";
import { cleanWorkoutFeedback, validWorkoutFeedback, feedbackStars, feedbackEffort } from "../feedback-utils.mjs";

test("feedback normalizado, validado e exibido com segurança", () => {
  const data = cleanWorkoutFeedback("4", "hard", " Gostei, mas cansativo! ");
  assert.deepEqual(data, { rating: 4, effort: "hard", comment: "Gostei, mas cansativo!" });
  assert.equal(validWorkoutFeedback(data), true);
  assert.equal(feedbackStars(data), "★★★★☆");
  assert.equal(feedbackEffort(data), "Muito puxado");
});
test("feedback inválido ou de registro antigo não quebra o histórico", () => {
  assert.equal(cleanWorkoutFeedback("0", "easy", ""), null);
  assert.equal(cleanWorkoutFeedback("6", "easy", ""), null);
  assert.equal(validWorkoutFeedback(undefined), false);
  assert.equal(feedbackStars(null), "");
  assert.equal(feedbackEffort({}), "");
});
test("comentário longo é limitado a 500 caracteres", () => {
  const feedback = cleanWorkoutFeedback(5, "balanced", "x".repeat(600));
  assert.equal(feedback.comment.length, 500);
  assert.equal(validWorkoutFeedback(feedback), true);
});
