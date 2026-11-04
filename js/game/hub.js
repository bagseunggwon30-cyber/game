'use strict';
// ───────────────────────── 허브: 동네 거리 (옥탑방 · 편의점 · 정류장 · 청명관리) ─────────────────────────
const HUB_W = 780;
const HUB_GROUND = 176;

const MINJAE_MEET = [
  ['min', '어? 너 신입이지? 조끼 새거네ㅋㅋ 나 민재. 여기 1년 차.'],
  ['min', '첫 현장 살아서 나왔으면 재능 있는 거야. 반은 첫날 그만둬.'],
  ['me', '나머지 반은요?'],
  ['min', '...음. 계속 다니지. 아무튼!'],
  ['min', '휴대폰(V)에 "틈새" 앱 있지? 거기서 매일 알바 골라. 하루에 하나만 돼. 몸이 못 버텨.'],
  ['min', '편의점에서 사탕이랑 에너지드링크 꼭 챙기고. 아, 뒷문에 노을이라는 애 있는데—'],
  ['min', '...그건 나중에 알려 줄게.'],
];

function drawStreet(night, cont) {
  const G = Gfx;
  const cv = G.makeCanvas(HUB_W, VH);
  const c = cv.getContext('2d');
  // 하늘
  const sky = c.createLinearGradient(0, 0, 0, HUB_GROUND);
  if (night) { sky.addColorStop(0, '#05060f'); sky.addColorStop(1, '#1a1a3a'); }
  else { sky.addColorStop(0, '#5a8ac8'); sky.addColorStop(1, '#c8d8e8'); }
  c.fillStyle = sky; c.fillRect(0, 0, HUB_W, HUB_GROUND);
  const r = new RNG(42);
  if (night) for (let i = 0; i < 70; i++) G.px(c, r.int(0, HUB_W), r.int(0, 90), 1, 1, r.chance(0.3) ? '#ffffff' : '#8a8ab8');
  else { for (let i = 0; i < 5; i++) { const x = r.int(0, HUB_W), y = r.int(10, 60); G.px(c, x, y, 40, 6, '#e8f0f8'); G.px(c, x + 8, y - 4, 22, 5, '#e8f0f8'); } }
  if (night) { G.circle(c, 640, 28, 9, '#f4f0d0'); G.circle(c, 644, 25, 8, '#1a1a3a'); }
  // 원경 빌딩
  for (let x = 0; x < HUB_W; x += r.int(18, 34)) {
    const h = r.int(40, 100), w = r.int(16, 30);
    G.px(c, x, HUB_GROUND - 30 - h, w, h + 30, night ? '#14142a' : '#8a9ab8');
    for (let wy = HUB_GROUND - 26 - h; wy < HUB_GROUND - 34; wy += 6) for (let wx2 = x + 3; wx2 < x + w - 3; wx2 += 5) {
      if (r.chance(night ? 0.35 : 0.15)) G.px(c, wx2, wy, 2, 3, night ? '#f2d070' : '#6a7a98');
    }
  }
  // 전깃줄
  c.fillStyle = '#1a1a24';
  for (let x = 0; x < HUB_W; x++) { const y = 70 + Math.sin(x / HUB_W * Math.PI * 6) * 6; c.fillRect(x, Math.round(y), 1, 1); }

  // 1) 옥탑방 빌라 (30~170)
  G.px(c, 30, 70, 140, 106, night ? '#4a4048' : '#a8988a');
  for (let fl = 0; fl < 3; fl++) for (let i = 0; i < 4; i++) {
    const lit = night && r.chance(0.6);
    G.px(c, 40 + i * 32, 80 + fl * 30, 20, 16, '#3a3038'); G.px(c, 42 + i * 32, 82 + fl * 30, 16, 12, lit ? '#f2d070' : night ? '#1a1a2a' : '#6a8ab8');
  }
  G.px(c, 70, 52, 60, 18, night ? '#5a5060' : '#c8b8a0'); // 옥탑
  G.px(c, 66, 48, 68, 5, '#3a3038');
  G.px(c, 110, 56, 12, 10, night ? '#f2d070' : '#6a8ab8');
  G.px(c, 136, 58, 22, 12, '#5a6a7a'); G.px(c, 140, 52, 3, 6, '#8a8a9a'); // 물탱크
  G.px(c, 84, 146, 24, 30, '#3a2a28'); G.px(c, 86, 148, 20, 28, '#6a4a3a'); G.px(c, 102, 160, 2, 3, '#d8c070');
  G.px(c, 76, 136, 40, 9, '#2a3a5a'); G.px(c, 80, 138, 32, 5, '#e8e8f0');
  // 2) 새벽마트 (210~370)
  G.px(c, 210, 96, 160, 80, '#e8e8ec');
  G.px(c, 210, 96, 160, 18, '#3a8a5a'); G.px(c, 210, 112, 160, 3, '#f2c230');
  G.px(c, 218, 122, 90, 48, night ? '#f8f4c8' : '#c8e8f0');
  for (let i = 0; i < 4; i++) { G.px(c, 222 + i * 22, 132, 18, 30, '#c8ccd6'); for (let j = 0; j < 3; j++) G.px(c, 224 + i * 22, 134 + j * 10, 14, 6, ['#e5383b', '#5a7dff', '#f2c230', '#3ad0a0'][(i + j) % 4]); }
  G.px(c, 314, 122, 30, 54, '#2a2a34'); G.px(c, 316, 124, 26, 52, night ? '#f8f4c8' : '#a8d8e8');
  G.px(c, 352, 140, 16, 36, '#5a5a6a'); G.px(c, 354, 142, 12, 34, '#3a3a48'); // 뒷문
  G.px(c, 372, 150, 14, 26, '#5a7a5a'); // 쓰레기통
  // 3) 정류장 (400~460)
  G.px(c, 420, 110, 3, 66, '#5a5a6a'); G.px(c, 406, 104, 32, 14, '#2a5aa8'); G.px(c, 410, 108, 24, 6, '#f4f0e6');
  G.px(c, 430, 140, 40, 3, '#5a5a6a'); G.px(c, 434, 143, 2, 33, '#5a5a6a'); G.px(c, 464, 143, 2, 33, '#5a5a6a'); G.px(c, 430, 160, 40, 3, '#6a5a4a');
  // 4) 청명관리 (490~700)
  G.px(c, 490, 40, 210, 136, night ? '#2a2e3a' : '#9aa0b0');
  for (let fl = 0; fl < 5; fl++) for (let i = 0; i < 6; i++) {
    const lit = night ? r.chance(0.25) : false;
    G.px(c, 500 + i * 33, 50 + fl * 20, 24, 12, lit ? '#e8f0ff' : night ? '#141826' : '#5a6a88');
  }
  G.px(c, 540, 136, 110, 14, '#2b3d73'); G.px(c, 545, 139, 100, 8, '#f4f0e6');
  G.px(c, 576, 150, 40, 26, '#141824'); G.px(c, 578, 152, 17, 24, night ? '#3a4a6a' : '#6a8aa8'); G.px(c, 597, 152, 17, 24, night ? '#3a4a6a' : '#6a8aa8');
  // 울타리
  for (let x = 710; x < HUB_W; x += 8) G.px(c, x, 150, 2, 26, '#5a5a6a');
  G.px(c, 706, 152, 74, 2, '#5a5a6a'); G.px(c, 706, 164, 74, 2, '#5a5a6a');
  // 가로등
  for (const lx of [190, 395, 720]) {
    G.px(c, lx, 100, 3, 76, '#3a3a48'); G.px(c, lx - 6, 98, 12, 4, '#3a3a48');
    if (night) { c.globalAlpha = 0.18; G.circle(c, lx + 1, 120, 28, '#f2d070'); c.globalAlpha = 1; G.px(c, lx - 4, 102, 8, 2, '#f8f0b0'); }
  }
  // 보도 / 도로
  G.px(c, 0, HUB_GROUND, HUB_W, 10, night ? '#5a5a62' : '#a8a8b0');
  for (let x = 0; x < HUB_W; x += 16) G.px(c, x, HUB_GROUND, 1, 10, night ? '#4a4a52' : '#8a8a92');
  G.px(c, 0, HUB_GROUND + 10, HUB_W, 2, '#3a3a40');
  G.px(c, 0, HUB_GROUND + 12, HUB_W, VH - HUB_GROUND - 12, night ? '#22222a' : '#4a4a52');
  for (let x = 0; x < HUB_W; x += 40) G.px(c, x, HUB_GROUND + 24, 20, 2, '#d8d8c8');
  // 글자 간판 (작은 글자)
  c.font = FONT_S; c.textBaseline = 'top';
  const sign = (t, x, y, col) => { c.fillStyle = '#000'; c.fillText(t, x + 1, y + 1); c.fillStyle = col; c.fillText(t, x, y); };
  sign('새벽마트 24', 244, 99, '#ffffff');
  sign('청명관리(주)', 566, 138, '#2b3d73');
  sign('현장', 414, 106, '#2a5aa8');
  sign('옥탑방 ↑', 78, 136, '#2a3a5a');
  if (cont >= 30) {
    // 오염: 벽에 번진 붉은 낙서
    const rr = new RNG(cont | 0);
    const n = Math.floor(cont / 15);
    for (let i = 0; i < n; i++) sign(rr.pick(['보고있어', '돌아와', '1', '뒤집어']), rr.int(20, HUB_W - 60), rr.int(80, 160), 'rgba(255,60,90,0.6)');
  }
  return cv;
}

