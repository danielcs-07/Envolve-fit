// Recursos locais da área Explorar. Não gravam nem leem dados do Firebase.
(() => {
  "use strict";
  function setup() {
    const form = document.getElementById("studio-playlist-form");
    if (!form) return;
    const input = document.getElementById("studio-playlist-url");
    const output = document.getElementById("studio-playlist-status");
    const link = document.getElementById("studio-playlist-open");
    const KEY = "evolve-fit:studio:playlist-url";
    const allowed = new Set([
      "open.spotify.com", "music.youtube.com", "www.youtube.com",
      "youtube.com", "youtu.be", "www.deezer.com", "deezer.com"
    ]);
    function valid(url) {
      try {
        const parsed = new URL(url);
        return parsed.protocol === "https:" && allowed.has(parsed.hostname.toLowerCase())
          ? parsed.href : null;
      } catch { return null; }
    }
    function apply(url) {
      const safe = valid(url);
      link.hidden = !safe;
      if (safe) {
        link.href = safe;
        link.target = "_blank";
        link.rel = "noopener noreferrer";
      } else link.removeAttribute("href");
    }
    try {
      const saved = localStorage.getItem(KEY);
      if (saved && valid(saved)) { input.value = saved; apply(saved); }
    } catch { /* sem armazenamento, formulário continua funcional */ }
    form.addEventListener("submit", event => {
      event.preventDefault();
      const url = valid(input.value.trim());
      if (!url) {
        output.textContent = "Cole um link HTTPS do Spotify, YouTube Music, YouTube ou Deezer.";
        apply("");
        return;
      }
      try { localStorage.setItem(KEY, url); }
      catch { output.textContent = "Link aberto, mas o navegador não permitiu salvá-lo."; apply(url); return; }
      output.textContent = "✓ Playlist favorita salva neste navegador.";
      apply(url);
    });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", setup);
  else setup();
})();
