'use strict';
// ───────────────────────── 엔티티: 플레이어 / 적 / 투사체 ─────────────────────────

class Player {
  constructor(x, y, sc) {
    this.sc = sc;
    this.x = x; this.y = y; this.w = 10; this.h = 22;
    this.vx = 0; this.vy = 0;
    this.onGround = false; this.facing = 1;
    this.layer = 'front';
    const D = sc.D;
    this.maxHp = D.maxHp; this.maxSan = D.maxSan;
    this.hp = this.maxHp; this.san = this.maxSan;
    this.inv = 0; this.atkT = 0; this.atkCd = 0; this.flipCd = 0;
    this.coyote = 0; this.jumpBuf = 0; this.airJumps = 0;
    this.dashT = 0; this.dashCd = 0; this.dropT = 0;
    this.hurtT = 0; this.shield = 0;
    this.anim = 0; this.frame = 0;
    this.hitSet = new Set();
    this.safe = { x, y, layer: 'front' };
    this.landT = 0;
    this.dead = false;
    this.frozen = 0;
    this.fear = 0;                 // 공포 수치 0~100
    this.downHold = 0;
    this.st = new StatusSet();     // 버프 / 디버프
    this.jitT = 40; this.jitDir = 0; this.jitLeft = 0;
  }
  get cx() { return this.x + this.w / 2; }
  get cy() { return this.y + this.h / 2; }

