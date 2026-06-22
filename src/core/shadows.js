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
//
// Glowing/unlit MeshBasic sub-meshes (e.g. an enemy's emissive eyes) are SKIPPED even
// when they live inside a caster's group — "glowing things don't cast" is the visual
// identity, and bloom already carries them. PBR (MeshStandard/Physical) meshes cast.
// =====================================================================

function isUnlit(material) {
  if (!material) return false;
  return Array.isArray(material)
    ? material.some((m) => m?.isMeshBasicMaterial)
    : !!material.isMeshBasicMaterial;
}

export function castShadows(root) {
  root.traverse((o) => {
    if ((o.isMesh || o.isSkinnedMesh) && !isUnlit(o.material)) o.castShadow = true;
  });
}
