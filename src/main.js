// Точка входа: собираем правила игры (game.js), картинку и управление, запускаем игровой цикл.
import * as THREE from 'three';
import { MOLE_START, BASKET_CELL } from './config.js';
import { cellToWorld, worldToCell, isInGarden, findPathToNeighbor } from './grid.js';
import { createGame, isBasket } from './game.js';
import { RIPE } from './garden.js';
import { createScene, createHoverFrame, createFrontMarker } from './scene.js';
import { Mole } from './mole.js';
import { GardenView } from './world/garden-view.js';
import { createInput } from './input.js';
import { createUI, TOOLS } from './ui.js';
import { createDecor } from './decor.js';
import { detectQuality } from './render/quality.js';
import { createPipeline } from './render/pipeline.js';
import { setTextureLimit } from './art/assets.js';
import { createLighting } from './render/lighting.js';
import { createWeather } from './render/weather.js';
import { createEffects } from './world/effects.js';
import { createLanterns } from './world/lanterns.js';
import { applySkyReflex } from './render/sky-reflex.js';
import { createDevPanel, loadFxSettings } from './render/devpanel.js';
import { loadGame, saveGame, clearSave } from './save.js';

const quality = detectQuality();
setTextureLimit(quality.textureSize); // на слабом качестве картинки уменьшаются при загрузке
const { renderer, scene, camera, cameraControl, world, basket, landmarks, island } = createScene(document.body);
const lighting = createLighting(renderer, scene, quality, landmarks.island); // тени — только над ровной серединой острова
const lanterns = createLanterns(scene, quality);
const effects = createEffects(scene, quality, lanterns.positions);
const weather = createWeather(scene, quality, lighting, landmarks.island);
const fx = loadFxSettings(quality);
const pipeline = createPipeline(renderer, scene, camera, fx, quality);
// Панель настройки (G) — только при разработке; в опубликованной игре её нет
const devPanel = import.meta.env.DEV ? createDevPanel(fx, pipeline, quality, weather) : null;

// ---------- Правила ----------
let restarting = false; // во время «начать заново» не сохраняем
const game = createGame({
  onHint: (text, ms) => ui.hint(text, ms),
  onEffect(name, cell) {
    mole.playAction(); // крот наклоняется: сажает, поливает, собирает, кладёт в корзинку
    const at = cellToWorld(cell.x, cell.z);
    if (name === 'planted') effects.dirt(at);
    if (name === 'watered') effects.water(mole.frontPoint.lerp(mole.position, 0.4), at);
    if (name === 'harvested') effects.sparkle(at);
    if (name === 'sold') effects.coins(at);
  },
  onChange: refresh,
});

// ---------- Картинка ----------
const gardenView = new GardenView(scene, game.garden);
const decor = createDecor(scene, landmarks);

const mole = new Mole();
mole.position.copy(cellToWorld(MOLE_START.x, MOLE_START.z));
mole.heading = mole.targetHeading = Math.PI; // смотрит на огород
scene.add(mole.object);

const hoverFrame = createHoverFrame();
const frontMarker = createFrontMarker();
scene.add(hoverFrame, frontMarker);

const ui = createUI({
  onSelectTool: (id) => game.selectTool(id),
  onSelectSeed: (type) => game.selectSeed(type),
  onBuy: (type, count) => game.buySeeds(type, count),
  onShopToggle: (open) => game.toggleShop(open),
});

// Загрузка сохранения. Растения «досчитываются» сами: стадия считается от момента полива.
const saved = loadGame();
if (saved) {
  game.load(saved);
  if (saved.mole) {
    mole.position.set(saved.mole.x, 0, saved.mole.z);
    mole.heading = mole.targetHeading = saved.mole.heading;
    mole.collide(world); // на случай, если огород поменялся
  }
}
cameraControl.centerOn(mole.position); // на телефоне сцена ближе — начинаем с крота
refresh();

// Обновить картинку и интерфейс по состоянию игры и сохранить — после любого изменения
function refresh() {
  if (mole.held !== game.state.held) mole.setHeld(game.state.held);
  basket.userData.fill.visible = game.hasHarvest();
  ui.render(game.view());
  save();
}

