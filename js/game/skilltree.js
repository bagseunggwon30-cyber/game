'use strict';
// ───────────────────────── 스킬트리 화면 "마음 지도" ─────────────────────────

// 노드 모양: 갈래마다 다른 도트 모양을 픽셀 판정으로 그린다
const NODE_SHAPES = {
  star(dx, dy, r) { // 공포: 가시 돋친 별
    const d = Math.hypot(dx, dy), a = Math.atan2(dy, dx);
    return d <= r * (0.42 + 0.58 * Math.pow(Math.abs(Math.cos(a * 4)), 4));
  },
  flame(dx, dy, r) { // 분노: 불꽃
    if (Math.hypot(dx, dy - r * 0.3) <= r * 0.62) return true;
    const t = (dy + r) / (r * 1.3);
    return dy < r * 0.3 && t > 0 && Math.abs(dx + Math.sin(dy * 0.6) * 1.2) <= t * r * 0.62;
  },
  hex(dx, dy, r) { // 망각: 속이 빈 육각형
    const q = Math.abs(dx), w = Math.abs(dy);
    const out = w <= r * 0.88 && q * 0.87 + w * 0.5 <= r * 0.92;
    const inn = w <= r * 0.4 && q * 0.87 + w * 0.5 <= r * 0.42;
    return out && !inn;
  },
  eye(dx, dy, r) { // 의심: 눈
    return Math.abs(dx) <= r && Math.abs(dy) <= r * 0.62 * (1 - (dx / r) * (dx / r)) + 0.5;
  },
  sun(dx, dy, r) { // 희망: 해
    const d = Math.hypot(dx, dy), a = Math.atan2(dy, dx);
    return d <= r * 0.58 || (d <= r && Math.abs(Math.cos(a * 4)) > 0.9);
  },
  core(dx, dy, r) { return Math.abs(dx) + Math.abs(dy) <= r; },
};

const NodeSprCache = {};
function nodeSprite(shape, r, fill, edge, extra) {
  const key = [shape, r, fill, edge, extra || ''].join(':');
  if (NodeSprCache[key]) return NodeSprCache[key];
  const size = r * 2 + 5, c0 = (size - 1) / 2;
  const cv = Gfx.sprite(size, size, (c) => {
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
      const dx = x - c0, dy = y - c0;
      if (NODE_SHAPES[shape](dx, dy, r)) {
        let col = fill;
        if (extra && dx > 0) col = extra; // 혼합 노드: 반반 색
        c.fillStyle = col; c.fillRect(x, y, 1, 1);
      }
    }
    // 하이라이트 / 눈동자
    if (shape === 'eye') { Gfx.circle(c, c0, c0, Math.max(1, Math.round(r * 0.28)), '#0b0b10'); c.fillStyle = '#ffffff'; c.fillRect(Math.round(c0) - 1, Math.round(c0) - 1, 1, 1); }
    else if (shape === 'sun') { c.fillStyle = 'rgba(255,255,255,0.6)'; c.fillRect(Math.round(c0) - 2, Math.round(c0) - 2, 2, 1); }
    else if (shape !== 'hex') { c.fillStyle = 'rgba(255,255,255,0.45)'; c.fillRect(Math.round(c0) - 1, Math.round(c0) - 2, 1, 1); }
  }, { outlineColor: edge });
  NodeSprCache[key] = cv;
  return cv;
}

class SkillTreeView {
  constructor(s, onClose) {
    this.s = s;
    this.onClose = onClose;
    this.sel = 'core';
    const firstAvail = SKILL_NODES.find((n) => skillAvailable(s, n.id));
    if (firstAvail) this.sel = firstAvail.id;
    const n = SKILL_BY_ID[this.sel];
    this.cam = { x: n.x, y: n.y };
    this.t = 0;
    this.blockInput = 6;
    this.flash = {};
    this.edges = [];
    for (const nd of SKILL_NODES) for (const r of nd.req) this.edges.push([r, nd.id]);
  }

  nodeState(id) {
    if (this.s.skills.includes(id)) return 'own';
    if (skillAvailable(this.s, id)) return 'avail';
    return 'lock';
  }

  move(dx, dy) {
    const cur = SKILL_BY_ID[this.sel];
    let best = null, bestScore = 1e9;
    for (const n of SKILL_NODES) {
      if (n.id === cur.id) continue;
      const vx = n.x - cur.x, vy = n.y - cur.y;
      const d = Math.hypot(vx, vy);
      const along = (vx * dx + vy * dy) / d;
      if (along < 0.35) continue;
      const score = d * (1 + 2.2 * (1 - along));
      if (score < bestScore) { bestScore = score; best = n; }
    }
    if (best) { this.sel = best.id; Sound.play('menu'); }
  }

