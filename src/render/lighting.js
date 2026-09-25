// Вечерний свет: низкое тёплое солнце, небо-градиент, дымка, отражение неба на блестящем.
// Фонари — в world/lanterns.js. Все числа — в config.js → LIGHTING.
import * as THREE from 'three';
import { LIGHTING } from '../config.js';
import { userArtUrl } from '../art/assets.js';

// Вертикальный градиент неба: сверху тёмно-синее, у горизонта — закат
function skyTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 2;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  const g = ctx.createLinearGradient(0, 0, 0, 256);
  LIGHTING.sky.forEach(([stop, color]) => g.addColorStop(stop, color));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 2, 256);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// Окружение для отражений: большая сфера с тем же небом — блестящие места отражают закат
function environmentMap(renderer, sky) {
  const envScene = new THREE.Scene();
  const dome = new THREE.Mesh(
    new THREE.SphereGeometry(10, 32, 16),
    new THREE.MeshBasicMaterial({ map: sky, side: THREE.BackSide }),
  );
  // сфера размечена сверху вниз: верх — зенит, середина — горизонт; ниже горизонта — тёмная земля
  envScene.add(dome);
  const ground = new THREE.Mesh(new THREE.CircleGeometry(10, 16), new THREE.MeshBasicMaterial({ color: LIGHTING.groundColor }));
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.5;
  envScene.add(ground);
  const pmrem = new THREE.PMREMGenerator(renderer);
  const env = pmrem.fromScene(envScene, 0.04).texture;
  pmrem.dispose();
  return env;
}

// Картинка фона из art/sky.png: заполняет экран без искажений (лишнее обрезается по краям)
function useBackdropImage(scene, url) {
  new THREE.TextureLoader().load(url, (tex) => {
    tex.colorSpace = THREE.SRGBColorSpace;
    const imageAspect = tex.image.width / tex.image.height;
    const fit = () => {
      const k = window.innerWidth / window.innerHeight / imageAspect;
      if (k > 1) { tex.repeat.set(1, 1 / k); tex.offset.set(0, (1 - 1 / k) / 2); }
      else { tex.repeat.set(k, 1); tex.offset.set((1 - k) / 2, 0); }
    };
    fit();
    window.addEventListener('resize', fit);
    scene.background = tex;
  });
}

export function createLighting(renderer, scene, quality) {
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap; // мягкие края теней

  const sky = skyTexture();
  scene.background = sky;
  if (userArtUrl('sky')) useBackdropImage(scene, userArtUrl('sky'));
  scene.environment = environmentMap(renderer, sky);
  scene.environmentIntensity = LIGHTING.environmentIntensity;
  scene.fog = new THREE.Fog(LIGHTING.fogColor, LIGHTING.fogNear, LIGHTING.fogFar);

  // Рассеянный свет: сверху — вечернее небо, снизу — тёплый отсвет земли
  const hemi = new THREE.HemisphereLight(LIGHTING.skyLight, LIGHTING.groundColor, LIGHTING.skyLightIntensity);
  scene.add(hemi);

  // Солнце у горизонта: длинные тени
  const sun = new THREE.DirectionalLight(LIGHTING.sunColor, LIGHTING.sunIntensity);
  const { azimuth, elevation } = LIGHTING.sunDirection;
  const az = THREE.MathUtils.degToRad(azimuth);
  const el = THREE.MathUtils.degToRad(elevation);
  sun.position.set(Math.cos(el) * Math.sin(az), Math.sin(el), Math.cos(el) * Math.cos(az)).multiplyScalar(20);
  sun.castShadow = true;
  sun.shadow.mapSize.set(quality.shadowMap, quality.shadowMap);
  sun.shadow.bias = -0.0005;
  sun.shadow.normalBias = 0.03;
  sun.shadow.radius = 3;
  Object.assign(sun.shadow.camera, { left: -12, right: 12, top: 12, bottom: -12, near: 1, far: 45 });
  scene.add(sun);

  return { sun, hemi };
}
