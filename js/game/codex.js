'use strict';
// ───────────────────────── 도감 (현장 기록) ─────────────────────────
// 적: 처음 보면 이름, 1번 쓰러뜨리면 설명, 10번이면 현장 메모(공략)
const CODEX_ENEMY = {
  noise: ['뒷면 공기 속을 떠도는 정전기 덩어리. 누군가 끝까지 듣지 않은 괴담의 찌꺼기다.', '느리지만 벽을 무시하고 다가온다. 표면으로 넘어가면 닿지 않는다.'],
  follower: ['어두운 복도에서 내 발소리를 반 박자 늦게 따라 하는 것. 걸음걸이가 점점 나와 닮아 간다.', '점프까지 따라 한다. 발판 위에서 내려다보며 싸우면 편하다.'],
  flyer: ['전봇대에 붙은 "사람을 찾습니다" 전단지. 사진 속 눈이 지나가는 사람을 따라 움직인다.', '움직이지 않고 쏘기만 한다. 눈을 깜빡이는 틈에 다가가자.'],
  notif: ['확인하지 않은 알림 배지가 모여 생긴 무리. 숫자가 커질수록 사나워진다.', '떼로 몰려오고 통신을 교란한다. 근처에서는 화면 수치를 믿지 말 것.'],
  watcher: ['뒤돌아보면 없고, 앞을 보면 등 뒤에 서 있는 사람. 볼 때마다 키가 조금씩 크다.', '바라보는 동안은 멈춘다. 등을 보이면 순식간에 다가온다.'],
  crawler: ['바닥을 기어다니는 손. 누구의 손인지는 아무도 확인하지 않았다.', '낮게 뛰어오른다. 점프로 넘거나 착지 순간을 노리자.'],
  patient: ['존재하지 않는 1004호에서 나온 환자. 아직 퇴원 수속을 기다리고 있다.', '멈춰 있다가 갑자기 돌진한다. 몸을 웅크리는 순간이 신호다.'],
  ivbag: ['주인 없이 복도를 떠도는 링거 팩. 떨어지는 방울에 닿으면 정신이 흐려진다.', '아래로 방울을 떨어뜨린다. 바로 밑에 오래 서 있지 말 것.'],
  sleeper: ['수면실 옆자리에 누운 손님. 깨우지만 않으면 아무 일도 없다.', '때리기 전까지는 잠들어 있다. 지나칠지 깨울지는 당신의 선택.'],
  steam: ['한증막 수증기 속에서만 보이는 얼굴. 숨을 쉬면 같이 들이마시게 된다.', '천천히 떠다니고 몸이 약하다. 한두 번이면 흩어진다.'],
  tenant: ['철거가 끝나도 이사 가지 못한 사람. 보증금을 아직 돌려받지 못했다.', '벽을 통과해 떠돈다. 길목을 막고 있으면 돌아가는 편이 낫다.'],
  xmark: ['철거 예정 집에 칠해진 표시. 벽에서 떨어져 나와 다음 집을 찾는다.', '제자리에서 쏜다. 붉게 번쩍이면 발사 직전이다.'],
  smiler: ['근무 수칙에 적힌 그 손님. 아무것도 사지 않고, 계속 웃는다.', '해를 끼치지 않는다. 때리면 수칙 위반이고, 반드시 대가가 따른다.'],
  listener: ['눈이 없다. 대신 귀가 너무 크다. 소리가 난 곳으로 곧장 달려온다.', '조용히 걸으면 지나간다. 박수·착지·공격 소리가 나면 그쪽으로 돌진한다.'],
  echo: ['표면에 남은 뒷면의 메아리. 누군가의 마지막 퇴근길을 되풀이한다.', '표면에서도 나타난다. 약하지만 닿으면 정신력이 깎인다.'],
};
const CODEX_BOSS = {
  door: ['없는 층에 사는 주민. 없는 버튼을 누른 사람을 이웃으로 맞이한다.', '돌진과 내려찍기. 돌진이 끝난 직후의 빈틈을 노리자.'],
  receipt: ['영수증으로 하루를 계산하는 손님. 계산이 끝나면 그 하루가 사라진다.', '순간이동한 뒤 광선을 쏜다. 사라지는 순간 자리를 옮기자.'],
  speaker: ['막차를 놓친 사람에게만 들리는 안내 방송의 주인.', '열차가 화면을 가로지른다. 경고선이 보이면 위로 피하자.'],
  clock: ['13번째 계단 위에서 출석을 부르는 감독. 대답하면 출석부에서 지워진다.', '위에서 쏟아지는 공격이 많다. 한자리에 머물지 말 것.'],
  monitor: ['끝까지 보면 안 되는 영상의 썸네일. 볼 때마다 조금 더 웃는다.', '공중에 떠 있고 통신 교란이 강하다. 화면 수치보다 감을 믿자.'],
  flyer: ['급한 사람에게만 보이는 공고. 지원한 사람은 공고의 일부가 된다. 사진 속 얼굴은 민재다.', '소환과 순간이동. 불려 나온 따라쟁이부터 정리하자.'],
  nurse: ['없는 1004호 담당 간호사. 그녀의 회진은 끝나지 않는다.', '빠른 돌진과 확산탄. 환자들을 불러낸다.'],
  sheep: ['수면실에서 가장 큰 손님. 수건 양머리 아래에는 아무것도 없다.', '고리 공격과 내려찍기. 잠든 손님들을 깨운다.'],
  demolisher: ['빨간 X를 칠하는 사람. 불도저와 함께 다음 집을 찾아다닌다.', '불도저가 밀고 들어온다. 위로 피하거나 표면으로 넘어가자.'],
  suit: ['"누군가 치우고 있다"는 믿음이 정장을 입은 모습. 머리는 결재 도장이다.', '모든 패턴을 쓴다. 표면에 숨으면 체력을 회복하니 오래 숨지 말 것.'],
  nameless: ['청명이 먹어 치운 이름들. 퇴근 도장을 받지 못한 사원증의 더미.', '잔향을 불러내고 순간이동한다. 이제 이름을 불러 줄 차례다.'],
};
const CODEX_PLACE = {
  apartment: '모든 이야기가 시작된 낡은 맨션. 4층과 5층 사이에 복도가 하나 더 있다.',
  store: '24시간 불이 켜진 편의점. 새벽 3시가 되면 손님이 하나 늘어난다.',
  subway: '환승역 지하 3층. 지도에 없는 승강장에서 막차를 기다리는 사람들이 있다.',
  school: '폐교된 고등학교. 야간 자율학습 종이 아직도 울린다.',
  pcbang: '모니터 불빛만 남은 PC방. 어떤 자리는 영원히 로그아웃되지 않는다.',
  hospital: '4층이 없는 병원 별관. 밤마다 1004호 호출 벨이 울린다.',
  sauna: '24시간 찜질방. 수면실은 언제나 만석이다.',
  redev: '빨간 X가 칠해진 재개발 구역. 떠나지 못한 불빛이 아직 남아 있다.',
  hq: '청명관리 지점 사무동과 본사. 표면 어디에도 존재하지 않는다.',
  office: '야근이 끝나지 않는 오피스 빌딩. 밤 11시면 17층의 불이 저절로 꺼진다.',
  boiler: '빛이 닿지 않는 지하 기계실. 배관을 두드리면 누군가 답한다.',
};
// 보스를 쓰러뜨리면 풀리는 밈 (장소 테마에 묶이지 않는 것)
const MEME_BY_BOSS = { flyer: 'mtteum', suit: 'mcheong' };
const CODEX_TABS = [
  { key: 'enemy', name: '존재', list: () => Object.keys(ENEMIES) },
  { key: 'boss', name: '보스', list: () => Object.keys(BOSSES) },
  { key: 'art', name: '아티팩트', list: () => Object.keys(ARTIFACTS) },
  { key: 'meme', name: '밈', list: () => Object.keys(MEMES) },
  { key: 'place', name: '장소', list: () => Object.keys(THEMES) },
];
const CODEX_MILESTONES = [
  { need: 10, name: '견습 기록원', reward: { sp: 1 } },
  { need: 25, name: '현장 기록원', reward: { money: 100000 } },
  { need: 40, name: '괴담 수집가', reward: { sp: 2 } },
  { need: 55, name: '뒷면 박물학자', reward: { items: { charm: 2, coffee: 2, gimbap: 2 } } },
  { need: 74, name: '도시 괴담 사전', reward: { sp: 3, money: 300000 } },
];
CODEX_MILESTONES[CODEX_MILESTONES.length - 1].need = codexTotal();   // 마지막 칭호 = 전부

