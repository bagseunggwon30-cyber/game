'use strict';
// ───────────────────────── 임무 씬 (실제 플레이) ─────────────────────────
class MissionScene {
  constructor(job, carry) {
    this.job = job;
    this.carry = carry || null;
    this.s = Game.state;
    this.D = derive(this.s);
    this.story = job.story ? STORY_MISSIONS.find((m) => m.id === job.story) : null;
    // 심층 탐사: 단계마다 새 맵, 마지막 단계에서 진짜 목표
    this.deep = job.obj === 'deep' ? { stage: carry ? carry.stage : 1, stages: job.stages } : null;
    this.diff = this.deep ? Math.min(5, job.diff + Math.floor((this.deep.stage - 1) / 2)) : job.diff;
    this.theme = job.theme;
    this.th = THEMES[job.theme];
    this.obj = this.deep ? (this.deep.stage < this.deep.stages ? 'descend' : job.finalObj) : job.obj;
    const lastStage = !this.deep || this.deep.stage === this.deep.stages;
    const ngDoc = this.story && lastStage && this.s.cycle >= 2 && NG_DOCS[this.story.id] && !this.s.truths.includes(NG_DOCS[this.story.id]) ? NG_DOCS[this.story.id] : null;
    const randomDoc = !this.story && Math.random() < 0.3 + 0.04 * this.s.stats.luk + this.D.m.docChance ? this.pickRandomDoc() : null;
    this.gen = generateMission({
      theme: job.theme, obj: this.obj, diff: this.diff, seed: job.seed + (this.deep ? this.deep.stage * 7919 : 0), luk: this.s.stats.luk, deep: this.deep,
      tutorial: this.story && this.story.tutorial, doc: this.story && (!this.deep || this.deep.stage === this.deep.stages) ? this.story.doc : null, randomDoc, doc2: ngDoc,
      weekMod: this.s.weekMod, rules: job.rules, patrol: job.patrol,
      boss: this.story && this.story.boss, extraArt: this.D.m.extraArt + (this.s.weekMod === 'boom' ? 1 : 0), jammed: !!job.jammed,
    });
    this.lvl = this.gen.lvl;
    this.tiles = buildTiles(job.theme);
    this.player = new Player(this.gen.start.x, this.gen.start.y, this);
    this.player.shield = 0;
    this.ng = ngMul(this.s);
    if (!carry) codexAdd(this.s, 'place', job.theme);
    this.enemies = this.gen.enemies.map((e) => this.ngScale(new Enemy(e.type, e.x, e.y, e.layer, this, this.diff)));
    if (this.s.weekMod === 'boom') for (const e of this.enemies) { e.hp = Math.round(e.hp * 1.15); e.maxHp = e.hp; }
    if (this.s.weekMod === 'blackout') this.D.light -= 15;
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
    this.run = carry ? carry.run : { found: [], cash: 0, docs: [], kills: 0, damage: 0, time: 0, boss: false, jamTime: 0, stagesCleared: 0 };
    if (carry) {
      const p = this.player;
      p.hp = Math.min(p.maxHp, carry.hp); p.san = Math.min(p.maxSan, carry.san);
      p.fear = carry.fear || 0; p.shield = carry.shield || 0;
    }
    this.lastHopeUsed = false;
    // 통신 교란 상태 (깊이 3부터 뒷면 전체가 잡음에 잠긴다)
    this.jamBase = (job.jammed ? 0.5 : 0) + (this.deep && this.deep.stage >= 3 ? 0.12 * (this.deep.stage - 2) : 0);
    this.jam = { v: 0, src: 0, immune: 0, hackT: 0, lieT: 0, targets: {}, swap: false, fakeChips: [], hide: {}, objLie: null, layerLie: false, toastT: 420, eventT: rndi(2400, 4200), eventLeft: 0 };
    this.disp = { hp: this.player.hp, san: this.player.san, fear: 0 };
    this.objState = { clues: 0, cluesTotal: this.interacts.filter((o) => o.type === 'clue').length, anchors: 0, anchorsTotal: this.interacts.filter((o) => o.type === 'rift').length, complete: false, bossDone: false };
    this.ending = false;
    this.backTime = 0;
    this.prompt = null;
    this.hintText = null; this.hintT = 0;
    this.heartT = 0;
    this.glitchT = 0;
    this.noise = Gfx.makeCanvas(VW, VH);
    this.makeNoise();
    // 방 지도 / 체크포인트 / 봉인 열쇠
    this.side = job.side ? SIDE_BY_ID[job.side] : null;
    // 근무 수칙 (꿀알바 / 서브 의뢰)
    if (job.rules) {
      const len = 200 + this.diff * 25;   // 실제 초: 02:00 → 06:00
      this.rule = {
        list: job.rules, clock: 0, clockMax: 240, perFrame: 240 / (len * 60),
        viol: 0, noteFound: !!this.D.ab.ruleSense, backRun: 0, fireT: 0,
        patrols: 0, patrolTotal: this.interacts.filter((o) => o.type === 'patrol').length,
        ev: { flicker: { next: rndi(25, 35) * 60, t: 0 }, steps: { next: rndi(35, 50) * 60, t: 0 }, voice: { next: rndi(40, 60) * 60, t: 0 }, chime: { next: rndi(20, 30) * 60, t: 0 }, three: { t: 0, done: false } },
      };
    }
    this.visited = new Set();
    this.curRoom = null;
    this.checkpoint = null; this.cpUsed = false;
    this.hasKey = false;
    this.downHint = false;
    if (this.obj === 'descend' && !this.interacts.some((o) => o.type === 'descend')) {
      const ex = this.interacts.find((o) => o.type === 'exit');
      if (ex) { ex.type = 'descend'; ex.layer = 'both'; }
    }
    this.snapCamera();
  }

  pickRandomDoc() {
    const pool = RANDOM_DOCS.filter((t) => !this.s.truths.includes(t));
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
    Sound.setAmbience(this.frontAmb());
    const storyIntro = this.story && !this.carry ? (this.s.cycle >= 2 && NG_INTRO[this.story.id] ? NG_INTRO[this.story.id].concat(this.story.intro) : this.story.intro) : null;
    const intro = storyIntro || (this.side ? this.side.intro : null) ||
      (this.job.ruleJob ? [['', RULE_SCENES[this.theme].intro]] : null);
    const next = () => {
      if (this.rule) Game.push(new TextView('야간 근무 수칙', this.ruleSheetText(), () => this.showStartBanner(), { paper: true }));
      else this.showStartBanner();
    };
    if (intro && intro.length) Game.push(new DialogModal(intro, next));
    else next();
  }
  ruleSheetText() {
    const R = this.rule;
    const lines = R.list.map((r, i) => {
      const shown = r.fake ? RULES[r.id].fake : ruleText(r.id, this.theme);
      if (R.noteFound && r.fake) return `${i + 1}. ${shown}\n   ✕ 거짓 — 진짜: ${ruleText(r.id, this.theme)}`;
      return `${i + 1}. ${shown}`;
    });
    return lines.join('\n') + `\n\n근무 시간 02:00 ~ 06:00. 수칙을 ${RULE_MAX_VIOL}번 어기면 해고입니다.` + (R.noteFound ? '' : '\n(어딘가에 이전 근무자의 메모가 있다는 소문이 있다.)');
  }
  showStartBanner() {
    this.bannerT = 150;
    if (this.m.startHope) this.addHope(this.m.startHope, '응원');
  }

