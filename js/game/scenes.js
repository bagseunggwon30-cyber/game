'use strict';
// ───────────────────────── 타이틀 / 스토리 / 결과 / 엔딩 씬 ─────────────────────────

function drawCityBG(ctx, t, back) {
  const dawn = back === 'dawn';
  if (dawn) back = false;
  const g = ctx.createLinearGradient(0, 0, 0, VH);
  if (dawn) { g.addColorStop(0, '#1a2050'); g.addColorStop(0.55, '#c86a5a'); g.addColorStop(0.8, '#f2b860'); }
  else if (back) { g.addColorStop(0, '#120006'); g.addColorStop(1, '#3a0a18'); }
  else { g.addColorStop(0, '#05060f'); g.addColorStop(1, '#1e1e40'); }
  ctx.fillStyle = g; ctx.fillRect(0, 0, VW, VH);
  const r = new RNG(9);
  if (dawn) { ctx.globalAlpha = 0.5; Gfx.circle(ctx, VW / 2, 182, 30, '#ffe0a0'); ctx.globalAlpha = 1; }
  else for (let i = 0; i < 60; i++) { ctx.fillStyle = back ? '#ff3a5a' : '#8a8ab8'; ctx.fillRect(r.int(0, VW), r.int(0, 100), 1, 1); }
  for (let layer = 0; layer < 2; layer++) {
    const rr = new RNG(20 + layer);
    const speed = layer ? 0.3 : 0.12;
    const base = layer ? 190 : 170;
    for (let i = 0; i < 40; i++) {
      const w = rr.int(18, 40), h = rr.int(40, 120) - layer * 20;
      let x = (i * 34 - t * speed) % (40 * 34);
      if (x < -50) x += 40 * 34;
      if (x > VW + 10) continue;
      ctx.fillStyle = dawn ? (layer ? '#1a1428' : '#3a2a40') : back ? (layer ? '#1a0008' : '#2a0612') : (layer ? '#0a0a1c' : '#14142c');
      ctx.fillRect(Math.round(x), base - h, w, h + 40);
      for (let wy = base - h + 4; wy < base - 4; wy += 7) for (let wx = 3; wx < w - 3; wx += 6) {
        if (rr.chance(dawn ? 0.12 : 0.3)) { ctx.fillStyle = back ? (rr.chance(0.5) ? '#ff2a4a' : '#f4f0e6') : '#f2d070'; ctx.fillRect(Math.round(x + wx), wy, 2, 3); }
      }
    }
  }
  ctx.fillStyle = back ? '#0a0004' : '#0a0a14'; ctx.fillRect(0, 190, VW, VH);
}

