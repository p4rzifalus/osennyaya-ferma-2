// Вид грядок: плитки земли и растения по стадиям. Читает состояние из GardenState.
import * as THREE from 'three';
import { COLORS, GARDEN_SIZE, CELL_SIZE } from '../config.js';
import { cellToWorld } from '../grid.js';
import { EMPTY, RIPE } from '../garden.js';
import { buildPlant } from '../plants.js';

export class GardenView {
  constructor(scene, garden) {
    this.garden = garden;
    this.cells = [];
    for (let x = 0; x < GARDEN_SIZE; x++) {
      for (let z = 0; z < GARDEN_SIZE; z++) {
        const p = cellToWorld(x, z);
        const tile = new THREE.Mesh(
          new THREE.BoxGeometry(CELL_SIZE * 0.92, 0.04, CELL_SIZE * 0.92),
          new THREE.MeshLambertMaterial({ color: COLORS.soil }),
        );
        tile.position.set(p.x, 0.02, p.z);
        tile.receiveShadow = true;
        scene.add(tile);

        const anchor = new THREE.Group(); // сюда ставим растение
        anchor.position.set(p.x, 0.04, p.z);
        scene.add(anchor);

        this.cells.push({ x, z, tile, anchor, shownStage: null, soilColor: null });
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
      let soilColor = COLORS.soil;
      if (stage === RIPE) soilColor = COLORS.soilRipe;
      else if (cell.wateredAt) soilColor = COLORS.soilWet;
      if (soilColor !== view.soilColor) {
        view.tile.material.color.set(soilColor);
        view.soilColor = soilColor;
      }
    }
  }
}
