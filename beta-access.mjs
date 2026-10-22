// Funcoes compartilhadas pela versao beta. Nenhuma delas substitui as regras do Firestore.
export function trainerFromInvite(search) {
  const value = new URLSearchParams(search).get("personal") || "";
  return /^[a-zA-Z0-9]{20,128}$/.test(value) ? value : "";
}

export function isTrainerSignup(search) {
  return new URLSearchParams(search).get("beta") === "personal";
}

export function buildStudentInvite(pageUrl, trainerUid) {
  if (!/^[a-zA-Z0-9]{20,128}$/.test(trainerUid)) {
    throw new Error("Identificador de treinador invalido.");
  }
  const url = new URL("index.html", pageUrl);
  url.search = "";
  url.hash = "";
  url.searchParams.set("personal", trainerUid);
  return url.toString();
}
