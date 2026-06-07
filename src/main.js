// =====================================================================
// main.js — boots everything and starts the game loop.
// =====================================================================

import { createScene } from './core/scene.js';
import { loadModels } from './core/assets.js';
import { Input } from './systems/input.js';
import { Game } from './game.js';
import { startLoop } from './core/loop.js';
import { MODELS } from './config.js';
import * as audio from './systems/audio.js';

(async () => {
  const { renderer, scene, camera, baseCam, resize } = createScene(document.getElementById('app'));

  // try to load any configured models (no-op while config.MODELS are all null)
  await loadModels(MODELS);

  const input = new Input(renderer.domElement);
  const game = new Game({ renderer, scene, camera, baseCam, input });
  game.init();

  // debug handle (poke the game from the dev console, e.g. window.__game.loadRoom(5))
  window.__game = game;

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
  addEventListener('keydown', (e) => {
    if (e.key === '`') toggleDebug();
  });
  if (location.search.includes('debug')) toggleDebug();

  window.addEventListener('resize', resize);

  // if the window/tab loses focus mid-keypress, the keyup may never fire and the
  // player keeps moving ("stuck going up"). Drop all held inputs when that happens.
  addEventListener('blur', () => input.clearKeys());
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) input.clearKeys();
  });

  // browsers block audio until a user gesture — unlock + start music on the first one
  const unlock = () => audio.unlock();
  for (const ev of ['click', 'keydown', 'touchstart']) {
    addEventListener(ev, unlock, { once: true });
  }

  // hide the loading splash
  document.getElementById('boot')?.classList.add('hide');

  startLoop({
    step: 1 / 60,
    update: (dt) => game.update(dt),
    render: (alpha) => game.render(alpha),
    timeScale: () => game.juice.getTimeScale(),
  });
})();
