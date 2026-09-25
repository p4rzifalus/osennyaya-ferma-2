// Пиксельные спрайты, нарисованные кодом: крот, растения, урожай в лапах, трава и цветы.
// Любой лист можно заменить своим рисунком из Aseprite — порядок кадров описан в ART.md.
import { COLORS, PLANTS } from '../config.js';
import { PixelSheet } from './pixels.js';

export const PLANT_ORDER = Object.keys(PLANTS); // строки листа растений

// ---------- Крот ----------
// Кадр 32×32, земля — нижняя строка. Колонки: стоит 0–3, идёт 4–9, действует 10–13, несёт 14–19.
// Строки: 0 — к зрителю, 1 — влево, 2 — вправо (зеркало), 3 — от зрителя.
export const MOLE = {
  frameW: 32, frameH: 32, cols: 20, rows: 4,
  anims: { idle: [0, 4], walk: [4, 6], act: [10, 4], carry: [14, 6] }, // [первый кадр, сколько кадров]
  dirs: { down: 0, left: 1, right: 2, up: 3 },
};

const C = COLORS;

// pose: bob — присесть (0–2), liftL/liftR — поднять ногу, footL/footR — шаг вбок (для профиля),
// arms — 'down' | 'forward' | 'carry', swingL/swingR — взмах рук
function drawMoleFront(d, pose, back) {
  const b = pose.bob;
  // ноги и лапки
  d.rect(12, 26 + b, 3, 4 - b - pose.liftL, C.moleBody);
  d.rect(17, 26 + b, 3, 4 - b - pose.liftR, C.moleBody);
  d.ellipse(13, 30 - pose.liftL, 2, 1, C.molePaws);
  d.ellipse(19, 30 - pose.liftR, 2, 1, C.molePaws);
  // грудка и комбинезон
  d.ellipse(16, 17 + b, 5, 3, C.moleBody);
  d.ellipse(16, 22 + b, 6, 5, C.moleOveralls);
  if (back) {
    d.line(12, 16 + b, 19, 20 + b, C.moleOveralls); // лямки крест-накрест
    d.line(20, 16 + b, 13, 20 + b, C.moleOveralls);
  } else {
    d.line(13, 16 + b, 13, 19 + b, C.moleOveralls);
    d.line(19, 16 + b, 19, 19 + b, C.moleOveralls);
    d.px(13, 19 + b, C.moleHatBand);
    d.px(19, 19 + b, C.moleHatBand);
  }
  // руки
  const arm = (side) => {
    const x = side < 0 ? 9 : 23;
    const swing = side < 0 ? pose.swingL : pose.swingR;
    if (pose.arms === 'forward') {
      d.rect(side < 0 ? 10 : 21, 18 + b, 2, 4, C.moleBody);
      d.ellipse(side < 0 ? 12 : 20, 24 + b, 2, 1.5, C.molePaws);
    } else if (pose.arms === 'carry' && !back) {
      d.rect(side < 0 ? 10 : 21, 17 + b, 2, 3, C.moleBody);
      d.ellipse(side < 0 ? 12 : 20, 19 + b, 2, 1.5, C.molePaws);
    } else {
      d.rect(x, 17 + b, 2, 4, C.moleBody);
      d.ellipse(x + (side < 0 ? 0 : 1), 21 + b + swing, 1.5, 1.5, C.molePaws);
    }
  };
  arm(-1);
  arm(1);
  // голова
  d.ellipse(16, 10 + b, 6, 5, C.moleBody);
  if (!back) {
    d.ellipse(16, 13 + b, 2.5, 1.5, C.moleSnout);
    d.rect(15, 12 + b, 2, 1, C.moleNose);
    d.px(13, 10 + b, C.moleEyes);
    d.px(19, 10 + b, C.moleEyes);
  }
  // соломенная шляпа
  d.ellipse(16, 6 + b, 9, 1.5, C.moleHat);
  d.rect(12, 1 + b, 9, 5, C.moleHat);
  d.rect(12, 4 + b, 9, 1, C.moleHatBand);
}

