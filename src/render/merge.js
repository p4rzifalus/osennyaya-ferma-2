// Оптимизация: склеить неподвижные части предмета в несколько больших кусков — по одному на материал.
// Видеокарте проще нарисовать 10 больших кусков, чем 70 маленьких.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

// keep(mesh) → true: не склеивать (например, качели, которые двигаются)
export function mergeStatic(root, keep = () => false) {
  root.updateMatrixWorld(true);
  const inverseRoot = root.matrixWorld.clone().invert();
  const byMaterial = new Map();
  const toRemove = [];

  root.traverse((m) => {
    if (!m.isMesh || m === root || keep(m)) return;
    for (let p = m.parent; p && p !== root; p = p.parent) if (keep(p)) return; // внутри «не склеивать»
    // положение куска относительно корня
    const geo = (m.geometry.index ? m.geometry.toNonIndexed() : m.geometry.clone());
    geo.applyMatrix4(new THREE.Matrix4().multiplyMatrices(inverseRoot, m.matrixWorld));
    for (const name of Object.keys(geo.attributes)) if (!['position', 'normal', 'uv'].includes(name)) geo.deleteAttribute(name);
    geo.clearGroups();
    const key = m.material.uuid;
    if (!byMaterial.has(key)) byMaterial.set(key, { material: m.material, geos: [], castShadow: false });
    const entry = byMaterial.get(key);
    entry.geos.push(geo);
    entry.castShadow ||= m.castShadow;
    toRemove.push(m);
  });

  for (const m of toRemove) m.parent.remove(m);
  for (const { material, geos, castShadow } of byMaterial.values()) {
    const merged = new THREE.Mesh(mergeGeometries(geos), material);
    merged.castShadow = castShadow;
    merged.receiveShadow = true;
    root.add(merged);
  }
}
