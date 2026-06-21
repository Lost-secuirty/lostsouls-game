// =====================================================================
// credits.js — a small in-game credits panel (start menu → "♪ Credits").
// Required because the music uses CC-BY tracks, which must be credited inside
// the game itself (not just in ASSETS.md). Update MUSIC_CREDITS when tracks
// change; the full machine-readable list lives in ASSETS.md. (ADR-0024)
// =====================================================================

// Current placeholder score. Swap entries here when tracks are replaced.
const MUSIC_CREDITS = [
  { slot: 'Menu', track: 'Hush' },
  { slot: 'The Outskirts', track: 'Darkest Child' },
  { slot: 'The Barricade', track: 'Anxiety' },
  { slot: 'The Fungal Depths', track: 'Echoes of Time' },
  { slot: 'The Kennels', track: 'Killers' },
  { slot: 'The Catacombs', track: 'Dark Times' },
  { slot: 'Boss themes (placeholder)', track: 'Despair and Triumph' },
];

export function initCredits() {
  const panel = document.getElementById('credits');
  const list = document.getElementById('credits-list');
  const openBtn = document.getElementById('btn-credits');
  const closeBtn = document.getElementById('credits-close');
  if (!panel || !list) return;

  const rows = MUSIC_CREDITS.map(
    (c) => `<li><span class="cr-slot">${c.slot}</span> — “${c.track}”</li>`,
  ).join('');
  list.innerHTML =
    '<p class="cr-note">Music by <b>Kevin MacLeod</b> (incompetech.com), licensed under ' +
    '<b>Creative Commons BY 4.0</b>. These are placeholder tracks while the original ' +
    'score is composed.</p><ul class="cr-list">' +
    rows +
    '</ul><p class="cr-note">Sound effects are generated in-engine. Full credits: ASSETS.md.</p>';

  openBtn?.addEventListener('click', () => panel.classList.add('show'));
  closeBtn?.addEventListener('click', () => panel.classList.remove('show'));
  panel.addEventListener('click', (e) => {
    if (e.target === panel) panel.classList.remove('show'); // click backdrop to close
  });
}
