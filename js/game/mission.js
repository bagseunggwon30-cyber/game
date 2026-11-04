'use strict';
// ───────────────────────── 임무 씬 (실제 플레이) ─────────────────────────
class MissionScene {
  constructor(job) {
    this.job = job;
    this.s = Game.state;
    this.D = derive(this.s);
    this.story = job.story ? STORY_MISSIONS.find((m) => m.id === job.story) : null;
    this.diff = job.diff;
    this.theme = job.theme;
    this.th = THEMES[job.theme];
    this.obj = job.obj;
    const randomDoc = !this.story && Math.random() < 0.3 + 0.04 * this.s.stats.luk + this.D.m.docChance ? this.pickRandomDoc() : null;
    this.gen = generateMission({
      theme: job.theme, obj: job.obj, diff: job.diff, seed: job.seed, luk: this.s.stats.luk,
      tutorial: this.story && this.story.tutorial, doc: this.story ? this.story.doc : null, randomDoc,
      boss: this.story && this.story.boss, extraArt: this.D.m.extraArt,
    });
    this.lvl = this.gen.lvl;
    this.tiles = buildTiles(job.theme);
    this.player = new Player(this.gen.start.x, this.gen.start.y, this);
    this.player.shield = 0;
    this.enemies = this.gen.enemies.map((e) => new Enemy(e.type, e.x, e.y, e.layer, this, this.diff));
    this.pickups = this.gen.pickups.map((p) => makePickup(p));
    this.interacts = this.gen.interacts.map((o) => Object.assign({ done: false, prog: 0, active: false }, o));
    this.projectiles = [];
    this.particles = [];
    this.floaters = [];
    this.boss = null;
    this.cam = { x: 0, y: 0 };
    this.time = 0;
    this.flipFx = 0;
    this.locked = false;
    this.run = { found: [], cash: 0, docs: [], kills: 0, damage: 0, time: 0, boss: false };
    this.lastHopeUsed = false;
    this.objState = { clues: 0, cluesTotal: this.interacts.filter((o) => o.type === 'clue').length, anchors: 0, anchorsTotal: this.interacts.filter((o) => o.type === 'rift').length, complete: false, bossDone: false };
    this.ending = false;
    this.backTime = 0;
    this.prompt = null;
    this.hintText = null; this.hintT = 0;
    this.heartT = 0;
    this.glitchT = 0;
    this.noise = Gfx.makeCanvas(VW, VH);
    this.makeNoise();
    this.snapCamera();
  }

  pickRandomDoc() {
    const pool = ['t5', 't6', 't7', 't8', 't9'].filter((t) => !this.s.truths.includes(t));
    return pool.length ? pickR(pool) : null;
  }

  makeNoise() {
    const c = this.noise.getContext('2d');
    const img = c.createImageData(VW, VH);
    for (let i = 0; i < img.data.length; i += 4) {
      const v = Math.random() * 255;
      img.data[i] = v; img.data[i + 1] = v * 0.6; img.data[i + 2] = v * 0.7;
      img.data[i + 3] = Math.random() < 0.5 ? 18 : 0;
    }
    c.putImageData(img, 0, 0);
  }

  enter() {
    Sound.setAmbience('front');
    const intro = this.story ? this.story.intro : null;
    if (intro && intro.length) Game.push(new DialogModal(intro, () => this.showStartBanner()));
    else this.showStartBanner();
  }
  showStartBanner() {
    this.bannerT = 150;
    if (this.m.startHope) this.addHope(this.m.startHope, '응원');
  }

  // ── 편의 ──
  toast(text, col) { Game.toast(text, col); }
  floatText(x, y, text, col) { this.floaters.push({ x, y, text, col, t: 45 }); }
  spawnEnemy(type, x, y, layer) { const e = new Enemy(type, x, y, layer, this, this.diff); this.enemies.push(e); return e; }

  // ───── 공포 / 희망 / 상태 효과 ─────
  get m() { return this.D.m; }
  frightened() { return this.player.fear >= 50 && !this.player.st.has('panic'); }
  speedMul() {
    const p = this.player;
    let k = 1;
    if (this.frightened()) k *= this.m.frightSpeed ? 1.05 : 0.9;
    if (p.st.has('slow')) k *= 0.65;
    return k;
  }
  atkSpdMul() {
    const p = this.player;
    let k = 1 - this.m.atkSpd;
    if (this.m.berserkSpd && p.fear >= 50) k -= 0.15;
    return Math.max(0.5, k);
  }
  dmgMul(isBoss) {
    const p = this.player, m = this.m;
    let k = this.D.atkMul * (1 + m.dmg);
    if (p.layer === 'back') k *= 1 + m.dmgBack;
    k *= 1 + m.fearDmg * Math.floor(p.fear / 10);
    if (p.st.has('hope')) k *= 1.1;
    k *= 1 + 0.08 * p.st.stacks('rage');
    if (p.st.has('panic') && m.frenzy) k *= 1.5;
    if (isBoss) k *= 1 + m.bossDmg;
    return k;
  }
  critChance() { return this.D.crit + (this.m.conviction && this.player.st.has('hope') ? 0.12 : 0); }
  addHope(sec, why) {
    const p = this.player;
    const frames = Math.round(sec * 60 * (1 + this.m.hopeDur));
    const had = p.st.has('hope');
    p.st.add('hope', p.st.left('hope') + frames);
    if (!had) {
      this.floatText(p.cx, p.y - 14, '희망' + (why ? ' · ' + why : ''), '#f2d040');
      Sound.play('anchor');
      if (!this.s.flags.hintHope) { this.s.flags.hintHope = true; this.showHint('희망! 공포가 덜 쌓이고, 정신력이 회복되고, 공격력이 오른다.'); }
    }
  }
  addFear(n) {
    const p = this.player;
    if (n > 0 && this.m.hopeNoFear && p.st.has('hope')) return;
    p.fear = clamp(p.fear + n, 0, 100);
  }
  addRage() {
    this.player.st.add('rage', 300, 1, 5);
  }
  showHint(text) { this.hintText = text; this.hintT = 360; Sound.play('phone'); }
  applyHitEffect(eff) {
    const p = this.player, dd = 1 - this.m.debuffDur;
    if (!eff) return;
    if (eff === 'erosion') {
      const was = p.st.stacks('erosion');
      p.st.add('erosion', Math.round(360 * dd), 1, 3);
      if (p.st.stacks('erosion') > was) this.floatText(p.cx, p.y - 14, '침식', '#c07cff');
    } else if (eff === 'slow') {
      if (!p.st.has('slow')) this.floatText(p.cx, p.y - 14, '둔화', '#7a9aff');
      p.st.add('slow', Math.round(150 * dd));
    } else if (eff === 'fear') this.addFear(6);
    else if (eff === 'terror') { this.addFear(18); this.floatText(p.cx, p.y - 14, '공포!', '#ff8a5a'); }
  }
  onPlayerHurt() {
    if (this.m.rageOnHit) { this.addFear(4); this.addRage(); }
    else this.addFear(8);
  }
  onKill(e) {
    const p = this.player, m = this.m;
    if (m.rageOnKill) this.addRage();
    if (m.fearLeech && p.fear >= 50) { p.san = Math.min(p.maxSan, p.san + 5); this.floatText(p.cx, p.y - 16, 'SAN +5', COL.san); }
  }
  triggerPanic() {
    const p = this.player, m = this.m;
    if (m.blank) {
      p.fear = 0;
      this.addHope(8, '백지');
      this.floatText(p.cx, p.y - 20, '마음을 비웠다', '#a99cff');
      return;
    }
    p.st.add('panic', 300);
    p.fear = 100;
    Sound.play('hurt'); Sound.play('whisper');
    Gfx.shake(4, 24);
    this.floatText(p.cx, p.y - 20, '패닉!', '#ff3a5a');
    if (!this.s.flags.hintPanic) { this.s.flags.hintPanic = true; this.showHint('패닉! 몸이 말을 듣지 않고 뒤집기도 안 된다. 진정될 때까지 버텨라.'); }
    if (m.scream) {
      for (const e of this.enemies) if (!e.dead && e.layer === p.layer && Math.hypot(e.cx - p.cx, e.cy - p.cy) < 80) e.hurt(30, sign(e.cx - p.cx) || 1, 30);
      if (this.boss && !this.boss.dead && p.layer === 'back' && Math.hypot(this.boss.cx - p.cx, this.boss.cy - p.cy) < 90) this.boss.hurt(30, 1, false);
      for (let i = 0; i < 24; i++) { const a = i / 24 * Math.PI * 2; this.particles.push({ x: p.cx, y: p.cy, vx: Math.cos(a) * 3, vy: Math.sin(a) * 3, life: 18, col: '#ff4a5a', size: 2 }); }
    }
  }
  updateMind() {
    const p = this.player, m = this.m;
    const ended = p.st.update();
    if (ended.includes('panic')) {
      p.fear = 45;
      this.floatText(p.cx, p.y - 14, '진정됐다', '#c8c4d8');
      if (m.courage) this.addHope(12, '용기');
    }
    const hope = p.st.has('hope'), panic = p.st.has('panic');
    // 공포 증감
    if (!panic) {
      if (p.layer === 'back') {
        let rate = 1.0;
        for (const e of this.enemies) {
          if (e.dead || e.layer !== 'back') continue;
          const d = Math.hypot(e.cx - p.cx, e.cy - p.cy);
          if (d < 100) rate += e.type === 'watcher' ? 4 : 1.4;
        }
        if (this.boss && !this.boss.dead) rate += 2;
        if (p.san < p.maxSan * 0.3) rate += 1.5;
        let mul = 1 - m.fearGain;
        if (hope) mul *= m.hopeNoFear ? 0 : 0.5;
        if (m.trance) mul *= Math.max(0.3, 1 - 0.12 * p.st.stacks('rage'));
        p.fear = Math.min(100, p.fear + rate * mul / 60);
      } else {
        p.fear = Math.max(0, p.fear - (m.frontRecover ? 10 : 5) / 60);
      }
      if (p.fear >= 100) this.triggerPanic();
      if (p.fear >= 50 && !this.s.flags.hintFear) { this.s.flags.hintFear = true; this.showHint('공포가 쌓이고 있다(겁먹음). 100이 되면 패닉 — 표면으로 나가면 가라앉는다.'); }
    }
    // 지속 효과
    if (hope) {
      p.san = Math.min(p.maxSan, p.san + 1.5 / 60);
      if (m.hopeHeal) p.hp = Math.min(p.maxHp, p.hp + 1 / 60);
      if (this.time % 6 === 0) this.particles.push({ x: p.cx + rnd(-7, 7), y: p.y + p.h - rnd(0, 10), vx: 0, vy: -rnd(0.3, 0.8), life: 30, col: '#f2d040', size: 1 });
    }
    const ero = p.st.stacks('erosion');
    if (ero) {
      p.san -= 2 * ero / 60;
      if (this.time % 10 === 0) this.particles.push({ x: p.cx + rnd(-6, 6), y: p.cy + rnd(-8, 8), vx: 0, vy: 0.4, life: 20, col: '#c07cff', size: 1 });
    }
    if (panic && this.time % 20 === 0) { Gfx.shake(1, 6); if (this.time % 40 === 0) Sound.play('heart'); }
  }
  // HUD 표시용 상태 목록
  statusChips() {
    const p = this.player, out = [];
    const add = (id, label, frac) => out.push({ id, label, col: STATUS[id].col, frac, debuff: STATUS[id].debuff });
    const sec = (id) => Math.ceil(p.st.left(id) / 60);
    if (p.st.has('panic')) add('panic', `패닉 ${sec('panic')}`, p.st.left('panic') / 300);
    else if (this.frightened()) add('frightened', '겁먹음', null);
    if (p.st.has('erosion')) add('erosion', `침식×${p.st.stacks('erosion')}`, p.st.left('erosion') / 360);
    if (p.st.has('slow')) add('slow', `둔화 ${sec('slow')}`, p.st.left('slow') / 150);
    if (p.san < p.maxSan * 0.3) add('halluc', '환각', null);
    if (p.st.has('hope')) { const h = p.st.m.hope; add('hope', `희망 ${sec('hope')}`, h.t / h.max); }
    if (p.st.has('rage')) add('rage', `분노×${p.st.stacks('rage')}`, p.st.left('rage') / 300);
    if (p.shield > 0) add('shield', `부적×${p.shield}`, null);
    return out;
  }