  update() {
    const sc = this.sc, D = sc.D, lvl = sc.lvl;
    if (this.dead) return;
    if (this.inv > 0) this.inv--;
    if (this.atkCd > 0) this.atkCd--;
    if (this.flipCd > 0) this.flipCd--;
    if (this.dashCd > 0) this.dashCd--;
    if (this.dropT > 0) this.dropT--;
    if (this.hurtT > 0) this.hurtT--;
    if (this.frozen > 0) { this.frozen--; this.vx *= 0.8; }

    const ctrl = this.frozen <= 0 && !sc.locked;
    let mx = 0;
    if (ctrl) mx = (Input.down('right') ? 1 : 0) - (Input.down('left') ? 1 : 0);
    // 패닉: 몸이 제멋대로 움직인다
    if (ctrl && this.st.has('panic') && !D.m.frenzy) {
      if (this.jitLeft > 0) { this.jitLeft--; mx = this.jitDir; }
      else if (--this.jitT <= 0) { this.jitDir = Math.random() < 0.5 ? -1 : 1; this.jitLeft = rndi(10, 18); this.jitT = rndi(26, 50); }
    }

    // 대시
    if (ctrl && D.ab.dash && this.dashCd <= 0 && (Input.pressed('dash') || Input.tapDash)) {
      const dir = Input.tapDash || (mx || this.facing);
      this.facing = dir;
      this.dashT = 10; this.dashCd = 42; this.inv = Math.max(this.inv, 10);
      this.vy = 0;
      Sound.play('swing');
    }
    if (this.dashT > 0) {
      this.dashT--;
      this.vx = this.facing * 6.2;
      this.vy = 0;
      if (sc.time % 2 === 0) sc.particles.push({ x: this.cx, y: this.cy + rnd(-8, 8), vx: -this.facing * 0.5, vy: 0, life: 14, col: this.layer === 'back' ? '#ff5a8a' : '#f2c230', size: 2 });
    } else {
      const atkSlow = this.atkT > 0 && this.onGround ? 0.45 : 1;
      const target = mx * D.speed * atkSlow * sc.speedMul();
      const acc = this.onGround ? 0.4 : 0.28;
      this.vx = approach(this.vx, target, acc);
      if (mx !== 0 && this.atkT <= 0) this.facing = mx;
    }

    // 점프
    if (this.onGround) { this.coyote = 6; this.airJumps = D.ab.doubleJump ? 1 : 0; } else if (this.coyote > 0) this.coyote--;
    if (ctrl && Input.pressed('jump')) this.jumpBuf = 7;
    if (this.jumpBuf > 0) this.jumpBuf--;
    if (this.jumpBuf > 0 && ctrl) {
      if (Input.down('down') && this.onGround && this.standingOnPlatform()) {
        this.dropT = 12; this.jumpBuf = 0; this.y += 1;
      } else if (this.coyote > 0) {
        this.vy = -D.jumpV; this.coyote = 0; this.jumpBuf = 0; this.onGround = false;
        Sound.play('jump');
      } else if (this.airJumps > 0 && this.dashT <= 0) {
        this.vy = -D.jumpV * 0.92; this.airJumps--; this.jumpBuf = 0;
        Sound.play('djump');
        for (let i = 0; i < 6; i++) sc.particles.push({ x: this.cx + rnd(-5, 5), y: this.y + this.h, vx: rnd(-1, 1), vy: rnd(0.5, 1.5), life: 18, col: '#c8c4d8', size: 1 });
      }
    }
    if (!Input.down('jump') && this.vy < -2.2) this.vy = -2.2;
    // ↓ 길게: 발판 아래로 내려가기
    if (ctrl && Input.down('down') && this.onGround && this.standingOnPlatform()) {
      if (++this.downHold > 9) { this.dropT = 12; this.y += 1; this.downHold = 0; }
    } else this.downHold = 0;

    if (this.dashT <= 0) {
      this.vy = Math.min(MAXFALL, this.vy + GRAV);
    }
    const wasGround = this.onGround;
    moveBody(this, lvl, this.layer);
    if (this.onGround && !wasGround && this.landT <= 0) { Sound.play('land'); this.landT = 8; }
    if (this.landT > 0) this.landT--;

    // 안전 지점 기억
    if (this.onGround && !boxHits(lvl, this.layer, this.x, this.y + this.h, this.w, 2, T_SPIKE)) {
      const tx0 = Math.floor(this.x / TS), tx1 = Math.floor((this.x + this.w) / TS), ty = Math.floor((this.y + this.h + 1) / TS);
      const solidBoth = (tx) => lvl.get('front', tx, ty) === T_SOLID && lvl.get('back', tx, ty) === T_SOLID;
      if (solidBoth(tx0) && solidBoth(tx1)) this.safe = { x: this.x, y: this.y, layer: this.layer };
    }

    // 가시
    if (boxHits(lvl, this.layer, this.x + 2, this.y + 4, this.w - 4, this.h - 4, T_SPIKE)) {
      this.hurt(10, 4, this.cx - this.facing * 10);
      if (this.inv > 0) this.vy = -4;
    }

    // 낙하
    if (this.y > lvl.H * TS + 20) sc.onPitFall();

    // 공격
    if (ctrl && Input.pressed('attack') && this.atkCd <= 0 && this.dashT <= 0) this.startAttack();
    if (this.atkT > 0) this.updateAttack();

    // 전환 / 아이템 / 상호작용
    if (ctrl && Input.pressed('flip')) sc.tryFlip();
    if (ctrl && Input.pressed('item')) { if (Input.down('down')) sc.cycleItem(); else sc.useItem(); }
    if (ctrl && Input.pressed('cycle')) sc.cycleItem();
    if (ctrl && Input.pressed('interact')) sc.tryInteract();

    // 애니메이션
    this.anim++;
    if (this.hurtT > 10) this.frame = 11;
    else if (this.atkT > 0) {
      const w = sc.D.weapon;
      const p = 1 - this.atkT / this.atkTotal;
      this.frame = w.ranged ? 9 : p < 0.25 ? 8 : p < 0.6 ? 9 : 10;
    } else if (!this.onGround) this.frame = this.vy < 0 ? 6 : 7;
    else if (Math.abs(this.vx) > 0.3) this.frame = 2 + Math.floor(this.anim / 6) % 4;
    else this.frame = Math.floor(this.anim / 30) % 2;
  }

  standingOnPlatform() {
    const ty = Math.floor((this.y + this.h + 1) / TS);
    const x0 = Math.floor(this.x / TS), x1 = Math.floor((this.x + this.w - 0.01) / TS);
    let plat = false;
    for (let tx = x0; tx <= x1; tx++) {
      const t = this.sc.lvl.get(this.layer, tx, ty);
      if (t === T_SOLID) return false;
      if (t === T_PLAT) plat = true;
    }
    return plat;
  }

