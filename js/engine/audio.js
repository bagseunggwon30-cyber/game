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
      this.master.connect(this.ctx.destination);
      this.sfxGain = this.ctx.createGain();
      this.sfxGain.connect(this.master);
      this.musGain = this.ctx.createGain();
      this.musGain.connect(this.master);
      this.applyVolumes();
      const len = this.ctx.sampleRate * 1.5;
      this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const d = this.noiseBuf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      if (this.pendingAmb) { const m = this.pendingAmb; this.pendingAmb = null; this.setAmbience(m); }
    } catch (e) { this.ctx = null; }
  },

  toggleMute() {
    this.muted = !this.muted;
    this.applyVolumes();
    return this.muted;
  },
  applyVolumes() {
    if (!this.ctx) return;
    const v = Settings.v;
    this.master.gain.value = this.muted ? 0 : v.master / 10;
    this.sfxGain.gain.value = 0.7 * v.sfx / 10;
    this.musGain.gain.value = 0.58 * v.music / 10;
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
      case 'chime': this.tone(1568, 0.5, 'sine', 0.1); this.tone(1318, 0.7, 'sine', 0.08, 0, 0.16); break;
      case 'buzz': this.tone(120, 0.25, 'sawtooth', 0.05); this.noise(0.2, 0.06, 4000, 2); break;
      case 'steps': this.noise(0.07, 0.18, 300, 2); this.noise(0.07, 0.14, 260, 2, 0.32); break;
      case 'roll': this.noise(0.16, 0.12, 900, 0.8, 0, 'bandpass'); this.tone(320, 0.1, 'triangle', 0.04, -160); break;
      case 'step': this.noise(0.06, 0.12, 700, 1); this.tone(260, 0.06, 'triangle', 0.03, 120); break;
      case 'sprint': this.noise(0.12, 0.08, 1600, 0.8, 0, 'bandpass'); this.noise(0.05, 0.08, 400, 1, 0.06); break;
      case 'dive': this.tone(900, 0.22, 'sine', 0.05, -700); this.noise(0.2, 0.08, 3000, 1, 0, 'highpass'); break;
      case 'dodge': this.tone(1760, 0.18, 'sine', 0.06, -600); this.tone(2640, 0.25, 'sine', 0.035, -900, 0.05); this.noise(0.12, 0.06, 6000, 1, 0, 'highpass'); break;
      case 'static':
        this.noise(0.18 + Math.random() * 0.2, 0.12, 3000 + Math.random() * 3000, 0.6, 0, 'highpass');
        this.tone(2400 + Math.random() * 1200, 0.05, 'square', 0.03, -800, 0.05);
        break;
      default: break;
    }
  },

  // ── 음악: 짧은 앞당김 스케줄러 (16분음표 단위) ──
  noteAt(freq, dur, type, vol, t, dest, att = 0.01, detune = 0) {
    const ctx = this.ctx;
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t); if (detune) o.detune.setValueAtTime(detune, t);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol, t + att);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(dest);
    o.start(t); o.stop(t + dur + 0.05);
  },
  drumAt(kind, t, dest, vol = 1) {
    const ctx = this.ctx;
    if (kind === 'kick') {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = 'sine'; o.frequency.setValueAtTime(120, t); o.frequency.exponentialRampToValueAtTime(40, t + 0.12);
      g.gain.setValueAtTime(0.12 * vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
      o.connect(g); g.connect(dest); o.start(t); o.stop(t + 0.2);
      return;
    }
    const src = ctx.createBufferSource(); src.buffer = this.noiseBuf;
    const f = ctx.createBiquadFilter(), g = ctx.createGain();
    const hat = kind === 'hat';
    f.type = hat ? 'highpass' : 'bandpass'; f.frequency.value = hat ? 7000 : 1800; f.Q.value = hat ? 0.7 : 0.9;
    const dur = hat ? 0.04 : 0.12;
    g.gain.setValueAtTime((hat ? 0.035 : 0.06) * vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f); f.connect(g); g.connect(dest); src.start(t, Math.random() * 0.5); src.stop(t + dur + 0.02);
  },
  startSong(name, out) {
    const S = SONGS[name], ctx = this.ctx;
    if (!S._mel && S.mel) S._mel = parseMel(S.mel);
    const bus = ctx.createGain(); bus.gain.value = SONG_BUS; bus.connect(out);
    let dest = bus;
    if (S.lowpass) { const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = S.lowpass; lp.connect(bus); dest = lp; }
    const sd = 60 / S.bpm / 4;
    let step = 0, next = ctx.currentTime + 0.08;
    if (this.songTimer) clearInterval(this.songTimer);
    this.songTimer = setInterval(() => {
      if (next < ctx.currentTime - 0.05) next = ctx.currentTime + 0.05;   // 탭이 잠들었다 깨면 밀린 음은 건너뛴다
      while (next < ctx.currentTime + 0.15) { this.songStep(S, step, next, dest, sd); step++; next += sd; }
    }, 40);
  },
  songStep(S, step, t, dest, sd) {
    const nb = S.chords.length, bar = Math.floor(step / 16) % nb, i = step % 16;
    const ch = S.chords[bar];
    const det = () => (S.detune || 0) + (S.wobble ? (Math.random() - 0.5) * S.wobble : 0);
    if (S.pad && i === 0) for (const n of ch) this.noteAt(midiHz(n + 12), sd * 16 * 1.05, S.pad[0], S.pad[1], t, dest, 0.25, det());
    if (S.bass && S.bass[i] != null) this.noteAt(midiHz(ch[0] + S.bass[i]), sd * (S.bassLen || 3), S.bassWave || 'triangle', S.bassVol || 0.06, t, dest, 0.01, det());
    if (S.arp && S.arp[i] != null) { const k = S.arp[i]; this.noteAt(midiHz(ch[k % ch.length] + 12 * Math.floor(k / ch.length) + (S.arpOct || 12)), sd * 3, S.arpWave || 'triangle', S.arpVol || 0.035, t, dest, 0.01, det()); }
    if (S._mel) {
      const m = S._mel[step % S._mel.length];
      if (m != null) this.noteAt(midiHz(m), sd * (S.melLen || 3), S.melWave || 'triangle', S.melVol || 0.05, t, dest, 0.015, det());
    }
    for (const d of ['kick', 'snare', 'hat']) if (S[d] && S[d][i] === 'x') this.drumAt(d, t, dest, S.drumVol || 1);
  },

  // ── 앰비언스 / 간단한 음악 ──
  stopAmbience() {
    if (this.seqTimer) { clearInterval(this.seqTimer); this.seqTimer = null; }
    if (this.songTimer) { clearInterval(this.songTimer); this.songTimer = null; }
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
      // 낮은 드론 + 곡
      const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 500; lp.connect(out);
      const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = 36.7; const og = ctx.createGain(); og.gain.value = 0.35; o.connect(og); og.connect(lp); o.start(); srcs.push(o);
      target = 0.55;
      this.startSong('boss', out);
    } else if (SONGS[mode]) {
      target = SONGS[mode].gain || 0.6;
      this.startSong(mode, out);
    }
    if (mode === 'front') {
      // 표면: 드론 위에 드문드문 떨어지는 피아노 음
      const scale = [57, 60, 62, 64, 67, 69, 72, 76];
      this.seqTimer = setInterval(() => {
        if (Math.random() < 0.35) {
          const n = scale[Math.floor(Math.random() * scale.length)];
          this.noteAt(midiHz(n), 2.2, 'triangle', 0.06, ctx.currentTime + 0.02, this.musGain, 0.01);
          if (Math.random() < 0.3) this.noteAt(midiHz(n + 7), 2.0, 'sine', 0.035, ctx.currentTime + 0.4, this.musGain, 0.01);
        }
      }, 1700);
    }
    out.gain.setTargetAtTime(target, ctx.currentTime, 0.6);
    this.amb = { nodes, srcs };
  },
};

