// A coach code is an opaque identifier, NOT a login credential or authorization token.
export const COACH_CODE_PATTERN = /^EF-[A-HJ-NP-Z2-9]{12}$/;
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function normalizeCoachCode(value) {
  return String(value || "").toUpperCase().replace(/\s+/g, "").trim();
}

export function validCoachCode(code) {
  return COACH_CODE_PATTERN.test(normalizeCoachCode(code));
}

export function generateCoachCode(bytes) {
  if (!bytes || bytes.length !== 12) throw new Error("12 random bytes required");
  let result = "EF-";
  for (const byte of bytes) {
    if (!Number.isInteger(byte) || byte < 0 || byte > 255) throw new Error("Invalid random byte");
    result += ALPHABET[byte % ALPHABET.length];
  }
  return result;
}