  startAttack() {
    const sc = this.sc, w = sc.D.weapon;
    this.atkTotal = Math.max(8, Math.round(w.cd * sc.D.atkCdMul * sc.atkSpdMul()));
    this.atkT = this.atkTotal;
    this.atkCd = this.atkTotal + 2;
    this.hitSet.clear();
    if (w.ranged) {
      Sound.play('spray');
      for (let i = 0; i < 3; i++) {
        sc.projectiles.push({
          x: this.cx + this.facing * 8, y: this.y + 11, vx: this.facing * rnd(3.8, 4.6), vy: rnd(-0.5, 0.5),
          r: 3, dmg: w.dmg * sc.dmgMul(false), layer: this.layer, from: 'player', life: 26 + i * 4, col: '#9ae8ff', kind: 'spray',
        });
      }
    } else Sound.play('swing');
    // 폭주: 분노 3중첩 이상이면 충격파
    if (sc.D.m.rageWave && this.st.stacks('rage') >= 3) {
      sc.projectiles.push({ x: this.cx + this.facing * 10, y: this.y + 10, vx: this.facing * 4.2, vy: 0, r: 6, dmg: w.dmg * sc.dmgMul(false) * 0.7, layer: this.layer, from: 'player', life: 40, col: '#ff9a3a', kind: 'rwave', pierce: true });
    }
  }

  attackBox() {
    const w = this.sc.D.weapon;
    const reach = w.reach;
    return { x: this.facing > 0 ? this.x + this.w - 2 : this.x - reach + 2, y: this.y - 2, w: reach, h: this.h };
  }

  updateAttack() {
    const sc = this.sc, w = sc.D.weapon;
    this.atkT--;
    if (w.ranged) return;
    const p = 1 - this.atkT / this.atkTotal;
    if (p > 0.22 && p < 0.62) {
      const box = this.attackBox();
      const crit = Math.random() < sc.critChance();
      const cm = crit ? sc.D.critMul : 1;
      for (const e of sc.enemies) {
        if (e.dead || e.layer !== this.layer || this.hitSet.has(e)) continue;
        if (overlap(box, e)) { this.hitSet.add(e); e.hurt(w.dmg * sc.dmgMul(false) * cm, this.facing, w.stun || 0, crit); }
      }
      if (sc.boss && !sc.boss.dead && this.layer === 'back' && !this.hitSet.has(sc.boss) && overlap(box, sc.boss.hitbox())) {
        this.hitSet.add(sc.boss);
        sc.boss.hurt(w.dmg * sc.dmgMul(true) * cm, this.facing, crit);
      }
    }
  }

  hurt(dmg, san, fromX) {
    const sc = this.sc;
    if (this.inv > 0 || this.dead || sc.locked) return false;
    if (this.shield > 0) {
      this.shield--;
      this.inv = 50;
      Sound.play('zap');
      sc.floatText(this.cx, this.y - 6, '부적 발동!', '#f2d040');
      for (let i = 0; i < 14; i++) sc.particles.push({ x: this.cx, y: this.cy, vx: rnd(-2, 2), vy: rnd(-2, 2), life: 24, col: '#f2d040', size: 2 });
      return false;
    }
    const lowSan = (this.san < this.maxSan * 0.3 ? 1.25 : 1) * (this.st.has('panic') && sc.D.m.frenzy ? 0.75 : 1);
    this.hp -= Math.round(dmg * lowSan);
    this.san -= san;
    this.inv = 60; this.hurtT = 20;
    const dir = this.cx < fromX ? -1 : 1;
    this.vx = dir * 2.6; this.vy = -2.8;
    this.dashT = 0;
    sc.run.damage += dmg;
    Gfx.shake(3, 10);
    Sound.play('hurt');
    sc.floatText(this.cx, this.y - 4, '-' + Math.round(dmg * lowSan), '#ff6a6a');
    for (let i = 0; i < 8; i++) sc.particles.push({ x: this.cx, y: this.cy, vx: rnd(-2, 2), vy: rnd(-3, 0), life: 20, col: '#e0474c', size: 2, g: 0.15 });
    sc.onPlayerHurt(dmg);
    return true;
  }

