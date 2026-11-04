'use strict';
// ───────────────────────── UI 키트: 카드 · 키캡 · 게이지 · 아이콘 ─────────────────────────
const UI = {
  C: {
    bg: 'rgba(12,11,19,0.94)',
    bg2: 'rgba(24,22,36,0.96)',
    glass: 'rgba(12,11,19,0.72)',
    line: '#2a2740',
    line2: '#3e3a5a',
    text: '#ece8f4',
    sub: '#a29eb8',
    mute: '#5c5874',
    accent: '#f2c230',
    accentSoft: 'rgba(242,194,48,0.13)',
    track: 'rgba(255,255,255,0.09)',
  },

  // 둥근 모서리(2px) 카드
  card(ctx, x, y, w, h, o = {}) {
    x = Math.round(x); y = Math.round(y); w = Math.round(w); h = Math.round(h);
    ctx.fillStyle = o.fill || this.C.bg;
    ctx.fillRect(x + 2, y, w - 4, h);
    ctx.fillRect(x + 1, y + 1, w - 2, h - 2);
    ctx.fillRect(x, y + 2, w, h - 4);
    if (o.border !== false) {
      ctx.fillStyle = o.border || this.C.line;
      ctx.fillRect(x + 2, y, w - 4, 1); ctx.fillRect(x + 2, y + h - 1, w - 4, 1);
      ctx.fillRect(x, y + 2, 1, h - 4); ctx.fillRect(x + w - 1, y + 2, 1, h - 4);
      ctx.fillRect(x + 1, y + 1, 1, 1); ctx.fillRect(x + w - 2, y + 1, 1, 1);
      ctx.fillRect(x + 1, y + h - 2, 1, 1); ctx.fillRect(x + w - 2, y + h - 2, 1, 1);
    }
    if (o.accent) {
      ctx.fillStyle = o.accent;
      if (o.accentSide === 'left') ctx.fillRect(x, y + 3, 2, h - 6);
      else ctx.fillRect(x + 3, y, w - 6, 1);
    }
  },

  // 반투명 알약 배지
  pill(ctx, x, y, text, col, o = {}) {
    const w = Math.round(Gfx.measure(ctx, text, { small: true }) + (o.dot ? 14 : 8));
    const ax = o.align === 'right' ? x - w : o.align === 'center' ? x - w / 2 : x;
    this.card(ctx, ax, y, w, 12, { fill: o.fill || 'rgba(12,11,19,0.85)', border: o.border || col });
    if (o.dot) { ctx.fillStyle = col; ctx.fillRect(ax + 4, y + 5, 3, 3); }
    Gfx.text(ctx, text, ax + (o.dot ? 10 : 4), y + 1, o.textCol || col, { small: true, shadow: false });
    return w;
  },

  // 키보드 키 모양
  keycap(ctx, x, y, label) {
    const tw = Gfx.measure(ctx, label, { small: true });
    const w = Math.max(11, Math.round(tw + 6));
    ctx.fillStyle = '#d8d4e4'; ctx.fillRect(x + 1, y, w - 2, 10); ctx.fillRect(x, y + 1, w, 8);
    ctx.fillStyle = '#7e7a96'; ctx.fillRect(x + 1, y + 10, w - 2, 1);
    Gfx.text(ctx, label, x + w / 2, y, '#16141f', { small: true, align: 'center', shadow: false });
    return w;
  },
  // [키] 설명 묶음. align: left/right/center
  hints(ctx, x, y, list, align = 'right') {
    const parts = list.map(([k, t]) => ({ k, t, w: Math.max(11, Gfx.measure(ctx, k, { small: true }) + 6) + 3 + Gfx.measure(ctx, t, { small: true }) }));
    const total = parts.reduce((a, p) => a + p.w, 0) + (parts.length - 1) * 8;
    let cx = align === 'right' ? x - total : align === 'center' ? x - total / 2 : x;
    for (const p of parts) {
      const kw = this.keycap(ctx, Math.round(cx), y, p.k);
      Gfx.text(ctx, p.t, Math.round(cx + kw + 3), y, this.C.sub, { small: true });
      cx += p.w + 8;
    }
    return total;
  },

  // 슬림 게이지
  bar(ctx, x, y, w, h, frac, col, o = {}) {
    frac = clamp(frac, 0, 1);
    x = Math.round(x); y = Math.round(y);
    ctx.fillStyle = o.track || this.C.track; ctx.fillRect(x, y, w, h);
    if (o.ghost != null && o.ghost > frac) { ctx.fillStyle = o.ghostCol || 'rgba(255,255,255,0.45)'; ctx.fillRect(x, y, Math.round(w * clamp(o.ghost, 0, 1)), h); }
    ctx.fillStyle = col; ctx.fillRect(x, y, Math.round(w * frac), h);
    if (h >= 3) { ctx.fillStyle = 'rgba(255,255,255,0.28)'; ctx.fillRect(x, y, Math.round(w * frac), 1); }
    if (o.ticks) { ctx.fillStyle = 'rgba(0,0,0,0.5)'; for (const t of o.ticks) ctx.fillRect(x + Math.round(w * t), y, 1, h); }
  },

  divider(ctx, x, y, w, col) { ctx.fillStyle = col || this.C.line; ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), 1); },

  // 모서리 그림자 (HUD 가독성)
  corner(ctx, x, y, r, a = 0.55) {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `rgba(0,0,0,${a})`);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2);
  },

  // ── 작은 도트 아이콘 (HUD / 상태) ──
  _icons: {},
  icon(name) {
    if (this._icons[name]) return this._icons[name];
    const G = Gfx;
    const draw = ICON_PIX[name];
    const cv = G.sprite(9, 9, (c) => draw(c, G), { outline: false });
    this._icons[name] = cv;
    return cv;
  },
  // 상태 효과 타일 (12x12)
  statusTile(ctx, x, y, id, frac, stacks) {
    const st = STATUS[id];
    this.card(ctx, x, y, 13, 13, { fill: st.debuff ? 'rgba(40,10,20,0.88)' : 'rgba(30,26,8,0.88)', border: st.col });
    ctx.drawImage(this.icon('st_' + id), x + 2, y + 2);
    if (frac != null) { ctx.fillStyle = st.col; ctx.fillRect(x + 1, y + 13, Math.round(11 * clamp(frac, 0, 1)), 1); }
    if (stacks > 1) Gfx.text(ctx, String(stacks), x + 12, y + 5, '#ffffff', { small: true, align: 'right', shadow: true });
  },
};