class HubScene {
  constructor() {
    this.s = Game.state;
    this.player = { x: 96, y: HUB_GROUND - 22, w: 10, h: 22, vx: 0, vy: 0, facing: 1, frame: 0, anim: 0, onGround: true };
    this.cam = 0;
    this.time = 0;
    this.prompt = null;
    this.glitch = 0;
    this.zones = [
      { x: 84, w: 24, label: '옥탑방', act: () => this.openHome() },
      { x: 314, w: 30, label: '새벽마트', act: () => this.openStore() },
      { x: 348, w: 22, label: '뒷문', act: () => this.openNoeul() },
      { x: 404, w: 40, label: '현장 출근', act: () => this.openJobs() },
      { x: 576, w: 40, label: '청명관리', act: () => this.openOffice() },
    ];
  }

  enter() {
    this.bg = drawStreet(this.s.timeOfDay === 'night', this.s.contamination);
    this.bgKey = this.s.timeOfDay + ':' + Math.floor(this.s.contamination / 15);
    Sound.setAmbience(this.s.timeOfDay === 'night' ? 'hubnight' : 'hub');
    if (this.s.spawnAt) { this.player.x = this.s.spawnAt; delete this.s.spawnAt; }
    this.cam = clamp(this.player.x - VW / 2, 0, HUB_W - VW);
    saveGame(this.s);
    if (this.checkDissolve()) return;
    this.runPending();
  }

