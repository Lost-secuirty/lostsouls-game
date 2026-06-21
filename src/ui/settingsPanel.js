// =====================================================================
// settingsPanel.js — wires the little bottom-right settings panel (#settings in
// index.html) to the persisted `settings` store: mute toggle, volume slider, and
// the hitbox-overlay toggle. Pure DOM glue; safe if the elements are absent
// (headless). Audio is applied by main.js subscribing to settings changes.
// =====================================================================

import { settings } from '../systems/settings.js';

export function initSettingsPanel() {
  const muteBtn = document.getElementById('set-mute');
  const vol = document.getElementById('set-vol');
  const hitBtn = document.getElementById('set-hit');

  // reflect current settings onto the controls (also runs when M/H change them)
  const render = () => {
    if (muteBtn) muteBtn.textContent = settings.get('muted') ? '🔇' : '🔊';
    if (vol) vol.value = String(settings.get('volume'));
    if (hitBtn) hitBtn.classList.toggle('on', settings.get('showHitboxes'));
  };

  // blur after a click/adjust so focus returns to the page — a focused control
  // would otherwise swallow held WASD (input.js ignores keys while a control is
  // focused) and trap movement mid-fight. See ADR-0023.
  if (muteBtn)
    muteBtn.onclick = () => {
      settings.toggle('muted');
      muteBtn.blur();
    };
  if (vol) {
    vol.oninput = () => settings.set('volume', parseFloat(vol.value));
    vol.onchange = () => vol.blur(); // on release (not mid-drag), drop focus
  }
  if (hitBtn)
    hitBtn.onclick = () => {
      settings.toggle('showHitboxes');
      hitBtn.blur();
    };

  settings.onChange(render);
  render();
}