// 9x9 아이콘 픽셀 그림
const ICON_PIX = {
  hp(c, G) { G.px(c, 1, 1, 3, 2, '#ff5a64'); G.px(c, 5, 1, 3, 2, '#ff5a64'); G.px(c, 0, 2, 9, 3, '#ff5a64'); G.px(c, 1, 5, 7, 1, '#ff5a64'); G.px(c, 2, 6, 5, 1, '#ff5a64'); G.px(c, 3, 7, 3, 1, '#ff5a64'); G.px(c, 4, 8, 1, 1, '#ff5a64'); G.px(c, 2, 2, 1, 1, '#ffd0d4'); },
  san(c, G) { G.ring(c, 4, 4, 3.6, '#a796ff'); G.px(c, 3, 3, 3, 3, '#a796ff'); G.px(c, 4, 4, 1, 1, '#ffffff'); },
  fear(c, G) { G.px(c, 1, 2, 7, 5, '#ff9a5a'); G.px(c, 2, 1, 5, 7, '#ff9a5a'); G.px(c, 2, 3, 2, 2, '#16141f'); G.px(c, 5, 3, 2, 2, '#16141f'); G.px(c, 3, 6, 3, 1, '#16141f'); G.px(c, 2, 3, 1, 1, '#ffffff'); G.px(c, 5, 3, 1, 1, '#ffffff'); },
  // 상태 효과
  st_panic(c, G) { G.px(c, 3, 0, 3, 6, '#ff3a5a'); G.px(c, 3, 7, 3, 2, '#ff3a5a'); G.px(c, 0, 1, 2, 1, '#ff3a5a'); G.px(c, 7, 1, 2, 1, '#ff3a5a'); },
  st_frightened(c, G) { G.px(c, 1, 1, 7, 7, '#ff8a5a'); G.px(c, 2, 3, 2, 2, '#16141f'); G.px(c, 5, 3, 2, 2, '#16141f'); G.px(c, 3, 6, 3, 1, '#16141f'); },
  st_erosion(c, G) { G.px(c, 4, 0, 1, 2, '#c07cff'); G.px(c, 3, 2, 3, 2, '#c07cff'); G.px(c, 2, 4, 5, 3, '#c07cff'); G.px(c, 3, 7, 3, 1, '#c07cff'); G.px(c, 3, 4, 1, 2, '#ecd8ff'); },
  st_slow(c, G) { G.px(c, 1, 0, 7, 1, '#7a9aff'); G.px(c, 1, 8, 7, 1, '#7a9aff'); G.px(c, 2, 1, 5, 2, '#7a9aff'); G.px(c, 3, 3, 3, 1, '#7a9aff'); G.px(c, 4, 4, 1, 1, '#7a9aff'); G.px(c, 3, 5, 3, 1, '#7a9aff'); G.px(c, 2, 6, 5, 2, '#7a9aff'); },
  st_halluc(c, G) { G.px(c, 0, 3, 9, 3, '#ff5a8a'); G.px(c, 1, 2, 7, 5, '#ff5a8a'); G.px(c, 3, 3, 3, 3, '#16141f'); G.px(c, 4, 4, 1, 1, '#ff5a8a'); },
  st_hope(c, G) { G.px(c, 3, 2, 3, 5, '#f2d040'); G.px(c, 2, 3, 5, 3, '#f2d040'); G.px(c, 4, 0, 1, 1, '#f2d040'); G.px(c, 4, 8, 1, 1, '#f2d040'); G.px(c, 0, 4, 1, 1, '#f2d040'); G.px(c, 8, 4, 1, 1, '#f2d040'); G.px(c, 4, 4, 1, 1, '#fff6c8'); },
  st_rage(c, G) { G.px(c, 2, 4, 5, 4, '#ff9a3a'); G.px(c, 3, 2, 3, 2, '#ff9a3a'); G.px(c, 4, 0, 1, 2, '#ff9a3a'); G.px(c, 6, 2, 1, 2, '#ff9a3a'); G.px(c, 4, 5, 1, 2, '#ffe0a0'); },
  st_jam(c, G) { G.px(c, 4, 2, 1, 7, '#62d6e8'); G.px(c, 2, 0, 1, 3, '#62d6e8'); G.px(c, 6, 0, 1, 3, '#62d6e8'); G.px(c, 3, 1, 3, 1, '#62d6e8'); G.line(c, 0, 8, 8, 0, '#ff3a5a'); },
  st_shield(c, G) { G.px(c, 2, 0, 5, 9, '#f2d040'); G.px(c, 3, 1, 3, 1, '#c41e3a'); G.px(c, 4, 2, 1, 5, '#c41e3a'); G.px(c, 3, 4, 3, 1, '#c41e3a'); },
};

