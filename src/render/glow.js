// Светящийся материал: цвет ярче белого (множитель GLOW), чтобы его подхватывало свечение (bloom).
// Свет и тени на него не действуют.
import * as THREE from 'three';
import { GLOW } from '../config.js';

export function glowMaterial(color, strength = 1) {
  return new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(GLOW * strength) });
}
