// =====================================================================
// humanchoice.js — the human decision-boss pre-fight overlay. Shows the survivor's
// line + four approach buttons (A/B/C/D from config.HUMAN_BOSS); calls back with
// the chosen key, then hides. Plain DOM overlay (#humanchoice in index.html) — no
// library, same shape as startmenu.js. Mouse, keyboard (1-4 / arrows + Enter), and
// gamepad (via moveChoiceFocus/confirmChoice, driven from game.update). If the
// overlay element is missing (headless tests), it auto-resolves the first choice.
// =====================================================================

import { HUMAN_BOSS } from '../config.js';

let active = null; // { moveFocus, confirm } while the overlay is up (for the gamepad path)

export function showHumanChoice(onChoose) {
  const overlay = document.getElementById('humanchoice');
  if (!overlay) {
    onChoose(HUMAN_BOSS.choices[0]); // headless / no-DOM: resolve so drives still work
    return;
  }

  const setup = document.getElementById('hc-setup');
  if (setup) setup.textContent = HUMAN_BOSS.setupLine;

  const keys = HUMAN_BOSS.choices;
  const buttons = keys.map((k) => document.getElementById(`hc-${k}`));
  buttons.forEach((btn, i) => {
    if (btn) btn.textContent = `${keys[i]}.  ${HUMAN_BOSS.labels[keys[i]]}`;
  });

  overlay.classList.add('show');
  let focus = 0;

  const setFocus = (i) => {
    focus = (i + buttons.length) % buttons.length;
    buttons.forEach((b, j) => b?.classList.toggle('focus', j === focus));
  };
  setFocus(0);

  const choose = (key) => {
    cleanup();
    onChoose(key);
  };

  const onKey = (e) => {
    const k = e.key;
    if (k >= '1' && k <= String(keys.length)) {
      choose(keys[Number(k) - 1]);
      e.preventDefault();
    } else if (k === 'ArrowRight' || k === 'ArrowDown') {
      setFocus(focus + 1);
      e.preventDefault();
    } else if (k === 'ArrowLeft' || k === 'ArrowUp') {
      setFocus(focus - 1);
      e.preventDefault();
    } else if (k === 'Enter' || k === ' ') {
      choose(keys[focus]);
      e.preventDefault();
    }
  };

  buttons.forEach((btn, i) => {
    if (btn) btn.onclick = () => choose(keys[i]);
  });
  window.addEventListener('keydown', onKey, true);

  active = {
    moveFocus: (dir) => setFocus(focus + (dir > 0 ? 1 : -1)),
    confirm: () => choose(keys[focus]),
  };

  function cleanup() {
    overlay.classList.remove('show');
    window.removeEventListener('keydown', onKey, true);
    buttons.forEach((b) => b && (b.onclick = null));
    active = null;
  }
}

/** gamepad focus nudge (driven from game.update's HUMAN_CHOICE arm); no-op if closed */
export function moveChoiceFocus(dir) {
  active?.moveFocus(dir);
}

/** gamepad confirm (driven from game.update's HUMAN_CHOICE arm); no-op if closed */
export function confirmChoice() {
  active?.confirm();
}
