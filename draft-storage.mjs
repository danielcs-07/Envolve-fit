// Armazenamento local de rascunhos: nunca envia dados para o servidor.
const FORMAT_VERSION = 1;
export const DRAFT_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const PREFIX = "evolve-fit:local-draft:v1:";

export function draftKey(role, uid, kind) {
  if (!["student", "trainer"].includes(role) ||
      typeof uid !== "string" || !/^[A-Za-z0-9_-]{1,128}$/.test(uid) ||
      typeof kind !== "string" || !/^[A-Za-z0-9_-]{1,180}$/.test(kind)) {
    throw new Error("Identificação inválida para rascunho");
  }
  return PREFIX + role + ":" + uid + ":" + kind;
}

// Os navegadores podem bloquear armazenamento (modo privado, política, espaço cheio).
// Nenhuma falha de cache deve impedir um usuário de registrar seu treino.
export function writeDraft(storage, key, data, now = Date.now()) {
  try {
    if (!storage || !key || !Number.isFinite(now)) return false;
    storage.setItem(key, JSON.stringify({
      version: FORMAT_VERSION, savedAt: now, data
    }));
    return true;
  } catch {
    return false;
  }
}

export function readDraft(storage, key, now = Date.now(), ttlMs = DRAFT_TTL_MS) {
  try {
    if (!storage || !key) return null;
    const raw = storage.getItem(key);
    if (!raw) return null;
    const entry = JSON.parse(raw);
    if (!entry || entry.version !== FORMAT_VERSION ||
        !Number.isFinite(entry.savedAt) ||
        entry.savedAt < now - ttlMs || entry.savedAt > now + 60000 ||
        !entry.data || typeof entry.data !== "object" || Array.isArray(entry.data)) {
      storage.removeItem(key);
      return null;
    }
    return entry.data;
  } catch {
    // Remover JSON danificado, se possível; no restante, falhar com segurança.
    try { storage?.removeItem(key); } catch { /* armazenamento bloqueado */ }
    return null;
  }
}

export function removeDraft(storage, key) {
  try {
    if (!storage || !key) return false;
    storage.removeItem(key);
    return true;
  } catch {
    return false;
  }
}

export function clearUserDrafts(storage, role, uid) {
  try {
    const prefix = draftKey(role, uid, "all").slice(0, -"all".length);
    for (let i = storage.length - 1; i >= 0; i--) {
      const key = storage.key(i);
      if (key?.startsWith(prefix)) storage.removeItem(key);
    }
    return true;
  } catch {
    return false;
  }
}