  draw(ctx, cam) {
    if (this.inv > 0 && this.hurtT <= 0 && Math.floor(this.inv / 3) % 2 === 0 && this.dashT <= 0) return;
    const set = SPR.player;
    const fr = (this.facing > 0 ? set.R : set.L)[this.frame];
    const sx = Math.round(this.x - 3 - cam.x), sy = Math.round(this.y - 2 - cam.y);
    // 무기 (뒤)
    const pose = POSES[POSE_ORDER[this.frame]];
    const hx = this.facing > 0 ? sx + pose.h[0] + 1 : sx + 15 - pose.h[0] - 1;
    const hy = sy + pose.h[1] + 1;
    const w = this.sc.D.weapon;
    let ang = -1.2;
    if (this.atkT > 0 && !w.ranged) {
      const p = 1 - this.atkT / this.atkTotal;
      ang = p < 0.25 ? -2.4 : p < 0.6 ? lerp(-1.6, 0.6, (p - 0.25) / 0.35) : 0.7;
    }
    if (this.frame === 0 || this.frame === 1 || (this.frame >= 2 && this.frame <= 7)) ang = -1.25;
    if (this.layer === 'back') { ctx.globalAlpha = 1; }
    ctx.drawImage(fr, sx, sy);
    drawWeapon(ctx, w.kind, hx, hy, ang, this.facing);
    // 베기 이펙트
    if (this.atkT > 0 && !w.ranged) {
      const p = 1 - this.atkT / this.atkTotal;
      if (p > 0.25 && p < 0.7) {
        const cx = this.cx - cam.x, cy = this.cy - cam.y - 2;
        ctx.fillStyle = this.layer === 'back' ? 'rgba(255,120,160,0.85)' : 'rgba(255,255,255,0.85)';
        const r = w.reach;
        const a0 = -1.3, a1 = lerp(-1.3, 1.0, clamp((p - 0.25) / 0.3, 0, 1));
        for (let a = a0; a <= a1; a += 0.12) {
          const x = cx + Math.cos(a) * r * this.facing, y = cy + Math.sin(a) * r * 0.75;
          ctx.fillRect(Math.round(x), Math.round(y), 2, 2);
          ctx.fillRect(Math.round(cx + Math.cos(a) * (r - 4) * this.facing), Math.round(cy + Math.sin(a) * (r - 4) * 0.75), 1, 1);
        }
      }
    }
    if (this.shield > 0) {
      ctx.fillStyle = 'rgba(242,208,64,0.6)';
      const t = this.sc.time * 0.1;
      for (let i = 0; i < 3; i++) ctx.fillRect(Math.round(this.cx - cam.x + Math.cos(t + i * 2.1) * 10), Math.round(this.cy - cam.y + Math.sin(t + i * 2.1) * 13), 2, 2);
    }
  }
}

// ───────────── 적 ─────────────
class Enemy {
  constructor(type, x, y, layer, sc, diff) {
    const def = ENEMIES[type];
    this.type = type; this.def = def; this.sc = sc;
    this.x = x; this.y = y; this.w = def.w; this.h = def.h;
    this.vx = 0; this.vy = 0;
    this.layer = layer || def.layer;
    const scale = 1 + 0.28 * (diff - 1);
    this.hp = Math.round(def.hp * scale); this.maxHp = this.hp;
    this.dmg = Math.round(def.dmg * (1 + 0.15 * (diff - 1)));
    this.san = def.san;
    this.spd = def.spd * (1 + 0.05 * (diff - 1));
    this.facing = -1;
    this.t = Math.floor(Math.random() * 100);
    this.flash = 0; this.stun = 0;
    this.dead = false;
    this.onGround = false;
    this.cool = 60 + Math.floor(Math.random() * 60);
    this.homeX = x; this.homeY = y;
    this.dir = Math.random() < 0.5 ? -1 : 1;
    this.alpha = 1;
  }
  get cx() { return this.x + this.w / 2; }
  get cy() { return this.y + this.h / 2; }

