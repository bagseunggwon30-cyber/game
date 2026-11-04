'use strict';
// ───────────────────────── 보스 (밈의 핵) ─────────────────────────
class Boss {
  constructor(key, arena, sc, diff) {
    const def = BOSSES[key];
    this.key = key; this.def = def; this.sc = sc; this.arena = arena;
    this.w = def.w; this.h = def.h;
    this.x = arena.x1 - 80; this.y = arena.floorY - this.h;
    if (def.flying) this.y = arena.floorY - 110;
    this.vx = 0; this.vy = 0;
    this.layer = 'back';
    this.maxHp = Math.round(def.hp * (1 + 0.3 * (diff - 1)));
    this.hp = this.maxHp;
    this.dmg = 12 + diff * 3;
    this.state = 'intro'; this.t = 110;
    this.pat = null; this.pt = 0; this.pd = {};
    this.lastPat = '';
    this.facing = -1;
    this.flash = 0; this.alpha = 1;
    this.dead = false; this.deadT = 0;
    this.anim = 0;
    this.onGround = false;
    this.hazards = [];   // 경고선/광선/열차
    this.spr = SPR.boss[key];
    this.sprL = this.spr.map((f) => Gfx.flipH(f));
  }
  get cx() { return this.x + this.w / 2; }
  get cy() { return this.y + this.h / 2; }
  hitbox() { return { x: this.x, y: this.y, w: this.w, h: this.h }; }
  get phase2() { return this.hp < this.maxHp * 0.5; }

  update() {
    const sc = this.sc, p = sc.player;
    this.anim++;
    if (this.flash > 0) this.flash--;
    if (this.dead) {
      this.deadT++;
      if (this.deadT % 4 === 0) {
        for (let i = 0; i < 6; i++) sc.particles.push({ x: this.cx + rnd(-this.w / 2, this.w / 2), y: this.cy + rnd(-this.h / 2, this.h / 2), vx: rnd(-2, 2), vy: rnd(-3, 1), life: 30, col: pickR([this.def.color, '#0b0b10', '#f4f0e6']), size: rndi(2, 4), g: 0.08 });
        Sound.play('hit');
      }
      if (this.deadT === 90) sc.onBossDefeated(this);
      return;
    }
    // 플레이어가 표면에 숨으면 보스가 안정을 되찾는다
    if (p.layer === 'front' && this.state !== 'intro') {
      this.hp = Math.min(this.maxHp, this.hp + this.maxHp * 0.00025);
      this.healing = true;
    } else this.healing = false;

    this.updateHazards();

    switch (this.state) {
      case 'intro':
        this.t--;
        if (this.t <= 0) { this.state = 'idle'; this.t = 50; }
        break;
      case 'idle': {
        this.t--;
        this.facing = p.cx < this.cx ? -1 : 1;
        const dx = p.cx - this.cx;
        if (this.def.flying) {
          this.vx = approach(this.vx, sign(dx) * 0.8, 0.05);
          this.vy = approach(this.vy, ((this.arena.floorY - 120) + Math.sin(this.anim * 0.03) * 16 - this.y) * 0.03, 0.1);
        } else {
          this.vx = Math.abs(dx) > 60 ? approach(this.vx, sign(dx) * 0.7, 0.05) : approach(this.vx, 0, 0.1);
        }
        if (this.t <= 0) this.choosePattern();
        break;
      }
      case 'pat':
        this.pt++;
        if (this.runPattern()) { this.state = 'idle'; this.t = this.phase2 ? 32 : 55; this.alpha = 1; }
        break;
    }
    // 물리
    if (this.def.flying) {
      this.x += this.vx; this.y += this.vy;
    } else {
      this.vy = Math.min(MAXFALL + 2, this.vy + GRAV);
      moveBody(this, sc.lvl, 'back');
    }
    this.x = clamp(this.x, this.arena.x0 + 2, this.arena.x1 - this.w - 2);
    this.y = clamp(this.y, (CEIL + 0.5) * TS, this.arena.floorY - this.h);
    // 접촉
    if (p.layer === 'back' && this.alpha > 0.5 && overlap(this.hitbox(), p) && p.hurt(this.dmg, 6, this.cx)) sc.applyHitEffect('terror');
  }

  choosePattern() {
    const pats = this.def.patterns.filter((x) => x !== this.lastPat);
    this.pat = pickR(pats);
    this.lastPat = this.pat;
    this.state = 'pat'; this.pt = 0; this.pd = {};
  }

