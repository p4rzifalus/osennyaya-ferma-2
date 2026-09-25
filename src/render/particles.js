// Частицы: много одинаковых маленьких квадратиков (капли, искры, монетки, споры),
// все частицы одного вида рисуются одной командой видеокарте (InstancedMesh).
// Квадратики повёрнуты к камере — в пиксельном стиле это «пиксели» разного размера.
import * as THREE from 'three';

const CAMERA_YAW = Math.PI / 4;
const GRAVITY = 6;
const dummy = new THREE.Object3D();
const hidden = new THREE.Matrix4().makeScale(0, 0, 0);

// width/height — размер квадратика в мире; material — чем рисовать
export class ParticlePool {
  constructor(scene, { count, width, height = width, material }) {
    const geometry = new THREE.PlaneGeometry(width, height);
    this.mesh = new THREE.InstancedMesh(geometry, material, count);
    this.mesh.frustumCulled = false;
    this.mesh.castShadow = false;
    for (let i = 0; i < count; i++) this.mesh.setMatrixAt(i, hidden);
    scene.add(this.mesh);
    this.particles = Array.from({ length: count }, () => ({
      alive: false, pos: new THREE.Vector3(), vel: new THREE.Vector3(), age: 0, life: 1,
      size: 1, gravity: 1, spin: 0, onLand: null,
    }));
    this.next = 0;
  }

  // Выпустить частицу. gravity — во сколько раз падает быстрее обычного (0 — парит),
  // onLand(p) — что сделать, когда коснулась земли (например, брызги)
  spawn({ pos, vel = new THREE.Vector3(), life = 1, size = 1, gravity = 1, spin = 0, onLand = null }) {
    const p = this.particles[this.next];
    this.next = (this.next + 1) % this.particles.length; // самые старые перезаписываются
    Object.assign(p, { alive: true, age: 0, life, size, gravity, spin, onLand });
    p.pos.copy(pos);
    p.vel.copy(vel);
    return p;
  }

  // shape(p, t) → множитель размера в момент t (0..1 жизни): например, растёт и тает
  update(dt, shape = (p, t) => 1 - t) {
    this.particles.forEach((p, i) => {
      if (!p.alive) return;
      p.age += dt;
      p.vel.y -= GRAVITY * p.gravity * dt;
      p.pos.addScaledVector(p.vel, dt);
      if (p.pos.y <= 0 && p.gravity > 0) {
        p.alive = false;
        if (p.onLand) p.onLand(p);
      }
      if (p.age >= p.life) p.alive = false;
      if (!p.alive) {
        this.mesh.setMatrixAt(i, hidden);
        return;
      }
      dummy.position.copy(p.pos);
      dummy.rotation.set(0, CAMERA_YAW, p.spin * p.age);
      dummy.scale.setScalar(Math.max(0.001, p.size * shape(p, p.age / p.life)));
      dummy.updateMatrix();
      this.mesh.setMatrixAt(i, dummy.matrix);
    });
    this.mesh.instanceMatrix.needsUpdate = true;
  }
}
