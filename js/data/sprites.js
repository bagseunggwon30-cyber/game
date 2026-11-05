'use strict';
// ───────────────────────── 절차적 도트 스프라이트 ─────────────────────────
const SPR = {};

const PAL = {
  player: {
    cap: '#2b3d73', capDark: '#1c2850', logo: '#f2c230', hair: '#2a2230', skin: '#f0c39a', skinShade: '#cf9673',
    eye: '#14101c', shirt: '#6d7386', vest: '#f2c230', vestDark: '#c4891e', strip: '#e8eef0',
    pants: '#34406e', pantsDark: '#283258', shoes: '#1d1b22',
  },
  shadow: {
    cap: '#140c1c', capDark: '#0c0612', logo: '#ff2f5a', hair: '#140c1c', skin: '#241932', skinShade: '#1a1226',
    eye: '#ffffff', shirt: '#1b1226', vest: '#2a1b38', vestDark: '#1e1229', strip: '#3a2650',
    pants: '#120a18', pantsDark: '#0c0612', shoes: '#08050c',
  },
  echo: {
    cap: '#cfd8e8', capDark: '#a8b4c8', logo: '#ffffff', hair: '#b8c4d8', skin: '#e8eef8', skinShade: '#c8d2e2',
    eye: '#5a6a88', shirt: '#c8d2e2', vest: '#dde6f2', vestDark: '#b8c4d8', strip: '#ffffff',
    pants: '#a8b4c8', pantsDark: '#98a4b8', shoes: '#8894a8',
  },
  seo: {
    hair: '#141018', skin: '#ecc4a0', skinShade: '#c99a78', eye: '#14101c', shirt: '#2a2b36', vest: '#2a2b36',
    vestDark: '#1e1f28', strip: '#e8e8f0', pants: '#22232c', pantsDark: '#1a1b22', shoes: '#101014', glass: '#c8d0e0',
  },
  min: {
    hair: '#e8d8a0', skin: '#f0c39a', skinShade: '#cf9673', eye: '#14101c', shirt: '#6d7386', vest: '#f2c230',
    vestDark: '#c4891e', strip: '#e8eef0', pants: '#2e2e3a', pantsDark: '#24242e', shoes: '#e8e8e8', ear: '#e8e8f0',
  },
  noeul: {
    hair: '#6a3e2c', skin: '#f4caa4', skinShade: '#d39f7c', eye: '#14101c', shirt: '#e8e4dc', vest: '#3a8a5a',
    vestDark: '#2a6a44', strip: '#9ad0a8', pants: '#2a2a34', pantsDark: '#202028', shoes: '#3a3a44',
  },
};

// 포즈: bf=뒷발, ff=앞발, h=손 위치, b=몸 들썩임
const POSES = {
  idle0: { bf: [5, 21], ff: [8, 21], h: [7, 14], b: 0 },
  idle1: { bf: [5, 21], ff: [8, 21], h: [7, 15], b: 1 },
  run0: { bf: [3, 20], ff: [10, 21], h: [4, 14], b: 0 },
  run1: { bf: [6, 20], ff: [7, 21], h: [7, 15], b: 1 },
  run2: { bf: [9, 21], ff: [4, 20], h: [10, 13], b: 0 },
  run3: { bf: [7, 21], ff: [6, 20], h: [7, 15], b: 1 },
  jump: { bf: [4, 19], ff: [9, 20], h: [10, 10], b: 0 },
  fall: { bf: [5, 21], ff: [9, 21], h: [10, 11], b: 0 },
  atk0: { bf: [4, 21], ff: [9, 21], h: [4, 9], b: 0 },
  atk1: { bf: [4, 21], ff: [10, 21], h: [12, 12], b: 0 },
  atk2: { bf: [4, 21], ff: [9, 21], h: [11, 15], b: 1 },
  hurt: { bf: [3, 20], ff: [8, 21], h: [4, 11], b: 0 },
};
const POSE_ORDER = ['idle0', 'idle1', 'run0', 'run1', 'run2', 'run3', 'jump', 'fall', 'atk0', 'atk1', 'atk2', 'hurt'];

function drawHuman(c, pose, P, o = {}) {
  const G = Gfx;
  const b = pose.b;
  // 뒷다리
  G.line(c, 6, 17, pose.bf[0], pose.bf[1], P.pantsDark, 2);
  G.px(c, pose.bf[0], pose.bf[1] + 1, 3, 1, P.shoes);
  // 앞다리
  G.line(c, 8, 17, pose.ff[0], pose.ff[1], P.pants, 2);
  G.px(c, pose.ff[0], pose.ff[1] + 1, 3, 1, P.shoes);
  // 엉덩이
  G.px(c, 5, 16, 5, 2, P.pants);
  // 몸통
  G.px(c, 4, 9 + b, 7, 7, P.shirt);
  if (o.vest !== false) {
    G.px(c, 5, 9 + b, 5, 6, P.vest);
    G.px(c, 5, 12 + b, 5, 1, P.strip);
    G.px(c, 7, 9 + b, 1, 3, P.vestDark);
  } else {
    G.px(c, 7, 9 + b, 2, 3, P.strip); // 셔츠 칼라
    if (o.tie) G.px(c, 7, 10 + b, 1, 3, o.tie);
  }
  // 머리
  G.px(c, 5, 2 + b, 6, 6, P.skin);
  G.px(c, 6, 8 + b, 3, 1, P.skinShade);
  if (o.cap !== false) {
    G.px(c, 4, 1 + b, 7, 2, P.cap);
    G.px(c, 9, 3 + b, 4, 1, P.capDark);
    G.px(c, 6, 1 + b, 1, 1, P.logo);
    G.px(c, 4, 3 + b, 3, 4, P.hair);
  } else {
    G.px(c, 4, 1 + b, 7, 2, P.hair);
    G.px(c, 4, 3 + b, 3, o.hairLong ? 6 : 4, P.hair);
    G.px(c, 10, 2 + b, 1, 2, P.hair);
    if (o.pony) G.px(c, 3, 4 + b, 1, 5, P.hair);
  }
  G.px(c, 6, 5 + b, 1, 1, P.skinShade);
  G.px(c, 9, 5 + b, 1, 1, P.eye);
  if (o.glasses) { G.px(c, 8, 5 + b, 3, 1, P.glass); G.px(c, 9, 5 + b, 1, 1, P.eye); }
  if (o.ear) G.px(c, 6, 6 + b, 1, 1, P.ear);
  if (o.smile) { G.px(c, 7, 7 + b, 4, 1, '#2a0a10'); G.px(c, 7, 6 + b, 1, 1, '#2a0a10'); G.px(c, 10, 6 + b, 1, 1, '#2a0a10'); G.px(c, 9, 4 + b, 1, 2, P.eye); }
  // 팔 (소매 + 손)
  G.line(c, 7, 10 + b, pose.h[0], pose.h[1] + (pose === POSES.idle1 ? 0 : 0), P.shirt, 2);
  G.px(c, pose.h[0], pose.h[1] + 1, 2, 1, P.skin);
}

function buildHumanSet(P, o = {}, outlineColor = COL.ink) {
  const R = POSE_ORDER.map((k) => Gfx.sprite(16, 24, (c) => drawHuman(c, POSES[k], P, o), { outlineColor }));
  return { R, L: R.map((f) => Gfx.flipH(f)) };
}