  // ── 레이어 전환 ──
  tryFlip() {
    const p = this.player;
    if (p.flipCd > 0) { Sound.play('deny'); return; }
    if (p.st.has('panic')) { Sound.play('deny'); this.floatText(p.cx, p.y - 8, '손이 떨려 뒤집을 수 없다!', '#ff5a6a'); p.flipCd = 20; return; }
    const target = p.layer === 'front' ? 'back' : 'front';
    if (boxHits(this.lvl, target, p.x, p.y, p.w, p.h)) {
      Sound.play('deny');
      this.floatText(p.cx, p.y - 8, '겹쳐서 전환 불가', '#ff8a8a');
      p.flipCd = 10;
      return;
    }
    if (this.arenaActive && target === 'front' && this.boss && !this.boss.dead && this.time < this.forceBackUntil) {
      Sound.play('deny'); this.floatText(p.cx, p.y - 8, '이면에 붙잡혀 있다!', '#ff5a8a'); return;
    }
    this.setLayer(target);
    p.flipCd = this.D.flipCd;
    if (target === 'back' && !this.m.flipFree) p.san -= 2;
  }
  setLayer(target, silent) {
    const p = this.player;
    p.layer = target;
    this.flipFx = 16;
    if (!silent) Sound.play(target === 'back' ? 'flip' : 'unflip');
    Sound.setAmbience(this.arenaActive && this.boss && !this.boss.dead ? 'boss' : target === 'back' ? 'back' : 'front');
    for (let i = 0; i < 14; i++) this.particles.push({ x: p.cx + rnd(-8, 8), y: p.cy + rnd(-12, 12), vx: rnd(-1, 1), vy: rnd(-1.5, 0.5), life: 22, col: target === 'back' ? '#ff3a5a' : '#f4f0e6', size: 2 });
  }

  // ── 아이템 ──
  itemList() { return Object.keys(ITEMS).filter((k) => (this.s.items[k] || 0) > 0); }
  cycleItem() {
    const list = this.itemList();
    if (!list.length) return;
    this.s.itemSel = (this.s.itemSel + 1) % list.length;
    Sound.play('menu');
  }
  currentItem() { const list = this.itemList(); if (!list.length) return null; this.s.itemSel %= list.length; return list[this.s.itemSel]; }
  useItem() {
    const id = this.currentItem();
    const p = this.player;
    if (!id) { Sound.play('deny'); this.floatText(p.cx, p.y - 8, '소모품 없음', '#9a96a8'); return; }
    const it = ITEMS[id];
    if (it.throw) {
      this.projectiles.push({ x: p.cx, y: p.y + 6, vx: p.facing * 3.4, vy: -2.8, r: 4, dmg: it.throw, layer: 'any', from: 'player', life: 90, col: '#f4f0e6', kind: 'salt', grav: 0.18 });
      Sound.play('swing');
    } else {
      const hm = 1 + this.m.healMul;
      if (it.hp) { const v = Math.round(it.hp * hm); p.hp = Math.min(p.maxHp, p.hp + v); this.floatText(p.cx, p.y - 6, 'HP +' + v, '#ff8a8a'); }
      if (it.san) { const v = Math.round(it.san * hm); p.san = Math.min(p.maxSan, p.san + v); this.floatText(p.cx, p.y - 16, 'SAN +' + v, COL.san); }
      if (it.fear) p.fear = Math.max(0, p.fear - it.fear);
      if (it.hope) this.addHope(it.hope);
      if (it.shield) { p.shield += it.shield; this.floatText(p.cx, p.y - 6, '부적 장착', '#f2d040'); }
      Sound.play('item');
    }
    this.s.items[id]--;
    if (this.s.items[id] <= 0) delete this.s.items[id];
  }