function codexOf(s) {
  if (!s.codex) s.codex = { enemy: {}, boss: {}, art: {}, meme: {}, place: {} };
  for (const t of CODEX_TABS) if (!s.codex[t.key]) s.codex[t.key] = {};
  return s.codex;
}
// 반환: 새로 등록되었는지
function codexSee(s, kind, id) {
  const c = codexOf(s)[kind];
  if (c[id] != null) return false;
  c[id] = 0;
  return kind === 'enemy' && id === 'smiler';
}
function codexAdd(s, kind, id) {
  const c = codexOf(s)[kind];
  const first = !c[id];
  c[id] = (c[id] || 0) + 1;
  return first;
}
function codexKnown(s, kind, id) {
  const v = codexOf(s)[kind][id];
  if (kind === 'enemy' && id === 'smiler') return v != null;
  return v != null && v >= 1;
}
function codexCount(s) {
  let n = 0;
  for (const t of CODEX_TABS) for (const id of t.list()) if (codexKnown(s, t.key, id)) n++;
  return n;
}
function codexTotal() { return CODEX_TABS.reduce((a, t) => a + t.list().length, 0); }
function codexClaimable(s) { const n = codexCount(s); return CODEX_MILESTONES.some((m) => n >= m.need && !(s.codexClaimed || []).includes(m.need)); }
// 달성한 기록 보상을 받는다. 반환: 받은 보상 문장 목록
function codexClaim(s) {
  s.codexClaimed = s.codexClaimed || [];
  const n = codexCount(s), got = [];
  for (const m of CODEX_MILESTONES) {
    if (n < m.need || s.codexClaimed.includes(m.need)) continue;
    s.codexClaimed.push(m.need);
    const R = m.reward, parts = [];
    if (R.sp) { s.sp = (s.sp || 0) + R.sp; parts.push(`SP +${R.sp}`); }
    if (R.money) { addMoney(s, R.money); parts.push(won(R.money)); }
    if (R.items) for (const k in R.items) { s.items[k] = Math.min(itemMax(s), (s.items[k] || 0) + R.items[k]); parts.push(`${ITEMS[k].name} ×${R.items[k]}`); }
    got.push(`「${m.name}」 ${m.need}칸 달성 — ${parts.join(', ')}`);
  }
  return got;
}