class TitleScene {
  constructor() { this.t = 0; this.flip = 0; this.menu = null; }
  enter() {
    Sound.setAmbience('title');
    this.title = Gfx.bigText('뒷면 아르바이트', '#f4f0e6', 3);
    this.titleB = Gfx.bigText('뒷면 아르바이트', '#ff3a5a', 3, FONT_B, '#2a0008');
    this.openMenu();
  }
  openMenu() {
    const has = hasSave();
    const items = [];
    if (has) items.push({ label: '이어하기', desc: '마지막으로 저장한 날부터 계속한다.', onSelect: () => this.continueGame() });
    items.push({ label: '새로 시작', desc: '처음부터 시작한다.' + (has ? ' (기존 저장은 덮어쓴다)' : ''), onSelect: () => {
      if (has) {
        Game.push(new Menu({ title: '저장 기록을 지우고 새로 시작할까?', w: 260, items: [
          { label: '새로 시작', onSelect: () => this.newGame() },
          { label: '취소', onSelect: (m) => m.close() },
        ] }));
      } else this.newGame();
    } });
    const carry = loadCarry();
    if (carry) items.push({ label: `재계약 (${carry.cycle}회차)`, desc: '마음 지도·무기·가방·도감을 이어받는 다음 회차.', onSelect: () => {
      if (has) {
        Game.push(new Menu({ title: `저장 기록을 지우고 ${carry.cycle}회차를 시작할까?`, w: 270, items: [
          { label: '재계약한다', onSelect: () => this.newGame(carry) },
          { label: '취소', onSelect: (m) => m.close() },
        ] }));
      } else this.newGame(carry);
    } });
    items.push({ label: '설정 · 조작법', desc: '소리 · 화면 흔들림 · 깜빡임 줄이기 · 글자 속도 · 조작 안내', onSelect: () => openSettings() });
    items.push({ label: '기록', desc: '엔딩 기록 · 업적 · 옷장', onSelect: () => Game.push(new Menu({ title: '기록', w: 220, desc: true, items: [
      { label: '엔딩 기록', desc: '지금까지 본 결말과 힌트', onSelect: () => {
        const seen = endingsSeen();
        const all = ENDING_ORDER;
        Game.push(new TextView('엔딩 기록 ' + all.filter((k) => seen.includes(k)).length + '/' + all.length,
          all.map((k) => (seen.includes(k) ? '◆ ' + ENDINGS[k].name + (ENDINGS[k].trueEnd ? '  (TRUE)' : '') : '◇ ??? — ' + ENDING_HINTS[k])).join('\n')));
      } },
      { label: '업적', right: `${Object.keys(ACHIEVEMENTS).filter((id) => Achieve.has(id)).length}/${Object.keys(ACHIEVEMENTS).length}`, desc: '기기 전체에서 공통으로 쌓인다.', onSelect: () => openAchievements() },
      { label: '옷장', desc: '업적으로 푼 외형을 고른다.', onSelect: () => openWardrobe() },
    ] })) });
    this.menu = new Menu({ items, y: 113, rh: 15, dim: false, onCancel: false, plain: true });
    Game.push(this.menu);
  }
  newGame(carry) {
    Game.modals = [];
    Game.fadeTo(() => startGame(carry || null), 30);
  }
  continueGame() {
    const s = loadGame();
    if (!s) { Game.toast('저장 기록을 불러올 수 없다.', COL.red); return; }
    Game.modals = [];
    Game.state = s;
    if (!s.jobs || !s.jobs.length) s.jobs = genJobs(s);
    Game.fadeTo(() => {
      if (s.storyStage === 0) Game.setScene(new MissionScene(storyJobFor(s)));
      else Game.setScene(new HubScene());
    });
  }
  update() { this.t++; }
  draw(ctx) {
    this.t2 = (this.t2 || 0) + 1;
    const cyc = this.t % 300;
    const back = cyc > 250 && cyc < 290 && (Settings.calm || cyc % 8 < 6);
    drawCityBG(ctx, this.t, back);
    const tt = back ? this.titleB : this.title;
    const x = Math.round((VW - tt.width) / 2), y = 28;
    if (back && !Settings.calm) { ctx.globalAlpha = 0.5; ctx.drawImage(this.title, x + rndi(-3, 3), y + rndi(-2, 2)); ctx.globalAlpha = 1; }
    ctx.drawImage(tt, x, y);
    Gfx.text(ctx, 'BACKSIDE PART-TIMER', VW / 2, 83, back ? '#ff8a9a' : COL.yellow, { align: 'center', small: true });
    Gfx.text(ctx, '— 밈적 존재 현장 정리 · 일급 ₩120,000 —', VW / 2, 96, COL.dim, { align: 'center', small: true });
    // 플레이어 실루엣
    const f = SPR.player.R[2 + Math.floor(this.t / 7) % 4];
    ctx.drawImage(back ? SPR.follower.R[2 + Math.floor(this.t / 7) % 4] : f, 40, 166);
    Gfx.text(ctx, 'v1.4', VW - 6, VH - 12, COL.dark, { small: true, align: 'right' });
    const seenN = endingsSeen().length;
    if (seenN) Gfx.text(ctx, `결말 ${ENDING_ORDER.filter((k) => endingsSeen().includes(k)).length}/${ENDING_ORDER.length}`, 6, 4, COL.dim, { small: true });
  }
}

// 새 게임 / 재계약 시작 (페이드 콜백 안에서 호출)
function startGame(carry) {
  Game.modals = [];
  Game.state = newStateFrom(carry);
  Game.state.jobs = genJobs(Game.state);
  Storage.del(SAVE_KEY);
  const ng = !!carry;
  Game.setScene(new StoryScene(ng ? PROLOGUE_NG : PROLOGUE, (i) => (i >= (ng ? 5 : 7) ? 'office' : 'room'), () => {
    const job = storyJobFor(Game.state);
    Game.fadeTo(() => Game.setScene(new MissionScene(job)));
  }));
  Game.state.chapterSeen = 1;
  Game.push(new ChapterCard(ng ? Object.assign({}, CHAPTERS[0], { sub: `${carry.cycle}회차 — 재계약` }) : CHAPTERS[0]));
}