  // ── 상호작용 ──
  nearInteract() {
    const p = this.player;
    for (const o of this.interacts) {
      if (o.done && o.type !== 'exit' && o.type !== 'entry') continue;
      if (o.layer !== 'both' && o.layer !== p.layer) continue;
      if (overlap(p, { x: o.x - 4, y: o.y, w: o.w + 8, h: o.h })) return o;
    }
    return null;
  }
  tryInteract() {
    const o = this.nearInteract();
    if (!o) return;
    const p = this.player;
    switch (o.type) {
      case 'entry':
        Game.push(new Menu({
          title: '현장에서 철수할까?', w: 230, desc: true,
          items: [
            { label: '철수한다', desc: '보수는 없고 신뢰가 깎인다. 주운 아티팩트는 챙긴다.', onSelect: (m) => { m.close(); this.finish('retreat'); } },
            { label: '계속한다', desc: '아직 할 일이 남았다.', onSelect: (m) => m.close() },
          ],
        }));
        break;
      case 'exit':
        if (!this.objState.complete) { Sound.play('deny'); this.toast('아직 일이 끝나지 않았다. (' + this.objText() + ')', '#ff8a8a'); return; }
        Sound.play('door');
        this.finish('success');
        break;
      case 'clue': {
        o.done = true;
        this.objState.clues++;
        this.addHope(10, '단서');
        Sound.play('clue');
        const texts = CLUE_TEXT[this.theme];
        const t = texts[(this.objState.clues - 1) % texts.length];
        Game.push(new TextView(`단서 ${this.objState.clues}/${this.objState.cluesTotal}`, t, () => {
          if (this.objState.clues >= this.objState.cluesTotal) this.toast('단서를 모두 모았다! 원인을 찾아 해소하자 →', COL.cyan);
        }, { icon: SPR.icon.doc, titleCol: COL.cyan }));
        break;
      }
      case 'cause':
        if (this.objState.clues < this.objState.cluesTotal) {
          Sound.play('deny');
          Game.push(new TextView('원인', CAUSE_TEXT[this.theme] + `\n\n(단서가 부족하다: ${this.objState.clues}/${this.objState.cluesTotal})`, null, { titleCol: '#ff8a8a' }));
          return;
        }
        if (!o.active) {
          o.active = true; o.waveT = 0;
          Sound.play('boss');
          this.toast('원인 해소 시작! 범위 안에서 버텨라', COL.cyan);
        }
        break;
      case 'rift':
        if (!o.active) {
          o.active = true; o.waveT = 0;
          Sound.play('anchor');
          this.toast('안정화 앵커 설치 중... 범위 안에 머물러라', COL.green);
          const n = 1 + Math.floor(this.diff / 2);
          for (let i = 0; i < n; i++) {
            const t = pickR(this.th.enemies);
            const def = ENEMIES[t];
            const ex = o.x + (i % 2 ? 90 : -80);
            this.spawnEnemy(t, ex, def.ai === 'walker' || def.ai === 'hopper' || def.ai === 'watcher' ? o.y + o.h - def.h - 2 : o.y - 10, 'back');
          }
        }
        break;
      case 'doc': {
        o.done = true;
        const tr = TRUTHS[o.id];
        const isNew = !this.s.truths.includes(o.id);
        if (isNew) { this.s.truths.push(o.id); this.run.docs.push(o.id); }
        Sound.play('pickup');
        Game.push(new TextView(tr.title, tr.text + (isNew ? '\n\n[진실 조각 획득 ' + this.s.truths.length + '/10]' : ''), null, { paper: true }));
        break;
      }
      case 'core':
        this.startFinaleTalk();
        break;
    }
  }

  objText() {
    const o = this.objState;
    if (this.obj === 'resolve') return o.clues < o.cluesTotal ? `단서 ${o.clues}/${o.cluesTotal}` : o.complete ? '해소 완료' : '원인 해소';
    if (this.obj === 'stabilize') return `앵커 ${o.anchors}/${o.anchorsTotal}`;
    if (this.obj === 'erase') return o.complete ? '말소 완료' : '핵 말소';
    if (this.obj === 'finale') return '최상층으로';
    return '';
  }

  // ── 진행 이벤트 ──
  onPitFall() {
    const p = this.player;
    Sound.play('hurt');
    p.hp -= Math.round(p.maxHp * 0.12);
    p.x = p.safe.x; p.y = p.safe.y; p.vx = 0; p.vy = 0;
    if (p.layer !== p.safe.layer) this.setLayer(p.safe.layer, true);
    p.inv = 60;
    this.floatText(p.cx, p.y - 8, '추락!', '#ff8a8a');
    Gfx.shake(3, 10);
  }

  startArena() {
    const a = this.gen.arena;
    this.arenaActive = true;
    for (let y = CEIL; y < a.gy; y++) { this.lvl.set('both', a.tx0 - 1, y, T_SOLID); this.lvl.set('both', a.tx1, y, T_SOLID); }
    if (this.player.layer !== 'back') {
      this.setLayer('back');
      this.toast('뒷면으로 끌려 들어간다!', '#ff5a8a');
    }
    this.forceBackUntil = this.time + 150;
    this.boss = new Boss(a.boss, a, this, this.diff);
    Sound.play('boss');
    Sound.setAmbience('boss');
    Gfx.shake(4, 30);
    this.bossBanner = 150;
  }
  onBossDefeated(boss) {
    const a = this.gen.arena;
    this.arenaActive = false;
    for (let y = CEIL; y < a.gy; y++) { this.lvl.set('both', a.tx0 - 1, y, T_EMPTY); this.lvl.set('both', a.tx1, y, T_EMPTY); }
    this.objState.complete = true; this.objState.bossDone = true;
    this.run.boss = true;
    this.addHope(20, '말소');
    this.player.fear = 0; this.player.st.remove('panic');
    Sound.play('resolve');
    Sound.setAmbience(this.player.layer === 'back' ? 'back' : 'front');
    // 보상 아티팩트
    if (this.story && this.story.reward) {
      this.pickups.push(makePickup({ type: 'artifact', id: this.story.reward, x: boss.cx - 7, y: a.floorY - 30, layer: 'back' }));
    } else if (!a.finale) {
      const rng = new RNG(this.job.seed + 5);
      const pool = this.th.artifacts.filter((id) => ARTIFACTS[id].rarity >= 1);
      const id = pool.length ? rng.pick(pool) : rollArtifact(rng, this.theme, this.diff, this.s.stats.luk);
      this.pickups.push(makePickup({ type: 'artifact', id, x: boss.cx - 7, y: a.floorY - 30, layer: 'back' }));
    }
    for (let i = 0; i < 40; i++) this.particles.push({ x: boss.cx, y: boss.cy, vx: rnd(-4, 4), vy: rnd(-4, 2), life: rndi(30, 60), col: pickR([boss.def.color, '#f4f0e6']), size: rndi(2, 4), g: 0.05 });
    this.boss = null;
    if (a.finale) { this.afterFinaleBoss(); return; }
    this.toast('말소 완료! 퇴근 문으로 →', COL.green);
  }

  completeObjective(msg) {
    this.objState.complete = true;
    this.addHope(20, '해냈다');
    Sound.play('resolve');
    this.toast(msg, COL.green);
    Gfx.shake(4, 20);
    // 남은 뒷면 존재 약화
    for (const e of this.enemies) if (!e.dead && e.layer === 'back' && Math.abs(e.cx - this.player.cx) < 300) e.hurt(999, 1);
  }

  // 최종장
  startFinaleTalk() {
    if (this.finaleTalked) return;
    this.finaleTalked = true;
    this.locked = true;
    Game.push(new DialogModal(FINALE_TALK, () => this.finaleChoice()));
  }
  finaleChoice() {
    const s = this.s;
    const canExpose = s.truths.length >= 7;
    const canMerge = s.contamination >= 60;
    Game.push(new Menu({
      title: '결재함 앞에서', w: 250, desc: true, onCancel: false, block: 45,
      items: [
        { label: '계약서에 서명한다', desc: '정규직이 된다. 청명의 일부로, 영원히 안전하게.', onSelect: (m) => { m.close(); this.endWith('hire'); } },
        { label: '모든 기록을 퍼뜨린다', disabled: !canExpose, desc: canExpose ? '모은 진실을 세상에 공개한다. 청명이 막아설 것이다.' : `진실 조각이 부족하다 (${s.truths.length}/7)`, onSelect: (m) => { m.close(); this.finaleFight('expose'); } },
        { label: '뒷면에 남는다', disabled: !canMerge, desc: canMerge ? '표면으로 돌아가지 않는다. 당신은 이야기가 된다.' : `아직 뒷면이 당신을 받아들이지 않는다 (오염 ${Math.round(s.contamination)}/60)`, onSelect: (m) => { m.close(); this.endWith('merge'); } },
        { label: '거절한다', desc: '서명하지 않고 나간다. 청명이 막아설 것이다.', onSelect: (m) => { m.close(); this.finaleFight('quit'); } },
      ],
    }));
  }
  finaleFight(route) {
    this.finaleRoute = route;
    Game.push(new DialogModal([
      ['seo', route === 'expose' ? '...그걸 다 모았어요? 하람 씨, 그러면 우리 모두 사라져요.' : '그래요. 다들 처음엔 거절해요.'],
      ['seo', '청명이 허락하지 않을 거예요.'],
      ['', '결재함이 열리고, 도장이 찍히는 소리가 천둥처럼 울렸다.'],
    ], () => {
      this.locked = false;
      this.interacts = this.interacts.filter((o) => o.type !== 'core');
      this.startArena();
    }));
  }
  afterFinaleBoss() {
    this.locked = true;
    Game.push(new DialogModal([
      ['', '거대한 도장이 금 가며 부서졌다. 수천 장의 결재 서류가 흩날린다.'],
      ['seo', '...이상하네요. 처음으로, 내 이름이 기억나요.'],
    ], () => this.endWith(this.finaleRoute)));
  }
  endWith(key) {
    this.ending = true;
    Game.fadeTo(() => Game.setScene(new EndingScene(key)));
  }

  finish(result) {
    if (this.ending) return;
    this.ending = true;
    this.run.time = this.time;
    const p = this.player;
    Game.fadeTo(() => Game.setScene(new ResultScene(this.job, result, this.run, { sanDeath: p.san <= 0 })));
  }

  die() {
    const p = this.player;
    if (p.dead) return;
    p.dead = true;
    this.locked = true;
    Sound.play('die');
    Gfx.shake(5, 30);
    for (let i = 0; i < 30; i++) this.particles.push({ x: p.cx, y: p.cy, vx: rnd(-3, 3), vy: rnd(-4, 1), life: 60, col: pickR(['#e0474c', '#f2c230', '#0b0b10']), size: 2, g: 0.1 });
    this.deathT = 100;
    this.deathMsg = p.san <= 0 ? '정신이 뒷면에 녹아내렸다...' : '의식을 잃었다...';
  }

