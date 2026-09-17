// js/sound_engine.js — Realistic Tactile Sound Effects Engine for IrieBlocky
// Synthesizes authentic mechanical clicks, relay armatures, RFID chimes, and wire snaps
// using pure Web Audio API without requiring any external audio files or network requests.

class SoundEngine {
  constructor() {
    this.ctx = null;
    this.enabled = true;
  }

  _initContext() {
    if (!this.ctx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) {
        this.ctx = new AudioContext();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  toggleSound(enable = !this.enabled) {
    this.enabled = enable;
    return this.enabled;
  }

  // Mechanical switch click (Pushbutton, DIP switch, buttons)
  playSwitchClick(isRelease = false) {
    if (!this.enabled) return;
    try {
      this._initContext();
      if (!this.ctx) return;

      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();

      // Sharp mechanical transient pop
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(isRelease ? 1800 : 2400, now);
      filter.Q.setValueAtTime(3.5, now);

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(isRelease ? 600 : 900, now);
      osc.frequency.exponentialRampToValueAtTime(120, now + 0.018);

      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.022);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.025);
    } catch (e) {
      console.warn('SoundEngine switch click failed:', e);
    }
  }

  // Realistic electromagnetic relay click-clack
  playRelayClick(isEngaged = true) {
    if (!this.enabled) return;
    try {
      this._initContext();
      if (!this.ctx) return;

      const now = this.ctx.currentTime;

      // 1. Primary metal contact snap
      const osc1 = this.ctx.createOscillator();
      const gain1 = this.ctx.createGain();
      osc1.type = 'square';
      osc1.frequency.setValueAtTime(isEngaged ? 1400 : 1100, now);
      osc1.frequency.exponentialRampToValueAtTime(180, now + 0.025);
      gain1.gain.setValueAtTime(0.12, now);
      gain1.gain.exponentialRampToValueAtTime(0.0001, now + 0.035);

      osc1.connect(gain1);
      gain1.connect(this.ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.04);

      // 2. Secondary coil dampening thud (10ms later)
      setTimeout(() => {
        if (!this.ctx || !this.enabled) return;
        const t = this.ctx.currentTime;
        const osc2 = this.ctx.createOscillator();
        const gain2 = this.ctx.createGain();
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(isEngaged ? 380 : 320, t);
        osc2.frequency.exponentialRampToValueAtTime(80, t + 0.03);
        gain2.gain.setValueAtTime(0.15, t);
        gain2.gain.exponentialRampToValueAtTime(0.0001, t + 0.035);

        osc2.connect(gain2);
        gain2.connect(this.ctx.destination);
        osc2.start(t);
        osc2.stop(t + 0.04);
      }, 12);
    } catch (e) {
      console.warn('SoundEngine relay click failed:', e);
    }
  }

  // Positive dual-tone RFID scan chime (2.0 kHz -> 2.5 kHz)
  playRfidBeep() {
    if (!this.enabled) return;
    try {
      this._initContext();
      if (!this.ctx) return;

      const now = this.ctx.currentTime;

      // Tone 1 (2000 Hz)
      const osc1 = this.ctx.createOscillator();
      const gain1 = this.ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(2093, now); // C7
      gain1.gain.setValueAtTime(0.1, now);
      gain1.gain.exponentialRampToValueAtTime(0.0001, now + 0.08);

      osc1.connect(gain1);
      gain1.connect(this.ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.09);

      // Tone 2 (2637 Hz, E7) - 70ms later
      setTimeout(() => {
        if (!this.ctx || !this.enabled) return;
        const t = this.ctx.currentTime;
        const osc2 = this.ctx.createOscillator();
        const gain2 = this.ctx.createGain();
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(2637, t);
        gain2.gain.setValueAtTime(0.12, t);
        gain2.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);

        osc2.connect(gain2);
        gain2.connect(this.ctx.destination);
        osc2.start(t);
        osc2.stop(t + 0.13);
      }, 70);
    } catch (e) {
      console.warn('SoundEngine RFID beep failed:', e);
    }
  }

  // Wire connect snap sound
  playWireSnap() {
    if (!this.enabled) return;
    try {
      this._initContext();
      if (!this.ctx) return;

      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(1200, now);
      osc.frequency.exponentialRampToValueAtTime(300, now + 0.025);

      gain.gain.setValueAtTime(0.07, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.03);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.035);
    } catch (e) {
      console.warn('SoundEngine wire snap failed:', e);
    }
  }

  // Burnt component warning pop
  playBurnPop() {
    if (!this.enabled) return;
    try {
      this._initContext();
      if (!this.ctx) return;

      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(350, now);
      osc.frequency.exponentialRampToValueAtTime(60, now + 0.09);

      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.1);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.11);
    } catch (e) {
      console.warn('SoundEngine burn pop failed:', e);
    }
  }
}

// Global SoundEngine instance
window.soundEngine = new SoundEngine();
window.SoundEngine = SoundEngine;