// 무기 그리기 (런타임). hx,hy 손 위치(월드), ang 라디안, face 방향
// 플레이어 스프라이트 (외형을 바꾸면 다시 만든다)
function playerPalette() {
  const sk = typeof SKINS !== 'undefined' && typeof Achieve !== 'undefined' ? SKINS[Achieve.skin()] : null;
  return Object.assign({}, PAL.player, sk ? sk.pal : {});
}
function buildPlayerSprites(P) {
  const G = Gfx;
  SPR.player = buildHumanSet(P);
  // 구르기: 몸을 웅크린 공 모양을 90°씩 돌린 4프레임
  const base = G.makeCanvas(16, 16), b = base.getContext('2d');
  G.circle(b, 8, 9, 6, P.vest);
  G.px(b, 3, 10, 11, 4, P.vestDark);
  G.px(b, 3, 9, 11, 1, P.strip);
  G.px(b, 2, 9, 4, 4, P.pants); G.px(b, 2, 12, 3, 2, P.shoes);
  G.circle(b, 11, 5, 3, P.skin);
  G.px(b, 9, 2, 5, 2, P.cap); G.px(b, 13, 3, 2, 1, P.capDark);
  G.px(b, 12, 5, 1, 1, P.eye);
  G.px(b, 6, 5, 3, 2, P.shirt);
  const R = [0, 1, 2, 3].map((i) => G.sprite(16, 16, (c) => {
    c.save(); c.translate(8, 8); c.rotate(i * Math.PI / 2); c.drawImage(base, -8, -8); c.restore();
  }));
  SPR.playerRoll = { R, L: R.map((f) => G.flipH(f)) };
}

function drawWeapon(ctx, kind, hx, hy, ang, face, o = {}) {
  const G = Gfx;
  const cos = Math.cos(ang) * face, sin = Math.sin(ang);
  const L = { mop: 15, bat: 12, baton: 11, spray: 0, umbrella: 15, shovel: 13, swatter: 10 }[kind] || 12;
  if (kind === 'spray') {
    G.px(ctx, hx - 1, hy - 3, 3, 5, '#d8e4ee');
    G.px(ctx, hx - 1, hy - 4, 3, 1, '#3aa0d8');
    return;
  }
  if (kind === 'extinguisher') {
    // 빨간 소화기를 옆구리에 끼고 호스를 앞으로
    G.px(ctx, hx - 3, hy - 4, 6, 9, '#0b0b10'); G.px(ctx, hx - 2, hy - 3, 4, 7, '#d8281e'); G.px(ctx, hx - 2, hy - 3, 1, 7, '#ff6a5a');
    G.px(ctx, hx - 1, hy - 6, 2, 2, '#2a2a30');
    G.line(ctx, hx, hy - 5, hx + face * 6, hy - 2, '#1a1a20', 1);
    return;
  }
  if (kind === 'umbrella' && o.open) {
    // 펼친 우산: 앞쪽에 반원
    const cx = hx + face * 7, cy = hy - 2;
    for (let a = -1.5; a <= 1.5; a += 0.12) {
      const x = cx + Math.cos(a) * 9 * face, y = cy + Math.sin(a) * 11;
      G.px(ctx, Math.round(x) - 1, Math.round(y) - 1, 3, 3, '#0b0b10');
    }
    for (let a = -1.45; a <= 1.45; a += 0.1) {
      const x = cx + Math.cos(a) * 9 * face, y = cy + Math.sin(a) * 11;
      G.px(ctx, Math.round(x), Math.round(y), 1, 1, Math.floor((a + 1.5) * 3) % 2 ? '#2b3d73' : '#3a5aa8');
    }
    G.line(ctx, hx, hy, cx, cy, '#2a2230', 1);
    return;
  }
  const back = kind === 'mop' ? 4 : kind === 'umbrella' ? 3 : 2;
  const x0 = hx - cos * back, y0 = hy - sin * back;
  const x1 = hx + cos * L, y1 = hy + sin * L;
  const col = { mop: '#b48a52', bat: '#c8ccd8', baton: '#2a2a36', umbrella: '#2b3d73', shovel: '#8a6a3a', swatter: '#e8e0c8' }[kind];
  G.line(ctx, x0, y0, x1, y1, '#0b0b10', 3);
  G.line(ctx, x0, y0, x1, y1, col, 1);
  if (kind === 'mop') {
    G.px(ctx, x1 - 2, y1 - 2, 5, 5, '#0b0b10');
    G.px(ctx, x1 - 1, y1 - 1, 3, 3, '#e4e0d4');
  } else if (kind === 'bat') {
    G.line(ctx, hx + cos * 6, hy + sin * 6, x1, y1, '#e8ecf4', 2);
  } else if (kind === 'baton') {
    G.px(ctx, x1 - 1, y1 - 1, 3, 3, Math.random() < 0.5 ? '#9ae8ff' : '#4ab8ff');
  } else if (kind === 'umbrella') {
    // 접힌 우산 + 갈고리 손잡이
    G.line(ctx, hx + cos * 4, hy + sin * 4, x1, y1, '#3a5aa8', 2);
    G.px(ctx, x0 - 1, y0, 2, 2, '#2a2230');
  } else if (kind === 'shovel') {
    G.px(ctx, x1 - 3, y1 - 3, 7, 7, '#0b0b10'); G.px(ctx, x1 - 2, y1 - 2, 5, 5, '#a8acb8'); G.px(ctx, x1 - 2, y1 - 2, 5, 1, '#d8dce4');
  } else if (kind === 'swatter') {
    G.px(ctx, x1 - 4, y1 - 4, 9, 9, '#0b0b10'); G.px(ctx, x1 - 3, y1 - 3, 7, 7, '#3a6ad8');
    for (let i = -2; i <= 2; i += 2) { G.px(ctx, x1 + i, y1 - 3, 1, 7, '#9ab8ff'); G.px(ctx, x1 - 3, y1 + i, 7, 1, '#9ab8ff'); }
    if (Math.random() < 0.3) G.px(ctx, x1 + rndi(-4, 4), y1 + rndi(-4, 4), 1, 1, '#ffffff');
  }
  if (o.glow) { ctx.globalAlpha = 0.5 + Math.sin(Date.now() / 60) * 0.3; G.px(ctx, Math.round(x1) - 2, Math.round(y1) - 2, 4, 4, o.glow); ctx.globalAlpha = 1; }
}

