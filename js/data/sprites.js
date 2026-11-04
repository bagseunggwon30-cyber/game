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
  // 팔 (소매 + 손)
  G.line(c, 7, 10 + b, pose.h[0], pose.h[1] + (pose === POSES.idle1 ? 0 : 0), P.shirt, 2);
  G.px(c, pose.h[0], pose.h[1] + 1, 2, 1, P.skin);
}

function buildHumanSet(P, o = {}, outlineColor = COL.ink) {
  const R = POSE_ORDER.map((k) => Gfx.sprite(16, 24, (c) => drawHuman(c, POSES[k], P, o), { outlineColor }));
  return { R, L: R.map((f) => Gfx.flipH(f)) };
}

// 무기 그리기 (런타임). hx,hy 손 위치(월드), ang 라디안, face 방향
function drawWeapon(ctx, kind, hx, hy, ang, face) {
  const G = Gfx;
  const cos = Math.cos(ang) * face, sin = Math.sin(ang);
  const L = { mop: 15, bat: 12, baton: 11, spray: 0 }[kind] || 12;
  if (kind === 'spray') {
    G.px(ctx, hx - 1, hy - 3, 3, 5, '#d8e4ee');
    G.px(ctx, hx - 1, hy - 4, 3, 1, '#3aa0d8');
    return;
  }
  const back = kind === 'mop' ? 4 : 2;
  const x0 = hx - cos * back, y0 = hy - sin * back;
  const x1 = hx + cos * L, y1 = hy + sin * L;
  const col = { mop: '#b48a52', bat: '#c8ccd8', baton: '#2a2a36' }[kind];
  G.line(ctx, x0, y0, x1, y1, '#0b0b10', 3);
  G.line(ctx, x0, y0, x1, y1, col, 1);
  if (kind === 'mop') {
    G.px(ctx, x1 - 2, y1 - 2, 5, 5, '#0b0b10');
    G.px(ctx, x1 - 1, y1 - 1, 3, 3, '#e4e0d4');
  } else if (kind === 'bat') {
    G.line(ctx, hx + cos * 6, hy + sin * 6, x1, y1, '#e8ecf4', 2);
  } else if (kind === 'baton') {
    G.px(ctx, x1 - 1, y1 - 1, 3, 3, Math.random() < 0.5 ? '#9ae8ff' : '#4ab8ff');
  }
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

  // 플레이어 / NPC
  SPR.player = buildHumanSet(PAL.player);
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
    landlord: G.sprite(34, 34, (c) => face(c, { hair: '#8a8a8a', skin: '#e8b890', skinShade: '#c09070', shirt: '#7a5a8a' }, { tired: true, smile: false })),
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
