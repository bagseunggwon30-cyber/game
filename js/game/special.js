'use strict';
// ───────────────────────── 특수 임무: 정전 복구 / 암흑 작업 / 배웅 / 추격 ─────────────────────────
// MissionScene에 섞어 넣는 메서드들. 일반 임무에서는 대부분 아무 일도 하지 않는다.
const BREAKER_NEED = { lights: 150, echo: 180 };
const ESCORT_DELAY = 26;      // 아이가 내 발자취를 몇 프레임 뒤에서 따라오는지

Object.assign(MissionScene.prototype, {
  initSpecial() {
    this.rings = []; this.lastNoise = null; this.clapCd = 0; this.beatT = 0;
    this.dark = this.obj === 'lights' ? 'lights' : this.obj === 'echo' ? 'echo' : null;
    const W = this.lvl.W, H = this.lvl.H;
    if (this.dark === 'echo') this.reveal = { front: new Uint8Array(W * H), back: new Uint8Array(W * H) };
    if (this.obj === 'lights') {
      this.lit = new Set();
      this.objState.switches = 0;
      this.objState.switchesTotal = this.interacts.filter((o) => o.type === 'switch').length;
    }
    if (this.obj === 'escort' && this.gen.child) {
      const c = this.gen.child;
      this.child = { x: c.x, y: c.y, w: 8, h: 18, layer: c.layer, home: Object.assign({}, c), following: false, fear: 0, scareT: 0, inv: 0, facing: -1, anim: 0, moving: false };
      this.trail = [];
    }
    if (this.obj === 'chase') {
      this.trail = [];
      this.pursuer = { i: 0, f: 0, t: -240, x: this.player.cx, y: this.player.y + this.player.h, pauseT: 0, anim: 0, roarT: 0 };
      this.objState.complete = true;   // 출구에 닿기만 하면 된다
    }
  },

  // ── 소리: 귀 기울이는 것이 듣고, 암흑 작업에서는 파동으로 보인다 ──
  emitSound(x, y, r, layer, kind) {
    this.lastNoise = { x, y, r, layer, t: this.time, kind };
    if (this.dark === 'echo') this.rings.push({ x, y, r: 2, max: r, layer, kind, col: kind === 'enemy' ? '#ff5a6a' : kind === 'beacon' ? '#f2d040' : kind === 'exit' ? '#6fd08c' : kind === 'clap' ? '#ffffff' : '#9ae8ff' });
  },
  onWallBump(x, y, dir) {
    if (this.dark !== 'echo') return;
    const p = this.player, R = this.reveal[p.layer];
    const tx = Math.floor((x + dir * 2) / TS), ty = Math.floor(y / TS);
    for (let yy = ty - 3; yy <= ty + 2; yy++) for (let xx = tx - 1; xx <= tx + 1; xx++) if (xx >= 0 && yy >= 0 && xx < this.lvl.W && yy < this.lvl.H) R[yy * this.lvl.W + xx] = 120;
    Input.rumble(0.25, 0.5, 90);
    if (!this.s.flags.hintBump) { this.s.flags.hintBump = true; this.showHint('벽에 부딪히면 진동으로 벽이 느껴진다. ↑로 손뼉을 치면 멀리까지 보인다 — 대신 소리를 쫓는 것이 온다.'); }
  },
  clap() {
    const p = this.player;
    if (this.clapCd > 0) return;
    this.clapCd = 45;
    this.run.claps = (this.run.claps || 0) + 1;
    Sound.play('clap');
    this.floatText(p.cx, p.y - 10, '짝!', '#ffffff');
    this.emitSound(p.cx, p.cy, 200, p.layer, 'clap');
  },

  // ── 매 프레임 ──
  updateSpecial() {
    const p = this.player;
    if (this.clapCd > 0) this.clapCd--;
    if (this.dark === 'echo') this.updateEcho();
    if (this.obj === 'lights') this.updateLights();
    this.updateBreaker();
    // 발자취: 매 프레임 기록 (서 있으면 같은 점이 쌓여 아이가 곁으로 다가온다)
    if (this.trail && !p.dead && !this.locked) this.trail.push({ x: p.cx, y: p.y + p.h, layer: p.layer });
    if (this.child) this.updateChild();
    if (this.pursuer) this.updatePursuer();
  },

  updateEcho() {
    const p = this.player, W = this.lvl.W, H = this.lvl.H;
    // 드러난 벽은 천천히 다시 어둠에 잠긴다
    if (this.time % 2 === 0) for (const L of ['front', 'back']) { const R = this.reveal[L]; for (let i = 0; i < R.length; i++) if (R[i]) R[i]--; }
    for (const ring of this.rings) {
      ring.r += ring.kind === 'enemy' ? 1.6 : 3.4;
      if (ring.kind === 'enemy') continue;
      const R = this.reveal[ring.layer];
      const n = Math.max(8, Math.ceil(Math.PI * 2 * ring.r / 9));
      for (let k = 0; k < n; k++) {
        const a = k / n * Math.PI * 2;
        const tx = Math.floor((ring.x + Math.cos(a) * ring.r) / TS), ty = Math.floor((ring.y + Math.sin(a) * ring.r) / TS);
        if (tx < 0 || ty < 0 || tx >= W || ty >= H) continue;
        const v = Math.round(110 * (1 - ring.r / ring.max * 0.5));
        if (R[ty * W + tx] < v) R[ty * W + tx] = v;
      }
      // 파동에 닿은 존재가 잠깐 보인다
      for (const e of this.enemies) if (!e.dead && e.layer === ring.layer && Math.abs(Math.hypot(e.cx - ring.x, e.cy - ring.y) - ring.r) < 8) e.revealT = 70;
    }
    this.rings = this.rings.filter((r) => r.r < r.max);
    // 존재들도 움직이며 소리를 낸다
    for (const e of this.enemies) {
      if (e.revealT > 0) e.revealT--;
      if (e.dead || Math.abs(e.cx - p.cx) > 320) continue;
      if ((e.t + (e.x | 0)) % 70 === 0 && (Math.abs(e.vx) > 0.2 || e.def.ai === 'float' || e.def.ai === 'drift')) { this.rings.push({ x: e.cx, y: e.cy, r: 2, max: 34, layer: e.layer, kind: 'enemy', col: '#ff5a6a' }); e.revealT = Math.max(e.revealT || 0, 30); }
    }
    // 차단기 / 출구의 신호음
    if (this.time % 140 === 0) for (const o of this.interacts) {
      if (o.type === 'breaker' && !o.done) this.emitSound(o.x + o.w / 2, o.y + o.h / 2, 80, p.layer, 'beacon');
      if (o.type === 'exit' && this.objState.complete) this.emitSound(o.x + o.w / 2, o.y + o.h / 2, 80, p.layer, 'exit');
    }
    // 가까운 존재 = 심장 박동 진동
    const near = this.enemies.some((e) => !e.dead && e.layer === p.layer && e.dmg > 0 && Math.hypot(e.cx - p.cx, e.cy - p.cy) < 70);
    if (near && --this.beatT <= 0) { this.beatT = 50; Input.rumble(0.55, 0.15, 110); Sound.play('heart'); }
  },

  // 정전 복구: 불 꺼진 방에서는 공포가 조금씩 차오른다
  updateLights() {
    const p = this.player;
    if (this.objState.power || this.locked) return;
    if (!this.lit.has(this.roomKey(p.cx, p.cy)) && this.time % 6 === 0) this.addFear(0.4);
  },
  roomKey(x, y) { return Math.floor(x / (RW * TS)) + ',' + Math.floor(y / (RH * TS)); },

  // ── 전등 스위치 ──
  flipSwitch(o) {
    if (o.done) return;
    o.done = true;
    const key = o.cell.join(',');
    this.lit.add(key);
    this.objState.switches++;
    Sound.play('switch');
    Gfx.shake(2, 8);
    const rx0 = o.cell[0] * RW * TS, ry0 = o.cell[1] * RH * TS;
    // 빛에 닿은 존재는 타들어 간다
    for (const e of this.enemies) if (!e.dead && e.cx > rx0 && e.cx < rx0 + RW * TS && e.cy > ry0 && e.cy < ry0 + RH * TS) { e.hurt(18, sign(e.cx - this.player.cx) || 1, 60); this.floatText(e.cx, e.y - 12, '빛에 탄다', '#f2d040'); }
    this.addHope(8, '불이 켜졌다');
    // 어둠이 반응한다: 아직 꺼진 방에 무언가 늘어난다
    const dark = this.gen.map.rooms.filter((r) => !this.lit.has(r.gx + ',' + r.gy) && r.role !== 'start');
    if (dark.length) {
      const r = pickR(dark);
      for (let i = 0; i < 1 + Math.floor(this.diff / 2); i++) {
        const t = pickR(this.th.enemies), def = ENEMIES[t];
        const ex = (r.gx * RW + rndi(4, RW - 5)) * TS, ey = (r.gy * RH + RH - 1) * TS - def.h - 2;
        this.spawnEnemy(t, ex, def.ai === 'float' || def.ai === 'swarm' ? ey - 30 : ey, def.layer);
      }
    }
    if (this.objState.switches >= this.objState.switchesTotal) this.toast('모든 스위치를 켰다! 분전반을 올리자 →', '#f2d040');
    else this.toast(`불이 켜졌다 ${this.objState.switches}/${this.objState.switchesTotal} — 어딘가에서 무언가 움직인다`, '#f2d040');
  },

  // ── 차단기·분전반: ↑를 누르고 있어야 올라간다 ──
  pressBreaker(o) {
    if (o.done) return;
    if (this.obj === 'lights' && this.objState.switches < this.objState.switchesTotal) { Sound.play('deny'); this.toast(`아직 꺼진 방이 있다 (스위치 ${this.objState.switches}/${this.objState.switchesTotal})`, '#ff8a8a'); return; }
    if (!o.hold) { o.hold = true; o.prog = o.prog || 0; this.toast('↑를 누르고 있으면 올라간다. 소리가 크다 — 조심', '#f2d040'); }
  },
  updateBreaker() {
    const p = this.player;
    for (const o of this.interacts) {
      if (o.type !== 'breaker' || o.done || !o.hold) continue;
      const need = BREAKER_NEED[this.obj] || 160;
      const inRange = Math.abs(p.cx - (o.x + o.w / 2)) < 30 && Math.abs(p.cy - (o.y + o.h / 2)) < 40;
      if (inRange && Input.down('up') && !this.locked) {
        o.prog++;
        if (o.prog % 45 === 0) { Sound.play('clank'); this.emitSound(o.x + o.w / 2, o.y + o.h / 2, 160, p.layer, 'clank'); }
        if (this.obj === 'lights' && o.prog % 75 === 0) {
          const t = pickR(this.th.enemies), def = ENEMIES[t], side = Math.random() < 0.5 ? -1 : 1;
          this.spawnEnemy(t, o.x + side * rnd(100, 150), def.ai === 'float' || def.ai === 'swarm' ? o.y : o.y + o.h - def.h - 2, def.layer);
        }
      } else o.prog = Math.max(0, o.prog - 0.5);
      if (o.prog >= need) {
        o.done = true; o.hold = false;
        this.objState.power = true;
        this.dark = null;
        if (this.lit) for (const r of this.gen.map.rooms) this.lit.add(r.gx + ',' + r.gy);
        Sound.play('switch');
        this.completeObjective(this.obj === 'lights' ? '전력 복구! 층 전체에 불이 들어왔다 — 퇴근 문으로 →' : '차단기를 올렸다! 불이 들어온다 — 퇴근 문으로 →');
      }
    }
  },

  // ── 배웅: 길 잃은 아이 ──
  takeChild() {
    const c = this.child;
    if (!c || c.following) return;
    c.following = true; c.scareT = 0;
    this.trail = [];
    Sound.play('anchor');
    this.locked = true;
    Game.push(new DialogModal(this.childLines || [['child', '...여기 너무 어두워요. 엄마가 여기서 기다리랬는데.'], ['me', '같이 나가자. 손 꼭 잡고 따라와.']], () => { this.locked = false; this.toast('아이가 따라온다 — 입구까지 데려가자', '#ffb8c8'); }));
  },
  updateChild() {
    const c = this.child, p = this.player;
    c.anim++;
    if (c.inv > 0) c.inv--;
    const px = c.x;
    if (c.following) {
      if (c.scareT > 0) { c.scareT--; if (c.scareT % 40 === 0) { this.floatText(c.x + 4, c.y - 6, '흑…', '#ffb8c8'); this.emitSound(c.x, c.y, 70, c.layer, 'cry'); } }
      else {
        const T = this.trail[Math.max(0, this.trail.length - 1 - ESCORT_DELAY)];
        if (T) {
          const tx = T.x - c.w / 2, ty = T.y - c.h;
          if (Math.abs(tx - c.x) + Math.abs(ty - c.y) > 80) { c.x = tx; c.y = ty; }
          else { c.x = lerp(c.x, tx, 0.35); c.y = lerp(c.y, ty, 0.35); }
          c.layer = T.layer;
        }
        c.fear = Math.max(0, c.fear - 0.04);
      }
      // 존재에게 닿으면 겁에 질린다
      if (c.inv <= 0) for (const e of this.enemies) {
        if (e.dead || e.dmg <= 0 || e.layer !== c.layer) continue;
        if (overlap({ x: c.x, y: c.y, w: c.w, h: c.h }, e)) {
          c.fear += 34; c.scareT = 110; c.inv = 70;
          Sound.play('hurt');
          this.floatText(c.x + 4, c.y - 8, '꺄악!', '#ff8ab0');
          if (c.fear >= 100) {
            c.following = false; c.fear = 40;
            c.x = c.home.x; c.y = c.home.y; c.layer = c.home.layer;
            const o = this.interacts.find((q) => q.type === 'child'); if (o) o.done = false;
            this.toast('아이가 겁에 질려 처음 있던 곳으로 도망쳤다…', '#ff8ab0');
          } else this.toast('아이가 겁에 질렸다! 존재를 떼어 놓자', '#ff8ab0');
          break;
        }
      }
    } else if (c.anim % 150 === 0 && Math.abs(c.x - p.cx) < 260) this.floatText(c.x + 4, c.y - 6, '흑흑…', '#ffb8c8');
    c.moving = Math.abs(c.x - px) > 0.3;
    if (c.moving) c.facing = c.x > px ? 1 : -1;
  },
  childNear() { const c = this.child, p = this.player; return c && c.following && c.scareT <= 0 && Math.hypot(c.x + 4 - p.cx, c.y + 9 - p.cy) < 70; },

  // ── 추격: 발자취를 그대로 따라오는 청소부 ──
  updatePursuer() {
    const P = this.pursuer, p = this.player, T = this.trail;
    P.anim++;
    if (this.locked || this.ending) return;
    if (P.t < 0) { P.t++; if (P.t === -60) { this.toast('뒤에서 무언가 깨어났다 — 달려!', '#ff6a4a'); Sound.play('boss'); Gfx.shake(4, 30); } return; }
    P.t++;
    if (P.pauseT > 0) { P.pauseT--; return; }
    const behind = T.length - 1 - P.i;
    let spd = 1.35 + 0.07 * this.diff + Math.min(0.5, P.t / 7200);
    if (behind > 260) spd *= 1.8;            // 너무 떨어지면 빨라진다
    else if (behind < 50) spd *= 0.85;
    let move = spd * (this.slowSkip ? 0 : 1);
    while (move > 0 && P.i < T.length - 1) {
      const a = T[P.i], b = T[P.i + 1];
      const L = Math.hypot(b.x - a.x, b.y - a.y);
      if (L > 48 || L < 0.001) { P.i++; P.f = 0; continue; }   // 순간이동(추락 복귀)은 그대로 따라간다
      const remain = L * (1 - P.f);
      if (move < remain) { P.f += move / L; move = 0; } else { move -= remain; P.i++; P.f = 0; }
    }
    const a = T[P.i], b = T[Math.min(T.length - 1, P.i + 1)];
    if (a) { P.x = lerp(a.x, b.x, P.f); P.y = lerp(a.y, b.y, P.f); }
    // 지나가는 길의 존재는 삼켜진다
    for (const e of this.enemies) if (!e.dead && Math.hypot(e.cx - P.x, e.cy - (P.y - 24)) < 26) { e.hurt(999, 1); }
    // 붙잡힘
    const d = Math.hypot(p.cx - P.x, p.cy - (P.y - 24));
    if (d < 24) {
      if (p.rollInv > 0) p.perfectDodge('attack');
      else if (p.hurt(18 + this.diff * 3, 12, P.x, 'attack')) {
        P.pauseT = 80;
        this.run.caught = (this.run.caught || 0) + 1;
        p.vx = (sign(p.cx - P.x) || 1) * 5; p.vy = -4.5;
        this.applyHitEffect('terror');
        this.floatText(p.cx, p.y - 14, '붙잡혔다!', '#ff6a4a');
      }
    }
    if (d < 150 && --P.roarT <= 0) { P.roarT = 70; Sound.play('heart'); Input.rumble(0.7, 0.3, 120); }
    this.pursuerDist = d;
  },

  // ── 그리기 ──
  drawSpecialWorld(ctx, cam, L) {
    const c = this.child;
    if (c && (c.layer === L || c.following)) {
      const set = SPR.child, fr = (c.facing > 0 ? set.R : set.L)[c.moving ? 2 + Math.floor(c.anim / 6) % 4 : Math.floor(c.anim / 30) % 2];
      ctx.globalAlpha = c.layer === L ? (c.inv > 0 && c.inv % 6 < 3 ? 0.5 : 1) : 0.3;
      ctx.drawImage(fr, Math.round(c.x - 2 - cam.x), Math.round(c.y - cam.y), 12, 18);
      ctx.globalAlpha = 1;
      if (c.following) { ctx.fillStyle = '#ffb8c8'; ctx.fillRect(Math.round(c.x + 3 - cam.x), Math.round(c.y - 4 - cam.y), 2, 2); }
    }
    const P = this.pursuer;
    if (P && P.t >= 0) {
      // 거대한 청소부: 걸레를 든 그림자 덩어리
      const x = Math.round(P.x - cam.x), y = Math.round(P.y - cam.y), t = P.anim;
      const G = Gfx;
      ctx.globalAlpha = L === 'back' ? 1 : 0.92;
      for (let i = 0; i < 7; i++) { const a = i / 7 * Math.PI * 2 + t * 0.03; G.circle(ctx, x + Math.cos(a) * 12, y - 26 + Math.sin(a) * 14, 11, '#0b0b10'); }
      G.circle(ctx, x, y - 30, 16, '#14101c');
      for (let i = 0; i < 5; i++) { const a = i * 1.3 + t * 0.05; G.line(ctx, x, y - 22, x + Math.cos(a) * 26, y - 10 + Math.sin(a) * 10, '#0b0b10', 3); }
      // 걸레
      const sw = Math.sin(t * 0.12) * 0.6;
      G.line(ctx, x + 6, y - 30, x + 22 + sw * 10, y - 2, '#5a3a1a', 2);
      G.px(ctx, x + 18 + sw * 10, y - 4, 10, 5, '#c8c4b4');
      // 눈
      for (const [ex, ey] of [[-6, -36], [4, -38], [-1, -28], [9, -30]]) { if ((t + ex * 7) % 90 < 84) { G.px(ctx, x + ex, y + ey, 3, 2, '#ff2a3a'); G.px(ctx, x + ex + 1, y + ey, 1, 1, '#ffd0d0'); } }
      ctx.globalAlpha = 1;
    }
  },

  drawSpecialDark(ctx, cam, L) {
    const p = this.player, t = Gfx.tctx;
    if (this.dark === 'lights') {
      t.globalCompositeOperation = 'source-over';
      t.clearRect(0, 0, VW, VH);
      t.fillStyle = L === 'back' ? 'rgba(2,2,6,0.95)' : 'rgba(2,2,8,0.9)';
      t.fillRect(0, 0, VW, VH);
      t.globalCompositeOperation = 'destination-out';
      const rw = RW * TS, rh = RH * TS;
      for (const k of this.lit) { const [gx, gy] = k.split(',').map(Number); t.fillStyle = '#000'; t.fillRect(gx * rw - cam.x, gy * rh - cam.y, rw, rh); }
      if (L === 'back') {
        t.globalCompositeOperation = 'source-over';
        t.fillStyle = 'rgba(4,0,2,0.78)';
        for (const k of this.lit) { const [gx, gy] = k.split(',').map(Number); t.fillRect(gx * rw - cam.x, gy * rh - cam.y, rw, rh); }
        t.globalCompositeOperation = 'destination-out';
      }
      const light = (x, y, r) => { const g = t.createRadialGradient(x, y, r * 0.2, x, y, r); g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(0.6, 'rgba(0,0,0,0.7)'); g.addColorStop(1, 'rgba(0,0,0,0)'); t.fillStyle = g; t.fillRect(x - r, y - r, r * 2, r * 2); };
      light(p.cx - cam.x, p.cy - cam.y, this.D.light * 0.55);
      for (const o of this.interacts) {
        if ((o.type === 'switch' || o.type === 'breaker' || o.type === 'exit') && !o.done) light(o.x + o.w / 2 - cam.x, o.y + o.h / 2 - cam.y, 14 + Math.sin(this.time * 0.08) * 3);
      }
      t.globalCompositeOperation = 'source-over';
      ctx.drawImage(Gfx.tmp, 0, 0);
      return;
    }
    // 암흑 작업: 완전한 어둠 + 소리로 드러난 윤곽만
    ctx.fillStyle = 'rgba(0,0,0,0.985)'; ctx.fillRect(0, 0, VW, VH);
    // 내 몸 주변만 아주 조금
    const g = ctx.createRadialGradient(p.cx - cam.x, p.cy - cam.y, 2, p.cx - cam.x, p.cy - cam.y, 22);
    g.addColorStop(0, 'rgba(160,170,200,0.22)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g; ctx.fillRect(p.cx - cam.x - 22, p.cy - cam.y - 22, 44, 44);
    const R = this.reveal[L], W = this.lvl.W, H = this.lvl.H;
    const x0 = Math.max(0, Math.floor(cam.x / TS)), x1 = Math.min(W - 1, Math.floor((cam.x + VW) / TS));
    const y0 = Math.max(0, Math.floor(cam.y / TS)), y1 = Math.min(H - 1, Math.floor((cam.y + VH) / TS));
    const back = L === 'back';
    for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) {
      const v = R[ty * W + tx];
      if (!v) continue;
      const tt = this.lvl.get(L, tx, ty);
      if (tt === T_EMPTY) continue;
      const a = Math.min(1, v / 80);
      ctx.globalAlpha = a;
      ctx.fillStyle = tt === T_SPIKE ? '#ff5a6a' : tt === T_PLAT ? '#f2d040' : back ? '#ff8ab0' : '#9ae8ff';
      const sx = tx * TS - cam.x, sy = ty * TS - cam.y;
      const empty = (dx, dy) => this.lvl.get(L, tx + dx, ty + dy) === T_EMPTY;
      if (tt === T_PLAT) { ctx.fillRect(sx, sy, TS, 1); continue; }
      if (empty(0, -1)) ctx.fillRect(sx, sy, TS, 1);
      if (empty(0, 1)) ctx.fillRect(sx, sy + TS - 1, TS, 1);
      if (empty(-1, 0)) ctx.fillRect(sx, sy, 1, TS);
      if (empty(1, 0)) ctx.fillRect(sx + TS - 1, sy, 1, TS);
    }
    ctx.globalAlpha = 1;
    // 파동
    for (const ring of this.rings) {
      if (ring.layer !== L) continue;
      const k = ring.r / ring.max;
      ctx.globalAlpha = (1 - k) * (ring.kind === 'enemy' ? 0.8 : 0.5);
      ctx.fillStyle = ring.col;
      const n = Math.max(10, Math.ceil(ring.r / 3));
      for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2; ctx.fillRect(Math.round(ring.x + Math.cos(a) * ring.r - cam.x), Math.round(ring.y + Math.sin(a) * ring.r - cam.y), 1, 1); }
    }
    ctx.globalAlpha = 1;
    // 파동에 닿아 드러난 존재
    for (const e of this.enemies) if (!e.dead && e.layer === L && e.revealT > 0) { ctx.globalAlpha = Math.min(1, e.revealT / 40) * 0.9; e.draw(ctx, cam, false); ctx.globalAlpha = 1; }
    // 상호작용 대상은 가까이 가거나 신호음이 닿았을 때만
    for (const o of this.interacts) {
      if (o.done && o.type !== 'exit') continue;
      const tx = Math.floor((o.x + o.w / 2) / TS), ty = Math.floor((o.y + o.h - 4) / TS);
      const v = Math.max(R[ty * W + tx] || 0, Math.hypot(o.x + o.w / 2 - p.cx, o.y + o.h / 2 - p.cy) < 50 ? 80 : 0);
      if (!v) continue;
      ctx.globalAlpha = Math.min(1, v / 60);
      this.drawInteract(ctx, cam, o);
      ctx.globalAlpha = 1;
    }
    // 나
    ctx.globalAlpha = 0.9; p.draw(ctx, cam); ctx.globalAlpha = 1;
  },

  drawSpecialHud(ctx) {
    const C = UI.C;
    if (this.child) {
      const c = this.child;
      const y = 32;
      Gfx.text(ctx, c.following ? (c.scareT > 0 ? '아이 — 겁에 질림' : '아이 — 따라오는 중') : '아이 — 길을 잃었다', VW / 2, y, '#ffb8c8', { small: true, align: 'center' });
      UI.bar(ctx, VW / 2 - 30, y + 12, 60, 3, c.fear / 100, '#ff8ab0');
    }
    if (this.pursuer && this.pursuer.t >= 0 && this.pursuerDist != null) {
      const d = this.pursuerDist, near = d < 150;
      Gfx.text(ctx, `청소부까지 ${Math.max(0, Math.round(d / 16))}m`, VW / 2, 32, near && this.time % 20 < 10 ? '#ff3a1a' : '#ff8a6a', { small: true, align: 'center', bold: near });
      if (near) { const a = (1 - d / 150) * 0.35; ctx.fillStyle = `rgba(255,40,20,${a})`; ctx.fillRect(0, 0, VW, 3); ctx.fillRect(0, VH - 3, VW, 3); ctx.fillRect(0, 0, 3, VH); ctx.fillRect(VW - 3, 0, 3, VH); }
    }
    // 차단기 게이지
    for (const o of this.interacts) if (o.type === 'breaker' && o.hold && !o.done && o.prog > 0) {
      const need = BREAKER_NEED[this.obj] || 160;
      Gfx.text(ctx, this.obj === 'lights' ? '분전반 가동 중' : '차단기 올리는 중', VW / 2, VH - 44, '#f2d040', { small: true, align: 'center' });
      UI.bar(ctx, VW / 2 - 50, VH - 32, 100, 4, o.prog / need, '#f2d040');
      break;
    }
  },

  objTextSpecial() {
    const o = this.objState;
    if (this.obj === 'lights') return o.complete ? '퇴근' : o.switches < o.switchesTotal ? `스위치 ${o.switches}/${o.switchesTotal}` : '분전반 가동';
    if (this.obj === 'echo') return o.complete ? '퇴근' : '차단기 올리기';
    if (this.obj === 'escort') return !this.child || !this.child.following ? '아이 찾기 (뒷면)' : '입구까지 데려가기';
    if (this.obj === 'chase') return '출구까지 달려라';
    return null;
  },
});
