// Процедурные пиксельные текстуры. Каждая рисуется попиксельно и даёт три слоя:
//   цвет (albedo), высоту (для рельефа — карты нормалей) и шероховатость (матовое / блестящее).
// Все текстуры бесшовные: повторяются без стыков.
import { COLORS } from '../config.js';

// ---------- помощники ----------
function seededRandom(seed) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const hex = (h) => {
  const n = parseInt(h.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
const mix = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);
const shade = (c, k) => c.map((v) => v * k); // k < 1 — темнее, > 1 — светлее
const clamp01 = (v) => Math.min(1, Math.max(0, v));

// Бесшовный «шум» — плавные пятна; cells — сколько пятен по стороне
function tileNoise(size, cells, rand) {
  const grid = Array.from({ length: cells * cells }, rand);
  const at = (x, y) => grid[((y + cells) % cells) * cells + ((x + cells) % cells)];
  const out = new Float32Array(size * size);
  const smooth = (t) => t * t * (3 - 2 * t);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const gx = (x / size) * cells;
      const gy = (y / size) * cells;
      const x0 = Math.floor(gx);
      const y0 = Math.floor(gy);
      const tx = smooth(gx - x0);
      const ty = smooth(gy - y0);
      const top = at(x0, y0) + (at(x0 + 1, y0) - at(x0, y0)) * tx;
      const bottom = at(x0, y0 + 1) + (at(x0 + 1, y0 + 1) - at(x0, y0 + 1)) * tx;
      out[y * size + x] = top + (bottom - top) * ty;
    }
  }
  return out;
}

// Холст текстуры: set(x, y, цвет, высота 0..1, шероховатость 0..1)
function canvasOf(size) {
  const albedo = new Uint8ClampedArray(size * size * 4);
  const height = new Float32Array(size * size).fill(0.5);
  const rough = new Float32Array(size * size).fill(0.9);
  const wrap = (v) => ((v % size) + size) % size;
  return {
    size, albedo, height, rough,
    set(x, y, color, h, r) {
      const i = wrap(y) * size + wrap(x);
      albedo[i * 4] = color[0];
      albedo[i * 4 + 1] = color[1];
      albedo[i * 4 + 2] = color[2];
      albedo[i * 4 + 3] = 255;
      if (h !== undefined) height[i] = h;
      if (r !== undefined) rough[i] = r;
    },
    getHeight: (x, y) => height[wrap(y) * size + wrap(x)],
  };
}