  update() {
    this.t++;
    if (this.blockInput > 0) { this.blockInput--; return; }
    if (Input.pressed('left')) this.move(-1, 0);
    if (Input.pressed('right')) this.move(1, 0);
    if (Input.pressed('up')) this.move(0, -1);
    if (Input.pressed('down')) this.move(0, 1);
    const n = SKILL_BY_ID[this.sel];
    this.cam.x = lerp(this.cam.x, n.x, 0.18);
    this.cam.y = lerp(this.cam.y, n.y, 0.18);
    if (Input.pressed('confirm')) this.tryUnlock(n);
    else if (Input.pressed('cancel')) { Sound.play('cancel'); Game.pop(this); if (this.onClose) this.onClose(); }
  }

  tryUnlock(n) {
    const s = this.s;
    const st = this.nodeState(n.id);
    if (st !== 'avail') { Sound.play('deny'); return; }
    if ((s.sp || 0) < n.cost) { Sound.play('deny'); Game.toast(`마음 조각(SP)이 부족하다 (${s.sp}/${n.cost})`, '#ff8a8a'); return; }
    s.sp -= n.cost;
    s.skills.push(n.id);
    this.flash[n.id] = 30;
    Sound.play('levelup');
    Game.toast(`[${n.name}] 해금`, n.branch ? BRANCH_BY_ID[n.branch].col : COL.white);
    saveGame(s);
  }

  colorsOf(n) {
    if (!n.branch) return { col: '#f4f0e6', dark: '#3a3650', shape: 'core' };
    const b = BRANCH_BY_ID[n.branch];
    return { col: b.col, dark: b.dark, shape: n.kind === 'hybrid' ? 'core' : b.shape, col2: n.branch2 ? BRANCH_BY_ID[n.branch2].col : null, dark2: n.branch2 ? BRANCH_BY_ID[n.branch2].dark : null };
  }

