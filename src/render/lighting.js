// Вечерний свет. Небо — главный источник цвета: из картинки art/sky.png берутся
// отражения на блестящем, цвет рассеянного света, дымки и отсвета на краях (см. sky-reflex.js).
// Если картинки нет — запасной градиент и цвета из config.js → LIGHTING.
import * as THREE from 'three';
import { LIGHTING } from '../config.js';
import { userArtUrl } from '../art/assets.js';
import { skyUniforms } from './sky-reflex.js';

// Запасное небо: вертикальный градиент из config.js
function gradientCanvas() {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 256;
  const ctx = canvas.getContext('2d');
  const g = ctx.createLinearGradient(0, 0, 0, 256);
  LIGHTING.sky.forEach(([stop, color]) => g.addColorStop(stop, color));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 256, 256);
  return canvas;
}

// Средний цвет полосы картинки (from, to — доли высоты 0..1)
function averageColor(canvas, from, to) {
  const small = document.createElement('canvas');
  small.width = small.height = 32;
  const ctx = small.getContext('2d');
  ctx.drawImage(canvas, 0, 0, 32, 32);
  const data = ctx.getImageData(0, Math.floor(from * 32), 32, Math.max(1, Math.floor((to - from) * 32))).data;
  let r = 0, g = 0, b = 0;
  for (let i = 0; i < data.length; i += 4) { r += data[i]; g += data[i + 1]; b += data[i + 2]; }
  const n = data.length / 4;
  return new THREE.Color().setRGB(r / n / 255, g / n / 255, b / n / 255, THREE.SRGBColorSpace);
}

// Тёплый ореол за островом — будто свет фонарей рассеивается в вечернем воздухе
function withHalo(image) {
  const canvas = document.createElement('canvas');
  canvas.width = image.width;
  canvas.height = image.height;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
  const { color, strength, x, y, radius } = LIGHTING.halo;
  const cx = x * canvas.width;
  const cy = y * canvas.height;
  const r = radius * Math.max(canvas.width, canvas.height);
  const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
  const c = new THREE.Color(color);
  const rgba = (a) => `rgba(${Math.round(c.r * 255)},${Math.round(c.g * 255)},${Math.round(c.b * 255)},${a})`;
  g.addColorStop(0, rgba(strength));
  g.addColorStop(1, rgba(0));
  ctx.globalCompositeOperation = 'screen';
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  return canvas;
}

// Фон во весь экран без искажений (лишнее обрезается по краям)
function backdrop(canvas) {
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  const imageAspect = canvas.width / canvas.height;
  const fit = () => {
    const k = window.innerWidth / window.innerHeight / imageAspect;
    if (k > 1) { tex.repeat.set(1, 1 / k); tex.offset.set(0, (1 - 1 / k) / 2); }
    else { tex.repeat.set(k, 1); tex.offset.set((1 - k) / 2, 0); }
  };
  fit();
  window.addEventListener('resize', fit);
  return tex;
}

// Окружение для отражений: небо на верхней полусфере, снизу — тёмная земля. Считается один раз.
function environmentMap(renderer, canvas, groundColor) {
  const envScene = new THREE.Scene();
  const skyTex = new THREE.CanvasTexture(canvas);
  skyTex.colorSpace = THREE.SRGBColorSpace;
  envScene.add(new THREE.Mesh(
    new THREE.SphereGeometry(10, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2),
    new THREE.MeshBasicMaterial({ map: skyTex, side: THREE.BackSide }),
  ));
  const ground = new THREE.Mesh(new THREE.CircleGeometry(10, 24), new THREE.MeshBasicMaterial({ color: groundColor }));
  ground.rotation.x = -Math.PI / 2;
  envScene.add(ground);
  const pmrem = new THREE.PMREMGenerator(renderer);
  const env = pmrem.fromScene(envScene, 0.04).texture;
  pmrem.dispose();
  skyTex.dispose();
  return env;
}

export function createLighting(renderer, scene, quality, islandBounds) {
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap; // мягкие края теней

  // Рассеянный свет: сверху — небо, снизу — тёплый отсвет земли
  const hemi = new THREE.HemisphereLight(LIGHTING.skyLight, LIGHTING.groundColor, LIGHTING.skyLightIntensity);
  scene.add(hemi);

  // Солнце у горизонта: длинные тени. Область теней — ровно по острову: так тени чётче при том же размере карты
  const sun = new THREE.DirectionalLight(LIGHTING.sunColor, LIGHTING.sunIntensity);
  const az = THREE.MathUtils.degToRad(LIGHTING.sunDirection.azimuth);
  const el = THREE.MathUtils.degToRad(LIGHTING.sunDirection.elevation);
  const center = new THREE.Vector3((islandBounds.minX + islandBounds.maxX) / 2, 0, (islandBounds.minZ + islandBounds.maxZ) / 2);
  sun.position.set(Math.cos(el) * Math.sin(az), Math.sin(el), Math.cos(el) * Math.cos(az)).multiplyScalar(25).add(center);
  sun.target.position.copy(center);
  scene.add(sun.target);
  const reach = Math.hypot(islandBounds.maxX - islandBounds.minX, islandBounds.maxZ - islandBounds.minZ) / 2 + 0.5;
  sun.castShadow = true;
  sun.shadow.mapSize.set(quality.shadowMap, quality.shadowMap);
  sun.shadow.bias = -0.0005;
  sun.shadow.normalBias = 0.03;
  Object.assign(sun.shadow.camera, { left: -reach, right: reach, top: reach, bottom: -reach, near: 1, far: 50 });
  scene.add(sun);

  scene.fog = new THREE.Fog(LIGHTING.fogColor, LIGHTING.fogNear, LIGHTING.fogFar);
  skyUniforms.uSkyRimStrength.value = LIGHTING.skyReflex;
  skyUniforms.uFadeStrength.value = LIGHTING.bottomFade;

  // Настроить весь свет по картинке неба (или по запасному градиенту)
  function useSky(canvas) {
    const top = averageColor(canvas, 0, 0.35);
    const horizon = averageColor(canvas, 0.7, 1);
    hemi.color.copy(top).lerp(new THREE.Color(LIGHTING.skyLight), 0.3); // свет сверху — в цвет неба
    scene.fog.color.copy(horizon);                                       // дымка — цвета горизонта
    skyUniforms.uSkyRim.value.copy(horizon).lerp(top, 0.3);              // отсвет на краях
    skyUniforms.uFadeColor.value.copy(horizon);                          // низ острова уходит в горизонт
    scene.environment?.dispose();
    scene.environment = environmentMap(renderer, canvas, LIGHTING.groundColor);
    scene.environmentIntensity = LIGHTING.environmentIntensity;
    scene.background = backdrop(canvas);
  }

  useSky(withHalo(gradientCanvas()));
  const url = userArtUrl('sky');
  if (url) new THREE.ImageLoader().load(url, (image) => useSky(withHalo(image)));

  return { sun, hemi };
}
