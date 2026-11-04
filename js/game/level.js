'use strict';
// ───────────────────────── 레벨: 타일 / 충돌 / 절차 생성 ─────────────────────────
const T_EMPTY = 0, T_SOLID = 1, T_PLAT = 2, T_SPIKE = 3;
const LH = 18;      // 레벨 높이(타일)
const CEIL = 2;     // 천장 아래 첫 빈 줄
const GRAV = 0.3;
const MAXFALL = 6.5;

class Level {
  constructor(W, H) {
    this.W = W; this.H = H;
    this.rowH = H; this.trimOff = 10.2;   // 배경 벽 장식 줄 위치
    this.f = new Uint8Array(W * H);
    this.b = new Uint8Array(W * H);
  }
  arr(layer) { return layer === 'back' ? this.b : this.f; }
  get(layer, x, y) {
    if (x < 0 || x >= this.W || y < 0) return T_SOLID;
    if (y >= this.H) return T_EMPTY;
    return (layer === 'back' ? this.b : this.f)[y * this.W + x];
  }
  set(layer, x, y, v) {
    if (x < 0 || x >= this.W || y < 0 || y >= this.H) return;
    if (layer === 'both' || layer === 'front') this.f[y * this.W + x] = v;
    if (layer === 'both' || layer === 'back') this.b[y * this.W + x] = v;
  }
  solidPx(layer, px, py) { return this.get(layer, Math.floor(px / TS), Math.floor(py / TS)) === T_SOLID; }
  trim(W) {
    const nf = new Uint8Array(W * this.H), nb = new Uint8Array(W * this.H);
    for (let y = 0; y < this.H; y++) for (let x = 0; x < W; x++) {
      nf[y * W + x] = this.f[y * this.W + x]; nb[y * W + x] = this.b[y * this.W + x];
    }
    this.f = nf; this.b = nb; this.W = W;
  }
}

function boxHits(lvl, layer, x, y, w, h, type = T_SOLID) {
  const x0 = Math.floor(x / TS), x1 = Math.floor((x + w - 0.01) / TS);
  const y0 = Math.floor(y / TS), y1 = Math.floor((y + h - 0.01) / TS);
  for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) {
    if (lvl.get(layer, tx, ty) === type) return true;
  }
  return false;
}

// 축 분리 이동 + 충돌
function moveBody(e, lvl, layer) {
  e.hitWall = 0;
  if (e.vx !== 0) {
    e.x += e.vx;
    const y0 = Math.floor(e.y / TS), y1 = Math.floor((e.y + e.h - 0.01) / TS);
    if (e.vx > 0) {
      const tx = Math.floor((e.x + e.w - 0.01) / TS);
      for (let ty = y0; ty <= y1; ty++) if (lvl.get(layer, tx, ty) === T_SOLID) { e.x = tx * TS - e.w; e.vx = 0; e.hitWall = 1; break; }
    } else {
      const tx = Math.floor(e.x / TS);
      for (let ty = y0; ty <= y1; ty++) if (lvl.get(layer, tx, ty) === T_SOLID) { e.x = (tx + 1) * TS; e.vx = 0; e.hitWall = -1; break; }
    }
  }
  const prevBot = e.y + e.h;
  e.y += e.vy;
  e.onGround = false;
  const x0 = Math.floor(e.x / TS), x1 = Math.floor((e.x + e.w - 0.01) / TS);
  if (e.vy > 0) {
    const ty = Math.floor((e.y + e.h - 0.01) / TS);
    for (let tx = x0; tx <= x1; tx++) {
      const t = lvl.get(layer, tx, ty);
      if (t === T_SOLID || (t === T_PLAT && prevBot <= ty * TS + 0.5 && !(e.dropT > 0))) {
        e.y = ty * TS - e.h; e.vy = 0; e.onGround = true; break;
      }
    }
  } else if (e.vy < 0) {
    const ty = Math.floor(e.y / TS);
    for (let tx = x0; tx <= x1; tx++) if (lvl.get(layer, tx, ty) === T_SOLID) { e.y = (ty + 1) * TS; e.vy = 0; break; }
  }
}

// ── 타일 그래픽 ──
const TileCache = {};
function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  r = clamp(Math.round(r + amt), 0, 255); g = clamp(Math.round(g + amt), 0, 255); b = clamp(Math.round(b + amt), 0, 255);
  return '#' + ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1);
}

