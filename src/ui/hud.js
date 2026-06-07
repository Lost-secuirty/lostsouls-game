// =====================================================================
// hud.js — the on-screen stuff drawn with plain HTML over the 3D canvas:
// hearts, the room counter, the big banner, the outcome toast, and the
// red blood-splatter flash.
// =====================================================================

const $ = (id) => document.getElementById(id);

let _toastTimer = null;

export const hud = {
  setHearts(n, max) {
    const el = $('hearts');
    if (!el) return;
    el.textContent = '❤️'.repeat(Math.max(0, n)) + '🖤'.repeat(Math.max(0, max - n));
  },

  setRoom(index, total) {
    const el = $('room');
    if (el) el.textContent = `ROOM ${index} / ${total}`;
  },

  banner(text) {
    const el = $('banner');
    if (!el) return;
    el.textContent = text;
    el.classList.add('show');
  },

  hideBanner() {
    $('banner')?.classList.remove('show');
  },

  toast(text, good = true) {
    const el = $('toast');
    if (!el) return;
    el.textContent = text;
    el.style.color = good ? '#7cff9b' : '#ff5a5a';
    el.classList.add('show');
    clearTimeout(_toastTimer);
    _toastTimer = setTimeout(() => el.classList.remove('show'), 2200);
  },

  flashSplatter() {
    const el = $('splatter');
    if (!el) return;
    el.style.opacity = '0.9';
    setTimeout(() => (el.style.opacity = '0'), 80);
  },
};
