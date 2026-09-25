// Все игровые числа — здесь. Меняй смело: после сохранения файла игра обновится сама.

// Цвета предметов (полный цвет; общий тон картинке задаёт цветокоррекция — см. FX ниже)
export const COLORS = {
  background: '#171722',   // ночное небо вокруг острова
  ground: '#7d7a3c',       // осенняя трава острова
  soil: '#5c3d27',         // земля грядок
  soilWet: '#3a2618',      // политая земля
  soilRipe: '#86603a',     // клетка со спелым урожаем
  mound: '#6e4a2f',        // бугорок над семечком
  seed: '#e6c27a',
  leaves: '#5c8a34',       // ботва
  carrot: '#f07a1a',
  radish: '#d63a55',
  pumpkin: '#e88420',
  stem: '#6b7a2a',
  sunflowerPetals: '#f5c542',
  sunflowerCenter: '#4a2a12',
  mushroomStem: '#e8dcc0',
  mushroomCap: '#6fe3ff',  // светится
  houseWalls: '#c9a37b',
  houseRoof: '#8c3b2b',
  houseDoor: '#4a2c1a',
  houseWindow: '#ffd08a',  // светится
  houseTrim: '#5a3a22',    // брёвна, рамы, наличники
  houseShutters: '#3f6b5a',
  houseStep: '#8a877e',
  houseAccent: '#d4a84a',  // дверная ручка
  lamp: '#ffcf7a',         // фонарик и круглое окошко — светятся
  barrel: '#8a5a32',
  logs: '#a0703f',
  cliff: '#6b4a32',        // бока острова
  treeTrunk: '#5a3d28',
  leavesA: '#e0752a',      // осенняя листва
  leavesB: '#c2482a',
  rope: '#d8c08a',
  swingSeat: '#8a5a32',
  boulder: '#8d8a80',
  tallGrass: '#b8a24a',
  basket: '#c08a4a',
  basketInside: '#5a3a20',
  basketFill: '#f07a1a',
  moleBody: '#4a3a36',
  moleSnout: '#e8a8a0',
  moleOveralls: '#3a5a8a',
  moleNose: '#ff8fa0',
  moleEyes: '#111111',
  molePaws: '#e8b0a0',
  moleHat: '#e8cf8a',
  moleHatBand: '#a0302a',
  stone: '#9a968a',
  stoneDark: '#6a665c',
  grass: '#8a9a3a',
  flower: '#e85a8a',
  flowerCenter: '#f5c542',
  vane: '#3a3a3a',
  smoke: '#c8c0b8',
  fluff: '#fff4dc',
  water: '#8ad0ff',
  hoverFrame: '#fff4dc',  // рамка клетки под курсором
  frontCell: '#ffcf7a',   // клетка перед кротом
};

// Огород
export const GARDEN_SIZE = 8;   // клеток по стороне
export const CELL_SIZE = 1;     // размер клетки в «метрах» сцены

// Координаты ниже — в клетках. Огород: от 0 до 7.
// Вокруг огорода дорожка шириной в одну клетку: -1 и 8.
export const BASKET_CELL = { x: -1, z: 1 };   // корзинка стоит на дорожке
export const MOLE_START = { x: 4, z: 8 };     // где крот появляется