function buildTiles(themeKey) {
  if (TileCache[themeKey]) return TileCache[themeKey];
  const th = THEMES[themeKey];
  const G = Gfx;
  const out = {};
  for (const layer of ['front', 'back']) {
    const P = th[layer];
    const r = new RNG(themeKey.length * 31 + (layer === 'back' ? 7 : 3));
    const mk = (fn) => { const cv = G.makeCanvas(TS, TS); fn(cv.getContext('2d')); return cv; };
    const body = (c) => {
      G.px(c, 0, 0, TS, TS, P.solid);
      for (let i = 0; i < 10; i++) G.px(c, r.int(0, 15), r.int(0, 15), 1, 1, P.solid2);
      if (layer === 'front') { G.px(c, 0, 7, TS, 1, P.solid2); G.px(c, 7, 0, 1, 7, P.solid2); G.px(c, 3, 8, 1, 8, P.solid2); }
      else { G.line(c, r.int(0, 15), 0, r.int(0, 15), 15, shade(P.solid, 18)); G.px(c, r.int(2, 13), r.int(2, 13), 1, 1, P.barrier); }
    };
    out[layer] = {
      solid: mk(body),
      top: mk((c) => {
        body(c);
        G.px(c, 0, 0, TS, 5, P.floor);
        G.px(c, 0, 0, TS, 1, shade(P.floor, 30));
        G.px(c, 0, 4, TS, 1, P.floor2);
        if (layer === 'front') { G.px(c, 7, 1, 1, 3, P.floor2); G.px(c, 15, 1, 1, 3, P.floor2); }
        else { G.px(c, r.int(1, 14), 1, 2, 2, P.floor2); G.px(c, r.int(1, 14), 2, 1, 1, P.barrier); }
      }),
      plat: mk((c) => {
        G.px(c, 0, 0, TS, 5, P.plat);
        G.px(c, 0, 0, TS, 1, shade(P.plat, 35));
        G.px(c, 0, 4, TS, 1, shade(P.plat, -40));
        G.px(c, 2, 5, 2, 3, shade(P.plat, -50)); G.px(c, 12, 5, 2, 3, shade(P.plat, -50));
      }),
      excl: mk((c) => {
        if (layer === 'front') {
          G.px(c, 0, 0, TS, TS, shade(P.barrier, -60));
          for (let y = 0; y < TS; y += 4) G.px(c, 0, y, TS, 2, P.barrier);
          G.px(c, 0, 0, 1, TS, shade(P.barrier, -90)); G.px(c, 15, 0, 1, TS, shade(P.barrier, -90));
          for (let i = 0; i < 4; i++) G.px(c, 2 + i * 4, 1 + (i % 2) * 8, 2, 2, '#1a1a20');
        } else {
          G.px(c, 0, 0, TS, TS, shade(P.barrier, -120));
          for (let i = 0; i < 18; i++) G.px(c, r.int(0, 15), r.int(0, 15), r.int(1, 3), 1, shade(P.barrier, -40 + r.int(0, 60)));
          G.line(c, 0, r.int(0, 15), 15, r.int(0, 15), P.barrier);
          if (r.chance(0.5)) { G.px(c, 5, 6, 6, 3, '#f4f0e6'); G.px(c, 7, 6, 2, 3, '#0b0b10'); }
        }
      }),
      spike: mk((c) => {
        for (let i = 0; i < 4; i++) {
          const x = i * 4;
          G.px(c, x + 1, 10, 2, 6, shade(P.barrier, -40));
          G.px(c, x + 1, 7, 2, 3, P.barrier);
          G.px(c, x + 1, 5, 1, 2, '#f4f0e6');
        }
      }),
    };
  }
  TileCache[themeKey] = out;
  return out;
}

