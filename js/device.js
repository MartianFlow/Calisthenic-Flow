// Integraciones con el dispositivo: sonido, vibración y pantalla siempre encendida.

import { getState } from './store.js';

export const audio = {
  ctx: null,

  // iOS solo permite sonar audio tras un gesto del usuario: se llama al pulsar botones.
  unlock() {
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      if (!this.ctx) this.ctx = new AC();
      if (this.ctx.state === 'suspended') this.ctx.resume();
      const buffer = this.ctx.createBuffer(1, 1, 22050);
      const src = this.ctx.createBufferSource();
      src.buffer = buffer;
      src.connect(this.ctx.destination);
      src.start(0);
    } catch {
      /* sin audio */
    }
  },

  beep({ times = 1, freq = 880, duration = 0.14, gap = 0.12 } = {}) {
    if (!getState().settings.sound || !this.ctx) return;
    try {
      const t0 = this.ctx.currentTime + 0.02;
      for (let i = 0; i < times; i++) {
        const start = t0 + i * (duration + gap);
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.0001, start);
        gain.gain.exponentialRampToValueAtTime(0.4, start + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
        osc.connect(gain).connect(this.ctx.destination);
        osc.start(start);
        osc.stop(start + duration + 0.02);
      }
    } catch {
      /* sin audio */
    }
  },
};

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