  shoot(x, y, vx, vy, o = {}) {
    this.sc.projectiles.push(Object.assign({ x, y, vx, vy, r: 4, dmg: Math.round(this.dmg * 0.75), san: 5, layer: 'back', from: 'enemy', life: 260, col: this.def.color, kind: 'orb', eff: this.def.eff }, o));
  }

  runPattern() {
    const sc = this.sc, p = sc.player, pt = this.pt, ph2 = this.phase2;
    switch (this.pat) {
      case 'dash': {
        if (pt === 1) { this.facing = p.cx < this.cx ? -1 : 1; Sound.play('warn'); }
        if (pt < 36) { this.vx = 0; if (pt % 4 < 2) this.flash = 2; return false; }
        if (pt === 36) Sound.play('slam');
        this.vx = this.facing * (ph2 ? 6.4 : 5.4);
        if (pt % 3 === 0) sc.particles.push({ x: this.cx, y: this.y + this.h - 4, vx: -this.facing, vy: -0.5, life: 20, col: this.def.color, size: 3 });
        if (this.x <= this.arena.x0 + 3 || this.x >= this.arena.x1 - this.w - 3 || pt > 110) { this.vx = 0; Gfx.shake(3, 10); return true; }
        return false;
      }
      case 'slam': {
        if (pt === 1) {
          if (this.def.flying) { this.vy = -2; }
          else { this.vy = -7.6; this.vx = clamp((p.cx - this.cx) / 48, -3.5, 3.5); }
          Sound.play('jump');
        }
        if (this.def.flying) {
          if (pt < 30) { this.vx = approach(this.vx, sign(p.cx - this.cx) * 2, 0.2); return false; }
          this.vy = 7; this.vx = 0;
        }
        if (pt > 8 && (this.onGround || this.y >= this.arena.floorY - this.h - 0.5)) {
          if (!this.pd.landed) {
            this.pd.landed = pt; this.vx = 0; this.vy = 0;
            Sound.play('slam'); Gfx.shake(5, 16);
            const fy = this.arena.floorY - 8;
            for (const dir of [-1, 1]) {
              this.shoot(this.cx, fy, dir * 3.2, 0, { r: 5, kind: 'wave', life: 120 });
              if (ph2) this.shoot(this.cx, fy, dir * 2.2, 0, { r: 5, kind: 'wave', life: 140 });
            }
          }
          if (pt - this.pd.landed > 24) return true;
        }
        return pt > 150;
      }
      case 'spread': {
        const vol = ph2 ? 4 : 3;
        if (pt % 26 === 10 && pt < 26 * vol) {
          const n = ph2 ? 7 : 5;
          const base = Math.atan2(p.cy - this.cy, p.cx - this.cx);
          for (let i = 0; i < n; i++) {
            const a = base + (i - (n - 1) / 2) * 0.2;
            this.shoot(this.cx, this.cy - 6, Math.cos(a) * 2.3, Math.sin(a) * 2.3);
          }
          Sound.play('eshoot');
        }
        return pt > 26 * vol + 20;
      }
      case 'ring': {
        const fire = (off) => {
          const n = ph2 ? 16 : 12;
          for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2 + off; this.shoot(this.cx, this.cy, Math.cos(a) * 1.9, Math.sin(a) * 1.9); }
          Sound.play('eshoot');
        };
        if (pt < 30 && pt % 4 < 2) this.flash = 2;
        if (pt === 30) fire(0);
        if (pt === 62) fire(0.2);
        if (ph2 && pt === 94) fire(0.4);
        return pt > (ph2 ? 120 : 90);
      }
      case 'rain': {
        if (pt === 1) {
          const n = ph2 ? 10 : 7;
          this.pd.xs = [];
          for (let i = 0; i < n; i++) this.pd.xs.push(rnd(this.arena.x0 + 16, this.arena.x1 - 16));
          this.pd.xs.push(p.cx);
          for (const x of this.pd.xs) this.hazards.push({ type: 'mark', x, t: 50 });
          Sound.play('warn');
        }
        if (pt === 50) {
          for (const x of this.pd.xs) this.shoot(x, (CEIL + 0.5) * TS, 0, 4.2, { r: 4, kind: 'drop', life: 120 });
        }
        return pt > 90;
      }
      case 'summon': {
        if (pt < 20 && pt % 4 < 2) this.flash = 2;
        if (pt === 20) {
          const alive = sc.enemies.filter((e) => !e.dead && e.layer === 'back').length;
          const n = Math.min(ph2 ? 3 : 2, 5 - alive);
          for (let i = 0; i < n; i++) {
            const def = ENEMIES[this.def.minion];
            const ex = clamp(this.cx + rnd(-60, 60), this.arena.x0 + 20, this.arena.x1 - 30);
            const ey = def.ai === 'swarm' || def.ai === 'float' ? this.cy : this.arena.floorY - def.h;
            sc.spawnEnemy(this.def.minion, ex, ey, 'back');
            for (let k = 0; k < 10; k++) sc.particles.push({ x: ex + 5, y: ey + 8, vx: rnd(-1.5, 1.5), vy: rnd(-2, 0), life: 20, col: this.def.color, size: 2 });
          }
          Sound.play('boss');
        }
        return pt > 50;
      }
      case 'teleport': {
        if (pt <= 20) { this.alpha = 1 - pt / 20; return false; }
        if (pt === 21) {
          const side = Math.random() < 0.5 ? -1 : 1;
          let nx = p.cx + side * 90 - this.w / 2;
          if (nx < this.arena.x0 + 4 || nx > this.arena.x1 - this.w - 4) nx = p.cx - side * 90 - this.w / 2;
          this.x = clamp(nx, this.arena.x0 + 4, this.arena.x1 - this.w - 4);
          if (!this.def.flying) this.y = this.arena.floorY - this.h;
          Sound.play('flip');
        }
        if (pt <= 40) { this.alpha = (pt - 20) / 20; return false; }
        if (pt === 44) {
          const base = Math.atan2(p.cy - this.cy, p.cx - this.cx);
          for (let i = -1; i <= 1; i++) this.shoot(this.cx, this.cy, Math.cos(base + i * 0.25) * 2.8, Math.sin(base + i * 0.25) * 2.8);
          Sound.play('eshoot');
        }
        return pt > 60;
      }
      case 'beam': {
        if (pt === 1) {
          this.pd.y = clamp(p.cy, (CEIL + 1) * TS, this.arena.floorY - 8);
          this.hazards.push({ type: 'beamwarn', y: this.pd.y, t: ph2 ? 38 : 52 });
          Sound.play('warn');
        }
        const warn = ph2 ? 38 : 52;
        if (pt === warn) { this.hazards.push({ type: 'beam', y: this.pd.y, t: 18 }); Sound.play('zap'); Gfx.shake(3, 14); }
        return pt > warn + 24;
      }
      case 'sweep': {
        if (pt === 1) {
          this.pd.dir = Math.random() < 0.5 ? 1 : -1;
          this.hazards.push({ type: 'trainwarn', t: 80, dir: this.pd.dir });
          Sound.play('warn');
          sc.toast('⚠ 열차가 진입합니다 — 위로 피하거나 표면으로!', '#3af0ff');
        }
        if (pt === 80) {
          this.hazards.push({ type: 'train', x: this.pd.dir > 0 ? this.arena.x0 - 120 : this.arena.x1, dir: this.pd.dir, t: 999 });
          Sound.play('train');
        }
        return pt > 80 && !this.hazards.some((h) => h.type === 'train');
      }
    }
    return true;
  }

  updateHazards() {
    const sc = this.sc, p = sc.player;
    for (const h of this.hazards) {
      h.t--;
      if (h.type === 'beam' && p.layer === 'back' && Math.abs(p.cy - h.y) < 12 && p.hurt(this.dmg, 8, this.cx)) sc.applyHitEffect(this.def.eff);
      if (h.type === 'train') {
        h.x += h.dir * 9;
        const box = { x: h.x, y: this.arena.floorY - 40, w: 120, h: 40 };
        if (p.layer === 'back' && overlap(box, p) && p.hurt(this.dmg + 8, 10, h.x + 60)) sc.applyHitEffect('terror');
        if ((h.dir > 0 && h.x > this.arena.x1 + 10) || (h.dir < 0 && h.x < this.arena.x0 - 130)) h.t = 0;
        if (sc.time % 3 === 0) Gfx.shake(2, 3);
      }
    }
    this.hazards = this.hazards.filter((h) => h.t > 0);
  }

  hurt(dmg, dir, crit) {
    if (this.state === 'intro' || this.dead || this.alpha < 0.5) return;
    dmg = Math.round(dmg);
    this.hp -= dmg;
    this.flash = 6;
    this.sc.floatText(this.cx, this.y - 6, (crit ? '치명! ' : '') + dmg, crit ? '#f2d040' : '#ffffff');
    Sound.play('hit');
    for (let i = 0; i < 5; i++) this.sc.particles.push({ x: this.cx - dir * 6, y: this.cy + rnd(-10, 10), vx: rnd(-1, 1) + dir * 1.5, vy: rnd(-2, 0.5), life: 16, col: this.def.color, size: 2 });
    if (this.hp <= 0) {
      this.hp = 0; this.dead = true; this.deadT = 0; this.hazards = [];
      Sound.play('die');
      Gfx.shake(6, 40);
      this.sc.projectiles = this.sc.projectiles.filter((pr) => pr.from === 'player');
    }
  }

  drawHazards(ctx, cam) {
    const a = this.arena;
    for (const h of this.hazards) {
      if (h.type === 'mark') {
        ctx.fillStyle = h.t % 8 < 4 ? this.def.color : 'rgba(255,255,255,0.5)';
        const x = Math.round(h.x - cam.x);
        ctx.fillRect(x - 4, Math.round(a.floorY - cam.y) - 2, 8, 2);
        ctx.globalAlpha = 0.25; ctx.fillRect(x - 1, Math.round((CEIL) * TS - cam.y), 2, a.floorY - CEIL * TS); ctx.globalAlpha = 1;
      } else if (h.type === 'beamwarn') {
        ctx.fillStyle = h.t % 6 < 3 ? 'rgba(255,60,80,0.7)' : 'rgba(255,255,255,0.4)';
        ctx.fillRect(Math.round(a.x0 - cam.x), Math.round(h.y - cam.y), a.x1 - a.x0, 1);
      } else if (h.type === 'beam') {
        const y = Math.round(h.y - cam.y);
        ctx.fillStyle = this.def.color; ctx.fillRect(Math.round(a.x0 - cam.x), y - 7, a.x1 - a.x0, 14);
        ctx.fillStyle = '#ffffff'; ctx.fillRect(Math.round(a.x0 - cam.x), y - 3, a.x1 - a.x0, 6);
      } else if (h.type === 'trainwarn') {
        if (h.t % 10 < 5) {
          ctx.fillStyle = 'rgba(58,240,255,0.35)';
          ctx.fillRect(Math.round(a.x0 - cam.x), Math.round(a.floorY - 40 - cam.y), a.x1 - a.x0, 40);
          Gfx.text(ctx, h.dir > 0 ? '▶▶▶' : '◀◀◀', a.x0 + (a.x1 - a.x0) / 2 - cam.x, a.floorY - 28 - cam.y, '#3af0ff', { align: 'center' });
        }
      } else if (h.type === 'train') {
        const x = Math.round(h.x - cam.x), y = Math.round(a.floorY - 40 - cam.y);
        ctx.fillStyle = '#0b0b10'; ctx.fillRect(x - 1, y - 1, 122, 42);
        ctx.fillStyle = '#1a4a5a'; ctx.fillRect(x, y, 120, 40);
        ctx.fillStyle = '#3af0ff'; ctx.fillRect(x, y + 26, 120, 3);
        for (let i = 0; i < 4; i++) { ctx.fillStyle = '#0a1a20'; ctx.fillRect(x + 8 + i * 28, y + 6, 18, 14); ctx.fillStyle = 'rgba(255,90,138,0.8)'; ctx.fillRect(x + 12 + i * 28, y + 10, 4, 4); }
        ctx.fillStyle = '#f4f0e6'; ctx.fillRect(h.dir > 0 ? x + 114 : x, y + 30, 6, 6);
      }
    }
  }

  draw(ctx, cam) {
    const fr = Math.floor(this.anim / 10) % 3;
    const spr = (this.facing > 0 ? this.spr : this.sprL)[fr];
    const sx = Math.round(this.cx - spr.width / 2 - cam.x);
    const sy = Math.round(this.y + this.h - spr.height + 2 - cam.y);
    ctx.globalAlpha = this.alpha * (this.dead ? Math.max(0, 1 - this.deadT / 90) : 1);
    if (this.state === 'intro' && this.t > 60) ctx.globalAlpha = (110 - this.t) / 50;
    const wob = this.dead ? rndi(-2, 2) : 0;
    ctx.drawImage(spr, sx + wob, sy);
    if (this.flash > 0) { ctx.globalAlpha = 0.8; ctx.drawImage(Gfx.white(spr), sx + wob, sy); }
    ctx.globalAlpha = 1;
    if (this.healing && this.anim % 20 < 10) Gfx.text(ctx, '안정화 중...', this.cx - cam.x, this.y - 14 - cam.y, '#6fd08c', { align: 'center', small: true });
  }
}