// 미발견 실루엣 (캐시)
const _codexShadow = new WeakMap();
function codexShadow(cv) {
  let w = _codexShadow.get(cv);
  if (!w) { w = Gfx.tint(cv, '#2a2638'); _codexShadow.set(cv, w); }
  return w;
}
function codexIcon(kind, id) {
  if (kind === 'enemy') {
    const d = ENEMIES[id], set = SPR[d.sprite];
    return Array.isArray(set) ? set[0] : set && set.R ? set.R[0] : null;
  }
  if (kind === 'boss') return SPR.boss[id] ? SPR.boss[id][0] : null;
  if (kind === 'art') return SPR.icon[ARTIFACTS[id].icon];
  if (kind === 'meme') {
    const b = Object.keys(MEME_BY_BOSS).find((k) => MEME_BY_BOSS[k] === id) || (Object.values(THEMES).find((t) => t.meme === id) || {}).boss;
    return b && SPR.boss[b] ? SPR.boss[b][0] : null;
  }
  return null;
}
function codexName(kind, id) {
  return kind === 'enemy' ? ENEMIES[id].name : kind === 'boss' ? BOSSES[id].name : kind === 'art' ? ARTIFACTS[id].name : kind === 'meme' ? MEMES[id].name : THEMES[id].name;
}
function codexDetail(s, kind, id) {
  const v = codexOf(s)[kind][id];
  if (kind === 'enemy') {
    const L = CODEX_ENEMY[id] || ['', ''];
    const kills = v || 0, full = id === 'smiler' || kills >= 10;
    if (v == null) return { lock: '아직 마주친 적이 없다.' };
    return {
      sub: id === 'smiler' ? '근무 수칙 대상' : `쓰러뜨린 수 ${kills}`,
      text: id !== 'smiler' && kills < 1 ? '본 적은 있다. 한 번 쓰러뜨리면 기록이 채워진다.' : L[0],
      tip: full ? L[1] : `현장 메모: ${10 - kills}번 더 쓰러뜨리면 열린다.`, tipLocked: !full,
    };
  }
  if (kind === 'boss') {
    const L = CODEX_BOSS[id] || ['', ''];
    if (!v) return { lock: v === 0 ? '마주쳤지만 아직 말소하지 못했다.' : '아직 마주친 적이 없다.' };
    return { sub: `말소 ${v}회 · ${BOSSES[id].title}`, text: L[0], tip: L[1] };
  }
  if (kind === 'art') {
    if (!v) return { lock: '아직 손에 넣은 적이 없다.' };
    const a = ARTIFACTS[id];
    return { sub: `${RARITY[a.rarity].name} · ${MEMES[a.from].name}`, subCol: RARITY[a.rarity].col, text: artifactDesc(id).replace(/^\[.*?\] /, '') };
  }
  if (kind === 'meme') {
    if (!v) return { lock: '아직 해소한 적이 없는 이야기다.' };
    return { sub: `해소 ${v}회`, text: MEMES[id].desc };
  }
  if (!v) return { lock: '아직 가 본 적이 없다.' };
  return { sub: `출근 ${v}회 · ${THEMES[id].short}`, text: CODEX_PLACE[id] || '' };
}

