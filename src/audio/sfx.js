// Звуки действий: посадка, полив, сбор, монеты, шаги крота, кнопки интерфейса.
// Всё собрано из тонов и шума (synth.js) — поменять звук = поменять числа здесь.
import { tone, noise, rand, noteHz } from './synth.js';

const FX = 'effects';

export function createSfx(engine) {
  // До первого касания звука нет — молча пропускаем
  const ready = () => engine.ctx && engine.ctx.state === 'running';
  const now = () => engine.ctx.currentTime;

  // Звон одной монетки: несколько «неровных» обертонов, как у металла
  function clink(when, pitch = 1, gain = 0.12) {
    const base = rand(2300, 2700) * pitch;
    [1, 2.76, 5.4].forEach((k, i) => {
      tone(engine, FX, { when, freq: base * k, gain: gain / (i + 1), decay: 0.35 / (i * 0.6 + 1), pan: rand(-0.2, 0.2), reverb: 0.25 });
    });
    noise(engine, FX, { when, type: 'highpass', freq: 5000, gain: gain * 0.5, decay: 0.03 });
  }

  const sfx = {
    // Посадка: лапки роют землю (два-три шороха) и мягкий «тук» семечка
    planted() {
      if (!ready()) return;
      const t = now();
      for (let i = 0; i < 3; i++) {
        noise(engine, FX, { when: t + i * 0.09 + rand(0, 0.02), color: 'brown', type: 'bandpass', freq: rand(500, 900), q: 0.8, gain: 0.5, attack: 0.01, decay: 0.09 });
      }
      tone(engine, FX, { when: t + 0.3, freq: 110, freqEnd: 55, glide: 0.1, gain: 0.35, decay: 0.14 });
    },

    // Полив: журчание струи и пузырьки капель
    watered() {
      if (!ready()) return;
      const t = now();
      noise(engine, FX, { when: t, type: 'bandpass', freq: 1800, freqEnd: 1200, q: 1.2, gain: 0.12, attack: 0.12, hold: 0.35, decay: 0.3, reverb: 0.15 });
      for (let i = 0; i < 16; i++) {
        const when = t + 0.15 + rand(0, 0.6);
        const f = rand(500, 1300);
        tone(engine, FX, { when, freq: f, freqEnd: f * rand(1.5, 2.2), glide: 0.03, gain: rand(0.03, 0.07), decay: 0.04, pan: rand(-0.3, 0.3) });
      }
      noise(engine, FX, { when: t + 0.55, color: 'brown', type: 'lowpass', freq: 500, gain: 0.25, attack: 0.05, decay: 0.3 }); // вода уходит в землю
    },

    // Сбор: шелест ботвы и сочный «чпок» — овощ выскочил из земли
    harvested() {
      if (!ready()) return;
      const t = now();
      noise(engine, FX, { when: t, type: 'highpass', freq: 3000, gain: 0.1, attack: 0.03, decay: 0.2 });
      tone(engine, FX, { when: t + 0.12, freq: 170, freqEnd: 620, glide: 0.07, gain: 0.35, decay: 0.1 });
      noise(engine, FX, { when: t + 0.12, color: 'brown', type: 'lowpass', freq: 700, gain: 0.35, decay: 0.08 });
      tone(engine, FX, { when: t + 0.2, freq: noteHz(84), type: 'triangle', gain: 0.05, decay: 0.4, reverb: 0.4 }); // тихий «дзинь» радости
    },

    // Продажа: монетки сыплются — чем дороже урожай, тем больше монет
    sold(price = 2) {
      if (!ready()) return;
      const t = now();
      noise(engine, FX, { when: t, color: 'brown', type: 'bandpass', freq: 400, gain: 0.3, decay: 0.12 }); // урожай лёг в корзинку
      const count = Math.max(2, Math.min(9, Math.round(1 + Math.log2(price + 1) * 1.5)));
      for (let i = 0; i < count; i++) clink(t + 0.12 + i * rand(0.05, 0.09), rand(0.9, 1.15), 0.1);
    },

    // Открылись новые семена: короткое радостное арпеджио
    unlocked() {
      if (!ready()) return;
      const t = now() + 0.6; // после звона монет
      [72, 76, 79, 84].forEach((n, i) => {
        tone(engine, FX, { when: t + i * 0.11, freq: noteHz(n), type: 'triangle', gain: 0.12, decay: 0.6, reverb: 0.5 });
        tone(engine, FX, { when: t + i * 0.11, freq: noteHz(n) * 4, gain: 0.025, decay: 0.25 });
      });
    },

    // Шаг крота: чёткий «тук» лапки + поверхность. По грядке — земля шуршит, по дорожке — хрустят камешки.
    step(onSoil) {
      if (!ready()) return;
      const g = engine.volumes.steps; // панель G меняет на ходу
      const t = now();
      const f = rand(150, 190);
      tone(engine, FX, { when: t, freq: f, freqEnd: f * 0.5, glide: 0.03, gain: 0.45 * g, attack: 0.002, decay: 0.045 });
      if (onSoil) {
        noise(engine, FX, { when: t, color: 'brown', type: 'bandpass', freq: rand(900, 1300), q: 1.2, gain: 0.7 * g, attack: 0.002, decay: 0.04 });
        noise(engine, FX, { when: t, type: 'highpass', freq: 3500, gain: 0.05 * g, attack: 0.001, decay: 0.012 });
      } else {
        // три камешка подряд, с разницей в сотые доли секунды
        [0, rand(0.008, 0.014), rand(0.018, 0.028)].forEach((d, i) => {
          noise(engine, FX, { when: t + d, type: 'bandpass', freq: rand(2500, 4500), q: 3, gain: (0.3 - i * 0.07) * g, attack: 0.001, decay: 0.02 });
        });
      }
    },

    // Кнопки: тихий деревянный щелчок
    click() {
      if (!ready()) return;
      tone(engine, FX, { freq: rand(1100, 1250), freqEnd: 700, glide: 0.03, type: 'triangle', gain: 0.07, decay: 0.04 });
    },

    // Магазин открылся (вверх) / закрылся (вниз)
    shop(open) {
      if (!ready()) return;
      const t = now();
      const notes = open ? [67, 74] : [74, 67];
      notes.forEach((n, i) => tone(engine, FX, { when: t + i * 0.08, freq: noteHz(n), type: 'triangle', gain: 0.09, decay: 0.25, filter: 2500, reverb: 0.2 }));
    },

    // Покупка: монетки отданы
    buy() {
      if (!ready()) return;
      const t = now();
      clink(t, 1.1, 0.06);
      clink(t + 0.07, 0.95, 0.05);
    },

    // «Так нельзя»: мягкий глухой звук, не ругается
    deny() {
      if (!ready()) return;
      const t = now();
      tone(engine, FX, { when: t, freq: 220, freqEnd: 170, glide: 0.12, type: 'triangle', gain: 0.1, decay: 0.14, filter: 900 });
      tone(engine, FX, { when: t + 0.09, freq: 180, freqEnd: 150, glide: 0.1, type: 'triangle', gain: 0.08, decay: 0.16, filter: 900 });
    },
  };
  return sfx;
}