// 챕터 타이틀 카드
class ChapterCard {
  constructor(C, onDone) { this.C = C; this.onDone = onDone; this.t = 0; this.covers = true; this.wantsDim = false; }
  update() {
    this.t++;
    if ((this.t > 40 && (Input.pressed('confirm') || Input.pressed('cancel'))) || this.t > 260) {
      Game.pop(this);
      if (this.onDone) this.onDone();
    }
  }
  draw(ctx) {
    const a = clamp(this.t / 30, 0, 1) * clamp((260 - this.t) / 30, 0, 1);
    ctx.fillStyle = `rgba(6,5,12,${Math.min(0.94, a + 0.3)})`; ctx.fillRect(0, 0, VW, VH);
    ctx.globalAlpha = a;
    if (!this.big) this.big = Gfx.bigText(this.C.title, '#f4f0e6', 3);
    Gfx.text(ctx, `CHAPTER ${this.C.n}`, VW / 2, 66, UI.C.accent, { align: 'center', bold: true });
    ctx.fillStyle = UI.C.accent; ctx.fillRect(VW / 2 - 20, 82, 40, 1);
    ctx.drawImage(this.big, Math.round((VW - this.big.width) / 2), 90);
    Gfx.text(ctx, this.C.sub, VW / 2, 142, UI.C.sub, { align: 'center' });
    Gfx.text(ctx, `월세 ${won(this.C.rent)} / 주 · 위험도 ${this.C.diff[0]}~${this.C.diff[1]}`, VW / 2, 160, UI.C.mute, { align: 'center', small: true });
    ctx.globalAlpha = 1;
  }
}

// 대화 컷신
class StoryScene {
  constructor(lines, bgFor, next) { this.lines = lines; this.bgFor = bgFor; this.next = next; this.t = 0; }
  enter() {
    Sound.setAmbience('hubnight');
    this.dlg = new DialogModal(this.lines, () => this.next());
    Game.push(this.dlg);
  }
  update() { this.t++; }
  draw(ctx) {
    const bg = this.bgFor(this.dlg.i);
    const G = Gfx;
    if (bg === 'room') {
      G.px(ctx, 0, 0, VW, VH, '#141220');
      G.px(ctx, 140, 26, 110, 70, '#2a2838'); G.px(ctx, 144, 30, 102, 62, '#0a0c1e');
      const r = new RNG(3);
      for (let i = 0; i < 40; i++) G.px(ctx, r.int(146, 242), r.int(50, 90), 2, 3, r.chance(0.5) ? '#f2d070' : '#2a2a4a');
      G.px(ctx, 194, 30, 2, 62, '#2a2838');
      G.px(ctx, 20, 120, 120, 30, '#3a3048'); G.px(ctx, 20, 112, 40, 12, '#e8e4dc');
      G.px(ctx, 0, 150, VW, 70, '#221e2e');
      G.px(ctx, 260, 110, 70, 40, '#3a2e28'); G.px(ctx, 264, 106, 62, 6, '#4a3e34');
      // 휴대폰 빛
      ctx.globalAlpha = 0.25 + Math.sin(this.t * 0.05) * 0.05; G.circle(ctx, 90, 118, 30, '#62d6e8'); ctx.globalAlpha = 1;
      G.px(ctx, 86, 112, 8, 12, '#0b0b10'); G.px(ctx, 87, 113, 6, 10, '#62d6e8');
      ctx.drawImage(SPR.player.R[0], 74, 104);
    } else {
      G.px(ctx, 0, 0, VW, VH, '#8a8e9a');
      for (let i = 0; i < 6; i++) { G.px(ctx, 20 + i * 64, 20, 50, 60, '#c8d8e8'); for (let j = 0; j < 12; j++) G.px(ctx, 20 + i * 64, 22 + j * 5, 50, 2, '#a8b0bc'); }
      G.px(ctx, 0, 150, VW, 70, '#4a4e5a');
      G.px(ctx, 120, 112, 150, 8, '#5a4a3a'); G.px(ctx, 126, 120, 6, 30, '#3a2e24'); G.px(ctx, 258, 120, 6, 30, '#3a2e24');
      G.px(ctx, 140, 96, 26, 16, '#1a1a24'); G.px(ctx, 142, 98, 22, 12, '#3a5a8a');
      G.px(ctx, 220, 104, 20, 8, '#e8e4dc');
      ctx.drawImage(SPR.seo.L[Math.floor(this.t / 30) % 2], 290, 126);
      ctx.drawImage(SPR.player.R[Math.floor(this.t / 30) % 2], 90, 126);
      G.px(ctx, 300, 30, 60, 14, '#2b3d73'); Gfx.text(ctx, '청명관리', 330, 31, '#f4f0e6', { small: true, align: 'center' });
    }
  }
}