// ---------- Сохранение ----------
function save() {
  if (restarting) return;
  saveGame({ ...game.toSave(), mole: { x: mole.position.x, z: mole.position.z, heading: mole.heading } });
}

function restart() {
  restarting = true;
  clearSave();
  location.reload();
}

// При закрытии/сворачивании вкладки и раз в 5 секунд — на всякий случай
document.addEventListener('visibilitychange', () => {
  if (document.hidden) save();
});
window.addEventListener('pagehide', save);
setInterval(save, 5000);

// ---------- Управление ----------
// Клетка перед носом крота
function frontCell() {
  const c = worldToCell(mole.frontPoint);
  return isInGarden(c) || isBasket(c) ? c : null;
}

const input = createInput(renderer.domElement, camera, {
  // Клик по клетке: идём к ней, встаём рядом лицом к ней и действуем
  onCellClick(c) {
    const path = findPathToNeighbor(worldToCell(mole.position), c);
    if (!path) return;
    const points = path.map((p) => cellToWorld(p.x, p.z));
    if (points.length > 1) points.shift(); // первая точка — клетка, где крот уже стоит
    mole.walkPath(points, cellToWorld(c.x, c.z), () => game.useTool(c));
  },
  onAction() {
    const c = frontCell();
    if (c) game.useTool(c);
  },
  onPan(dx, dy) {
    cameraControl.panBy(dx, dy);
  },
  onTool(n) {
    if (n === 4) game.toggleShop();
    else if (TOOLS[n - 1]) game.selectTool(TOOLS[n - 1].id);
  },
}, [{ object: basket, cell: BASKET_CELL }]);

window.addEventListener('keydown', (e) => {
  if (e.code === 'Escape' && game.state.shopOpen) game.toggleShop(false);
});

// ---------- Игровой цикл ----------
// Где растут спелые светящиеся грибы — над ними поднимаются споры
function ripeMushrooms() {
  return game.garden.cells
    .filter((c) => c.plant === 'mushroom' && game.garden.stage(c) === RIPE)
    .map((c) => cellToWorld(c.x, c.z));
}

// Показать подсветку на клетке (или спрятать)
function placeOn(object, cell) {
  object.visible = !!cell;
  if (cell) {
    const p = cellToWorld(cell.x, cell.z);
    object.position.x = p.x;
    object.position.z = p.z;
  }
}

// Отсвет неба и растворение в дымке — всем материалам (и новым, например растениям) раз в секунду
applySkyReflex(scene);
let frameCount = 0;

let last = performance.now();
renderer.setAnimationLoop((now) => {
  if (++frameCount % 60 === 0) applySkyReflex(scene);
  const dt = Math.min((now - last) / 1000, 0.05); // не больше 1/20 с, чтобы не «прыгал» после паузы
  last = now;

  mole.update(dt, input.getMoveDir(), world);
  cameraControl.update(dt, now / 1000, mole.position);
  gardenView.update();
  decor.update(dt, now / 1000);
  weather.update(dt, decor.wind);
  decor.fireflyVisibility = 1 - weather.wetness; // в дождь светлячки прячутся
  effects.update(dt, { ripeMushrooms: ripeMushrooms(), visibility: 1 - weather.wetness });
  island.update(now / 1000);
  lanterns.update(now / 1000);

  placeOn(hoverFrame, input.hoverCell);
  placeOn(frontMarker, frontCell());

  pipeline.render(dt);
  devPanel?.tick(now);
});

// Только для разработки: доступ к игре из консоли браузера (game.restart() — начать заново)
if (import.meta.env.DEV) {
  window.game = {
    game, mole, camera, scene, restart, quality, pipeline, renderer, weather, effects, decor, cameraControl,
    // крупный план: game.closeUp(x, y, z, ширина) ; game.closeUp() — вернуть обычный вид
    closeUp(x, y, z, size) { cameraControl.closeUp(x === undefined ? null : new THREE.Vector3(x, y, z), size); },
    garden: game.garden,
    cheat(extraCoins = 1000) { game.addCoins(extraCoins); },
  };
}