  runPending() {
    const s = this.s;
    if (s.pendingDialogs && s.pendingDialogs.length) {
      const lines = s.pendingDialogs.shift();
      Game.push(new DialogModal(lines, () => { saveGame(s); this.runPending(); }));
      return;
    }
    if (s.pendingEvents && s.pendingEvents.length) {
      const ev = s.pendingEvents.shift();
      this.showEvent(ev, () => this.runPending());
    }
  }

  showEvent(ev, next) {
    const s = this.s;
    if (ev.type === 'rent') {
      const lines = ev.short > 0
        ? [['landlord', `월세 ${won(RENT)} 중에 ${won(ev.paid)}만 들어왔네요?`], ['landlord', `나머지 ${won(ev.short)}은 빚으로 달아 둘게요. 다음 수입에서 절반씩 떼 갈 거예요~`]]
        : [['landlord', `월세 ${won(RENT)} 잘 받았어요~ 다음 달도 부탁해요.`]];
      Game.push(new DialogModal(lines, next));
    } else if (ev.type === 'audit') {
      const lines = ev.caught
        ? [['', '아침 일찍, 청명 감사팀이 옥탑방 문을 두드렸다.'], ['seo', '...미안해요, 하람 씨. 규칙은 규칙이에요.'], ['', `숨겨 둔 아티팩트 ${ev.n}개를 압수당했다. 벌금 ${won(ev.fine)}, 신뢰 -8.`]]
        : [['', '아침 일찍, 청명 감사팀이 옥탑방을 뒤졌다.'], ['', '아무것도 나오지 않았다. 의심도가 크게 내려갔다.']];
      Sound.play(ev.caught ? 'deny' : 'select');
      Game.push(new DialogModal(lines, next));
    } else if (ev.type === 'reboot') {
      Sound.play('static');
      Game.push(new DialogModal([['', '밤새 휴대폰 화면이 지직거렸다. 껐다 켜니 잡음은 사라졌다.'], ['', '...어젯밤 받은 이상한 메시지는, 그대로 남아 있다.']], next));
    } else if (ev.type === 'rank') {
      Sound.play('levelup');
      Game.push(new DialogModal([['seo', `축하해요. 오늘부터 하람 씨는 "${RANKS[ev.rank].name}"예요.`], ['', `승급 포인트 +2. 청명관리 사무소에서 "승급 교육"을 받을 수 있다.`]], next));
    } else next();
  }

  checkDissolve() {
    if (this.s.contamination >= 100) {
      Storage.del(SAVE_KEY);
      Game.fadeTo(() => Game.setScene(new EndingScene('dissolve')));
      return true;
    }
    return false;
  }

  update() {
    this.time++;
    const p = this.player;
    const key = this.s.timeOfDay + ':' + Math.floor(this.s.contamination / 15);
    if (key !== this.bgKey) { this.bg = drawStreet(this.s.timeOfDay === 'night', this.s.contamination); this.bgKey = key; }
    const mx = (Input.down('right') ? 1 : 0) - (Input.down('left') ? 1 : 0);
    p.vx = approach(p.vx, mx * 1.9, 0.4);
    if (mx) p.facing = mx;
    if (Input.pressed('jump') && p.onGround) { p.vy = -5; p.onGround = false; Sound.play('jump'); }
    p.vy = Math.min(MAXFALL, p.vy + GRAV);
    p.x = clamp(p.x + p.vx, 8, HUB_W - 80);
    p.y += p.vy;
    if (p.y >= HUB_GROUND - p.h) { p.y = HUB_GROUND - p.h; p.vy = 0; p.onGround = true; }
    p.anim++;
    p.frame = !p.onGround ? (p.vy < 0 ? 6 : 7) : Math.abs(p.vx) > 0.3 ? 2 + Math.floor(p.anim / 6) % 4 : Math.floor(p.anim / 30) % 2;
    this.cam = lerp(this.cam, clamp(p.x - VW / 2, 0, HUB_W - VW), 0.12);
    this.prompt = null;
    for (const z of this.zones) if (p.x + p.w > z.x && p.x < z.x + z.w) this.prompt = z;
    if (Input.pressed('interact') && this.prompt) { Sound.play('door'); this.prompt.act(); return; }
    if (Input.pressed('phone')) { Sound.play('phone'); this.openPhone(); return; }
    if (Input.pressed('pause')) { this.openPhone(); return; }
    const c = this.s.contamination;
    if (c >= 30 && Math.random() < c / 20000) this.glitch = rndi(6, 14);
    if (this.glitch > 0) this.glitch--;
  }

