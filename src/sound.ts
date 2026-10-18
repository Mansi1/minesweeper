// All sounds are synthesised with Web Audio: no files to load or license, and each is a few lines to tweak.
// VERIFIED: e2e counts real OscillatorNode/AudioBufferSourceNode starts for reveal, flag, game over and mute.
// This module owns the AudioContext and the mute setting; everyone else only calls play().

export type Sound = 'reveal' | 'flag' | 'hit' | 'boom' | 'pop' | 'lose' | 'win' | 'sparkle';

// length of the 'lose' tune, so the game-over dialog can wait for it
export const LOSE_TUNE_MS = 700;
// length of the rising 'win' tune
export const WIN_TUNE_MS = 800;

const MUTED_KEY = 'minesweeper.muted';
let muted = (() => {
  try {
    return localStorage.getItem(MUTED_KEY) === '1';
  } catch {
    return false;
  }
})();
let ctx: AudioContext | undefined;

const setMuted = (value: boolean) => {
  muted = value;
  try {
    localStorage.setItem(MUTED_KEY, value ? '1' : '0');
  } catch {
    // private mode or blocked storage: the setting just isn't remembered
  }
};

// HYPOTHESIS: creating the context on the first sound, which always follows a click, satisfies browser autoplay policies.
const audio = (): AudioContext => {
  ctx ??= new AudioContext();
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
};

const envelope = (c: AudioContext, start: number, duration: number, volume: number): GainNode => {
  const gain = c.createGain();
  gain.gain.setValueAtTime(volume, start);
  gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
  gain.connect(c.destination);
  return gain;
};

const tone = (c: AudioContext, type: OscillatorType, from: number, to: number, start: number, duration: number, volume: number) => {
  const osc = c.createOscillator();
  osc.type = type;
  osc.frequency.setValueAtTime(from, start);
  osc.frequency.exponentialRampToValueAtTime(to, start + duration);
  osc.connect(envelope(c, start, duration, volume));
  osc.start(start);
  osc.stop(start + duration);
};

// white noise through a low-pass filter: the body of every explosion
const noise = (c: AudioContext, start: number, duration: number, volume: number, cutoff: number) => {
  const buffer = c.createBuffer(1, Math.ceil(c.sampleRate * duration), c.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  const source = c.createBufferSource();
  source.buffer = buffer;
  const filter = c.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(cutoff, start);
  filter.frequency.exponentialRampToValueAtTime(Math.max(cutoff / 8, 40), start + duration);
  source.connect(filter).connect(envelope(c, start, duration, volume));
  source.start(start);
};

export const play = (sound: Sound, delayMs = 0) => {
  if (muted) return;
  const c = audio();
  const t = c.currentTime + delayMs / 1000;
  switch (sound) {
    case 'reveal':
      tone(c, 'triangle', 900, 600, t, 0.06, 0.2);
      break;
    case 'flag':
      tone(c, 'square', 500, 1000, t, 0.09, 0.08);
      break;
    case 'hit':
      noise(c, t, 0.4, 0.5, 1500);
      tone(c, 'sine', 160, 40, t, 0.4, 0.7);
      break;
    case 'boom':
      noise(c, t, 1.4, 0.8, 900);
      tone(c, 'sine', 100, 25, t, 1.2, 0.9);
      break;
    case 'pop':
      noise(c, t, 0.15, 0.3, 3500);
      break;
    case 'lose':
      [392, 330, 262].forEach((f, i) => tone(c, 'square', f, f * 0.97, t + i * 0.22, 0.2, 0.07));
      break;
    case 'sparkle':
      tone(c, 'sine', 1800, 2600, t, 0.08, 0.05);
      break;
    case 'win':
      [523, 659, 784, 1047].forEach((f, i) => tone(c, 'square', f, f, t + i * 0.12, i === 3 ? 0.4 : 0.11, 0.07));
      break;
  }
};

// The ON/OFF button in the status panel; aria-pressed = sound on.
export const bindSoundButton = (button: HTMLElement) => {
  const render = () => {
    button.textContent = muted ? 'OFF' : 'ON';
    button.setAttribute('aria-pressed', String(!muted));
  };
  button.addEventListener('click', () => {
    setMuted(!muted);
    render();
  });
  render();
};