  // ───────────── 업데이트 ─────────────
  update() {
    this.time++;
    const p = this.player;
    if (Input.pressed('pause') && !this.ending && !p.dead && !this.locked) { this.openPause(); return; }
    if (this.bannerT > 0) this.bannerT--;
    if (this.bossBanner > 0) this.bossBanner--;
    if (this.flipFx > 0) this.flipFx--;
    if (this.deathT > 0) {
      this.deathT--;
      if (this.deathT === 0) this.finish('fail');
    }
    p.update();
    for (const e of this.enemies) if (!e.dead) e.update();
    this.enemies = this.enemies.filter((e) => !e.dead);
    if (this.boss) this.boss.update();
    this.updateProjectiles();
    this.updatePickups();
    this.updateInteracts();
    this.updateTriggers();

    // 정신력 · 공포 · 상태 효과
    if (!p.dead && !this.locked) {
      this.updateMind();
      const panic = p.st.has('panic');
      if (p.layer === 'back') {
        let mul = this.arenaActive ? 0.5 : 1;
        if (this.frightened() && !this.m.coldMind) mul *= 1.25;
        if (panic) mul *= 2;
        p.san -= this.D.drain * mul / 60;
        this.backTime++;
        if (this.backTime % 60 === 0) addContamination(this.s, 0.05);
      } else if (panic) {
        p.san -= 1 / 60;
      } else {
        p.san = Math.min(p.maxSan, p.san + 2.2 * (this.m.frontRecover ? 1.5 : 1) / 60);
      }
      if ((p.hp <= 0 || p.san <= 0) && this.m.lastHope && !this.lastHopeUsed) {
        this.lastHopeUsed = true;
        p.hp = Math.max(p.hp, 1); p.san = Math.max(p.san, 15);
        p.inv = 120; p.st.remove('panic'); p.fear = Math.min(p.fear, 40);
        this.addHope(15, '마지막 희망');
        this.toast('마지막 희망 — 아직 쓰러질 수 없다!', '#f2d040');
        Gfx.shake(4, 20);
        for (let i = 0; i < 30; i++) { const a = i / 30 * Math.PI * 2; this.particles.push({ x: p.cx, y: p.cy, vx: Math.cos(a) * 2.5, vy: Math.sin(a) * 2.5, life: 30, col: '#f2d040', size: 2 }); }
      }
      if (p.hp <= 0 || p.san <= 0) { p.hp = Math.max(0, p.hp); p.san = Math.max(0, p.san); this.die(); }
      if (p.san < p.maxSan * 0.3) {
        if (--this.heartT <= 0) { Sound.play('heart'); this.heartT = 50; }
      }
    }
    if (Math.random() < (p.layer === 'back' ? 0.01 : 0.002) + (this.s.contamination > 50 ? 0.004 : 0)) this.glitchT = rndi(4, 10);
    if (this.glitchT > 0) this.glitchT--;

    // 파티클
    for (const pa of this.particles) { pa.x += pa.vx; pa.y += pa.vy; pa.vy += pa.g || 0; pa.life--; }
    this.particles = this.particles.filter((pa) => pa.life > 0);
    if (this.particles.length > 400) this.particles.splice(0, this.particles.length - 400);
    for (const f of this.floaters) { f.y -= 0.5; f.t--; }
    this.floaters = this.floaters.filter((f) => f.t > 0);
    if (this.hintT > 0) this.hintT--;
    this.prompt = this.nearInteract();
    this.updateCamera();
  }

  openPause() {
    Sound.play('menu');
    const s = this.s;
    Game.push(new Menu({
      title: '일시정지', w: 200, desc: true,
      items: [
        { label: '계속하기', desc: '현장으로 돌아간다.', onSelect: (m) => m.close() },
        { label: '소지품', desc: '소모품 목록을 확인한다.', onSelect: () => this.showItems() },
        { label: '내 상태', desc: '능력치를 확인한다.', onSelect: () => Game.push(new StatusView(s)) },
        { label: '조작법', desc: '키 안내', onSelect: () => Game.push(new TextView('조작법', CONTROLS_TEXT)) },
        { label: '상태 효과 안내', desc: '공포·패닉·희망 등 버프/디버프 설명', onSelect: () => Game.push(new TextView('상태 효과', STATUS_HELP_TEXT)) },
        { label: '철수 (임무 포기)', col: '#ff8a8a', desc: '즉시 현장을 떠난다. 보수 없음, 신뢰 -5. 주운 아티팩트는 챙긴다.', onSelect: (m) => { m.close(); this.finish('retreat'); } },
      ],
    }));
  }
  showItems() {
    const list = Object.keys(ITEMS).filter((k) => (this.s.items[k] || 0) > 0);
    Game.push(new Menu({
      title: '소지품', w: 220, desc: true,
      items: list.length ? list.map((k, i) => ({ label: ITEMS[k].name, right: 'x' + this.s.items[k], icon: SPR.icon[ITEMS[k].icon], desc: ITEMS[k].desc + '  (선택하면 V키 슬롯에 장착)', onSelect: (m) => { this.s.itemSel = i; m.close(); } })) : [{ label: '(비어 있음)', disabled: true, desc: '편의점에서 살 수 있다.' }],
    }));
  }

  updateProjectiles() {
    const p = this.player;
    for (const pr of this.projectiles) {
      pr.x += pr.vx; pr.y += pr.vy;
      if (pr.grav) pr.vy += pr.grav;
      pr.life--;
      const layerForTiles = pr.layer === 'any' ? p.layer : pr.layer;
      if (pr.kind !== 'wave' && pr.kind !== 'drop' && this.lvl.solidPx(layerForTiles, pr.x, pr.y)) {
        pr.life = 0;
        if (pr.kind === 'salt') this.saltBurst(pr);
      }
      if (pr.kind === 'drop' && pr.y > (this.gen.arena ? this.gen.arena.floorY : VH * 2)) pr.life = 0;
      if (pr.life <= 0) continue;
      if (pr.from === 'player') {
        const box = { x: pr.x - pr.r, y: pr.y - pr.r, w: pr.r * 2, h: pr.r * 2 };
        for (const e of this.enemies) {
          if (e.dead) continue;
          if (pr.layer !== 'any' && e.layer !== pr.layer) continue;
          if (pr.layer === 'any' && e.layer !== 'back') continue;
          if (pr.pierce) { pr.hit = pr.hit || new Set(); if (pr.hit.has(e)) continue; }
          if (overlap(box, e)) {
            e.hurt(pr.dmg, sign(pr.vx) || 1, pr.kind === 'spray' ? 6 : 0);
            if (pr.pierce) { pr.hit.add(e); continue; }
            pr.life = 0; if (pr.kind === 'salt') this.saltBurst(pr); break;
          }
        }
        if (pr.life > 0 && this.boss && !this.boss.dead && (pr.layer === 'back' || pr.layer === 'any') && overlap(box, this.boss.hitbox())) {
          if (!(pr.pierce && pr.hitBoss)) { this.boss.hurt(pr.dmg * (1 + this.m.bossDmg), sign(pr.vx) || 1, false); pr.hitBoss = true; }
          if (!pr.pierce) pr.life = 0;
        }
      } else if (pr.layer === p.layer && !p.dead) {
        if (Math.hypot(pr.x - p.cx, pr.y - p.cy) < pr.r + 7) { if (p.hurt(pr.dmg, pr.san || 0, pr.x)) this.applyHitEffect(pr.eff); pr.life = 0; }
      }
    }
    this.projectiles = this.projectiles.filter((pr) => pr.life > 0);
  }
  saltBurst(pr) {
    Sound.play('hit');
    for (let i = 0; i < 12; i++) this.particles.push({ x: pr.x, y: pr.y, vx: rnd(-2, 2), vy: rnd(-2.5, 0.5), life: 22, col: '#f4f0e6', size: 1, g: 0.1 });
    for (const e of this.enemies) if (!e.dead && e.layer === 'back' && Math.hypot(e.cx - pr.x, e.cy - pr.y) < 26) e.hurt(pr.dmg * 0.5, sign(e.cx - pr.x) || 1);
  }

