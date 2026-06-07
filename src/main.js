// =====================================================================
// main.js — boots everything and starts the game loop.
// =====================================================================

import { createScene } from './core/scene.js';
import { loadModels } from './core/assets.js';
import { Input } from './systems/input.js';
import { Game } from './game.js';
import { startLoop } from './core/loop.js';
import { MODELS } from './config.js';

(async () => {
  const { renderer, scene, camera, baseCam, resize } = createScene(document.getElementById('app'));

  // try to load any configured models (no-op while config.MODELS are all null)
  await loadModels(MODELS);

  const input = new Input(renderer.domElement);
  const game = new Game({ renderer, scene, camera, baseCam, input });
  game.init();

  window.addEventListener('resize', resize);

  // hide the loading splash
  document.getElementById('boot')?.classList.add('hide');

  startLoop({
    step: 1 / 60,
    update: (dt) => game.update(dt),
    render: (alpha) => game.render(alpha),
    timeScale: () => game.juice.getTimeScale(),
  });
})();
