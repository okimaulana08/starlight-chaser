import fs from 'node:fs';
import path from 'node:path';

const OUT_DIR = path.resolve('public/assets/audio');
fs.mkdirSync(OUT_DIR, { recursive: true });

const SAMPLE_RATE = 22050;

function writeWav(filename, samples) {
  const numSamples = samples.length;
  const buffer = Buffer.alloc(44 + numSamples * 2);
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + numSamples * 2, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16); // PCM
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22); // Mono
  buffer.writeUInt32LE(SAMPLE_RATE, 24);
  buffer.writeUInt32LE(SAMPLE_RATE * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write('data', 36);
  buffer.writeUInt32LE(numSamples * 2, 40);

  for (let i = 0; i < numSamples; i++) {
    const clamped = Math.max(-1, Math.min(1, samples[i]));
    buffer.writeInt16LE(Math.round(clamped * 32767), 44 + i * 2);
  }
  fs.writeFileSync(path.join(OUT_DIR, filename), buffer);
}

function synthSfx(durationSec, fn) {
  const len = Math.floor(durationSec * SAMPLE_RATE);
  const out = new Float32Array(len);
  for (let i = 0; i < len; i++) {
    const t = i / SAMPLE_RATE;
    out[i] = fn(t, durationSec);
  }
  return out;
}

function midiToFreq(m) {
  return 440 * Math.pow(2, (m - 69) / 12);
}

// ---------- 13 CRISP SFX ----------
writeWav(
  'sfx_slash.wav',
  synthSfx(0.18, (t, d) => {
    const env = Math.pow(1 - t / d, 1.8);
    const sweep = Math.sin(2 * Math.PI * (900 - t * 3200) * t);
    const noise = (Math.random() * 2 - 1) * 0.45;
    return (sweep * 0.45 + noise) * env * 0.7;
  }),
);

writeWav(
  'sfx_hit.wav',
  synthSfx(0.12, (t, d) => {
    const env = Math.pow(1 - t / d, 2.2);
    const thump = Math.sin(2 * Math.PI * (180 - t * 700) * t);
    const snap = (Math.random() * 2 - 1) * Math.exp(-t * 45);
    return (thump * 0.75 + snap * 0.5) * env * 0.75;
  }),
);

writeWav(
  'sfx_crit.wav',
  synthSfx(0.24, (t, d) => {
    const env = Math.pow(1 - t / d, 1.6);
    const ring =
      Math.sin(2 * Math.PI * 1180 * t) * 0.4 +
      Math.sin(2 * Math.PI * 1760 * t) * 0.35 +
      Math.sin(2 * Math.PI * (240 - t * 400) * t) * 0.6;
    return ring * env * 0.72;
  }),
);

writeWav(
  'sfx_heal.wav',
  synthSfx(0.45, (t, d) => {
    const env = Math.sin((Math.PI * t) / d) * Math.pow(1 - t / d, 0.7);
    const n1 = Math.sin(2 * Math.PI * 523.25 * t);
    const n2 = Math.sin(2 * Math.PI * 659.25 * t) * (t > 0.08 ? 1 : 0);
    const n3 = Math.sin(2 * Math.PI * 783.99 * t) * (t > 0.16 ? 1 : 0);
    const n4 = Math.sin(2 * Math.PI * 1046.5 * t) * (t > 0.24 ? 1 : 0);
    return (n1 + n2 + n3 + n4) * 0.2 * env;
  }),
);

writeWav(
  'sfx_shield.wav',
  synthSfx(0.32, (t, d) => {
    const env = Math.pow(1 - t / d, 1.4);
    const tone =
      Math.sin(2 * Math.PI * (320 + t * 420) * t) * 0.5 +
      Math.sin(2 * Math.PI * (640 + t * 520) * t) * 0.3;
    return tone * env * 0.65;
  }),
);

writeWav(
  'sfx_cancel_cast.wav',
  synthSfx(0.42, (t, d) => {
    const env = Math.pow(1 - t / d, 1.2);
    const shatter = (Math.random() * 2 - 1) * Math.exp(-t * 18) * 0.6;
    const bell =
      Math.sin(2 * Math.PI * 880 * t) * 0.5 +
      Math.sin(2 * Math.PI * 1320 * t) * 0.4 +
      Math.sin(2 * Math.PI * 1760 * t) * 0.3;
    return (shatter + bell * 0.65) * env * 0.82;
  }),
);

