// =====================================================================
// main.js — boots everything and starts the game loop.
// =====================================================================

import { createScene } from './core/scene.js';
import { loadModels } from './core/assets.js';
import { Input, isEditable } from './systems/input.js';
import { Game } from './game.js';
import { startLoop } from './core/loop.js';
import { MODELS } from './config.js';
import * as audio from './systems/audio.js';
import { showStartMenu } from './ui/startmenu.js';
import { settings } from './systems/settings.js';
import { initSettingsPanel } from './ui/settingsPanel.js';
import { initCredits } from './ui/credits.js';

(async () => {
  const { renderer, scene, camera, baseCam, resize, postfx, setShadowsEnabled } = createScene(
    document.getElementById('app'),
  );

  // try to load any configured models (no-op while config.MODELS are all null)
  await loadModels(MODELS);

  const input = new Input(renderer.domElement);
  const game = new Game({ renderer, scene, camera, baseCam, input, postfx });
  game.init();

  // debug handle (poke the game from the dev console, e.g. window.__game.loadRoom(5))
  window.__game = game;
  window.__audio = audio; // music/sfx facade (used by the verification drive)

  // dev menu — lazy-loaded on `?debug=1` or the backtick key (never in normal play)
  let debugGui = null;
  let debugShown = false;
  const toggleDebug = () => {
    if (!debugGui) {
      import('./debug/menu.js').then((m) => {
        debugGui = m.initDebugMenu(game);
        debugShown = true;
      });
    } else {
      debugShown = !debugShown;
      debugGui.show(debugShown);
    }
  };
  // persisted settings (ADR-0023): apply volume/mute to audio + post-FX, keep in sync
  audio.setMasterVolume(settings.get('volume'));
  audio.setMuted(settings.get('muted'));
  // "reduced effects" = raw render + no shadows (accessibility / low-end, ADR-0023/0026)
  postfx?.setEnabled(!settings.get('reducedEffects'));
  setShadowsEnabled(!settings.get('reducedEffects'));
  settings.onChange((k, v) => {
    if (k === 'volume') audio.setMasterVolume(v);
    if (k === 'muted') audio.setMuted(v);
    if (k === 'reducedEffects') {
      postfx?.setEnabled(!v);
      setShadowsEnabled(!v);
    }
  });
  initSettingsPanel();
  initCredits();

  addEventListener('keydown', (e) => {
    // ignore OS key-repeat (holding a key shouldn't strobe a toggle) and keys typed
    // into a focused control (slider/menu) — matches input.js's game-key convention
    if (e.repeat || isEditable(e.target)) return;
    if (e.key === '`') toggleDebug();
    else if (e.key === 'm' || e.key === 'M')
      settings.toggle('muted'); // mute/unmute
    else if (e.key === 'h' || e.key === 'H') settings.toggle('showHitboxes'); // hitbox overlay
  });
  if (location.search.includes('debug')) toggleDebug();

  window.addEventListener('resize', resize);

  // if the window/tab loses focus mid-keypress, the keyup may never fire and the
  // player keeps moving ("stuck going up"). Drop all held inputs when that happens.
  addEventListener('blur', () => input.clearKeys());
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) input.clearKeys();
  });

  // browsers block audio until a user gesture — unlock + start music on the first one.
  // if we're still on the start menu (no run yet), play the menu theme.
  const unlock = () => {
    audio.unlock();
    if (!game.players || game.players.length === 0) audio.setMenuMusic();
  };
  for (const ev of ['click', 'keydown', 'touchstart']) {
    addEventListener(ev, unlock, { once: true });
  }

  // hide the loading splash, then show the start menu (pick 1P or 2P)
  document.getElementById('boot')?.classList.add('hide');
  document.getElementById('settings')?.classList.add('ready'); // reveal once boot clears
  showStartMenu((coop) => game.startRun(coop));

  startLoop({
    step: 1 / 60,
    update: (dt) => game.update(dt),
    render: (alpha) => game.render(alpha),
    timeScale: () => game.juice.getTimeScale(),
  });
})();