  update() {
    const sc = this.sc, p = sc.player, lvl = sc.lvl;
    this.t++;
    if (this.flash > 0) this.flash--;
    const dx = p.cx - this.cx, dy = p.cy - this.cy;
    const adx = Math.abs(dx);
    if (adx > 440) return;
    const sameLayer = p.layer === this.layer;
    const aware = sameLayer || this.def.ai === 'drift';
    if (this.stun > 0) {
      this.stun--;
      this.vx *= 0.85;
      if (this.def.ai === 'walker' || this.def.ai === 'hopper' || this.def.ai === 'watcher') { this.vy = Math.min(MAXFALL, this.vy + GRAV); moveBody(this, lvl, this.layer); }
      return;
    }
    switch (this.def.ai) {
      case 'float': {
        if (aware && adx < 170 && Math.abs(dy) < 120) {
          const d = Math.max(1, Math.hypot(dx, dy));
          this.vx = approach(this.vx, dx / d * this.spd * 1.6, 0.05);
          this.vy = approach(this.vy, dy / d * this.spd * 1.6, 0.05);
        } else {
          this.vx = approach(this.vx, Math.cos(this.t * 0.02) * this.spd, 0.03);
          this.vy = approach(this.vy, Math.sin(this.t * 0.03) * this.spd * 0.6, 0.03);
        }
        this.x += this.vx; this.y += this.vy;
        this.y = clamp(this.y, CEIL * TS, (sc.lvl.H - 2) * TS);
        this.facing = sign(this.vx) || this.facing;
        break;
      }
      case 'walker': {
        const chase = aware && adx < 210 && Math.abs(dy) < 70;
        let target = 0;
        if (chase) target = sign(dx) * this.spd * 1.3;
        else {
          target = this.dir * this.spd * 0.5;
          // 낭떠러지에서 방향 전환
          const aheadX = this.dir > 0 ? this.x + this.w + 2 : this.x - 2;
          const below = lvl.get(this.layer, Math.floor(aheadX / TS), Math.floor((this.y + this.h + 2) / TS));
          if (this.onGround && below === T_EMPTY) this.dir *= -1;
        }
        this.vx = approach(this.vx, target, 0.15);
        this.vy = Math.min(MAXFALL, this.vy + GRAV);
        moveBody(this, lvl, this.layer);
        if (this.hitWall) { if (chase && this.onGround) this.vy = -5.2; else this.dir *= -1; }
        if (chase && this.onGround && dy < -30 && adx < 50 && this.cool <= 0) { this.vy = -5.6; this.cool = 50; }
        if (this.cool > 0) this.cool--;
        this.facing = sign(this.vx) || this.facing;
        break;
      }
      case 'lunger': {
        // 느릿느릿 다가오다가, 가까워지면 갑자기 덮친다
        if (this.lungeT > 0) { this.lungeT--; this.vx = this.lungeDir * this.spd * 6; }
        else {
          const chase = aware && adx < 220 && Math.abs(dy) < 60;
          this.vx = approach(this.vx, chase ? sign(dx) * this.spd : 0, 0.08);
          if (chase && adx < 85 && Math.abs(dy) < 30 && this.cool <= 0 && this.onGround) { this.lungeT = 22; this.lungeDir = sign(dx) || 1; this.cool = 100; this.vy = -2; Sound.play('whisper'); }
        }
        if (this.cool > 0) this.cool--;
        this.vy = Math.min(MAXFALL, this.vy + GRAV);
        moveBody(this, lvl, this.layer);
        if (this.hitWall) this.lungeT = 0;
        this.facing = sign(this.vx) || this.facing;
        break;
      }
      case 'dripper': {
        // 천장 근처를 떠돌며 수액을 떨어뜨린다
        const tx = aware && adx < 180 ? p.cx : this.homeX + Math.sin(this.t * 0.01) * 40;
        this.vx = approach(this.vx, sign(tx - this.cx) * this.spd, 0.03);
        this.vy = approach(this.vy, Math.sin(this.t * 0.04) * 0.3, 0.03);
        this.x += this.vx; this.y += this.vy;
        if (aware && adx < 40 && dy > 0 && --this.cool <= 0) {
          this.cool = 110;
          sc.projectiles.push({ x: this.cx, y: this.y + this.h, vx: 0, vy: 2.2, r: 3, dmg: this.dmg, san: 4, layer: this.layer, from: 'enemy', life: 140, col: '#c8ff6a', kind: 'eye', eff: 'erosion', grav: 0.05 });
          Sound.play('eshoot');
        }
        this.facing = sign(this.vx) || this.facing;
        break;
      }
      case 'sleeper': {
        // 누워 있다가 가까이 오면 벌떡 일어난다
        if (!this.awake) {
          this.vy = Math.min(MAXFALL, this.vy + GRAV);
          moveBody(this, lvl, this.layer);
          if (sameLayer && adx < 60 && Math.abs(dy) < 40) { this.awake = true; this.vy = -3.5; Sound.play('whisper'); Gfx.shake(2, 8); sc.floatText(this.cx, this.y - 6, '…일어났다', '#ffb84a'); }
          break;
        }
        const chase = aware && adx < 240 && Math.abs(dy) < 70;
        this.vx = approach(this.vx, chase ? sign(dx) * this.spd * 1.2 : 0, 0.15);
        this.vy = Math.min(MAXFALL, this.vy + GRAV);
        moveBody(this, lvl, this.layer);
        if (this.hitWall && this.onGround) this.vy = -5;
        this.facing = sign(this.vx) || this.facing;
        break;
      }
      case 'wander': {
        // 웃는 손님: 천천히 서성일 뿐 (공격하면 안 된다)
        this.vx = approach(this.vx, this.dir * this.spd, 0.1);
        this.vy = Math.min(MAXFALL, this.vy + GRAV);
        const aheadX = this.dir > 0 ? this.x + this.w + 2 : this.x - 2;
        if (this.onGround && lvl.get(this.layer, Math.floor(aheadX / TS), Math.floor((this.y + this.h + 2) / TS)) === T_EMPTY) this.dir *= -1;
        moveBody(this, lvl, this.layer);
        if (this.hitWall || Math.random() < 0.004) this.dir *= -1;
        this.facing = adx < 80 ? sign(dx) || 1 : this.dir;
        break;
      }
      case 'turret': {
        this.y = this.homeY + Math.sin(this.t * 0.05) * 2;
        this.facing = sign(dx) || 1;
        if (aware && adx < 200 && Math.abs(dy) < 110) {
          if (--this.cool <= 0) {
            this.cool = 110 - Math.min(40, sc.diff * 8);
            const d = Math.max(1, Math.hypot(dx, dy));
            sc.projectiles.push({ x: this.cx, y: this.cy, vx: dx / d * 1.9, vy: dy / d * 1.9, r: 3, dmg: this.dmg, san: 4, layer: this.layer, from: 'enemy', life: 160, col: '#c41e3a', kind: 'eye', eff: 'erosion' });
            Sound.play('eshoot');
          }
        }
        break;
      }
      case 'swarm': {
        if (aware && adx < 220) {
          const tx = p.cx + Math.cos(this.t * 0.05 + this.homeX) * 26;
          const ty = p.cy - 10 + Math.sin(this.t * 0.07 + this.homeX) * 18;
          this.vx = approach(this.vx, sign(tx - this.cx) * this.spd, 0.08);
          this.vy = approach(this.vy, sign(ty - this.cy) * this.spd * 0.8, 0.08);
        } else {
          this.vx = Math.cos(this.t * 0.03) * 0.5; this.vy = Math.sin(this.t * 0.05) * 0.4;
        }
        this.x += this.vx; this.y += this.vy;
        this.y = clamp(this.y, CEIL * TS, (sc.lvl.H - 2) * TS);
        this.facing = sign(this.vx) || this.facing;
        break;
      }
      case 'watcher': {
        // 플레이어가 등을 보이고 있을 때만 움직인다
        const looking = sign(dx) !== 0 && p.facing === -sign(dx);
        const moving = aware && !looking && adx < 280 && Math.abs(dy) < 90;
        this.vx = moving ? sign(dx) * this.spd : approach(this.vx, 0, 0.6);
        this.vy = Math.min(MAXFALL, this.vy + GRAV);
        moveBody(this, lvl, this.layer);
        if (moving && this.hitWall && this.onGround) this.vy = -5;
        if (moving && this.t % 50 === 0) Sound.play('whisper');
        this.moving = moving;
        this.facing = sign(dx) || 1;
        break;
      }
      case 'hopper': {
        this.vy = Math.min(MAXFALL, this.vy + GRAV);
        if (this.onGround) {
          this.vx = approach(this.vx, 0, 0.3);
          if (--this.cool <= 0) {
            const chase = aware && adx < 180;
            const dir = chase ? sign(dx) : this.dir;
            this.vx = dir * this.spd * 1.3; this.vy = -3.4;
            this.cool = chase ? 30 : 70;
            if (!chase && Math.random() < 0.3) this.dir *= -1;
          }
        }
        moveBody(this, lvl, this.layer);
        if (this.hitWall) this.dir *= -1;
        this.facing = sign(this.vx) || this.facing;
        break;
      }
      case 'drift': {
        if (adx < 200) {
          const d = Math.max(1, Math.hypot(dx, dy));
          this.vx = approach(this.vx, dx / d * this.spd, 0.03);
          this.vy = approach(this.vy, dy / d * this.spd, 0.03);
        }
        this.x += this.vx; this.y += this.vy;
        this.alpha = 0.45 + Math.sin(this.t * 0.1) * 0.2;
        this.facing = sign(this.vx) || this.facing;
        break;
      }
    }
    if (this.y > lvl.H * TS + 40) { this.dead = true; return; }
    // 접촉 피해
    if (this.dmg > 0 && !(this.def.ai === 'sleeper' && !this.awake) && sameLayer && overlap(this, p) && p.hurt(this.dmg, this.san, this.cx)) sc.applyHitEffect(ENEMY_HIT_EFFECT[this.type]);
  }