  // ── 그리기 ──
  draw(ctx) {
    const s = this.s, cam = Math.round(this.cam);
    ctx.drawImage(this.bg, -cam, 0);
    const night = s.timeOfDay === 'night';
    // NPC
    const npc = (set, x, face) => { const f = (face > 0 ? set.R : set.L)[Math.floor(this.time / 30) % 2]; ctx.drawImage(f, Math.round(x - cam), HUB_GROUND - 24); };
    npc(SPR.noeul, 356, -1);
    if (s.storyStage >= 1 && !s.flags.minjaeGone) npc(SPR.min, 548, 1);
    // 플레이어
    const p = this.player;
    const fr = (p.facing > 0 ? SPR.player.R : SPR.player.L)[p.frame];
    ctx.drawImage(fr, Math.round(p.x - 3 - cam), Math.round(p.y - 2));
    const pose = POSES[POSE_ORDER[p.frame]];
    const hx = p.facing > 0 ? p.x - 3 + pose.h[0] + 1 : p.x - 3 + 15 - pose.h[0] - 1;
    drawWeapon(ctx, WEAPONS[s.weapon].kind, Math.round(hx - cam), Math.round(p.y - 2 + pose.h[1] + 1), -1.25, p.facing);
    if (night) { ctx.fillStyle = 'rgba(10,10,40,0.25)'; ctx.fillRect(0, 0, VW, VH); }
    // 오염 글리치
    if (this.glitch > 0) {
      ctx.fillStyle = 'rgba(120,0,30,0.35)'; ctx.fillRect(0, 0, VW, VH);
      for (let i = 0; i < 3; i++) { const y = rndi(0, VH); ctx.drawImage(Gfx.buf, 0, y, VW, 6, rndi(-10, 10), y, VW, 6); }
    }
    // 안내
    if (this.prompt && !Game.modals.length) {
      const z = this.prompt;
      const tx = Math.round(z.x + z.w / 2 - cam), ty = Math.round(118 + Math.sin(this.time * 0.12) * 1.5);
      const w = Gfx.measure(ctx, z.label, { small: true }) + 22;
      UI.card(ctx, tx - w / 2, ty - 2, w, 15, { fill: 'rgba(12,11,19,0.9)', border: UI.C.line2 });
      UI.keycap(ctx, tx - w / 2 + 3, ty, '↑');
      Gfx.text(ctx, z.label, tx - w / 2 + 17, ty, UI.C.text, { small: true, shadow: false });
    }
    this.drawHUD(ctx);
  }

  drawHUD(ctx) {
    const s = this.s, C = UI.C;
    const top = ctx.createLinearGradient(0, 0, 0, 62);
    top.addColorStop(0, 'rgba(8,7,14,0.78)'); top.addColorStop(1, 'rgba(8,7,14,0)');
    ctx.fillStyle = top; ctx.fillRect(0, 0, VW, 62);
    // 좌상단: 날짜 / 돈 / 월세
    const night = s.timeOfDay === 'night';
    Gfx.text(ctx, `DAY ${s.day}`, 8, 6, C.text, { bold: true });
    UI.pill(ctx, 14 + Gfx.measure(ctx, `DAY ${s.day}`, { bold: true }), 7, night ? '밤' : '낮', night ? '#8a9aff' : '#f2c230');
    Gfx.text(ctx, won(s.money), 8, 21, '#9ae89a');
    const left = s.rentDue - s.day;
    Gfx.text(ctx, `월세 ${left <= 0 ? '오늘' : 'D-' + left}`, 8, 35, left <= 1 ? '#ff8a8a' : C.sub, { small: true });
    if (s.debt > 0) Gfx.text(ctx, '빚 ' + won(s.debt), 62, 35, '#ff6a6a', { small: true });
    // 우상단: 등급 / 의심 / 오염
    const ri = rankIndex(s), nr = RANKS[ri + 1];
    const rx = VW - 104;
    Gfx.text(ctx, RANKS[ri].name, VW - 8, 6, COL.cyan, { align: 'right', bold: true });
    UI.bar(ctx, rx, 21, 96, 2, nr ? (s.trust - RANKS[ri].need) / (nr.need - RANKS[ri].need) : 1, COL.cyan);
    Gfx.text(ctx, nr ? `신뢰 ${s.trust}/${nr.need}` : `신뢰 ${s.trust}`, VW - 8, 24, C.sub, { small: true, align: 'right' });
    Gfx.text(ctx, '의심', rx, 36, COL.orange, { small: true }); UI.bar(ctx, rx + 24, 41, 72, 2, s.suspicion / 100, COL.orange);
    Gfx.text(ctx, '오염', rx, 46, COL.pink, { small: true }); UI.bar(ctx, rx + 24, 51, 72, 2, s.contamination / 100, COL.pink);
    if (Game.modals.length) return;
    // 하단: 오늘 할 일 / 알림 / 조작
    const bot = ctx.createLinearGradient(0, VH - 40, 0, VH);
    bot.addColorStop(0, 'rgba(8,7,14,0)'); bot.addColorStop(1, 'rgba(8,7,14,0.6)');
    ctx.fillStyle = bot; ctx.fillRect(0, VH - 40, VW, 40);
    const todo = s.workedToday ? '오늘 근무 끝 — 옥탑방에서 쉬자' : '오늘의 알바를 고르자 (정류장 · 휴대폰)';
    ctx.fillStyle = s.workedToday ? COL.green : C.accent; ctx.fillRect(9, VH - 12, 3, 3);
    Gfx.text(ctx, todo, 16, VH - 15, C.text, { small: true });
    let nx = 8;
    if (s.statPoints > 0) nx += UI.pill(ctx, nx, VH - 30, '승급 포인트 ' + s.statPoints, COL.green, { dot: true }) + 4;
    if ((s.sp || 0) > 0) nx += UI.pill(ctx, nx, VH - 30, '마음 조각 ' + s.sp, '#a99cff', { dot: true }) + 4;
    if (s.phoneGlitch) UI.pill(ctx, nx, VH - 30, '휴대폰 신호 불량', '#62d6e8', { dot: true });
    const un = unreadCount(s);
    UI.hints(ctx, VW - 8, VH - 15, [['V', un ? `휴대폰 (${un})` : '휴대폰']], 'right');
  }

