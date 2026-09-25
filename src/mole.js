// Крот-огородник: пиксельный спрайт с анимациями, ходит сам или по маршруту.
import * as THREE from 'three';
import { CELL_SIZE, MOLE_SPEED, MOLE_TURN_SPEED, MOLE_SCALE, MOLE_REACH } from './config.js';
import { Sprite } from './render/sprites.js';
import { getSheets } from './world/sheets.js';
import { MOLE, PLANT_ORDER } from './art/sprite-art.js';

const RADIUS = 0.3 * MOLE_SCALE; // «толщина» крота для столкновений
const FPS = { idle: 3, walk: 10, act: 10, carry: 10 }; // скорость анимаций, кадров в секунду
const ACT_TIME = MOLE.anims.act[1] / FPS.act;         // сколько длится «действие»

// Куда крот смотрит относительно камеры → строка листа.
// Камера смотрит по диагонали, поэтому «к зрителю» — это угол 45°.
function directionOf(heading) {
  const rel = Math.atan2(Math.sin(heading - Math.PI / 4), Math.cos(heading - Math.PI / 4));
  if (Math.abs(rel) <= Math.PI / 4) return 'down';
  if (Math.abs(rel) >= (3 * Math.PI) / 4) return 'up';
  return rel > 0 ? 'right' : 'left';
}

// Где урожай в лапах: перед кротом, а если он смотрит от нас — за ним
const HELD_OFFSET = {
  down: [0, 0.2, 0.03], left: [-0.22, 0.2, 0.03], right: [0.22, 0.2, 0.03], up: [0, 0.22, -0.03],
};

// Поворот на кратчайший угол
function turnTowards(current, target, maxStep) {
  let diff = target - current;
  diff = Math.atan2(Math.sin(diff), Math.cos(diff));
  return current + Math.max(-maxStep, Math.min(maxStep, diff));
}

export class Mole {
  constructor() {
    const sheets = getSheets();
    this.sprite = new Sprite(sheets.mole);
    this.heldSprite = new Sprite(sheets.held);
    this.object = new THREE.Group();
    this.object.add(this.sprite.object);
    this.sprite.object.add(this.heldSprite.mesh); // урожай — в той же «повёрнутой к камере» плоскости
    this.object.scale.setScalar(MOLE_SCALE);
    this.actTime = 0;         // сколько ещё показывать «действие»
    this.animTime = 0;
    this.heading = 0;        // куда смотрит сейчас (угол)
    this.targetHeading = 0;  // куда хочет повернуться
    this.walkTime = 0;
    this.path = [];          // точки маршрута после клика
    this.faceTo = null;      // куда повернуться в конце маршрута
    this.onArrive = null;
    this.held = null;        // что в лапах (например, 'carrot')
  }

  // Взять урожай в лапы (или освободить лапы, если type = null)
  setHeld(type) {
    this.held = type;
    this.heldSprite.mesh.visible = !!type;
    if (type) this.heldSprite.setFrame(PLANT_ORDER.indexOf(type), 0);
  }

  // Показать короткое движение «сажаю / поливаю / собираю»
  playAction() {
    this.actTime = ACT_TIME;
    this.animTime = 0;
  }

  get position() {
    return this.object.position;
  }

  // Точка перед носом — по ней ищем «клетку перед кротом»
  get frontPoint() {
    const d = CELL_SIZE * MOLE_REACH;
    return this.position.clone().add(new THREE.Vector3(Math.sin(this.heading) * d, 0, Math.cos(this.heading) * d));
  }

  walkPath(points, faceTo, onArrive) {
    this.path = points;
    this.faceTo = faceTo;
    this.onArrive = onArrive || null;
  }

  // keyDir — направление с клавиатуры (или нулевой вектор)
  update(dt, keyDir, world) {
    const step = MOLE_SPEED * CELL_SIZE * dt;
    const move = new THREE.Vector3();

    if (keyDir.lengthSq() > 0) {
      this.path = []; // клавиши отменяют маршрут
      this.onArrive = null;
      move.copy(keyDir).normalize().multiplyScalar(step);
    } else if (this.path.length) {
      const toTarget = this.path[0].clone().sub(this.position).setY(0);
      if (toTarget.length() <= step) {
        move.copy(toTarget);
        this.path.shift();
        if (!this.path.length) this.arrive();
      } else {
        move.copy(toTarget).setLength(step);
      }
    }

    const moving = move.lengthSq() > 1e-8;
    if (moving) {
      this.position.add(move);
      this.collide(world);
      this.targetHeading = Math.atan2(move.x, move.z);
    }

    this.heading = turnTowards(this.heading, this.targetHeading, MOLE_TURN_SPEED * dt);

    // Какую анимацию показать и какой кадр
    let anim = 'idle';
    if (this.actTime > 0) {
      anim = 'act';
      this.actTime -= dt;
    } else if (moving) {
      anim = this.held ? 'carry' : 'walk';
    } else if (this.held) {
      anim = 'carry'; // стоит с урожаем — первый кадр «несёт»
    }
    if (anim !== this.anim) {
      this.anim = anim;
      this.animTime = 0;
    }
    this.animTime += dt;
    const [first, count] = MOLE.anims[anim];
    const still = anim === 'carry' && !moving;
    const frame = still ? 0 : Math.floor(this.animTime * FPS[anim]) % count;
    const dir = directionOf(this.heading);
    this.sprite.setFrame(first + frame, MOLE.dirs[dir]);

    // урожай в лапах покачивается вместе с шагом
    const [hx, hy, hz] = HELD_OFFSET[dir];
    const bob = moving && frame % 3 === 0 ? -0.03 : 0;
    this.heldSprite.mesh.position.set(hx, hy + bob, hz);
  }

  arrive() {
    if (this.faceTo) {
      const d = this.faceTo.clone().sub(this.position);
      this.targetHeading = Math.atan2(d.x, d.z);
    }
    const cb = this.onArrive;
    this.onArrive = null;
    if (cb) cb();
  }

  // Не выходим за дорожку и не залезаем в корзинку
  collide(world) {
    const p = this.position;
    p.x = Math.max(world.bounds.min, Math.min(world.bounds.max, p.x));
    p.z = Math.max(world.bounds.min, Math.min(world.bounds.max, p.z));
    for (const o of world.obstacles) {
      const dx = p.x - o.x, dz = p.z - o.z;
      const dist = Math.hypot(dx, dz);
      const minDist = o.r + RADIUS;
      if (dist < minDist && dist > 0) {
        p.x = o.x + (dx / dist) * minDist;
        p.z = o.z + (dz / dist) * minDist;
      }
    }
  }
}