// 임무 결과
class ResultScene {
  constructor(job, result, run, opt) {
    this.job = job; this.result = result; this.run = run; this.opt = opt;
    this.s = Game.state;
    this.story = job.story ? STORY_MISSIONS.find((m) => m.id === job.story) : null;
    this.side = job.side ? SIDE_BY_ID[job.side] : null;
    this.step = 'head';
    this.ai = 0; this.choice = 0;
    this.t = 0;
    this.log = [];
    this.arts = result === 'fail' ? [] : run.found.slice();
    this.lost = result === 'fail' ? run.found.slice() : [];
    this.applied = false;
  }
  enter() {
    Sound.setAmbience('hubnight');
    const outro = this.result === 'success' ? ((this.story && this.story.outro) || (this.side && this.side.outro)) : null;
    if (outro && outro.length) Game.push(new DialogModal(outro));
    if (this.result === 'success' && this.side && this.side.reward.artifact) { this.arts.push(this.side.reward.artifact); codexAdd(this.s, 'art', this.side.reward.artifact); }
    Sound.play(this.result === 'success' || this.result === 'extract' ? 'resolve' : 'deny');
  }
  applyBase() {
    if (this.applied) return;
    this.applied = true;
    const s = this.s, job = this.job, run = this.run;
    const rankBefore = s.lastRank;
    s.workedToday = true;
    s.timeOfDay = 'night';
    if ((run.jamTime || 0) > 600) {
      s.phoneGlitch = true;
      s.messages.unshift({ from: 'fakeSeo', text: pickR(FAKE_MESSAGES), day: s.day, read: false, fake: true });
      this.log.push(['통신 교란 후유증', '휴대폰 오염', COL.cyan]);
    }
    const deep = this.opt.deep;
    if (this.result === 'success' || this.result === 'extract') {
      const full = this.result === 'success';
      const payMul = deep ? 0.35 + 0.3 * deep.cleared + (full ? 0.3 : 0) : 1;
      const wm = s.weekMod === 'raise' ? 1.25 : s.weekMod === 'quiet' ? 0.9 : 1;
      let pay = Math.round(job.pay * payMul * wm * ngPayMul(s) / 1000) * 1000;
      const noDmg = run.damage === 0;
      if (noDmg) pay = Math.round(pay * 1.1);
      const perfect = full && run.ruleViol === 0;
      if (perfect) pay = Math.round(pay * 1.3);
      Achieve.unlock('firstShift');
      if (noDmg && full) Achieve.unlock('noDamage');
      if (perfect) Achieve.unlock('perfectRule');
      if (deep && full) Achieve.unlock('deepFull');
      if (full && job.obj === 'lights') Achieve.unlock('lightsOn');
      if (full && job.obj === 'echo') { Achieve.unlock('darkWalk'); if (!run.claps) Achieve.unlock('noClap'); }
      if (full && job.obj === 'escort') Achieve.unlock('escortDone');
      if (full && job.obj === 'chase' && !run.caught) Achieve.unlock('chaseDone');
      pay = Math.round(pay / 1000) * 1000;
      const r = addMoney(s, pay + run.cash);
      if (deep) this.log.push(['탐사 깊이', `${deep.cleared}/${deep.stages}층${full ? ' · 완주' : ''}`, '#b86cff']);
      this.log.push(['알바 보수', won(pay) + (noDmg ? ' (무사고 +10%)' : '') + (perfect ? ' (수칙 완벽 +30%)' : ''), '#9ae89a']);
      if (run.ruleViol != null) this.log.push(['수칙 위반', `${run.ruleViol}회`, run.ruleViol ? COL.orange : COL.green]);
      if (run.cash) this.log.push(['현장에서 주운 돈', won(run.cash), '#9ae89a']);
      if (run.dodges) this.log.push(['아슬아슬 회피', run.dodges + '회', '#9ae8ff']);
      if (r.toDebt) this.log.push(['빚 상환', '-' + won(r.toDebt), '#ff8a8a']);
      const tr = Math.round((6 + 3 * job.diff) * (deep ? 0.5 + 0.25 * deep.cleared + (full ? 0.25 : 0) : 1));
      addTrust(s, tr);
      this.log.push(['신뢰', '+' + tr, COL.cyan]);
      addSuspicion(s, -5);
      s.record.missions++;
      s.weekStats = s.weekStats || { missions: 0 };
      s.weekStats.missions++;
      this.log.push(['주간 목표', `${s.weekStats.missions}/${WEEK_QUOTA}`, s.weekStats.missions >= WEEK_QUOTA ? COL.green : COL.dim]);
      if (full && job.obj !== 'patrol') codexAdd(s, 'meme', THEMES[job.theme].meme);
      if (this.story && full) {
        s.storyStage++;
        s.lastStoryDay = s.day;
        if (this.story.flag) { s.flags[this.story.flag] = true; s.flags.minjaeGoneDay = s.day; }
        if (this.story.id === 's1') { s.pendingDialogs = (s.pendingDialogs || []).concat([MINJAE_MEET]); s.jobs = genJobs(s); }
        this.log.push(['이야기 진행', '◆', COL.pink]);
      }
      // 서브 의뢰 완료 보상
      let sideSp = 0;
      if (this.side && full) {
        const q = this.side, R = q.reward;
        s.sideDone.push(q.id);
        s.sideDay = s.sideDay || {}; s.sideDay[q.chain] = s.day;
        sideSp = R.sp || 0;
        this.log.push(['서브 의뢰 완료', q.title.replace(/^\[.*?\] /, ''), '#ff8a7a']);
        if (R.money) { addMoney(s, R.money); this.log.push(['의뢰인 사례', won(R.money), '#9ae89a']); }
        if (R.items) for (const k in R.items) { s.items[k] = Math.min(itemMax(s), (s.items[k] || 0) + R.items[k]); this.log.push(['받은 물건', `${ITEMS[k].name} ×${R.items[k]}`, COL.white]); }
        if (R.rentDiscount) { s.rentDiscount = R.rentDiscount; this.log.push(['다음 월세', `${Math.round(R.rentDiscount * 100)}% 할인`, COL.green]); }
        if (R.rentMul) { s.rentMul = R.rentMul; this.log.push(['월세', `영구 ${Math.round((1 - R.rentMul) * 100)}% 할인`, COL.green]); }
        if (R.flag) s.flags[R.flag] = true;
        if (R.truth) { const t = RANDOM_DOCS.find((d) => !s.truths.includes(d)); if (t) { s.truths.push(t); run.docs.push(t); } }
        if (R.artifact) this.log.push(['받은 아티팩트', ARTIFACTS[R.artifact].name, RARITY[ARTIFACTS[R.artifact].rarity].col]);
      }
      const sp = 1 + (job.diff >= 3 ? 1 : 0) + (this.story ? 1 : 0) + (run.boss ? 1 : 0) + (deep ? deep.cleared : 0) + (perfect ? 1 : 0) + sideSp;
      s.sp = (s.sp || 0) + sp;
      this.log.push(['마음 조각 (SP)', '+' + sp + '  → 마음 지도', '#a99cff']);
    } else if (this.result === 'retreat' || this.result === 'fired') {
      if (this.result === 'fired') this.log.push(['수칙 위반 3회', '현장에서 쫓겨났다', '#ff8a8a']);
      addTrust(s, -5);
      if (run.cash) addMoney(s, run.cash);
      this.log.push(['철수', '보수 없음', '#ff8a8a'], ['신뢰', '-5', '#ff8a8a']);
      if (run.cash) this.log.push(['현장에서 주운 돈', won(run.cash), '#9ae89a']);
      s.record.fails++;
    } else {
      chargeMoney(s, 50000);
      addTrust(s, -3);
      this.log.push(['병원비', '-' + won(50000), '#ff8a8a'], ['신뢰', '-3', '#ff8a8a']);
      if (this.opt.sanDeath) { addContamination(s, 8); this.log.push(['정신 붕괴 후유증', '오염 +8', COL.pink]); }
      if (this.lost.length) this.log.push(['잃어버린 아티팩트', this.lost.length + '개', '#ff8a8a']);
      s.record.fails++;
    }
    if (run.docs.length) this.log.push(['진실 조각', '+' + run.docs.length, COL.cyan]);
    if (run.elites) this.log.push(['정예 처치', run.elites + '마리', '#ffd27a']);
    if (run.parries) this.log.push(['패링', run.parries + '회', '#ffd27a']);
    Achieve.check(s); Achieve.flush();
    this.rankBefore = rankBefore;
  }
  update() {
    this.t++;
    if (this.step === 'head') {
      if (this.t > 20 && (Input.pressed('confirm') || Input.pressed('attack'))) {
        this.applyBase();
        Sound.play('select');
        this.step = this.arts.length ? 'art' : 'summary';
        this.t = 0;
      }
    } else if (this.step === 'art') {
      if (Input.pressed('left') || Input.pressed('right') || Input.pressed('up') || Input.pressed('down')) { this.choice = 1 - this.choice; Sound.play('menu'); }
      if (this.t > 15 && Input.pressed('confirm')) {
        const id = this.arts[this.ai];
        this.decide(id, this.choice === 0 ? 'submit' : 'hide');
        this.ai++; this.choice = 0; this.t = 0;
        if (this.ai >= this.arts.length) this.step = 'summary';
      }
    } else if (this.step === 'summary') {
      if (this.t > 20 && (Input.pressed('confirm') || Input.pressed('attack'))) {
        const s = this.s;
        if (s.lastRank > (this.rankBefore || 0)) s.pendingEvents = (s.pendingEvents || []).concat([{ type: 'rank', rank: s.lastRank }]);
        checkMessages(s);
        s.spawnAt = 420;
        Sound.play('select');
        Game.fadeTo(() => Game.setScene(new HubScene()));
        this.step = 'done';
      }
    }
  }
  decide(id, how) {
    const s = this.s, a = ARTIFACTS[id], R = RARITY[a.rarity];
    if (how === 'submit') {
      const money = Math.round(R.submit * (1 + 0.02 * s.stats.luk) / 1000) * 1000;
      const r = addMoney(s, money);
      const tr = Math.round(R.trust * (s.weekMod === 'audit' ? 1.5 : 1));
      addTrust(s, tr);
      s.submitted++;
      this.log.push([`제출: ${a.name}`, won(r.got) + ` · 신뢰+${tr}`, '#c8d0e0']);
      Sound.play('stamp');
    } else {
      s.stash.push(id);
      const sus = Math.round(R.sus * (1 - skillMods(s).sus) * (s.weekMod === 'audit' ? 1.5 : 1));
      addSuspicion(s, sus);
      this.log.push([`은닉: ${a.name}`, `의심+${sus}`, COL.orange]);
      Sound.play('pickup');
    }
  }
  draw(ctx) {
    const s = this.s, C = UI.C;
    // 배경: 어두운 그라데이션 + 도시 실루엣
    const g = ctx.createLinearGradient(0, 0, 0, VH);
    g.addColorStop(0, '#0a0912'); g.addColorStop(1, '#151229');
    ctx.fillStyle = g; ctx.fillRect(0, 0, VW, VH);
    const r = new RNG(5);
    for (let x = 0; x < VW; x += r.int(14, 30)) { const h = r.int(16, 50); ctx.fillStyle = '#0f0d1c'; ctx.fillRect(x, VH - h, r.int(12, 26), h); }
    const title = { success: '퇴근 완료', retreat: '현장 철수', fail: '임무 실패', extract: '탐사 철수', fired: '해고' }[this.result];
    const col = { success: COL.green, retreat: COL.orange, fail: COL.red, extract: '#b86cff', fired: COL.red }[this.result];
    if (!this.bigTitle) this.bigTitle = Gfx.bigText(title, col, 2);
    ctx.drawImage(this.bigTitle, Math.round((VW - this.bigTitle.width) / 2), 6);
    Gfx.text(ctx, Gfx.fit(ctx, this.job.title, VW - 40, { small: true }), VW / 2, 38, C.sub, { align: 'center', small: true });
    const cx = 66, cw = VW - 132;
    if (this.step === 'head') {
      const rr = this.run;
      const lines = [
        ['소요 시간', `${Math.floor(rr.time / 3600)}분 ${Math.floor(rr.time / 60) % 60}초`],
        ['쓰러뜨린 존재', rr.kills + ''],
        ['받은 피해', Math.round(rr.damage) + ''],
        ['발견한 아티팩트', rr.found.length + '개'],
        ['주운 돈', won(rr.cash)],
      ];
      UI.card(ctx, cx, 54, cw, 96, { accent: col });
      lines.forEach(([k, v], i) => {
        const y = 64 + i * 16;
        Gfx.text(ctx, k, cx + 14, y, C.sub);
        Gfx.text(ctx, v, cx + cw - 14, y, C.text, { align: 'right' });
        if (i < lines.length - 1) UI.divider(ctx, cx + 12, y + 14, cw - 24, 'rgba(255,255,255,0.05)');
      });
      if (this.result === 'fail' && rr.found.length) Gfx.text(ctx, '쓰러지면서 아티팩트를 모두 잃어버렸다...', VW / 2, 158, '#ff8a8a', { align: 'center', small: true });
      if (this.t > 20) UI.hints(ctx, VW / 2, VH - 18, [['Z', '계속']], 'center');
    } else if (this.step === 'art') {
      const id = this.arts[this.ai];
      const a = ARTIFACTS[id], R = RARITY[a.rarity];
      // 진행 점
      for (let i = 0; i < this.arts.length; i++) { ctx.fillStyle = i < this.ai ? C.sub : i === this.ai ? C.accent : C.line2; ctx.fillRect(VW / 2 - this.arts.length * 4 + i * 8, 50, 5, 2); }
      UI.card(ctx, 24, 58, VW - 48, 94, { accent: R.col });
      ctx.globalAlpha = 0.22 + Math.sin(this.t * 0.08) * 0.08; Gfx.circle(ctx, 62, 102, 26, R.col); ctx.globalAlpha = 1;
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(SPR.icon[a.icon], 41, 81, 42, 42);
      Gfx.text(ctx, a.name, 100, 66, C.text, { bold: true });
      UI.pill(ctx, 100, 81, R.name, R.col);
      Gfx.text(ctx, MEMES[a.from].name, 106 + Gfx.measure(ctx, R.name, { small: true }) + 8, 82, C.mute, { small: true });
      Gfx.para(ctx, artifactDesc(id).replace(/^\[.*?\] /, ''), 100, 97, VW - 136, '#c8c4d8', { small: true, maxLines: 4 });
      const money = Math.round(R.submit * (1 + 0.02 * s.stats.luk) / 1000) * 1000;
      const opts = [
        { t: '제출한다', d: `${won(money)} · 신뢰 +${Math.round(R.trust * (s.weekMod === 'audit' ? 1.5 : 1))}`, c: '#c8d0e0', ac: '#c8d0e0' },
        { t: '몰래 챙긴다', d: `의심도 +${Math.round(R.sus * (1 - skillMods(s).sus) * (s.weekMod === 'audit' ? 1.5 : 1))}  (현재 ${s.suspicion})`, c: COL.orange, ac: COL.orange },
      ];
      opts.forEach((o, i) => {
        const x = 24 + i * ((VW - 48) / 2 + 2), w = (VW - 48) / 2 - 2, y = 158, sel = this.choice === i;
        UI.card(ctx, x, y, w, 34, { fill: sel ? 'rgba(40,36,60,0.96)' : C.bg, border: sel ? o.ac : C.line, accent: sel ? o.ac : null });
        Gfx.text(ctx, o.t, x + 12, y + 6, sel ? C.text : C.sub, { bold: sel });
        Gfx.text(ctx, o.d, x + 12, y + 21, sel ? o.c : C.mute, { small: true });
      });
      UI.hints(ctx, VW / 2, VH - 14, [['←→', '선택'], ['Z', '결정']], 'center');
    } else {
      UI.card(ctx, 40, 50, VW - 80, 136, { accent: col });
      const list = this.log.slice(-9);
      list.forEach(([k, v, c], i) => {
        const y = 58 + i * 13;
        Gfx.text(ctx, Gfx.fit(ctx, k, 150, { small: true }), 52, y, C.sub, { small: true });
        Gfx.text(ctx, v, VW - 52, y, c || C.text, { small: true, align: 'right' });
      });
      UI.divider(ctx, 48, 175, VW - 96);
      Gfx.text(ctx, `${won(s.money)}${s.debt ? '  (빚 ' + won(s.debt) + ')' : ''}`, 52, 176, '#9ae89a', { small: true });
      Gfx.text(ctx, `신뢰 ${s.trust} · 의심 ${s.suspicion} · 오염 ${Math.round(s.contamination)}`, VW - 52, 176, C.sub, { small: true, align: 'right' });
      if (this.t > 20) UI.hints(ctx, VW / 2, VH - 18, [['Z', '퇴근하기']], 'center');
    }
  }
}

