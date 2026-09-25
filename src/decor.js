// Мелкие детали сцены: камни, травинки, цветы, ветер, флюгер, дым из трубы,
// летающие пушинки и брызги при поливе. На игру не влияют — только для настроения.
import * as THREE from 'three';
import { COLORS, GARDEN_SIZE, BASKET_CELL, DECOR } from './config.js';
import { cellToWorld } from './grid.js';
import { FEATURES } from './island.js';

import { getMaterial, mapTextures } from './art/assets.js';
import { glowMaterial } from './render/glow.js';
import { mergeStatic } from './render/merge.js';

// Какой цвет каким материалом: кора, камень, дерево; остальное — гладкий материал
const SURFACES = {
  [COLORS.treeTrunk]: () => getMaterial('bark'),
  [COLORS.boulder]: () => getMaterial('stone'),
  [COLORS.stone]: () => getMaterial('stone', { tint: '#e8e4dc' }),
  [COLORS.stoneDark]: () => getMaterial('stone', { tint: '#8a867e' }),
  [COLORS.swingSeat]: () => getMaterial('wood', { tint: COLORS.swingSeat }),
};
// один материал на цвет — так одинаковые предметы можно склеивать и рисовать быстрее
const plainMaterials = new Map();
const lambert = (color) => SURFACES[color]?.() ?? plainMaterials.get(color)
  ?? plainMaterials.set(color, new THREE.MeshStandardMaterial({ color, roughness: 0.85 })).get(color);