  hurt(dmg, dir, stun = 0, crit = false) {
    const sc = this.sc;
    if (this.def.ai === 'sleeper') this.awake = true;
    if (this.type === 'smiler') {
      // 웃는 손님을 공격했다 — 미소가 찢어진다
      this.dead = true;
      Sound.play('kill');
      for (let i = 0; i < 18; i++) sc.particles.push({ x: this.cx, y: this.cy, vx: rnd(-2, 2), vy: rnd(-3, 1), life: 30, col: pickR(['#f4e8de', '#c41e3a', '#0b0b10']), size: 2, g: 0.1 });
      sc.spawnEnemy('follower', this.x, this.y, 'back');
      sc.ruleViolate('noHitSmile', '웃는 손님을 공격했다');
      return;
    }
    dmg = Math.round(dmg);
    this.hp -= dmg;
    this.flash = 8;
    if (stun) this.stun = stun;
    const kb = this.def.ai === 'turret' ? 0 : 2.6 * (1 + sc.D.m.knock);
    this.vx = dir * kb;
    if (this.def.ai === 'walker' || this.def.ai === 'hopper') this.vy = -1.6;
    sc.floatText(this.cx, this.y - 4, (crit ? '치명! ' : '') + dmg, crit ? '#f2d040' : '#ffffff');
    for (let i = 0; i < 5; i++) sc.particles.push({ x: this.cx, y: this.cy, vx: rnd(-1.5, 1.5) + dir, vy: rnd(-2, 0.5), life: 16, col: this.layer === 'back' ? '#ff5a8a' : '#c8d2e2', size: 2 });
    Sound.play('hit');
    Gfx.shake(1, 4);
    if (this.hp <= 0) this.die();
  }