// Профиль, мордочка влево (вправо — зеркально)
function drawMoleSide(d, pose) {
  const b = pose.bob;
  d.rect(12 + pose.footL, 26 + b, 3, 4 - b - pose.liftL, C.moleBody);
  d.rect(17 + pose.footR, 26 + b, 3, 4 - b - pose.liftR, C.moleBody);
  d.ellipse(12 + pose.footL, 30 - pose.liftL, 2.5, 1, C.molePaws);
  d.ellipse(17 + pose.footR, 30 - pose.liftR, 2.5, 1, C.molePaws);
  d.ellipse(17, 17 + b, 5, 3, C.moleBody);
  d.ellipse(17, 22 + b, 5.5, 5, C.moleOveralls);
  d.line(15, 16 + b, 15, 19 + b, C.moleOveralls);
  // ближняя рука
  if (pose.arms === 'forward') {
    d.rect(12, 18 + b, 3, 2, C.moleBody);
    d.ellipse(10, 23 + b, 2, 1.5, C.molePaws);
  } else if (pose.arms === 'carry') {
    d.rect(12, 17 + b, 3, 2, C.moleBody);
    d.ellipse(10, 19 + b, 2, 1.5, C.molePaws);
  } else {
    d.rect(15, 18 + b, 2, 4, C.moleBody);
    d.ellipse(15 + pose.swingL, 22 + b, 1.5, 1.5, C.molePaws);
  }
  // голова с длинной мордочкой
  d.ellipse(16, 10 + b, 5.5, 5, C.moleBody);
  d.ellipse(10, 12 + b, 3.5, 1.5, C.moleSnout);
  d.rect(6, 11 + b, 2, 2, C.moleNose);
  d.px(13, 9 + b, C.moleEyes);
  d.ellipse(16, 6 + b, 8, 1.5, C.moleHat);
  d.rect(12, 1 + b, 8, 5, C.moleHat);
  d.rect(12, 4 + b, 8, 1, C.moleHatBand);
}

function molePose(anim, i) {
  const base = { bob: 0, liftL: 0, liftR: 0, footL: 0, footR: 0, swingL: 0, swingR: 0, arms: 'down' };
  if (anim === 'idle') return { ...base, bob: [0, 0, 1, 0][i] }; // дыхание
  if (anim === 'act') return { ...base, bob: [0, 1, 2, 1][i], arms: 'forward' };
  // ходьба и «несёт»: 6 кадров шага
  const p = (i / 6) * Math.PI * 2;
  const s = Math.sin(p);
  return {
    ...base,
    bob: i % 3 === 0 ? 1 : 0,
    liftL: s > 0.3 ? 1 : 0,
    liftR: s < -0.3 ? 1 : 0,
    footL: Math.round(Math.cos(p) * 2),
    footR: -Math.round(Math.cos(p) * 2),
    swingL: s > 0.3 ? -1 : s < -0.3 ? 1 : 0,
    swingR: s > 0.3 ? 1 : s < -0.3 ? -1 : 0,
    arms: anim === 'carry' ? 'carry' : 'down',
  };
}

export function drawMoleSheet() {
  const sheet = new PixelSheet(MOLE.frameW * MOLE.cols, MOLE.frameH * MOLE.rows);
  for (const [anim, [start, count]] of Object.entries(MOLE.anims)) {
    for (let i = 0; i < count; i++) {
      const pose = molePose(anim, i);
      const col = start + i;
      drawMoleFront(sheet.frame(col, MOLE.dirs.down, 32, 32), pose, false);
      drawMoleSide(sheet.frame(col, MOLE.dirs.left, 32, 32), pose);
      drawMoleSide(sheet.frame(col, MOLE.dirs.right, 32, 32, true), pose);
      drawMoleFront(sheet.frame(col, MOLE.dirs.up, 32, 32), pose, true);
    }
  }
  return sheet.finish();
}

// ---------- Растения ----------
// Кадр 32×40, земля — нижняя строка. Колонки: стадия 0 семечко, 1 росток, 2 куст, 3 спелое.
// Строки — растения в порядке PLANT_ORDER (морковь, редис, тыква, подсолнух, гриб).
export const PLANT_FRAME = { frameW: 32, frameH: 40, cols: 4 };

// Маленькая кучка земли у основания растения
function mound(d) {
  d.ellipse(16, 37, 4.5, 1.8, C.mound);
  d.px(14, 37, C.soil);
  d.px(18, 36, C.soil);
}

function sprout(d) {
  d.line(16, 31, 16, 35, C.leaves);
  d.ellipse(14, 31, 2, 1, C.leaves);
  d.ellipse(18, 30, 2, 1, C.leaves);
}