// ---------- текстуры ----------
// units — сколько единиц сцены покрывает одна текстура (≈16 пикселей текстуры на единицу)
export const TEXTURES = {
  // Трава острова: оливковая основа, пятна, травинки, редкие сухие листья
  grass: { size: 32, units: 2, draw(c, rand) {
    const base = hex(COLORS.ground);
    const n = tileNoise(c.size, 4, rand);
    const fine = tileNoise(c.size, 16, rand);
    for (let y = 0; y < c.size; y++) {
      for (let x = 0; x < c.size; x++) {
        const v = n[y * c.size + x] * 0.6 + fine[y * c.size + x] * 0.4;
        c.set(x, y, shade(mix(base, hex('#8a7a36'), n[y * c.size + x] * 0.6), 0.72 + v * 0.3), 0.4 + v * 0.2, 0.92);
      }
    }
    for (let i = 0; i < 40; i++) { // травинки: светлая верхушка, тёмный низ
      const x = Math.floor(rand() * c.size);
      const y = Math.floor(rand() * c.size);
      c.set(x, y, shade(base, 1.35), 0.9);
      c.set(x, y + 1, shade(base, 0.7), 0.3);
    }
    for (let i = 0; i < 5; i++) { // опавшие листья
      const x = Math.floor(rand() * c.size);
      const y = Math.floor(rand() * c.size);
      const leaf = hex(rand() < 0.5 ? COLORS.leavesA : COLORS.leavesB);
      c.set(x, y, leaf, 0.7);
      c.set(x + 1, y, shade(leaf, 0.8), 0.6);
    }
  } },

  // Обрыв: слои земли, камешки, корешки
  cliff: { size: 32, units: 2, draw(c, rand) {
    const base = hex(COLORS.cliff);
    const n = tileNoise(c.size, 8, rand);
    for (let y = 0; y < c.size; y++) {
      const band = Math.sin((y / c.size) * Math.PI * 2 * 4 + n[y * c.size] * 3) * 0.5 + 0.5; // слои
      for (let x = 0; x < c.size; x++) {
        const v = n[y * c.size + x];
        c.set(x, y, shade(base, 0.7 + band * 0.25 + v * 0.2), 0.3 + band * 0.3, 0.95);
      }
    }
    for (let i = 0; i < 14; i++) { // камешки 2×2 с бликом
      const x = Math.floor(rand() * c.size);
      const y = Math.floor(rand() * c.size);
      const stone = shade(hex(COLORS.boulder), 0.8 + rand() * 0.3);
      c.set(x, y, shade(stone, 1.2), 1, 0.7);
      c.set(x + 1, y, stone, 0.9, 0.7);
      c.set(x, y + 1, stone, 0.9, 0.7);
      c.set(x + 1, y + 1, shade(stone, 0.7), 0.8, 0.7);
    }
    for (let i = 0; i < 4; i++) { // корешки: тёмные извилины
      let x = Math.floor(rand() * c.size);
      let y = Math.floor(rand() * c.size);
      for (let s = 0; s < 6; s++) {
        c.set(x, y, shade(base, 0.45), 0.1);
        x += rand() < 0.5 ? 1 : 0;
        y += 1;
      }
    }
  } },

  // Земля грядки: борозды и комочки
  soil: { size: 16, units: 1, draw(c, rand) {
    const base = hex(COLORS.soil);
    const n = tileNoise(c.size, 4, rand);
    const clumps = tileNoise(c.size, 8, rand);
    for (let y = 0; y < c.size; y++) {
      for (let x = 0; x < c.size; x++) {
        // мягкие борозды, «размытые» комками
        const ridge = Math.sin((y / c.size) * Math.PI * 2 * 3 + n[y * c.size + x] * 2.5) * 0.5 + 0.5;
        const v = clumps[y * c.size + x];
        c.set(x, y, shade(base, 0.8 + ridge * 0.15 + v * 0.25), ridge * 0.4 + v * 0.6, 0.95);
      }
    }
    for (let i = 0; i < 14; i++) { // комочки и камешки
      const x = Math.floor(rand() * c.size);
      const y = Math.floor(rand() * c.size);
      const light = rand() < 0.6;
      c.set(x, y, shade(base, light ? 1.3 : 0.65), light ? 1 : 0.2);
    }
  } },

  // Камень: пятнистый серый с трещинами
  stone: { size: 16, units: 1, draw(c, rand) {
    const base = hex(COLORS.boulder);
    const n = tileNoise(c.size, 4, rand);
    const fine = tileNoise(c.size, 16, rand);
    for (let y = 0; y < c.size; y++) {
      for (let x = 0; x < c.size; x++) {
        const v = n[y * c.size + x] * 0.7 + fine[y * c.size + x] * 0.3;
        c.set(x, y, shade(mix(base, hex('#7a8a6a'), n[y * c.size + x] > 0.7 ? 0.4 : 0), 0.75 + v * 0.4), v, 0.8);
      }
    }
    let x = Math.floor(rand() * c.size);
    for (let y = 0; y < c.size; y++) { // трещина
      c.set(x, y, shade(base, 0.45), 0, 0.9);
      x += Math.floor(rand() * 3) - 1;
    }
  } },

  // Доски стен: горизонтальные, со щелями, волокнами и сучками
  planks: { size: 32, units: 2, draw(c, rand) {
    const base = hex(COLORS.houseWalls);
    const grain = tileNoise(c.size, 16, rand);
    for (let y = 0; y < c.size; y++) {
      const board = Math.floor(y / 4);
      const tone = 0.85 + ((board * 37) % 7) / 30; // каждая доска своего тона
      for (let x = 0; x < c.size; x++) {
        const gap = y % 4 === 3;
        const g = grain[y * c.size + x];
        const color = gap ? shade(base, 0.68) : shade(base, tone * (0.92 + g * 0.16));
        c.set(x, y, color, gap ? 0.3 : 0.6 + g * 0.1, 0.8);
      }
      if (y % 4 === 1 && rand() < 0.4) { // сучок
        const kx = Math.floor(rand() * c.size);
        c.set(kx, y, shade(base, 0.6), 0.4);
      }
    }
  } },

  // Черепица: ряды полукруглых плиток со сдвигом, низ плитки темнее
  roof: { size: 32, units: 2, draw(c, rand) {
    const base = hex(COLORS.houseRoof);
    for (let y = 0; y < c.size; y++) {
      const row = Math.floor(y / 4);
      const inRow = y % 4; // 0 — верх плитки, 3 — нижний край
      const shift = row % 2 ? 2 : 0;
      for (let x = 0; x < c.size; x++) {
        const inTile = (x + shift) % 4;
        const edge = inTile === 0 || inRow === 3;
        const k = edge ? 0.72 : 1.08 - inRow * 0.08;
        c.set(x, y, shade(base, k * (0.95 + rand() * 0.1)), edge ? 0.35 : 0.9 - inRow * 0.15, 0.7);
      }
    }
  } },

  // Кора: вертикальные тёмные борозды
  bark: { size: 16, units: 1, draw(c, rand) {
    const base = hex(COLORS.treeTrunk);
    const n = tileNoise(c.size, 8, rand);
    for (let y = 0; y < c.size; y++) {
      for (let x = 0; x < c.size; x++) {
        const groove = Math.sin((x / c.size) * Math.PI * 2 * 4 + n[y * c.size + x] * 2) * 0.5 + 0.5;
        c.set(x, y, shade(base, 0.6 + groove * 0.6), groove, 0.95);
      }
    }
  } },

  // Листва кроны: гроздья листьев трёх осенних тонов
  leaves: { size: 16, units: 1, draw(c, rand) {
    const tones = [hex(COLORS.leavesA), hex(COLORS.leavesB), hex('#f0b040')];
    for (let y = 0; y < c.size; y++) for (let x = 0; x < c.size; x++) c.set(x, y, shade(tones[1], 0.55), 0.2, 0.8);
    for (let i = 0; i < 40; i++) { // листик: 2×2 со светлым краем
      const x = Math.floor(rand() * c.size);
      const y = Math.floor(rand() * c.size);
      const t = tones[Math.floor(rand() * tones.length)];
      c.set(x, y, shade(t, 1.15), 1);
      c.set(x + 1, y, t, 0.8);
      c.set(x, y + 1, t, 0.8);
      c.set(x + 1, y + 1, shade(t, 0.75), 0.6);
    }
  } },

  // Дерево (рамы, дверь, бочка, поленья): волокна
  wood: { size: 16, units: 1, draw(c, rand) {
    const base = [228, 224, 218]; // светлая нейтральная — цвет задаёт оттенок материала
    const grain = tileNoise(c.size, 8, rand);
    for (let y = 0; y < c.size; y++) {
      for (let x = 0; x < c.size; x++) {
        const g = Math.sin(y * 1.7 + grain[y * c.size + x] * 4) * 0.5 + 0.5;
        c.set(x, y, shade(base, 0.8 + g * 0.3), g, 0.75);
      }
    }
  } },

  // Плетёнка корзинки
  wicker: { size: 16, units: 0.5, draw(c) {
    const base = hex(COLORS.basket);
    for (let y = 0; y < c.size; y++) {
      for (let x = 0; x < c.size; x++) {
        const over = (Math.floor(x / 4) + Math.floor(y / 4)) % 2 === 0;
        const along = over ? x % 4 : y % 4;
        const k = along === 0 || along === 3 ? 0.65 : 1.05;
        c.set(x, y, shade(base, k), k > 1 ? 0.9 : 0.2, 0.85);
      }
    }
  } },
};

