'use strict';
// ───────────────────────── 엔티티: 플레이어 / 적 / 투사체 ─────────────────────────

// 공격 종류: 피해 배율 / 시간 배율 / 경직 / 넉백 / 사거리 추가 / 앞으로 내딛기
const ATTACK_KINDS = {
  normal: { dmg: 1, dur: 0.95 },
  finisher: { dmg: 1.6, dur: 1.25, stun: 20, kb: 2.2, reach: 6, step: 6 },
  lunge: { dmg: 1.4, dur: 1, stun: 12, kb: 1.4, reach: 8 },
  heavy: { dmg: 2.2, dur: 1.2, stun: 40, kb: 3, reach: 10, step: 7 },
  thrust: { dmg: 1.3, dur: 0.9, stun: 10, kb: 1.4, reach: 12, step: 4 },
};
// 질주: 같은 방향을 이만큼(프레임) 누르면 가속, 배율
const SPRINT_AT = 22;
const SPRINT_MUL = 1.42;
// 잔상용 단색 실루엣 (색마다 캐시)
const _ghostCache = {};
function ghostOf(img, col) {
  const m = _ghostCache[col] || (_ghostCache[col] = new WeakMap());
  let g = m.get(img);
  if (!g) { g = Gfx.tint(img, col); m.set(img, g); }
  return g;
}

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
    // 기동: 구르기 / 백스텝 / 질주 / 돌진 베기 / 내려찍기
    this.rollT = 0; this.rollLen = 1; this.rollDir = 1; this.rollBack = false; this.rollCd = 0; this.rollInv = 0; this.rollDodged = false;
    this.postRoll = 0; this.dodgeCd = 0;
    this.sprintT = 0; this.sprinting = false; this.lastMx = 0;
    this.lungeT = 0; this.atkBonus = 1;
    this.dive = 0; this.diveCd = 0; this.diveLag = 0; this.diveY = 0;
    this.airDashUsed = false;
    this.ghosts = [];
    // 콤보 / 차지 / 가드
    this.combo = -1; this.comboT = 0; this.queued = false; this.atkKind = 'normal'; this.atkHeld = false;
    this.charging = false; this.chargeT = 0; this.heavyLv = 0;
    this.guarding = false; this.guardT = 0; this.parryCd = 0;
    this.stepT = 0;
  }
  get rolling() { return this.rollT > 0; }
  get moving() { return Math.abs(this.vx) > 0.4 || !this.onGround || this.atkT > 0 || this.dashT > 0 || this.rollT > 0 || this.dive > 0; }
  get cx() { return this.x + this.w / 2; }
  get cy() { return this.y + this.h / 2; }

  update() {
    const sc = this.sc, D = sc.D, lvl = sc.lvl;
    if (this.dead) return;
    if (this.inv > 0) this.inv--;
    if (this.atkCd > 0) this.atkCd--;
    if (this.flipCd > 0) this.flipCd--;
    if (this.dashCd > 0) this.dashCd--;
    if (this.rollCd > 0) this.rollCd--;
    if (this.rollInv > 0) this.rollInv--;
    if (this.postRoll > 0) this.postRoll--;
    if (this.dodgeCd > 0) this.dodgeCd--;
    if (this.diveCd > 0) this.diveCd--;
    if (this.comboT > 0) this.comboT--;
    if (this.parryCd > 0) this.parryCd--;
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

    // 구르기 · 백스텝 · 공중 대시 (Shift / 방향키 두 번 / 패드 B)
    const wantDash = ctrl && (Input.pressed('dash') || Input.tapDash);
    if (wantDash && this.rollT <= 0 && this.dive <= 0 && this.dashT <= 0 && this.hurtT <= 8) {
      const atkCancel = this.atkT <= 0 || 1 - this.atkT / this.atkTotal > 0.5;   // 공격 후딜은 구르기로 끊는다
      if (atkCancel && (this.onGround || this.coyote > 0) && this.rollCd <= 0) {
        const dir = Input.tapDash || mx;
        if (dir === 0) this.startRoll(-this.facing, true);
        else this.startRoll(dir, false);
      } else if (atkCancel && !this.onGround && D.ab.dash && !this.airDashUsed) {
        const dir = Input.tapDash || mx || this.facing;
        this.facing = dir; this.atkT = 0;
        this.dashT = 10; this.airDashUsed = true; this.rollInv = Math.max(this.rollInv, 10); this.rollDodged = false;
        this.vy = 0; this.sprinting = true;
        Sound.play('roll');
      }
    }
    if (this.diveLag > 0) { this.diveLag--; this.vx *= 0.6; }
    else if (this.dive > 0) {
      // 내려찍기: 곧장 떨어진다 (좌우는 살짝만)
      this.dive++;
      this.vx = approach(this.vx, mx * 0.8, 0.3);
      this.vy = Math.min(9, this.vy + 0.9);
    } else if (this.rollT > 0) {
      this.rollT--;
      const k = this.rollT / this.rollLen;
      const sp = this.rollBack ? 3.7 * (0.35 + 0.65 * k) : (2.7 + 2.5 * k);
      this.vx = this.rollDir * sp * sc.speedMul();
      if (this.rollT === 0) {
        this.postRoll = 12;
        // 각인 「잔상 폭발」: 구르기가 끝난 자리가 터진다
        if (sc.perk('afterburn') && !this.rollBack) {
          for (const e of sc.enemies) if (!e.dead && e.layer === this.layer && Math.hypot(e.cx - this.cx, e.cy - this.cy) < 30) this.dealHit(e, 8, sign(e.cx - this.cx) || 1, { stun: 10, src: 'perk', noBonus: true, crit: false });
          sc.shockRing = { x: this.cx, y: this.y + this.h, t: 12, layer: this.layer, col: '#9ae8ff' };
        }
      }
      if (!this.rollBack && sc.time % 3 === 0 && this.onGround) sc.particles.push({ x: this.cx - this.rollDir * 4, y: this.y + this.h - 1, vx: -this.rollDir * rnd(0.3, 1), vy: rnd(-0.6, -0.1), life: 14, col: '#a8a4b8', size: 1 });
    } else if (this.dashT > 0) {
      this.dashT--;
      this.vx = this.facing * 6.2;
      this.vy = 0;
      if (sc.time % 2 === 0) sc.particles.push({ x: this.cx, y: this.cy + rnd(-8, 8), vx: -this.facing * 0.5, vy: 0, life: 14, col: this.layer === 'back' ? '#ff5a8a' : '#f2c230', size: 2 });
    } else if (this.lungeT > 0) {
      // 돌진 베기
      this.lungeT--;
      this.vx = this.facing * (2.2 + this.lungeT * 0.35);
    } else if (this.stepT > 0) {
      // 마무리 일격·강공격의 앞으로 내딛기
      this.stepT--;
      this.vx = this.facing * (1 + this.stepT * 0.3);
    } else {
      // 질주: 같은 방향을 계속 누르면 가속한다
      if (this.onGround) {
        if (mx !== 0 && mx === this.lastMx && this.atkT <= 0) this.sprintT++;
        else if (mx !== this.lastMx || mx === 0) this.sprintT = 0;
        const was = this.sprinting;
        this.sprinting = this.sprintT >= SPRINT_AT;
        if (this.sprinting && !was) {
          Sound.play('sprint');
          for (let i = 0; i < 6; i++) sc.particles.push({ x: this.cx - mx * 5, y: this.y + this.h - 1, vx: -mx * rnd(0.5, 1.8), vy: rnd(-1, -0.2), life: 16, col: '#a8a4b8', size: rndi(1, 2) });
        }
      } else {
        // 공중: 질주 중이 아니었다면 가속은 다시 땅에서부터 (짧은 발판 연속 점프에선 질주가 붙지 않는다)
        if (!this.sprinting) this.sprintT = 0;
        else if (mx !== 0 && mx !== sign(this.vx)) this.sprinting = false;
      }
      this.lastMx = mx;
      const atkSlow = (this.atkT > 0 && this.onGround ? 0.45 : 1) * (this.charging || this.guarding ? 0.35 : 1);
      const target = mx * D.speed * (this.sprinting ? SPRINT_MUL * (sc.perk('runner') ? 1.1 : 1) : 1) * atkSlow * sc.speedMul();
      const turning = mx !== 0 && sign(mx) !== sign(this.vx) && Math.abs(this.vx) > 0.3;
      const acc = this.onGround ? (turning ? 0.9 : 0.5) : 0.3;
      this.vx = approach(this.vx, target, acc);
      if (mx !== 0 && this.atkT <= 0 && !this.guarding) this.facing = mx;
      if (this.sprinting && this.onGround && mx !== 0 && sc.time % 6 === 0) sc.particles.push({ x: this.cx - mx * 4, y: this.y + this.h - 1, vx: -mx * 0.6, vy: -0.3, life: 10, col: '#8a86a0', size: 1 });
    }

    // 점프
    if (this.onGround) { this.coyote = 6; this.airJumps = D.ab.doubleJump ? 1 : 0; this.airDashUsed = false; } else if (this.coyote > 0) this.coyote--;
    if (ctrl && Input.pressed('jump')) this.jumpBuf = 7;
    if (this.jumpBuf > 0) this.jumpBuf--;
    if (this.jumpBuf > 0 && ctrl) {
      if (Input.down('down') && this.onGround && this.standingOnPlatform()) {
        this.dropT = 12; this.jumpBuf = 0; this.y += 1;
      } else if (this.coyote > 0 && this.dive <= 0 && this.diveLag <= 0 && (this.rollT <= 0 || this.rollLen - this.rollT >= 5)) {
        // 구르기 도중 점프하면 구르기를 끊고 질주 속도를 그대로 가져간다
        if (this.rollT > 0) { this.rollT = 0; this.sprinting = !this.rollBack; this.sprintT = SPRINT_AT; }
        this.vy = -D.jumpV; this.coyote = 0; this.jumpBuf = 0; this.onGround = false;
        Sound.play('jump');
      } else if (this.airJumps > 0 && this.dashT <= 0 && this.dive <= 0) {
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

    if (this.dashT <= 0 && this.dive <= 0) {
      this.vy = Math.min(MAXFALL, this.vy + GRAV);
    }
    const wasGround = this.onGround;
    moveBody(this, lvl, this.layer);
    if (this.dive > 0 && this.onGround) this.diveImpact();
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
      this.hurt(10, 4, this.cx - this.facing * 10, 'trap');
      if (this.inv > 0) this.vy = -4;
    }

    // 낙하
    if (this.y > lvl.H * TS + 20) sc.onPitFall();

    // 공격
    this.updateAttackInput(ctrl);
    if (this.atkT > 0) this.updateAttack();
    if (this.dive > 0) this.updateDive();

    // 전환 / 아이템 / 상호작용
    if (ctrl && Input.pressed('flip')) sc.tryFlip();
    if (ctrl && Input.pressed('item')) { if (Input.down('down')) sc.cycleItem(); else sc.useItem(); }
    if (ctrl && Input.pressed('cycle')) sc.cycleItem();
    if (ctrl && Input.pressed('interact')) sc.tryInteract();

    // 잔상
    const fast = this.rollT > 0 || this.dashT > 0 || this.dive > 0 || this.lungeT > 0 || (this.sprinting && Math.abs(this.vx) > D.speed * 1.1);
    if (fast && sc.time % 3 === 0) this.ghosts.push({ x: this.x, y: this.y, facing: this.facing, frame: this.frame, roll: this.rollT > 0 && !this.rollBack ? this.rollFrame() : -1, life: 12, col: this.layer === 'back' ? '#ff5a8a' : this.rollInv > 0 ? '#9ae8ff' : '#f2c230' });
    for (const g of this.ghosts) g.life--;
    this.ghosts = this.ghosts.filter((g) => g.life > 0);

    // 애니메이션
    this.anim++;
    if (this.hurtT > 10) this.frame = 11;
    else if (this.dive > 0 || this.diveLag > 0) this.frame = this.diveLag > 0 ? 10 : 7;
    else if (this.rollT > 0 && this.rollBack) this.frame = 6;
    else if (this.atkT > 0) {
      const w = sc.D.weapon;
      const p = 1 - this.atkT / this.atkTotal;
      this.frame = w.ranged ? 9 : p < 0.25 ? 8 : p < 0.6 ? 9 : 10;
    } else if (!this.onGround) this.frame = this.vy < 0 ? 6 : 7;
    else if (Math.abs(this.vx) > 0.3) this.frame = 2 + Math.floor(this.anim / (this.sprinting ? 4 : 6)) % 4;
    else this.frame = Math.floor(this.anim / 30) % 2;
  }

  rollFrame() { return Math.floor((this.rollLen - this.rollT) / 3) % 4; }
  startRoll(dir, back) {
    const sc = this.sc, D = sc.D;
    this.atkT = 0; this.lungeT = 0; this.stepT = 0; this.queued = false;
    this.charging = false; this.chargeT = 0; this.guarding = false;
    this.rollBack = back; this.rollDir = dir;
    this.rollLen = this.rollT = back ? 11 : 18;
    if (!back) this.facing = dir;
    this.rollInv = back ? 9 : 14; this.rollDodged = false;
    this.rollCd = this.rollT + Math.round((D.ab.dash ? 6 : 12) * (sc.perk('doubleroll') ? 0.4 : 1));
    this.rollStartX = this.x;
    if (back) this.vy = -1.6;
    this.sprintT = back ? 0 : SPRINT_AT; this.sprinting = false;
    Sound.play(back ? 'step' : 'roll');
    for (let i = 0; i < 5; i++) sc.particles.push({ x: this.cx, y: this.y + this.h - 1, vx: -dir * rnd(0.4, 1.6), vy: rnd(-0.8, -0.1), life: 16, col: '#a8a4b8', size: rndi(1, 2) });
    if (!sc.s.flags.hintRoll) sc.s.flags.hintRoll = true;
  }
  startDive() {
    const sc = this.sc;
    this.dive = 1; this.diveY = this.y; this.atkT = 0; this.lungeT = 0; this.dashT = 0; this.rollT = 0;
    this.vy = 3.5; this.vx *= 0.3; this.sprinting = false;
    this.rollInv = Math.max(this.rollInv, 6); this.rollDodged = true;
    this.hitSet.clear();
    Sound.play('dive');
    if (!sc.s.flags.hintDive) sc.s.flags.hintDive = true;
  }
  updateDive() {
    // 떨어지는 동안 몸으로 부딪힌 존재에게도 피해
    const sc = this.sc, w = sc.D.weapon;
    const box = { x: this.x - 2, y: this.y + this.h - 6, w: this.w + 4, h: 10 };
    for (const e of sc.enemies) {
      if (e.dead || e.layer !== this.layer || this.hitSet.has(e)) continue;
      if (overlap(box, e)) { this.hitSet.add(e); this.dealHit(e, w.dmg * 0.8, sign(e.cx - this.cx) || 1, { stun: 10, src: 'dive', noBonus: true, crit: false }); }
    }
    if (this.dive > 150) { this.dive = 0; this.diveCd = 20; }   // 너무 오래 떨어지면 풀린다
  }
  diveImpact() {
    const sc = this.sc, w = sc.D.weapon;
    const fall = Math.max(0, this.y - this.diveY);
    const k = (1.2 + Math.min(0.8, fall / 160)) * (w.diveMul || 1) * (sc.perk('meteor') ? 1.4 : 1);   // 높이 떨어질수록 세다
    const R = 34 * (sc.perk('meteor') ? 1.5 : 1), fx = this.cx, fy = this.y + this.h;
    const crit = this.st.has('focus');
    this.atkBonus = 1;
    this.diveKills = 0;
    let n = 0;
    for (const e of sc.enemies) {
      if (e.dead || e.layer !== this.layer) continue;
      if (Math.abs(e.cx - fx) < R && Math.abs(e.y + e.h - fy) < 30) { this.dealHit(e, w.dmg * k, sign(e.cx - fx) || 1, { stun: 30, kb: 1.5, crit, src: 'dive' }); n++; }
    }
    if (sc.boss && !sc.boss.dead && this.layer === 'back') {
      const b = sc.boss.hitbox();
      if (fx > b.x - R && fx < b.x + b.w + R && fy > b.y - 10 && fy < b.y + b.h + 30) this.dealHit(sc.boss, w.dmg * k, sign(sc.boss.cx - fx) || 1, { crit, src: 'dive' });
    }
    if (n >= 3) Achieve.unlock('meteor3');
    if (crit) this.st.remove('focus');
    this.dive = 0; this.diveLag = 8; this.diveCd = 24; this.vx = 0;
    Sound.play('slam');
    Gfx.shake(3 + Math.round(k), 10);
    for (let i = 0; i < 18; i++) {
      const d = i % 2 ? 1 : -1;
      sc.particles.push({ x: fx + d * rnd(0, 6), y: fy - 1, vx: d * rnd(0.8, 3.2), vy: rnd(-2.4, -0.4), life: rndi(14, 24), col: this.layer === 'back' ? pickR(['#ff5a8a', '#5a2030']) : pickR(['#a8a4b8', '#f2c230']), size: rndi(1, 3), g: 0.12 });
    }
    sc.shockRing = { x: fx, y: fy, t: 14, layer: this.layer };
  }
  // 무적 시간 안에 공격이 닿았다 = 아슬아슬하게 피했다
  perfectDodge(kind) {
    const sc = this.sc;
    if (kind === 'body') return;               // 그냥 몸을 뚫고 지나간 건 보상 없음 (무적만)
    if (this.rollDodged) return;
    this.rollDodged = true;
    if (this.dodgeCd > 0) return;
    this.dodgeCd = 60;
    sc.run.dodges = (sc.run.dodges || 0) + 1;
    Achieve.add('dodge');
    if (sc.run.dodges >= 10) Achieve.unlock('dodgeRun10');
    this.st.add('focus', sc.perk('focusplus') ? 300 : 150);
    sc.addFear(-8);
    sc.floatText(this.cx, this.y - 12, '아슬아슬!', '#9ae8ff');
    Sound.play('dodge');
    for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; sc.particles.push({ x: this.cx, y: this.cy, vx: Math.cos(a) * 2.2, vy: Math.sin(a) * 2.2, life: 16, col: '#9ae8ff', size: 1 }); }
    sc.slowT = Math.max(sc.slowT || 0, sc.perk('focusplus') ? 54 : 36);   // 진짜 공격을 피하면 잠깐 세상이 느려진다
    if (!sc.s.flags.hintDodge) { sc.s.flags.hintDodge = true; sc.showHint('아슬아슬 회피! 잠깐 시간이 느려지고, 다음 공격은 반드시 치명타(집중).'); }
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

  // ── 공격 입력: 탭 = 콤보, 누른 채 첫 타가 끝나면 차지(우산은 가드, 분사 무기는 연사) ──
  updateAttackInput(ctrl) {
    const sc = this.sc, w = sc.D.weapon;
    const down = ctrl && Input.down('attack');
    if (!down) this.atkHeld = false;
    if (ctrl && Input.pressed('attack') && this.dive <= 0 && this.diveLag <= 0) {
      if (!this.onGround && Input.down('down') && this.diveCd <= 0 && this.dashT <= 0) { this.startDive(); return; }
      if (this.atkT > 0 && !w.ranged && !w.auto) this.queued = true;
      else if (this.atkCd <= 0 && this.dashT <= 0 && !this.charging && !this.guarding) { this.startAttack(); this.atkHeld = true; }
    }
    // 연사 무기: 누르고 있으면 계속
    if ((w.ranged || w.auto) && down && this.atkCd <= 0 && this.atkT <= 0 && this.dashT <= 0 && this.rollT <= 0 && this.dive <= 0) this.startAttack();
    if (w.ranged || w.auto) return;
    // 차지 / 가드 시작
    if (down && this.atkHeld && this.atkT <= 0 && !this.charging && !this.guarding && this.rollT <= 0 && this.dive <= 0 && this.hurtT <= 0) {
      if (w.guard) { this.guarding = true; this.guardT = 0; Sound.play('menu'); }
      else { this.charging = true; this.chargeT = 0; }
    }
    if (this.guarding) {
      this.guardT++;
      if (!down || this.rollT > 0) {
        this.guarding = false;
        if (!down && this.rollT <= 0) this.startAttack('thrust');
      }
    }
    if (this.charging) {
      const k = sc.perk('chargemaster') ? 0.6 : 1;
      const L1 = Math.round(18 * k), L2 = Math.round(44 * k);
      this.chargeT++;
      if (this.chargeT === L1 || this.chargeT === L2) { Sound.play('charge'); sc.floatText(this.cx, this.y - 10, this.chargeT === L2 ? '최대 차지' : '차지', '#ffd27a'); }
      if (this.chargeT >= L1 && sc.time % 3 === 0) sc.particles.push({ x: this.cx + rnd(-8, 8), y: this.cy + rnd(-10, 6), vx: 0, vy: -0.6, life: 14, col: this.chargeT >= L2 ? '#ff9a3a' : '#ffd27a', size: 1 });
      if (!down) {
        this.charging = false;
        if (this.chargeT >= L1) { this.heavyLv = this.chargeT >= L2 ? 2 : 1; this.startAttack('heavy'); }
        this.chargeT = 0;
      }
    }
  }

  startAttack(force) {
    const sc = this.sc, w = sc.D.weapon;
    // 구르기 중·직후, 또는 질주 중이면 돌진 베기
    const lunge = !force && !w.ranged && !w.cone && (this.rollT > 0 || this.postRoll > 0 || (this.sprinting && Math.abs(this.vx) > sc.D.speed * 1.1));
    if (this.rollT > 0) { this.rollT = 0; }
    let kind = force || 'normal';
    if (kind === 'normal') {
      if (lunge) kind = 'lunge';
      else if (!w.ranged && !w.cone) {
        this.combo = this.comboT > 0 && this.combo < 2 ? this.combo + 1 : 0;
        if (this.combo === 2) kind = 'finisher';
      }
    }
    if (kind !== 'normal' && kind !== 'finisher') this.combo = -1;
    this.atkKind = kind;
    const M = ATTACK_KINDS[kind];
    this.atkBonus = M.dmg * (kind === 'normal' && this.combo === 1 ? 1.1 : 1) * (kind === 'heavy' ? (this.heavyLv === 2 ? 1.45 : 1) : 1);
    if (kind === 'finisher' && sc.perk('finisher')) this.atkBonus *= 1.5;
    if (kind === 'lunge' && sc.perk('runner')) this.atkBonus *= 1.6;
    this.lungeT = kind === 'lunge' ? 9 : 0;
    this.stepT = M.step || 0;
    this.lunging = kind === 'lunge';
    this.queued = false;
    this.sprinting = false; this.sprintT = 0;
    if (kind === 'lunge') this.postRoll = 0;
    const base = Math.max(8, Math.round(w.cd * sc.D.atkCdMul * sc.atkSpdMul()));
    this.atkTotal = Math.max(8, Math.round(base * M.dur * (kind === 'normal' && this.combo === 1 ? 0.9 : 1)));
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
    } else if (w.cone) {
      this.coneBurst();
    } else Sound.play(kind === 'heavy' || kind === 'finisher' ? 'heavy' : 'swing');
    if (kind === 'heavy') this.heavyBurst();
    // 폭주: 분노 3중첩 이상이면 충격파
    if (sc.D.m.rageWave && this.st.stacks('rage') >= 3) {
      sc.projectiles.push({ x: this.cx + this.facing * 10, y: this.y + 10, vx: this.facing * 4.2, vy: 0, r: 6, dmg: w.dmg * sc.dmgMul(false) * 0.7, layer: this.layer, from: 'player', life: 40, col: '#ff9a3a', kind: 'rwave', pierce: true });
    }
  }

  // 소화기: 앞쪽 원뿔에 바로 분사
  coneBurst() {
    const sc = this.sc, w = sc.D.weapon;
    Sound.play('spray');
    const box = { x: this.facing > 0 ? this.x + this.w : this.x - w.reach, y: this.y - 4, w: w.reach, h: this.h + 6 };
    for (let i = 0; i < 4; i++) sc.particles.push({ x: this.cx + this.facing * 8, y: this.y + 10 + rnd(-2, 2), vx: this.facing * rnd(2, 4.2), vy: rnd(-0.8, 0.8), life: rndi(10, 16), col: pickR(['#f4f8ff', '#d8e4f0', '#ffffff']), size: rndi(2, 3) });
    for (const e of sc.enemies) if (!e.dead && e.layer === this.layer && overlap(box, e)) this.dealHit(e, w.dmg, this.facing, { stun: 0, kb: 0.7, src: 'cone' });
    if (sc.boss && !sc.boss.dead && this.layer === 'back' && overlap(box, sc.boss.hitbox())) this.dealHit(sc.boss, w.dmg, this.facing, { src: 'cone' });
  }

  // 차지 강공격: 무기마다 다른 추가 효과
  heavyBurst() {
    const sc = this.sc, w = sc.D.weapon, hk = w.heavyKind;
    Gfx.shake(2 + this.heavyLv, 8);
    if (hk === 'quake') {
      for (const d of [-1, 1]) sc.projectiles.push({ x: this.cx + d * 10, y: this.y + this.h - 6, vx: d * 3.4, vy: 0, r: 7, dmg: w.dmg * sc.dmgMul(false) * (this.heavyLv === 2 ? 1.2 : 0.8), layer: this.layer, from: 'player', life: 34, col: '#c8a878', kind: 'quake', pierce: true });
      Sound.play('slam');
    } else if (hk === 'discharge') {
      const R = this.heavyLv === 2 ? 60 : 44;
      for (const e of sc.enemies) if (!e.dead && e.layer === this.layer && Math.hypot(e.cx - this.cx, e.cy - this.cy) < R) this.dealHit(e, w.dmg * 1.2 * this.heavyLv, sign(e.cx - this.cx) || 1, { stun: 60, src: 'heavy' });
      if (sc.boss && !sc.boss.dead && this.layer === 'back' && Math.hypot(sc.boss.cx - this.cx, sc.boss.cy - this.cy) < R + 20) this.dealHit(sc.boss, w.dmg * 1.2 * this.heavyLv, 1, { src: 'heavy' });
      sc.shockRing = { x: this.cx, y: this.cy + 8, t: 14, layer: this.layer, col: '#9ae8ff' };
      Sound.play('zap');
    }
  }

  attackBox() {
    const w = this.sc.D.weapon, M = ATTACK_KINDS[this.atkKind] || ATTACK_KINDS.normal;
    const reach = w.reach + (M.reach || 0);
    // 대걸레 차지 = 회전 베기 (앞뒤 모두)
    if (this.atkKind === 'heavy' && w.heavyKind === 'spin') return { x: this.x - reach, y: this.y - 6, w: this.w + reach * 2, h: this.h + 8 };
    return { x: this.facing > 0 ? this.x + this.w - 2 : this.x - reach + 2, y: this.y - 2 - (M.reach ? 3 : 0), w: reach, h: this.h + (M.reach ? 6 : 0) };
  }

  updateAttack() {
    const sc = this.sc, w = sc.D.weapon;
    this.atkT--;
    if (this.atkT <= 0) {
      // 콤보 창: 끝난 직후 잠깐 다음 타를 받는다
      this.comboT = this.atkKind === 'finisher' || this.atkKind === 'heavy' ? 0 : 16;
      if (this.atkKind === 'finisher') this.combo = -1;
      if (this.queued && !w.ranged && !w.cone) { this.atkCd = 0; this.startAttack(); }
      return;
    }
    if (w.ranged || w.cone) return;
    const p = 1 - this.atkT / this.atkTotal;
    if (p > 0.22 && p < 0.62) {
      const box = this.attackBox();
      const M = ATTACK_KINDS[this.atkKind];
      const opt = { stun: (w.stun || 0) + (M.stun || 0), kb: M.kb || 1, src: this.atkKind };
      for (const e of sc.enemies) {
        if (e.dead || e.layer !== this.layer || this.hitSet.has(e)) continue;
        if (overlap(box, e)) { this.hitSet.add(e); this.dealHit(e, w.dmg, this.atkKind === 'heavy' && w.heavyKind === 'spin' ? sign(e.cx - this.cx) || 1 : this.facing, opt); }
      }
      if (sc.boss && !sc.boss.dead && this.layer === 'back' && !this.hitSet.has(sc.boss) && overlap(box, sc.boss.hitbox())) {
        this.hitSet.add(sc.boss);
        this.dealHit(sc.boss, w.dmg, this.facing, opt);
      }
    }
  }

  // ── 모든 플레이어 피해가 거쳐 가는 곳: 치명타·집중·각인·무기 효과 ──
  dealHit(t, base, dir, opt = {}) {
    const sc = this.sc, w = sc.D.weapon, isBoss = t instanceof Boss;
    let dmg = base * sc.dmgMul(isBoss) * (opt.noBonus ? 1 : this.atkBonus || 1);
    const crit = opt.crit != null ? opt.crit : Math.random() < sc.critChance();
    if (crit) dmg *= sc.D.critMul;
    if (sc.perk('executioner') && t.hp < t.maxHp * 0.3) dmg *= 1.5;
    if (sc.perk('feareater') && this.fear >= 50) dmg *= 1.25;
    if (sc.perk('backborn')) dmg *= this.layer === 'back' ? 1.15 : 0.9;
    if (sc.perk('lastresort') && this.hp < this.maxHp * 0.25) dmg *= 1.2;
    const heavyish = opt.src === 'heavy' || opt.src === 'dive' || opt.src === 'finisher';
    if (isBoss) t.hurt(dmg, dir, crit);
    else {
      // 방패 정예: 앞에서 오는 가벼운 공격은 막힌다
      if (t.elite && t.elite.includes('shielded') && !heavyish && sign(this.cx - t.cx) === t.facing) { dmg *= 0.2; sc.floatText(t.cx, t.y - 12, '막힘', '#c8d0e0'); Sound.play('deny'); }
      t.hurt(dmg, dir, opt.stun || 0, crit, { kb: opt.kb || 1 });
      if (w.kind === 'extinguisher' && opt.src === 'cone') t.chillT = 120;
      if (w.shock && opt.src !== 'chain') {
        t.shock = (t.shock || 0) + 1;
        if (t.shock >= 3) { t.shock = 0; this.chainLightning(t, w.dmg * 1.1, 2); }
      }
      if (sc.perk('static') && opt.src !== 'chain' && Math.random() < 0.15) this.chainLightning(t, 8, 1);
      if (t.dead) this.onKillBy(t, opt.src);
    }
    if (crit && this.st.has('focus')) this.st.remove('focus');
    if (opt.src === 'finisher') { Gfx.shake(2, 6); Achieve.add('finisher'); }
    return dmg;
  }
  onKillBy(e, src) {
    const sc = this.sc;
    if (src === 'heavy') Achieve.add('heavyKill');
    if (src === 'dive') this.diveKills = (this.diveKills || 0) + 1;
    if (sc.perk('vampire')) { this.hp = Math.min(this.maxHp, this.hp + 3); }
  }
  // 번개가 근처 존재로 튄다
  chainLightning(from, dmg, n) {
    const sc = this.sc;
    const targets = sc.enemies.filter((e) => !e.dead && e !== from && e.layer === from.layer && Math.hypot(e.cx - from.cx, e.cy - from.cy) < 80)
      .sort((a, b) => Math.hypot(a.cx - from.cx, a.cy - from.cy) - Math.hypot(b.cx - from.cx, b.cy - from.cy)).slice(0, n);
    let prev = from;
    for (const e of targets) {
      sc.bolts.push({ x0: prev.cx, y0: prev.cy, x1: e.cx, y1: e.cy, t: 10, layer: e.layer });
      this.dealHit(e, dmg, sign(e.cx - prev.cx) || 1, { stun: 20, src: 'chain', noBonus: true, crit: false });
      prev = e;
    }
    if (targets.length) Sound.play('zap');
  }
  // 우산: 펼치는 순간에 막으면 패링
  parry(kind, from) {
    const sc = this.sc;
    if (this.parryCd > 0) return;
    this.parryCd = 30;
    sc.run.parries = (sc.run.parries || 0) + 1;
    Achieve.add('parry');
    this.st.add('focus', sc.perk('focusplus') ? 300 : 150);
    sc.slowT = Math.max(sc.slowT || 0, sc.perk('focusplus') ? 54 : 36);
    sc.floatText(this.cx, this.y - 12, '패링!', '#ffd27a');
    Sound.play('parry');
    for (let i = 0; i < 10; i++) sc.particles.push({ x: this.cx + this.facing * 10, y: this.cy, vx: this.facing * rnd(0.5, 2.5), vy: rnd(-2, 2), life: 14, col: '#ffd27a', size: 1 });
    if (from && !(from instanceof Boss) && from.hurt) { from.stun = Math.max(from.stun || 0, 50); from.vx = this.facing * 3; }
  }

  hurt(dmg, san, fromX, kind, from) {
    const sc = this.sc;
    if (this.dead || sc.locked) return false;
    if (this.rollInv > 0 && kind !== 'trap') { this.perfectDodge(kind); return false; }
    if (this.inv > 0) return false;
    let blocked = false;
    if (this.guarding && kind !== 'trap' && (sign(fromX - this.cx) === this.facing || Math.abs(fromX - this.cx) < 4)) {
      if (this.guardT <= 10 && this.parryCd <= 0) { this.parry(kind, from); this.inv = 20; return false; }
      dmg *= 0.25; san *= 0.5; blocked = true;
    }
    if (sc.perk('lastresort') && this.hp < this.maxHp * 0.25) dmg *= 0.7;
    if (sc.perk('greed')) dmg *= 1.15;
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
    this.inv = blocked ? 24 : 60; this.hurtT = blocked ? 0 : 20;
    const dir = this.cx < fromX ? -1 : 1;
    this.vx = dir * (blocked ? 1.4 : 2.6); this.vy = blocked ? 0 : -2.8;
    if (blocked) { Sound.play('stamp'); sc.floatText(this.cx, this.y - 14, '막음', '#c8d0e0'); }
    this.dashT = 0; this.rollT = 0; this.lungeT = 0; this.stepT = 0; this.sprinting = false; this.sprintT = 0;
    this.charging = false; this.chargeT = 0; this.queued = false;
    if (this.dive > 0) { this.dive = 0; this.diveCd = 20; }
    sc.run.damage += dmg;
    Gfx.shake(3, 10);
    Sound.play('hurt');
    sc.floatText(this.cx, this.y - 4, '-' + Math.round(dmg * lowSan), '#ff6a6a');
    for (let i = 0; i < 8; i++) sc.particles.push({ x: this.cx, y: this.cy, vx: rnd(-2, 2), vy: rnd(-3, 0), life: 20, col: '#e0474c', size: 2, g: 0.15 });
    sc.onPlayerHurt(dmg);
    return true;
  }

  draw(ctx, cam) {
    const set = SPR.player;
    // 잔상
    for (const g of this.ghosts) {
      const img = g.roll >= 0 ? (g.facing > 0 ? SPR.playerRoll.R : SPR.playerRoll.L)[g.roll] : (g.facing > 0 ? set.R : set.L)[g.frame];
      ctx.globalAlpha = (g.life / 12) * 0.38;
      ctx.drawImage(ghostOf(img, g.col), Math.round(g.x - 3 - cam.x), Math.round(g.y + (g.roll >= 0 ? 8 : -2) - cam.y));
    }
    ctx.globalAlpha = 1;
    if (this.inv > 0 && this.hurtT <= 0 && Math.floor(this.inv / 3) % 2 === 0 && this.dashT <= 0) return;
    // 구르기: 몸을 말아 굴러간다
    if (this.rollT > 0 && !this.rollBack) {
      const rr = (this.facing > 0 ? SPR.playerRoll.R : SPR.playerRoll.L)[this.rollFrame()];
      ctx.drawImage(rr, Math.round(this.x - 3 - cam.x), Math.round(this.y + 8 - cam.y));
      if (this.rollInv > 0 && this.sc.time % 4 < 2) { ctx.globalAlpha = 0.35; ctx.drawImage(ghostOf(rr, '#ffffff'), Math.round(this.x - 3 - cam.x), Math.round(this.y + 8 - cam.y)); ctx.globalAlpha = 1; }
      return;
    }
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
    if (this.dive > 0) ang = 1.45;            // 내려찍기: 무기를 아래로
    else if (this.diveLag > 0) ang = 1.1;
    if (this.guarding) ang = 0;
    if (this.charging) ang = -2.3;             // 차지: 무기를 뒤로 젖힌다
    if (this.atkKind === 'thrust' && this.atkT > 0) ang = -0.05;
    if (this.layer === 'back') { ctx.globalAlpha = 1; }
    ctx.drawImage(fr, sx, sy);
    const chargeL1 = Math.round(18 * (this.sc.perk('chargemaster') ? 0.6 : 1)), chargeL2 = Math.round(44 * (this.sc.perk('chargemaster') ? 0.6 : 1));
    drawWeapon(ctx, w.kind, hx, hy, ang, this.facing, { open: this.guarding, glow: this.charging && this.chargeT >= chargeL1 ? (this.chargeT >= chargeL2 ? '#ff9a3a' : '#ffd27a') : null });
    // 베기 이펙트 (마무리·강공격은 크고 금색, 대걸레 차지는 한 바퀴)
    if (this.atkT > 0 && !w.ranged && !w.cone) {
      const p = 1 - this.atkT / this.atkTotal;
      const k = this.atkKind, M = ATTACK_KINDS[k] || ATTACK_KINDS.normal;
      if (p > 0.25 && p < 0.7) {
        const cx = this.cx - cam.x, cy = this.cy - cam.y - 2;
        const big = k === 'heavy' || k === 'finisher';
        ctx.fillStyle = big ? (this.layer === 'back' ? 'rgba(255,190,120,0.95)' : 'rgba(255,214,122,0.95)') : this.layer === 'back' ? 'rgba(255,120,160,0.85)' : 'rgba(255,255,255,0.85)';
        const r = w.reach + (M.reach || 0);
        if (k === 'thrust') {
          for (let d = 6; d < r + 6; d += 2) ctx.fillRect(Math.round(cx + d * this.facing), Math.round(cy - 1), 2, 2);
        } else {
          const spin = k === 'heavy' && w.heavyKind === 'spin';
          const a0 = spin ? -Math.PI : -1.3, a1 = spin ? lerp(-Math.PI, Math.PI, clamp((p - 0.25) / 0.4, 0, 1)) : lerp(-1.3, 1.0, clamp((p - 0.25) / 0.3, 0, 1));
          const sz = big ? 3 : 2;
          for (let a = a0; a <= a1; a += 0.12) {
            const x = cx + Math.cos(a) * r * this.facing, y = cy + Math.sin(a) * r * 0.75;
            ctx.fillRect(Math.round(x), Math.round(y), sz, sz);
            ctx.fillRect(Math.round(cx + Math.cos(a) * (r - 4) * this.facing), Math.round(cy + Math.sin(a) * (r - 4) * 0.75), 1, 1);
          }
        }
      }
    }
    // 콤보 단계 표시 (머리 위 작은 점)
    if (this.comboT > 0 || this.atkT > 0) {
      const n = this.atkKind === 'finisher' ? 3 : this.combo + 1;
      for (let i = 0; i < 3 && n > 0; i++) { ctx.fillStyle = i < n ? (n === 3 ? '#ffd27a' : '#f4f0e6') : 'rgba(255,255,255,0.2)'; ctx.fillRect(Math.round(this.cx - cam.x) - 5 + i * 4, Math.round(this.y - cam.y) - 7, 2, 2); }
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
    if (this.chillT > 0) {
      this.chillT--;
      if (this.t % 12 === 0) sc.particles.push({ x: this.cx + rnd(-5, 5), y: this.y + rnd(0, this.h), vx: 0, vy: 0.3, life: 18, col: '#d8f0ff', size: 1 });
      if (this.t % 2 === 0) return;
    }
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
    if (this.dmg > 0 && !(this.def.ai === 'sleeper' && !this.awake) && sameLayer && overlap(this, p) && p.hurt(this.dmg, this.san, this.cx, (this.lungeT > 0 || this.def.ai === 'watcher') ? 'attack' : 'body', this)) { sc.applyHitEffect(ENEMY_HIT_EFFECT[this.type]); this.onHitPlayer(); }
  }

  hurt(dmg, dir, stun = 0, crit = false, opt = {}) {
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
    const kb = this.def.ai === 'turret' ? 0 : 2.6 * (1 + sc.D.m.knock) * (opt.kb || 1) * (this.elite ? 0.5 : 1);
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
    if (this.died) return;      // 같은 프레임에 두 번 쓰러지지 않게
    this.died = true;
    this.dead = true;
    sc.run.kills++;
    if (codexAdd(sc.s, 'enemy', this.type)) sc.floatText(this.cx, this.y - 14, '도감 등록', '#c8a04a');
    Sound.play('kill');
    for (let i = 0; i < 16; i++) sc.particles.push({ x: this.cx + rnd(-4, 4), y: this.cy + rnd(-6, 6), vx: rnd(-2, 2), vy: rnd(-2.5, 1), life: rndi(18, 34), col: pickR(['#0b0b10', '#ff5a8a', '#f4f0e6', '#5a2030']), size: rndi(1, 3), g: 0.08 });
    if (this.layer === 'back') {
      if (Math.random() < 0.38) sc.pickups.push(makePickup({ type: 'sanorb', x: this.cx - 4, y: this.cy - 4, layer: 'back' }));
      if (sc.D.ab.sanLeech) { sc.player.san = Math.min(sc.player.maxSan, sc.player.san + 3); sc.floatText(sc.player.cx, sc.player.y - 10, 'SAN +3', COL.san); }
    }
    if (this.elite) this.eliteDeath();
    sc.onKill(this);
  }
  // ── 정예 ──
  makeElite(affixes) {
    this.elite = affixes;
    this.hp = Math.round(this.hp * 2.5); this.maxHp = this.hp;
    this.dmg = Math.round(this.dmg * 1.3);
    if (affixes.includes('swift')) this.spd *= 1.6;
  }
  onHitPlayer() {
    const sc = this.sc, p = sc.player;
    if (!this.elite) return;
    if (this.elite.includes('leech')) { p.san -= 8; this.hp = Math.min(this.maxHp, this.hp + this.maxHp * 0.15); sc.floatText(this.cx, this.y - 10, '흡혈', '#ff5a6a'); }
    if (this.elite.includes('cursed')) sc.applyHitEffect('erosion');
  }
  eliteDeath() {
    const sc = this.sc;
    Achieve.add('elite');
    sc.run.elites = (sc.run.elites || 0) + 1;
    sc.floatText(this.cx, this.y - 16, '정예 처치!', '#ffd27a');
    Gfx.shake(3, 10);
    const rng = new RNG(Math.floor(this.x * 7 + this.y * 13 + sc.time));
    sc.pickups.push(makePickup({ type: 'cash', amount: 6000 * sc.diff, x: this.cx - 6, y: this.cy - 8, layer: 'front' }));
    if (rng.chance(0.3)) sc.pickups.push(makePickup({ type: 'artifact', id: rollArtifact(rng, sc.theme, sc.diff, sc.s.stats.luk), x: this.cx - 7, y: this.y - 6, layer: this.layer }));
    if (this.elite.includes('split')) {
      for (const d of [-1, 1]) {
        const e = sc.spawnEnemy(this.type, this.x + d * 6, this.y - 2, this.layer);
        e.hp = e.maxHp = Math.max(4, Math.round(e.maxHp * 0.45)); e.vx = d * 2.5; e.vy = -2.5; e.stun = 20;
      }
    }
    if (this.elite.includes('volatile')) sc.bombs.push({ x: this.cx, y: this.cy, t: 54, r: 38, dmg: this.dmg + 6, layer: this.layer });
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
    if (this.elite && !ghost) {
      const col = ELITE_AFFIX[this.elite[0]].col;
      ctx.globalAlpha = 0.55 + Math.sin(this.t * 0.15) * 0.25;
      const g = ghostOf(spr, col);
      for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) ctx.drawImage(g, sx + ox + dx, sy + oy + dy);
      ctx.globalAlpha = 1;
    }
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
    if (this.elite && !ghost && Math.abs(this.cx - this.sc.player.cx) < 160) {
      const label = '정예 · ' + this.elite.map((a) => ELITE_AFFIX[a].name).join('·');
      Gfx.text(ctx, label, sx + this.w / 2, sy - 16, ELITE_AFFIX[this.elite[0]].col, { small: true, align: 'center', shadow: true });
      if (this.elite.includes('shielded')) { ctx.fillStyle = '#c8d0e0'; const fx = this.facing > 0 ? sx + this.w + 1 : sx - 3; ctx.fillRect(fx, sy + 2, 2, this.h - 4); }
    }
  }
}

// 적에게 닿았을 때 붙는 상태 이상
const ENEMY_HIT_EFFECT = { noise: 'erosion', crawler: 'slow', watcher: 'terror', notif: 'fear', echo: 'erosion', follower: 'fear', flyer: 'erosion',
  patient: 'fear', ivbag: 'erosion', sleeper: 'terror', steam: 'slow', tenant: 'fear', xmark: 'erosion' };

function makePickup(o) {
  return Object.assign({ w: 14, h: 14, t: Math.floor(Math.random() * 100), vy: 0, dead: false, by: o.y }, o);
}