  // ───────────── 메뉴들 ─────────────
  phoneTime() { return `DAY ${this.s.day} ${this.s.timeOfDay === 'night' ? '23:40' : '09:12'}`; }

  openPhone() {
    const s = this.s;
    const night = s.timeOfDay === 'night';
    Game.push(new PhoneHome([
      { name: '틈새', icon: 'jobs', desc: '오늘 지원할 수 있는 알바 목록.', open: () => this.openJobs() },
      { name: '메시지', icon: 'msg', badge: unreadCount(s) || null, desc: '받은 메시지.', open: () => this.openMessages() },
      { name: '메모', icon: 'memo', badge: null, desc: `진실 조각 ${s.truths.length}/10 — 현장에서 모은 문서.`, open: () => this.openTruths() },
      { name: '마음 지도', icon: 'mind', badge: s.sp || null, desc: '스킬트리. 마음 조각(SP)으로 노드를 해금한다.', open: () => Game.push(new SkillTreeView(s)) },
      { name: '내 상태', icon: 'status', desc: '능력치 · 능력 · 장비.', open: () => Game.push(new StatusView(s)) },
      { name: '설정', icon: 'settings', desc: '소리, 조작법, 저장하고 타이틀로.', open: () => this.openSettings() },
    ], night ? '23:40' : '09:12', `DAY ${s.day} · ${night ? '밤' : '낮'}`));
  }

  openSettings() {
    const s = this.s;
    Game.push(new Menu({
      title: '설정', phone: true, phoneTime: this.phoneTime(), desc: true, appCol: '#9a98b0',
      refresh: () => [
        { label: Sound.muted ? '소리 켜기' : '소리 끄기', desc: '사운드를 전환한다.', onSelect: () => Sound.toggleMute() },
        { label: '조작법', desc: '키 안내', onSelect: () => Game.push(new TextView('조작법', CONTROLS_TEXT)) },
        { label: '상태 효과 안내', desc: '공포·패닉·희망 등 설명', onSelect: () => Game.push(new TextView('상태 효과', STATUS_HELP_TEXT)) },
        { label: '저장하고 타이틀로', desc: '진행 상황을 저장하고 타이틀 화면으로 돌아간다.', onSelect: () => { Game.modals = []; saveGame(s); Game.fadeTo(() => Game.setScene(new TitleScene())); } },
      ],
    }));
  }

  openJobs() {
    const s = this.s;
    const jobs = currentJobs(s);
    Game.push(new Menu({
      title: '틈새 · 오늘의 알바', titleRight: 'DAY ' + s.day, desc: true, phone: true, phoneTime: this.phoneTime(), appCol: '#f2c230',
      items: jobs.map((j) => {
        const meme = MEMES[THEMES[j.theme].meme];
        const stars = '★'.repeat(j.diff) + '☆'.repeat(5 - j.diff);
        const locked = j.locked;
        return {
          label: (j.story ? '◆ ' : '') + (j.jammed ? glitchText(j.title, 0.15) : j.title.replace(/^\[.*?\] /, '')),
          sub: j.jammed ? `발신처 확인 불가 · ${THEMES[j.theme].short} · ${stars}` : j.obj === 'deep' ? `심층 ${j.stages}층 · ${THEMES[j.theme].short} · ${stars}` : `${(OBJECTIVES[j.obj] || { name: '최종' }).name} · ${THEMES[j.theme].short} · ${stars}`,
          subCol: j.jammed ? '#62d6e8' : (OBJECTIVES[j.obj] || { col: '#ff5a6a' }).col,
          right: j.obj === 'deep' ? '최대 ' + won(Math.round(j.pay * (0.65 + 0.3 * j.stages) / 1000) * 1000) : j.pay ? won(j.pay) : '???',
          col: j.story ? (locked ? COL.dark : COL.pink) : null,
          disabled: locked || s.workedToday,
          desc: locked ? `[잠김] ${j.reqText}` : s.workedToday ? '오늘은 이미 일했다. 옥탑방에서 자고 내일 다시 보자.' :
            j.obj === 'deep' ? `${THEMES[j.theme].name}의 뒷면을 ${j.stages}층까지 내려간다. 균열마다 계속할지 챙겨서 철수할지 고른다. 마지막 층: ${OBJECTIVES[j.finalObj].name}. 쓰러지면 모두 잃는다.` :
            j.jammed ? `출처를 알 수 없는 공고. 보수는 1.6배지만 현장 전체에 통신 교란이 깔려 있다. (${(OBJECTIVES[j.obj] || { name: '최종' }).name})` : `${THEMES[j.theme].name} — 괴담 "${meme.name}": ${meme.desc}`,
          onSelect: () => this.confirmJob(j),
        };
      }),
    }));
  }