writeWav(
  'sfx_ult_chime.wav',
  synthSfx(0.55, (t, d) => {
    const env = Math.pow(1 - t / d, 1.1);
    const shimmer =
      Math.sin(2 * Math.PI * 784 * t) * 0.35 +
      Math.sin(2 * Math.PI * 1175 * t) * 0.35 +
      Math.sin(2 * Math.PI * 1568 * t) * 0.3 +
      Math.sin(2 * Math.PI * (392 + t * 280) * t) * 0.25;
    return shimmer * env * 0.72;
  }),
);

writeWav(
  'sfx_ult_impact.wav',
  synthSfx(0.55, (t, d) => {
    const env = Math.pow(1 - t / d, 1.4);
    const sub = Math.sin(2 * Math.PI * (120 * Math.exp(-t * 4)) * t) * 0.9;
    const blast = (Math.random() * 2 - 1) * Math.exp(-t * 7) * 0.65;
    const metallic = Math.sin(2 * Math.PI * 620 * t) * Math.exp(-t * 10) * 0.35;
    return (sub + blast + metallic) * env * 0.85;
  }),
);

writeWav(
  'sfx_prism_crack.wav',
  synthSfx(0.48, (t, d) => {
    const env = Math.pow(1 - t / d, 1.3);
    const crystal =
      Math.sin(2 * Math.PI * 1480 * t) * 0.4 +
      Math.sin(2 * Math.PI * 2217 * t) * 0.35 +
      (Math.random() * 2 - 1) * Math.exp(-t * 24) * 0.55;
    return crystal * env * 0.75;
  }),
);

writeWav(
  'sfx_ssr_reveal.wav',
  synthSfx(1.1, (t, d) => {
    const env = Math.min(1, t * 14) * Math.pow(1 - t / d, 1.1);
    const chord = [523.25, 659.25, 783.99, 1046.5, 1318.5, 1567.98];
    let sum = 0;
    for (let i = 0; i < chord.length; i++) {
      const onset = i * 0.06;
      if (t >= onset) {
        sum += Math.sin(2 * Math.PI * chord[i] * (t - onset)) * Math.exp(-(t - onset) * 1.8);
      }
    }
    return (sum / 3.2) * env * 0.85;
  }),
);

writeWav(
  'sfx_button.wav',
  synthSfx(0.08, (t, d) => {
    const env = Math.pow(1 - t / d, 2.0);
    return Math.sin(2 * Math.PI * (720 + t * 1400) * t) * env * 0.45;
  }),
);

writeWav(
  'sfx_forge.wav',
  synthSfx(0.38, (t, d) => {
    const env = Math.pow(1 - t / d, 1.5);
    const anvil =
      Math.sin(2 * Math.PI * 960 * t) * 0.5 +
      Math.sin(2 * Math.PI * 1920 * t) * 0.35 +
      Math.sin(2 * Math.PI * 2880 * t) * 0.2;
    return anvil * env * 0.72;
  }),
);

writeWav(
  'sfx_victory.wav',
  synthSfx(1.25, (t, d) => {
    const notes = [
      { s: 0.0, f: 523.25 },
      { s: 0.14, f: 659.25 },
      { s: 0.28, f: 783.99 },
      { s: 0.44, f: 1046.5 },
    ];
    let v = 0;
    for (const n of notes) {
      if (t >= n.s) {
        const dt = t - n.s;
        v += (Math.sin(2 * Math.PI * n.f * dt) + 0.35 * Math.sin(4 * Math.PI * n.f * dt)) * Math.exp(-dt * 2.4);
      }
    }
    return v * 0.28 * Math.pow(1 - t / d, 0.5);
  }),
);