// ── 휴대폰 기기 프레임 ──
function drawPhoneFrame(ctx, x, y, w, h, timeText) {
  // 본체
  UI.card(ctx, x, y, w, h, { fill: '#17151f', border: '#3c3952' });
  ctx.fillStyle = '#26232f'; ctx.fillRect(x + 2, y + 2, w - 4, 1);
  // 화면
  const sx = x + 5, sy = y + 6, sw = w - 10, sh = h - 12;
  const g = ctx.createLinearGradient(0, sy, 0, sy + sh);
  g.addColorStop(0, '#221636'); g.addColorStop(1, '#0d1226');
  ctx.fillStyle = g; ctx.fillRect(sx, sy, sw, sh);
  // 노치
  ctx.fillStyle = '#17151f'; ctx.fillRect(x + w / 2 - 14, sy, 28, 5); ctx.fillRect(x + w / 2 - 12, sy + 5, 24, 1);
  // 상태바
  Gfx.text(ctx, timeText || '', sx + 5, sy + 1, '#d8d4e8', { small: true, shadow: false });
  ctx.fillStyle = '#d8d4e8';
  ctx.fillRect(sx + sw - 16, sy + 4, 10, 5); ctx.fillRect(sx + sw - 6, sy + 5, 1, 3);
  ctx.fillStyle = '#17151f'; ctx.fillRect(sx + sw - 15, sy + 5, 2, 3);
  for (let i = 0; i < 3; i++) { ctx.fillStyle = '#d8d4e8'; ctx.fillRect(sx + sw - 30 + i * 3, sy + 8 - (i + 1) * 2 + 1, 2, (i + 1) * 2); }
  // 홈 바
  ctx.fillStyle = 'rgba(255,255,255,0.45)'; ctx.fillRect(x + w / 2 - 16, y + h - 9, 32, 2);
  return { sx, sy, sw, sh };
}