  confirmJob(job) {
    Game.push(new Menu({
      title: '출근할까?', w: 200, desc: true,
      items: [
        { label: '출근한다', desc: `${THEMES[job.theme].name}으로 향한다. 소지품을 확인했는가?`, onSelect: () => { Game.modals = []; Game.fadeTo(() => Game.setScene(new MissionScene(job))); } },
        { label: '그만둔다', desc: '조금 더 준비하자.', onSelect: (m) => m.close() },
      ],
    }));
  }

  openMessages() {
    const s = this.s;
    Game.push(new Menu({
      title: '메시지', titleRight: unreadCount(s) ? `안 읽음 ${unreadCount(s)}` : '', phone: true, phoneTime: this.phoneTime(), appCol: '#3ac87a',
      refresh: () => (s.messages.length ? s.messages.map((m) => ({
        label: (m.read ? '' : '● ') + SPEAKERS[m.from].name,
        sub: m.text,
        right: 'D' + m.day,
        col: m.read ? '#a29eb8' : SPEAKERS[m.from].col,
        onSelect: () => {
          m.read = true;
          if (m.fake) { Sound.play('static'); Game.push(new TextView('서경 팀장 · 발신 번호 없음', m.text + '\n\n— 이 메시지는 서버에 기록이 없습니다 —', null, { titleCol: '#ff5a6a' })); }
          else Game.push(new TextView(SPEAKERS[m.from].name, m.text, null, { titleCol: SPEAKERS[m.from].col }));
        },
      })) : [{ label: '(메시지 없음)', disabled: true }]),
    }));
    // 목록을 열면 첫 메시지는 읽음 처리하지 않는다 (선택 시 읽음)
  }

  openTruths() {
    const s = this.s;
    Game.push(new Menu({
      title: '메모 · 진실 조각', titleRight: s.truths.length + '/10', desc: true, phone: true, phoneTime: this.phoneTime(), appCol: '#e8e0c8',
      items: TRUTH_ORDER.map((id, i) => {
        const has = s.truths.includes(id);
        return {
          label: has ? `${i + 1}. ${TRUTHS[id].title}` : `${i + 1}. ???`,
          disabled: !has,
          desc: has ? TRUTHS[id].text.split('\n')[0] : '현장에서 문서를 찾거나, 누군가와 거래해 얻을 수 있다.',
          onSelect: () => Game.push(new TextView(TRUTHS[id].title, TRUTHS[id].text, null, { paper: true })),
        };
      }),
    }));
  }

  // 옥탑방
  openHome() {
    const s = this.s;
    Game.push(new Menu({
      title: '옥탑방', w: 210, desc: true,
      refresh: () => [
        { label: '은닉처', right: s.stash.length + '개', desc: '장판 밑에 숨겨 둔 아티팩트. 흡수하면 강해지지만 오염된다.', onSelect: () => this.openStash() },
        { label: '마음 지도', right: 'SP ' + (s.sp || 0), desc: '스킬트리. 다섯 갈래의 마음을 키운다.', onSelect: () => Game.push(new SkillTreeView(s)) },
        { label: '잠자기', desc: s.workedToday ? '오늘은 여기까지. 다음 날로 넘어간다.' : '일하지 않고 하루를 넘긴다.', onSelect: () => this.sleep() },
        { label: '휴대폰', desc: '알바 목록, 메시지, 메모.', onSelect: () => this.openPhone() },
        { label: '저장하기', desc: '진행 상황을 저장한다. (허브에 올 때마다 자동 저장)', onSelect: () => { saveGame(s); Game.toast('저장했다.', COL.green); } },
        { label: '나가기', desc: '', onSelect: (m) => m.close() },
      ],
    }));
  }

  openStash() {
    const s = this.s;
    const menu = new Menu({
      title: '은닉처', w: 260, desc: true, maxVis: 7,
      refresh: () => (s.stash.length ? s.stash.map((id, i) => {
        const a = ARTIFACTS[id];
        return { label: a.name, icon: SPR.icon[a.icon], bigIcon: SPR.icon[a.icon], right: RARITY[a.rarity].name, rightCol: RARITY[a.rarity].col, desc: artifactDesc(id), onSelect: () => this.stashAction(i) };
      }) : [{ label: '(비어 있음)', disabled: true, desc: '현장에서 주운 아티팩트를 "은닉"하면 여기에 쌓인다. 감사에 걸리면 압수된다.' }]),
    });
    Game.push(menu);
  }
  stashAction(i) {
    const s = this.s;
    const id = s.stash[i];
    const a = ARTIFACTS[id];
    Game.push(new Menu({
      title: a.name, w: 220, desc: true,
      items: [
        { label: '흡수한다', col: COL.pink, desc: `몸에 "먹인다". ${artifactDesc(id).split('\n')[1]}`, onSelect: (m) => {
          m.close();
          const idx = s.stash.indexOf(id);
          if (idx >= 0) s.stash.splice(idx, 1);
          const contGain = Math.round(RARITY[a.rarity].cont * (1 - skillMods(s).contAbs));
          const got = absorbArtifact(s, id);
          Sound.play('artifact');
          Gfx.shake(3, 20);
          this.glitch = 20;
          Game.push(new TextView('흡수: ' + a.name, `손에 쥔 ${a.name}이(가) 피부 속으로 스며들었다.\n\n${got.join('\n')}\n오염도 +${contGain}  (현재 ${Math.round(s.contamination)})`, () => { saveGame(s); this.checkDissolve(); }, { icon: SPR.icon[a.icon], titleCol: COL.pink }));
        } },
        { label: '그대로 둔다', desc: '감사에 걸리지 않기를.', onSelect: (m) => m.close() },
      ],
    }));
  }