// ── 적 스프라이트 ──
function buildEnemySprites() {
  const G = Gfx;
  const r = new RNG(77);
  // 잡음
  SPR.noise = [0, 1, 2, 3].map(() => G.sprite(16, 16, (c) => {
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
      const d = Math.hypot(x - 7.5, y - 7.5);
      if (d < 6.2 + r.range(-1, 1)) {
        const v = r.next();
        c.fillStyle = v < 0.08 ? '#ff3a5a' : v < 0.4 ? '#e8e8f0' : v < 0.7 ? '#8a8a9a' : '#3a3a48';
        c.fillRect(x, y, 1, 1);
      }
    }
    G.px(c, 5, 6, 2, 2, '#000'); G.px(c, 9, 6, 2, 2, '#000');
  }, { outlineColor: '#1a0a12' }));

  // 따라쟁이 (그림자 사람)
  SPR.follower = buildHumanSet(PAL.shadow, {}, '#4a0a20');
  SPR.echo = buildHumanSet(PAL.echo, { cap: false }, '#8894b0');
  SPR.smiler = buildHumanSet({ hair: '#3a2a2a', skin: '#f4e8de', skinShade: '#d8c4b4', eye: '#14101c', shirt: '#8a6a9a', vest: '#8a6a9a', vestDark: '#6a4a7a', strip: '#a88ab8', pants: '#3a3a4a', pantsDark: '#2a2a38', shoes: '#1a1a20' }, { cap: false, vest: false, smile: true }, '#3a1a2a');

  // 눈알 전단지
  SPR.flyer = [0, 1, 2].map((f) => G.sprite(16, 18, (c) => {
    G.px(c, 2, 1, 12, 15, '#e8e4d4');
    G.px(c, 2, 1, 3, 2, '#c8b878'); G.px(c, 11, 1, 3, 2, '#c8b878');
    for (let i = 0; i < 5; i++) G.px(c, 3 + i * 2, 14, 1, 2, '#c8c4b4');
    G.px(c, 4, 3, 8, 1, '#5a5a6a'); G.px(c, 4, 12, 6, 1, '#8a8a9a');
    if (f === 2) { G.px(c, 4, 8, 8, 1, '#3a1a22'); return; }
    const h = f === 0 ? 5 : 3;
    G.px(c, 4, 8 - Math.floor(h / 2), 8, h, '#ffffff');
    G.px(c, 6, 7, 4, 3, '#c41e3a');
    G.px(c, 7, 8, 2, 1, '#0b0b10');
  }));

  // 알림
  SPR.notif = [0, 1].map((f) => G.sprite(14, 14, (c) => {
    G.circle(c, 6.5, 6, f ? 5 : 4, '#e5383b');
    G.px(c, 2, 10, 3, 2, '#e5383b');
    G.px(c, 6, 3, 1, 6, '#ffffff'); G.px(c, 5, 4, 1, 1, '#ffffff'); G.px(c, 5, 8, 3, 1, '#ffffff');
  }));

  // 등 뒤의 사람
  SPR.watcher = [0, 1].map((f) => G.sprite(14, 36, (c) => {
    G.px(c, 4, 1, 6, 7, '#d8d4cc');
    G.px(c, 5, 8, 4, 2, '#0e0a12');
    G.px(c, 3, 10, 8, 13, '#0e0a12');
    G.line(c, 3, 11, 1 + f, 27, '#0e0a12', 2);
    G.line(c, 10, 11, 12 - f, 27, '#0e0a12', 2);
    G.px(c, 4, 23, 2, 12, '#0e0a12');
    G.px(c, 8, 23, 2, 12, '#0e0a12');
    G.px(c, 6, 4, 2, 1, '#b8b4ac');
  }, { outlineColor: '#2a0a18' }));

  // 기어다니는 손
  SPR.crawler = [0, 1].map((f) => G.sprite(16, 12, (c) => {
    G.px(c, 3, 3, 9, 4, '#d8b8a8');
    G.px(c, 11, 4, 3, 2, '#c8a898');
    for (let i = 0; i < 4; i++) {
      const up = (i + f) % 2;
      G.px(c, 3 + i * 2, 7, 1, 3 - up, '#d8b8a8');
      G.px(c, 3 + i * 2, 10 - up, 2, 1, '#b89888');
    }
    G.px(c, 5, 4, 4, 1, '#b89888');
  }, { outlineColor: '#3a1a1a' }));
  SPR.crawlerL = SPR.crawler.map((f) => G.flipH(f));
  // 귀 기울이는 것: 눈이 없고 귀가 큰 마른 형체
  SPR.listener = [0, 1].map((f) => G.sprite(14, 30, (c) => {
    G.px(c, 4, 9, 6, 15, '#d8d0c0'); G.px(c, 5, 24, 2, 6, '#b8b0a0'); G.px(c, 8, 24 - f, 2, 6 + f, '#b8b0a0');
    G.circle(c, 7, 5, 4, '#e8e0d0');
    G.px(c, 0, 1 + f, 3, 7, '#e8e0d0'); G.px(c, 11, 1 + f, 3, 7, '#e8e0d0'); G.px(c, 1, 3 + f, 1, 3, '#a89888'); G.px(c, 12, 3 + f, 1, 3, '#a89888');
    G.px(c, 5, 7, 4, 1, '#3a2a2a');
    G.line(c, 4, 11, 1, 19 + f, '#d8d0c0', 1); G.line(c, 9, 11, 13, 19 - f, '#d8d0c0', 1);
  }, { outlineColor: '#1a1410' }));
  SPR.listenerL = SPR.listener.map((f) => G.flipH(f));
  // 길 잃은 아이 (뒷면의 미아)
  SPR.child = buildHumanSet({ hair: '#3a2a20', skin: '#f4d0b0', skinShade: '#d8b090', eye: '#14101c', shirt: '#ffb8c8', vest: '#ffb8c8', vestDark: '#e8909a', strip: '#ffffff', pants: '#5a6aa8', pantsDark: '#4a5a90', shoes: '#f4f0e6' }, { cap: false, vest: false }, '#2a1418');

  // 병원: 맨발의 환자 / 떠도는 링거
  SPR.patient = buildHumanSet({ hair: '#2a2a2a', skin: '#d8dcd0', skinShade: '#b4b8ac', eye: '#0b0b10', shirt: '#9ab8c8', vest: '#9ab8c8', vestDark: '#7a98a8', strip: '#c8d8e0', pants: '#9ab8c8', pantsDark: '#7a98a8', shoes: '#d8dcd0' }, { cap: false, vest: false }, '#1a2a2a');
  SPR.ivbag = [0, 1].map((f) => G.sprite(14, 18, (c) => {
    G.px(c, 6, 0, 2, 2, '#8a8a9a');
    G.px(c, 3, 2, 8, 9, '#d8f0e8'); G.px(c, 4, 5 + f, 6, 5 - f, '#c8ff6a');
    G.px(c, 5, 4, 1, 1, '#0b0b10'); G.px(c, 8, 4, 1, 1, '#0b0b10');
    G.px(c, 6, 11, 2, 2, '#8a8a9a'); G.line(c, 7, 13, 7 + (f ? 2 : -2), 17, '#c8d8d0');
  }, { outlineColor: '#1a2a20' }));
  // 찜질방: 수면실 손님 (누워 있다가 일어남) / 증기 그림자
  SPR.sleeper = buildHumanSet({ hair: '#1a1410', skin: '#e8c8a8', skinShade: '#c8a888', eye: '#0b0b10', shirt: '#e8803a', vest: '#e8803a', vestDark: '#c8602a', strip: '#f0a060', pants: '#e8803a', pantsDark: '#c8602a', shoes: '#e8c8a8' }, { cap: false, vest: false }, '#3a1a0a');
  SPR.sleeperLying = G.sprite(26, 10, (c) => {
    G.px(c, 2, 3, 18, 5, '#e8803a'); G.px(c, 19, 2, 5, 6, '#e8c8a8'); G.px(c, 21, 1, 4, 3, '#1a1410');
    G.px(c, 22, 4, 1, 1, '#0b0b10'); G.px(c, 1, 4, 3, 3, '#e8c8a8'); G.px(c, 6, 2, 10, 1, '#f0a060');
  }, { outlineColor: '#3a1a0a' });
  SPR.steam = [0, 1, 2].map((f) => G.sprite(18, 18, (c) => {
    const r = new RNG(9 + f);
    for (let i = 0; i < 6; i++) G.circle(c, 9 + r.range(-4, 4), 9 + r.range(-4, 4), r.int(2, 4), i % 2 ? '#f4f0e6' : '#c8c4b8');
    G.px(c, 6, 8, 2, 2, '#3a1a0a'); G.px(c, 11, 8, 2, 2, '#3a1a0a'); G.px(c, 8, 12, 3, 1, '#3a1a0a');
  }, { outlineColor: '#5a4a3a' }));
  // 재개발: 떠나지 못한 세입자 / 빨간 X
  SPR.tenant = buildHumanSet({ hair: '#c8c8c8', skin: '#b8b4ac', skinShade: '#9a968e', eye: '#2a0a0a', shirt: '#5a5448', vest: '#5a5448', vestDark: '#4a443a', strip: '#7a7468', pants: '#3a3a40', pantsDark: '#2a2a30', shoes: '#2a2420' }, { cap: false, vest: false }, '#2a1010');
  SPR.xmark = [0, 1].map((f) => G.sprite(16, 16, (c) => {
    G.px(c, 1, 1, 14, 14, '#7a7468');
    G.line(c, 3, 3, 12, 12, '#d8201a', 2); G.line(c, 12, 3, 3, 12, '#d8201a', 2);
    if (f) { G.px(c, 7, 7, 2, 2, '#fff2c8'); G.px(c, 3, 13, 1, 2, '#d8201a'); }
  }, { outlineColor: '#1a0a0a' }));

  // 플레이어 / NPC
  buildPlayerSprites(playerPalette());
  SPR.seo = buildHumanSet(PAL.seo, { cap: false, vest: false, glasses: true, hairLong: true, tie: '#7a1e2e' });
  SPR.min = buildHumanSet(PAL.min, { cap: false, ear: true });
  SPR.noeul = buildHumanSet(PAL.noeul, { cap: false, pony: true });
}

