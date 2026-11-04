// Integraciones con el dispositivo: sonido, vibración y pantalla siempre encendida.

import { getState } from './store.js';

// Sonido. En el iPhone, el audio de una web va por el canal «ambiente»: suena encima de
// la música (Spotify sigue sonando), pero el modo silencio lo apaga. iOS lo pausa
// («interrupted») cuando otra app toma el audio o al salir de la app: se reanuda en el
// siguiente toque, al volver a la app y antes de cada pitido.
export const audio = {
  ctx: null,
  pending: [], // pitidos programados que aún no han sonado (se cancelan al cambiar el descanso)

  session() {
    try {
      if (navigator.audioSession && navigator.audioSession.type !== 'ambient') navigator.audioSession.type = 'ambient';
    } catch {
      /* sin la API de sesión de audio */
    }
  },

  // iOS solo permite sonar audio tras un gesto del usuario: se llama al pulsar botones.
  unlock() {
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.session();
      if (!this.ctx || this.ctx.state === 'closed') {
        this.ctx = new AC();
        this.ctx.onstatechange = () => {
          if (this.ctx?.state !== 'running' && document.visibilityState === 'visible') setTimeout(() => this.wake(), 400);
        };
      }
      this.wake();
      const buffer = this.ctx.createBuffer(1, 1, 22050);
      const src = this.ctx.createBufferSource();
      src.buffer = buffer;
      src.connect(this.ctx.destination);
      src.start(0);
    } catch {
      /* sin audio */
    }
  },

  // Reanuda el audio si iOS lo dejó en pausa.
  wake() {
    const c = this.ctx;
    if (!c || c.state === 'running' || c.state === 'closed') return;
    try {
      this.session();
      c.resume?.()?.catch?.(() => {});
    } catch {
      /* ignorar */
    }
  },

  // Pitido con armónicos (triangular + algo de cuadrada): se distingue mejor encima de la
  // música que un tono puro. «at» lo programa para dentro de esos segundos.
  beep({ times = 1, freq = 880, duration = 0.14, gap = 0.12, at = 0, volume = 0.85 } = {}) {
    if (!getState().settings.sound || !this.ctx) return;
    this.wake();
    try {
      const c = this.ctx;
      const t0 = c.currentTime + 0.02 + Math.max(0, at);
      this.pending = this.pending.filter((n) => n.end > c.currentTime);
      for (let i = 0; i < times; i++) {
        const start = t0 + i * (duration + gap);
        const gain = c.createGain();
        gain.gain.setValueAtTime(0.0001, start);
        gain.gain.exponentialRampToValueAtTime(volume, start + 0.012);
        gain.gain.setValueAtTime(volume, start + Math.max(0.02, duration - 0.05));
        gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
        gain.connect(c.destination);
        for (const [type, level] of [['triangle', 0.75], ['square', 0.25]]) {
          const osc = c.createOscillator();
          const mix = c.createGain();
          osc.type = type;
          osc.frequency.value = freq;
          mix.gain.value = level;
          osc.connect(mix).connect(gain);
          osc.start(start);
          osc.stop(start + duration + 0.02);
          this.pending.push({ osc, end: start + duration + 0.02 });
        }
      }
    } catch {
      /* sin audio */
    }
  },

  // Cancela los pitidos programados que aún no han sonado.
  cancel() {
    const now = this.ctx?.currentTime ?? 0;
    for (const n of this.pending) {
      try { if (n.end > now) n.osc.stop(0); } catch { /* ya parado */ }
    }
    this.pending = [];
  },
};

// Cuenta atrás del descanso: un pitido corto en cada uno de los 5 últimos segundos y
// uno largo y más agudo al llegar a cero.
export const COUNTDOWN_FROM = 5;
export const countdownBeep = (n, at = 0) => (n > 0
  ? audio.beep({ freq: 784, duration: 0.13, at })
  : audio.beep({ freq: 1175, duration: 0.6, at }));

export function vibrate(pattern) {
  try {
    navigator.vibrate?.(pattern);
  } catch {
    /* iOS no soporta vibración desde la web */
  }
}

export const wakeLock = {
  sentinel: null,
  async request() {
    try {
      if (!('wakeLock' in navigator) || this.sentinel) return;
      this.sentinel = await navigator.wakeLock.request('screen');
      this.sentinel.addEventListener('release', () => { this.sentinel = null; });
    } catch {
      this.sentinel = null;
    }
  },
  async release() {
    try {
      await this.sentinel?.release();
    } catch {
      /* ignorar */
    }
    this.sentinel = null;
  },
};
