// Кирпичики звука: тон (нота или «чпок») и шум через фильтр (шорох, плеск, хруст).
// Каждый звук сам затухает и убирает за собой — ничего копить не нужно.

export const rand = (a, b) => a + Math.random() * (b - a);
export const pick = (list) => list[Math.floor(Math.random() * list.length)];
// Номер ноты (60 — «до» первой октавы) → частота
export const noteHz = (n) => 440 * 2 ** ((n - 69) / 12);

// Куда подключить звук: дорожка без эха + немного эха, по желанию — левее/правее
function output(engine, bus, { pan = 0, reverb = 0 } = {}) {
  const ctx = engine.ctx;
  let node = engine.dry[bus];
  if (pan) {
    const panner = ctx.createStereoPanner();
    panner.pan.value = pan;
    panner.connect(node);
    node = panner;
  }
  if (reverb > 0) {
    const send = ctx.createGain();
    send.gain.value = reverb;
    send.connect(engine.wet[bus]);
    const split = ctx.createGain();
    split.connect(node);
    split.connect(send);
    return split;
  }
  return node;
}

// Огибающая громкости: быстро нарастает до peak и плавно затухает за decay секунд
function envelope(ctx, when, peak, attack, decay, hold = 0) {
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, when);
  g.gain.linearRampToValueAtTime(peak, when + attack);
  if (hold) g.gain.setValueAtTime(peak, when + attack + hold);
  g.gain.exponentialRampToValueAtTime(0.0001, when + attack + hold + decay);
  return g;
}

// Тон. freqEnd — если высота «съезжает» (чпок, уханье совы). filter — приглушить верха.
export function tone(engine, bus, {
  when = engine.ctx.currentTime, freq, freqEnd, glide = 0.1, type = 'sine', gain = 0.3,
  attack = 0.005, decay = 0.3, hold = 0, detune = 0, filter, pan, reverb,
}) {
  const ctx = engine.ctx;
  const osc = ctx.createOscillator();
  osc.type = type;
  osc.detune.value = detune;
  osc.frequency.setValueAtTime(freq, when);
  if (freqEnd) osc.frequency.exponentialRampToValueAtTime(freqEnd, when + glide);
  const env = envelope(ctx, when, gain, attack, decay, hold);
  let node = osc;
  if (filter) {
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = filter;
    node.connect(f);
    node = f;
  }
  node.connect(env).connect(output(engine, bus, { pan, reverb }));
  osc.start(when);
  osc.stop(when + attack + hold + decay + 0.05);
  return osc;
}

// Шум через фильтр. type: lowpass — глухо (земля), bandpass — середина (хруст), highpass — шипение (листья).
export function noise(engine, bus, {
  when = engine.ctx.currentTime, color = 'white', type = 'bandpass', freq = 1000, freqEnd, q = 1,
  gain = 0.3, attack = 0.005, decay = 0.2, hold = 0, pan, reverb,
}) {
  const ctx = engine.ctx;
  const src = ctx.createBufferSource();
  src.buffer = engine.noise[color];
  const f = ctx.createBiquadFilter();
  f.type = type;
  f.Q.value = q;
  f.frequency.setValueAtTime(freq, when);
  if (freqEnd) f.frequency.exponentialRampToValueAtTime(freqEnd, when + attack + hold + decay);
  const env = envelope(ctx, when, gain, attack, decay, hold);
  src.connect(f).connect(env).connect(output(engine, bus, { pan, reverb }));
  const length = attack + hold + decay + 0.05;
  src.start(when, rand(0, src.buffer.duration - length - 0.01));
  src.stop(when + length);
}

// Бесконечный шум (ветер, дождь): источник → фильтр → громкость. Громкость и фильтр крутим снаружи.
export function noiseLoop(engine, bus, { color = 'white', type = 'lowpass', freq = 800, q = 0.7, pan, reverb }) {
  const ctx = engine.ctx;
  const src = ctx.createBufferSource();
  src.buffer = engine.noise[color];
  src.loop = true;
  src.playbackRate.value = rand(0.9, 1.1);
  const filter = ctx.createBiquadFilter();
  filter.type = type;
  filter.frequency.value = freq;
  filter.Q.value = q;
  const volume = ctx.createGain();
  volume.gain.value = 0;
  src.connect(filter).connect(volume).connect(output(engine, bus, { pan, reverb }));
  src.start(ctx.currentTime, rand(0, 2));
  return { filter, volume };
}
