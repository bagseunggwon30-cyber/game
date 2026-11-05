'use strict';
// ───────────────────────── 배차: 시계 · 밴 픽업 · 이동 장면 · 브리핑 · 노쇼 · 협회 ─────────────────────────
const MIN_FRAMES = 30;             // 허브에서 게임 속 1분 = 30프레임 (0.5초)
const DAY_START = 9 * 60;          // 기상 09:00
const PICKUP_WAIT = 30;            // 밴이 기다려 주는 시간 (분)
const LATE_LIMIT = 28 * 60;        // 새벽 04:00이 되면 쓰러져 잔다
const VAN_X = 552;                 // 청명관리 앞 정차 위치
const PICKUP_SLOTS = [18 * 60, 18 * 60 + 30, 19 * 60, 19 * 60 + 30, 20 * 60, 20 * 60 + 30, 21 * 60, 21 * 60 + 30, 22 * 60];
const STRIKE_MAX = 3;

function clockText(m) { m = Math.max(0, Math.round(m)); return String(Math.floor(m / 60) % 24).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0'); }
function isNightClock(m) { return m >= 18 * 60 || m < 6 * 60; }
// 회사 공고(메인·일반·심층·수칙·특수)는 밴 픽업. 서브 의뢰는 의뢰인 부탁이라 직접 간다.
function needsVan(job) { return !job.side && !job.forced; }

// ── 기사 대사 ──
const DRIVER_LINES = {
  any: ['안전벨트 매요. 청명 차는 사고 나도 보험이 안 돼.', '현장 앞에 내려 줄게. 끝나면 같은 자리에서 기다려.', '라디오는 안 켜. 가끔 이상한 주파수가 잡혀서.', '길이 막히네. ...아니, 같은 길을 도는 건가.', '어제 태운 친구는 돌아올 때 한마디도 안 하더라고.', '뒷자리에 뭐 떨어져 있어도 줍지 마. 원래 있던 거야.'],
  apartment: ['은하맨션? 엘리베이터 타지 말고 계단으로 가.', '그 맨션 주차장엔 차를 오래 못 세워. 층수가 바뀌거든.'],
  store: ['새벽마트 앞이야. 계산대 앞에 오래 서 있지 마.', '편의점 불빛이 제일 무서워. 너무 밝잖아.'],
  subway: ['지하철 쪽은 내가 안 들어가. 막차 시간 지나면 입구가 하나 늘어.', '역 앞에 내려 줄게. 안내방송 따라가지 마.'],
  school: ['학교 정문은 잠겨 있어. 담 넘어가. 다들 그렇게 해.', '종소리 들려도 뛰지 마. 복도에서 뛰면 혼나.'],
  pcbang: ['PC방 간판 불 꺼져 있어도 안은 켜져 있을 거야.', '모니터 화면에 네 얼굴 보이면, 그건 반사가 아니야.'],
  hospital: ['세림병원 별관. 접수처 지나서 4층… 아니, 4층은 없지.', '병원 냄새 나면 숨 참지 마. 오래 참으면 저쪽에서 숨 쉬어.'],
  sauna: ['찜질방 수면실엔 눕지 마. 잠깐이라도.', '수건 두 장 챙겨. 하나는 네 거, 하나는… 그냥 챙겨.'],
  redev: ['재개발 구역은 네비에 안 나와. 내가 길 알아.', '빨간 X 칠해진 집 앞엔 차 안 세운다.'],
  office: ['한빛타워 17층. 엘리베이터는 16층까지만 가. 나머지는 계단이야.', '거기 경비 반장님한테 인사해. 30년째 야간이래.'],
  boiler: ['지하 3층까지 내려가는 계단, 세지 마. 셀 때마다 달라.', '기계실은 휴대폰도 안 터져. 소리로 가.'],
  hq: ['…본사 가는 길은 나도 처음이야.', '여기서부터는 내 차도 표면이 아니야.'],
  back: ['수고했어. 오늘은 무사하네.', '백미러로 뒤 좀 봐 줄래? …아니다, 보지 마.', '돌아가는 길은 언제나 갈 때보다 짧아. 이상하지.', '내일도 이 시간에 올게. 아마도.'],
};
const ENFORCER_LINES = [
  ['enforcer', '한국 이면관리협회 집행과입니다. 윤하람 씨 맞으시죠.'],
  ['enforcer', '협회 규정 제12조. 세 번의 배차 불이행은 "업무 의지 없음"으로 간주됩니다.'],
  ['enforcer', '의지 없는 인력은 다른 용도로 쓰입니다. ...오늘은 기회를 한 번 드리죠.'],
  ['enforcer', '징계 임무입니다. 등급 외 밈적 존재 「목격담」. 거부권은 없습니다.'],
  ['', '검은 밴의 문이 열렸다. 안에서 아무도 내리지 않았는데, 누군가 하람의 팔을 잡았다.'],
];

// ── 밴 그리기 (허브 · 이동 장면 공용) ──
function drawVan(ctx, x, y, o = {}) {
  const G = Gfx, black = o.black, t = o.t || 0;
  const body = black ? '#14141a' : '#e8ecf0', shade = black ? '#0b0b10' : '#b8bcc8';
  G.px(ctx, x, y + 6, 74, 22, '#0b0b10');
  G.px(ctx, x + 1, y + 7, 72, 20, body);
  G.px(ctx, x + 1, y + 21, 72, 6, shade);
  G.px(ctx, x + 50, y, 22, 10, '#0b0b10'); G.px(ctx, x + 51, y + 1, 20, 10, body);       // 운전석 지붕
  G.px(ctx, x + 54, y + 3, 14, 7, black ? '#3a0a10' : '#5a7aa8');                         // 앞유리
  for (let i = 0; i < 3; i++) G.px(ctx, x + 6 + i * 15, y + 10, 12, 7, black ? '#1a1a22' : '#3a4a68');   // 옆창
  if (!black) { G.px(ctx, x + 4, y + 18, 44, 2, '#2b3d73'); G.px(ctx, x + 4, y + 20, 44, 1, '#f2c230'); }
  else { G.px(ctx, x + 4, y + 18, 44, 1, '#ff2a3a'); }
  if (o.door) G.px(ctx, x + 36, y + 9, 12, 17, '#0b0b10');                                 // 열린 미닫이문
  G.px(ctx, x + 70, y + 18, 3, 3, black ? '#ff2a3a' : '#f8f4c8');                          // 전조등
  G.px(ctx, x + 1, y + 18, 2, 3, '#e5383b');
  // 바퀴
  for (const wx of [x + 14, x + 58]) {
    G.circle(ctx, wx, y + 28, 6, '#0b0b10'); G.circle(ctx, wx, y + 28, 3, '#5a5a62');
    const a = t * 0.4;
    G.px(ctx, Math.round(wx + Math.cos(a) * 3) - 1, Math.round(y + 28 + Math.sin(a) * 3) - 1, 2, 2, '#c8c8d0');
  }
  if (!black && o.label) { ctx.font = FONT_S; ctx.textBaseline = 'top'; ctx.fillStyle = '#2b3d73'; ctx.fillText('청명관리', x + 8, y + 1 + 7); }
}

// ── 허브: 시계와 배차 ──
Object.assign(HubScene.prototype, {
  initDispatch() {
    const s = this.s;
    if (s.clock == null) s.clock = DAY_START;
    this.minT = 0;
    this.van = s.pickup && s.clock >= s.pickup.at ? { x: VAN_X, st: 'wait', t: 0 } : null;
    this.syncDayNight();
  },
  syncDayNight() { const s = this.s; s.timeOfDay = isNightClock(s.clock) ? 'night' : 'day'; },
  passTime(min) {
    const s = this.s;
    for (let i = 0; i < min; i++) { s.clock++; this.onMinute(); if (this.halted) break; }
    this.syncDayNight();
  },
  updateDispatch() {
    if (++this.minT >= MIN_FRAMES) { this.minT = 0; this.s.clock++; this.onMinute(); this.syncDayNight(); }
    // 밴 움직임
    const v = this.van;
    if (v) {
      v.t = (v.t || 0) + 1;
      if (v.st === 'arrive') { v.x = approach(v.x, VAN_X, Math.max(1.2, Math.min(7, (VAN_X - v.x) * 0.06))); if (Math.abs(v.x - VAN_X) < 0.5) { v.x = VAN_X; v.st = 'wait'; Sound.play('door'); } }
      else if (v.st === 'leave') { v.x += 3; if (v.x > HUB_W + 40) this.van = null; }
      else if (v.st === 'wait' && v.t % 240 === 0) Sound.play('warn');
    }
  },
  onMinute() {
    const s = this.s, P = s.pickup;
    if (P) {
      const left = P.at - s.clock;
      if (left === 30) { Sound.play('phone'); Game.toast(`픽업 30분 전 — ${clockText(P.at)} 청명관리 앞`, COL.yellow); }
      if (left === 10) { Sound.play('phone'); Game.toast('배차실: 10분 뒤 도착합니다. 사무소 앞으로 오세요.', COL.yellow); }
      if (left === 2 && !this.van) { this.van = { x: VAN_X - 380, st: 'arrive', t: 0 }; }
      if (left === 0) { Sound.play('warn'); Game.toast('밴이 도착했다! 청명관리 앞에서 ↑', '#9ae89a'); if (!this.van) this.van = { x: VAN_X, st: 'wait', t: 0 }; }
      if (left === -(PICKUP_WAIT - 10)) { Sound.play('phone'); Game.toast('김 기사: 10분 뒤에 출발해요!', '#ff8a8a'); }
      if (left <= -PICKUP_WAIT) this.missPickup();
    }
    if (s.clock >= LATE_LIMIT && !this.halted && !Game.modals.length) {
      this.halted = true;
      Game.push(new DialogModal([['', '새벽 4시. 몸이 더는 버티지 못했다. 옷도 안 갈아입고 쓰러지듯 잠들었다.']], () => this.goSleep()));
    }
  },
  missPickup() {
    const s = this.s;
    s.pickup = null;
    if (this.van) this.van.st = 'leave';
    this.applyNoShow();
  },
  applyNoShow(next) {
    const s = this.s;
    s.strikes = (s.strikes || 0) + 1;
    const fine = 30000 * s.strikes;
    chargeMoney(s, fine);
    s.trust = Math.max(0, s.trust - 5);
    Achieve.add('noshow');
    const lines = s.strikes >= STRIKE_MAX
      ? [['seo', '하람 씨. 세 번째예요.'], ['seo', '...저도 더는 못 막아요. 협회에서 연락이 갈 거예요. 미안해요.']]
      : s.strikes === 2
        ? [['seo', '하람 씨, 또 안 나왔네요. 밴은 그냥 돌아갔어요.'], ['seo', `위약금 ${won(fine)}, 신뢰 -5. 한 번만 더 이러면 협회가 직접 와요. 농담 아니에요.`]]
        : [['seo', '하람 씨? 기사님이 30분 기다리다 그냥 가셨대요.'], ['seo', `노쇼는 위약금 ${won(fine)}이에요. 신뢰도 깎이고요. 다음부턴 시간 지켜요.`]];
    Game.push(new CallModal('seo', lines, () => {
      saveGame(s);
      if (s.strikes >= STRIKE_MAX) this.startAssociation();
      else if (next) next();
    }));
  },
  // 협회 집행: 검은 밴이 와서 징계 임무로 끌고 간다
  startAssociation() {
    const s = this.s;
    this.van = { x: VAN_X - 380, st: 'arrive', t: 0, black: true };
    Sound.play('boss'); Gfx.shake(4, 30);
    Sound.setAmbience('back');
    const job = makeForcedJob(s);
    Game.push(new DialogModal(ENFORCER_LINES, () => {
      Game.modals = [];
      s.pickup = null;
      Game.fadeTo(() => Game.setScene(new VanScene(job, 'go', { black: true })), 40);
    }));
  },
  board() {
    const s = this.s, P = s.pickup;
    if (!P) return;
    s.pickup = null;
    s.lastPickupAt = s.clock;
    Sound.play('door');
    Game.modals = [];
    Game.fadeTo(() => Game.setScene(new VanScene(P.job, 'go')), 30);
  },
  // 공고 수락 → 배차 예약
  schedulePickup(job) {
    const s = this.s;
    s.pickup = { job, at: job.pickupAt };
    addMessage(s, 'dispatch', `[배차 확정] ${clockText(job.pickupAt)} 청명관리(주) 앞. ${PICKUP_WAIT}분 지나면 출발합니다. 노쇼 시 위약금.`);
    Sound.play('phone');
    Game.toast(`배차 확정 — ${clockText(job.pickupAt)} 청명관리 앞`, COL.yellow);
    saveGame(s);
  },
  goSleep() {
    const s = this.s;
    Game.modals = [];
    Game.fadeTo(() => {
      const ev = advanceDay(s);
      s.pendingEvents = (s.pendingEvents || []).concat(ev);
      s.spawnAt = 96;
      Game.setScene(new HubScene());
      Game.toast(`DAY ${s.day}`, COL.yellow);
      const un = unreadCount(s);
      if (un) Game.toast(`새 메시지 ${un}개 (V)`, COL.cyan);
    }, 40);
  },
  drawDispatch(ctx, cam) {
    const v = this.van;
    if (v) {
      drawVan(ctx, Math.round(v.x - cam), HUB_GROUND + 4, { t: v.st === 'wait' ? 0 : v.t, door: v.st === 'wait', black: v.black, label: true });
      if (v.st === 'wait' && !v.black && this.time % 60 < 40) Gfx.text(ctx, '배차', Math.round(v.x + 37 - cam), HUB_GROUND - 6, COL.yellow, { small: true, align: 'center', shadow: true });
    }
  },
});
function makeForcedJob(s) {
  const rng = new RNG(s.day * 131 + (s.strikes || 0) * 7 + 99);
  const ch = chapterInfo(s);
  const theme = rng.pick(ch.themes.filter((t) => t !== 'hq'));
  return {
    id: 'forced' + s.day, theme, obj: 'erase', diff: 5, pay: 0, forced: true, boss: 'witness',
    title: '[징계] 등급 외 밈적 존재 「목격담」 말소', seed: Math.floor(rng.next() * 1e9), story: null,
  };
}

// ── 전화 수신 화면 ──
class CallModal {
  constructor(who, lines, onDone) { this.who = who; this.lines = lines; this.onDone = onDone; this.t = 0; this.covers = true; this.wantsDim = true; }
  update() {
    this.t++;
    if (this.t % 50 === 1) Sound.play('phone');
    if (this.t % 50 === 1) Input.rumble(0.3, 0.6, 160);
    if (this.t > 30 && (Input.pressed('confirm') || Input.pressed('cancel'))) {
      Game.pop(this);
      Sound.play('select');
      Game.push(new DialogModal(this.lines, this.onDone));
    }
  }
  draw(ctx) {
    const W = 150, H = 190, px = Math.round((VW - W) / 2), py = Math.round((VH - H) / 2) - 4;
    const S = drawPhoneFrame(ctx, px, py, W, H, '');
    const sp = SPEAKERS[this.who];
    Gfx.text(ctx, '전화 왔어요', px + W / 2, S.sy + 20, '#c8c4e0', { small: true, align: 'center' });
    const shake = this.t % 50 < 20 ? Math.round(Math.sin(this.t * 1.3) * 2) : 0;
    if (sp.face && SPR.face[sp.face]) ctx.drawImage(SPR.face[sp.face], px + W / 2 - 17 + shake, S.sy + 44);
    else { Gfx.circle(ctx, px + W / 2 + shake, S.sy + 61, 16, '#3a3650'); }
    Gfx.text(ctx, sp.name, px + W / 2, S.sy + 86, sp.col, { align: 'center', bold: true });
    Gfx.text(ctx, '청명관리(주)', px + W / 2, S.sy + 102, '#8a86a0', { small: true, align: 'center' });
    const pulse = 0.5 + Math.sin(this.t * 0.2) * 0.5;
    ctx.globalAlpha = 0.4 + pulse * 0.6;
    Gfx.circle(ctx, px + W / 2, S.sy + 150, 13, '#3ac87a');
    ctx.globalAlpha = 1;
    Gfx.text(ctx, '받기', px + W / 2, S.sy + 145, '#ffffff', { small: true, align: 'center' });
    UI.hints(ctx, px + W + 8, py + H - 12, [['Z', '받기']], 'left');
  }
}

// ── 이동 장면 (로딩): 밴 옆모습 + 지나가는 풍경 ──
const _stripCache = {};
function sceneryStrip(theme, night) {
  const k = theme + (night ? ':n' : ':d');
  if (_stripCache[k]) return _stripCache[k];
  const G = Gfx, W = 768, H = 120;
  const cv = G.makeCanvas(W, H), c = cv.getContext('2d');
  const r = new RNG(theme.length * 977 + (night ? 3 : 0));
  const P = THEMES[theme] ? THEMES[theme].front : THEMES.apartment.front;
  const win = night ? '#f2d070' : '#8aa8c8', dark = night ? '#0e0e1c' : P.solid;
  const box = (x, w, h, col) => { G.px(c, x, H - h, w, h, col); };
  const windows = (x, w, h, gap, p) => { for (let yy = H - h + 4; yy < H - 6; yy += gap) for (let xx = x + 3; xx < x + w - 4; xx += 6) if (r.chance(p)) G.px(c, xx, yy, 3, 3, win); };
  let x = 0;
  while (x < W) {
    let w = r.int(30, 60), h = r.int(40, 100);
    const col = night ? (r.chance(0.5) ? '#16162a' : '#1c1c34') : (r.chance(0.5) ? P.wall : P.wall2);
    switch (theme) {
      case 'apartment': h = r.int(80, 115); w = r.int(44, 60); box(x, w, h, col); for (let yy = H - h + 6; yy < H - 6; yy += 9) { G.px(c, x + 2, yy, w - 4, 1, dark); } windows(x, w, h, 9, night ? 0.4 : 0.2); G.px(c, x + 4, H - h + 2, 10, 4, '#f4f0e6'); break;
      case 'store': h = r.int(34, 50); box(x, w, h, col); G.px(c, x, H - h, w, 6, r.pick(['#3a8a5a', '#d8281e', '#2a5aa8', '#f2c230'])); if (night) { c.globalAlpha = 0.3; G.px(c, x + 4, H - h + 10, w - 8, h - 12, '#f8f4c8'); c.globalAlpha = 1; } break;
      case 'subway': box(x, w, h * 0.6, col); G.px(c, x, H - 64, w + 12, 6, '#5a5a62'); G.px(c, x + w / 2, H - 58, 6, 58, '#4a4a52'); break;
      case 'school': h = r.int(50, 70); w = r.int(80, 120); box(x, w, h, col); windows(x, w, h, 12, 0.3); G.circle(c, x + w / 2, H - h - 6, 6, '#f4f0e6'); G.px(c, x + w / 2 - 1, H - h - 9, 1, 4, '#3a3a48'); break;
      case 'pcbang': box(x, w, h, col); G.px(c, x + 6, H - h + 8, 18, 8, night ? '#ff3aff' : '#c83ac8'); windows(x, w, h, 8, 0.25); break;
      case 'hospital': h = r.int(70, 100); w = r.int(60, 80); box(x, w, h, '#c8d8d4'); windows(x, w, h, 10, 0.3); G.px(c, x + w / 2 - 6, H - h + 6, 12, 4, '#d8281e'); G.px(c, x + w / 2 - 2, H - h + 2, 4, 12, '#d8281e'); break;
      case 'sauna': h = r.int(40, 60); box(x, w, h, col); G.px(c, x + 4, H - h + 6, 24, 7, night ? '#ff8a3a' : '#c8603a'); for (let i = 0; i < 3; i++) { c.globalAlpha = 0.3; G.circle(c, x + 10 + i * 6, H - h - 8 - i * 6, 5, '#e8e8f0'); c.globalAlpha = 1; } break;
      case 'redev': h = r.int(24, 44); box(x, w, h, night ? '#1a1418' : '#7a7468'); if (r.chance(0.6)) { G.line(c, x + 6, H - h + 4, x + 18, H - h + 16, '#d8201a', 2); G.line(c, x + 18, H - h + 4, x + 6, H - h + 16, '#d8201a', 2); } if (r.chance(0.2)) { G.px(c, x + w - 6, H - 110, 3, 110, '#c8a040'); G.px(c, x + w - 30, H - 110, 30, 3, '#c8a040'); } break;
      case 'office': h = r.int(90, 120); w = r.int(40, 56); box(x, w, h, night ? '#141a2a' : '#7a8aa8'); for (let yy = H - h + 3; yy < H - 4; yy += 5) for (let xx = x + 2; xx < x + w - 2; xx += 4) if (r.chance(night ? 0.3 : 0.6)) G.px(c, xx, yy, 3, 3, night ? '#9ae8ff' : '#a8c0e0'); break;
      case 'boiler': h = r.int(40, 80); box(x, w, h, night ? '#1a1814' : '#5a5a54'); G.px(c, x + w - 10, H - h - 30, 7, 30, night ? '#2a2620' : '#6a6a60'); if (r.chance(0.5)) { c.globalAlpha = 0.3; G.circle(c, x + w - 6, H - h - 38, 6, '#c8c8c0'); c.globalAlpha = 1; } G.px(c, x, H - 30, w, 4, '#8a6a2a'); break;
      default: h = r.int(80, 118); box(x, w, h, night ? '#1a0a10' : '#3a3e4a'); windows(x, w, h, 7, 0.2); break;
    }
    x += w + r.int(2, 16);
  }
  _stripCache[k] = cv;
  return cv;
}

class VanScene {
  constructor(job, dir, opt = {}) {
    this.job = job; this.dir = dir; this.opt = opt; this.t = 0;
    this.dur = dir === 'go' ? 330 : 210;
    this.bus = !!job.side;
    this.black = !!opt.black || !!job.forced;
    const pool = this.black ? [] : dir === 'back' ? DRIVER_LINES.back : DRIVER_LINES.any.concat(DRIVER_LINES[job.theme] || [], DRIVER_LINES[job.theme] || []);
    const rng = new RNG((job.seed || 1) + (dir === 'back' ? 5 : 0));
    this.lines = this.black ? ['……', '(창밖이 보이지 않는다)'] : this.bus ? ['(버스 안. 승객은 나 혼자다.)', '(정류장 안내 방송이 한 박자 늦게 나온다.)'] : rng.shuffle(pool.slice()).slice(0, 3);
    this.dest = dir === 'go' ? THEMES[job.theme].name : this.bus ? '동네 정류장' : '청명관리(주)';
    this.s = Game.state;
    this.night = dir === 'back' || isNightClock(this.s.clock == null ? 20 * 60 : this.s.clock);
  }
  enter() { Sound.setAmbience(this.black ? 'back' : this.night ? 'hubnight' : 'hub'); }
  update() {
    this.t++;
    if (this.t % 26 === 0) Sound.play(this.black ? 'heart' : 'land');      // 도로 이음매 덜컹
    if (this.t > 60 && Input.pressed('confirm')) this.t = Math.max(this.t, this.dur);
    if (this.t >= this.dur && !this.done) {
      this.done = true;
      if (this.dir === 'go') Game.push(new BriefingCard(this.job, () => Game.fadeTo(() => Game.setScene(new MissionScene(this.job)), 30)));
      else Game.fadeTo(() => this.opt.then(), 30);
    }
  }
  draw(ctx) {
    const t = this.t, n = this.night, k = Math.min(1, this.t / 40);
    // 하늘
    const g = ctx.createLinearGradient(0, 0, 0, VH);
    if (this.black) { g.addColorStop(0, '#0a0004'); g.addColorStop(1, '#2a0610'); }
    else if (n) { g.addColorStop(0, '#05060f'); g.addColorStop(1, '#22224a'); }
    else { g.addColorStop(0, '#e89a6a'); g.addColorStop(1, '#f2d0a0'); }
    ctx.fillStyle = g; ctx.fillRect(0, 0, VW, VH);
    // 먼 스카이라인 (느리게)
    const far = sceneryStrip('apartment', true);
    ctx.globalAlpha = n || this.black ? 0.5 : 0.25;
    const fo = -((t * 0.5) % far.width);
    for (let x = fo; x < VW; x += far.width) ctx.drawImage(far, Math.round(x), 26, far.width, 80);
    ctx.globalAlpha = 1;
    // 목적지 풍경 (가 갈수록 목적지, 올 때는 동네)
    const theme = this.black ? 'hq' : this.dir === 'go' ? (t < this.dur * 0.35 ? 'store' : this.job.theme) : 'apartment';
    const strip = sceneryStrip(theme, n);
    const so = -((t * 2.2) % strip.width);
    for (let x = so; x < VW; x += strip.width) ctx.drawImage(strip, Math.round(x), 54);
    // 가로등 · 전봇대
    for (let i = 0; i < 4; i++) {
      const lx = Math.round(VW - ((t * 5 + i * 140) % (VW + 140)));
      ctx.fillStyle = '#1a1a24'; ctx.fillRect(lx, 90, 3, 84);
      ctx.fillRect(lx - 8, 88, 14, 3);
      if (n) { ctx.globalAlpha = 0.25; Gfx.circle(ctx, lx - 2, 100, 18, this.black ? '#ff3a5a' : '#f2d070'); ctx.globalAlpha = 1; }
    }
    // 도로
    ctx.fillStyle = n ? '#1e1e26' : '#4a4a52'; ctx.fillRect(0, 174, VW, VH - 174);
    ctx.fillStyle = '#d8d8c8';
    for (let x = -((t * 8) % 48); x < VW; x += 48) ctx.fillRect(Math.round(x), 196, 24, 2);
    // 밴 (살짝 덜컹)
    const bob = (t % 26 < 2) ? 1 : 0;
    const vx = Math.round(lerp(-100, 132, k));
    if (this.bus) {
      Gfx.px(ctx, vx - 30, 136 + bob, 120, 36, '#0b0b10'); Gfx.px(ctx, vx - 29, 137 + bob, 118, 34, '#3a8a5a'); for (let i = 0; i < 6; i++) Gfx.px(ctx, vx - 24 + i * 18, 142 + bob, 14, 12, n ? '#f8f4c8' : '#a8d8e8');
      for (const wx of [vx - 10, vx + 70]) { Gfx.circle(ctx, wx, 172 + bob, 6, '#0b0b10'); Gfx.circle(ctx, wx, 172 + bob, 3, '#5a5a62'); }
    } else drawVan(ctx, vx, 146 + bob, { t, black: this.black, label: true });
    if (n) { ctx.globalAlpha = 0.18; ctx.fillStyle = this.black ? '#ff2a3a' : '#f8f4c8'; ctx.beginPath(); ctx.moveTo(vx + 74, 164); ctx.lineTo(vx + 180, 150); ctx.lineTo(vx + 180, 190); ctx.closePath(); ctx.fill(); ctx.globalAlpha = 1; }
    // 가까운 가드레일 (빠르게)
    ctx.fillStyle = n ? '#2a2a34' : '#8a8a92';
    ctx.fillRect(0, 186, VW, 2);
    for (let x = -((t * 11) % 30); x < VW; x += 30) ctx.fillRect(Math.round(x), 182, 3, 10);
    // 레터박스 + 정보
    ctx.fillStyle = '#05040a'; ctx.fillRect(0, 0, VW, 24); ctx.fillRect(0, VH - 30, VW, 30);
    const slide = Math.round(lerp(-160, 0, Math.min(1, t / 24)));
    Gfx.text(ctx, this.dir === 'go' ? 'DESTINATION' : 'RETURN', 10 + slide, 3, this.black ? '#ff5a6a' : COL.yellow, { small: true });
    Gfx.text(ctx, '→ ' + this.dest, 10 + slide, 12, '#f4f0e6', { small: true, bold: true });
    Gfx.text(ctx, this.black ? '협회 호송 차량' : this.bus ? '시내버스' : `청명관리 배차 · ${clockText(this.s.clock || 20 * 60)}`, VW - 10, 7, '#8a86a0', { small: true, align: 'right' });
    // 기사 대사 (자막)
    const li = Math.min(this.lines.length - 1, Math.floor(t / 100));
    const who = this.black ? '' : this.bus ? '' : '김 기사: ';
    Gfx.text(ctx, who + this.lines[li], VW / 2, VH - 24, this.black ? '#ff8a9a' : '#e8e0c8', { small: true, align: 'center' });
    // 로딩 진행
    const pr = Math.min(1, t / this.dur);
    ctx.fillStyle = '#2a2638'; ctx.fillRect(40, VH - 8, VW - 80, 2);
    ctx.fillStyle = this.black ? '#ff3a5a' : COL.yellow; ctx.fillRect(40, VH - 8, Math.round((VW - 80) * pr), 2);
    if (t > 60) Gfx.text(ctx, 'Z 건너뛰기', VW - 10, VH - 13, '#5a5670', { small: true, align: 'right' });
  }
}

// ── 현장 도착 브리핑 ──
class BriefingCard {
  constructor(job, onGo) { this.job = job; this.onGo = onGo; this.t = 0; this.covers = true; this.wantsDim = false; }
  update() {
    this.t++;
    if (this.t > 30 && Input.pressed('confirm')) { Game.pop(this); Sound.play('select'); this.onGo(); }
  }
  draw(ctx) {
    const j = this.job, th = THEMES[j.theme], meme = MEMES[th.meme], ob = OBJECTIVES[j.obj === 'deep' ? 'deep' : j.obj] || OBJECTIVES.erase;
    const k = Math.min(1, this.t / 18);
    ctx.fillStyle = `rgba(5,4,10,${0.85 * k})`; ctx.fillRect(0, 0, VW, VH);
    // 비스듬한 띠
    ctx.save();
    ctx.translate(Math.round(lerp(-VW, 0, k)), 0);
    ctx.fillStyle = j.forced ? '#5a0a14' : '#1a1830';
    ctx.beginPath(); ctx.moveTo(0, 34); ctx.lineTo(VW, 22); ctx.lineTo(VW, 92); ctx.lineTo(0, 104); ctx.closePath(); ctx.fill();
    ctx.fillStyle = j.forced ? '#ff3a5a' : ob.col; ctx.fillRect(0, 100, VW, 2);
    ctx.restore();
    if (!this.big || this.bigKey !== th.name) { this.big = Gfx.bigText(th.name, '#f4f0e6', 2); this.bigKey = th.name; }
    ctx.globalAlpha = k;
    Gfx.text(ctx, j.forced ? '징계 임무 · 거부 불가' : '현장 도착 · 임무 브리핑', 24, 30, j.forced ? '#ff5a6a' : COL.yellow, { small: true, bold: true });
    ctx.drawImage(this.big, 24, 44);
    Gfx.text(ctx, `괴담 「${meme.name}」`, 24, 80, '#c8c4d8', { small: true });
    const x = 24, y = 112, C = UI.C;
    UI.card(ctx, x, y, VW - 48, 74, { accent: j.forced ? '#ff3a5a' : ob.col });
    Gfx.text(ctx, (j.obj === 'deep' ? `심층 탐사 ${j.stages}층 · 마지막: ${OBJECTIVES[j.finalObj].name}` : ob.name) + '   ' + '★'.repeat(j.diff) + '☆'.repeat(5 - j.diff), x + 10, y + 7, ob.col, { bold: true });
    Gfx.text(ctx, j.forced ? '보수 없음 · 성공하면 노쇼 기록 말소' : j.pay ? `보수 ${won(j.pay)}` : '보수 ???', x + VW - 58, y + 8, '#9ae89a', { small: true, align: 'right' });
    const notes = [];
    notes.push(j.obj === 'deep' ? OBJECTIVES.deep.desc : ob.desc);
    if (j.rules) notes.push(`근무 수칙 ${j.rules.length}개 — 거짓 수칙이 섞여 있을 수 있다.`);
    if (j.jammed) notes.push('현장 전체에 통신 교란. 화면 수치를 믿지 말 것.');
    if (j.forced) notes.push('협회 지정 등급 외 존재. 모든 패턴을 쓴다. 쓰러지면 협회가 수습 비용을 청구한다.');
    Gfx.para(ctx, notes.join(' '), x + 10, y + 24, VW - 68, '#c8c4d8', { small: true, maxLines: 4 });
    ctx.globalAlpha = 1;
    if (this.t > 30 && Math.floor(this.t / 20) % 2 === 0) UI.hints(ctx, VW / 2, VH - 18, [['Z', '현장 투입']], 'center');
  }
}