// ── 보스 스프라이트 ──
function buildBossSprites() {
  const G = Gfx;
  SPR.boss = {};
  // 4.5층의 주민 : 다리 달린 현관문
  SPR.boss.door = [0, 1, 2].map((f) => G.sprite(40, 50, (c) => {
    G.line(c, 12, 38, 8 - f * 2, 48, '#3a3438', 2);
    G.line(c, 26, 38, 30 + f * 2, 48, '#3a3438', 2);
    G.px(c, 6, 4, 28, 36, '#5a3a28');
    G.px(c, 8, 6, 24, 32, '#7a5236');
    G.px(c, 20, 6, 12, 32, '#0b0608');
    for (let i = 0; i < 6; i++) {
      const ex = 23 + (i % 2) * 4 + ((i + f) % 3), ey = 9 + i * 5;
      G.px(c, ex, ey, 3, 2, '#f2d040'); G.px(c, ex + 1, ey, 1, 2, '#0b0b10');
    }
    G.px(c, 10, 9, 8, 4, '#c8b070'); G.px(c, 11, 10, 2, 2, '#3a2a18'); G.px(c, 15, 10, 2, 2, '#3a2a18');
    G.px(c, 18, 24, 2, 3, '#d8c070');
    G.line(c, 6, 14, 0, 30 + f, '#3a3438', 2);
    G.line(c, 33, 14, 39, 28 - f, '#3a3438', 2);
  }));
  // 새벽 3시의 손님 : 영수증을 두른 우비, 바코드 스캐너 머리
  SPR.boss.receipt = [0, 1, 2].map((f) => G.sprite(36, 50, (c) => {
    G.px(c, 10, 14, 16, 30, '#2f4a3a');
    G.px(c, 12, 44, 4, 5, '#1a2a20'); G.px(c, 20, 44, 4, 5, '#1a2a20');
    G.px(c, 11, 2, 14, 11, '#5a5e6a');
    G.px(c, 13, 6, 10, 2, '#ff2a3a');
    G.px(c, 14, 10, 8, 1, '#2a2a30');
    for (let i = 0; i < 6; i++) {
      const sx = 9 + i * 3 + (i % 2 ? f : -f) * 0;
      const len = 14 + ((i * 7 + f * 3) % 12);
      G.px(c, sx, 16 + (i % 3) * 3, 2, len, '#f0ece0');
      for (let k = 0; k < len; k += 3) G.px(c, sx, 17 + (i % 3) * 3 + k, 2, 1, '#b8b4a8');
    }
    G.line(c, 10, 16, 2, 32 + f * 2, '#2f4a3a', 3);
    G.line(c, 25, 16, 33, 30 - f * 2, '#2f4a3a', 3);
    G.px(c, 31, 28 - f * 2, 4, 6, '#f0ece0');
  }));
  // 0호선 안내원 : 확성기 머리 역무원
  SPR.boss.speaker = [0, 1, 2].map((f) => G.sprite(40, 50, (c) => {
    G.px(c, 12, 16, 16, 20, '#24305a');
    G.px(c, 14, 36, 5, 13, '#1a2244'); G.px(c, 21, 36, 5, 13, '#1a2244');
    G.px(c, 18, 16, 4, 12, '#e8e4dc');
    G.px(c, 19, 18, 2, 9, '#c83a3a');
    G.px(c, 12, 22, 16, 1, '#c8a040');
    G.px(c, 14, 12, 12, 4, '#8a8e9a');
    const v = f === 1 ? 1 : 0;
    G.px(c, 16, 2 - v, 8, 10, '#a8acb8');
    G.px(c, 24, 0 - v, 6, 14 + v * 2, '#c8ccd8');
    G.px(c, 30, -2 - v, 6, 18 + v * 2, '#d8dce8');
    G.px(c, 33, 2, 2, 10, '#3a3a48');
    G.px(c, 15, 0, 10, 3, '#1a2244'); G.px(c, 13, 3, 14, 1, '#1a2244'); G.px(c, 18, 1, 2, 1, '#e8c040');
    G.line(c, 12, 18, 4, 30 + f, '#24305a', 3);
    G.line(c, 27, 18, 34, 28, '#24305a', 3);
    G.px(c, 2, 30 + f, 4, 3, '#e8e4dc');
  }));
  // 자율학습 감독 : 시계 머리 선생
  SPR.boss.clock = [0, 1, 2].map((f) => G.sprite(38, 50, (c) => {
    G.px(c, 11, 18, 16, 20, '#6a4a32');
    G.px(c, 17, 18, 4, 8, '#e8e4dc'); G.px(c, 18, 19, 2, 7, '#3a5a8a');
    G.px(c, 13, 38, 5, 11, '#3a2a20'); G.px(c, 20, 38, 5, 11, '#3a2a20');
    G.circle(c, 19, 9, 8, '#e8e4d8');
    G.ring(c, 19, 9, 8, '#8a6a3a');
    for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; G.px(c, Math.round(19 + Math.cos(a) * 6), Math.round(9 + Math.sin(a) * 6), 1, 1, '#3a3a48'); }
    const a1 = f * 2.1 - 1.57, a2 = f * 0.4 + 0.3;
    G.line(c, 19, 9, 19 + Math.cos(a1) * 5, 9 + Math.sin(a1) * 5, '#0b0b10');
    G.line(c, 19, 9, 19 + Math.cos(a2) * 3, 9 + Math.sin(a2) * 3, '#c41e3a');
    G.line(c, 11, 20, 4, 32, '#6a4a32', 3);
    G.line(c, 26, 20, 32, 30 - f, '#6a4a32', 3);
    G.line(c, 32, 30 - f, 37, 14 - f * 2, '#c8a060', 1);
  }));
  // 웃는 썸네일 : 떠다니는 모니터
  SPR.boss.monitor = [0, 1, 2].map((f) => G.sprite(44, 46, (c) => {
    for (let i = 0; i < 4; i++) G.line(c, 10 + i * 8, 30, 8 + i * 8 + ((i + f) % 3) * 3, 44, '#2a2a34', 2);
    G.px(c, 2, 2, 40, 30, '#9a9ca8');
    G.px(c, 5, 5, 34, 23, '#f2c230');
    G.px(c, 12, 10, 4, 4, '#0b0b10'); G.px(c, 28, 10, 4, 4, '#0b0b10');
    const w = 4 + f * 2;
    G.px(c, 13 - w / 2, 18, 18 + w, 2, '#0b0b10');
    G.px(c, 13 - w / 2, 16, 2, 2, '#0b0b10'); G.px(c, 29 + w / 2, 16, 2, 2, '#0b0b10');
    G.px(c, 15 - w / 2, 20, 14 + w, 2, '#c41e3a');
    G.px(c, 33, 21, 5, 5, '#e5383b'); G.px(c, 35, 22, 1, 3, '#fff'); G.px(c, 36, 23, 1, 1, '#fff');
    G.px(c, 17, 32, 10, 3, '#7a7c88');
  }));
  // 틈새 공고 : 전단지로 덮인 사람 (민재)
  SPR.boss.flyer = [0, 1, 2].map((f) => G.sprite(38, 52, (c) => {
    G.px(c, 13, 2, 12, 11, '#e8d8a0');
    G.px(c, 15, 6, 8, 7, '#f0c39a');
    G.px(c, 16, 8, 2, 1, '#0b0b10'); G.px(c, 21, 8, 2, 1, '#0b0b10');
    G.px(c, 11, 14, 16, 22, '#f2c230');
    G.px(c, 14, 36, 4, 14, '#2e2e3a'); G.px(c, 21, 36, 4, 14, '#2e2e3a');
    const papers = [[9, 12], [19, 15], [12, 22], [22, 25], [8, 30], [17, 31], [14, 4]];
    papers.forEach(([x, y], i) => {
      const dx = (i + f) % 2;
      G.px(c, x + dx, y, 9, 8, i % 2 ? '#f4f0e4' : '#e8e0c8');
      G.px(c, x + dx + 1, y + 2, 6, 1, '#7a7a8a');
      G.px(c, x + dx + 1, y + 4, 4, 1, '#9a9aaa');
      for (let k = 0; k < 4; k++) G.px(c, x + dx + 1 + k * 2, y + 7, 1, 2, '#d8d0b8');
    });
    G.line(c, 11, 16, 3, 32 + f, '#6d7386', 3);
    G.line(c, 26, 16, 34, 30 - f, '#6d7386', 3);
  }));
  // 야간 회진 수간호사 : 링거대를 끄는 키 큰 간호사
  SPR.boss.nurse = [0, 1, 2].map((f) => G.sprite(40, 54, (c) => {
    G.px(c, 13, 14, 14, 26, '#e8f0ec'); G.px(c, 13, 26, 14, 2, '#c8d8d0');
    G.px(c, 15, 40, 4, 13, '#d8dcd0'); G.px(c, 21, 40, 4, 13, '#d8dcd0');
    G.px(c, 14, 3, 12, 11, '#d8dcd0'); G.px(c, 14, 1, 12, 4, '#f4f8f4'); G.px(c, 18, 1, 4, 2, '#c41e3a');
    G.px(c, 15, 9, 10, 4, '#a8c8c0'); G.px(c, 16, 6, 2, 2, '#0b0b10'); G.px(c, 22, 6, 2, 2, '#0b0b10');
    G.line(c, 13, 16, 4, 30 + f, '#e8f0ec', 3);
    G.line(c, 26, 16, 32, 28, '#e8f0ec', 3);
    G.px(c, 33, 4, 2, 48, '#8a8a9a'); G.px(c, 30, 4, 8, 2, '#8a8a9a');
    G.px(c, 30, 7, 6, 9, '#d8f0e8'); G.px(c, 31, 10 + f, 4, 6 - f, '#c8ff6a');
    G.px(c, 2, 30 + f, 3, 6, '#c8d8d0'); G.px(c, 3, 36 + f, 1, 4, '#8a8a9a');
  }));
  // 양머리 : 수건 양머리를 한 거대한 손님
  SPR.boss.sheep = [0, 1, 2].map((f) => G.sprite(46, 50, (c) => {
    G.px(c, 12, 18, 22, 22, '#e8803a'); G.px(c, 12, 18, 22, 3, '#f0a060');
    G.px(c, 14, 40, 6, 9, '#e8803a'); G.px(c, 26, 40, 6, 9, '#e8803a');
    G.circle(c, 23, 10, 10, '#f4f0e6');
    G.circle(c, 13, 8, 5, '#f4f0e6'); G.circle(c, 33, 8, 5, '#f4f0e6');
    G.ring(c, 13, 8, 3, '#c8c4b8'); G.ring(c, 33, 8, 3, '#c8c4b8');
    G.px(c, 17, 11, 12, 7, '#e8c8a8');
    G.px(c, 19, 13, 2, 2 - (f === 1 ? 1 : 0), '#0b0b10'); G.px(c, 25, 13, 2, 2 - (f === 1 ? 1 : 0), '#0b0b10');
    G.px(c, 20, 16, 6, 1, '#7a2a1a');
    G.line(c, 12, 21, 3, 34 + f, '#e8c8a8', 3);
    G.line(c, 33, 21, 42, 32 - f, '#e8c8a8', 3);
    G.circle(c, 42, 33 - f, 3, '#f4f0e6');
  }));
  // 철거반장 : 안전모 + 쇠지렛대 팔
  SPR.boss.demolisher = [0, 1, 2].map((f) => G.sprite(42, 54, (c) => {
    G.px(c, 13, 16, 16, 24, '#e8a030'); G.px(c, 15, 16, 12, 24, '#3a3a40');
    G.line(c, 16, 22, 25, 31, '#d8201a', 2); G.line(c, 25, 22, 16, 31, '#d8201a', 2);
    G.px(c, 14, 40, 5, 13, '#2a2a30'); G.px(c, 23, 40, 5, 13, '#2a2a30');
    G.px(c, 15, 5, 12, 10, '#9a8a78'); G.px(c, 13, 2, 16, 5, '#f2c230'); G.px(c, 12, 6, 18, 2, '#f2c230');
    G.px(c, 17, 9, 3, 2, '#ff2a2a'); G.px(c, 23, 9, 3, 2, '#ff2a2a');
    G.line(c, 13, 18, 5, 30, '#9a8a78', 3);
    G.line(c, 28, 18, 36, 26, '#9a8a78', 3);
    G.line(c, 36, 26, 40, 6 + f * 3, '#5a5a6a', 3); G.px(c, 37, 4 + f * 3, 5, 3, '#5a5a6a');
    G.px(c, 2, 29, 6, 4, '#d8201a');
  }));
  // 청명 : 도장 머리 정장
  SPR.boss.suit = [0, 1, 2].map((f) => G.sprite(52, 66, (c) => {
    G.px(c, 14, 22, 24, 30, '#14141c');
    G.px(c, 23, 22, 6, 18, '#ece8e0');
    G.px(c, 25, 24, 2, 14, '#b8202e');
    G.px(c, 16, 52, 8, 13, '#0e0e14'); G.px(c, 28, 52, 8, 13, '#0e0e14');
    G.px(c, 21, 18, 10, 4, '#ece8e0');
    G.circle(c, 26, 10, 10, '#b8202e');
    G.ring(c, 26, 10, 10, '#e8505a');
    G.ring(c, 26, 10, 7, '#e8505a');
    G.px(c, 22, 6, 8, 1, '#ffd0d0'); G.px(c, 25, 4, 2, 12, '#ffd0d0'); G.px(c, 22, 10, 8, 1, '#ffd0d0'); G.px(c, 21, 14, 10, 1, '#ffd0d0');
    G.line(c, 14, 24, 4, 44 + f, '#14141c', 4);
    G.line(c, 37, 24, 46, 40 - f, '#14141c', 4);
    G.px(c, 42, 34 - f, 10, 13, '#c8b890');
    G.px(c, 43, 36 - f, 8, 1, '#5a5a6a'); G.px(c, 43, 39 - f, 6, 1, '#5a5a6a'); G.px(c, 43, 42 - f, 7, 1, '#5a5a6a');
    G.px(c, 45, 33 - f, 4, 2, '#8a8a9a');
  }));
  // 목격담 : 수많은 휴대폰 화면이 붙어 만든 키 큰 형체 — 화면마다 누군가 찍은 "그것"
  SPR.boss.witness = [0, 1, 2].map((f) => G.sprite(48, 66, (c) => {
    G.px(c, 16, 10, 16, 48, '#1a1826');
    const phones = [[12, 12], [26, 8], [18, 22], [30, 26], [10, 32], [22, 38], [32, 44], [14, 48], [24, 16], [8, 22], [34, 34]];
    phones.forEach(([x, y], i) => {
      const dy = ((i + f) % 3) - 1;
      G.px(c, x, y + dy, 7, 11, '#0b0b10'); G.px(c, x + 1, y + 1 + dy, 5, 8, i % 3 ? '#d8d0ff' : '#9ae8ff');
      G.px(c, x + 2, y + 3 + dy, 3, 3, '#1a1826'); G.px(c, x + 3, y + 4 + dy, 1, 1, '#ff2a3a');
    });
    G.circle(c, 24, 6, 6, '#d8d0ff'); G.px(c, 20, 4, 3, 2, '#0b0b10'); G.px(c, 25, 4, 3, 2, '#0b0b10'); G.px(c, 21, 8, 6, 1, '#0b0b10');
    G.px(c, 17, 58, 5, 8, '#1a1826'); G.px(c, 27, 58, 5, 8, '#1a1826');
    G.line(c, 15, 16, 3, 36 + f, '#1a1826', 3); G.line(c, 33, 16, 45, 34 - f, '#1a1826', 3);
    G.px(c, 0, 34 + f, 6, 8, '#9ae8ff'); G.px(c, 42, 32 - f, 6, 8, '#9ae8ff');
  }));
  // 무명 : 이름 칸이 지워진 사원증 수백 장이 엉겨 붙은 형체
  SPR.boss.nameless = [0, 1, 2].map((f) => G.sprite(48, 64, (c) => {
    G.px(c, 14, 14, 20, 40, '#2a2630');
    G.px(c, 12, 22, 24, 22, '#3a3440');
    const cards = [[10, 16], [24, 12], [16, 26], [28, 30], [8, 36], [20, 40], [30, 44], [12, 48], [22, 20], [6, 26]];
    cards.forEach(([x, y], i) => {
      const dy = ((i + f) % 3) - 1;
      G.px(c, x, y + dy, 9, 7, '#e8e0c8'); G.px(c, x + 1, y + 1 + dy, 3, 3, '#8a8478');
      G.px(c, x + 5, y + 1 + dy, 3, 1, '#2a2630'); G.px(c, x + 5, y + 4 + dy, 3, 1, '#b8202e');
    });
    G.circle(c, 24, 8, 7, '#e8e0c8');
    G.px(c, 20, 6, 8, 2, '#0b0b10'); G.px(c, 21, 11, 6, 1, '#0b0b10');
    G.px(c, 16, 54, 6, 10, '#1a1820'); G.px(c, 27, 54, 6, 10, '#1a1820');
    G.line(c, 13, 20, 3, 40 + f, '#2a2630', 3); G.line(c, 35, 20, 45, 38 - f, '#2a2630', 3);
    G.px(c, 1, 40 + f, 6, 5, '#e8e0c8'); G.px(c, 42, 36 - f, 6, 5, '#e8e0c8');
  }));
}