  updatePickups() {
    const p = this.player;
    for (const k of this.pickups) {
      if (k.dead) continue;
      k.t++;
      if (k.type === 'sanorb') {
        const d = Math.hypot(p.cx - k.x - 4, p.cy - k.y - 4);
        if (d < 60 && p.layer === 'back') { k.x += (p.cx - k.x - 4) * 0.08; k.y += (p.cy - k.y - 4) * 0.08; }
        else k.y += Math.sin(k.t * 0.1) * 0.2;
        if (k.t > 900) k.dead = true;
      }
      if (k.layer !== 'both' && k.layer !== p.layer) continue;
      const box = { x: k.x, y: k.type === 'sanorb' ? k.y : k.by - 2, w: k.type === 'sanorb' ? 8 : 14, h: k.type === 'sanorb' ? 8 : 18 };
      if (!overlap(p, box)) continue;
      k.dead = true;
      switch (k.type) {
        case 'artifact': {
          const a = ARTIFACTS[k.id];
          this.run.found.push(k.id);
          this.addHope(8);
          Sound.play('artifact');
          this.toast(`아티팩트 획득: ${a.name} [${RARITY[a.rarity].name}]`, RARITY[a.rarity].col);
          for (let i = 0; i < 20; i++) this.particles.push({ x: k.x + 7, y: k.by + 7, vx: rnd(-2, 2), vy: rnd(-2.5, 0.5), life: 30, col: RARITY[a.rarity].col, size: 2, g: 0.05 });
          break;
        }
        case 'cash':
          this.run.cash += k.amount;
          Sound.play('coin');
          this.floatText(p.cx, p.y - 6, won(k.amount), '#9ae89a');
          break;
        case 'item': {
          const cur = this.s.items[k.id] || 0;
          if (cur >= ITEM_MAX) { k.dead = false; continue; }
          this.s.items[k.id] = cur + 1;
          Sound.play('pickup');
          this.toast(`${ITEMS[k.id].name} 획득`, COL.white);
          break;
        }
        case 'sanorb':
          p.san = Math.min(p.maxSan, p.san + 5);
          Sound.play('pickup');
          this.floatText(p.cx, p.y - 6, 'SAN +5', COL.san);
          break;
      }
    }
    this.pickups = this.pickups.filter((k) => !k.dead);
  }

  updateInteracts() {
    const p = this.player;
    for (const o of this.interacts) {
      if (!o.active || o.done) continue;
      const inRange = p.layer === 'back' && Math.abs(p.cx - (o.x + o.w / 2)) < 56 && Math.abs(p.cy - (o.y + o.h / 2)) < 64;
      const need = o.type === 'cause' ? 420 : 200;
      if (inRange) o.prog++;
      o.waveT++;
      if (o.type === 'cause' && o.waveT % 110 === 0 && o.prog < need - 30) {
        const t = pickR(this.th.enemies);
        const def = ENEMIES[t];
        const side = Math.random() < 0.5 ? -1 : 1;
        const ex = o.x + o.w / 2 + side * rnd(90, 140);
        const ey = def.ai === 'walker' || def.ai === 'hopper' || def.ai === 'watcher' ? o.y + o.h - def.h - 2 : o.y;
        if (this.enemies.filter((e) => e.layer === 'back').length < 7) this.spawnEnemy(t, ex, ey, 'back');
      }
      if (this.time % 4 === 0 && inRange) this.particles.push({ x: o.x + o.w / 2 + rnd(-20, 20), y: o.y + o.h, vx: 0, vy: -rnd(0.5, 1.5), life: 30, col: o.type === 'cause' ? COL.cyan : COL.green, size: 2 });
      if (o.prog >= need) {
        o.done = true; o.active = false;
        if (o.type === 'cause') this.completeObjective('원인 해소 완료! 퇴근 문으로 →');
        else {
          this.objState.anchors++;
          this.addHope(15, '앵커');
          Sound.play('anchor');
          Gfx.shake(3, 12);
          if (this.objState.anchors >= this.objState.anchorsTotal) this.completeObjective('안정화 완료! 퇴근 문으로 →');
          else this.toast(`앵커 설치 ${this.objState.anchors}/${this.objState.anchorsTotal}`, COL.green);
        }
      }
    }
  }

  updateTriggers() {
    const p = this.player;
    for (const h of this.gen.hints) {
      if (!h.shown && p.x > h.x) { h.shown = true; this.hintText = TUTORIAL_HINTS[h.key]; this.hintT = 420; Sound.play('phone'); }
    }
    for (const a of this.gen.ambush) {
      if (!a.done && p.x > a.x && p.x < a.x1) {
        a.done = true;
        for (const e of a.list) {
          const def = ENEMIES[e.type];
          const y = def.ai === 'float' || def.ai === 'swarm' || def.ai === 'turret' ? (e.gy - 3) * TS : e.gy * TS - def.h;
          this.spawnEnemy(e.type, e.tx * TS, y, 'back');
        }
        if (p.layer === 'back') { this.toast('무언가 몰려온다!', '#ff8a8a'); Sound.play('whisper'); }
      }
    }
    const ar = this.gen.arena;
    if (ar && !this.arenaActive && !this.objState.bossDone && !ar.finale && p.x > ar.x0 + 40) this.startArena();
    if (ar && ar.finale && !this.finaleTalked && p.x > ar.x0 + 60) this.startFinaleTalk();
  }

  snapCamera() {
    const p = this.player;
    this.cam.x = clamp(p.cx - VW / 2, 0, this.lvl.W * TS - VW);
    this.cam.y = clamp(p.cy - VH / 2 - 10, 0, this.lvl.H * TS - VH);
  }
  updateCamera() {
    const p = this.player;
    const tx = clamp(p.cx - VW / 2 + p.facing * 30, 0, this.lvl.W * TS - VW);
    const ty = clamp(p.cy - VH / 2 - 10, 0, this.lvl.H * TS - VH);
    this.cam.x = lerp(this.cam.x, tx, 0.1);
    this.cam.y = lerp(this.cam.y, ty, 0.1);
    if (this.arenaActive) {
      const a = this.gen.arena;
      this.cam.x = clamp(this.cam.x, a.x0 - 16, a.x1 - VW + 16);
    }
  }

  // ───────────── 그리기 ─────────────
  draw(ctx) {
    const p = this.player, L = p.layer, cam = { x: Math.round(this.cam.x), y: Math.round(this.cam.y) };
    const P = this.th[L];
    // 배경 벽
    ctx.fillStyle = P.wall2; ctx.fillRect(0, 0, VW, VH);
    const panelW = 64;
    const off = -(cam.x % panelW);
    for (let x = off - panelW; x < VW + panelW; x += panelW) {
      ctx.fillStyle = P.wall; ctx.fillRect(Math.round(x) + 2, 0, panelW - 4, VH);
    }
    const trimY = Math.round(10.2 * TS - cam.y);
    ctx.fillStyle = P.trim; ctx.fillRect(0, trimY, VW, 3);
    ctx.fillStyle = shade(P.wall2, -14); ctx.fillRect(0, trimY + 3, VW, VH);
    if (L === 'back') {
      // 벽의 핏줄 / 낙서
      const r = new RNG(Math.floor(cam.x / 128) + 3);
      for (let k = -1; k < 5; k++) {
        const bx = Math.floor(cam.x / 128) * 128 + k * 128;
        const rr = new RNG(Math.floor(bx / 128) * 13 + 1);
        ctx.fillStyle = P.trim;
        let vy = rr.range(40, 120);
        for (let x = 0; x < 128; x += 2) { vy += rr.range(-2, 2); ctx.fillRect(Math.round(bx + x - cam.x), Math.round(vy - cam.y + 40), 2, 1); }
        if (rr.chance(0.5)) Gfx.text(ctx, rr.pick(['보고있어', '나가', '여기 있어', '1', '돌아보지마', '읽음', '웃어']), bx + rr.range(10, 80) - cam.x, rr.range(70, 150) - cam.y, 'rgba(255,60,90,0.35)', { small: true, shadow: false });
      }
      void r;
    }
    // 소품
    for (const d of this.gen.decor) {
      const spr = decorSprite(d.type, L);
      const x = d.x - cam.x;
      if (x < -60 || x > VW + 10) continue;
      ctx.drawImage(spr, Math.round(x), Math.round(d.y - cam.y));
    }
    // 타일
    this.drawTiles(ctx, cam, L);
    // 상호작용 대상
    for (const o of this.interacts) this.drawInteract(ctx, cam, o);
    // 픽업
    for (const k of this.pickups) this.drawPickup(ctx, cam, k);
    // 적 (다른 레이어는 이면 시야가 있을 때만 희미하게)
    const sight = this.D.ab.backSight || this.D.per >= 6;
    for (const e of this.enemies) {
      if (e.layer === L) e.draw(ctx, cam, false);
      else if (sight || e.def.ai === 'drift') { ctx.globalAlpha = 0.22; e.draw(ctx, cam, true); ctx.globalAlpha = 1; }
    }
    if (this.boss) {
      if (L === 'back') { this.boss.drawHazards(ctx, cam); this.boss.draw(ctx, cam); }
      else { ctx.globalAlpha = 0.3; this.boss.draw(ctx, cam); ctx.globalAlpha = 1; }
    }
    // 플레이어
    if (!p.dead) p.draw(ctx, cam);
    // 투사체
    for (const pr of this.projectiles) {
      if (pr.layer !== 'any' && pr.layer !== L) continue;
      const x = Math.round(pr.x - cam.x), y = Math.round(pr.y - cam.y);
      if (pr.kind === 'spray') { ctx.fillStyle = '#9ae8ff'; ctx.fillRect(x - 1, y - 1, 3, 3); }
      else if (pr.kind === 'salt') { ctx.fillStyle = '#0b0b10'; ctx.fillRect(x - 3, y - 3, 6, 6); ctx.fillStyle = '#f4f0e6'; ctx.fillRect(x - 2, y - 2, 4, 4); }
      else if (pr.kind === 'rwave') {
        ctx.fillStyle = '#ff9a3a';
        for (let k = -6; k <= 6; k++) ctx.fillRect(x + Math.round(Math.cos(k / 6) * 4) * sign(pr.vx), y + k, 2, 1);
        ctx.fillStyle = '#fff2c8'; ctx.fillRect(x - 1, y - 3, 2, 6);
      } else if (pr.kind === 'wave') { ctx.fillStyle = pr.col; ctx.fillRect(x - 4, y - 6, 8, 12); ctx.fillStyle = '#fff'; ctx.fillRect(x - 1, y - 4, 2, 8); }
      else {
        ctx.fillStyle = '#0b0b10'; ctx.fillRect(x - pr.r - 1, y - pr.r - 1, pr.r * 2 + 2, pr.r * 2 + 2);
        ctx.fillStyle = pr.col; ctx.fillRect(x - pr.r, y - pr.r, pr.r * 2, pr.r * 2);
        ctx.fillStyle = '#fff'; ctx.fillRect(x - 1, y - 1, 2, 2);
      }
    }
    // 파티클
    for (const pa of this.particles) {
      ctx.globalAlpha = clamp(pa.life / 20, 0, 1);
      ctx.fillStyle = pa.col;
      ctx.fillRect(Math.round(pa.x - cam.x), Math.round(pa.y - cam.y), pa.size, pa.size);
    }
    ctx.globalAlpha = 1;
    // 뒷면 조명
    if (L === 'back') this.drawDarkness(ctx, cam);
    // 플로팅 텍스트
    for (const f of this.floaters) Gfx.text(ctx, f.text, f.x - cam.x, f.y - cam.y, f.col, { small: true, align: 'center' });
    // 상호작용 안내
    if (this.prompt && !this.locked) {
      const o = this.prompt;
      const label = { entry: '철수', exit: '퇴근', clue: '조사', cause: '해소', rift: '앵커 설치', doc: '읽기', core: '결재함' }[o.type];
      const tx = o.x + o.w / 2 - cam.x, ty = o.y - 14 - cam.y + Math.sin(this.time * 0.15) * 1.5;
      const w = Gfx.measure(ctx, label, { small: true }) + 20;
      Gfx.panel(ctx, tx - w / 2, ty - 2, w, 14, { inner: false, edge: COL.yellow });
      Gfx.text(ctx, '↑ ' + label, tx, ty, COL.white, { small: true, align: 'center' });
    }
    this.drawEffects(ctx, L);
    this.drawHUD(ctx);
  }

