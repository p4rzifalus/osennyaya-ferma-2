// Конвейер картинки «крупные пиксели, гладкий свет»:
// 1) сцена рисуется в уменьшенную картинку (уже со светом и тенями),
// 2) картинка растягивается на экран без сглаживания — пиксели чёткие,
// 3) поверх в полном разрешении: свечение, тональная коррекция, цветокоррекция, виньетка, зерно.
import * as THREE from 'three';
import {
  EffectComposer, EffectPass, Pass, CopyMaterial,
  BloomEffect, ToneMappingEffect, ToneMappingMode, LUT3DEffect, VignetteEffect, NoiseEffect, BlendFunction,
} from 'postprocessing';
import { createLUTs } from './luts.js';

// Проход 1–2: рисуем сцену маленькой и растягиваем без сглаживания
class PixelRenderPass extends Pass {
  constructor(scene, camera, settings) {
    super('PixelRenderPass');
    this.gameScene = scene;
    this.gameCamera = camera;
    this.settings = settings;
    this.needsSwap = false; // пишем прямо во входную картинку, как обычный RenderPass
    this.lowRes = new THREE.WebGLRenderTarget(1, 1, {
      type: THREE.HalfFloatType, // запас яркости сверх белого — чтобы свечение было «горячим»
      minFilter: THREE.NearestFilter,
      magFilter: THREE.NearestFilter,
    });
    this.fullscreenMaterial = new CopyMaterial();
    this.bufferSize = new THREE.Vector2(1, 1);
    this.pixelRatio = 1;
  }

  // Размер маленькой картинки: экран, делённый на размер пикселя
  updateLowResSize() {
    const px = this.settings.pixelScale * this.pixelRatio;
    this.lowRes.setSize(Math.max(1, Math.ceil(this.bufferSize.x / px)), Math.max(1, Math.ceil(this.bufferSize.y / px)));
  }

  setSize(width, height) {
    this.bufferSize.set(width, height);
    this.updateLowResSize();
  }

  render(renderer, inputBuffer) {
    renderer.setRenderTarget(this.lowRes);
    renderer.render(this.gameScene, this.gameCamera);
    this.fullscreenMaterial.inputBuffer = this.lowRes.texture;
    renderer.setRenderTarget(this.renderToScreen ? null : inputBuffer);
    renderer.render(this.scene, this.camera);
  }
}

// settings — общий объект настроек (его меняет панель G)
export function createPipeline(renderer, scene, camera, settings, quality) {
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, quality.maxDpr));
  renderer.toneMapping = THREE.NoToneMapping; // тональную коррекцию делает конвейер

  const composer = new EffectComposer(renderer, { frameBufferType: THREE.HalfFloatType });
  const pixelPass = new PixelRenderPass(scene, camera, settings);
  pixelPass.pixelRatio = renderer.getPixelRatio();
  composer.addPass(pixelPass);

  const bloom = new BloomEffect({ mipmapBlur: true, luminanceSmoothing: 0.2 });
  const toneMapping = new ToneMappingEffect({ mode: ToneMappingMode.AGX });
  const luts = createLUTs();
  const lut = new LUT3DEffect(luts[settings.lut] || luts.autumn);
  const vignette = new VignetteEffect({ offset: 0.3 });
  const grain = new NoiseEffect({ blendFunction: BlendFunction.OVERLAY, premultiply: false });
  composer.addPass(new EffectPass(camera, bloom, toneMapping, lut, vignette, grain));

  // Перенести значения из настроек в эффекты (после каждого движения ползунка)
  function apply() {
    bloom.intensity = settings.bloomIntensity;
    bloom.luminanceMaterial.threshold = settings.bloomThreshold;
    bloom.mipmapBlurPass.radius = settings.bloomRadius;
    lut.lut = luts[settings.lut] || luts.autumn;
    lut.blendMode.opacity.value = settings.lutStrength;
    vignette.darkness = settings.vignette;
    grain.blendMode.opacity.value = settings.grain;
    pixelPass.updateLowResSize();
  }
  apply();

  function resize() {
    composer.setSize(window.innerWidth, window.innerHeight);
  }
  resize();
  window.addEventListener('resize', resize);

  return {
    apply,
    lutNames: Object.keys(luts),
    render(dt) {
      composer.render(dt);
    },
  };
}
