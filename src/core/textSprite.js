// =====================================================================
// textSprite.js — a tiny camera-facing text label (canvas texture -> Sprite).
//
// Used for floating labels above pickups so you can tell what each one is
// without a pickup key. Sprites always face the camera and (depthTest off)
// stay readable over the scene.
// =====================================================================

import * as THREE from 'three';

export function makeTextSprite(text, colorHex = 0xffffff) {
  const W = 256;
  const H = 64;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');

  // shrink the font until the text fits the canvas width
  let font = 40;
  do {
    ctx.font = `bold ${font}px sans-serif`;
    if (ctx.measureText(text).width <= W - 16) break;
    font -= 2;
  } while (font > 14);

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  ctx.lineWidth = 7;
  ctx.strokeStyle = 'rgba(0,0,0,0.9)';
  ctx.strokeText(text, W / 2, H / 2);
  const c = new THREE.Color(colorHex);
  ctx.fillStyle = `rgb(${(c.r * 255) | 0},${(c.g * 255) | 0},${(c.b * 255) | 0})`;
  ctx.fillText(text, W / 2, H / 2);

  const tex = new THREE.CanvasTexture(canvas);
  tex.minFilter = THREE.LinearFilter;
  const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(3.2, 0.8, 1); // matches the 4:1 canvas aspect, world units
  return sprite;
}