// ── 곡 데이터 ──
const SONG_BUS = 2.2;   // 곡 전체 음량 (효과음보다 한 단계 아래)
function midiHz(n) { return 440 * Math.pow(2, (n - 69) / 12); }
const NOTE_IDX = { C: 0, 'C#': 1, Db: 1, D: 2, 'D#': 3, Eb: 3, E: 4, F: 5, 'F#': 6, Gb: 6, G: 7, 'G#': 8, Ab: 8, A: 9, 'A#': 10, Bb: 10, B: 11 };
// "E5 . G5 ." → MIDI 번호 배열 (마디 구분 | 는 무시)
function parseMel(str) {
  return str.split(/\s+/).filter((t) => t && t !== '|').map((t) => {
    if (t === '.' || t === '-') return null;
    const m = t.match(/^([A-G][#b]?)(\d)$/);
    return m ? NOTE_IDX[m[1]] + (Number(m[2]) + 1) * 12 : null;
  });
}
const SONGS = {
  // 사무소 거리 (낮): 느긋한 로파이
  hub: {
    bpm: 88, gain: 0.55,
    chords: [[48, 52, 55, 59], [45, 48, 52, 55], [41, 45, 48, 52], [43, 47, 50, 52]],
    pad: ['triangle', 0.018], bass: [-12, null, null, null, null, null, -12, null, null, null, -5, null, null, null, null, null], bassVol: 0.07,
    mel: 'E5 . G5 . . . A5 . G5 . E5 . . . D5 . | C5 . . . E5 . . . D5 . C5 . A4 . . . | A4 . C5 . . . E5 . . . G5 . E5 . . . | D5 . . . E5 . D5 . B4 . . . . . . .',
    melVol: 0.04, kick: 'x.......x.x.....', snare: '....x.......x...', hat: 'x.x.x.x.x.x.x.x.', drumVol: 0.6,
  },
  // 옥탑방 (밤): 아르페지오
  hubnight: {
    bpm: 70, gain: 0.55,
    chords: [[45, 48, 52, 57], [41, 45, 48, 53], [48, 52, 55, 60], [40, 44, 47, 52]],
    pad: ['sine', 0.014], bass: [-12, null, null, null, null, null, null, null, -12, null, null, null, null, null, null, null], bassVol: 0.06, bassLen: 8,
    arp: [0, null, 1, null, 2, null, 3, null, 2, null, 1, null, 2, null, 1, null], arpVol: 0.03,
    mel: 'E6 . . . . . . . . . . . . . . . | . . . . . . . . C6 . . . . . . . | G5 . . . . . . . . . . . . . . . | . . . . . . . . G#5 . . . B5 . . .',
    melWave: 'sine', melVol: 0.03, melLen: 10,
  },
  // 타이틀: 느린 종소리
  title: {
    bpm: 62, gain: 0.55,
    chords: [[45, 48, 52], [50, 53, 57], [40, 44, 47], [45, 48, 52]],
    pad: ['triangle', 0.02], bass: [-12, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null], bassVol: 0.06, bassLen: 14,
    mel: 'A5 . . . . . . . E5 . . . . . . . | F5 . . . . . . . D5 . . . . . . . | E5 . . . G#5 . . . B5 . . . . . . . | A5 . . . . . . . . . . . . . . .',
    melWave: 'sine', melVol: 0.035, melLen: 12,
  },
  // 보스: 빠른 단조 베이스와 북
  boss: {
    bpm: 148, gain: 0.55,
    chords: [[38, 41, 45], [34, 38, 41], [36, 40, 43], [33, 37, 40]],
    bass: [0, 0, 12, 0, 0, 0, 10, 0, 0, 0, 12, 0, 7, 0, 10, 12], bassWave: 'square', bassVol: 0.045, bassLen: 1,
    mel: 'D6 . . . . . F6 . . . E6 . . . . . | D6 . . . . . F6 . . . G6 . F6 . E6 . | C6 . . . . . E6 . . . G6 . . . . . | C#6 . . . E6 . . . A6 . . . G6 . E6 .',
    melWave: 'sawtooth', melVol: 0.022, melLen: 2,
    kick: 'x...x...x...x...', snare: '....x.......x..x', hat: '..x...x...x...x.', drumVol: 0.9,
  },
  // 근무 수칙 알바: 밝은데 음이 조금씩 어긋나는 매장 음악
  muzak: {
    bpm: 104, gain: 0.5, detune: 28, wobble: 70, lowpass: 1600,
    chords: [[41, 45, 48], [38, 41, 45], [46, 50, 53], [48, 52, 55]],
    pad: ['triangle', 0.016], bass: [-12, null, null, null, -5, null, null, null, -12, null, null, null, -5, null, null, null], bassVol: 0.09, bassLen: 2,
    mel: 'C5 . A4 . F4 . A4 . C5 . . . D5 . C5 . | A4 . . . F4 . . . D4 . F4 . A4 . . . | Bb4 . D5 . F5 . D5 . Bb4 . . . C5 . D5 . | E5 . . . G5 . . . C5 . . . . . . .',
    melWave: 'square', melVol: 0.04, melLen: 2, hat: '..x...x...x...x.', drumVol: 0.5,
  },
  // 모두의 퇴근: 새벽
  dawn: {
    bpm: 78, gain: 0.6,
    chords: [[50, 54, 57], [45, 49, 52], [47, 50, 54], [43, 47, 50]],
    pad: ['triangle', 0.02], bass: [-12, null, null, null, null, null, null, null, -5, null, null, null, null, null, null, null], bassVol: 0.06, bassLen: 7,
    arp: [0, null, 1, null, 2, null, 1, null, 0, null, 1, null, 2, null, 3, null], arpVol: 0.025,
    mel: 'F#5 . . . A5 . . . D6 . . . . . . . | E5 . . . A5 . . . C#6 . . . . . . . | D5 . . . F#5 . . . B5 . . . A5 . . . | G5 . . . B5 . . . D6 . . . . . . .',
    melWave: 'sine', melVol: 0.04, melLen: 6,
  },
};