// ── 초상화 (대화창) ──
function buildPortraits() {
  const G = Gfx;
  const face = (c, P, o) => {
    G.px(c, 6, 26, 22, 8, o.body || P.shirt);
    if (o.vest) { G.px(c, 9, 26, 16, 8, P.vest); G.px(c, 9, 30, 16, 1, P.strip); }
    if (o.collar) { G.px(c, 14, 26, 6, 3, '#ece8e0'); G.px(c, 16, 27, 2, 7, o.collar); }
    G.px(c, 13, 23, 8, 3, P.skinShade);
    G.px(c, 9, 7, 16, 17, P.skin);
    G.px(c, 8, 12, 1, 4, P.skinShade); G.px(c, 25, 12, 1, 4, P.skinShade);
    // 머리
    G.px(c, 8, 3, 18, 6, P.hair);
    G.px(c, 7, 6, 3, o.long ? 18 : 8, P.hair);
    G.px(c, 24, 6, 3, o.long ? 18 : 8, P.hair);
    if (o.bangs) G.px(c, 10, 8, 14, 3, P.hair);
    if (o.cap) { G.px(c, 7, 2, 20, 6, '#2b3d73'); G.px(c, 7, 8, 24, 2, '#1c2850'); G.px(c, 15, 3, 3, 2, '#f2c230'); }
    // 눈
    const ey = 14;
    if (o.tired) { G.px(c, 11, ey, 4, 1, '#14101c'); G.px(c, 19, ey, 4, 1, '#14101c'); G.px(c, 11, ey + 2, 4, 1, P.skinShade); G.px(c, 19, ey + 2, 4, 1, P.skinShade); }
    else { G.px(c, 12, ey, 2, 3, '#14101c'); G.px(c, 20, ey, 2, 3, '#14101c'); G.px(c, 12, ey, 1, 1, '#ffffff'); G.px(c, 20, ey, 1, 1, '#ffffff'); }
    if (o.glasses) { G.ring(c, 13, ey + 1, 3, '#c8d0e0'); G.ring(c, 21, ey + 1, 3, '#c8d0e0'); G.px(c, 16, ey + 1, 2, 1, '#c8d0e0'); }
    G.px(c, 16, 18, 2, 1, P.skinShade);
    G.px(c, 15, 21, 4, 1, o.smile ? '#a84a4a' : '#b87060');
    if (o.smile) { G.px(c, 14, 20, 1, 1, '#a84a4a'); G.px(c, 19, 20, 1, 1, '#a84a4a'); }
    if (o.ear) { G.px(c, 7, 17, 1, 2, '#e8e8f0'); }
  };
  SPR.face = {
    me: G.sprite(34, 34, (c) => face(c, PAL.player, { vest: true, cap: true })),
    seo: G.sprite(34, 34, (c) => face(c, PAL.seo, { long: true, glasses: true, bangs: true, collar: '#7a1e2e' })),
    min: G.sprite(34, 34, (c) => face(c, PAL.min, { vest: true, bangs: true, ear: true, smile: true })),
    noeul: G.sprite(34, 34, (c) => face(c, PAL.noeul, { vest: true, long: true, tired: true })),
    unknown: G.sprite(34, 34, (c) => {
      const r = new RNG(5);
      for (let y = 2; y < 33; y++) for (let x = 3; x < 31; x++) {
        if (Math.hypot(x - 17, (y - 14) * 0.9) < 11 || (y > 25 && Math.abs(x - 17) < 12)) {
          c.fillStyle = r.next() < 0.5 ? '#2a2a34' : r.next() < 0.5 ? '#5a5a6a' : '#9a9aaa';
          c.fillRect(x, y, 1, 1);
        }
      }
      G.px(c, 12, 13, 3, 2, '#ff3a5a'); G.px(c, 20, 13, 3, 2, '#ff3a5a');
    }),
    ryu: G.sprite(34, 34, (c) => face(c, { hair: '#6a6a74', skin: '#e2b896', skinShade: '#bf9474', shirt: '#30323e' }, { glasses: true, collar: '#3a3a48' })),
    k: G.sprite(34, 34, (c) => { face(c, { hair: '#2a2a30', skin: '#eac09a', skinShade: '#c99a78', shirt: '#c84a4a' }, { bangs: true, smile: true }); G.px(c, 7, 2, 20, 5, '#3a3a48'); G.px(c, 5, 12, 3, 7, '#1a1a24'); G.px(c, 26, 12, 3, 7, '#1a1a24'); G.px(c, 6, 6, 1, 7, '#1a1a24'); G.px(c, 27, 6, 1, 7, '#1a1a24'); }),
    landlord: G.sprite(34, 34, (c) => face(c, { hair: '#8a8a8a', skin: '#e8b890', skinShade: '#c09070', shirt: '#7a5a8a' }, { tired: true, smile: false })),
    enforcer: G.sprite(34, 34, (c) => { face(c, { hair: '#14141a', skin: '#d8c0b0', skinShade: '#b8a090', shirt: '#14141a' }, { collar: '#2a2a30', glasses: true }); G.px(c, 9, 14, 16, 3, '#0b0b10'); }),
    guard: G.sprite(34, 34, (c) => { face(c, { hair: '#5a5a5a', skin: '#d8a880', skinShade: '#b88860', shirt: '#4a5a4a' }, { collar: '#2a3a2a', tired: true }); G.px(c, 7, 2, 20, 4, '#2a3a2a'); G.px(c, 6, 5, 22, 2, '#1a2a1a'); G.px(c, 15, 3, 4, 2, '#f2c230'); }),
  };
}

