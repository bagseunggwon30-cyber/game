'use strict';
// ───────────────────────── 업적 (기기 전체 공통, 저장 기록과 별개) ─────────────────────────
const ACH_KEY = 'backside_parttimer_achieve_v1';
// counter/need: 누적 카운터가 need에 닿으면 달성. skin: 함께 풀리는 외형
const ACHIEVEMENTS = {
  firstShift: { name: '첫 출근', desc: '임무를 처음으로 무사히 마쳤다.', skin: 'night' },
  dodge1: { name: '아슬아슬', desc: '처음으로 아슬아슬하게 피했다.', counter: 'dodge', need: 1 },
  dodgeRun10: { name: '칼날 위의 춤', desc: '한 현장에서 아슬아슬 회피 10번.', skin: 'sky' },
  dodge100: { name: '잔상', desc: '아슬아슬 회피 누적 100번.', counter: 'dodge', need: 100 },
  noDamage: { name: '무사고', desc: '피해를 한 번도 받지 않고 임무를 마쳤다.', skin: 'white' },
  perfectRule: { name: '모범 근무자', desc: '근무 수칙을 하나도 어기지 않고 퇴근했다.', skin: 'mart' },
  deepFull: { name: '바닥까지', desc: '심층 탐사를 끝까지 내려갔다.' },
  elite10: { name: '정예 사냥', desc: '정예 존재 10마리를 쓰러뜨렸다.', counter: 'elite', need: 10 },
  elite50: { name: '정예 사냥꾼', desc: '정예 존재 50마리를 쓰러뜨렸다.', counter: 'elite', need: 50, skin: 'black' },
  finisher50: { name: '세 번째 박자', desc: '콤보 마무리 일격 50번.', counter: 'finisher', need: 50 },
  heavy30: { name: '풀스윙', desc: '차지 강공격으로 존재 30마리를 쓰러뜨렸다.', counter: 'heavyKill', need: 30 },
  meteor3: { name: '유성 낙하', desc: '내려찍기 한 번으로 셋 이상을 쳤다.' },
  perk3: { name: '각인 수집가', desc: '한 현장에서 각인을 3개 모았다.' },
  parry10: { name: '우산 장인', desc: '패링 10번.', counter: 'parry', need: 10, skin: 'pink' },
  arsenal: { name: '비품 창고', desc: '무기 8종을 모두 갖췄다.' },
  maxUp: { name: '장인의 손길', desc: '무기를 +5까지 강화했다.' },
  boss10: { name: '말소 전문가', desc: '보스 10종을 말소했다.' },
  codexHalf: { name: '현장 기록원', desc: '도감을 절반 채웠다.' },
  codexAll: { name: '도시 괴담 사전', desc: '도감을 모두 채웠다.', skin: 'gold' },
  truth15: { name: '진실에 다가서다', desc: '진실 조각 15개.' },
  rich: { name: '백만 원의 무게', desc: '소지금 ₩1,000,000을 모았다.' },
  pure: { name: '깨끗한 손', desc: '오염도 0인 채로 3장에 들어섰다.' },
  tainted: { name: '물든 그림자', desc: '오염도 90에 닿았다.', skin: 'crimson' },
  end1: { name: '하나의 결말', desc: '결말을 하나 보았다.' },
  end4: { name: '갈림길', desc: '결말을 넷 보았다.' },
  endAll: { name: '모든 이야기', desc: '결말 8가지를 모두 보았다.', skin: 'shade' },
  ngplus: { name: '재계약', desc: '2회차를 시작했다.' },
  trueEnd: { name: '모두의 퇴근', desc: '진짜 결말에 닿았다.', skin: 'dawn' },
};
// 외형: 업적으로 풀린다 (기기 전체 공통)
const SKINS = {
  default: { name: '형광 조끼', pal: {} },
  night: { name: '야간 남색 조끼', pal: { vest: '#3a5aa8', vestDark: '#2a4078', strip: '#c8d8ff', cap: '#1a1a2a', capDark: '#101018', logo: '#9ab8ff' } },
  sky: { name: '잔상 하늘색', pal: { vest: '#9ae8ff', vestDark: '#5ab8d8', strip: '#ffffff', cap: '#2a5a7a', capDark: '#1a3a50' } },
  white: { name: '무사고 흰색', pal: { vest: '#f0f0f4', vestDark: '#c0c4d0', strip: '#3aa05a', cap: '#d8dce4', capDark: '#a8acb8', logo: '#3aa05a' } },
  mart: { name: '새벽마트 유니폼', pal: { vest: '#3a8a5a', vestDark: '#2a6a44', strip: '#9ad0a8', cap: '#2a6a44', capDark: '#1a4a30', logo: '#f2c230' } },
  black: { name: '정예 사냥꾼', pal: { vest: '#2a2a30', vestDark: '#1a1a20', strip: '#ff3a5a', cap: '#14141a', capDark: '#0b0b10', logo: '#ff3a5a' } },
  pink: { name: 'K 채널 굿즈', pal: { vest: '#ff8ab0', vestDark: '#d8608a', strip: '#ffffff', cap: '#2a2230', capDark: '#1a141e', logo: '#ff8ab0' } },
  crimson: { name: '물든 진홍', pal: { vest: '#a8121e', vestDark: '#7a0a14', strip: '#ff8a9a', cap: '#3a0a14', capDark: '#22060c', logo: '#ff3a5a' } },
  gold: { name: '도감 금박', pal: { vest: '#ffd27a', vestDark: '#c8a04a', strip: '#fff6c8', cap: '#8a6a2a', capDark: '#6a5020', logo: '#fff6c8' } },
  dawn: { name: '퇴근길 새벽빛', pal: { vest: '#f2b860', vestDark: '#c86a5a', strip: '#fff2d8', cap: '#1a2050', capDark: '#101438', logo: '#f2b860' } },
  shade: { name: '그림자', pal: PAL.shadow },
};
const Achieve = {
  d: null,
  load() { if (!this.d) { const v = Storage.get(ACH_KEY); this.d = v && typeof v === 'object' ? Object.assign({ got: {}, n: {} }, v) : { got: {}, n: {} }; } return this.d; },
  save() { Storage.set(ACH_KEY, this.d); },
  has(id) { return !!this.load().got[id]; },
  count(k) { return this.load().n[k] || 0; },
  // 누적 카운터 증가 → 관련 업적 확인
  add(k, v = 1) {
    const d = this.load();
    d.n[k] = (d.n[k] || 0) + v;
    for (const id in ACHIEVEMENTS) { const a = ACHIEVEMENTS[id]; if (a.counter === k && d.n[k] >= a.need) this.unlock(id); }
    this.dirty = true;
  },
  setMax(k, v) { const d = this.load(); if ((d.n[k] || 0) < v) { d.n[k] = v; for (const id in ACHIEVEMENTS) { const a = ACHIEVEMENTS[id]; if (a.counter === k && v >= a.need) this.unlock(id); } this.dirty = true; } },
  unlock(id) {
    const d = this.load();
    if (d.got[id] || !ACHIEVEMENTS[id]) return false;
    d.got[id] = Date.now();
    this.save();
    this.popups = (this.popups || []).concat([{ id, t: 240 }]);
    if (typeof Sound !== 'undefined') Sound.play('levelup');
    return true;
  },
  flush() { if (this.dirty) { this.dirty = false; this.save(); } },
  skin() { const k = this.load().skin; return k && SKINS[k] && this.skinOpen(k) ? k : 'default'; },
  skinOpen(k) { if (k === 'default') return true; return Object.keys(ACHIEVEMENTS).some((id) => ACHIEVEMENTS[id].skin === k && this.has(id)); },
  setSkin(k) { this.load().skin = k; this.save(); buildPlayerSprites(playerPalette()); },
  // 상태 기반 업적: 허브·결과·엔딩에서 한 번씩 훑는다
  check(s) {
    if (!s) return;
    if (s.money >= 1000000) this.unlock('rich');
    if (s.contamination >= 90) this.unlock('tainted');
    if (s.truths.length >= 15) this.unlock('truth15');
    if (chapterOf(s) >= 3 && s.contamination <= 0) this.unlock('pure');
    if ((s.weapons || []).length >= Object.keys(WEAPONS).length) this.unlock('arsenal');
    if (Object.values(s.weaponLv || {}).some((v) => v >= 5)) this.unlock('maxUp');
    if (s.cycle >= 2) this.unlock('ngplus');
    const c = codexCount(s);
    if (c >= Math.ceil(codexTotal() / 2)) this.unlock('codexHalf');
    if (c >= codexTotal()) this.unlock('codexAll');
    if (Object.values(codexOf(s).boss).filter((v) => v >= 1).length >= 10) this.unlock('boss10');
    const seen = endingsSeen().length;
    if (seen >= 1) this.unlock('end1');
    if (seen >= 4) this.unlock('end4');
    if (ENDING_ORDER.every((k) => endingsSeen().includes(k))) this.unlock('endAll');
    if (endingsSeen().includes('true')) this.unlock('trueEnd');
  },
  // 화면 위쪽 업적 알림
  drawPopups(ctx) {
    if (!this.popups || !this.popups.length) return;
    const P = this.popups[0];
    P.t--;
    const a = ACHIEVEMENTS[P.id];
    const k = clamp(P.t / 20, 0, 1) * clamp((240 - P.t) / 12, 0, 1);
    const label = '업적 달성 — ' + a.name + (a.skin ? '  (외형 해금)' : '');
    const w = Math.min(VW - 20, Gfx.measure(ctx, label, { small: true }) + 30);
    const x = Math.round((VW - w) / 2), y = Math.round(lerp(-20, 6, k));
    ctx.globalAlpha = k;
    UI.card(ctx, x, y, w, 17, { fill: 'rgba(20,16,8,0.95)', border: '#ffd27a' });
    ctx.fillStyle = '#ffd27a'; ctx.fillRect(x + 6, y + 6, 5, 5);
    Gfx.text(ctx, label, x + 16, y + 3, '#ffe8b0', { small: true });
    ctx.globalAlpha = 1;
    if (P.t <= 0) this.popups.shift();
  },
};