// ── 배경 소품 그래픽 ──
const DECOR_DRAW = {
  door(c, G) { G.px(c, 2, 0, 20, 34, '#5a4a3a'); G.px(c, 4, 2, 16, 32, '#7a6450'); G.px(c, 16, 17, 2, 3, '#d8c070'); G.px(c, 7, 6, 10, 4, '#c8c0a8'); G.px(c, 9, 7, 6, 2, '#3a3a40'); },
  extinguisher(c, G) { G.px(c, 2, 4, 12, 18, '#a8a8b0'); G.px(c, 4, 7, 8, 12, '#c83a3a'); G.px(c, 6, 4, 4, 3, '#2a2a30'); G.px(c, 4, 10, 8, 2, '#f4f0e6'); },
  sign(c, G) { G.px(c, 0, 0, 22, 10, '#2a8a4a'); G.px(c, 2, 2, 6, 6, '#f4f0e6'); G.px(c, 10, 4, 10, 2, '#f4f0e6'); },
  window(c, G) { G.px(c, 0, 0, 28, 22, '#6a6a78'); G.px(c, 2, 2, 24, 18, '#141c34'); G.px(c, 13, 2, 2, 18, '#6a6a78'); G.px(c, 4, 12, 3, 3, '#f2d070'); G.px(c, 19, 6, 2, 2, '#f2d070'); G.px(c, 8, 4, 2, 2, '#e8e8f8'); },
  mailbox(c, G) { G.px(c, 0, 0, 26, 18, '#8a8e9a'); for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) { G.px(c, 2 + i * 8, 2 + j * 8, 6, 6, '#6a6e7a'); G.px(c, 3 + i * 8, 4 + j * 8, 4, 1, '#2a2a30'); } },
  plant(c, G) { G.px(c, 4, 18, 10, 8, '#8a5a3a'); G.circle(c, 9, 11, 7, '#3a7a4a'); G.px(c, 6, 8, 2, 2, '#5aa86a'); G.px(c, 11, 12, 2, 2, '#5aa86a'); },
  shelf(c, G) { G.px(c, 0, 0, 34, 36, '#c8ccd6'); for (let j = 0; j < 4; j++) { G.px(c, 1, 2 + j * 9, 32, 7, '#e8ecf4'); for (let i = 0; i < 7; i++) G.px(c, 2 + i * 4 + (j % 2), 3 + j * 9, 3, 5, ['#e5383b', '#f2c230', '#5a7dff', '#3ad0a0', '#ff7aa8'][(i + j) % 5]); } },
  fridge(c, G) { G.px(c, 0, 0, 30, 38, '#9aa0b0'); G.px(c, 2, 2, 12, 34, '#c8e8f8'); G.px(c, 16, 2, 12, 34, '#c8e8f8'); for (let j = 0; j < 4; j++) for (let i = 0; i < 3; i++) { G.px(c, 3 + i * 4, 4 + j * 8, 3, 6, ['#e8603a', '#f4f0e6', '#3a8a5a'][(i + j) % 3]); G.px(c, 17 + i * 4, 4 + j * 8, 3, 6, ['#5a7dff', '#f2c230', '#e5383b'][(i + j) % 3]); } },
  counter(c, G) { G.px(c, 0, 8, 40, 18, '#3a8a5a'); G.px(c, 0, 6, 40, 3, '#e8e8ec'); G.px(c, 26, 0, 10, 7, '#2a2a30'); G.px(c, 27, 1, 8, 4, '#62d6e8'); },
  poster(c, G) { G.px(c, 0, 0, 16, 22, '#f4f0e6'); G.px(c, 2, 2, 12, 10, '#e5383b'); G.px(c, 2, 14, 12, 2, '#3a3a48'); G.px(c, 2, 18, 8, 2, '#3a3a48'); },
  atm(c, G) { G.px(c, 0, 0, 20, 34, '#5a5e6a'); G.px(c, 3, 4, 14, 9, '#62d6e8'); G.px(c, 4, 16, 12, 6, '#3a3a48'); G.px(c, 6, 26, 8, 2, '#2a2a30'); },
  pillar(c, G) { G.px(c, 0, 0, 20, 60, '#a8b0b4'); G.px(c, 2, 0, 3, 60, '#c8d0d4'); G.px(c, 15, 0, 3, 60, '#8a9294'); G.px(c, 0, 30, 20, 6, '#d8b030'); },
  bench(c, G) { G.px(c, 0, 6, 36, 4, '#6a5a4a'); G.px(c, 0, 0, 36, 3, '#6a5a4a'); G.px(c, 3, 10, 3, 6, '#3a3a40'); G.px(c, 30, 10, 3, 6, '#3a3a40'); },
  map(c, G) { G.px(c, 0, 0, 40, 24, '#e8e8ec'); G.line(c, 3, 18, 36, 6, '#2a8a4a', 2); G.line(c, 3, 6, 36, 18, '#e5383b', 2); G.line(c, 18, 2, 20, 22, '#5a7dff', 2); },
  screen(c, G) { G.px(c, 0, 0, 34, 16, '#1a1a24'); G.px(c, 2, 2, 30, 12, '#0a2a3a'); G.px(c, 4, 5, 18, 2, '#f2c230'); G.px(c, 4, 9, 12, 2, '#62d6e8'); },
  locker(c, G) { for (let i = 0; i < 3; i++) { G.px(c, i * 11, 0, 10, 38, '#6a8aa8'); G.px(c, i * 11 + 2, 4, 6, 1, '#3a4a5a'); G.px(c, i * 11 + 2, 6, 6, 1, '#3a4a5a'); G.px(c, i * 11 + 7, 18, 1, 4, '#2a2a30'); } },
  board(c, G) { G.px(c, 0, 0, 48, 26, '#8a6a3a'); G.px(c, 2, 2, 44, 22, '#2a4a3a'); G.px(c, 6, 6, 20, 1, '#e8e8e8'); G.px(c, 6, 10, 28, 1, '#e8e8e8'); G.px(c, 6, 14, 14, 1, '#e8e8e8'); },
  clock(c, G) { G.circle(c, 7, 7, 6, '#f4f0e6'); G.ring(c, 7, 7, 6, '#3a3a48'); G.px(c, 7, 3, 1, 4, '#0b0b10'); G.px(c, 7, 7, 3, 1, '#0b0b10'); },
  trophy(c, G) { G.px(c, 0, 10, 26, 18, '#6a4a2a'); G.px(c, 2, 12, 22, 14, '#a8c8d8'); G.px(c, 6, 14, 4, 8, '#f2c230'); G.px(c, 15, 16, 5, 6, '#c8ccd8'); },
  pc(c, G) { G.px(c, 0, 18, 38, 4, '#4a4a5a'); G.px(c, 6, 2, 22, 14, '#1a1a24'); G.px(c, 8, 4, 18, 10, '#3a5aff'); G.px(c, 15, 16, 4, 2, '#2a2a30'); G.px(c, 8, 16, 16, 2, '#2a2a30'); G.px(c, 2, 22, 3, 12, '#2a2a30'); G.px(c, 32, 22, 3, 12, '#2a2a30'); },
  vending(c, G) { G.px(c, 0, 0, 24, 40, '#c83a3a'); G.px(c, 3, 3, 18, 22, '#e8f0f8'); for (let j = 0; j < 3; j++) for (let i = 0; i < 4; i++) G.px(c, 4 + i * 4, 5 + j * 7, 3, 5, ['#3ad0a0', '#f2c230', '#5a7dff', '#f4f0e6'][(i + j) % 4]); G.px(c, 6, 30, 12, 4, '#2a2a30'); },
  cubicle(c, G) { G.px(c, 0, 8, 44, 26, '#8a8e9a'); G.px(c, 0, 8, 44, 2, '#5a5e6a'); G.px(c, 14, 0, 16, 10, '#1a1a24'); G.px(c, 16, 2, 12, 6, '#62a0d8'); },
  cooler(c, G) { G.px(c, 2, 0, 12, 12, '#a8d8f8'); G.px(c, 0, 12, 16, 24, '#e8e8ec'); G.px(c, 4, 18, 3, 2, '#5a7dff'); G.px(c, 9, 18, 3, 2, '#e5383b'); },
  bed(c, G) { G.px(c, 0, 10, 40, 6, '#c8d0d0'); G.px(c, 0, 6, 12, 5, '#f4f8f4'); G.px(c, 10, 8, 28, 3, '#9ab8c8'); G.px(c, 2, 16, 2, 6, '#7a8a88'); G.px(c, 36, 16, 2, 6, '#7a8a88'); G.px(c, 0, 2, 3, 14, '#a8b4b4'); },
  ivstand(c, G) { G.px(c, 7, 2, 2, 36, '#8a8a9a'); G.px(c, 3, 2, 10, 2, '#8a8a9a'); G.px(c, 3, 5, 6, 8, '#d8f0e8'); G.px(c, 4, 9, 4, 4, '#c8ff6a'); G.px(c, 2, 37, 12, 2, '#5a5a6a'); },
  wheelchair(c, G) { G.circle(c, 9, 16, 7, '#3a3a48'); G.circle(c, 9, 16, 5, '#c8ccd8'); G.circle(c, 9, 16, 1, '#3a3a48'); G.px(c, 4, 6, 14, 3, '#3a6a8a'); G.px(c, 16, 0, 3, 10, '#5a5a6a'); G.px(c, 20, 18, 3, 3, '#3a3a48'); },
  curtain(c, G) { G.px(c, 0, 0, 30, 2, '#8a8a9a'); for (let i = 0; i < 6; i++) G.px(c, i * 5, 2, 4, 34, i % 2 ? '#a8d0c8' : '#98c0b8'); },
  kiln(c, G) { G.circle(c, 18, 18, 17, '#7a4a2a'); G.circle(c, 18, 20, 11, '#2a1408'); G.px(c, 10, 22, 16, 14, '#2a1408'); G.px(c, 13, 26, 10, 2, '#ff8a3a'); G.px(c, 14, 2, 8, 4, '#5a3a1a'); },
  mats(c, G) { for (let i = 0; i < 3; i++) { G.px(c, i * 15, 4 - i, 14, 4, ['#4a8ac8', '#c84a6a', '#4ac88a'][i]); G.px(c, i * 15, 3 - i, 14, 1, '#f4f0e6'); } },
  tv(c, G) { G.px(c, 0, 0, 34, 20, '#1a1a24'); G.px(c, 2, 2, 30, 15, '#3a6a9a'); G.px(c, 6, 6, 10, 6, '#f2c230'); G.px(c, 20, 5, 9, 2, '#f4f0e6'); G.px(c, 14, 20, 6, 3, '#3a3a48'); },
  eggbasket(c, G) { G.px(c, 2, 8, 22, 8, '#a87a4a'); G.px(c, 2, 8, 22, 2, '#c89a6a'); for (let i = 0; i < 5; i++) G.circle(c, 5 + i * 4, 6, 2, '#8a5a3a'); },
  xwall(c, G) { G.px(c, 0, 0, 36, 30, '#9a8a78'); for (let j = 0; j < 5; j++) G.px(c, 0, j * 6, 36, 1, '#7a6a58'); G.line(c, 6, 4, 30, 26, '#d8201a', 3); G.line(c, 30, 4, 6, 26, '#d8201a', 3); },
  rubble(c, G) { G.px(c, 2, 10, 30, 6, '#6a645a'); G.px(c, 6, 6, 8, 5, '#8a8478'); G.px(c, 18, 4, 10, 7, '#7a7468'); G.line(c, 10, 2, 24, 8, '#5a5a6a', 2); G.px(c, 26, 12, 4, 4, '#c84a3a'); },
  banner(c, G) { G.px(c, 0, 0, 48, 14, '#f2e6c0'); G.px(c, 2, 2, 44, 10, '#d8201a'); G.px(c, 6, 5, 12, 4, '#f4f0e6'); G.px(c, 22, 5, 20, 4, '#f4f0e6'); },
  fence(c, G) { G.px(c, 0, 4, 40, 2, '#c8a040'); G.px(c, 0, 12, 40, 2, '#c8a040'); for (let i = 0; i < 5; i++) G.px(c, i * 9 + 2, 0, 3, 22, '#e8c040'); for (let i = 0; i < 4; i++) G.line(c, i * 9 + 4, 4, i * 9 + 11, 12, '#1a1a20'); },
  cctv(c, G) { G.px(c, 0, 0, 4, 4, '#5a5a6a'); G.px(c, 2, 3, 14, 7, '#c8ccd8'); G.px(c, 14, 5, 3, 3, '#e5383b'); },
};
const DECOR_SIZES_EXTRA = { bed: [40, 22], ivstand: [14, 39], wheelchair: [24, 24], curtain: [30, 36], kiln: [36, 36], mats: [44, 8], tv: [34, 23], eggbasket: [26, 16], xwall: [36, 30], rubble: [34, 16], banner: [48, 14], fence: [40, 22] };
const DecorCache = {};
function decorSprite(type, layer) {
  const k = type + ':' + layer;
  if (DecorCache[k]) return DecorCache[k];
  const sizes = { door: [24, 34], extinguisher: [16, 22], sign: [22, 10], window: [28, 22], mailbox: [26, 18], plant: [18, 26], shelf: [34, 36], fridge: [30, 38], counter: [40, 26], poster: [16, 22], atm: [20, 34], pillar: [20, 60], bench: [36, 16], map: [40, 24], screen: [34, 16], locker: [33, 38], board: [48, 26], clock: [15, 15], trophy: [26, 28], pc: [38, 34], vending: [24, 40], cubicle: [44, 34], cooler: [16, 36], cctv: [17, 10] };
  const [w, h] = sizes[type] || DECOR_SIZES_EXTRA[type];
  let cv = Gfx.sprite(w + 2, h + 2, (c) => { c.translate(1, 1); DECOR_DRAW[type](c, Gfx); });
  if (layer === 'back') {
    cv = Gfx.tint(cv, '#1a0008', 0.62);
    const c = cv.getContext('2d');
    const r = new RNG(type.length * 17 + w);
    const n = r.int(1, 3);
    for (let i = 0; i < n; i++) {
      const ex = r.int(2, Math.max(2, w - 6)), ey = r.int(2, Math.max(2, h - 4));
      Gfx.px(c, ex, ey, 4, 2, '#f4f0e6'); Gfx.px(c, ex + 1, ey, 2, 2, '#c41e3a');
    }
  }
  DecorCache[k] = cv;
  return cv;
}
// 소품을 걸어 둘 높이 (바닥 기준 위로)
const DECOR_Y = { sign: 52, window: 50, poster: 40, map: 46, screen: 60, board: 48, clock: 58, cctv: 70, extinguisher: 22, mailbox: 30, tv: 56, banner: 58, xwall: 44 };

