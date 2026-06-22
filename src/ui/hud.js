// =====================================================================
// hud.js — the on-screen stuff drawn with plain HTML over the 3D canvas:
// hearts, the room counter, the big banner, the outcome toast, and the
// red blood-splatter flash.
// =====================================================================

import { PROGRESSION } from '../config.js';
import { settings } from '../systems/settings.js';

const $ = (id) => document.getElementById(id);

let _toastTimer = null;

export const hud = {
  setHearts(n, max) {
    const el = $('hearts');
    if (!el) return;
    el.textContent = '❤️'.repeat(Math.max(0, n)) + '🖤'.repeat(Math.max(0, max - n));
  },

  // Player 2 (co-op) hearts — green
  setHearts2(n, max) {
    const el = $('hearts2');
    if (!el) return;
    el.textContent = 'P2 ' + '💚'.repeat(Math.max(0, n)) + '🖤'.repeat(Math.max(0, max - n));
  },

  // show/hide the co-op (P2) HUD bits
  setCoop(on) {
    const el = $('hearts2');
    if (el) el.style.display = on ? 'block' : 'none';
  },

  setLives(n) {
    const el = $('lives');
    if (el) el.textContent = `LIVES ${'🔺'.repeat(Math.max(0, n))}`;
  },

  // info = floorInfo(roomIndex); weaponName = e.g. "Shotgun"
  setRoom(info, weaponName) {
    const el = $('room');
    if (!el) return;
    const floor = info.floorIndex + 1;
    const where = info.isBossRoom
      ? 'BOSS'
      : `ROOM ${info.roomInFloor + 1}/${PROGRESSION.roomsPerFloor}`;
    el.textContent = `FLOOR ${floor} · ${where}${weaponName ? ` · ${weaponName}` : ''}`;
  },

  // Render 1 or 2 boss HP bars (the dog/cat duo uses two). Each row shows the
  // boss's name + a fill; a dead boss's row greys out at 0% (clear "you got one!").
  setBossBars(bosses) {
    const wrap = $('bossbars');
    if (!wrap) return;
    wrap.classList.add('show');
    const rows = wrap.querySelectorAll('.bossbar');
    rows.forEach((row, i) => {
      const b = bosses[i];
      if (!b) {
        row.classList.add('hidden');
        return;
      }
      row.classList.remove('hidden');
      const frac = Math.max(0, Math.min(1, b.hp / b.maxHp));
      row.querySelector('.bossbar-fill').style.width = `${frac * 100}%`;
      row.querySelector('.bossbar-name').textContent = b.name;
      row.classList.toggle('dead', !!b.dead || b.hp <= 0);
    });
  },

  hideBossBars() {
    $('bossbars')?.classList.remove('show');
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

  /**
   * Brief full-screen impact flash (config.FEEL). `peak` opacity in a `color`, fading to 0
   * over `ms`. Skipped entirely when reducedEffects is on (accessibility / motion-sensitive).
   * Distinct from flashSplatter (which is the red blood overlay on hurt).
   */
  flashScreen(peak, color, ms) {
    if (settings.get('reducedEffects')) return;
    const el = $('screenflash');
    if (!el) return;
    el.style.transition = 'none';
    el.style.background = color;
    el.style.opacity = String(peak);
    void el.offsetWidth; // force a reflow so the fade-out below actually animates
    el.style.transition = `opacity ${ms}ms ease`;
    el.style.opacity = '0';
  },
};