// Случайные числа, которые каждый раз одинаковые — детали не «прыгают» при перезагрузке
function seededRandom(seed) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function createDecor(scene, landmarks) {
  const rand = seededRandom(7);
  const between = (a, b) => a + rand() * (b - a);

  // Места для деталей: дорожка вокруг огорода и земля за домиком
  const spots = [];
  for (let x = -1; x <= GARDEN_SIZE; x++) {
    for (let z = -1; z <= GARDEN_SIZE; z++) {
      const onPath = x === -1 || z === -1 || x === GARDEN_SIZE || z === GARDEN_SIZE;
      const isBasket = x === BASKET_CELL.x && z === BASKET_CELL.z;
      if (onPath && !isBasket) spots.push(cellToWorld(x, z));
    }
  }
  const { island, house } = landmarks;
  for (let i = 0; i < 16; i++) {
    const p = new THREE.Vector3(between(island.minX + 0.3, island.maxX - 0.3), 0, between(island.minZ + 0.3, house.maxZ - 0.6));
    const insideHouse = p.x > house.minX && p.x < house.maxX && p.z > house.minZ && p.z < house.maxZ;
    const nearTree = Math.hypot(p.x - FEATURES.tree.x, p.z - FEATURES.tree.z) < 1.2;
    const nearBoulder = FEATURES.boulders.some((b) => Math.hypot(p.x - b.x, p.z - b.z) < b.r + 0.4);
    if (!insideHouse && !nearTree && !nearBoulder) spots.push(p);
  }
  function takeSpot() {
    if (!spots.length) return cellToWorld(-1, between(-1, GARDEN_SIZE)); // мест не хватило — на дорожку
    const p = spots.splice(Math.floor(rand() * spots.length), 1)[0].clone();
    p.x += between(-0.35, 0.35);
    p.z += between(-0.35, 0.35);
    return p;
  }

  // Камни
  for (let i = 0; i < DECOR.stones; i++) {
    const r = between(0.1, 0.2);
    const stone = new THREE.Mesh(new THREE.DodecahedronGeometry(r, 0), lambert(rand() < 0.5 ? COLORS.stone : COLORS.stoneDark));
    stone.position.copy(takeSpot()).setY(r * 0.3);
    stone.scale.y = 0.6;
    stone.rotation.set(rand() * 3, rand() * 3, rand() * 3);
    stone.castShadow = false; // мелкие — без теней
    scene.add(stone);
  }

  // Травинки и цветы качаются на ветру — у каждого свой «шарнир» у земли
  const swaying = [];
  for (let i = 0; i < DECOR.grassTufts; i++) {
    const tuft = new THREE.Group();
    for (let b = 0; b < 3; b++) {
      const h = between(0.22, 0.38);
      const blade = new THREE.Mesh(new THREE.ConeGeometry(0.045, h, 4), lambert(COLORS.grass));
      blade.position.set(between(-0.09, 0.09), h / 2, between(-0.09, 0.09));
      blade.rotation.set(between(-0.3, 0.3), 0, between(-0.3, 0.3));
      tuft.add(blade);
    }
    mergeStatic(tuft); // три травинки — одним куском
    tuft.position.copy(takeSpot());
    swaying.push({ object: tuft, phase: rand() * 6, amount: 0.25 });
    scene.add(tuft);
  }
  for (let i = 0; i < DECOR.flowers; i++) {
    const flower = new THREE.Group();
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.025, 0.36, 5), lambert(COLORS.grass));
    stem.position.y = 0.18;
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 6), lambert(COLORS.flower));
    head.position.y = 0.38;
    head.scale.z = 0.6;
    const center = new THREE.Mesh(new THREE.SphereGeometry(0.04, 6, 4), lambert(COLORS.flowerCenter));
    center.position.set(0, 0.38, 0.05);
    flower.add(stem, head, center);
    flower.position.copy(takeSpot());
    flower.rotation.y = Math.PI / 4; // серединка смотрит к камере
    swaying.push({ object: flower, phase: rand() * 6, amount: 0.15 });
    scene.add(flower);
  }
  // травинки и цветы — без теней: их почти не видно, а считать дорого
  for (const s of swaying) s.object.traverse((m) => { m.castShadow = false; });

  // Флюгер на коньке крыши: стрелка поворачивается по ветру
  const vane = new THREE.Group();
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.5, 5), lambert(COLORS.vane));
  pole.position.y = 0.25;
  const arrow = new THREE.Group();
  const shaft = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 0.7), lambert(COLORS.vane));
  const tip = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.2, 4), lambert(COLORS.vane));
  tip.rotation.x = Math.PI / 2;
  tip.position.z = 0.44;
  const tail = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.24, 0.22), lambert(COLORS.vane));
  tail.position.z = -0.3;
  arrow.add(shaft, tip, tail);
  arrow.position.y = 0.46;
  vane.add(pole, arrow);
  vane.position.copy(landmarks.roofPeak);
  vane.traverse((m) => { m.castShadow = true; });
  scene.add(vane);

  // Дым из трубы: круглые полупрозрачные клубы поднимаются, растут, сносятся ветром и тают
  const puffGeo = new THREE.SphereGeometry(1, 12, 8);
  const puffMat = new THREE.MeshLambertMaterial({ color: COLORS.smoke, transparent: true, opacity: DECOR.smokeOpacity, depthWrite: false });
  const puffs = [];
  for (let i = 0; i < DECOR.smokePuffs; i++) {
    const puff = new THREE.Mesh(puffGeo, puffMat);
    puffs.push({ mesh: puff, age: i / DECOR.smokePuffs });
    scene.add(puff);
  }

  // Пушинки летают над островом по ветру
  const fluffGeo = new THREE.SphereGeometry(0.035, 6, 4);
  // вечером пушинки — это светлячки: светятся и мерцают
  const fluffMat = glowMaterial(COLORS.firefly, 1.2);
  // все светлячки рисуются одной командой (InstancedMesh), у каждого своё место и мерцание
  const fireflies = new THREE.InstancedMesh(fluffGeo, fluffMat, DECOR.fluffs);
  scene.add(fireflies);
  const fireflyDummy = new THREE.Object3D();
  const fluffs = [];
  for (let i = 0; i < DECOR.fluffs; i++) {
    const pos = new THREE.Vector3(between(island.minX, island.maxX), between(0.4, 1.8), between(island.minZ, island.maxZ));
    fluffs.push({ pos, phase: rand() * 6, speed: between(0.6, 1.1) });
  }

  // Булыжники
  for (const b of FEATURES.boulders) {
    const boulder = new THREE.Mesh(new THREE.DodecahedronGeometry(b.r, 0), lambert(COLORS.boulder));
    boulder.position.set(b.x, b.r * 0.45, b.z);
    boulder.scale.set(1, 0.75, 0.9);
    boulder.rotation.set(rand(), rand() * 3, rand() * 0.4);
    boulder.castShadow = true;
    boulder.receiveShadow = true;
    scene.add(boulder);
  }

  // Высокая трава — пятнами, тоже качается на ветру
  for (const patch of FEATURES.tallGrass) {
    const clump = new THREE.Group(); // всё пятно травы — одним-двумя кусками, качается целиком
    const count = 5 + Math.floor(rand() * 4);
    for (let i = 0; i < count; i++) {
      const h = between(0.4, 0.75);
      const cone = new THREE.Mesh(new THREE.ConeGeometry(0.05, h, 4), lambert(rand() < 0.3 ? COLORS.leavesA : COLORS.tallGrass));
      cone.position.set(between(-0.35, 0.35), h / 2, between(-0.35, 0.35));
      cone.rotation.set(between(-0.15, 0.15), rand() * 3, between(-0.15, 0.15));
      clump.add(cone);
    }
    mergeStatic(clump);
    clump.position.set(patch.x, 0, patch.z);
    swaying.push({ object: clump, phase: rand() * 6, amount: 0.3 });
    scene.add(clump);
  }

  // Дерево с осенней листвой и качелями на ветке
  const tree = new THREE.Group();
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.24, 2.3, 8), lambert(COLORS.treeTrunk));
  trunk.position.y = 1.15;
  tree.add(trunk);
  const branchDir = new THREE.Vector3(-1, 0, 1).normalize(); // ветка тянется влево по экрану — качели видно сбоку
  const branch = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.09, 1.2, 6), lambert(COLORS.treeTrunk));
  branch.position.set(branchDir.x * 0.6, 1.85, branchDir.z * 0.6);
  branch.rotation.set(Math.PI / 2 - 0.12, 0, 0);
  branch.rotation.order = 'YXZ';
  branch.rotation.y = -Math.PI / 4;
  tree.add(branch);
  for (const [cx, cy, cz, r, color] of [
    [0, 2.7, 0, 0.95, COLORS.leavesA], [-0.6, 2.4, -0.4, 0.75, COLORS.leavesB], [0.5, 2.35, -0.5, 0.7, COLORS.leavesB],
    [-0.3, 3.2, -0.2, 0.7, COLORS.leavesA], [0.35, 2.9, 0.35, 0.6, COLORS.leavesB], [-0.55, 2.8, 0.45, 0.55, COLORS.leavesA],
  ]) {
    const leafTint = color === COLORS.leavesA ? '#ffffff' : '#c89080'; // второй тон кроны — темнее и краснее
    const clump = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 1), getMaterial('leaves', { tint: leafTint, flatShading: true }));
    clump.position.set(cx, cy, cz);
    tree.add(clump);
  }
  tree.traverse((m) => { m.castShadow = true; });
  tree.position.set(FEATURES.tree.x, 0, FEATURES.tree.z);
  scene.add(tree);

  // Качели: висят на ветке и раскачиваются поперёк неё
  const swingPivot = new THREE.Group();
  swingPivot.position.set(branchDir.x * 0.85, 1.85, branchDir.z * 0.85);
  swingPivot.rotation.y = (-3 * Math.PI) / 4; // своя ось x — вдоль ветки
  const swing = new THREE.Group();
  for (const side of [-1, 1]) {
    const rope = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 1.35, 4), lambert(COLORS.rope));
    rope.position.set(side * 0.24, -0.68, 0);
    swing.add(rope);
  }
  const seat = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.06, 0.24), lambert(COLORS.swingSeat));
  seat.position.y = -1.37;
  swing.add(seat);
  swing.traverse((m) => { m.castShadow = true; });
  swingPivot.add(swing);
  tree.add(swingPivot);

  // Листья падают с кроны, кружатся и появляются снова
  const leafGeo = new THREE.PlaneGeometry(0.13, 0.09);
  const leafMat = new THREE.MeshBasicMaterial({ color: COLORS.leavesA, side: THREE.DoubleSide });
  const leaves = [];
  for (let i = 0; i < DECOR.fallingLeaves; i++) {
    const leaf = new THREE.Mesh(leafGeo, leafMat);
    leaves.push({ mesh: leaf, age: rand(), phase: rand() * 6, offset: new THREE.Vector3(between(-0.9, 0.9), 0, between(-0.9, 0.9)) });
    scene.add(leaf);
  }

  // Брызги при поливе
  const dropGeo = new THREE.BoxGeometry(0.08, 0.12, 0.08);
  const dropMat = new THREE.MeshBasicMaterial({ color: COLORS.water });
  const drops = [];

  // Ветер: направление медленно гуляет, сила то нарастает, то стихает
  const wind = new THREE.Vector3();
  let windStrength = 0;

  mapTextures(scene); // разметить текстуры камней, дерева, качелей
  mergeStatic(tree, (o) => o === swingPivot); // дерево — одним куском, качели отдельно (они двигаются)

  return {
    // Брызги над клеткой
    splash(worldPos) {
      for (let i = 0; i < 12; i++) {
        const m = new THREE.Mesh(dropGeo, dropMat);
        m.position.copy(worldPos).add(new THREE.Vector3(between(-0.25, 0.25), between(0.5, 0.8), between(-0.25, 0.25)));
        drops.push({ mesh: m, velocity: new THREE.Vector3(between(-0.4, 0.4), between(0, 1), between(-0.4, 0.4)), life: 0.9 });
        scene.add(m);
      }
    },

    update(dt, time) {
      const angle = 0.8 + Math.sin(time * 0.05) * 1.2 + Math.sin(time * 0.13) * 0.4;
      windStrength = DECOR.wind * (0.6 + 0.4 * Math.sin(time * 0.4) + 0.2 * Math.sin(time * 1.7));
      wind.set(Math.sin(angle), 0, Math.cos(angle));

      for (const s of swaying) {
        const lean = windStrength * s.amount * (0.7 + 0.3 * Math.sin(time * 2.2 + s.phase));
        s.object.rotation.x = wind.z * lean;
        s.object.rotation.z = -wind.x * lean;
      }

      // Флюгер смотрит по ветру, чуть подрагивает
      arrow.rotation.y = angle + Math.sin(time * 3.1) * 0.08 * windStrength;

      for (const p of puffs) {
        p.age = (p.age + dt / 4) % 1; // клуб живёт 4 секунды
        const t = p.age;
        p.mesh.position.copy(landmarks.chimneyTop)
          .add(new THREE.Vector3(wind.x * windStrength * t * 1.2, t * 1.4, wind.z * windStrength * t * 1.2));
        p.mesh.scale.setScalar(0.06 + Math.sin(Math.PI * t) * 0.16); // растёт, потом тает
      }

      fluffs.forEach((f, i) => {
        const p = f.pos;
        p.addScaledVector(wind, windStrength * f.speed * 0.35 * dt); // светлячки летают медленно
        p.y += Math.sin(time * 1.3 + f.phase) * 0.2 * dt;
        const glow = 0.3 + 0.7 * Math.max(0, Math.sin(time * 2.2 + f.phase * 3)); // мерцание
        // улетела за край острова — появляется с другой стороны
        if (p.x > island.maxX) p.x = island.minX;
        if (p.x < island.minX) p.x = island.maxX;
        if (p.z > island.maxZ) p.z = island.minZ;
        if (p.z < island.minZ) p.z = island.maxZ;
        fireflyDummy.position.copy(p);
        fireflyDummy.scale.setScalar(glow);
        fireflyDummy.updateMatrix();
        fireflies.setMatrixAt(i, fireflyDummy.matrix);
      });
      fireflies.instanceMatrix.needsUpdate = true;

      // Качели: мягко качаются, сильнее при ветре
      swing.rotation.x = Math.sin(time * 1.6) * (0.12 + windStrength * 0.15);

      for (const l of leaves) {
        l.age = (l.age + dt / 6) % 1; // лист падает 6 секунд
        const fall = l.age;
        l.mesh.position.set(
          FEATURES.tree.x + l.offset.x + wind.x * windStrength * fall * 1.5 + Math.sin(time * 2 + l.phase) * 0.15,
          2.4 - fall * 2.4,
          FEATURES.tree.z + l.offset.z + wind.z * windStrength * fall * 1.5,
        );
        l.mesh.rotation.set(time * 2 + l.phase, time * 1.3 + l.phase, 0);
      }

      for (let i = drops.length - 1; i >= 0; i--) {
        const d = drops[i];
        d.life -= dt;
        d.velocity.y -= 6 * dt;
        d.mesh.position.addScaledVector(d.velocity, dt);
        if (d.life <= 0 || d.mesh.position.y < 0.05) {
          scene.remove(d.mesh);
          drops.splice(i, 1);
        }
      }
    },
  };
}