// ── 도감 화면 ──
class CodexView {
  constructor(s) {
    this.s = s; this.tab = 0; this.sel = 0; this.t = 0; this.blockInput = 6;
    this.covers = true; this.wantsDim = true;
  }
  get list() { return CODEX_TABS[this.tab].list(); }
  update() {
    this.t++;
    if (this.blockInput > 0) { this.blockInput--; return; }
    const n = this.list.length, COLS = 6;
    const prev = this.sel;
    if (Input.pressed('left')) this.sel = (this.sel - 1 + n) % n;
    if (Input.pressed('right')) this.sel = (this.sel + 1) % n;
    if (Input.pressed('up')) this.sel = this.sel - COLS >= 0 ? this.sel - COLS : this.sel;
    if (Input.pressed('down')) this.sel = this.sel + COLS < n ? this.sel + COLS : this.sel;
    if (prev !== this.sel) Sound.play('menu');
    if (Input.pressed('cycle') || Input.pressed('dash') || Input.pressed('flip')) {
      const d = Input.pressed('flip') ? -1 : 1;
      this.tab = (this.tab + d + CODEX_TABS.length) % CODEX_TABS.length; this.sel = 0; Sound.play('select');
    }
    if (Input.pressed('cancel') || Input.pressed('pause')) { Sound.play('cancel'); Game.pop(this); }
  }
  draw(ctx) {
    const C = UI.C, s = this.s;
    const x = 10, y = 6, w = VW - 20, h = VH - 24;
    UI.card(ctx, x, y, w, h, { accent: '#c8a04a' });
    Gfx.text(ctx, '도감', x + 10, y + 6, C.text, { bold: true });
    const n = codexCount(s), tot = codexTotal();
    Gfx.text(ctx, `${n}/${tot}`, x + 40, y + 8, '#c8a04a', { small: true });
    // 다음 기록 보상
    const next = CODEX_MILESTONES.find((m) => !(s.codexClaimed || []).includes(m.need));
    if (next) {
      Gfx.text(ctx, `다음 칭호 「${next.name}」 ${n}/${next.need}`, x + w - 10, y + 4, C.mute, { small: true, align: 'right' });
      UI.bar(ctx, x + w - 120, y + 16, 110, 3, n / next.need, '#c8a04a');
    } else Gfx.text(ctx, '도감 완성!', x + w - 10, y + 7, '#c8a04a', { small: true, align: 'right' });
    // 탭
    let tx = x + 10;
    CODEX_TABS.forEach((t, i) => {
      const list = t.list(), got = list.filter((id) => codexKnown(s, t.key, id)).length;
      const label = `${t.name} ${got}/${list.length}`;
      const tw = Gfx.measure(ctx, label, { small: true }) + 12;
      const on = i === this.tab;
      UI.card(ctx, tx, y + 24, tw, 13, { fill: on ? 'rgba(200,160,74,0.22)' : 'rgba(255,255,255,0.03)', border: on ? '#c8a04a' : C.line });
      Gfx.text(ctx, label, tx + 6, y + 26, on ? C.text : C.mute, { small: true });
      tx += tw + 4;
    });
    // 격자
    const list = this.list, kind = CODEX_TABS[this.tab].key, COLS = 6, CS = 26;
    const gx = x + 10, gy = y + 44;
    const rows = Math.ceil(list.length / COLS), maxRows = 5;
    const top = Math.max(0, Math.min(Math.floor(this.sel / COLS) - 2, rows - maxRows));
    for (let i = top * COLS; i < Math.min(list.length, (top + maxRows) * COLS); i++) {
      const id = list[i], cx = gx + (i % COLS) * (CS + 3), cy = gy + (Math.floor(i / COLS) - top) * (CS + 3);
      const known = codexKnown(s, kind, id), seen = codexOf(s)[kind][id] != null;
      const sel = i === this.sel;
      ctx.fillStyle = sel ? 'rgba(200,160,74,0.25)' : known ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.3)';
      ctx.fillRect(cx, cy, CS, CS);
      ctx.fillStyle = sel ? '#c8a04a' : C.line; ctx.fillRect(cx, cy + CS - 1, CS, 1);
      const ic = kind === 'place' ? null : codexIcon(kind, id);
      if (kind === 'place') {
        const th = THEMES[id];
        if (known) { ctx.fillStyle = th.front.wall; ctx.fillRect(cx + 4, cy + 4, 9, 18); ctx.fillStyle = th.back.wall; ctx.fillRect(cx + 13, cy + 4, 9, 18); ctx.fillStyle = th.front.floor; ctx.fillRect(cx + 4, cy + 18, 9, 4); ctx.fillStyle = th.back.barrier; ctx.fillRect(cx + 13, cy + 18, 9, 4); }
        else Gfx.text(ctx, '?', cx + CS / 2, cy + 7, C.line2, { align: 'center' });
      } else if (ic) {
        const sc = Math.min(1, (CS - 4) / Math.max(ic.width, ic.height));
        const dw = Math.round(ic.width * sc), dh = Math.round(ic.height * sc);
        ctx.imageSmoothingEnabled = false;
        if (known || seen) {
          if (!known) ctx.globalAlpha = 0.35;
          ctx.drawImage(ic, cx + Math.round((CS - dw) / 2), cy + Math.round((CS - dh) / 2), dw, dh);
          ctx.globalAlpha = 1;
        } else {
          ctx.globalAlpha = 0.6; ctx.drawImage(codexShadow(ic), cx + Math.round((CS - dw) / 2), cy + Math.round((CS - dh) / 2), dw, dh); ctx.globalAlpha = 1;
          Gfx.text(ctx, '?', cx + CS - 6, cy + 1, C.line2, { small: true });
        }
      }
    }
    if (rows > maxRows) {
      if (top > 0) Gfx.text(ctx, '▲', gx + COLS * (CS + 3) / 2, gy - 9, C.mute, { small: true, align: 'center' });
      if (top + maxRows < rows) Gfx.text(ctx, '▼', gx + COLS * (CS + 3) / 2, gy + maxRows * (CS + 3) - 2, C.mute, { small: true, align: 'center' });
    }
    // 상세
    const dx = gx + COLS * (CS + 3) + 6, dw = x + w - 10 - dx;
    const id = list[this.sel];
    const det = codexDetail(s, kind, id);
    const known = codexKnown(s, kind, id), seen = codexOf(s)[kind][id] != null;
    UI.card(ctx, dx, gy, dw, maxRows * (CS + 3) - 3, { fill: 'rgba(0,0,0,0.25)', border: C.line });
    Gfx.text(ctx, known || seen ? codexName(kind, id) : '???', dx + 8, gy + 6, known ? C.text : C.sub, { bold: true });
    if (det.lock) {
      Gfx.para(ctx, det.lock, dx + 8, gy + 26, dw - 16, C.mute, { small: true, maxLines: 3 });
    } else {
      if (det.sub) Gfx.text(ctx, Gfx.fit(ctx, det.sub, dw - 16, { small: true }), dx + 8, gy + 22, det.subCol || '#c8a04a', { small: true });
      const used = Gfx.para(ctx, det.text, dx + 8, gy + 36, dw - 16, '#c8c4d8', { small: true, maxLines: 5 });
      if (det.tip) {
        const ty = gy + 36 + used + 6;
        UI.divider(ctx, dx + 8, ty - 3, dw - 16);
        Gfx.para(ctx, (det.tipLocked ? '' : '공략 · ') + det.tip, dx + 8, ty + 1, dw - 16, det.tipLocked ? C.mute : '#9ae89a', { small: true, maxLines: 3 });
      }
    }
    UI.hints(ctx, x + w, y + h + 3, [['방향키', '선택'], ['Q/C', '분류'], ['X', '닫기']]);
  }
}
// 휴대폰 앱에서 열 때: 보상 정산 후 화면
function openCodex(s) {
  const got = codexClaim(s);
  Game.push(new CodexView(s));
  if (got.length) {
    Sound.play('levelup');
    Game.push(new TextView('도감 기록 보상', got.join('\n'), null, { titleCol: '#c8a04a' }));
    if (typeof saveGame === 'function') saveGame(s);
  }
}