  drawTiles(ctx, cam, L) {
    const lvl = this.lvl;
    const other = L === 'front' ? 'back' : 'front';
    const T = this.tiles[L], TO = this.tiles[other];
    const x0 = Math.max(0, Math.floor(cam.x / TS)), x1 = Math.min(lvl.W - 1, Math.floor((cam.x + VW) / TS));
    const y0 = Math.max(0, Math.floor(cam.y / TS)), y1 = Math.min(lvl.H - 1, Math.floor((cam.y + VH) / TS));
    const ghostA = clamp(0.12 + 0.03 * this.D.per, 0.12, 0.4);
    for (let ty = y0; ty <= y1; ty++) {
      for (let tx = x0; tx <= x1; tx++) {
        const t = lvl.get(L, tx, ty), to = lvl.get(other, tx, ty);
        const sx = tx * TS - cam.x, sy = ty * TS - cam.y;
        if (t === T_SOLID) {
          const excl = to !== T_SOLID;
          const above = lvl.get(L, tx, ty - 1) !== T_SOLID;
          ctx.drawImage(excl ? T.excl : above ? T.top : T.solid, sx, sy);
        } else if (t === T_PLAT) ctx.drawImage(T.plat, sx, sy);
        else if (t === T_SPIKE) ctx.drawImage(T.spike, sx, sy);
        // 다른 레이어 고스트
        if (t !== T_SOLID && to === T_SOLID) {
          ctx.globalAlpha = ghostA; ctx.drawImage(TO.excl, sx, sy); ctx.globalAlpha = 1;
          ctx.fillStyle = L === 'front' ? 'rgba(255,60,90,0.35)' : 'rgba(242,194,48,0.35)';
          if (lvl.get(other, tx, ty - 1) !== T_SOLID) ctx.fillRect(sx, sy, TS, 1);
        } else if (t === T_EMPTY && to === T_PLAT) {
          ctx.globalAlpha = ghostA; ctx.drawImage(TO.plat, sx, sy); ctx.globalAlpha = 1;
        }
      }
    }
  }

  drawInteract(ctx, cam, o) {
    const L = this.player.layer;
    const vis = o.layer === 'both' || o.layer === L;
    const x = Math.round(o.x - cam.x), y = Math.round(o.y - cam.y);
    if (x < -40 || x > VW + 40) return;
    const t = this.time;
    if (!vis) {
      // 뒷면 대상은 표면에서 희미한 일렁임
      if (!o.done && L === 'front' && t % 40 < 20) { ctx.fillStyle = 'rgba(255,60,90,0.4)'; ctx.fillRect(x + o.w / 2 - 1, y + o.h - 6 - (t % 40) / 4, 2, 2); }
      return;
    }
    const G = Gfx;
    switch (o.type) {
      case 'entry': case 'exit': {
        const open = o.type === 'exit' && this.objState.complete;
        G.px(ctx, x, y, o.w, o.h, '#0b0b10');
        G.px(ctx, x + 1, y + 1, o.w - 2, o.h - 1, o.type === 'exit' ? (open ? '#3a8a5a' : '#5a3a3a') : '#4a4a5a');
        G.px(ctx, x + 3, y + 3, o.w - 6, o.h - 4, open ? '#f2f8d0' : '#2a2a34');
        if (open) { ctx.globalAlpha = 0.25 + Math.sin(t * 0.1) * 0.1; G.px(ctx, x - 6, y - 4, o.w + 12, o.h + 4, '#f2f8d0'); ctx.globalAlpha = 1; }
        G.text(ctx, o.type === 'exit' ? '퇴근' : '입구', x + o.w / 2, y - 12, open ? COL.green : COL.dim, { small: true, align: 'center' });
        break;
      }
      case 'clue': {
        if (o.done) { G.px(ctx, x + 4, y + 14, 8, 2, '#5a4a5a'); break; }
        const bob = Math.sin(t * 0.08) * 2;
        ctx.drawImage(SPR.icon.doc, x + 1, y + 2 + bob);
        ctx.globalAlpha = 0.4 + Math.sin(t * 0.1) * 0.2; G.ring(ctx, x + 8, y + 9 + bob, 10, COL.cyan); ctx.globalAlpha = 1;
        break;
      }
      case 'cause': {
        const pulse = Math.sin(t * 0.08);
        G.px(ctx, x, y, o.w, o.h, '#0b0b10');
        G.px(ctx, x + 2, y + 2, o.w - 4, o.h - 4, o.done ? '#2a2a34' : '#5a1a28');
        if (!o.done) {
          for (let i = 0; i < 4; i++) { G.px(ctx, x + 6 + (i % 2) * 10, y + 8 + Math.floor(i / 2) * 12, 6, 6, i === 1 ? COL.yellow : '#c8c4b4'); }
          ctx.globalAlpha = 0.3 + pulse * 0.15; G.circle(ctx, x + o.w / 2, y + o.h / 2, 26, '#ff3a5a'); ctx.globalAlpha = 1;
        }
        if (o.active) this.drawProgress(ctx, x + o.w / 2, y - 22, o.prog / 420, COL.cyan);
        break;
      }
      case 'rift': {
        if (o.done) {
          G.px(ctx, x + 10, y + 4, 4, o.h - 4, '#6fd08c'); G.px(ctx, x + 6, y, 12, 6, '#c8ccd8');
          ctx.globalAlpha = 0.3; G.circle(ctx, x + 12, y + 6, 6, '#6fd08c'); ctx.globalAlpha = 1;
        } else {
          for (let i = 0; i < 10; i++) {
            const yy = y + i * 4, w = 2 + Math.abs(Math.sin(t * 0.07 + i)) * 6;
            G.px(ctx, Math.round(x + 12 - w / 2 + Math.sin(t * 0.1 + i * 0.7) * 2), yy, Math.round(w), 4, i % 2 ? '#ff3a5a' : '#f4f0e6');
          }
          if (o.active) this.drawProgress(ctx, x + 12, y - 12, o.prog / 200, COL.green);
        }
        break;
      }
      case 'doc':
        if (!o.done) { ctx.drawImage(SPR.icon.doc, x + 1, y + Math.sin(t * 0.1)); if (t % 50 < 25) { ctx.fillStyle = '#fff'; ctx.fillRect(x + 12, y - 2, 1, 1); } }
        break;
      case 'core': {
        G.px(ctx, x, y, o.w, o.h, '#0b0b10'); G.px(ctx, x + 2, y + 2, o.w - 4, o.h - 4, '#8a1a28');
        G.px(ctx, x + 4, y + 8, o.w - 8, 4, '#2a0a10');
        G.circle(ctx, x + o.w / 2, y + 28, 7, '#ff2a3a');
        break;
      }
    }
  }
  drawProgress(ctx, cx, y, f, col) {
    Gfx.bar(ctx, Math.round(cx - 20), Math.round(y), 40, 4, f, col);
  }

