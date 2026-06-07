// =====================================================================
// hud.js — the on-screen stuff drawn with plain HTML over the 3D canvas:
// hearts, the room counter, the big banner, the outcome toast, and the
// red blood-splatter flash.
// =====================================================================

import { PROGRESSION } from '../config.js';

const $ = (id) => document.getElementById(id);

let _toastTimer = null;

export const hud = {
  setHearts(n, max) {
    const el = $('hearts');
    if (!el) return;
    el.textContent = '❤️'.repeat(Math.max(0, n)) + '🖤'.repeat(Math.max(0, max - n));
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

  setBossHp(frac, name) {
    const bar = $('bossbar');
    const fill = $('bossbar-fill');
    const label = $('bossbar-name');
    if (!bar || !fill) return;
    bar.classList.add('show');
    fill.style.width = `${Math.max(0, Math.min(1, frac)) * 100}%`;
    if (label && name) label.textContent = name;
  },

  hideBossHp() {
    $('bossbar')?.classList.remove('show');
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
