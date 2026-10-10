import { CONTAINER_IDS, type MeshPatch, type MeshState } from './types';

/** Returns a new mesh with the patch merged in; the input is never mutated. */
export function applyPatch(mesh: MeshState, patch: MeshPatch | undefined): MeshState {
  if (!patch) return mesh;
  const containers = { ...mesh.containers };
  for (const id of CONTAINER_IDS) {
    const change = patch.containers?.[id];
    if (change) containers[id] = { ...containers[id], ...change };
  }
  return { containers, links: { ...mesh.links, ...patch.links } };
}

export function applyPatches(mesh: MeshState, patches: Array<MeshPatch | undefined>): MeshState {
  return patches.reduce<MeshState>(applyPatch, mesh);
}