  drawPickup(ctx, cam, k) {
    const L = this.player.layer;
    const x = Math.round(k.x - cam.x), y0 = k.type === 'sanorb' ? k.y : k.by;
    const y = Math.round(y0 - cam.y + (k.type === 'sanorb' ? 0 : Math.sin(k.t * 0.07) * 2));
    if (x < -20 || x > VW + 20) return;
    if (k.layer !== 'both' && k.layer !== L) {
      // 다른 레이어의 아티팩트는 반짝임으로만
      if (k.type === 'artifact' && k.t % 30 < 12) { ctx.fillStyle = L === 'front' ? 'rgba(255,90,138,0.7)' : 'rgba(242,194,48,0.7)'; ctx.fillRect(x + 6, y + 5, 2, 2); ctx.fillRect(x + 4, y + 6, 6, 0.5); }
      return;
    }
    if (k.type === 'artifact') {
      const a = ARTIFACTS[k.id];
      ctx.globalAlpha = 0.35 + Math.sin(k.t * 0.1) * 0.15;
      Gfx.circle(ctx, x + 7, y + 7, 10, RARITY[a.rarity].col);
      ctx.globalAlpha = 1;
      ctx.drawImage(SPR.icon[a.icon], x, y);
      if (k.t % 40 < 6) { ctx.fillStyle = '#fff'; ctx.fillRect(x + 11, y + 1, 1, 3); ctx.fillRect(x + 10, y + 2, 3, 1); }
    } else if (k.type === 'cash') ctx.drawImage(SPR.icon.cash, x, y);
    else if (k.type === 'item') ctx.drawImage(SPR.icon.box, x, y);
    else if (k.type === 'sanorb') {
      ctx.fillStyle = COL.san; ctx.fillRect(x + 2, y + 2, 4, 4);
      ctx.fillStyle = '#fff'; ctx.fillRect(x + 3, y + 3, 2, 2);
      ctx.globalAlpha = 0.4; ctx.fillStyle = COL.san; ctx.fillRect(x, y + 3, 8, 2); ctx.fillRect(x + 3, y, 2, 8); ctx.globalAlpha = 1;
    }
  }

  drawDarkness(ctx, cam) {
    const t = Gfx.tctx;
    t.globalCompositeOperation = 'source-over';
    t.clearRect(0, 0, VW, VH);
    t.fillStyle = this.arenaActive || this.boss ? 'rgba(4,0,2,0.55)' : 'rgba(4,0,2,0.8)';
    t.fillRect(0, 0, VW, VH);
    t.globalCompositeOperation = 'destination-out';
    const light = (x, y, r) => {
      const g = t.createRadialGradient(x, y, r * 0.2, x, y, r);
      g.addColorStop(0, 'rgba(0,0,0,1)');
      g.addColorStop(0.6, 'rgba(0,0,0,0.75)');
      g.addColorStop(1, 'rgba(0,0,0,0)');
      t.fillStyle = g;
      t.fillRect(x - r, y - r, r * 2, r * 2);
    };
    const p = this.player;
    const flick = Math.random() < 0.03 ? 0.85 : 1;
    light(p.cx - cam.x, p.cy - cam.y, this.D.light * flick);
    for (const k of this.pickups) if (k.type === 'artifact' && k.layer === 'back') light(k.x + 7 - cam.x, k.by + 7 - cam.y, 22);
    for (const o of this.interacts) if (o.layer !== 'front' && !o.done) light(o.x + o.w / 2 - cam.x, o.y + o.h / 2 - cam.y, o.type === 'cause' || o.type === 'core' ? 60 : 30);
    for (const pr of this.projectiles) if (pr.from === 'enemy') light(pr.x - cam.x, pr.y - cam.y, 14);
    if (this.boss) light(this.boss.cx - cam.x, this.boss.cy - cam.y, 70);
    for (const e of this.enemies) if (e.layer === 'back' && (e.type === 'watcher' || e.type === 'flyer')) light(e.cx - cam.x, e.y + 4 - cam.y, 10);
    t.globalCompositeOperation = 'source-over';
    ctx.drawImage(Gfx.tmp, 0, 0);
  }