const DRAW_PLANT = {
  carrot(d, stage) {
    const top = stage === 3 ? 17 : 23;
    for (const [x, y] of [[9, top + 3], [12, top], [16, top - 1], [20, top], [23, top + 3]]) {
      d.line(16, 34, x, y, C.leaves);
      d.ellipse(x, y, 1.5, 1.5, C.leaves);
    }
    if (stage === 3) d.ellipse(16, 35, 4, 2, C.carrot); // оранжевые «плечики» морковки
  },
  radish(d, stage) {
    const y = stage === 3 ? 25 : 29;
    d.line(16, 34, 13, y, C.leaves);
    d.line(16, 34, 19, y, C.leaves);
    d.ellipse(13, y, 3, 4, C.leaves);
    d.ellipse(19, y, 3, 4, C.leaves);
    if (stage === 3) {
      d.ellipse(16, 33, 5, 4, C.radish);
      d.px(16, 37, '#f4e8e8');
    }
  },
  pumpkin(d, stage) {
    d.ellipse(10, 32, 4, 2.5, C.leaves);
    d.ellipse(22, 31, 4, 2.5, C.leaves);
    d.ellipse(16, 29, 3, 2, C.leaves);
    if (stage === 3) {
      d.ellipse(16, 31, 10, 6, C.pumpkin);
      for (const x of [11, 16, 21]) d.line(x, 27, x, 36, '#c86a14'); // рёбра тыквы
      d.rect(15, 23, 2, 3, C.stem);
    }
  },
  sunflower(d, stage) {
    const top = stage === 3 ? 12 : 16;
    d.line(16, 36, 16, top, C.leaves);
    d.ellipse(13, 27, 3, 1.5, C.leaves);
    d.ellipse(19, 22, 3, 1.5, C.leaves);
    if (stage === 3) {
      d.ellipse(16, 9, 7, 7, C.sunflowerPetals);
      d.ellipse(16, 9, 3.5, 3.5, C.sunflowerCenter);
      d.px(15, 8, '#6a4020');
      d.px(17, 10, '#6a4020');
    } else {
      d.ellipse(16, 15, 2, 2, C.leaves); // бутон
    }
  },
  mushroom(d, stage) {
    const glow = true;
    if (stage === 1) { d.ellipse(16, 34, 2, 1.5, C.mushroomCap, glow); return; }
    const [sx, sw, sy, sh, cy, rx, ry] = stage === 2 ? [15, 2, 31, 4, 30, 4, 2.5] : [14, 4, 28, 8, 26, 9, 5];
    d.ellipse(16, cy, rx, ry, C.mushroomCap, glow);
    for (let y = cy + 1; y <= cy + ry + 1; y++) for (let x = 16 - rx - 1; x <= 16 + rx + 1; x++) d.px(x, y, null); // низ шляпки срезан
    d.rect(sx, sy, sw, sh, C.mushroomStem);
    if (stage === 3) for (const [x, y] of [[12, 24], [17, 23], [20, 25]]) d.px(x, y, '#d8fbff', glow); // пятнышки
  },
};

export function drawPlantSheet() {
  const { frameW, frameH, cols } = PLANT_FRAME;
  const sheet = new PixelSheet(frameW * cols, frameH * PLANT_ORDER.length);
  PLANT_ORDER.forEach((type, row) => {
    for (let stage = 0; stage < cols; stage++) {
      const d = sheet.frame(stage, row, frameW, frameH);
      mound(d);
      if (stage === 0) { d.px(14, 35, C.seed); d.px(17, 36, C.seed); }
      else if (stage === 1 && type !== 'mushroom') sprout(d);
      else DRAW_PLANT[type](d, stage);
    }
  });
  return sheet.finish();
}

// ---------- Урожай в лапах ----------
// Кадр 16×16, колонки — растения в порядке PLANT_ORDER.
export const HELD_FRAME = { frameW: 16, frameH: 16 };

