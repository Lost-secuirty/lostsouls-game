// =====================================================================
// shadows.js — one tiny helper to flag an entity's meshes as shadow CASTERS.
//
// Setting `castShadow` is harmless while `renderer.shadowMap.enabled` is false, so
// callers invoke this UNCONDITIONALLY at mesh-creation sites (it also traverses GLB
// hierarchies). The master on/off and the "reduced effects" runtime toggle live on
// the renderer + key light in scene.js — not here. ADR-0026 (Phase B).
//
// Entities CAST but do not RECEIVE shadows (cheaper, and it avoids self-shadow speckle
// on small/animated meshes). The ground + walls are the receivers — set where built.
// The glowing MeshBasic bullets/eyes/door simply never call this, so they never cast.
// =====================================================================

export function castShadows(root) {
  root.traverse((o) => {
    if (o.isMesh || o.isSkinnedMesh) o.castShadow = true;
  });
}