  sleep() {
    const s = this.s;
    Game.push(new Menu({
      title: '잠을 잘까?', w: 200, desc: true,
      items: [
        { label: '잔다', desc: '다음 날 아침으로 넘어간다.', onSelect: () => {
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
        } },
        { label: '아직', desc: '', onSelect: (m) => m.close() },
      ],
    }));
  }

  // 편의점
  openStore() {
    const s = this.s;
    Game.push(new Menu({
      title: '새벽마트', titleRight: won(s.money), w: 270, desc: true,
      refresh: () => Object.keys(ITEMS).map((k) => {
        const it = ITEMS[k];
        const have = s.items[k] || 0;
        return {
          label: it.name, icon: SPR.icon[it.icon], bigIcon: SPR.icon[it.icon], right: won(it.price) + ` (${have})`,
          disabled: have >= ITEM_MAX || s.money < it.price,
          desc: it.desc + (have >= ITEM_MAX ? `  — 최대 ${ITEM_MAX}개` : s.money < it.price ? '  — 돈이 부족하다' : ''),
          onSelect: (m) => { if (spendMoney(s, it.price)) { s.items[k] = have + 1; Sound.play('buy'); m.o.titleRight = won(s.money); } },
        };
      }),
      onCancel: () => saveGame(s),
    }));
  }

  // 노을 (뒷문)
  openNoeul() {
    const s = this.s;
    const sellPrice = (id) => Math.round(RARITY[ARTIFACTS[id].rarity].submit * 1.4 / 1000) * 1000;
    const infoPool = () => ['t5', 't6', 't7', 't8', 't9'].filter((t) => !s.truths.includes(t));
    Game.push(new Menu({
      title: '새벽마트 뒷문 · 노을', w: 240, desc: true,
      refresh: () => [
        { label: '대화한다', desc: '야간 알바 노을. 전직 청명 아르바이트생.', onSelect: () => this.chat('noeul') },
        { label: '아티팩트 팔기', right: s.stash.length + '개', disabled: !s.stash.length, desc: '숨긴 아티팩트를 회사보다 비싸게 판다. 의심도는 그대로.', onSelect: () => {
          Game.push(new Menu({
            title: '팔 물건', w: 260, desc: true, maxVis: 7,
            refresh: () => (s.stash.length ? s.stash.map((id) => ({ label: ARTIFACTS[id].name, icon: SPR.icon[ARTIFACTS[id].icon], right: won(sellPrice(id)), desc: artifactDesc(id), onSelect: () => {
              const idx = s.stash.indexOf(id); if (idx < 0) return;
              s.stash.splice(idx, 1);
              const r = addMoney(s, sellPrice(id));
              Sound.play('coin');
              Game.toast(`${ARTIFACTS[id].name} 판매: ${won(r.got)}` + (r.toDebt ? ` (빚 상환 ${won(r.toDebt)})` : ''), '#9ae89a');
            } })) : [{ label: '(팔 물건이 없다)', disabled: true }]),
          }));
        } },
        { label: '정보와 교환', disabled: !s.stash.length || !infoPool().length, desc: infoPool().length ? '아티팩트 하나를 주고 청명에 대한 정보(진실 조각)를 얻는다.' : '노을: "이제 더 알려 줄 건 없어요."', onSelect: () => {
          Game.push(new Menu({
            title: '무엇을 건넬까', w: 260, desc: true, maxVis: 7,
            items: s.stash.map((id) => ({ label: ARTIFACTS[id].name, icon: SPR.icon[ARTIFACTS[id].icon], desc: artifactDesc(id), onSelect: () => {
              Game.modals = [];
              const idx = s.stash.indexOf(id); if (idx < 0) return;
              s.stash.splice(idx, 1);
              const t = infoPool()[0];
              s.truths.push(t);
              saveGame(s);
              Game.push(new DialogModal([['noeul', '...좋아요. 이건 내가 도망칠 때 들고 나온 거예요.']], () => Game.push(new TextView(TRUTHS[t].title, TRUTHS[t].text + `\n\n[진실 조각 획득 ${s.truths.length}/10]`, null, { paper: true }))));
            } })),
          }));
        } },
        { label: '나가기', desc: '', onSelect: (m) => m.close() },
      ],
    }));
  }

