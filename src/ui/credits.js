// =====================================================================
// credits.js — a small in-game credits panel (start menu → "♪ Credits").
// Required because the music uses CC-BY tracks, which must be credited inside
// the game itself (not just in ASSETS.md). Renders from config.MUSIC.credits —
// the SINGLE source of truth — so swapping a track updates config in one place
// and the in-game attribution stays correct. (ADR-0024 / docs/AUDIO.md)
// =====================================================================

import { MUSIC } from '../config.js';

const esc = (s) =>
  String(s).replace(
    /[&<>"]/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c],
  );

export function initCredits() {
  const panel = document.getElementById('credits');
  const list = document.getElementById('credits-list');
  const openBtn = document.getElementById('btn-credits');
  const closeBtn = document.getElementById('credits-close');
  if (!panel || !list) return;

  const credits = MUSIC.credits || [];
  const rows = credits
    .map(
      (c) =>
        `<li><span class="cr-slot">${esc(c.slot)}</span> — “${esc(c.track)}” · ${esc(c.by)} · ${esc(c.license)}</li>`,
    )
    .join('');
  const src = MUSIC.creditsSource ? ` (${esc(MUSIC.creditsSource)})` : '';
  list.innerHTML =
    `<p class="cr-note">Music${src} — placeholder tracks while the original score is composed. ` +
    'Sound effects are generated in-engine. Full credits: ASSETS.md.</p>' +
    `<ul class="cr-list">${rows}</ul>`;

  // native <dialog>: showModal() gives modal semantics + ::backdrop + Esc-to-close for free
  const open = () => (panel.showModal ? panel.showModal() : panel.setAttribute('open', ''));
  const close = () => (panel.close ? panel.close() : panel.removeAttribute('open'));
  openBtn?.addEventListener('click', open);
  closeBtn?.addEventListener('click', close);
  panel.addEventListener('click', (e) => {
    if (e.target === panel) close(); // click the backdrop area to close
  });
}