class EndingScene {
  constructor(key) { this.key = key; this.e = ENDINGS[key]; this.t = 0; this.phase = 'talk'; }
  enter() {
    recordEnding(this.key);
    if (Game.state) saveCarry(Game.state);
    Achieve.check(Game.state); Achieve.flush();
    Sound.setAmbience(this.key === 'merge' || this.key === 'dissolve' ? 'back' : this.key === 'true' ? 'dawn' : 'title');
    Game.push(new DialogModal(this.e.lines, () => { this.phase = 'title'; this.t = 0; Sound.play('resolve'); }));
  }
  update() {
    this.t++;
    if (this.phase === 'title' && this.t > 60 && (Input.pressed('confirm') || Input.pressed('cancel'))) {
      this.phase = 'menu';
      const carry = loadCarry();
      Game.push(new Menu({
        title: '다음', w: 240, desc: true, onCancel: false, block: 10,
        items: [
          { label: `재계약 (${carry ? carry.cycle : 2}회차)`, desc: '마음 지도·무기·가방·도감을 이어받고 처음부터. 2회차부터만 찾을 수 있는 문서와 결말이 있다.', onSelect: (m) => {
            m.close(); this.phase = 'done';
            Game.fadeTo(() => startGame(loadCarry()), 40);
          } },
          { label: '타이틀로', desc: '타이틀 화면의 "재계약"으로 언제든 다음 회차를 시작할 수 있다.', onSelect: (m) => { m.close(); this.phase = 'done'; Game.fadeTo(() => Game.setScene(new TitleScene()), 40); } },
        ],
      }));
    }
  }
  draw(ctx) {
    const back = this.key === 'merge' || this.key === 'dissolve';
    drawCityBG(ctx, this.t * 0.5, this.key === 'true' ? 'dawn' : back);
    ctx.fillStyle = this.key === 'true' ? 'rgba(10,6,20,0.3)' : 'rgba(0,0,0,0.45)'; ctx.fillRect(0, 0, VW, VH);
    if (this.phase !== 'talk') {
      const a = clamp(this.t / 60, 0, 1);
      ctx.globalAlpha = a;
      Gfx.text(ctx, this.e.trueEnd ? 'TRUE ENDING' : 'ENDING', VW / 2, 60, this.e.trueEnd ? COL.yellow : COL.dim, { align: 'center', small: true });
      if (!this.big) this.big = Gfx.bigText(this.e.name, this.e.col, 3);
      ctx.drawImage(this.big, Math.round((VW - this.big.width) / 2), 74);
      const seen = endingsSeen();
      Gfx.text(ctx, `결말 수집 ${ENDING_ORDER.filter((k) => seen.includes(k)).length}/${ENDING_ORDER.length}`, VW / 2, 130, COL.white, { align: 'center' });
      const s = Game.state;
      if (s) Gfx.text(ctx, `${s.cycle || 1}회차 · DAY ${s.day} · 임무 ${s.record.missions} · 흡수 ${s.absorbed.length} · 제출 ${s.submitted} · 진실 ${s.truths.length}/${truthList(s).length}`, VW / 2, 148, COL.dim, { align: 'center', small: true });
      if (this.phase === 'title' && this.t > 60 && Math.floor(this.t / 20) % 2 === 0) Gfx.text(ctx, 'Z 계속', VW / 2, 180, COL.yellow, { align: 'center', small: true });
      ctx.globalAlpha = 1;
    }
  }
}
