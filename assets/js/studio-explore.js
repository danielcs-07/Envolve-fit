// Recursos locais de áudio da área Ferramentas. Não gravam nem leem dados do Firebase.
(() => {
  "use strict";
  function setup() {
    const form = document.getElementById("studio-playlist-form");
    if (!form) return;
    const input = document.getElementById("studio-playlist-url");
    const output = document.getElementById("studio-playlist-status");
    const link = document.getElementById("studio-playlist-open");
    const preview = document.getElementById("studio-playlist-preview");
    const player = document.getElementById("studio-playlist-player");
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
    function spotifyEmbed(url) {
      try {
        const parsed = new URL(url);
        if (parsed.hostname !== "open.spotify.com") return "";
        const match = parsed.pathname.match(/^\/(playlist|album|track)\/([A-Za-z0-9]{22})\/?$/);
        return match ? "https://open.spotify.com/embed/" + match[1] + "/" + match[2] : "";
      } catch { return ""; }
    }
    function apply(url) {
      const safe = valid(url);
      link.hidden = !safe;
      preview.hidden = !safe || !spotifyEmbed(safe);
      player.hidden = true;
      player.replaceChildren();
      preview.textContent = "▶ Ouvir aqui pelo Spotify";
      if (safe) {
        link.href = safe;
        link.target = "_blank";
        link.rel = "noopener noreferrer";
      } else link.removeAttribute("href");
    }
    preview.addEventListener("click", () => {
      const embed = spotifyEmbed(input.value.trim());
      if (!embed) return;
      if (!player.hidden) {
        player.hidden = true;
        player.replaceChildren();
        preview.textContent = "▶ Ouvir aqui pelo Spotify";
        return;
      }
      const frame = document.createElement("iframe");
      frame.src = embed;
      frame.title = "Player oficial do Spotify";
      frame.setAttribute("allow", "autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture");
      frame.loading = "lazy";
      frame.allowFullscreen = true;
      frame.referrerPolicy = "strict-origin-when-cross-origin";
      player.append(frame);
      player.hidden = false;
      preview.textContent = "Fechar player";
    });
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