  drawEffects(ctx, L) {
    const p = this.player;
    if (L === 'back') {
      ctx.globalAlpha = 1;
      ctx.drawImage(this.noise, rndi(-40, 0), rndi(-40, 0), VW + 40, VH + 40);
      ctx.fillStyle = 'rgba(120,0,30,0.10)'; ctx.fillRect(0, 0, VW, VH);
      for (let y = 0; y < VH; y += 3) { ctx.fillStyle = 'rgba(0,0,0,0.12)'; ctx.fillRect(0, y, VW, 1); }
    }
    if (this.glitchT > 0) {
      const t = Gfx.tctx;
      t.clearRect(0, 0, VW, VH);
      t.drawImage(Gfx.buf, 0, 0);
      for (let i = 0; i < 4; i++) {
        const y = rndi(0, VH - 12), h = rndi(2, 10), dx = rndi(-12, 12);
        ctx.drawImage(Gfx.tmp, 0, y, VW, h, dx, y, VW, h);
      }
    }
    if (this.flipFx > 0) {
      const f = this.flipFx / 16;
      if (this.flipFx > 12) { ctx.globalCompositeOperation = 'difference'; ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, VW, VH); ctx.globalCompositeOperation = 'source-over'; }
      const t = Gfx.tctx;
      t.clearRect(0, 0, VW, VH);
      t.drawImage(Gfx.buf, 0, 0);
      for (let x = 0; x < VW; x += 24) {
        const dy = Math.round(Math.sin(x * 0.3 + this.flipFx) * 10 * f);
        ctx.drawImage(Gfx.tmp, x, 0, 24, VH, x, dy, 24, VH);
      }
      ctx.fillStyle = L === 'back' ? `rgba(255,40,80,${0.25 * f})` : `rgba(255,255,255,${0.25 * f})`;
      ctx.fillRect(0, 0, VW, VH);
    }
    // 패닉 / 희망 화면 효과
    if (!p.dead && p.st.has('panic')) {
      const a = 0.25 + Math.abs(Math.sin(this.time * 0.25)) * 0.25;
      ctx.fillStyle = `rgba(255,30,60,${a * 0.35})`; ctx.fillRect(0, 0, VW, VH);
      ctx.fillStyle = `rgba(255,30,60,${a})`;
      ctx.fillRect(0, 0, VW, 4); ctx.fillRect(0, VH - 4, VW, 4); ctx.fillRect(0, 0, 4, VH); ctx.fillRect(VW - 4, 0, 4, VH);
      if (this.time % 30 < 18) Gfx.text(ctx, '패닉', this.player.cx - this.cam.x, this.player.y - 30 - this.cam.y, '#ff3a5a', { align: 'center', bold: true });
    } else if (!p.dead && this.frightened()) {
      const g = ctx.createRadialGradient(VW / 2, VH / 2, 90, VW / 2, VH / 2, 230);
      g.addColorStop(0, 'rgba(0,0,0,0)');
      g.addColorStop(1, `rgba(40,0,10,${0.25 + (p.fear - 50) / 200 + Math.sin(this.time * 0.15) * 0.05})`);
      ctx.fillStyle = g; ctx.fillRect(0, 0, VW, VH);
    }
    if (!p.dead && p.st.has('hope')) {
      const g = ctx.createRadialGradient(VW / 2, VH / 2, 120, VW / 2, VH / 2, 240);
      g.addColorStop(0, 'rgba(242,208,64,0)');
      g.addColorStop(1, `rgba(242,208,64,${0.1 + Math.sin(this.time * 0.05) * 0.03})`);
      ctx.fillStyle = g; ctx.fillRect(0, 0, VW, VH);
    }
    // 정신력 낮음 비네트
    const sanF = p.san / p.maxSan;
    if (sanF < 0.35 && !p.dead) {
      const a = (0.35 - sanF) * 1.4 * (0.7 + Math.sin(this.time * 0.12) * 0.3);
      const g = ctx.createRadialGradient(VW / 2, VH / 2, 60, VW / 2, VH / 2, 240);
      g.addColorStop(0, 'rgba(120,0,40,0)');
      g.addColorStop(1, `rgba(120,0,40,${a})`);
      ctx.fillStyle = g; ctx.fillRect(0, 0, VW, VH);
    }
    if (this.deathT > 0) {
      ctx.fillStyle = `rgba(0,0,0,${clamp((100 - this.deathT) / 70, 0, 0.85)})`;
      ctx.fillRect(0, 0, VW, VH);
      Gfx.text(ctx, this.deathMsg, VW / 2, VH / 2 - 6, '#ff8a8a', { align: 'center', bold: true });
    }
  }

  drawHUD(ctx) {
    const p = this.player, s = this.s;
    // 좌상단: 체력 / 정신력 / 공포
    Gfx.panel(ctx, 4, 4, 128, 49, { fill: 'rgba(10,9,16,0.8)', inner: false });
    Gfx.text(ctx, 'HP', 9, 7, '#ff8a8a', { small: true });
    Gfx.bar(ctx, 28, 9, 76, 5, p.hp / p.maxHp, COL.hp);
    Gfx.text(ctx, String(Math.max(0, Math.ceil(p.hp))), 127, 7, COL.white, { small: true, align: 'right' });
    Gfx.text(ctx, 'SAN', 9, 18, '#b8acff', { small: true });
    Gfx.bar(ctx, 28, 20, 76, 5, p.san / p.maxSan, p.layer === 'back' && this.time % 40 < 20 ? '#b8a8ff' : COL.san);
    Gfx.text(ctx, String(Math.max(0, Math.ceil(p.san))), 127, 18, COL.white, { small: true, align: 'right' });
    const panic = p.st.has('panic');
    const fearCol = panic ? (this.time % 10 < 5 ? '#ff3a5a' : '#ffffff') : p.fear >= 50 ? '#ff6a3a' : '#c8803a';
    Gfx.text(ctx, '공포', 9, 29, panic ? '#ff3a5a' : '#ffa86a', { small: true });
    Gfx.bar(ctx, 28, 31, 76, 5, p.fear / 100, fearCol);
    ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fillRect(66, 30, 1, 7);
    Gfx.text(ctx, panic ? '!!' : String(Math.floor(p.fear)), 127, 29, panic ? '#ff3a5a' : COL.white, { small: true, align: 'right' });
    // 레이어 표시
    const back = p.layer === 'back';
    Gfx.text(ctx, back ? '◆ 뒷면' : '◇ 표면', 9, 40, back ? '#ff5a8a' : '#f4f0e6', { small: true });
    const cdF = panic ? 0 : 1 - p.flipCd / this.D.flipCd;
    Gfx.bar(ctx, 52, 43, 28, 2, cdF, cdF >= 1 ? COL.yellow : COL.dark);
    // 상태 효과 칩 (좌하단, 소모품 칸 위)
    let cx = 4, cy = VH - 38;
    for (const c of this.statusChips()) {
      const w = Gfx.measure(ctx, c.label, { small: true }) + 10;
      if (cx + w > 132) { cx = 4; cy -= 15; }
      const blink = c.id === 'panic' && this.time % 12 < 6;
      Gfx.panel(ctx, cx, cy, w, 14, { fill: blink ? 'rgba(120,10,30,0.9)' : 'rgba(10,9,16,0.85)', edge: c.col, inner: false });
      Gfx.text(ctx, c.label, cx + 5, cy + 1, c.col, { small: true });
      if (c.frac != null) { ctx.fillStyle = c.col; ctx.fillRect(cx + 2, cy + 12, Math.round((w - 4) * clamp(c.frac, 0, 1)), 1); }
      cx += w + 2;
    }
    // 우상단: 목표
    const ob = OBJECTIVES[this.obj] || { name: '최종 결재', col: '#ff5a6a' };
    const otext = this.objText();
    const ow = Math.max(110, Gfx.measure(ctx, otext) + 20);
    Gfx.panel(ctx, VW - ow - 4, 4, ow, 30, { fill: 'rgba(10,9,16,0.8)', inner: false, edge: ob.col });
    Gfx.text(ctx, ob.name + ' · ' + THEMES[this.theme].short, VW - ow + 4, 7, ob.col, { small: true });
    Gfx.text(ctx, otext, VW - ow + 4, 18, this.objState.complete ? COL.green : COL.white);
    // 아티팩트 수
    if (this.run.found.length) {
      ctx.drawImage(SPR.icon.frame, VW - 40, 38);
      Gfx.text(ctx, 'x' + this.run.found.length, VW - 24, 40, COL.pink, { small: true });
    }
    // 하단: 소모품
    const id = this.currentItem();
    Gfx.panel(ctx, 4, VH - 22, 120, 18, { fill: 'rgba(10,9,16,0.8)', inner: false });
    if (id) {
      ctx.drawImage(SPR.icon[ITEMS[id].icon], 7, VH - 20);
      Gfx.text(ctx, ITEMS[id].name + ' x' + s.items[id], 23, VH - 19, COL.white, { small: true });
      Gfx.text(ctx, 'V', 116, VH - 19, COL.yellow, { small: true, align: 'right' });
    } else Gfx.text(ctx, '소모품 없음', 10, VH - 19, COL.dark, { small: true });
    // 보스 체력
    if (this.boss && !this.boss.dead) {
      const b = this.boss;
      const bx = 134, bw = VW - bx - 10, by = VH - 12;
      Gfx.text(ctx, b.def.name, bx + bw / 2, by - 12, b.def.color, { small: true, align: 'center' });
      Gfx.bar(ctx, bx, by, bw, 5, b.hp / b.maxHp, b.def.color);
    }
    if (this.bossBanner > 0 && this.boss) {
      const a = clamp(this.bossBanner / 30, 0, 1) * clamp((150 - this.bossBanner) / 20, 0, 1);
      ctx.globalAlpha = a;
      ctx.fillStyle = 'rgba(0,0,0,0.7)'; ctx.fillRect(0, 70, VW, 40);
      Gfx.text(ctx, this.boss.def.title, VW / 2, 76, this.boss.def.color, { align: 'center', small: true });
      Gfx.text(ctx, this.boss.def.name, VW / 2, 90, COL.white, { align: 'center', bold: true });
      ctx.globalAlpha = 1;
    }
    // 시작 배너
    if (this.bannerT > 0 && !Game.modals.length) {
      const a = clamp(this.bannerT / 30, 0, 1) * clamp((150 - this.bannerT) / 20, 0, 1);
      ctx.globalAlpha = a;
      ctx.fillStyle = 'rgba(0,0,0,0.65)'; ctx.fillRect(0, 60, VW, 46);
      Gfx.text(ctx, THEMES[this.theme].name, VW / 2, 66, COL.yellow, { align: 'center', bold: true });
      Gfx.text(ctx, (OBJECTIVES[this.obj] ? OBJECTIVES[this.obj].desc : '청명의 최상층으로 향한다.'), VW / 2, 82, '#d8d4e8', { align: 'center', small: true });
      Gfx.text(ctx, '위험도 ' + '★'.repeat(this.diff), VW / 2, 94, '#ff8a8a', { align: 'center', small: true });
      ctx.globalAlpha = 1;
    }
    // 튜토리얼 힌트
    if (this.hintT > 0 && this.hintText) {
      const a = clamp(this.hintT / 30, 0, 1);
      ctx.globalAlpha = a;
      const w = Math.min(VW - 20, Gfx.measure(ctx, this.hintText, { small: true }) + 24);
      Gfx.panel(ctx, (VW - w) / 2, 58, w, 18, { edge: '#62d6e8', inner: false });
      Gfx.text(ctx, this.hintText, VW / 2, 62, '#bff4ff', { align: 'center', small: true });
      ctx.globalAlpha = 1;
    }
  }
}

const STATUS_HELP_TEXT = '공포: 뒷면에 있으면 쌓인다(적이 가까울수록 빨리). 표면에서 가라앉는다.\n· 겁먹음(50+): 정신력 소모 +25%, 이동 -10%\n· 패닉(100): 5초간 몸이 제멋대로 움직이고 뒤집기 불가, 정신력 소모 2배\n침식: 정신력이 중첩당 초당 2 감소 (최대 3중첩)\n둔화: 이동 속도 -35%\n환각: 정신력 30% 미만, 받는 피해 +25%\n\n희망: 공포 증가 절반, 정신력 초당 +1.5, 공격력 +10%\n  (단서·앵커·아티팩트·목표 달성·캔커피로 얻는다)\n분노: 중첩당 공격력 +8% (분노 갈래 스킬)';
const CONTROLS_TEXT = '← →  이동        Z / Space  점프 (↓+점프: 발판 내려가기)\nX  공격            C  뒤집기 (표면 ↔ 뒷면)\n↑  조사 / 상호작용   V  소모품 사용   Q 또는 ↓+V  소모품 변경\nShift  대시 (능력 획득 시, 방향키 두 번도 가능)\nEsc  일시정지\n\n메뉴: 방향키 이동, Z/Enter 확인, X/Esc 취소\n허브: ↑ 건물 들어가기, V 휴대폰';