  // ── 편의 ──
  toast(text, col) { Game.toast(text, col); }
  floatText(x, y, text, col) { this.floaters.push({ x, y, text, col, t: 45 }); }
  spawnEnemy(type, x, y, layer) { const e = this.ngScale(new Enemy(type, x, y, layer, this, this.diff)); this.enemies.push(e); return e; }
  // 표면 배경음: 근무 수칙 알바는 어딘가 어긋난 매장 음악
  frontAmb() { return this.rule ? 'muzak' : 'front'; }
  // 화면 안에서 같은 면에 보이는 존재를 도감에 '목격'으로 남긴다
  codexLook() {
    const p = this.player, cam = this.cam;
    for (const e of this.enemies) {
      if (e.dead || (e.layer !== p.layer && e.layer !== 'both')) continue;
      if (e.cx < cam.x || e.cx > cam.x + VW || e.cy < cam.y || e.cy > cam.y + VH) continue;
      if (codexSee(this.s, 'enemy', e.type)) this.floatText(e.cx, e.y - 14, '도감 등록', '#c8a04a');
    }
  }
  ngScale(e) {
    if (this.ng > 1) { e.hp = Math.round(e.hp * this.ng); e.maxHp = e.hp; e.dmg = Math.round(e.dmg * (1 + (this.ng - 1) / 2)); }
    return e;
  }

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
    const frames = Math.round(sec * 60 * (1 + this.m.hopeDur) * (this.s.weekMod === 'dread' ? 1.3 : 1));
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
      for (const e of this.enemies) if (!e.dead && e.type !== 'smiler' && e.layer === p.layer && Math.hypot(e.cx - p.cx, e.cy - p.cy) < 80) e.hurt(30, sign(e.cx - p.cx) || 1, 30);
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
        if (this.deep) rate += (this.deep.stage - 1) * 0.35;
        if (p.san < p.maxSan * 0.3) rate += 1.5;
        let mul = (1 - m.fearGain) * (this.s.weekMod === 'dread' ? 1.3 : 1);
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
  // ───── 근무 수칙: 시계 · 이벤트 · 위반 ─────
  ruleHas(id) { return !!(this.rule && this.rule.list.some((r) => r.id === id)); }
  clockText() { const m = Math.floor(this.rule.clock); return `0${2 + Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')}`; }
  ruleViolate(id, why) {
    const R = this.rule, p = this.player;
    if (!R || !this.ruleHas(id) || R.fireT > 0) return;
    R.viol++;
    Sound.play('static'); Sound.play('hurt'); Sound.play('boss');
    Gfx.shake(5, 24);
    this.jam.hackT = Math.max(this.jam.hackT, 180);
    this.addFear(30); p.san -= 12;
    this.glitchT = 20;
    this.toast(`수칙 위반 — ${why} (${R.viol}/${RULE_MAX_VIOL})`, '#ff3a5a');
    this.floatText(p.cx, p.y - 24, '수칙 위반', '#ff3a5a');
    // 어긴 사람을 찾아오는 것
    for (const dx of [-110, 110, -60, 60]) {
      const x = p.x + dx * (p.facing > 0 ? 1 : -1);
      if (!boxHits(this.lvl, 'back', x, p.y - 12, 10, 32)) { this.spawnEnemy('watcher', x, p.y - 12, 'back'); break; }
    }
    if (R.viol >= RULE_MAX_VIOL) { R.fireT = 120; this.locked = true; Sound.play('die'); }
  }
  updateRules() {
    const R = this.rule, p = this.player, E = R.ev;
    if (R.fireT > 0) { if (--R.fireT === 0) this.finish('fired'); return; }
    R.clock = Math.min(R.clockMax, R.clock + R.perFrame);
    if (!this.objState.complete && R.clock >= R.clockMax && R.patrols >= R.patrolTotal) this.completeObjective('06:00 — 근무 끝! 퇴근 문으로 →');
    const busy = () => E.flicker.t > 0 || E.steps.t > 0 || E.chime.t > 0 || E.three.t > 0 || E.voice.t > 0;
    const start = (k, fn) => { if (!this.ruleHas(k === 'steps' ? 'noLookBack' : k === 'voice' ? 'noAnswer' : k === 'chime' ? 'greet' : 'flicker')) return; if (E[k].t > 0) return; if (--E[k].next > 0) return; if (busy()) { E[k].next = 90; return; } fn(); };
    // 형광등 깜빡임 → 표면으로
    start('flicker', () => { E.flicker.t = 240; E.flicker.hit = false; E.flicker.next = rndi(30, 48) * 60; Sound.play('buzz'); });
    if (E.flicker.t > 0) {
      E.flicker.t--;
      if (E.flicker.t % 40 === 0) Sound.play('buzz');
      if (240 - E.flicker.t > 80 && p.layer === 'back' && !E.flicker.hit) { E.flicker.hit = true; this.ruleViolate('flicker', '깜빡일 때 뒷면에 있었다'); }
    }
    // 뒤따라오는 발소리 → 뒤돌아보지 않기
    start('steps', () => { E.steps.t = 360; E.steps.hit = false; E.steps.next = rndi(35, 55) * 60; });
    if (E.steps.t > 0) {
      E.steps.t--;
      if (E.steps.t % 45 === 0) { Sound.play('steps'); this.floatText(p.cx - p.facing * 30, p.y + 4, '저벅…', '#8a86a0'); }
      if (360 - E.steps.t > 30 && p.facing < 0 && !E.steps.hit) { E.steps.hit = true; this.ruleViolate('noLookBack', '뒤를 돌아봤다'); }
    }
    // 이름을 부르는 목소리 → 대답하지 않기
    start('voice', () => {
      E.voice.t = 420; E.voice.next = rndi(40, 60) * 60;
      const vx = p.x - p.facing * 34;
      this.voiceObj = { type: 'voice', x: vx, y: p.y - 10, w: 20, h: 32, layer: 'both', done: false };
      this.interacts.push(this.voiceObj);
      Sound.play('whisper');
      this.floatText(vx + 10, p.y - 14, pickR(['하람아…?', '하람 씨, 거기 있어요?', '나야. 민재.', '대답 좀 해 줘…']), '#c8c4d8');
    });
    if (E.voice.t > 0 && --E.voice.t === 0 && this.voiceObj) { this.voiceObj.done = true; this.voiceObj = null; }
    // 종소리 → 3초 안에 인사
    start('chime', () => { E.chime.t = 180; E.chime.greeted = false; E.chime.next = rndi(28, 42) * 60; Sound.play('chime'); this.floatText(p.cx, p.y - 20, '딸랑—', '#f2d040'); });
    if (E.chime.t > 0 && --E.chime.t === 0 && !E.chime.greeted) this.ruleViolate('greet', '인사하지 않았다');
    // 새벽 3시 정각 → 5초 멈춤
    if (this.ruleHas('stopAt3') && !E.three.done && R.clock >= 60) { E.three.done = true; E.three.t = 300; E.three.hit = false; Sound.play('chime'); Sound.play('heart'); }
    if (E.three.t > 0) {
      E.three.t--;
      const moving = Math.abs(p.vx) > 0.4 || !p.onGround || p.atkT > 0 || p.dashT > 0;
      if (300 - E.three.t > 40 && moving && !E.three.hit) { E.three.hit = true; this.ruleViolate('stopAt3', '3시 정각에 움직였다'); }
    }
    // 뒷면 30초 제한
    if (this.ruleHas('stayFront')) {
      R.backRun = p.layer === 'back' ? R.backRun + 1 : 0;
      if (R.backRun > 30 * 60) { R.backRun = 0; this.ruleViolate('stayFront', '뒷면에 너무 오래 있었다'); }
    }
  }

