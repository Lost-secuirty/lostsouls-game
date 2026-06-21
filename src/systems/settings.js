// =====================================================================
// settings.js — tiny persisted player settings (the first localStorage use in the
// repo — ADR-0023). Holds accessibility/feel toggles: master volume, mute, and the
// hitbox/danger overlay. Survives reloads; degrades to defaults where storage is
// unavailable (private mode / headless), so it never throws.
// =====================================================================

const KEY = 'lostsouls.settings';
const DEFAULTS = { volume: 0.5, muted: false, showHitboxes: false };

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {
    /* no storage (private mode / headless) — fall back to defaults */
  }
  return { ...DEFAULTS };
}

class Settings {
  constructor() {
    this._v = load();
    this._subs = [];
  }

  /** read a setting */
  get(k) {
    return this._v[k];
  }

  /** set + persist + notify subscribers */
  set(k, val) {
    this._v[k] = val;
    this._save();
    for (const fn of this._subs) fn(k, val);
  }

  /** flip a boolean setting; returns the new value */
  toggle(k) {
    this.set(k, !this._v[k]);
    return this._v[k];
  }

  /** subscribe to changes: fn(key, value) */
  onChange(fn) {
    this._subs.push(fn);
  }

  _save() {
    try {
      localStorage.setItem(KEY, JSON.stringify(this._v));
    } catch {
      /* storage unavailable — keep the in-memory value, just don't persist */
    }
  }
}

// one shared instance for the whole game
export const settings = new Settings();
