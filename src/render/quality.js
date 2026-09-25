// Уровень качества картинки: на телефоне — «низкое», на компьютере — «высокое».
// Сами значения уровней — в config.js → QUALITY.
import { QUALITY } from '../config.js';

const STORAGE_KEY = 'ogorod2-quality';

export function detectQuality() {
  let name = window.matchMedia('(pointer: coarse)').matches ? 'low' : 'high';
  try {
    const saved = localStorage.getItem(STORAGE_KEY); // если выбрали вручную в панели G
    if (QUALITY[saved]) name = saved;
  } catch { /* браузер не даёт читать — берём по устройству */ }
  return { name, ...QUALITY[name] };
}

export function rememberQuality(name) {
  try {
    localStorage.setItem(STORAGE_KEY, name);
  } catch { /* не страшно */ }
}