const DRAW_HELD = {
  carrot(d) { d.line(3, 11, 11, 5, C.carrot); d.line(3, 12, 11, 6, C.carrot); d.line(4, 12, 12, 6, C.carrot); d.line(12, 5, 14, 2, C.leaves); d.line(12, 6, 15, 5, C.leaves); },
  radish(d) { d.ellipse(8, 10, 4, 3.5, C.radish); d.line(8, 6, 6, 2, C.leaves); d.line(8, 6, 10, 2, C.leaves); },
  pumpkin(d) { d.ellipse(8, 9, 7, 5, C.pumpkin); d.line(5, 5, 5, 13, '#c86a14'); d.line(11, 5, 11, 13, '#c86a14'); d.rect(7, 2, 2, 3, C.stem); },
  sunflower(d) { d.line(8, 15, 8, 9, C.leaves); d.ellipse(8, 6, 5, 5, C.sunflowerPetals); d.ellipse(8, 6, 2.5, 2.5, C.sunflowerCenter); },
  mushroom(d) { d.ellipse(8, 8, 6, 3.5, C.mushroomCap, true); for (let x = 1; x < 15; x++) for (let y = 9; y < 12; y++) d.px(x, y, null); d.rect(6, 9, 4, 5, C.mushroomStem); },
};

export function drawHeldSheet() {
  const sheet = new PixelSheet(HELD_FRAME.frameW * PLANT_ORDER.length, HELD_FRAME.frameH);
  PLANT_ORDER.forEach((type, col) => DRAW_HELD[type](sheet.frame(col, 0, 16, 16)));
  return sheet.finish();
}

// ---------- Дым из трубы ----------
// Кадр 16×16, колонки 0–3: маленький плотный клуб → большой рассыпающийся (с «дырками»).
export const SMOKE_FRAME = { frameW: 16, frameH: 16, cols: 4 };

export function drawSmokeSheet() {
  const sheet = new PixelSheet(SMOKE_FRAME.frameW * SMOKE_FRAME.cols, SMOKE_FRAME.frameH);
  const puffs = [
    [[8, 9, 3, 3]],
    [[7, 9, 4, 3.5], [10, 7, 3, 3]],
    [[6, 9, 4.5, 4], [10, 7, 4, 3.5], [8, 5, 3, 2.5]],
    [[6, 9, 5, 4], [11, 7, 4, 4], [8, 4, 3.5, 3]],
  ];
  puffs.forEach((blobs, col) => {
    const d = sheet.frame(col, 0, 16, 16);
    blobs.forEach(([x, y, rx, ry]) => d.ellipse(x, y, rx, ry, C.smoke));
    if (col === 3) { // рассеивается: выбиваем пиксели шахматкой
      for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) if ((x + y) % 2 === 0 && (x * 7 + y * 3) % 5 < 3) d.px(x, y, null);
    }
  });
  return sheet.finish();
}

// ---------- Трава и цветы ----------
// Кадр 16×24, земля — нижняя строка. Колонки: пучки травы 0–2, цветы 3–5, высокая трава 6–7.
export const DECOR_FRAME = { frameW: 16, frameH: 24, cols: 8, tufts: [0, 1, 2], flowers: [3, 4, 5], tall: [6, 7] };

export function drawDecorSheet() {
  const { frameW, frameH, cols } = DECOR_FRAME;
  const sheet = new PixelSheet(frameW * cols, frameH);
  const grassTones = [[C.grass, '#6f8a30'], [C.tallGrass, '#9a8a3a'], [C.grass, C.tallGrass]];
  grassTones.forEach(([a, b], col) => {
    const d = sheet.frame(col, 0, frameW, frameH);
    [[3, 16, a], [6, 13, b], [8, 11, a], [10, 14, b], [13, 17, a]].forEach(([x, y, c]) => d.line(8, 23, x, y, c));
  });
  [['#e85a8a', C.flowerCenter], ['#f4efe6', C.flowerCenter], ['#f5c542', '#b0602a']].forEach(([petal, center], i) => {
    const d = sheet.frame(3 + i, 0, frameW, frameH);
    d.line(8, 23, 8, 12, C.leaves);
    d.ellipse(6, 18, 2, 1, C.leaves);
    d.ellipse(8, 10, 3, 3, petal);
    d.px(8, 10, center);
  });
  [[C.tallGrass, '#8a7a36'], ['#a88a3e', C.tallGrass]].forEach(([a, b], i) => {
    const d = sheet.frame(6 + i, 0, frameW, frameH);
    [[1, 6, a], [4, 2, b], [7, 1, a], [9, 3, b], [12, 2, a], [15, 7, b], [5, 8, b], [11, 9, a]].forEach(([x, y, c]) => d.line(8, 23, x, y, c));
  });
  return sheet.finish();
}
