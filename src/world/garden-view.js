// Вид грядок: плитки земли и растения по стадиям. Читает состояние из GardenState.
import * as THREE from 'three';
import { GARDEN_SIZE, CELL_SIZE } from '../config.js';
import { getMaterial, projectUV } from '../art/assets.js';
import { cellToWorld } from '../grid.js';
import { EMPTY, RIPE } from '../garden.js';
import { buildPlant } from '../plants.js';

export class GardenView {
  constructor(scene, garden) {
    this.garden = garden;
    // Земля: сухая; мокрая — темнее и блестит; спелая — светлее, чтобы было видно, что пора собирать
    this.soil = {
      dry: getMaterial('soil'),
      wet: getMaterial('soil', { tint: '#8a8078', roughness: 0.3 }),
      ripe: getMaterial('soil', { tint: '#f0d4a8' }),
    };
    this.cells = [];
    for (let x = 0; x < GARDEN_SIZE; x++) {
      for (let z = 0; z < GARDEN_SIZE; z++) {
        const p = cellToWorld(x, z);
        const tileGeo = projectUV(new THREE.BoxGeometry(CELL_SIZE * 0.92, 0.04, CELL_SIZE * 0.92), this.soil.dry.userData.units);
        const tile = new THREE.Mesh(tileGeo, this.soil.dry);
        tile.position.set(p.x, 0.02, p.z);
        tile.receiveShadow = true;
        scene.add(tile);

        const anchor = new THREE.Group(); // сюда ставим растение
        anchor.position.set(p.x, 0.04, p.z);
        scene.add(anchor);

        this.cells.push({ x, z, tile, anchor, shownStage: null });
      }
    }
  }

  // Каждый кадр: обновить вид клеток, у которых сменилась стадия
  update(now = Date.now()) {
    for (const view of this.cells) {
      const cell = this.garden.cell(view);
      const stage = this.garden.stage(view, now);
      if (stage !== view.shownStage) {
        view.anchor.clear();
        if (stage !== EMPTY) view.anchor.add(buildPlant(cell.plant, stage));
        view.shownStage = stage;
      }

      // Земля: тёмная, пока растёт после полива; светлая, когда урожай готов
      let soil = this.soil.dry;
      if (stage === RIPE) soil = this.soil.ripe;
      else if (cell.wateredAt) soil = this.soil.wet;
      view.tile.material = soil;
    }
  }
}