  chat(who) {
    const s = this.s;
    const opts = CHATS[who];
    const c = opts.find((o) => { try { return o.when(s); } catch (e) { return false; } });
    if (c.set) s.flags[c.set] = true;
    Game.push(new DialogModal(c.lines));
  }

  // 청명관리 사무소
  openOffice() {
    const s = this.s;
    const clinicPrice = () => 50000 + 15000 * s.clinicUses;
    Game.push(new Menu({
      title: '청명관리 사무소', w: 250, desc: true,
      refresh: () => [
        { label: '서경 팀장과 대화', desc: '현장 1팀 팀장. 언제나 정장 차림이다.', onSelect: () => this.chat('seo') },
        { label: '승급 교육', right: s.statPoints + 'P', disabled: s.statPoints <= 0, col: s.statPoints > 0 ? COL.green : null, desc: s.statPoints > 0 ? '승급 포인트로 능력치를 올린다.' : '승급하면 포인트를 받는다.', onSelect: () => this.openTraining() },
        { label: '비품 신청', desc: '돈을 내고 장비를 지급받는다. (구매 즉시 장착)', onSelect: () => this.openEquipShop() },
        { label: '장비 변경', right: WEAPONS[s.weapon].name, desc: '보유한 무기 중 하나를 고른다.', onSelect: () => this.openWeaponSelect() },
        { label: '정화 시술', right: won(clinicPrice()), disabled: s.contamination <= 0 || s.money < clinicPrice(), desc: `오염도를 15 낮춘다. 현재 오염 ${Math.round(s.contamination)}. 회사 지정 의원에서 받는다. (회차마다 비싸진다)`, onSelect: () => {
          if (!spendMoney(s, clinicPrice())) return;
          s.clinicUses++;
          addContamination(s, -15);
          Sound.play('anchor');
          Game.toast('오염도 -15', COL.pink);
          saveGame(s);
        } },
        { label: '마음 정리 (스킬 초기화)', right: won(80000), disabled: s.skills.length <= 1 || s.money < 80000, desc: `회사 상담실에서 마음을 "정리"받는다. 해금한 노드를 모두 되돌리고 마음 조각 ${skillSpent(s)}개를 돌려받는다.`, onSelect: () => {
          if (!spendMoney(s, 80000)) return;
          s.sp = (s.sp || 0) + skillSpent(s);
          s.skills = ['core'];
          Sound.play('anchor');
          Game.toast('마음 지도가 초기화되었다.', '#a99cff');
          saveGame(s);
        } },
        { label: '나가기', desc: '', onSelect: (m) => m.close() },
      ],
    }));
  }
  openTraining() {
    const s = this.s;
    Game.push(new Menu({
      title: '승급 교육', titleRight: s.statPoints + 'P', w: 240, desc: true,
      refresh: () => STAT_KEYS.map((k) => ({
        label: STAT_INFO[k].name, right: String(s.stats[k]), disabled: s.statPoints <= 0, desc: STAT_INFO[k].desc + ' 증가',
        onSelect: (m) => { if (s.statPoints <= 0) return; s.statPoints--; s.stats[k]++; Sound.play('levelup'); m.o.titleRight = s.statPoints + 'P'; saveGame(s); },
      })),
    }));
  }
  openEquipShop() {
    const s = this.s;
    const r = rankIndex(s);
    Game.push(new Menu({
      title: '비품 신청', titleRight: won(s.money), w: 290, desc: true, maxVis: 8,
      refresh: () => {
        const items = [];
        for (const k in WEAPONS) {
          const w = WEAPONS[k];
          if (!w.price) continue;
          const owned = s.weapons.includes(k);
          const lock = (w.rank || 0) > r;
          items.push({ label: '[무기] ' + w.name, right: owned ? '보유' : won(w.price), disabled: owned || lock || s.money < w.price, desc: `${w.desc} 공격력 ${w.dmg}` + (lock ? `  — ${RANKS[w.rank].name} 이상` : ''), onSelect: (m) => { if (spendMoney(s, w.price)) { s.weapons.push(k); s.weapon = k; Sound.play('buy'); m.o.titleRight = won(s.money); saveGame(s); } } });
        }
        for (const k in GEAR) {
          const g = GEAR[k];
          const owned = s.gear.includes(k);
          const lock = (g.rank || 0) > r;
          items.push({ label: '[장비] ' + g.name, right: owned ? '보유' : won(g.price), disabled: owned || lock || s.money < g.price, desc: g.desc + (lock ? `  — ${RANKS[g.rank].name} 이상` : ''), onSelect: (m) => { if (spendMoney(s, g.price)) { s.gear.push(k); Sound.play('buy'); m.o.titleRight = won(s.money); saveGame(s); } } });
        }
        return items;
      },
    }));
  }
  openWeaponSelect() {
    const s = this.s;
    Game.push(new Menu({
      title: '장비 변경', w: 230, desc: true,
      refresh: () => s.weapons.map((k) => ({ label: WEAPONS[k].name, right: s.weapon === k ? '장착 중' : '', desc: WEAPONS[k].desc + ` 공격력 ${WEAPONS[k].dmg}`, onSelect: () => { s.weapon = k; Sound.play('select'); } })),
    }));
  }
}