// ---------- 3 SEAMLESS LOOPING BGM TRACKS ----------
function buildLoopBgm(bpm, bars, chords, melody, bassPattern, energy = 0.5) {
  const beatDur = 60 / bpm;
  const totalBeats = bars * 4;
  const totalSec = totalBeats * beatDur;
  const len = Math.floor(totalSec * SAMPLE_RATE);
  const out = new Float32Array(len);

  for (let i = 0; i < len; i++) {
    const t = i / SAMPLE_RATE;
    const beat = t / beatDur;
    const barIdx = Math.floor(beat / 4) % chords.length;
    const chord = chords[barIdx];

    // Warm celestial pad
    let pad = 0;
    for (const m of chord) {
      const f = midiToFreq(m);
      pad += Math.sin(2 * Math.PI * f * t) * 0.14 + Math.sin(2 * Math.PI * f * 2 * t) * 0.04;
    }

    // Arpeggio / Melody
    const step = Math.floor(beat * 2) % melody.length;
    const stepFrac = (beat * 2) % 1;
    const melNote = melody[step];
    let lead = 0;
    if (melNote > 0) {
      const f = midiToFreq(melNote);
      const env = Math.exp(-stepFrac * (3.2 - energy));
      lead = (Math.sin(2 * Math.PI * f * t) * 0.65 + Math.sin(4 * Math.PI * f * t) * 0.2) * env * 0.22;
    }

    // Pulse bass
    const bassStep = Math.floor(beat * 2) % bassPattern.length;
    const bassFrac = (beat * 2) % 1;
    const bassNote = bassPattern[bassStep];
    let bass = 0;
    if (bassNote > 0) {
      const f = midiToFreq(bassNote);
      bass = Math.sin(2 * Math.PI * f * t) * Math.exp(-bassFrac * 3.5) * (0.18 + energy * 0.14);
    }

    // Soft rhythmic kick for battle/boss
    let perc = 0;
    if (energy > 0.3) {
      const beatFrac = beat % 1;
      if (beatFrac < 0.12) {
        perc = Math.sin(2 * Math.PI * (95 * Math.exp(-beatFrac * 22)) * beatFrac) * Math.exp(-beatFrac * 18) * energy * 0.35;
      }
    }

    // Seamless crossfade edges
    const edgeFade = Math.min(1, t * 20, (totalSec - t) * 20);
    out[i] = (pad + lead + bass + perc) * 0.55 * edgeFade;
  }
  return out;
}

// Lobby: Ethereal Celestial Harp & Strings (D minor -> Bb -> F -> C)
writeWav(
  'bgm_lobby.wav',
  buildLoopBgm(
    88,
    4,
    [
      [50, 57, 62, 65],
      [46, 53, 58, 62],
      [48, 53, 57, 60],
      [48, 55, 60, 64],
    ],
    [74, 77, 81, 77, 74, 69, 72, 74, 70, 74, 77, 74, 72, 76, 79, 76],
    [38, 0, 45, 0, 34, 0, 41, 0, 41, 0, 45, 0, 36, 0, 43, 0],
    0.15,
  ),
);

// Battle: Energetic Anime Action RPG Theme
writeWav(
  'bgm_battle.wav',
  buildLoopBgm(
    136,
    4,
    [
      [52, 59, 64, 67],
      [48, 55, 60, 64],
      [50, 57, 62, 66],
      [47, 54, 59, 63],
    ],
    [76, 79, 83, 79, 81, 79, 76, 74, 72, 76, 79, 83, 81, 79, 78, 74],
    [40, 40, 47, 40, 36, 36, 43, 36, 38, 38, 45, 38, 35, 35, 42, 35],
    0.65,
  ),
);

// Boss: Dramatic Aurelian Sentinel Showdown
writeWav(
  'bgm_boss.wav',
  buildLoopBgm(
    152,
    4,
    [
      [45, 52, 57, 60],
      [41, 48, 53, 57],
      [43, 50, 55, 59],
      [44, 51, 56, 59],
    ],
    [81, 84, 83, 81, 76, 79, 81, 76, 77, 81, 84, 86, 83, 80, 76, 71],
    [33, 33, 40, 33, 29, 29, 36, 29, 31, 31, 38, 31, 32, 32, 39, 32],
    0.85,
  ),
);

console.log('Generated 16 Starlight Chasers WAV audio assets into public/assets/audio/');