  die() {
    const sc = this.sc;
    this.dead = true;
    sc.run.kills++;
    Sound.play('kill');
    for (let i = 0; i < 16; i++) sc.particles.push({ x: this.cx + rnd(-4, 4), y: this.cy + rnd(-6, 6), vx: rnd(-2, 2), vy: rnd(-2.5, 1), life: rndi(18, 34), col: pickR(['#0b0b10', '#ff5a8a', '#f4f0e6', '#5a2030']), size: rndi(1, 3), g: 0.08 });
    if (this.layer === 'back') {
      if (Math.random() < 0.38) sc.pickups.push(makePickup({ type: 'sanorb', x: this.cx - 4, y: this.cy - 4, layer: 'back' }));
      if (sc.D.ab.sanLeech) { sc.player.san = Math.min(sc.player.maxSan, sc.player.san + 3); sc.floatText(sc.player.cx, sc.player.y - 10, 'SAN +3', COL.san); }
    }
    sc.onKill(this);
  }

  draw(ctx, cam, ghost) {
    const sx = Math.round(this.x - cam.x), sy = Math.round(this.y - cam.y);
    let spr, ox = -2, oy = -2;
    const def = this.def;
    switch (def.sprite) {
      case 'noise': spr = SPR.noise[Math.floor(this.t / 4) % 4]; break;
      case 'sleeper':
        if (!this.awake) { spr = SPR.sleeperLying; ox = -8; oy = this.h - 9; break; }
        // falls through
      case 'follower': case 'echo': case 'smiler': case 'patient': case 'tenant': {
        const set = SPR[def.sprite];
        const moving = Math.abs(this.vx) > 0.2;
        const fi = !this.onGround && def.sprite === 'follower' ? 6 : moving ? 2 + Math.floor(this.t / 7) % 4 : Math.floor(this.t / 30) % 2;
        spr = (this.facing > 0 ? set.R : set.L)[fi];
        ox = -3;
        break;
      }
      case 'flyer': { const bl = this.t % 140; spr = SPR.flyer[bl < 6 ? 2 : bl < 10 ? 1 : 0]; break; }
      case 'notif': spr = SPR.notif[Math.floor(this.t / 8) % 2]; break;
      case 'ivbag': spr = SPR.ivbag[Math.floor(this.t / 12) % 2]; break;
      case 'steam': spr = SPR.steam[Math.floor(this.t / 9) % 3]; ox = -3; oy = -3; break;
      case 'xmark': spr = SPR.xmark[this.t % 100 < 10 ? 1 : 0]; break;
      case 'watcher': spr = SPR.watcher[this.moving ? Math.floor(this.t / 5) % 2 : 0]; oy = -3; break;
      case 'crawler': spr = (this.facing < 0 ? SPR.crawlerL : SPR.crawler)[Math.floor(this.t / 6) % 2]; oy = -4; break;
      default: break;
    }
    if (!spr) return;
    if (def.sprite === 'echo' || def.sprite === 'tenant') ctx.globalAlpha = (ghost ? 0.3 : 1) * this.alpha;
    ctx.drawImage(spr, sx + ox, sy + oy);
    ctx.globalAlpha = 1;
    if (this.flash > 0) {
      ctx.globalAlpha = this.flash / 8;
      ctx.drawImage(Gfx.white(spr), sx + ox, sy + oy);
      ctx.globalAlpha = 1;
    }
    if ((this.hp < this.maxHp || this.sc.D.m.sight) && !ghost) {
      Gfx.bar(ctx, sx + this.w / 2 - 8, sy - 6, 16, 2, this.hp / this.maxHp, '#ff5a8a');
    }
    if (this.stun > 0 && this.t % 6 < 3) { ctx.fillStyle = '#9ae8ff'; ctx.fillRect(sx + rndi(0, this.w), sy - 3, 2, 2); }
  }
}

// 적에게 닿았을 때 붙는 상태 이상
const ENEMY_HIT_EFFECT = { noise: 'erosion', crawler: 'slow', watcher: 'terror', notif: 'fear', echo: 'erosion', follower: 'fear', flyer: 'erosion',
  patient: 'fear', ivbag: 'erosion', sleeper: 'terror', steam: 'slow', tenant: 'fear', xmark: 'erosion' };

function makePickup(o) {
  return Object.assign({ w: 14, h: 14, t: Math.floor(Math.random() * 100), vy: 0, dead: false, by: o.y }, o);
}