// Нарисовать текстуру по имени
export function generateTexture(name, seed = 1) {
  const def = TEXTURES[name];
  const c = canvasOf(def.size);
  def.draw(c, seededRandom(seed * 7919 + name.length * 131));
  return c;
}

// Карта нормалей из высоты: где высота меняется — там «склон», свет ложится по-разному
export function normalFromHeight(c, strength = 2) {
  const { size } = c;
  const out = new Uint8ClampedArray(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = (c.getHeight(x + 1, y) - c.getHeight(x - 1, y)) * strength;
      const dy = (c.getHeight(x, y + 1) - c.getHeight(x, y - 1)) * strength;
      const len = Math.hypot(dx, dy, 1);
      const i = (y * size + x) * 4;
      out[i] = (-dx / len * 0.5 + 0.5) * 255;
      out[i + 1] = (dy / len * 0.5 + 0.5) * 255; // ось y картинки идёт вниз
      out[i + 2] = (1 / len * 0.5 + 0.5) * 255;
      out[i + 3] = 255;
    }
  }
  return out;
}

export function roughnessPixels(c) {
  const out = new Uint8ClampedArray(c.size * c.size * 4);
  for (let i = 0; i < c.size * c.size; i++) {
    const r = clamp01(c.rough[i]) * 255;
    out[i * 4] = r; out[i * 4 + 1] = r; out[i * 4 + 2] = r; out[i * 4 + 3] = 255;
  }
  return out;
}