// 휴대폰 앱 아이콘 (22x22)
const APP_ICON_DRAW = {
  jobs(c, G) { G.px(c, 0, 0, 22, 22, '#f2c230'); G.line(c, 11, 2, 8, 9, '#2a1a08', 2); G.line(c, 8, 9, 13, 13, '#2a1a08', 2); G.line(c, 13, 13, 10, 20, '#2a1a08', 2); G.px(c, 3, 3, 3, 3, '#fff2b0'); },
  msg(c, G) { G.px(c, 0, 0, 22, 22, '#3ac87a'); G.px(c, 4, 5, 14, 9, '#ffffff'); G.px(c, 5, 4, 12, 11, '#ffffff'); G.px(c, 6, 15, 3, 3, '#ffffff'); G.px(c, 7, 8, 2, 2, '#3ac87a'); G.px(c, 10, 8, 2, 2, '#3ac87a'); G.px(c, 13, 8, 2, 2, '#3ac87a'); },
  memo(c, G) { G.px(c, 0, 0, 22, 22, '#e8e0c8'); G.px(c, 5, 5, 12, 1, '#7a7a8a'); G.px(c, 5, 9, 10, 1, '#7a7a8a'); G.px(c, 5, 13, 12, 1, '#7a7a8a'); G.px(c, 13, 15, 4, 4, '#c41e3a'); },
  mind(c, G) { G.px(c, 0, 0, 22, 22, '#4a3a8a'); G.line(c, 11, 11, 11, 3, '#ff4a5a'); G.line(c, 11, 11, 18, 8, '#ff9a3a'); G.line(c, 11, 11, 16, 18, '#a99cff'); G.line(c, 11, 11, 6, 18, '#62d6e8'); G.line(c, 11, 11, 4, 8, '#f2d040'); G.px(c, 10, 10, 3, 3, '#ffffff'); for (const [x, y, col] of [[11, 3, '#ff4a5a'], [18, 8, '#ff9a3a'], [16, 18, '#a99cff'], [6, 18, '#62d6e8'], [4, 8, '#f2d040']]) G.px(c, x - 1, y - 1, 3, 3, col); },
  status(c, G) { G.px(c, 0, 0, 22, 22, '#3a6ad8'); G.circle(c, 11, 8, 4, '#ffffff'); G.px(c, 5, 14, 12, 5, '#ffffff'); G.px(c, 6, 13, 10, 1, '#ffffff'); },
  settings(c, G) { G.px(c, 0, 0, 22, 22, '#5a5870'); G.circle(c, 11, 11, 6, '#d8d4e4'); G.circle(c, 11, 11, 2, '#5a5870'); for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; G.px(c, Math.round(11 + Math.cos(a) * 7) - 1, Math.round(11 + Math.sin(a) * 7) - 1, 2, 2, '#d8d4e4'); } },
};
const AppIconCache = {};
function appIcon(id) {
  if (!AppIconCache[id]) {
    const cv = Gfx.makeCanvas(22, 22);
    const c = cv.getContext('2d');
    APP_ICON_DRAW[id](c, Gfx);
    // 둥근 모서리
    c.clearRect(0, 0, 2, 1); c.clearRect(0, 0, 1, 2); c.clearRect(20, 0, 2, 1); c.clearRect(21, 0, 1, 2);
    c.clearRect(0, 21, 2, 1); c.clearRect(0, 20, 1, 2); c.clearRect(20, 21, 2, 1); c.clearRect(21, 20, 1, 2);
    AppIconCache[id] = cv;
  }
  return AppIconCache[id];
}

// 휴대폰 화면 오염 (통신 교란 후유증)
function phoneGlitchOverlay(ctx, S, t) {
  for (let i = 0; i < 6; i++) {
    const y = S.sy + ((t * 3 + i * 37) % S.sh);
    ctx.fillStyle = i % 2 ? 'rgba(98,214,232,0.12)' : 'rgba(255,58,90,0.12)';
    ctx.fillRect(S.sx, y, S.sw, 1 + (i % 3));
  }
  if (t % 90 < 6) {
    const y = S.sy + rndi(10, S.sh - 20);
    ctx.drawImage(Gfx.buf, S.sx, y, S.sw, 8, S.sx + rndi(-8, 8), y, S.sw, 8);
  }
  for (let i = 0; i < 20; i++) { ctx.fillStyle = Math.random() < 0.5 ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.3)'; ctx.fillRect(S.sx + rndi(0, S.sw - 2), S.sy + rndi(0, S.sh - 2), rndi(1, 3), 1); }
  UI.pill(ctx, S.sx + S.sw - 4, S.sy + S.sh - 14, '신호 불량', '#62d6e8', { align: 'right', dot: true });
}
// 글자 일부를 깨뜨린다
function glitchText(str, v) {
  if (v <= 0) return str;
  const subs = ['■', '?', '#', '▒', '░'];
  let out = '';
  for (const ch of str) out += ch !== ' ' && Math.random() < v * 0.35 ? subs[(Math.random() * subs.length) | 0] : ch;
  return out;
}