// ── 업적 화면 ──
function openAchievements() {
  const ids = Object.keys(ACHIEVEMENTS);
  const got = ids.filter((id) => Achieve.has(id)).length;
  Game.push(new Menu({
    title: '업적', titleRight: `${got}/${ids.length}`, w: 300, desc: true, maxVis: 8,
    items: ids.map((id) => {
      const a = ACHIEVEMENTS[id], has = Achieve.has(id);
      const prog = a.counter && !has ? `  (${Math.min(Achieve.count(a.counter), a.need)}/${a.need})` : '';
      return { label: (has ? '◆ ' : '◇ ') + a.name, col: has ? '#ffd27a' : null, right: a.skin ? (has ? '외형' : '외형?') : '', desc: a.desc + prog + (a.skin ? `  — 외형 「${SKINS[a.skin].name}」` : ''), onSelect: () => {} };
    }),
  }));
}
// ── 옷장 ──
function openWardrobe() {
  Game.push(new Menu({
    title: '옷장', w: 260, desc: true,
    refresh: () => Object.keys(SKINS).map((k) => {
      const open = Achieve.skinOpen(k), cur = Achieve.skin() === k;
      const ach = Object.keys(ACHIEVEMENTS).find((id) => ACHIEVEMENTS[id].skin === k);
      return { label: open ? SKINS[k].name : '???', right: cur ? '착용 중' : '', disabled: !open, desc: open ? (k === 'default' ? '청명관리 기본 지급 조끼.' : `업적 「${ACHIEVEMENTS[ach].name}」 기념.`) : `업적 「${ACHIEVEMENTS[ach].name}」 — ${ACHIEVEMENTS[ach].desc}`,
        onSelect: () => { Achieve.setSkin(k); Sound.play('select'); } };
    }),
  }));
}