  draw(ctx) {
    const s = this.s;
    // 배경
    ctx.fillStyle = '#08070e'; ctx.fillRect(0, 0, VW, VH);
    const ox = Math.round(VW / 2 - this.cam.x), oy = Math.round(VH / 2 - 18 - this.cam.y);
    const r0 = new RNG(31);
    for (let i = 0; i < 90; i++) {
      const x = (r0.int(-300, 300) + ox * 0.4) | 0, y = (r0.int(-260, 260) + oy * 0.4) | 0;
      ctx.fillStyle = r0.chance(0.2) ? '#3a3650' : '#1e1c2c';
      ctx.fillRect(((x % 600) + 600) % 600 - 100, ((y % 400) + 400) % 400 - 90, 1, 1);
    }
    // 갈래 이름 (바깥쪽)
    SKILL_BRANCHES.forEach((b, i) => {
      const a = (-90 + i * 72) * Math.PI / 180;
      const x = ox + Math.cos(a) * 184, y = oy + Math.sin(a) * 184;
      Gfx.text(ctx, b.name, x, y - 6, b.col, { align: 'center', bold: true });
    });
    // 연결선
    for (const [a, b] of this.edges) {
      const na = SKILL_BY_ID[a], nb = SKILL_BY_ID[b];
      const ownA = s.skills.includes(a), ownB = s.skills.includes(b);
      const br = nb.branch ? BRANCH_BY_ID[nb.branch] : null;
      let col = '#22202e';
      if (ownA && ownB) col = br ? br.col : '#f4f0e6';
      else if (ownA) col = br ? br.dark : '#3a3650';
      Gfx.line(ctx, ox + na.x, oy + na.y, ox + nb.x, oy + nb.y, col, ownA && ownB ? 2 : 1);
    }
    // 노드
    for (const n of SKILL_NODES) {
      const st = this.nodeState(n.id);
      const C = this.colorsOf(n);
      const r = n.kind === 'key' ? 9 : n.kind === 'core' ? 8 : n.kind === 'hybrid' ? 6 : 6;
      let spr;
      if (st === 'own') spr = nodeSprite(C.shape, r, C.col, '#0b0b10', C.col2);
      else if (st === 'avail') spr = nodeSprite(C.shape, r, C.dark, C.col, C.dark2);
      else spr = nodeSprite(C.shape, r, '#16141f', '#3a3650', C.dark2 ? '#16141f' : null);
      const x = ox + n.x - (spr.width - 1) / 2, y = oy + n.y - (spr.height - 1) / 2;
      if (st === 'avail' && this.t % 40 < 20) { ctx.globalAlpha = 0.25; Gfx.circle(ctx, ox + n.x, oy + n.y, r + 4, C.col); ctx.globalAlpha = 1; }
      if (st === 'own' && n.kind === 'key') { ctx.globalAlpha = 0.2 + Math.sin(this.t * 0.08) * 0.08; Gfx.circle(ctx, ox + n.x, oy + n.y, r + 6, C.col); ctx.globalAlpha = 1; }
      ctx.drawImage(spr, Math.round(x), Math.round(y));
      if (this.flash[n.id] > 0) { this.flash[n.id]--; ctx.globalAlpha = this.flash[n.id] / 30; Gfx.ring(ctx, ox + n.x, oy + n.y, r + 14 - this.flash[n.id] / 3, '#ffffff'); ctx.globalAlpha = 1; }
      if (st !== 'lock' && n.cost > 0 && st === 'avail') Gfx.text(ctx, String(n.cost), ox + n.x + r + 2, oy + n.y - r - 4, C.col, { small: true });
    }
    // 선택 커서
    const cn = SKILL_BY_ID[this.sel];
    const cr = (cn.kind === 'key' ? 9 : 7) + 4 + (this.t % 30 < 15 ? 0 : 1);
    const cx = ox + cn.x, cy = oy + cn.y;
    ctx.fillStyle = '#ffffff';
    for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      ctx.fillRect(Math.round(cx + sx * cr - (sx > 0 ? 3 : 0)), Math.round(cy + sy * cr), 4, 1);
      ctx.fillRect(Math.round(cx + sx * cr), Math.round(cy + sy * cr - (sy > 0 ? 3 : 0)), 1, 4);
    }
    // 상단 바
    Gfx.panel(ctx, 4, 4, 150, 30, { fill: 'rgba(10,9,16,0.9)', inner: false });
    Gfx.text(ctx, '마음 지도', 10, 7, COL.yellow, { bold: true });
    Gfx.text(ctx, `마음 조각 SP ${s.sp || 0}`, 10, 21, (s.sp || 0) > 0 ? COL.green : COL.dim, { small: true });
    Gfx.text(ctx, `해금 ${s.skills.length - 1}/${SKILL_NODES.length - 1}`, 148, 21, COL.dim, { small: true, align: 'right' });
    // 범례
    let lx = VW - 6;
    for (let i = SKILL_BRANCHES.length - 1; i >= 0; i--) {
      const b = SKILL_BRANCHES[i];
      const w = Gfx.measure(ctx, b.name, { small: true });
      lx -= w;
      Gfx.text(ctx, b.name, lx, 8, b.col, { small: true });
      const spr = nodeSprite(b.shape, 4, b.col, '#0b0b10');
      lx -= spr.width + 1;
      ctx.drawImage(spr, lx, 6);
      lx -= 6;
    }
    // 정보창
    const dx = 6, dh = 52, dy = VH - dh - 4, dw = VW - 12;
    const st = this.nodeState(cn.id);
    const C = this.colorsOf(cn);
    Gfx.panel(ctx, dx, dy, dw, dh, { edge: st === 'lock' ? '#5a566a' : C.col });
    const bname = cn.branch ? (cn.branch2 ? `${BRANCH_BY_ID[cn.branch].name}+${BRANCH_BY_ID[cn.branch2].name}` : BRANCH_BY_ID[cn.branch].name) : '중심';
    Gfx.text(ctx, cn.name, dx + 8, dy + 5, C.col, { bold: true });
    Gfx.text(ctx, `· ${bname}${cn.kind === 'key' ? ' 핵심' : cn.kind === 'hybrid' ? ' 혼합' : ''}`, dx + 12 + Gfx.measure(ctx, cn.name, { bold: true }), dy + 6, COL.dim, { small: true });
    const status = st === 'own' ? '해금됨' : st === 'avail' ? `해금 가능 · 비용 ${cn.cost} SP  (Z)` : '잠김 — 연결된 노드를 먼저 해금';
    Gfx.text(ctx, status, dx + dw - 8, dy + 6, st === 'own' ? COL.green : st === 'avail' ? ((s.sp || 0) >= cn.cost ? COL.yellow : '#ff8a8a') : COL.dark, { small: true, align: 'right' });
    Gfx.para(ctx, cn.desc, dx + 8, dy + 21, dw - 16, '#d8d4e8', { small: true, maxLines: 2 });
    if (!cn.branch) Gfx.para(ctx, '방향키로 노드 이동 · Z 해금 · X 닫기', dx + 8, dy + 37, dw - 16, COL.dim, { small: true });
  }
}