// ── 아이콘 (아이템/아티팩트) 14x14 ──
const ICON_DRAW = {
  drink(c, G) { G.px(c, 4, 2, 6, 10, '#3ad0a0'); G.px(c, 4, 4, 6, 3, '#1a1a24'); G.px(c, 5, 5, 2, 1, '#f2c230'); G.px(c, 5, 1, 4, 1, '#c8ccd8'); },
  candy(c, G) { G.circle(c, 7, 7, 3, '#e8f8f0'); G.px(c, 6, 5, 2, 4, '#5ad0a0'); G.px(c, 1, 6, 3, 3, '#a8e8d0'); G.px(c, 10, 6, 3, 3, '#a8e8d0'); },
  salt(c, G) { G.px(c, 3, 3, 8, 9, '#e8e4dc'); G.px(c, 3, 3, 8, 2, '#5a7dff'); G.px(c, 5, 7, 4, 2, '#9aa8c8'); },
  charm(c, G) { G.px(c, 4, 1, 6, 12, '#f2d040'); G.px(c, 5, 3, 4, 1, '#c41e3a'); G.line(c, 7, 4, 7, 10, '#c41e3a'); G.px(c, 5, 7, 4, 1, '#c41e3a'); },
  foil(c, G) { G.px(c, 3, 2, 8, 10, '#c8ccd8'); G.px(c, 4, 3, 2, 3, '#f4f6fa'); G.px(c, 7, 6, 3, 2, '#9aa0b0'); G.px(c, 5, 9, 4, 1, '#9aa0b0'); G.px(c, 2, 5, 1, 3, '#c8ccd8'); G.px(c, 11, 4, 1, 4, '#c8ccd8'); },
  coffee(c, G) { G.px(c, 4, 3, 6, 9, '#8a4a2a'); G.px(c, 4, 5, 6, 3, '#f2d040'); G.px(c, 5, 2, 4, 1, '#c8ccd8'); G.px(c, 3, 0, 1, 2, '#e8e8e8'); G.px(c, 6, 0, 1, 1, '#e8e8e8'); G.px(c, 9, 1, 1, 2, '#e8e8e8'); },
  gimbap(c, G) { G.line(c, 2, 11, 7, 2, '#1a2a1a', 2); G.line(c, 7, 2, 12, 11, '#1a2a1a', 2); G.px(c, 3, 10, 9, 2, '#1a2a1a'); G.px(c, 6, 6, 3, 4, '#f4f0e6'); G.px(c, 7, 7, 1, 2, '#e8603a'); },
  receipt(c, G) { G.px(c, 4, 1, 6, 12, '#f0ece0'); for (let i = 0; i < 5; i++) G.px(c, 5, 3 + i * 2, 4 - (i % 2), 1, '#7a7a8a'); G.px(c, 4, 12, 1, 1, '#000'); G.px(c, 6, 12, 1, 1, '#000'); G.px(c, 8, 12, 1, 1, '#000'); },
  button(c, G) { G.px(c, 2, 2, 10, 10, '#9a9ca8'); G.circle(c, 7, 7, 3, '#f2c230'); G.px(c, 5, 6, 1, 3, '#3a2a10'); G.px(c, 7, 6, 1, 3, '#3a2a10'); G.px(c, 8, 8, 1, 1, '#3a2a10'); },
  unread(c, G) { G.circle(c, 7, 6, 5, '#e5383b'); G.px(c, 3, 10, 3, 2, '#e5383b'); G.px(c, 7, 3, 1, 6, '#fff'); G.px(c, 6, 4, 1, 1, '#fff'); G.px(c, 6, 8, 3, 1, '#fff'); },
  thumb(c, G) { G.px(c, 1, 2, 12, 9, '#f2c230'); G.px(c, 4, 4, 1, 2, '#000'); G.px(c, 9, 4, 1, 2, '#000'); G.px(c, 3, 7, 8, 1, '#000'); G.px(c, 2, 6, 1, 1, '#000'); G.px(c, 11, 6, 1, 1, '#000'); G.line(c, 9, 2, 13, 11, '#3a3a48'); },
  nail(c, G) { G.px(c, 4, 2, 6, 2, '#a8acb8'); G.px(c, 6, 4, 2, 8, '#8a8e9a'); G.px(c, 6, 12, 1, 1, '#6a6e7a'); G.px(c, 8, 6, 1, 3, '#7a2a1a'); },
  ticket(c, G) { G.px(c, 1, 4, 12, 7, '#d8d8e8'); G.px(c, 1, 4, 3, 7, '#3a3a48'); G.px(c, 5, 6, 6, 1, '#5a5a6a'); G.px(c, 5, 8, 4, 1, '#c41e3a'); },
  nametag(c, G) { G.px(c, 2, 3, 10, 8, '#f4f0e6'); G.px(c, 2, 3, 10, 2, '#2b3d73'); G.px(c, 4, 7, 6, 1, '#3a3a48'); G.px(c, 6, 1, 2, 2, '#a8acb8'); },
  umbrella(c, G) { G.px(c, 2, 3, 10, 3, '#5a7dff'); G.px(c, 3, 2, 8, 1, '#5a7dff'); G.px(c, 7, 6, 1, 6, '#3a3a48'); G.px(c, 5, 11, 2, 1, '#3a3a48'); G.px(c, 3, 8, 1, 2, '#9ad8ff'); G.px(c, 10, 9, 1, 2, '#9ad8ff'); },
  mirror(c, G) { G.line(c, 2, 11, 7, 1, '#c8e8ff', 2); G.line(c, 7, 1, 12, 9, '#a8c8e8', 2); G.line(c, 2, 11, 12, 9, '#88a8c8', 2); G.px(c, 6, 6, 2, 2, '#ffffff'); },
  tube(c, G) { G.px(c, 1, 5, 12, 4, '#f4f8ff'); G.px(c, 0, 6, 1, 2, '#8a8e9a'); G.px(c, 13, 6, 1, 2, '#8a8e9a'); G.px(c, 2, 6, 10, 1, '#ffffff'); },
  shadow(c, G) { G.circle(c, 7, 4, 2, '#1b1226'); G.px(c, 4, 7, 6, 6, '#1b1226'); G.px(c, 6, 4, 1, 1, '#fff'); G.px(c, 8, 4, 1, 1, '#fff'); },
  key(c, G) { G.ring(c, 4, 5, 2, '#c8a040'); G.px(c, 6, 5, 7, 1, '#c8a040'); G.px(c, 10, 6, 1, 2, '#c8a040'); G.px(c, 12, 6, 1, 3, '#c8a040'); },
  cassette(c, G) { G.px(c, 1, 3, 12, 8, '#3a3a48'); G.px(c, 2, 4, 10, 3, '#e8e4dc'); G.circle(c, 4, 8, 1, '#f4f0e6'); G.circle(c, 10, 8, 1, '#f4f0e6'); },
  glove(c, G) { G.px(c, 3, 5, 7, 7, '#e8a8a0'); for (let i = 0; i < 4; i++) G.px(c, 3 + i * 2, 1 + (i % 2), 1, 4, '#e8a8a0'); G.px(c, 10, 6, 2, 2, '#e8a8a0'); G.px(c, 4, 11, 6, 2, '#a8686a'); },
  frame(c, G) { G.px(c, 1, 1, 12, 12, '#a8783a'); G.px(c, 3, 3, 8, 8, '#0b0b10'); G.px(c, 5, 6, 1, 1, '#ff3a5a'); G.px(c, 8, 6, 1, 1, '#ff3a5a'); },
  erased(c, G) { G.px(c, 2, 3, 10, 8, '#f4f0e6'); G.px(c, 2, 3, 10, 2, '#5a5a6a'); for (let i = 0; i < 6; i++) G.px(c, 3 + i, 6 + (i % 2), 1, 1, '#ff3a5a'); G.px(c, 3, 9, 8, 1, '#c8c4b4'); },
  mincard(c, G) { G.px(c, 2, 3, 10, 8, '#f4f0e6'); G.px(c, 2, 3, 10, 2, '#f2c230'); G.px(c, 3, 6, 3, 3, '#e8d8a0'); G.px(c, 7, 7, 4, 1, '#3a3a48'); },
  callbell(c, G) { G.px(c, 3, 8, 8, 4, '#c8ccd8'); G.circle(c, 7, 7, 3, '#e5383b'); G.px(c, 6, 5, 2, 1, '#ff9a9a'); G.px(c, 2, 12, 10, 1, '#8a8a9a'); },
  wristband(c, G) { G.ring(c, 7, 7, 5, '#e8f0ec'); G.ring(c, 7, 7, 4, '#e8f0ec'); G.px(c, 4, 2, 6, 3, '#f4f8f4'); G.px(c, 5, 3, 4, 1, '#3a3a48'); },
  thermo(c, G) { G.line(c, 3, 11, 10, 2, '#e8f0f8', 2); G.px(c, 2, 10, 3, 3, '#3a6ad8'); G.px(c, 7, 5, 2, 1, '#0b0b10'); G.px(c, 9, 2, 2, 2, '#c8ccd8'); },
  towel(c, G) { G.circle(c, 7, 7, 4, '#f4f0e6'); G.circle(c, 3, 5, 2, '#f4f0e6'); G.circle(c, 11, 5, 2, '#f4f0e6'); G.ring(c, 3, 5, 1, '#c8c4b8'); G.ring(c, 11, 5, 1, '#c8c4b8'); G.px(c, 5, 8, 4, 3, '#e8c8a8'); },
  egg(c, G) { G.circle(c, 7, 7, 4, '#8a5a3a'); G.px(c, 5, 4, 3, 2, '#b88a5a'); G.px(c, 9, 7, 1, 1, '#5a3a2a'); G.px(c, 4, 12, 7, 1, '#d8b48a'); },
  lockertag(c, G) { G.px(c, 3, 2, 8, 10, '#e8803a'); G.circle(c, 7, 4, 1, '#3a1a0a'); G.px(c, 5, 7, 4, 3, '#f4f0e6'); G.px(c, 6, 8, 2, 1, '#0b0b10'); },
  xspray(c, G) { G.px(c, 4, 4, 6, 9, '#c8ccd8'); G.px(c, 4, 6, 6, 4, '#d8201a'); G.px(c, 5, 2, 4, 2, '#5a5a6a'); G.px(c, 9, 1, 3, 1, '#d8201a'); },
  notice(c, G) { G.px(c, 1, 2, 12, 10, '#f2e6c0'); G.px(c, 2, 3, 10, 2, '#d8201a'); G.px(c, 3, 7, 8, 1, '#5a5a6a'); G.px(c, 3, 9, 6, 1, '#5a5a6a'); },
  doorplate(c, G) { G.px(c, 1, 4, 12, 6, '#6a4a2a'); G.px(c, 2, 5, 10, 4, '#d8c8a0'); G.px(c, 4, 6, 6, 1, '#3a3a48'); G.line(c, 9, 4, 12, 10, '#2a1a10'); },
  rulebook(c, G) { G.px(c, 3, 1, 9, 12, '#ece4c8'); for (let i = 0; i < 5; i++) G.px(c, 4, 3 + i * 2, 6 - (i % 2), 1, '#5a5a6a'); G.line(c, 4, 12, 10, 10, '#c41e3a'); G.px(c, 3, 1, 9, 1, '#a8885a'); },
  redknob(c, G) { G.circle(c, 6, 6, 4, '#c41e3a'); G.px(c, 5, 5, 2, 2, '#ff8a8a'); G.px(c, 9, 6, 4, 2, '#8a8a9a'); G.px(c, 12, 5, 1, 4, '#6a6a7a'); },
  silentrec(c, G) { G.px(c, 2, 3, 10, 8, '#2a2a34'); G.px(c, 3, 4, 8, 3, '#c8c4b4'); G.circle(c, 4, 9, 1, '#e5383b'); G.px(c, 8, 8, 3, 2, '#5a5a6a'); },
  whistle(c, G) { G.px(c, 2, 5, 9, 5, '#c8ccd8'); G.circle(c, 9, 8, 3, '#c8ccd8'); G.px(c, 3, 6, 6, 1, '#ffffff'); G.px(c, 0, 6, 2, 2, '#8a8a9a'); G.line(c, 1, 6, 6, 1, '#d8281e', 1); },
  keycard(c, G) { G.px(c, 2, 2, 10, 8, '#e8ecf4'); G.px(c, 2, 2, 10, 2, '#3a5aa8'); G.px(c, 4, 6, 3, 3, '#8a8e9a'); G.px(c, 8, 6, 3, 1, '#3a3e4a'); G.px(c, 6, 0, 2, 3, '#62d6e8'); },
  stapler(c, G) { G.px(c, 1, 7, 12, 4, '#2a2a30'); G.px(c, 1, 5, 11, 2, '#c8281e'); G.px(c, 10, 9, 3, 2, '#8a8a9a'); G.px(c, 4, 11, 2, 1, '#a8121e'); },
  mug(c, G) { G.px(c, 2, 3, 8, 9, '#f4f0e6'); G.px(c, 10, 5, 2, 5, '#f4f0e6'); G.px(c, 3, 4, 6, 1, '#5a3a1a'); G.px(c, 3, 7, 6, 2, '#3a5aa8'); G.px(c, 4, 0, 1, 2, '#c8c8d0'); G.px(c, 7, 1, 1, 2, '#c8c8d0'); },
  valve(c, G) { G.ring(c, 7, 7, 5, '#a8121e'); G.px(c, 2, 6, 11, 2, '#a8121e'); G.px(c, 6, 2, 2, 11, '#a8121e'); G.px(c, 6, 6, 2, 2, '#6a6a60'); },
  fuse(c, G) { G.px(c, 3, 5, 8, 4, '#d8d4c8'); G.px(c, 1, 6, 2, 2, '#c8a04a'); G.px(c, 11, 6, 2, 2, '#c8a04a'); G.px(c, 5, 6, 4, 2, '#2a2a26'); G.px(c, 6, 4, 1, 1, '#ff7a2a'); },
  earplug(c, G) { G.circle(c, 7, 7, 4, '#ff9a3a'); G.px(c, 6, 3, 2, 2, '#ffd27a'); G.px(c, 9, 9, 3, 3, '#e8703a'); },
  idcard(c, G) { G.px(c, 2, 1, 10, 12, '#ece8e0'); G.circle(c, 7, 5, 2, '#b8202e'); G.px(c, 4, 9, 6, 1, '#3a3a48'); G.px(c, 4, 11, 4, 1, '#3a3a48'); },
  doc(c, G) { G.px(c, 3, 1, 8, 12, '#ece8dc'); for (let i = 0; i < 4; i++) G.px(c, 4, 3 + i * 2, 6 - (i % 2) * 2, 1, '#6a6a7a'); G.px(c, 8, 10, 2, 2, '#c41e3a'); },
  cash(c, G) { G.px(c, 1, 3, 12, 8, '#e8e0c8'); G.px(c, 1, 3, 12, 2, '#c8b890'); G.px(c, 5, 6, 4, 3, '#6aa86a'); },
  box(c, G) { G.px(c, 2, 4, 10, 8, '#c89a5a'); G.px(c, 2, 4, 10, 2, '#a87a3a'); G.px(c, 6, 4, 2, 8, '#e8d8a0'); },
};
function buildIcons() {
  SPR.icon = {};
  for (const k in ICON_DRAW) SPR.icon[k] = Gfx.sprite(14, 14, (c) => ICON_DRAW[k](c, Gfx));
}

function buildAllSprites() {
  buildEnemySprites();
  buildBossSprites();
  buildPortraits();
  buildIcons();
}