// Растения, в порядке открытия.
//   stageSeconds — сколько секунд длится каждая стадия после полива
//                  (семечко → росток → куст → спелое, то есть рост целиком = 3 × stageSeconds)
//   seedPrice    — цена семечка в магазине (0 — бесплатно и бесконечно)
//   sellPrice    — сколько монет даёт корзинка за урожай
//   unlock       — когда открывается: собрать count штук растения plant
//   forms        — как сказать «собери 1 / 3 / 5 …» (для подсказок)
export const PLANTS = {
  carrot:    { name: 'Морковь',         stageSeconds: 20,  seedPrice: 0,   sellPrice: 2,   unlock: null,                           forms: ['морковку', 'морковки', 'морковок'] },
  radish:    { name: 'Редис',           stageSeconds: 30,  seedPrice: 5,   sellPrice: 8,   unlock: { plant: 'carrot', count: 5 },    forms: ['редиску', 'редиски', 'редисок'] },
  pumpkin:   { name: 'Тыква',           stageSeconds: 60,  seedPrice: 15,  sellPrice: 30,  unlock: { plant: 'radish', count: 5 },    forms: ['тыкву', 'тыквы', 'тыкв'] },
  sunflower: { name: 'Подсолнух',       stageSeconds: 120, seedPrice: 40,  sellPrice: 80,  unlock: { plant: 'pumpkin', count: 3 },   forms: ['подсолнух', 'подсолнуха', 'подсолнухов'] },
  mushroom:  { name: 'Светящийся гриб', stageSeconds: 300, seedPrice: 100, sellPrice: 250, unlock: { plant: 'sunflower', count: 3 }, forms: ['гриб', 'гриба', 'грибов'] },
};

// Скорость роста всех растений: 1 — обычная, 10 — в десять раз быстрее (удобно для проверки)
export const GROWTH_SPEED = 1;

// Мелкие детали сцены
export const DECOR = {
  stones: 12,
  grassTufts: 18,
  flowers: 5,
  fluffs: 10,   // пушинки в воздухе
  fallingLeaves: 6, // листья, падающие с дерева
  wind: 0.8,    // сила ветра: 0 — штиль, 1 — ветрено
  smokePuffs: 4,       // сколько клубов дыма одновременно
  smokeOpacity: 0.45,  // плотность дыма: 0 — невидимый, 1 — сплошной
};

// Камера (только сенсорные экраны): минимальная ширина ромбика клетки, в точках (высота — примерно 0,6 от неё). Если огород целиком
// в экран не помещается (телефон), камера приближается и сцену можно двигать пальцем.
export const MIN_CELL_PX = 72;

// Крот
export const MOLE_SPEED = 3;        // клеток в секунду
export const MOLE_TURN_SPEED = 12;  // как быстро поворачивается
export const MOLE_SCALE = 1;        // размер крота
// Как далеко перед носом крота выбирается клетка для действия (в клетках).
// Меньше — ближе к кроту; меньше 0,5 не ставь: будет выбираться клетка под самим кротом.
export const MOLE_REACH = 0.55;

// Уровни качества картинки (выбирается автоматически: телефон — low, компьютер — high)
//   pixelScale  — во сколько раз пиксели сцены крупнее точек экрана
//   maxDpr      — предел чёткости экрана (меньше — быстрее)
//   shadowMap   — размер карты теней (больше — чётче тени)
//   ao          — мягкие затенения в углах
//   godRays     — лучи света
//   particles   — множитель количества частиц
export const QUALITY = {
  low:    { pixelScale: 3, maxDpr: 1, shadowMap: 1024, ao: false, godRays: false, particles: 0.4 },
  medium: { pixelScale: 3, maxDpr: 1.5, shadowMap: 2048, ao: false, godRays: true, particles: 0.7 },
  high:   { pixelScale: 3, maxDpr: 2, shadowMap: 2048, ao: true, godRays: true, particles: 1 },
  ultra:  { pixelScale: 2, maxDpr: 2, shadowMap: 4096, ao: true, godRays: true, particles: 1.5 },
};

// Сила свечения светящихся предметов (фонарь, окна, гриб): больше 1 — «горячее» белого, ловит bloom
export const GLOW = 3;

// Картинка по умолчанию (панель G меняет, «скопировать значения» — чтобы вписать сюда)
export const FX = {
  bloomIntensity: 1.2,  // сила свечения
  bloomThreshold: 0.9,  // с какой яркости начинает светиться
  bloomRadius: 0.7,     // как широко расходится свечение
  lut: 'autumn',        // цветокоррекция: autumn, sunset, dusk, neutral
  lutStrength: 1,
  vignette: 0.5,        // затемнение по краям
  grain: 0.12,          // плёночное зерно
};
