'use strict';
// ───────────────────────── 그래픽 기본기 ─────────────────────────
const FONT_M = '12px Galmuri11, "Apple SD Gothic Neo", "Malgun Gothic", sans-serif';
const FONT_B = 'bold 12px Galmuri11, "Apple SD Gothic Neo", "Malgun Gothic", sans-serif';
const FONT_S = '10px Galmuri9, "Apple SD Gothic Neo", "Malgun Gothic", sans-serif';

const COL = {
  ink: '#0b0b10',
  white: '#f4f0e6',
  dim: '#9a96a8',
  dark: '#5a566a',
  red: '#e0474c',
  pink: '#ff7aa8',
  yellow: '#f2c230',
  orange: '#f08a3c',
  green: '#6fd08c',
  cyan: '#62d6e8',
  blue: '#5a7dff',
  purple: '#a46cff',
  panel: 'rgba(12,11,20,0.94)',
  panelEdge: '#e8e3d0',
  panelEdge2: '#3a3650',
  san: '#8f7cff',
  hp: '#e0474c',
};

const Gfx = {
  canvas: null, ctx: null,
  buf: null, b: null,
  scale: 1,
  shakeT: 0, shakeMag: 0,

  init() {
    this.canvas = document.getElementById('screen');
    this.ctx = this.canvas.getContext('2d');
    this.buf = this.makeCanvas(VW, VH);
    this.b = this.buf.getContext('2d');
    this.tmp = this.makeCanvas(VW, VH);
    this.tctx = this.tmp.getContext('2d');
    window.addEventListener('resize', () => this.resize());
    this.resize();
  },

  makeCanvas(w, h) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    return c;
  },

  resize() {
    const ww = window.innerWidth, wh = window.innerHeight;
    const fit = Math.min(ww / VW, wh / VH);
    // 정수 배율이 화면을 충분히 채우면 정수 배율(선명한 도트), 아니면 꽉 채우기
    const s = Math.floor(fit) >= 1 && Math.floor(fit) / fit >= 0.8 ? Math.floor(fit) : fit;
    this.scale = s;
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = Math.round(VW * s * dpr);
    this.canvas.height = Math.round(VH * s * dpr);
    this.canvas.style.width = Math.round(VW * s) + 'px';
    this.canvas.style.height = Math.round(VH * s) + 'px';
    this.ctx.imageSmoothingEnabled = false;
  },

  shake(mag, t) {
    mag *= Settings.shakeMul;
    if (mag <= 0) return;
    if (mag >= this.shakeMag || this.shakeT <= 0) { this.shakeMag = mag; this.shakeT = t; }
  },

  present() {
    const c = this.ctx;
    c.imageSmoothingEnabled = false;
    let ox = 0, oy = 0;
    if (this.shakeT > 0) {
      this.shakeT--;
      ox = Math.round(rnd(-this.shakeMag, this.shakeMag));
      oy = Math.round(rnd(-this.shakeMag, this.shakeMag));
    }
    c.fillStyle = '#000';
    c.fillRect(0, 0, this.canvas.width, this.canvas.height);
    const k = this.canvas.width / VW;
    c.drawImage(this.buf, 0, 0, VW, VH, Math.round(ox * k), Math.round(oy * k), this.canvas.width, this.canvas.height);
  },

  // ── 텍스트 ──
  shadow: false,   // 기본 그림자 여부 (게임 화면 위 HUD에서만 켬)
  text(ctx, str, x, y, color = COL.white, opt = {}) {
    ctx.font = opt.font || (opt.small ? FONT_S : opt.bold ? FONT_B : FONT_M);
    ctx.textBaseline = 'top';
    ctx.textAlign = opt.align || 'left';
    const xx = Math.round(x), yy = Math.round(y);
    const sh = opt.shadow === undefined ? this.shadow : opt.shadow;
    if (sh) {
      ctx.fillStyle = opt.shadowColor || 'rgba(0,0,0,0.7)';
      ctx.fillText(str, xx + 1, yy + 1);
    }
    ctx.fillStyle = color;
    ctx.fillText(str, xx, yy);
    ctx.textAlign = 'left';
  },
  measure(ctx, str, opt = {}) {
    ctx.font = opt.font || (opt.small ? FONT_S : opt.bold ? FONT_B : FONT_M);
    return ctx.measureText(str).width;
  },
  // 폭에 맞게 자르기 (…)
  fit(ctx, str, maxW, opt = {}) {
    if (this.measure(ctx, str, opt) <= maxW) return str;
    let s = str;
    while (s.length > 1 && this.measure(ctx, s + '…', opt) > maxW) s = s.slice(0, -1);
    return s + '…';
  },
  // 여러 줄 텍스트 (자동 줄바꿈). 반환: 사용한 높이
  para(ctx, str, x, y, maxW, color = COL.white, opt = {}) {
    ctx.font = opt.small ? FONT_S : FONT_M;
    const lh = opt.lh || (opt.small ? 12 : 14);
    const lines = wrapText(ctx, str, maxW);
    const max = opt.maxLines || 999;
    lines.slice(0, max).forEach((ln, i) => this.text(ctx, ln, x, y + i * lh, color, opt));
    return Math.min(lines.length, max) * lh;
  },

  // ── 패널 (UI 키트 카드로 위임) ──
  panel(ctx, x, y, w, h, opt = {}) {
    UI.card(ctx, x, y, w, h, { fill: opt.fill, border: opt.edge || UI.C.line });
  },
  bar(ctx, x, y, w, h, frac, color) {
    UI.bar(ctx, x, y, w, h, frac, color);
  },

  // ── 절차적 스프라이트 도구 ──
  px(c, x, y, w, h, col) { c.fillStyle = col; c.fillRect(x, y, w, h); },
  line(c, x0, y0, x1, y1, col, thick = 1) {
    x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
    const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    c.fillStyle = col;
    for (let i = 0; i < 400; i++) {
      c.fillRect(x0, y0, thick, thick);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 >= dy) { err += dy; x0 += sx; }
      if (e2 <= dx) { err += dx; y0 += sy; }
    }
  },
  circle(c, cx, cy, r, col) {
    c.fillStyle = col;
    for (let y = -r; y <= r; y++) {
      const w = Math.floor(Math.sqrt(r * r - y * y + r * 0.6));
      c.fillRect(Math.round(cx - w), Math.round(cy + y), w * 2 + 1, 1);
    }
  },
  ring(c, cx, cy, r, col) {
    c.fillStyle = col;
    const n = Math.max(12, Math.floor(r * 6));
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      c.fillRect(Math.round(cx + Math.cos(a) * r), Math.round(cy + Math.sin(a) * r), 1, 1);
    }
  },

  // 불투명 픽셀 주변에 1px 외곽선 추가
  outline(canvas, col = COL.ink) {
    const w = canvas.width, h = canvas.height;
    const c = canvas.getContext('2d');
    const img = c.getImageData(0, 0, w, h);
    const d = img.data;
    const out = c.createImageData(w, h);
    const o = out.data;
    o.set(d);
    const r = parseInt(col.slice(1, 3), 16), g = parseInt(col.slice(3, 5), 16), bl = parseInt(col.slice(5, 7), 16);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4;
        if (d[i + 3] > 0) continue;
        const n = (x > 0 && d[i - 4 + 3] > 40) || (x < w - 1 && d[i + 4 + 3] > 40) ||
          (y > 0 && d[i - w * 4 + 3] > 40) || (y < h - 1 && d[i + w * 4 + 3] > 40);
        if (n) { o[i] = r; o[i + 1] = g; o[i + 2] = bl; o[i + 3] = 255; }
      }
    }
    c.putImageData(out, 0, 0);
    return canvas;
  },

  sprite(w, h, fn, opt = {}) {
    const cv = this.makeCanvas(w, h);
    const c = cv.getContext('2d');
    fn(c, w, h);
    if (opt.outline !== false) this.outline(cv, opt.outlineColor || COL.ink);
    return cv;
  },

  flipH(cv) {
    const f = this.makeCanvas(cv.width, cv.height);
    const c = f.getContext('2d');
    c.translate(cv.width, 0); c.scale(-1, 1);
    c.drawImage(cv, 0, 0);
    return f;
  },

  // 색 보정된 복사본 (실루엣 등)
  tint(cv, color, alpha = 1) {
    const f = this.makeCanvas(cv.width, cv.height);
    const c = f.getContext('2d');
    c.drawImage(cv, 0, 0);
    c.globalCompositeOperation = 'source-atop';
    c.globalAlpha = alpha;
    c.fillStyle = color;
    c.fillRect(0, 0, cv.width, cv.height);
    return f;
  },

  // 흰색 실루엣 (피격 번쩍임) — 캐시
  _white: new WeakMap(),
  white(cv) {
    let w = this._white.get(cv);
    if (!w) { w = this.tint(cv, '#ffffff'); this._white.set(cv, w); }
    return w;
  },

  // 큰 픽셀 글자 (타이틀용): 작은 캔버스에 쓴 뒤 정수배 확대
  bigText(str, color, scale = 3, font = FONT_B, edge = COL.ink) {
    const tc = this.makeCanvas(8, 8).getContext('2d');
    tc.font = font;
    const w = Math.ceil(tc.measureText(str).width) + 4;
    const cv = this.makeCanvas(w, 16);
    const c = cv.getContext('2d');
    c.font = font; c.textBaseline = 'top'; c.fillStyle = color;
    c.fillText(str, 2, 2);
    // 알파 이진화 → 선명한 도트
    const img = c.getImageData(0, 0, cv.width, cv.height);
    for (let i = 3; i < img.data.length; i += 4) img.data[i] = img.data[i] > 100 ? 255 : 0;
    c.putImageData(img, 0, 0);
    this.outline(cv, edge);
    const big = this.makeCanvas(cv.width * scale, cv.height * scale);
    const bc = big.getContext('2d');
    bc.imageSmoothingEnabled = false;
    bc.drawImage(cv, 0, 0, big.width, big.height);
    return big;
  },
};
