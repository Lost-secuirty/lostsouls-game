// =====================================================================
// postfx.js — the post-processing pipeline (ADR-0025; docs/GRAPHICS.md).
//
// Wraps the raw renderer in a pmndrs `postprocessing` EffectComposer:
//   RenderPass -> EffectPass( Bloom + [Vignette] + ToneMapping(ACES) ), with WebGL2 MSAA.
// The dark world's emissive threats (bullets / enemies / pickups / the door) get a real
// glow — luminance-gated so the scene stays dark and readable — and ACES tone mapping so
// bright colors don't blow out.
//
// CONTRACT — never break the render. If postprocessing can't initialize (no WebGL2, a
// feature/context gap, a headless quirk) OR a frame throws, we fall back to the plain
// renderer.render(scene, camera). Same spirit as the audio synth fallback: the game is
// never a black screen, offline/CI included. Everything is tunable in config.GRAPHICS,
// and the in-game "reduced effects" toggle (settings) flips `enabled` at runtime.
// =====================================================================

import { HalfFloatType } from 'three';
import {
  EffectComposer,
  EffectPass,
  RenderPass,
  BloomEffect,
  VignetteEffect,
  ToneMappingEffect,
  ToneMappingMode,
} from 'postprocessing';
import { N8AOPostPass } from 'n8ao';
import { GRAPHICS } from '../config.js';

const TONE_MODES = {
  aces: ToneMappingMode.ACES_FILMIC,
  agx: ToneMappingMode.AGX,
  neutral: ToneMappingMode.NEUTRAL,
};

export function createPostFX({ renderer, scene, camera }) {
  const g = GRAPHICS;
  let composer = null;
  let ok = false; // is the composer built and rendering cleanly?
  let enabled = !!g.enabled;

  function build() {
    try {
      composer = new EffectComposer(renderer, {
        multisampling: Math.max(0, Math.trunc(g.aaSamples) || 0),
        frameBufferType: HalfFloatType, // HDR buffer so bloom + tone mapping read true brightness
      });
      composer.addPass(new RenderPass(scene, camera));

      // Ambient occlusion (ADR-0026 Phase D) — slots BETWEEN the render and the
      // bloom/tone-mapping EffectPass. Its OWN try/catch so an AO failure skips only
      // AO, never the whole composer (bloom must survive). gammaCorrection stays off
      // mid-pipeline (the final EffectPass owns color); the composer feeds it depth.
      if (g.ao?.enabled) {
        try {
          const ao = new N8AOPostPass(scene, camera, window.innerWidth, window.innerHeight);
          ao.configuration.aoRadius = g.ao.radius;
          ao.configuration.distanceFalloff = g.ao.distanceFalloff;
          ao.configuration.intensity = g.ao.intensity;
          ao.configuration.halfRes = !!g.ao.halfRes;
          ao.configuration.color.set(g.ao.color);
          ao.configuration.gammaCorrection =
            g.ao.gammaCorrection === 'auto' ? false : !!g.ao.gammaCorrection;
          ao.setQualityMode(g.ao.quality);
          composer.addPass(ao);
        } catch (err) {
          console.warn(
            '[postfx] AO disabled — composer continues without it:',
            err?.message || err,
          );
        }
      }

      const effects = [];
      if (g.bloom?.enabled !== false) {
        effects.push(
          new BloomEffect({
            intensity: g.bloom.intensity,
            luminanceThreshold: g.bloom.threshold,
            luminanceSmoothing: g.bloom.smoothing,
            radius: g.bloom.radius,
            mipmapBlur: true, // smooth, wide glow without a big perf hit
          }),
        );
      }
      if (g.vignette?.enabled) {
        effects.push(
          new VignetteEffect({ offset: g.vignette.offset, darkness: g.vignette.darkness }),
        );
      }
      const mode = TONE_MODES[g.toneMapping];
      if (mode !== undefined) effects.push(new ToneMappingEffect({ mode }));

      // Guard the empty case (bloom off + vignette off + tone 'none'): an EffectPass with no
      // effects is pointless — let the RenderPass (+ AO) carry the frame to screen.
      if (effects.length) composer.addPass(new EffectPass(camera, ...effects));
      composer.setSize(window.innerWidth, window.innerHeight);
      ok = true;
    } catch (err) {
      console.warn('[postfx] disabled — falling back to raw render:', err?.message || err);
      composer = null;
      ok = false;
    }
  }

  if (enabled) build();

  const status = () => ({ enabled, active: enabled && ok });
  // observability — used by the verification drive + the render studio
  if (typeof window !== 'undefined') window.__postfx = status();

  return {
    /** Render a frame. Always safe — falls back to the raw renderer if post-FX is off/broken. */
    render(dt) {
      if (enabled && ok) {
        try {
          composer.render(dt);
          return;
        } catch (err) {
          console.warn('[postfx] render failed — falling back to raw render:', err?.message || err);
          ok = false;
          if (typeof window !== 'undefined') window.__postfx = status();
        }
      }
      renderer.render(scene, camera);
    },
    setSize(w, h) {
      if (composer) composer.setSize(w, h);
    },
    /** Runtime toggle for the "reduced effects" setting; builds lazily on first enable. */
    setEnabled(on) {
      enabled = !!on;
      if (enabled && !composer) build();
      if (typeof window !== 'undefined') window.__postfx = status();
    },
    /**
     * FPS-1: rebuild the composer from the CURRENT config.GRAPHICS so the debug
     * "Graphics" folder can A/B AO quality / vignette live (those are read at build
     * time). Disposes the old pipeline first to avoid leaking GPU buffers.
     */
    rebuild() {
      if (composer) {
        composer.dispose();
        composer = null;
        ok = false;
      }
      if (enabled) build();
      if (typeof window !== 'undefined') window.__postfx = status();
    },
    get active() {
      return enabled && ok;
    },
    status,
    dispose() {
      if (composer) composer.dispose();
      composer = null;
      ok = false;
    },
  };
}
