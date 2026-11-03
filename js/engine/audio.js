'use strict';
// ───────────────────────── 사운드 (WebAudio 절차 생성) ─────────────────────────
const Sound = {
  ctx: null,
  master: null,
  sfxGain: null,
  musGain: null,
  muted: false,
  amb: null,          // 현재 앰비언스 노드 묶음
  ambMode: null,
  seqTimer: null,
  noiseBuf: null,

  unlock() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : 0.7;
      this.master.connect(this.ctx.destination);
      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.value = 0.55;
      this.sfxGain.connect(this.master);
      this.musGain = this.ctx.createGain();
      this.musGain.gain.value = 0.35;
      this.musGain.connect(this.master);
      const len = this.ctx.sampleRate * 1.5;
      this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const d = this.noiseBuf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      if (this.pendingAmb) { const m = this.pendingAmb; this.pendingAmb = null; this.setAmbience(m); }
    } catch (e) { this.ctx = null; }
  },

  toggleMute() {
    this.muted = !this.muted;
    if (this.master) this.master.gain.value = this.muted ? 0 : 0.7;
    return this.muted;
  },

  tone(freq, dur, type = 'square', vol = 0.15, slide = 0, delay = 0, dest = null) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime + delay;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, freq + slide), t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(dest || this.sfxGain);
    o.start(t); o.stop(t + dur + 0.02);
  },

  noise(dur, vol = 0.2, freq = 2000, q = 1, delay = 0, type = 'bandpass', dest = null) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime + delay;
    const s = this.ctx.createBufferSource();
    s.buffer = this.noiseBuf;
    const f = this.ctx.createBiquadFilter();
    f.type = type; f.frequency.value = freq; f.Q.value = q;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(dest || this.sfxGain);
    s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.02);
  },

  play(name) {
    if (!this.ctx || this.muted) return;
    switch (name) {
      case 'jump': this.tone(240, 0.12, 'square', 0.08, 260); break;
      case 'djump': this.tone(360, 0.12, 'square', 0.08, 400); break;
      case 'land': this.noise(0.06, 0.12, 400, 1); break;
      case 'swing': this.noise(0.09, 0.15, 3000, 0.7, 0, 'highpass'); break;
      case 'hit': this.tone(160, 0.09, 'square', 0.14, -90); this.noise(0.07, 0.2, 1500); break;
      case 'kill': this.tone(520, 0.08, 'square', 0.1, -300); this.tone(180, 0.25, 'sawtooth', 0.08, -140, 0.04); this.noise(0.25, 0.15, 900); break;
      case 'hurt': this.tone(140, 0.25, 'sawtooth', 0.16, -80); this.noise(0.15, 0.2, 600); break;
      case 'flip':
        this.tone(90, 0.35, 'sawtooth', 0.12, 600);
        this.noise(0.35, 0.18, 1200, 3);
        this.tone(1200, 0.2, 'sine', 0.05, -1000, 0.1);
        break;
      case 'unflip':
        this.tone(700, 0.3, 'sawtooth', 0.1, -600);
        this.noise(0.25, 0.14, 2400, 3);
        break;
      case 'deny': this.tone(120, 0.12, 'square', 0.12); this.tone(100, 0.15, 'square', 0.12, 0, 0.1); break;
      case 'pickup': this.tone(660, 0.07, 'square', 0.08); this.tone(990, 0.1, 'square', 0.08, 0, 0.06); break;
      case 'artifact':
        [523, 659, 784, 1046].forEach((f, i) => this.tone(f, 0.25, 'triangle', 0.1, 0, i * 0.07));
        this.tone(130, 0.6, 'sine', 0.1, -40);
        break;
      case 'coin': this.tone(1320, 0.06, 'square', 0.07); this.tone(1760, 0.12, 'square', 0.07, 0, 0.05); break;
      case 'menu': this.tone(880, 0.03, 'square', 0.05); break;
      case 'select': this.tone(660, 0.05, 'square', 0.07); this.tone(990, 0.07, 'square', 0.07, 0, 0.04); break;
      case 'cancel': this.tone(440, 0.06, 'square', 0.06, -200); break;
      case 'text': this.tone(520 + Math.random() * 60, 0.02, 'square', 0.025); break;
      case 'door': this.noise(0.3, 0.2, 300, 2); this.tone(80, 0.3, 'sine', 0.15, -20); break;
      case 'shoot': this.tone(700, 0.1, 'square', 0.06, -400); break;
      case 'spray': this.noise(0.15, 0.15, 5000, 1, 0, 'highpass'); break;
      case 'zap': this.tone(1400, 0.1, 'sawtooth', 0.07, -1100); this.noise(0.1, 0.15, 4000); break;
      case 'eshoot': this.tone(300, 0.15, 'triangle', 0.08, 300); break;
      case 'boss':
        this.tone(55, 1.2, 'sawtooth', 0.2, -20);
        this.tone(58, 1.2, 'sawtooth', 0.2, -22);
        this.noise(1.0, 0.2, 300, 1);
        break;
      case 'slam': this.tone(60, 0.4, 'sine', 0.3, -30); this.noise(0.35, 0.3, 200, 1); break;
      case 'warn': this.tone(880, 0.12, 'square', 0.06); this.tone(880, 0.12, 'square', 0.06, 0, 0.2); break;
      case 'train': this.noise(1.2, 0.35, 180, 0.8); this.tone(70, 1.2, 'sawtooth', 0.12, 30); break;
      case 'anchor': [392, 523, 659].forEach((f, i) => this.tone(f, 0.4, 'sine', 0.1, 0, i * 0.1)); break;
      case 'clue': this.tone(740, 0.15, 'triangle', 0.1); this.tone(554, 0.3, 'triangle', 0.08, 0, 0.12); break;
      case 'resolve':
        [262, 330, 392, 523, 659, 784].forEach((f, i) => this.tone(f, 0.5, 'triangle', 0.09, 0, i * 0.08));
        break;
      case 'die': this.tone(300, 1.2, 'sawtooth', 0.15, -260); this.noise(1.0, 0.2, 500); break;
      case 'heart': this.tone(60, 0.12, 'sine', 0.22); this.tone(55, 0.12, 'sine', 0.18, 0, 0.18); break;
      case 'whisper': this.noise(0.6, 0.06, 2500 + Math.random() * 2000, 8); break;
      case 'stamp': this.noise(0.12, 0.3, 500, 1); this.tone(90, 0.15, 'square', 0.12); break;
      case 'buy': this.tone(988, 0.06, 'square', 0.07); this.tone(1319, 0.14, 'square', 0.07, 0, 0.06); break;
      case 'levelup': [523, 659, 784, 1046, 1318].forEach((f, i) => this.tone(f, 0.18, 'square', 0.07, 0, i * 0.08)); break;
      case 'item': this.tone(500, 0.08, 'sine', 0.1, 400); break;
      case 'phone': this.tone(1046, 0.05, 'sine', 0.08); this.tone(1318, 0.05, 'sine', 0.08, 0, 0.08); break;
      default: break;
    }
  },

  // ── 앰비언스 / 간단한 음악 ──
  stopAmbience() {
    if (this.seqTimer) { clearInterval(this.seqTimer); this.seqTimer = null; }
    if (this.amb) {
      const t = this.ctx.currentTime;
      for (const n of this.amb.nodes) {
        try { if (n.gain) { n.gain.cancelScheduledValues(t); n.gain.setTargetAtTime(0, t, 0.3); } } catch (e) { /* 무시 */ }
      }
      const old = this.amb;
      setTimeout(() => { for (const s of old.srcs) { try { s.stop(); } catch (e) { /* 무시 */ } } }, 1500);
      this.amb = null;
    }
  },

  setAmbience(mode) {
    if (!this.ctx) { this.pendingAmb = mode; return; }
    if (mode === this.ambMode) return;
    this.ambMode = mode;
    this.stopAmbience();
    if (!mode) return;
    const ctx = this.ctx;
    const out = ctx.createGain();
    out.gain.value = 0;
    out.connect(this.musGain);
    const nodes = [out];
    const srcs = [];
    const osc = (type, f, vol, detune = 0) => {
      const o = ctx.createOscillator(); o.type = type; o.frequency.value = f; o.detune.value = detune;
      const g = ctx.createGain(); g.gain.value = vol;
      o.connect(g); g.connect(out); o.start(); srcs.push(o); return { o, g };
    };
    let target = 0.5;
    if (mode === 'front') {
      osc('sine', 60, 0.05); osc('sine', 120, 0.025);
      target = 0.6;
    } else if (mode === 'back') {
      const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 380; lp.connect(out);
      for (const [f, d] of [[41, 0], [41, 14], [61.5, -9]]) {
        const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f; o.detune.value = d;
        const g = ctx.createGain(); g.gain.value = 0.09; o.connect(g); g.connect(lp); o.start(); srcs.push(o);
      }
      const lfo = ctx.createOscillator(); lfo.frequency.value = 0.13;
      const lg = ctx.createGain(); lg.gain.value = 180; lfo.connect(lg); lg.connect(lp.frequency); lfo.start(); srcs.push(lfo);
      target = 0.8;
      this.seqTimer = setInterval(() => { if (Math.random() < 0.3) this.noise(0.8, 0.03, 2000 + Math.random() * 3000, 10, 0, 'bandpass', this.musGain); }, 1400);
    } else if (mode === 'boss') {
      const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 600; lp.connect(out);
      const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = 46; o.connect(lp); o.start(); srcs.push(o);
      target = 0.5;
      let step = 0;
      const bass = [55, 55, 65.4, 55, 58.3, 55, 82.4, 73.4];
      this.seqTimer = setInterval(() => {
        const f = bass[step % bass.length];
        this.tone(f, 0.18, 'square', 0.12, 0, 0, this.musGain);
        if (step % 2 === 0) this.noise(0.05, 0.12, 6000, 1, 0, 'highpass', this.musGain);
        if (step % 4 === 2) this.noise(0.12, 0.2, 250, 1, 0, 'bandpass', this.musGain);
        step++;
      }, 165);
    } else if (mode === 'hub' || mode === 'hubnight' || mode === 'title') {
      target = 0.45;
      const chords = mode === 'title'
        ? [[110, 130.8, 164.8], [87.3, 110, 130.8], [98, 123.5, 146.8], [82.4, 103.8, 123.5]]
        : [[130.8, 164.8, 196], [110, 130.8, 164.8], [87.3, 110, 130.8], [98, 123.5, 146.8]];
      const pad = [osc('triangle', chords[0][0], 0.05), osc('triangle', chords[0][1], 0.04), osc('triangle', chords[0][2], 0.035)];
      let step = 0;
      const speed = mode === 'hubnight' ? 420 : mode === 'title' ? 480 : 340;
      this.seqTimer = setInterval(() => {
        const ch = chords[Math.floor(step / 8) % chords.length];
        if (step % 8 === 0) pad.forEach((p, i) => p.o.frequency.setTargetAtTime(ch[i], ctx.currentTime, 0.2));
        const arp = [0, 1, 2, 1, 2, 0, 1, 2];
        if (mode !== 'title' || step % 2 === 0) {
          this.tone(ch[arp[step % 8]] * (mode === 'hubnight' ? 2 : 4), 0.25, 'sine', 0.05, 0, 0, this.musGain);
        }
        if (mode === 'hub' && step % 4 === 0) this.noise(0.04, 0.05, 7000, 1, 0, 'highpass', this.musGain);
        step++;
      }, speed);
    }
    out.gain.setTargetAtTime(target, ctx.currentTime, 0.6);
    this.amb = { nodes, srcs };
  },
};