  // ───── 통신 교란: 휴대폰(HUD)이 거짓말을 한다 ─────
  updateJam() {
    const p = this.player, J = this.jam;
    let src = this.jamBase;
    if (p.layer === 'back') {
      for (const z of this.gen.jamZones || []) if (p.cx > z.x0 && p.cx < z.x1 && (z.y0 == null || (p.cy > z.y0 && p.cy < z.y1))) src = Math.max(src, 0.75);
      let n = 0;
      for (const e of this.enemies) if (!e.dead && e.def.jam && e.layer === 'back' && Math.hypot(e.cx - p.cx, e.cy - p.cy) < 100) n++;
      src = Math.max(src, Math.min(0.9, n * ENEMIES.notif.jam));
      if (J.eventLeft > 0) { J.eventLeft--; src = Math.max(src, 0.6); }
      else if (this.diff >= 4 && --J.eventT <= 0) { J.eventLeft = 360; J.eventT = rndi(2400, 4200); }
    }
    if (J.hackT > 0) { J.hackT--; src = Math.max(src, 0.9); }
    if (this.s.gear.includes('shieldcase')) src *= 1 - GEAR.shieldcase.jamRes;
    if (p.layer === 'front') src *= 0.5;
    if (J.immune > 0) { J.immune--; src = 0; }
    J.src = src;
    J.v = src > J.v ? Math.min(src, J.v + 0.02) : Math.max(src, J.v - (p.layer === 'front' ? 0.012 : 0.006));
    if (J.v < 0.12) {
      J.targets = {}; J.swap = false; J.fakeChips = []; J.hide = {}; J.objLie = null; J.layerLie = false;
    } else {
      this.run.jamTime++;
      this.s.flags.jamSeen = true;
      if (!this.s.flags.hintJam) { this.s.flags.hintJam = true; this.showHint('통신 교란! 휴대폰 화면(HUD)의 수치·아이콘·알림이 거짓일 수 있다. 화면 효과와 심장 소리는 진짜다.'); }
      if (--J.lieT <= 0) {
        J.lieT = rndi(60, 140);
        const v = J.v;
        J.targets = {
          hp: Math.random() < v ? rnd(0.2, 1) * p.maxHp : null,
          san: Math.random() < v ? rnd(0.1, 1) * p.maxSan : null,
          fear: Math.random() < v ? rnd(0, 100) : null,
        };
        J.swap = v > 0.6 && Math.random() < 0.45;
        J.fakeChips = v > 0.3 && Math.random() < v ? [pickR(['hope', 'shield', 'rage'])] : [];
        J.hide = v > 0.4 && Math.random() < v ? { panic: true, frightened: true, halluc: true, erosion: Math.random() < 0.5 } : {};
        J.objLie = v > 0.45 && Math.random() < 0.35 ? pickR(OBJ_LIES) : null;
        J.layerLie = v > 0.75 && Math.random() < 0.3;
      }
      if (J.v > 0.35 && --J.toastT <= 0) {
        J.toastT = rndi(480, 840);
        Game.toast(glitchText(pickR(FAKE_TOASTS), J.v * 0.3), pickR([COL.green, '#f2d040', COL.cyan, UI.C.text]));
        Sound.play('phone');
      }
      if (Math.random() < J.v * 0.015) Sound.play('static');
    }
    // 표시값 (거짓 목표를 향해 부드럽게 흔들린다)
    const truth = this.jamTruth();
    const show = (key, real) => {
      const tgt = J.targets[key];
      const want = truth || tgt == null ? real : lerp(real, tgt, clamp(J.v * 1.25, 0, 1));
      this.disp[key] = J.v < 0.12 || truth ? real : lerp(this.disp[key], want, 0.07);
    };
    show('hp', p.hp); show('san', p.san); show('fear', p.fear);
  }
  // '간파' 스킬: 교란 중에도 주기적으로 진짜 수치가 비친다
  jamTruth() { return this.m.jamSight && this.jam.v >= 0.12 && this.time % 70 < 16; }

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
    Sound.setAmbience(this.arenaActive && this.boss && !this.boss.dead ? 'boss' : target === 'back' ? 'back' : this.frontAmb());
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
      if (it.jamImmune) { this.jam.immune = it.jamImmune * 60; this.jam.v = 0; this.floatText(p.cx, p.y - 16, '신호 차단', '#62d6e8'); }
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
    const p = this.player;
    // 종소리가 울리는 동안 ↑ = 인사
    if (this.rule && this.rule.ev.chime.t > 0 && !this.rule.ev.chime.greeted) {
      this.rule.ev.chime.greeted = true;
      Sound.play('select');
      this.floatText(p.cx, p.y - 16, '어서 오세요!', '#f2d040');
      return;
    }
    const o = this.nearInteract();
    if (!o) return;
    switch (o.type) {
      case 'entry':
        if (this.deep) {
          Game.push(new Menu({
            title: '탐사를 마칠까?', w: 250, desc: true,
            items: [
              { label: '여기서 철수한다', desc: `지금까지 내려간 깊이(${this.run.stagesCleared || 0}단계)만큼 보수를 받는다. 주운 아티팩트는 챙긴다.`, onSelect: (m) => { m.close(); this.finish('extract'); } },
              { label: '계속한다', desc: '아직 더 갈 수 있다.', onSelect: (m) => m.close() },
            ],
          }));
          break;
        }
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
        Game.push(new TextView(tr.title, tr.text + (isNew ? '\n\n[진실 조각 획득 ' + this.s.truths.length + '/' + truthList(this.s).length + ']' : ''), null, { paper: true }));
        break;
      }
      case 'core':
        this.startFinaleTalk();
        break;
      case 'descend':
        this.reachDescend();
        break;
      case 'patrol': {
        o.done = true;
        const R = this.rule;
        if (R) R.patrols++;
        Sound.play('clue');
        this.toast(R ? `순찰 확인 (${R.patrols}/${R.patrolTotal})` + (R && R.patrols >= R.patrolTotal && R.clock < R.clockMax ? ' — 06:00까지 버티자' : '') : '순찰 확인', COL.yellow);
        if (R && R.patrols >= R.patrolTotal && R.clock >= R.clockMax && !this.objState.complete) this.completeObjective('06:00 — 근무 끝! 퇴근 문으로 →');
        break;
      }
      case 'reddoor':
        o.done = true;
        Sound.play('door');
        for (let i = 0; i < 20; i++) this.particles.push({ x: o.x + 12, y: o.y + 16, vx: rnd(-2, 2), vy: rnd(-2, 1), life: 30, col: '#c41e3a', size: 2 });
        this.ruleViolate('noRedDoor', '빨간 문을 열었다');
        break;
      case 'voice':
        o.done = true;
        if (this.voiceObj === o) this.voiceObj = null;
        this.floatText(p.cx, p.y - 14, '"…응?"', '#c8c4d8');
        this.ruleViolate('noAnswer', '부르는 목소리에 대답했다');
        break;
      case 'rulenote': {
        o.done = true;
        const R = this.rule;
        if (R) R.noteFound = true;
        Sound.play('pickup');
        const fakes = R ? R.list.map((r, i) => [r, i]).filter(([r]) => r.fake) : [];
        const body = fakes.length ? fakes.map(([r, i]) => `${i + 1}번은 거짓말이다.\n진짜는 이거다: ${ruleText(r.id, this.theme)}`).join('\n\n') : '이번 수칙표에는 거짓말이 없다. ...이번에는.';
        Game.push(new TextView('이전 근무자의 메모', body + '\n\n— 수칙표는 일시정지 메뉴에서 다시 볼 수 있다.', null, { paper: true }));
        break;
      }
      case 'checkpoint':
        o.done = true;
        this.checkpoint = { x: o.x, y: o.y + o.h - p.h, layer: p.layer };
        Sound.play('anchor');
        this.toast('임시 앵커 설치 — 쓰러지면 한 번 여기서 다시 일어난다', COL.green);
        for (let i = 0; i < 16; i++) this.particles.push({ x: o.x + 8, y: o.y + 12, vx: rnd(-1.5, 1.5), vy: rnd(-2, 0), life: 26, col: COL.green, size: 2 });
        break;
      case 'gate':
        if (!this.hasKey) { Sound.play('deny'); this.floatText(p.cx, p.y - 10, '봉인되어 있다 — 열쇠가 필요하다', '#ff8a8a'); return; }
        o.done = true;
        for (const [x, y] of o.cells) this.lvl.set('both', x, y, T_EMPTY);
        this.hasKey = false;
        Sound.play('door'); Sound.play('resolve');
        Gfx.shake(3, 14);
        this.toast('봉인문이 열렸다', COL.yellow);
        break;
    }
  }

  // ── 심층 탐사: 균열 도착 ──
  reachDescend() {
    const p = this.player;
    this.run.stagesCleared = this.deep ? this.deep.stage : 0;
    if (!this.deep) { this.finish('success'); return; }
    // 균열 앞 휴식
    const heal = 0.25;
    p.hp = Math.min(p.maxHp, p.hp + p.maxHp * heal);
    p.san = Math.min(p.maxSan, p.san + p.maxSan * heal);
    p.fear = Math.max(0, p.fear - 40);
    p.st.remove('panic');
    Sound.play('anchor');
    this.locked = true;
    Game.push(new DeepRest(this));
  }
  descendNext() {
    const p = this.player;
    const carry = { stage: this.deep.stage + 1, run: this.run, hp: p.hp, san: p.san, fear: p.fear, shield: p.shield };
    this.run.time += this.time;
    this.ending = true;
    Sound.play('flip');
    Game.fadeTo(() => Game.setScene(new MissionScene(this.job, carry)), 40);
  }

  objText() {
    const o = this.objState;
    if (this.obj === 'resolve') return o.clues < o.cluesTotal ? `단서 ${o.clues}/${o.cluesTotal}` : o.complete ? '해소 완료' : '원인 해소';
    if (this.obj === 'stabilize') return `앵커 ${o.anchors}/${o.anchorsTotal}`;
    if (this.obj === 'erase') return o.complete ? '말소 완료' : '핵 말소';
    if (this.obj === 'finale') return '최상층으로';
    if (this.obj === 'descend') return '균열을 찾아 내려가기';
    if (this.obj === 'patrol' && this.rule) {
      const R = this.rule;
      if (o.complete) return '근무 끝 — 퇴근';
      return R.patrols < R.patrolTotal ? `순찰 ${R.patrols}/${R.patrolTotal}` : '06:00까지 버티기';
    }
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
    if (a.seal) for (const [x, y] of a.seal) this.lvl.set('both', x, y, T_SOLID);
    else for (let y = CEIL; y < a.gy; y++) { this.lvl.set('both', a.tx0 - 1, y, T_SOLID); this.lvl.set('both', a.tx1, y, T_SOLID); }
    if (this.player.layer !== 'back') {
      this.setLayer('back');
      this.toast('뒷면으로 끌려 들어간다!', '#ff5a8a');
    }
    this.forceBackUntil = this.time + 150;
    this.boss = new Boss(a.boss, a, this, this.diff);
    codexSee(this.s, 'boss', a.boss);
    if (this.ng > 1) { this.boss.maxHp = Math.round(this.boss.maxHp * this.ng); this.boss.hp = this.boss.maxHp; this.boss.dmg = Math.round(this.boss.dmg * (1 + (this.ng - 1) / 2)); }
    Sound.play('boss');
    Sound.setAmbience('boss');
    Gfx.shake(4, 30);
    this.bossBanner = 150;
  }
  onBossDefeated(boss) {
    const a = this.gen.arena;
    this.arenaActive = false;
    this.unsealArena();
    this.objState.complete = true; this.objState.bossDone = true;
    this.run.boss = true;
    codexAdd(this.s, 'boss', boss.key);
    if (MEME_BY_BOSS[boss.key]) codexAdd(this.s, 'meme', MEME_BY_BOSS[boss.key]);
    this.addHope(20, '말소');
    this.player.fear = 0; this.player.st.remove('panic');
    Sound.play('resolve');
    Sound.setAmbience(this.player.layer === 'back' ? 'back' : this.frontAmb());
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

  unsealArena() {
    const a = this.gen.arena;
    if (a.seal) for (const [x, y] of a.seal) this.lvl.set('both', x, y, T_EMPTY);
    else for (let y = CEIL; y < a.gy; y++) { this.lvl.set('both', a.tx0 - 1, y, T_EMPTY); this.lvl.set('both', a.tx1, y, T_EMPTY); }
  }
  resetArena() {
    this.arenaActive = false;
    this.unsealArena();
    this.boss = null;
    this.projectiles = this.projectiles.filter((pr) => pr.from === 'player');
    for (const e of this.enemies) if (e.layer === 'back' && this.inArena(e.cx, e.cy)) e.dead = true;
    Sound.setAmbience(this.player.layer === 'back' ? 'back' : this.frontAmb());
  }
  inArena(x, y) {
    const a = this.gen.arena;
    return a && x > a.x0 && x < a.x1 && (a.y0 == null || (y > a.y0 && y < a.y1));
  }

  completeObjective(msg) {
    this.objState.complete = true;
    this.addHope(20, '해냈다');
    Sound.play('resolve');
    this.toast(msg, COL.green);
    Gfx.shake(4, 20);
    // 남은 뒷면 존재 약화
    for (const e of this.enemies) if (!e.dead && e.layer === 'back' && e.type !== 'smiler' && Math.abs(e.cx - this.player.cx) < 300) e.hurt(999, 1);
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
    const canExpose = s.truths.length >= EXPOSE_NEED;
    const canMerge = s.contamination >= 60;
    const items = [
      { label: '계약서에 서명한다', desc: '정규직이 된다. 청명의 일부로, 영원히 안전하게.', onSelect: (m) => { m.close(); this.endWith('hire'); } },
      { label: '모든 기록을 퍼뜨린다', disabled: !canExpose, desc: canExpose ? '모은 진실을 세상에 공개한다. 청명이 막아설 것이다.' : `진실 조각이 부족하다 (${s.truths.length}/${EXPOSE_NEED})`, onSelect: (m) => { m.close(); this.finaleFight('expose'); } },
      { label: '뒷면에 남는다', disabled: !canMerge, desc: canMerge ? '표면으로 돌아가지 않는다. 당신은 이야기가 된다.' : `아직 뒷면이 당신을 받아들이지 않는다 (오염 ${Math.round(s.contamination)}/60)`, onSelect: (m) => { m.close(); this.endWith('merge'); } },
    ];
    // 서브 의뢰 연작을 시작했다면 그 인연이 선택지가 된다
    if (s.sideDone.includes('A1')) {
      const ok = !!s.flags.noeulFree;
      items.push({ label: '노을을 부른다', disabled: !ok, desc: ok ? '혼자 그만두지 않는다. 노을과 함께 청명을 거절한다. (싸움 중 노을이 돕는다)' : '노을은 아직 청명에 묶여 있다 (서브 의뢰 "마지막 근무")', onSelect: (m) => { m.close(); this.finaleFight('together'); } });
    }
    if (s.sideDone.includes('C1')) {
      const ok = s.sideDone.includes('C3');
      items.push({ label: 'K의 방송을 켠다', disabled: !ok, desc: ok ? '이 모든 것을 생중계한다. 시청자의 응원이 희망이 된다.' : 'K는 아직 진짜를 찍을 준비가 안 됐다 (서브 의뢰 "마지막 방송")', onSelect: (m) => { m.close(); this.finaleFight('live'); } });
    }
    if (s.cycle >= 2) {
      const ok = trueEndReady(s);
      const need = [];
      if (!NG_TRUTHS.every((t) => s.truths.includes(t))) need.push(`재계약 문서 ${NG_TRUTHS.filter((t) => s.truths.includes(t)).length}/${NG_TRUTHS.length}`);
      if (s.truths.length < TRUE_END_TRUTHS) need.push(`진실 ${s.truths.length}/${TRUE_END_TRUTHS}`);
      if (!s.sideDone.includes('A3')) need.push('노을의 마지막 근무');
      if (!s.sideDone.includes('C3')) need.push('K의 마지막 방송');
      items.push({ label: '팀장의 이름을 부른다', disabled: !ok, desc: ok ? '퇴근 도장 대장을 꺼낸다. 이번엔 끝까지 간다.' : '아직 이름을 다 모르겠다 — ' + need.join(' · '), onSelect: (m) => { m.close(); this.finaleFight('true'); } });
    }
    items.push({ label: '거절한다', desc: '서명하지 않고 나간다. 청명이 막아설 것이다.', onSelect: (m) => { m.close(); this.finaleFight('quit'); } });
    Game.push(new Menu({ title: '결재함 앞에서', w: 270, desc: true, onCancel: false, block: 45, items }));
  }
  finaleFight(route) {
    this.finaleRoute = route;
    this.allyT = 0;
    Game.push(new DialogModal(FINALE_ROUTES[route].concat([['', '결재함이 열리고, 도장이 찍히는 소리가 천둥처럼 울렸다.']]), () => {
      this.locked = false;
      this.interacts = this.interacts.filter((o) => o.type !== 'core');
      this.startArena();
      if (route === 'together') this.toast('노을이 반쪽 사원증으로 신호를 잡아 준다 — 교란 면역', '#9ad0a8');
      if (route === 'live') this.toast('생방송 시작 — 시청자의 응원이 희망이 된다', '#ff8a7a');
    }));
  }
  // 최종전 동료 효과
  updateFinaleAlly() {
    const r = this.finaleRoute, p = this.player;
    if (!this.arenaActive || !r || p.dead) return;
    this.allyT = (this.allyT || 0) + 1;
    if (r === 'together') {
      this.jam.immune = Math.max(this.jam.immune, 2);
      if (this.allyT % 720 === 0) {
        p.hp = Math.min(p.maxHp, p.hp + Math.round(p.maxHp * 0.12));
        p.st.remove('panic'); p.fear = Math.max(0, p.fear - 25);
        this.floatText(p.cx, p.y - 16, '노을: 버텨요!', '#9ad0a8');
        Sound.play('anchor');
      }
    } else if (r === 'live') {
      if (this.allyT % 600 === 0) {
        this.addHope(5, '시청자 응원');
        this.floatText(p.cx, p.y - 24, pickR(['ㅋㅋㅋ 연출 미쳤다', '도망쳐!!', '이거 진짜임?', '형광조끼 화이팅', '구독 박고 갑니다']), '#ff8a7a');
      }
    }
  }
  afterFinaleBoss() {
    this.locked = true;
    if (this.finaleRoute === 'true' && !this.truePhase2) {
      this.truePhase2 = true;
      Game.push(new DialogModal(FINALE_TRUE_MID, () => {
        this.locked = false;
        this.gen.arena.boss = 'nameless';
        this.objState.complete = false; this.objState.bossDone = false;
        this.startArena();
      }));
      return;
    }
    const last = this.finaleRoute === 'true'
      ? [['', '이름 없는 사원증들이 하나씩 떨어져 나와, 바닥에 조용히 쌓였다.'], ['seo', '...이상하네요. 처음으로, 내 이름이 기억나요.']]
      : [['', '거대한 도장이 금 가며 부서졌다. 수천 장의 결재 서류가 흩날린다.'], ['seo', '...이상하네요. 처음으로, 내 이름이 기억날 것 같아요.']];
    Game.push(new DialogModal(last, () => this.endWith(this.finaleRoute)));
  }
  endWith(key) {
    this.ending = true;
    Game.fadeTo(() => Game.setScene(new EndingScene(key)));
  }

  finish(result) {
    if (this.ending) return;
    this.ending = true;
    this.run.time = (this.run.time || 0) + this.time;
    const p = this.player;
    if (this.deep && result === 'success') this.run.stagesCleared = this.deep.stages;
    const deep = this.deep ? { cleared: this.run.stagesCleared || 0, stages: this.deep.stages } : null;
    if (this.rule) this.run.ruleViol = this.rule.viol;
    Game.fadeTo(() => Game.setScene(new ResultScene(this.job, result, this.run, { sanDeath: p.san <= 0, deep })));
  }

  die() {
    const p = this.player;
    if (p.dead) return;
    if (this.checkpoint && !this.cpUsed) {
      this.cpUsed = true;
      if (this.arenaActive) this.resetArena();
      const c = this.checkpoint;
      p.x = c.x; p.y = c.y; p.vx = 0; p.vy = 0;
      p.hp = Math.max(1, Math.round(p.maxHp * 0.5)); p.san = Math.max(1, Math.round(p.maxSan * 0.5));
      p.fear = 20; p.st.remove('panic'); p.inv = 120;
      if (p.layer !== c.layer) this.setLayer(c.layer, true);
      this.snapCamera();
      Sound.play('resolve'); Gfx.shake(4, 20);
      this.toast('임시 앵커에서 다시 일어났다 (한 번뿐)', COL.green);
      return;
    }
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
    if (this.finaleRoute) this.updateFinaleAlly();
    if (this.time % 20 === 0) this.codexLook();
    this.updateProjectiles();
    this.updatePickups();
    this.updateInteracts();
    this.updateTriggers();

    // 정신력 · 공포 · 상태 효과
    if (!p.dead && !this.locked) {
      this.updateMind();
      this.updateJam();
      if (this.rule) this.updateRules();
      const panic = p.st.has('panic');
      if (p.layer === 'back') {
        let mul = (this.arenaActive ? 0.5 : 1) * (this.s.weekMod === 'flood' ? 1.25 : 1);
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
        { label: '환경 설정', desc: '음량 · 화면 흔들림 · 깜빡임 줄이기 · 글자 속도 · 조작법', onSelect: () => openSettings() },
        { label: '상태 효과 안내', desc: '공포·패닉·희망 등 버프/디버프 설명', onSelect: () => Game.push(new TextView('상태 효과', STATUS_HELP_TEXT)) },
        ...(this.rule ? [{ label: '근무 수칙', desc: '오늘 밤의 근무 수칙표를 다시 본다.', onSelect: () => Game.push(new TextView('야간 근무 수칙', this.ruleSheetText(), null, { paper: true })) }] : []),
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
          codexAdd(this.s, 'art', k.id);
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
          if (cur >= itemMax(this.s)) { k.dead = false; continue; }
          this.s.items[k.id] = cur + 1;
          Sound.play('pickup');
          this.toast(`${ITEMS[k.id].name} 획득`, COL.white);
          break;
        }
        case 'key':
          this.hasKey = true;
          Sound.play('artifact');
          this.toast('봉인 열쇠를 얻었다 — 봉인문을 열 수 있다', COL.yellow);
          break;
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
      if (!a.done && p.x > a.x && p.x < a.x1 && (a.y0 == null || (p.cy > a.y0 && p.cy < a.y1))) {
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
    const inAr = ar && (ar.y0 == null ? true : p.onGround && p.cx > ar.x0 + 24 && p.cx < ar.x1 - 24 && p.cy > ar.y0 + 16 && p.cy < ar.y1);
    if (ar && !this.arenaActive && !this.objState.bossDone && !ar.finale && inAr && p.x > ar.x0 + 40) this.startArena();
    if (ar && ar.finale && !this.finaleTalked && inAr && p.x > ar.x0 + 60) this.startFinaleTalk();
    // 체크포인트에서 되살아난 뒤 최종전을 다시 시작한다
    if (ar && ar.finale && this.finaleRoute && !this.locked && !this.arenaActive && !this.boss && !this.objState.bossDone && inAr && p.x > ar.x0 + 40) this.startArena();
    // 방 이동 기록 (미니맵) + 위에서 떨어져 들어왔을 때 안내
    if (this.gen.map) {
      const rx = Math.floor(p.cx / (RW * TS)), ry = Math.floor(p.cy / (RH * TS));
      const k = rx + ',' + ry;
      if (this.curRoom && ry > this.curRoom.ry && !this.s.flags.hintDrop) { this.s.flags.hintDrop = true; this.showHint('발판 위에서 ↓를 길게 누르면 아래로 내려간다. (↓+점프도 가능)'); }
      if (!this.curRoom || this.curRoom.k !== k) this.curRoom = { k, rx, ry };
      this.visited.add(k);
    }
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
    const rowH = this.lvl.rowH * TS;
    for (let r = Math.floor(cam.y / rowH); r * rowH < cam.y + VH; r++) {
      const top = r * rowH - cam.y, trimY = Math.round(top + this.lvl.trimOff * TS);
      ctx.fillStyle = P.trim; ctx.fillRect(0, trimY, VW, 3);
      ctx.fillStyle = shade(P.wall2, -14); ctx.fillRect(0, trimY + 3, VW, Math.max(0, Math.round(top + rowH) - trimY - 3));
    }
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
    // 전파 오염 구역
    for (const z of this.gen.jamZones || []) {
      const x0 = Math.round(z.x0 - cam.x), x1 = Math.round(z.x1 - cam.x);
      if (x1 < 0 || x0 > VW) continue;
      const a = L === 'back' ? 0.16 : 0.05;
      for (let x = Math.max(0, x0); x < Math.min(VW, x1); x += 3) {
        if (((x + cam.x) / 3 + this.time) % 7 < 2) { ctx.fillStyle = `rgba(98,214,232,${a})`; ctx.fillRect(x, 0, 1, VH); }
      }
      if (L === 'back') {
        for (let i = 0; i < 6; i++) { ctx.fillStyle = 'rgba(98,214,232,0.5)'; ctx.fillRect(rndi(Math.max(0, x0), Math.min(VW, x1)), rndi(0, VH), rndi(2, 6), 1); }
        for (const ex of [x0, x1]) if (ex > -10 && ex < VW + 10) { ctx.fillStyle = 'rgba(98,214,232,0.4)'; for (let y = 0; y < VH; y += 6) ctx.fillRect(ex, y, 1, 3); }
      }
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
    if (L === 'back' || this.s.weekMod === 'blackout') this.drawDarkness(ctx, cam, L === 'front' ? 0.55 : null);
    // 플로팅 텍스트
    for (const f of this.floaters) Gfx.text(ctx, f.text, f.x - cam.x, f.y - cam.y, f.col, { small: true, align: 'center' });
    // 상호작용 안내 (키캡 + 이름)
    if (this.prompt && !this.locked) {
      const o = this.prompt;
      const label = { entry: '철수', exit: '퇴근', clue: '조사', cause: '해소', rift: '앵커 설치', doc: '읽기', core: '결재함', descend: '내려가기', checkpoint: '임시 앵커', gate: this.hasKey ? '봉인 풀기' : '봉인문', patrol: '순찰 확인', reddoor: '문 열기', rulenote: '메모 읽기', voice: '대답하기' }[o.type];
      const tx = Math.round(o.x + o.w / 2 - cam.x), ty = Math.round(o.y - 16 - cam.y + Math.sin(this.time * 0.15) * 1.5);
      const w = Gfx.measure(ctx, label, { small: true }) + 22;
      UI.card(ctx, tx - w / 2, ty - 2, w, 15, { fill: 'rgba(12,11,19,0.9)', border: UI.C.line2 });
      UI.keycap(ctx, tx - w / 2 + 3, ty, '↑');
      Gfx.text(ctx, label, tx - w / 2 + 17, ty, UI.C.text, { small: true, shadow: false });
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
      case 'descend': {
        // 아래로 이어지는 소용돌이 균열
        const cx = x + o.w / 2, cy = y + o.h / 2;
        ctx.globalAlpha = 0.35 + Math.sin(t * 0.06) * 0.1; G.circle(ctx, cx, cy, 22, '#5a1a8a'); ctx.globalAlpha = 1;
        for (let i = 0; i < 18; i++) {
          const a = t * 0.05 + i * 0.7, r = 4 + (i % 6) * 3;
          ctx.fillStyle = i % 3 ? '#b86cff' : '#f4f0e6';
          ctx.fillRect(Math.round(cx + Math.cos(a) * r), Math.round(cy + Math.sin(a) * r * 1.4), 2, 2);
        }
        G.px(ctx, cx - 1, cy - 1, 3, 3, '#0b0b10');
        if (this.deep) G.text(ctx, `깊이 ${this.deep.stage + 1}`, cx, y - 12, '#b86cff', { small: true, align: 'center' });
        break;
      }
      case 'patrol': {
        G.px(ctx, x + 3, y + 6, 10, 18, '#3a3a48'); G.px(ctx, x + 4, y + 7, 8, 7, o.done ? '#6fd08c' : '#1a1a24');
        if (!o.done && t % 30 < 15) G.px(ctx, x + 7, y + 9, 2, 2, COL.yellow);
        G.px(ctx, x + 2, y + 22, 12, 2, '#5a566a');
        break;
      }
      case 'reddoor': {
        G.px(ctx, x, y, o.w, o.h, '#0b0b10'); G.px(ctx, x + 1, y + 1, o.w - 2, o.h - 1, '#7a0a14'); G.px(ctx, x + 3, y + 3, o.w - 6, o.h - 4, '#a8121e');
        G.px(ctx, x + o.w - 7, y + 16, 3, 3, '#f2c230');
        if (t % 90 < 6) { ctx.fillStyle = 'rgba(255,40,60,0.4)'; ctx.fillRect(x - 2, y - 2, o.w + 4, o.h + 2); }
        break;
      }
      case 'rulenote':
        if (!o.done) { ctx.drawImage(SPR.icon.rulebook, x + 1, y + Math.sin(t * 0.1)); if (t % 50 < 25) { ctx.fillStyle = '#ff5a6a'; ctx.fillRect(x + 12, y - 2, 1, 1); } }
        break;
      case 'voice': {
        if (o.done) break;
        ctx.globalAlpha = 0.35 + Math.sin(t * 0.2) * 0.15;
        G.px(ctx, x + 6, y + 2, 8, 8, '#1a1626'); G.px(ctx, x + 4, y + 10, 12, 20, '#1a1626');
        G.px(ctx, x + 8, y + 5, 1, 1, '#f4f0e6'); G.px(ctx, x + 11, y + 5, 1, 1, '#f4f0e6');
        ctx.globalAlpha = 1;
        break;
      }
      case 'checkpoint': {
        G.px(ctx, x + 6, y + 4, 3, o.h - 4, o.done ? '#6fd08c' : '#5a566a');
        G.px(ctx, x + 2, y, 11, 5, o.done ? '#c8f0d0' : '#8a86a0');
        if (o.done) { ctx.globalAlpha = 0.25 + Math.sin(t * 0.08) * 0.1; G.circle(ctx, x + 7, y + 3, 8, '#6fd08c'); ctx.globalAlpha = 1; }
        else if (t % 40 < 20) { ctx.fillStyle = '#c8c4d8'; ctx.fillRect(x + 7, y - 3, 1, 1); }
        if (o.done && this.cpUsed) G.text(ctx, '사용함', x + 7, y - 11, COL.dark, { small: true, align: 'center' });
        break;
      }
      case 'gate': {
        if (o.done) break;
        for (const [cxT, cyT] of o.cells) {
          const gx = cxT * TS - this.cam.x, gy = cyT * TS - this.cam.y;
          G.px(ctx, Math.round(gx), Math.round(gy), TS, TS, '#1a1220');
          for (let k = 2; k < TS; k += 5) G.px(ctx, Math.round(gx) + k, Math.round(gy), 2, TS, '#8a7a5a');
        }
        const [lx, ly] = o.cells[2];
        const ix = Math.round(lx * TS - this.cam.x + 8), iy = Math.round(ly * TS - this.cam.y - 2);
        G.px(ctx, ix - 4, iy, 9, 7, this.hasKey ? COL.yellow : '#c8a040'); G.px(ctx, ix - 2, iy - 4, 5, 4, '#0b0b10'); G.px(ctx, ix - 1, iy - 3, 3, 3, '#c8a040');
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
    } else if (k.type === 'key') {
      ctx.globalAlpha = 0.35 + Math.sin(k.t * 0.1) * 0.15; Gfx.circle(ctx, x + 7, y + 7, 9, '#f2c230'); ctx.globalAlpha = 1;
      ctx.drawImage(SPR.icon.key, x, y);
    } else if (k.type === 'cash') ctx.drawImage(SPR.icon.cash, x, y);
    else if (k.type === 'item') ctx.drawImage(SPR.icon.box, x, y);
    else if (k.type === 'sanorb') {
      ctx.fillStyle = COL.san; ctx.fillRect(x + 2, y + 2, 4, 4);
      ctx.fillStyle = '#fff'; ctx.fillRect(x + 3, y + 3, 2, 2);
      ctx.globalAlpha = 0.4; ctx.fillStyle = COL.san; ctx.fillRect(x, y + 3, 8, 2); ctx.fillRect(x + 3, y, 2, 8); ctx.globalAlpha = 1;
    }
  }

  drawDarkness(ctx, cam, alpha) {
    const t = Gfx.tctx;
    t.globalCompositeOperation = 'source-over';
    t.clearRect(0, 0, VW, VH);
    t.fillStyle = alpha != null ? `rgba(2,2,8,${alpha})` : this.arenaActive || this.boss ? 'rgba(4,0,2,0.55)' : 'rgba(4,0,2,0.8)';
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
    const flick = !Settings.calm && Math.random() < 0.03 ? 0.85 : 1;
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
      if (Settings.calm) { ctx.globalAlpha = 0.5; ctx.drawImage(this.noise, -20, -20, VW + 40, VH + 40); ctx.globalAlpha = 1; }
      else ctx.drawImage(this.noise, rndi(-40, 0), rndi(-40, 0), VW + 40, VH + 40);
      ctx.fillStyle = 'rgba(120,0,30,0.10)'; ctx.fillRect(0, 0, VW, VH);
      for (let y = 0; y < VH; y += 3) { ctx.fillStyle = 'rgba(0,0,0,0.12)'; ctx.fillRect(0, y, VW, 1); }
    }
    if (this.glitchT > 0 && !Settings.calm) {
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
      if (this.flipFx > 12 && !Settings.calm) { ctx.globalCompositeOperation = 'difference'; ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, VW, VH); ctx.globalCompositeOperation = 'source-over'; }
      const t = Gfx.tctx;
      t.clearRect(0, 0, VW, VH);
      t.drawImage(Gfx.buf, 0, 0);
      for (let x = 0; x < VW; x += 24) {
        const dy = Math.round(Math.sin(x * 0.3 + this.flipFx) * 10 * f);
        ctx.drawImage(Gfx.tmp, x, 0, 24, VH, x, dy, 24, VH);
      }
      ctx.fillStyle = L === 'back' ? `rgba(255,40,80,${(Settings.calm ? 0.1 : 0.25) * f})` : `rgba(255,255,255,${(Settings.calm ? 0.1 : 0.25) * f})`;
      ctx.fillRect(0, 0, VW, VH);
    }
    // 근무 수칙 이벤트 연출
    if (this.rule) {
      const E = this.rule.ev;
      if (E.flicker.t > 0) {
        // 깜빡임 줄이기: 점멸 대신 일정한 어둠 + 경고 문구
        if (Settings.calm) { ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(0, 0, VW, VH); Gfx.text(ctx, '— 조명이 깜빡인다 —', VW / 2, 34, '#f2d040', { align: 'center', small: true }); }
        else if ((this.time >> 2) % 3 === 0 || Math.random() < 0.15) { ctx.fillStyle = 'rgba(0,0,0,0.72)'; ctx.fillRect(0, 0, VW, VH); }
      }
      if (E.three.t > 0) {
        ctx.fillStyle = 'rgba(30,0,10,0.35)'; ctx.fillRect(0, 0, VW, VH);
        if (!this.big3) this.big3 = Gfx.bigText('03:00', '#ff3a5a', 4);
        ctx.globalAlpha = Settings.calm ? 0.75 : 0.6 + Math.sin(this.time * 0.3) * 0.3;
        ctx.drawImage(this.big3, Math.round((VW - this.big3.width) / 2), 70);
        ctx.globalAlpha = 1;
      }
      if (this.rule.fireT > 0) {
        ctx.fillStyle = `rgba(0,0,0,${clamp((120 - this.rule.fireT) / 60, 0, 0.85)})`; ctx.fillRect(0, 0, VW, VH);
        Gfx.text(ctx, '수칙 위반 3회 — 해고되었습니다.', VW / 2, VH / 2 - 6, '#ff5a6a', { align: 'center', bold: true });
      }
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

  drawMinimap(ctx, jv) {
    const M = this.gen.map, C = UI.C;
    const cw = 9, ch = 6;
    const mw = M.cols * (cw + 1) + 5, mh = M.rows * (ch + 1) + 5;
    const x0 = VW - 6 - mw, y0 = 62;
    UI.card(ctx, x0, y0, mw, mh, { fill: 'rgba(12,11,19,0.72)', border: C.line });
    const roomOf = (o) => Math.floor((o.x + (o.w || 0) / 2) / (RW * TS)) + ',' + Math.floor((o.y + (o.h || 0) / 2) / (RH * TS));
    const marks = {};
    for (const o of this.interacts) {
      if (o.done && o.type !== 'exit') continue;
      const k = roomOf(o);
      if (['clue', 'rift', 'cause', 'descend', 'core'].includes(o.type)) marks[k] = marks[k] || COL.cyan;
      if (o.type === 'exit') marks[k] = this.objState.complete ? COL.green : marks[k] || '#3a6a4a';
      if (o.type === 'gate') marks[k] = '#ff8a3a';
    }
    if (this.gen.arena && !this.objState.bossDone) { const k = Math.floor(this.gen.arena.x0 / (RW * TS)) + ',' + Math.floor(this.gen.arena.y0 / (RH * TS)); marks[k] = '#ff5a6a'; }
    for (const k of this.pickups.filter((q) => q.type === 'key').map(roomOf)) if (this.visited.has(k)) marks[k] = COL.yellow;
    const known = (r) => this.visited.has(r.gx + ',' + r.gy);
    const nearKnown = (r) => known(r) || M.rooms.some((q) => known(q) && Math.abs(q.gx - r.gx) + Math.abs(q.gy - r.gy) === 1 &&
      ((q.gx === r.gx + 1 && r.conns.R) || (q.gx === r.gx - 1 && r.conns.L) || (q.gy === r.gy + 1 && r.conns.D) || (q.gy === r.gy - 1 && r.conns.U)));
    for (const r of M.rooms) {
      const k = r.gx + ',' + r.gy;
      const rx = x0 + 3 + r.gx * (cw + 1), ry = y0 + 3 + r.gy * (ch + 1);
      const cur = this.curRoom && this.curRoom.k === k;
      if (known(r)) {
        ctx.fillStyle = cur ? (this.time % 30 < 20 ? C.accent : '#8a7a30') : '#46425e'; ctx.fillRect(rx, ry, cw, ch);
        ctx.fillStyle = '#6e6a88';
        if (r.conns.R) ctx.fillRect(rx + cw, ry + ch - 2, 1, 1);
        if (r.conns.D) ctx.fillRect(rx + 4, ry + ch, 1, 1);
      } else if (nearKnown(r) || marks[k]) {
        ctx.fillStyle = '#2a2740'; ctx.fillRect(rx, ry, cw, 1); ctx.fillRect(rx, ry + ch - 1, cw, 1); ctx.fillRect(rx, ry, 1, ch); ctx.fillRect(rx + cw - 1, ry, 1, ch);
      }
      if (marks[k]) { ctx.fillStyle = marks[k]; ctx.fillRect(rx + 3, ry + 2, 3, 2); }
    }
    if (jv) {
      for (let i = 0; i < jv * 30; i++) { ctx.fillStyle = Math.random() < 0.5 ? 'rgba(98,214,232,0.6)' : 'rgba(255,58,90,0.5)'; ctx.fillRect(x0 + rndi(1, mw - 3), y0 + rndi(1, mh - 3), rndi(1, 4), 1); }
    }
  }

  drawHUD(ctx) {
    const p = this.player, s = this.s, C = UI.C;
    // 모서리 그림자로 가독성 확보 (박스 없음)
    UI.corner(ctx, 0, 0, 120, 0.6);
    UI.corner(ctx, VW, 0, 110, 0.55);
    UI.corner(ctx, 0, VH, 90, 0.5);
    // ── 좌상단: 체력 / 정신력 / 공포 (휴대폰이 보여 주는 값 — 교란되면 거짓) ──
    const J = this.jam, jv = J.v >= 0.12 ? J.v : 0, truth = this.jamTruth();
    const panic = p.st.has('panic');
    const D = this.disp;
    if (this.hpGhost == null) this.hpGhost = D.hp;
    this.hpGhost = this.hpGhost > D.hp ? Math.max(D.hp, this.hpGhost - 0.6) : D.hp;
    const showPanic = panic && !(J.hide.panic && !truth);
    const rows = [
      { ic: 'hp', v: D.hp, max: p.maxHp, col: D.hp < p.maxHp * 0.3 && this.time % 30 < 15 ? '#ff8a8a' : '#e8464e', ghost: this.hpGhost / p.maxHp },
      { ic: 'san', v: D.san, max: p.maxSan, col: p.layer === 'back' ? '#b0a0ff' : '#8f7cff' },
      { ic: 'fear', v: D.fear, max: 100, col: showPanic ? (this.time % 10 < 5 ? '#ff3a5a' : '#ffffff') : D.fear >= 50 ? '#ff6a3a' : '#d08a48', ticks: [0.5] },
    ];
    if (J.swap && !truth) { const t = rows[1]; rows[1] = Object.assign({}, rows[2], { ic: 'san', max: 100 }); rows[2] = Object.assign({}, t, { ic: 'fear', max: p.maxSan }); }
    rows.forEach((r, i) => {
      const y = 8 + i * 11;
      ctx.drawImage(UI.icon(r.ic), 7, y - 2);
      UI.bar(ctx, 20, y + 1, 72, 3, r.v / r.max, truth ? '#62d6e8' : r.col, { ghost: r.ghost, ghostCol: 'rgba(255,220,220,0.55)', ticks: r.ticks });
      let num = r.ic === 'fear' && showPanic ? '!!' : String(Math.max(0, Math.ceil(r.v)));
      if (jv && !truth) num = glitchText(num, jv);
      Gfx.text(ctx, num, 96, y - 3, truth ? '#62d6e8' : r.ic === 'fear' && showPanic ? '#ff3a5a' : C.sub, { small: true });
    });
    // 레이어 배지 + 뒤집기 대기
    const back = J.layerLie && !truth ? p.layer !== 'back' : p.layer === 'back';
    const lw = UI.pill(ctx, 7, 41, back ? '뒷면' : '표면', back ? '#ff5a8a' : '#d8d4e4', { dot: true });
    const cdF = panic ? 0 : 1 - p.flipCd / this.D.flipCd;
    UI.bar(ctx, 7 + lw + 4, 46, 22, 2, cdF, cdF >= 1 ? C.accent : C.mute);
    if (cdF >= 1 && !panic) UI.keycap(ctx, 7 + lw + 30, 41, 'C');
    // 상태 효과 아이콘 (교란되면 가짜 버프가 뜨고 진짜 디버프가 숨는다)
    let chips = this.statusChips();
    if (jv && !truth) {
      chips = chips.filter((c) => !J.hide[c.id]);
      for (const f of J.fakeChips) if (!chips.some((c) => c.id === f)) chips.push({ id: f, label: glitchText(STATUS[f].name, jv), col: STATUS[f].col, frac: 0.5 + Math.sin(this.time * 0.05) * 0.3 });
    }
    let sx = 7;
    for (const c of chips) {
      UI.statusTile(ctx, sx, 57, c.id, c.frac, c.id === 'erosion' || c.id === 'rage' ? p.st.stacks(c.id) : c.id === 'shield' ? p.shield : 0);
      sx += 15;
    }
    if (chips.length && this.time % 240 < 120) Gfx.text(ctx, jv && !truth ? glitchText(chips[0].label, jv * 0.6) : chips[0].label, 7, 72, chips[0].col, { small: true });
    if (truth) Gfx.text(ctx, '간파 — 진짜 수치', 7, chips.length ? 82 : 72, '#62d6e8', { small: true });
    // 교란 화면 효과 (HUD 영역만 깨진다)
    if (jv) {
      for (let i = 0; i < (Settings.calm ? 0 : Math.ceil(jv * 5)); i++) {
        if (Math.random() < 0.5) continue;
        const gy = rndi(0, 74), gh = rndi(1, 4);
        ctx.drawImage(Gfx.buf, 0, gy, 120, gh, rndi(-6, 6) * jv, gy, 120, gh);
      }
      for (let i = 0; i < jv * (Settings.calm ? 8 : 40); i++) { ctx.fillStyle = Math.random() < 0.5 ? 'rgba(98,214,232,0.35)' : 'rgba(255,58,90,0.3)'; ctx.fillRect(rndi(0, 118), rndi(0, 76), rndi(1, 4), 1); }
    }
    // ── 우상단: 목표 ──
    const ob = OBJECTIVES[this.obj] || { name: '최종 결재', col: '#ff5a6a' };
    let otext = this.objText();
    if (jv && !truth) otext = J.objLie || glitchText(otext, jv * 0.5);
    ctx.fillStyle = ob.col; ctx.fillRect(VW - 6, 7, 2, 22);
    const obLabel = this.deep ? `심층 탐사 · 깊이 ${this.deep.stage}/${this.deep.stages}` : ob.name + ' · ' + THEMES[this.theme].short;
    Gfx.text(ctx, obLabel, VW - 11, 6, this.deep ? '#b86cff' : ob.col, { small: true, align: 'right' });
    Gfx.text(ctx, otext, VW - 11, 17, this.objState.complete && !J.objLie ? COL.green : C.text, { align: 'right', bold: true });
    if (this.run.found.length) {
      const t = '× ' + this.run.found.length;
      const tw = Gfx.measure(ctx, t, { small: true });
      ctx.drawImage(SPR.icon.frame, VW - 25 - tw, 33);
      Gfx.text(ctx, t, VW - 11, 35, COL.pink, { small: true, align: 'right' });
    }
    // 미니맵 (휴대폰 앱 — 교란되면 깨진다)
    if (this.gen.map) this.drawMinimap(ctx, jv && !truth ? jv : 0);
    // 신호 상태 표시 (이것만큼은 정직하다)
    if (jv || J.immune > 0) {
      const y = 47;
      if (J.immune > 0) UI.pill(ctx, VW - 8, y, `호일 차단 ${Math.ceil(J.immune / 60)}`, '#c8ccd8', { align: 'right', dot: true });
      else {
        const blink = this.time % 30 < 20;
        const w = UI.pill(ctx, VW - 8, y, '신호 불량', blink ? '#62d6e8' : '#2f5560', { align: 'right' });
        ctx.drawImage(UI.icon('st_jam'), VW - 8 - w - 11, y + 1);
        for (let i = 0; i < 4; i++) { ctx.fillStyle = i < Math.round((1 - jv) * 4) ? '#62d6e8' : 'rgba(98,214,232,0.2)'; ctx.fillRect(VW - 8 - w - 22 + i * 3, y + 9 - i * 2, 2, 2 + i * 2); }
      }
    }
    // ── 소모품 슬롯 (좌하단 · 터치 기기에선 방향 패드를 피해 좌상단 아래) ──
    const id = this.currentItem();
    const iy = Input.touchEnabled ? 86 : VH - 28;
    UI.card(ctx, 6, iy, 22, 22, { fill: 'rgba(12,11,19,0.85)', border: id ? C.line2 : C.line });
    if (id) {
      ctx.drawImage(SPR.icon[ITEMS[id].icon], 10, iy + 4);
      Gfx.text(ctx, String(s.items[id]), 27, iy + 12, C.text, { small: true, align: 'right' });
      Gfx.text(ctx, ITEMS[id].name, 33, iy, C.text, { small: true });
      const kw = UI.keycap(ctx, 33, iy + 13, 'V');
      Gfx.text(ctx, '사용', 36 + kw, iy + 13, C.mute, { small: true });
    } else Gfx.text(ctx, '빈 슬롯', 33, iy + 7, C.mute, { small: true });
    // ── 근무 시계 / 수칙 위반 ──
    if (this.rule) {
      const R = this.rule, E = R.ev;
      const alarm = E.three.t > 0 || E.chime.t > 0;
      Gfx.text(ctx, this.clockText(), VW / 2, 4, alarm && this.time % 20 < 10 ? '#ff5a6a' : C.text, { align: 'center', bold: true });
      for (let i = 0; i < RULE_MAX_VIOL; i++) { ctx.fillStyle = i < R.viol ? '#ff3a5a' : 'rgba(255,255,255,0.18)'; ctx.fillRect(VW / 2 - 13 + i * 9, 19, 7, 3); }
      Gfx.text(ctx, '수칙 위반', VW / 2, 23, C.mute, { align: 'center', small: true });
    }
    // ── 보스 체력 ──
    if (this.boss && !this.boss.dead) {
      const b = this.boss;
      const bw = 200, bx = Math.round((VW - bw) / 2), by = VH - 10;
      Gfx.text(ctx, b.def.name, VW / 2, by - 12, C.text, { small: true, align: 'center' });
      if (this.bossGhost == null) this.bossGhost = b.hp;
      this.bossGhost = this.bossGhost > b.hp ? Math.max(b.hp, this.bossGhost - b.maxHp * 0.004) : b.hp;
      UI.bar(ctx, bx, by, bw, 3, b.hp / b.maxHp, b.def.color, { ghost: this.bossGhost / b.maxHp, ticks: [0.5] });
    }
    if (this.bossBanner > 0 && this.boss) {
      const a = clamp(this.bossBanner / 30, 0, 1) * clamp((150 - this.bossBanner) / 20, 0, 1);
      ctx.globalAlpha = a;
      const g = ctx.createLinearGradient(0, 0, VW, 0);
      g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(0.5, 'rgba(0,0,0,0.75)'); g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g; ctx.fillRect(0, 74, VW, 38);
      ctx.fillStyle = this.boss.def.color; ctx.fillRect(VW / 2 - 40, 74, 80, 1); ctx.fillRect(VW / 2 - 40, 111, 80, 1);
      Gfx.text(ctx, this.boss.def.title, VW / 2, 79, this.boss.def.color, { align: 'center', small: true });
      Gfx.text(ctx, this.boss.def.name, VW / 2, 92, C.text, { align: 'center', bold: true });
      ctx.globalAlpha = 1;
    }
    // ── 시작 배너 ──
    if (this.bannerT > 0 && !Game.modals.length) {
      const a = clamp(this.bannerT / 30, 0, 1) * clamp((150 - this.bannerT) / 20, 0, 1);
      ctx.globalAlpha = a;
      const g = ctx.createLinearGradient(0, 0, VW, 0);
      g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(0.5, 'rgba(0,0,0,0.72)'); g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g; ctx.fillRect(0, 70, VW, 44);
      Gfx.text(ctx, THEMES[this.theme].name, VW / 2, 74, C.text, { align: 'center', bold: true });
      const bdesc = this.deep ? `깊이 ${this.deep.stage} / ${this.deep.stages} — ` + (this.obj === 'descend' ? '더 깊은 균열을 찾아라.' : OBJECTIVES[this.obj].desc) : (OBJECTIVES[this.obj] ? OBJECTIVES[this.obj].desc : '청명의 최상층으로 향한다.');
      Gfx.text(ctx, bdesc, VW / 2, 89, C.sub, { align: 'center', small: true });
      const stars = '★'.repeat(this.diff) + '☆'.repeat(5 - this.diff);
      Gfx.text(ctx, '위험도 ' + stars + ((this.gen.jamZones || []).length ? '  ·  전파 오염 구역 있음' : ''), VW / 2, 101, '#ff8a8a', { align: 'center', small: true });
      ctx.globalAlpha = 1;
    }
    // ── 안내 (TIP) ──
    if (this.hintT > 0 && this.hintText) {
      const a = clamp(this.hintT / 30, 0, 1);
      ctx.globalAlpha = a;
      const w = Math.min(250, Gfx.measure(ctx, this.hintText, { small: true }) + 36);
      ctx.font = FONT_S;
      const lines = wrapText(ctx, this.hintText, w - 34);
      const h = 6 + lines.length * 11;
      const x = Math.round((VW - w) / 2), y = VH - 34 - h - (this.boss ? 6 : 0);
      UI.card(ctx, x, y, w, h + 2, { fill: 'rgba(12,11,19,0.92)', border: '#2f5560', accent: '#62d6e8', accentSide: 'left' });
      UI.pill(ctx, x + 5, y + 3, 'TIP', '#62d6e8');
      lines.forEach((ln, i) => Gfx.text(ctx, ln, x + 30, y + 4 + i * 11, '#d4f4fa', { small: true, shadow: false }));
      ctx.globalAlpha = 1;
    }
  }
}

// ───── 심층 탐사: 균열 앞 휴식 / 계속 or 철수 ─────
class DeepRest {
  constructor(sc) {
    this.sc = sc; this.sel = 0; this.t = 0; this.blockInput = 20;
    this.covers = true; this.wantsDim = true;
  }
  payFor(cleared, full) { return Math.round(this.sc.job.pay * (0.35 + 0.3 * cleared + (full ? 0.3 : 0)) / 1000) * 1000; }
  update() {
    this.t++;
    if (this.blockInput > 0) { this.blockInput--; return; }
    if (Input.pressed('left') || Input.pressed('right') || Input.pressed('up') || Input.pressed('down')) { this.sel = 1 - this.sel; Sound.play('menu'); }
    if (Input.pressed('confirm')) {
      Sound.play('select');
      Game.pop(this);
      this.sc.locked = false;
      if (this.sel === 0) this.sc.descendNext();
      else this.sc.finish('extract');
    }
  }
  draw(ctx) {
    const sc = this.sc, C = UI.C, d = sc.deep, p = sc.player;
    const x = 24, y = 14, w = VW - 48, h = VH - 40;
    UI.card(ctx, x, y, w, h, { accent: '#b86cff' });
    Gfx.text(ctx, '균열 앞', x + 12, y + 8, C.text, { bold: true });
    Gfx.text(ctx, '잠시 숨을 고른다. 체력·정신력 +25%, 공포 -40', x + w - 12, y + 9, C.sub, { small: true, align: 'right' });
    // 깊이 표시
    const nx0 = x + 30, nw = w - 60;
    for (let i = 1; i <= d.stages; i++) {
      const cx = Math.round(nx0 + (nw * (i - 1)) / Math.max(1, d.stages - 1));
      if (i < d.stages) { ctx.fillStyle = i < d.stage + 1 ? '#b86cff' : C.line2; ctx.fillRect(cx, y + 36, Math.round(nw / (d.stages - 1)), 2); }
      const done = i <= d.stage, next = i === d.stage + 1;
      UI.card(ctx, cx - 6, y + 31, 13, 13, { fill: done ? '#4a2a6a' : '#16141f', border: next ? (this.t % 30 < 15 ? '#ffffff' : '#b86cff') : done ? '#b86cff' : C.line2 });
      Gfx.text(ctx, String(i), cx + 1, y + 32, done || next ? C.text : C.mute, { small: true, align: 'center' });
    }
    Gfx.text(ctx, i18Depth(d.stages), nx0 + nw, y + 48, C.mute, { small: true, align: 'right' });
    // 현재 상태
    const sy = y + 62;
    Gfx.text(ctx, '챙긴 것', x + 14, sy, C.sub, { small: true });
    let ix = x + 60;
    for (const id of sc.run.found.slice(0, 12)) { ctx.drawImage(SPR.icon[ARTIFACTS[id].icon], ix, sy - 2); ix += 15; }
    if (!sc.run.found.length) Gfx.text(ctx, '아직 없음', ix, sy, C.mute, { small: true });
    Gfx.text(ctx, '주운 돈 ' + won(sc.run.cash), x + w - 14, sy, '#9ae89a', { small: true, align: 'right' });
    ctx.drawImage(UI.icon('hp'), x + 14, sy + 16); UI.bar(ctx, x + 27, sy + 19, 90, 3, p.hp / p.maxHp, '#e8464e');
    ctx.drawImage(UI.icon('san'), x + 130, sy + 16); UI.bar(ctx, x + 143, sy + 19, 90, 3, p.san / p.maxSan, '#8f7cff');
    // 선택지
    const nextFinal = d.stage + 1 === d.stages;
    const opts = [
      { t: `더 깊이 — 깊이 ${d.stage + 1}`, d: nextFinal ? `마지막 층: ${OBJECTIVES[sc.job.finalObj].name}. 끝까지 가면 ${won(this.payFor(d.stages, true))}` : `위험도↑ 공포↑ 교란↑ · 보수 배율 상승`, c: '#b86cff' },
      { t: '챙겨서 철수', d: `보수 ${won(this.payFor(d.stage, false))} · 아티팩트 ${sc.run.found.length}개 확보`, c: COL.green },
    ];
    opts.forEach((o, i) => {
      const ox = x + 12 + i * ((w - 24) / 2 + 2), ow = (w - 24) / 2 - 2, oy = y + h - 56, sel = this.sel === i;
      UI.card(ctx, ox, oy, ow, 46, { fill: sel ? 'rgba(40,36,60,0.96)' : C.bg, border: sel ? o.c : C.line, accent: sel ? o.c : null });
      Gfx.text(ctx, o.t, ox + 10, oy + 6, sel ? C.text : C.sub, { bold: sel });
      Gfx.para(ctx, o.d, ox + 10, oy + 21, ow - 18, sel ? o.c : C.mute, { small: true, maxLines: 2, lh: 11 });
    });
    Gfx.text(ctx, '쓰러지면 챙긴 것을 모두 잃는다.', x + 14, y + h - 70, '#ff8a8a', { small: true });
    UI.hints(ctx, x + w, y + h + 4, [['←→', '선택'], ['Z', '결정']], 'right');
  }
}
function i18Depth(n) { return `총 ${n}층`; }

const STATUS_HELP_TEXT = '공포: 뒷면에 있으면 쌓인다(적이 가까울수록 빨리). 표면에서 가라앉는다.\n· 겁먹음(50+): 정신력 소모 +25%, 이동 -10%\n· 패닉(100): 5초간 몸이 제멋대로 움직이고 뒤집기 불가, 정신력 소모 2배\n침식: 정신력이 중첩당 초당 2 감소 (최대 3중첩)\n둔화: 이동 속도 -35%\n환각: 정신력 30% 미만, 받는 피해 +25%\n\n희망: 공포 증가 절반, 정신력 초당 +1.5, 공격력 +10%\n  (단서·앵커·아티팩트·목표 달성·캔커피로 얻는다)\n분노: 중첩당 공격력 +8% (분노 갈래 스킬)\n\n신호 불량(통신 교란): 알림 떼·전파 오염 구역·일부 보스가 일으킨다.\nHUD 수치·상태 아이콘·목표·알림이 거짓이 된다. 표면으로 나가면 회복.\n전파 차단 호일, 차폐 폰케이스, 의심 갈래 "간파"로 대응.';
const CONTROLS_TEXT = '← →  이동        Z / Space  점프 (↓ 길게: 발판 아래로)\nX  공격            C  뒤집기 (표면 ↔ 뒷면)\n↑  조사 / 상호작용   V  소모품 사용   Q 또는 ↓+V  소모품 변경\nShift  대시 (능력 획득 시, 방향키 두 번도 가능)\nEsc  일시정지\n\n메뉴: 방향키 이동, Z/Enter 확인, X/Esc 취소\n허브: ↑ 건물 들어가기, V 휴대폰';