// ───────────── 절차 생성 ─────────────
function generateMission(spec) {
  if (!spec.tutorial && !spec.linear && typeof generateRoomMission === 'function') {
    const r = generateRoomMission(spec);
    if (r) return r;
  }
  if (spec.obj === 'descend') spec = Object.assign({}, spec, { obj: 'stabilize' });
  const rng = new RNG(spec.seed || 1);
  const th = THEMES[spec.theme];
  const d = spec.diff;
  const lvl = new Level(900, LH);
  const out = { lvl, enemies: [], pickups: [], interacts: [], decor: [], hints: [], ambush: [], start: null, arena: null, theme: spec.theme };
  const B = { x: 0, gy: 14, ground: [], secret: [], segs: [] };

  const floor = (x0, x1, gy, layer = 'both') => {
    for (let x = x0; x < x1; x++) {
      for (let y = gy; y < LH; y++) lvl.set(layer, x, y, T_SOLID);
      if (layer === 'both') B.ground.push({ x, gy });
    }
  };
  const ceilTo = (x0, x1, y1) => { for (let x = x0; x < x1; x++) for (let y = 0; y < y1; y++) lvl.set('both', x, y, T_SOLID); };
  const groundSpot = (x0, x1) => ({ x: rng.int(x0, x1 - 1), gy: B.gy });
  const wx = (tx) => tx * TS;
  const addEnemy = (type, tx, gy, layer) => {
    const def = ENEMIES[type];
    const y = type === 'flyer' ? (gy - 3) * TS : type === 'notif' || type === 'noise' ? (gy - 3) * TS : gy * TS - def.h;
    out.enemies.push({ type, x: tx * TS + 2, y, layer: layer || def.layer });
  };
  const enemyPool = () => {
    const pool = [];
    for (const e of th.enemies) {
      let w = 3;
      if (e === 'watcher') w = d >= 2 ? 1.5 : 0;
      if (e === 'flyer') w = 2;
      if (e === 'notif') w = 2;
      pool.push([e, w]);
    }
    return pool;
  };
  const maybeEnemies = (x0, x1, base = 0.35) => {
    if (spec.tutorial) return;
    if (rng.chance(base + 0.1 * d)) {
      const n = d >= 3 && rng.chance(0.4) ? 2 : 1;
      for (let i = 0; i < n; i++) {
        const t = rng.weighted(enemyPool());
        addEnemy(t, rng.int(x0 + 1, Math.max(x0 + 1, x1 - 2)), B.gy);
      }
    }
    if (d >= 2 && rng.chance(0.12 + 0.03 * d)) addEnemy('echo', rng.int(x0, x1 - 1), B.gy, 'front');
  };

  const SEG = {
    start() {
      ceilTo(0, 10, CEIL);
      for (let x = 0; x < 2; x++) for (let y = 0; y < LH; y++) lvl.set('both', x, y, T_SOLID);
      floor(2, 10, B.gy);
      out.start = { x: wx(4), y: wx(B.gy) - 22 };
      out.interacts.push({ type: 'entry', x: wx(3) - 4, y: wx(B.gy) - 32, w: 24, h: 32, layer: 'both' });
      B.x = 10;
    },
    flat(len) {
      len = len || rng.int(4, 8);
      floor(B.x, B.x + len, B.gy);
      maybeEnemies(B.x, B.x + len, 0.25);
      B.x += len;
    },
    step() {
      const dir = B.gy >= 14 ? -1 : B.gy <= 10 ? 1 : rng.pick([-1, 1]);
      B.gy = clamp(B.gy + dir * rng.int(1, 2), 9, 15);
      const len = rng.int(4, 7);
      floor(B.x, B.x + len, B.gy);
      maybeEnemies(B.x, B.x + len, 0.2);
      B.x += len;
    },
    pitBridge(len) {
      len = len || rng.int(4, 6 + Math.min(3, d));
      floor(B.x, B.x + 1, B.gy);
      for (let x = B.x + 1; x < B.x + len + 1; x++) lvl.set('back', x, B.gy, T_SOLID);
      B.secret.push({ x: B.x + 1 + Math.floor(len / 2), gy: B.gy - 1, layer: 'back' });
      if (!spec.tutorial && d >= 2 && rng.chance(0.4)) addEnemy('noise', B.x + Math.floor(len / 2), B.gy);
      floor(B.x + len + 1, B.x + len + 3, B.gy);
      B.x += len + 3;
    },
    frontWall() {
      floor(B.x, B.x + 7, B.gy);
      const wxT = B.x + 3;
      for (let y = CEIL; y < B.gy; y++) lvl.set('front', wxT, y, T_SOLID);
      if (rng.chance(0.5)) B.secret.push({ x: B.x + 5, gy: B.gy, layer: 'back' });
      maybeEnemies(B.x + 4, B.x + 7, 0.2);
      B.x += 7;
      return wxT;
    },
    backWall() {
      floor(B.x, B.x + 7, B.gy);
      const wxT = B.x + 3;
      for (let y = CEIL; y < B.gy; y++) lvl.set('back', wxT, y, T_SOLID);
      B.x += 7;
      return wxT;
    },
    flipGate() {
      floor(B.x, B.x + 11, B.gy);
      for (let y = CEIL; y < B.gy; y++) { lvl.set('front', B.x + 2, y, T_SOLID); lvl.set('back', B.x + 8, y, T_SOLID); }
      B.secret.push({ x: B.x + 5, gy: B.gy, layer: rng.pick(['back', 'front']) });
      if (!spec.tutorial && rng.chance(0.5)) addEnemy(rng.weighted(enemyPool()), B.x + 5, B.gy);
      B.x += 11;
    },
    platforms() {
      // 발판 구간: 한 구간의 발판은 모두 같은 레이어 (공중 전환 강요 금지)
      floor(B.x, B.x + 1, B.gy);
      const layer = d >= 2 && rng.chance(0.4) ? (rng.chance(0.75) ? 'back' : 'front') : 'both';
      let px = B.x + 1, cur = B.gy;     // cur: 현재 서 있는 높이(행)
      const n = rng.int(3, 4);
      for (let k = 0; k < n; k++) {
        const target = clamp(cur - rng.int(-1, 2), B.gy - 3, B.gy - 1);
        const rise = cur - target;
        const maxGap = rise >= 2 ? 1 : rise === 1 ? 2 : 3;
        px += k === 0 ? 1 : rng.int(1, maxGap);
        const w = rng.int(3, 4);
        const type = rng.chance(0.5) ? T_PLAT : T_SOLID;
        for (let i = 0; i < w; i++) lvl.set(layer, px + i, target, type);
        if (rng.chance(0.4)) B.secret.push({ x: px, gy: target, layer: layer === 'both' ? 'back' : layer });
        px += w;
        cur = target;
      }
      const end = px + rng.int(1, 2);
      floor(end, end + 2, B.gy);
      B.x = end + 2;
    },
    spikes() {
      const len = rng.int(6, 8);
      floor(B.x, B.x + len, B.gy);
      for (let x = B.x + 2; x < B.x + len - 2; x++) lvl.set('back', x, B.gy - 1, T_SPIKE);
      if (rng.chance(0.4)) for (let i = 0; i < 2; i++) lvl.set('both', B.x + 3 + i, B.gy - 3, T_PLAT);
      B.x += len;
    },
    arena() {
      const len = rng.int(14, 18);
      floor(B.x, B.x + len, B.gy);
      if (!spec.tutorial) {
        const n = 2 + Math.floor(d / 2) + (rng.chance(0.4) ? 1 : 0);
        const list = [];
        for (let i = 0; i < n; i++) list.push({ type: rng.weighted(enemyPool()), tx: B.x + 2 + rng.int(0, len - 4), gy: B.gy });
        out.ambush.push({ x: wx(B.x + 3), x1: wx(B.x + len), list, done: false });
        lvl.set('both', B.x + Math.floor(len / 2) - 1, B.gy - 3, T_PLAT);
        lvl.set('both', B.x + Math.floor(len / 2), B.gy - 3, T_PLAT);
        B.secret.push({ x: B.x + Math.floor(len / 2), gy: B.gy - 3, layer: 'back' });
      }
      B.x += len;
    },
    tower() {
      const hts = [0, 1, 2, 3, 3, 2, 1, 0];
      const base = B.gy;
      hts.forEach((h, i) => floor(B.x + i, B.x + i + 1, base - h));
      B.secret.push({ x: B.x + 3, gy: base - 3, layer: rng.pick(['front', 'back']) });
      maybeEnemies(B.x, B.x + 8, 0.2);
      B.x += 8;
    },
    lowCeil() {
      const len = rng.int(7, 10);
      floor(B.x, B.x + len, B.gy);
      ceilTo(B.x + 1, B.x + len - 1, B.gy - 4);
      if (!spec.tutorial && rng.chance(0.5)) addEnemy('crawler', B.x + 3, B.gy);
      B.x += len;
    },
    rift() {
      const len = 9;
      floor(B.x, B.x + len, B.gy);
      out.interacts.push({ type: 'rift', x: wx(B.x + 4) - 4, y: wx(B.gy) - 40, w: 24, h: 40, layer: 'back' });
      B.x += len;
    },
    cause() {
      const len = 16;
      floor(B.x, B.x + len, B.gy);
      ceilTo(B.x, B.x + len, CEIL);
      out.interacts.push({ type: 'cause', x: wx(B.x + 6), y: wx(B.gy) - 44, w: 28, h: 44, layer: 'back' });
      lvl.set('both', B.x + 2, B.gy - 3, T_PLAT); lvl.set('both', B.x + 3, B.gy - 3, T_PLAT);
      lvl.set('both', B.x + 12, B.gy - 3, T_PLAT); lvl.set('both', B.x + 13, B.gy - 3, T_PLAT);
      B.x += len;
    },
    bossArena(finale) {
      const len = finale ? 26 : 24;
      B.gy = 14;
      floor(B.x, B.x + len, B.gy);
      ceilTo(B.x, B.x + len, CEIL);
      const ax = B.x;
      for (const off of [4, 5, 6, len - 7, len - 6, len - 5]) lvl.set('both', ax + off, B.gy - 3, T_PLAT);
      for (const off of [Math.floor(len / 2) - 1, Math.floor(len / 2)]) lvl.set('both', ax + off, B.gy - 6, T_PLAT);
      out.arena = { tx0: ax, tx1: ax + len, gy: B.gy, x0: wx(ax), x1: wx(ax + len), floorY: wx(B.gy), boss: spec.boss || th.boss, finale: !!finale };
      if (finale) out.interacts.push({ type: 'core', x: wx(ax + len - 5), y: wx(B.gy) - 48, w: 32, h: 48, layer: 'both' });
      B.x += len;
    },
    exit() {
      floor(B.x, B.x + 7, B.gy);
      ceilTo(B.x, B.x + 9, CEIL);
      out.interacts.push({ type: 'exit', x: wx(B.x + 3) - 4, y: wx(B.gy) - 32, w: 24, h: 32, layer: 'both' });
      B.x += 7;
      for (let x = B.x; x < B.x + 2; x++) for (let y = 0; y < LH; y++) lvl.set('both', x, y, T_SOLID);
      B.x += 2;
    },
  };

  const freeAt = (layer, s) => lvl.get(layer, s.x, s.gy - 1) === T_EMPTY && lvl.get(layer, s.x, s.gy - 2) === T_EMPTY;
  // ── 구간 순서 ──
  const hint = (key) => out.hints.push({ x: wx(B.x), key, shown: false });
  SEG.start();
  if (spec.tutorial) {
    out.pickups.push({ type: 'cash', amount: 10000, x: wx(7), y: wx(B.gy) - 16, layer: 'front' });
    hint('move'); SEG.flat(6);
    out.interacts.push({ type: 'doc', id: spec.doc, x: wx(B.x - 2), y: wx(B.gy) - 14, w: 16, h: 14, layer: 'front' });
    SEG.step(); SEG.flat(4);
    hint('flip'); const fw = SEG.frontWall(); out.hints[out.hints.length - 1].x = wx(fw - 3);
    hint('bridge'); SEG.pitBridge(5);
    hint('back'); SEG.backWall();
    hint('enemy'); SEG.flat(4); addEnemy('noise', B.x - 1, B.gy); addEnemy('follower', B.x + 3, B.gy); SEG.flat(8);
    hint('clue'); SEG.flat(6);
    out.interacts.push({ type: 'clue', x: wx(B.x - 3), y: wx(B.gy) - 20, w: 16, h: 20, layer: 'back' });
    hint('artifact'); SEG.flat(3);
    out.pickups.push({ type: 'artifact', id: 'nametag', x: wx(B.x - 2), y: wx(B.gy) - 18, layer: 'back' });
    SEG.platforms();
    SEG.flat(4);
    out.pickups.push({ type: 'item', id: 'candy', x: wx(B.x - 2), y: wx(B.gy) - 16, layer: 'front' });
    hint('item'); SEG.flipGate();
    SEG.flat(5);
    out.interacts.push({ type: 'clue', x: wx(B.x - 3), y: wx(B.gy) - 20, w: 16, h: 20, layer: 'back' });
    addEnemy('crawler', B.x - 1, B.gy);
    SEG.pitBridge(4);
    hint('cause'); SEG.cause(); SEG.exit();
  } else {
    const n = 6 + d * 2 + (spec.obj === 'finale' ? 2 : 0);
    const seq = [];
    const W = [['flat', 1.5], ['step', 3], ['pitBridge', 3], ['frontWall', 1.5], ['backWall', 1.5], ['flipGate', 2], ['platforms', 3], ['spikes', 2], ['arena', 1.6], ['tower', 1.4], ['lowCeil', 1]];
    let last = '';
    for (let i = 0; i < n; i++) {
      let s = rng.weighted(W);
      if (s === last && s !== 'step') s = rng.weighted(W);
      seq.push(s); last = s;
    }
    if (spec.obj === 'stabilize') {
      seq.splice(Math.floor(n * 0.85), 0, 'rift');
      seq.splice(Math.floor(n * 0.55), 0, 'rift');
      seq.splice(Math.floor(n * 0.25), 0, 'rift');
    }
    for (const s of seq) {
      SEG[s]();
      if (s === 'step') SEG.flat(2);
    }
    SEG.flat(4);
    if (spec.obj === 'erase') { SEG.bossArena(false); SEG.exit(); }
    else if (spec.obj === 'finale') { SEG.bossArena(true); SEG.exit(); }
    else if (spec.obj === 'resolve') { SEG.cause(); SEG.exit(); }
    else SEG.exit();

    // 단서 배치
    if (spec.obj === 'resolve') {
      const cands = B.ground.filter((g) => g.x > 14 && g.x < B.x - 30 && freeAt('back', g));
      const nClue = 3;
      for (let i = 0; i < nClue; i++) {
        const target = cands[Math.floor(cands.length * (i + 0.5) / nClue)];
        if (target) out.interacts.push({ type: 'clue', x: wx(target.x), y: wx(target.gy) - 20, w: 16, h: 20, layer: 'back' });
      }
    }
  }
  // 천장 전체
  for (let x = 0; x < B.x; x++) for (let y = 0; y < CEIL; y++) lvl.set('both', x, y, T_SOLID);
  // 전파 오염 구역 (위험도 4 이상, PC방, 수상한 공고)
  out.jamZones = [];
  if (!spec.tutorial && (d >= 4 || (spec.theme === 'pcbang' && d >= 2) || spec.jammed)) {
    const n = spec.jammed ? 3 : d >= 5 ? 3 : 2;
    for (let i = 0; i < n; i++) {
      const cx = Math.floor(B.x * (0.2 + 0.6 * (i + 0.5) / n)) + rng.int(-4, 4);
      const half = rng.int(5, 8);
      out.jamZones.push({ x0: (cx - half) * TS, x1: (cx + half) * TS });
    }
  }
  lvl.trim(B.x);

  // ── 아이템 배치 ──
  const usedSpots = new Set();
  const takeSpot = (pref, layer) => {
    const pool = pref === 'secret' && B.secret.length ? B.secret : B.ground.filter((g) => g.x > 12 && g.x < B.x - 12);
    for (let tries = 0; tries < 30; tries++) {
      const s = rng.pick(pool);
      if (!s) return null;
      const k = s.x + ':' + s.gy;
      if (usedSpots.has(k)) continue;
      const L = layer || s.layer || (rng.chance(0.75) ? 'back' : 'front');
      if (!freeAt(L, s)) continue;
      usedSpots.add(k);
      return { x: s.x, gy: s.gy, layer: L };
    }
    return null;
  };
  if (!spec.tutorial) {
    const nArt = 2 + Math.floor(d / 2) + (rng.chance(0.05 * spec.luk) ? 1 : 0) + (spec.extraArt || 0);
    for (let i = 0; i < nArt; i++) {
      const s = takeSpot(i < 2 ? 'secret' : 'ground');
      if (!s) continue;
      const id = rollArtifact(rng, spec.theme, d, spec.luk);
      out.pickups.push({ type: 'artifact', id, x: wx(s.x) + 1, y: wx(s.gy) - 18, layer: s.layer });
    }
    const nCash = rng.int(1, 3);
    for (let i = 0; i < nCash; i++) {
      const s = takeSpot('ground', 'front'); if (!s) continue;
      out.pickups.push({ type: 'cash', amount: rng.int(3, 12) * 1000 * d, x: wx(s.x) + 1, y: wx(s.gy) - 16, layer: 'front' });
    }
    const nBox = rng.int(1, 2);
    for (let i = 0; i < nBox; i++) {
      const s = takeSpot('ground', rng.pick(['front', 'back'])); if (!s) continue;
      out.pickups.push({ type: 'item', id: rng.pick(['drink', 'candy', 'gimbap', 'salt', 'charm', 'candy']), x: wx(s.x) + 1, y: wx(s.gy) - 16, layer: s.layer });
    }
    // 문서 (진실 조각)
    for (const docId of [spec.doc || spec.randomDoc, spec.doc2]) {
      if (!docId) continue;
      const s = takeSpot('ground', 'front');
      if (s) out.interacts.push({ type: 'doc', id: docId, x: wx(s.x), y: wx(s.gy) - 14, w: 16, h: 14, layer: 'front' });
    }
  }

  // ── 배경 소품 ──
  let x = 4;
  while (x < lvl.W - 4) {
    const type = rng.pick(th.decor);
    // 바닥이 공통인 곳만
    let gy = -1;
    for (let y = CEIL; y < LH; y++) { if (lvl.get('front', x, y) === T_SOLID && lvl.get('back', x, y) === T_SOLID) { gy = y; break; } if (lvl.get('front', x, y) !== T_EMPTY || lvl.get('back', x, y) !== T_EMPTY) break; }
    if (gy > 0) {
      const spr = decorSprite(type, 'front');
      const yOff = DECOR_Y[type] || spr.height - 1;
      const top = gy * TS - yOff;
      if (top > (CEIL + 0.5) * TS) out.decor.push({ type, x: x * TS, y: top });
    }
    x += rng.int(2, 5);
  }
  return out;
}

function rollArtifact(rng, theme, d, luk) {
  let rar = 0;
  const r = rng.next();
  const pAb = d >= 3 ? 0.04 + 0.01 * luk : 0;
  const pRare = 0.22 + 0.025 * luk + 0.03 * d;
  if (r < pAb) rar = 2; else if (r < pAb + pRare) rar = 1;
  const pool = THEMES[theme].artifacts.filter((id) => ARTIFACTS[id].rarity === rar);
  if (pool.length) return rng.pick(pool);
  const all = Object.keys(ARTIFACTS).filter((id) => ARTIFACTS[id].rarity === rar && !ARTIFACTS[id].story);
  return rng.pick(all);
}
