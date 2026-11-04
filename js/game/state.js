'use strict';
// ───────────────────────── 영구 상태 / 파생 능력치 / 일과 ─────────────────────────
const SAVE_KEY = 'backside_parttimer_save_v1';
const ENDINGS_KEY = 'backside_parttimer_endings_v1';
const RENT = 250000;
const RENT_CYCLE = 7;

function newState() {
  return {
    v: 1,
    day: 1,
    timeOfDay: 'day',
    money: 60000,
    debt: 0,
    rentDue: 8,
    trust: 0,
    statPoints: 0,
    suspicion: 0,
    contamination: 0,
    stats: { vit: 2, mnd: 2, str: 1, agi: 1, per: 1, luk: 1 },
    abilities: {},
    weapon: 'mop',
    weapons: ['mop'],
    gear: [],
    items: { drink: 2, candy: 2 },
    itemSel: 0,
    stash: [],
    absorbed: [],
    submitted: 0,
    truths: [],
    messages: [],
    seenMsgIds: [],
    storyStage: 0,
    flags: {},
    jobs: [],
    workedToday: false,
    clinicUses: 0,
    record: { missions: 0, fails: 0, kills: 0 },
    lastRank: 0,
    pendingEvents: [],
    sp: 1,
    skills: ['core'],
  };
}

function rankIndex(s) {
  let r = 0;
  RANKS.forEach((rk, i) => { if (s.trust >= rk.need) r = i; });
  return r;
}

// 능력치 → 실제 수치
function derive(s) {
  const st = s.stats;
  const gear = (k) => s.gear.reduce((a, g) => a + (GEAR[g][k] || 0), 0);
  const absorbedLight = s.absorbed.reduce((a, id) => a + (ARTIFACTS[id].light || 0), 0);
  const contBonus = s.contamination >= 50 ? 1 : 0;
  const per = st.per + contBonus;
  const m = skillMods(s);
  return {
    maxHp: 60 + st.vit * 12 + gear('maxHp') + m.maxHp,
    maxSan: 60 + st.mnd * 12 + gear('maxSan') + m.maxSan,
    atkMul: 1 + 0.15 * (st.str - 1),
    speed: 1.8 + 0.08 * st.agi + gear('speed'),
    jumpV: 5.75 + 0.04 * st.agi,
    atkCdMul: Math.max(0.65, 1 - 0.035 * (st.agi - 1)),
    light: 74 + per * 10 + gear('light') + absorbedLight + m.light,
    drain: Math.max(0.55, 3.0 - 0.18 * per - 0.12 * st.mnd) * (1 - gear('drain')) * (1 - s.contamination * 0.003) * (1 - m.drain),
    crit: 0.04 * per + m.crit,
    critMul: 1.8 + m.critDmg,
    luk: st.luk,
    per,
    flipCd: Math.round((s.abilities.quickflip ? 26 : 46) * (1 - m.flipCd)),
    weapon: WEAPONS[s.weapon],
    ab: s.abilities,
    m,
  };
}

function addMoney(s, amount) {
  if (amount <= 0) { s.money += amount; return { got: amount, toDebt: 0 }; }
  let toDebt = 0;
  if (s.debt > 0) {
    toDebt = Math.min(s.debt, Math.round(amount * 0.5));
    s.debt -= toDebt;
  }
  s.money += amount - toDebt;
  return { got: amount - toDebt, toDebt };
}

function spendMoney(s, amount) {
  if (s.money >= amount) { s.money -= amount; return true; }
  return false;
}

function chargeMoney(s, amount) { // 강제 지출 (부족하면 빚)
  if (s.money >= amount) s.money -= amount;
  else { s.debt += amount - s.money; s.money = 0; }
}

// 신뢰 변화 + 승급 처리. 반환: 승급했다면 새 랭크 인덱스
function addTrust(s, n) {
  const before = rankIndex(s);
  s.trust = Math.max(0, s.trust + n);
  const after = rankIndex(s);
  if (after > s.lastRank) {
    s.statPoints += 2 * (after - s.lastRank);
    s.sp = (s.sp || 0) + (after - s.lastRank);
    s.lastRank = after;
    return after;
  }
  return before === after ? -1 : -1;
}

function addSuspicion(s, n) { s.suspicion = clamp(s.suspicion + n, 0, 100); }
function addContamination(s, n) { s.contamination = clamp(s.contamination + n, 0, 100); }

function addMessage(s, from, text) {
  s.messages.unshift({ from, text, day: s.day, read: false });
  if (s.messages.length > 40) s.messages.length = 40;
}

function checkMessages(s) {
  let n = 0;
  for (const m of DAILY_MESSAGES) {
    if (s.seenMsgIds.includes(m.id)) continue;
    let ok = false;
    try { ok = m.when(s); } catch (e) { ok = false; }
    if (ok) { s.seenMsgIds.push(m.id); addMessage(s, m.from, m.text); n++; }
  }
  return n;
}

function unreadCount(s) { return s.messages.filter((m) => !m.read).length; }

// 아티팩트 흡수
function absorbArtifact(s, id) {
  const a = ARTIFACTS[id];
  const got = [];
  for (const k in a.eff) { s.stats[k] += a.eff[k]; got.push(`${STAT_INFO[k].name} +${a.eff[k]}`); }
  if (a.ability && !s.abilities[a.ability]) { s.abilities[a.ability] = true; got.push(`능력 [${ABILITIES[a.ability].name}]`); }
  if (a.light) got.push(`뒷면 시야 +${a.light}`);
  addContamination(s, Math.round(RARITY[a.rarity].cont * (1 - skillMods(s).contAbs)));
  s.absorbed.push(id);
  return got;
}

// ── 알바 공고 생성 ──
const BASE_PAY = [0, 90000, 130000, 180000, 240000, 310000];
function makeJob(s, rng, theme, obj, diff) {
  const t = THEMES[theme];
  const objMul = { resolve: 1, erase: 1.15, stabilize: 1.05 }[obj];
  const pay = Math.round(BASE_PAY[diff] * objMul * (1 + 0.03 * s.stats.luk) / 1000) * 1000;
  return {
    id: 'j' + Math.floor(rng.next() * 1e9),
    theme, obj, diff, pay,
    title: `[${OBJECTIVES[obj].name}] ` + rng.pick(JOB_TITLES[theme]),
    seed: Math.floor(rng.next() * 1e9),
    story: null,
  };
}

function storyJobFor(s) {
  const sm = STORY_MISSIONS[s.storyStage];
  if (!sm) return null;
  return {
    id: sm.id, theme: sm.theme, obj: sm.obj, diff: sm.diff, pay: sm.pay, title: sm.title,
    seed: 1000 + s.storyStage * 77, story: sm.id, locked: !sm.req(s), reqText: sm.reqText,
  };
}

function genJobs(s) {
  const rng = new RNG(s.day * 9973 + s.trust * 31 + 7);
  const r = rankIndex(s);
  const lo = Math.max(1, r), hi = Math.min(5, r + 2);
  const jobs = [];
  const themes = rng.shuffle(REGULAR_THEMES.slice());
  const objs = ['resolve', 'erase', 'stabilize'];
  for (let i = 0; i < 3; i++) {
    const obj = i < 3 ? rng.shuffle(objs.slice())[0] : 'resolve';
    jobs.push(makeJob(s, rng, themes[i], obj, rng.int(lo, hi)));
  }
  jobs.sort((a, b) => a.diff - b.diff);
  // 심층 탐사 (다단계 · 계속/철수 선택)
  if (s.storyStage >= 1) {
    const d = clamp(r + 1, 1, 5);
    const j = makeJob(s, rng, rng.pick(REGULAR_THEMES), 'resolve', d);
    j.obj = 'deep';
    j.finalObj = rng.pick(['resolve', 'erase', 'stabilize']);
    j.stages = d <= 2 ? 3 : d <= 4 ? 4 : 5;
    j.title = rng.pick(DEEP_TITLES);
    j.pay = Math.round(BASE_PAY[d] * 1.25 * (1 + 0.03 * s.stats.luk) / 1000) * 1000;
    jobs.push(j);
  }
  // 교란을 겪은 뒤에는 출처 불명 공고가 끼어든다
  if ((s.flags.jamSeen || s.contamination >= 35) && rng.chance(0.4)) {
    const j = makeJob(s, rng, rng.pick(REGULAR_THEMES), rng.pick(objs), clamp(r + 2, 2, 5));
    j.title = rng.pick(FAKE_JOB_TITLES);
    j.pay = Math.round(j.pay * 1.6 / 1000) * 1000;
    j.jammed = true;
    jobs.push(j);
  }
  return jobs;
}

function currentJobs(s) {
  const list = s.jobs.slice();
  const sj = storyJobFor(s);
  if (sj) list.unshift(sj);
  return list;
}

// ── 하루 넘기기 ──
function advanceDay(s) {
  const ev = [];
  s.day++;
  s.workedToday = false;
  s.timeOfDay = 'day';
  addSuspicion(s, -4);
  // 월세
  if (s.day >= s.rentDue) {
    const paid = Math.min(s.money, RENT);
    s.money -= paid;
    const short = RENT - paid;
    if (short > 0) s.debt += short;
    s.rentDue += RENT_CYCLE;
    ev.push({ type: 'rent', paid, short });
  }
  // 감사
  if (s.suspicion >= 40 && s.storyStage >= 1) {
    const chance = s.suspicion >= 90 ? 1 : (s.suspicion - 30) / 90;
    if (Math.random() < chance) {
      if (s.stash.length > 0) {
        const half = skillMods(s).auditHalf;
        const n = half ? Math.ceil(s.stash.length / 2) : s.stash.length;
        const lost = s.stash.splice(0, n);
        const fine = 40000 * n * (half ? 0.5 : 1);
        chargeMoney(s, fine);
        s.trust = Math.max(0, s.trust - 8);
        s.suspicion = 25;
        ev.push({ type: 'audit', caught: true, n, fine, lost });
      } else {
        s.suspicion = Math.max(0, s.suspicion - 30);
        s.trust += 2;
        ev.push({ type: 'audit', caught: false });
      }
    }
  }
  if (s.phoneGlitch) { s.phoneGlitch = false; ev.push({ type: 'reboot' }); }
  s.jobs = genJobs(s);
  checkMessages(s);
  return ev;
}

function saveGame(s) { return Storage.set(SAVE_KEY, s); }
function loadGame() {
  const d = Storage.get(SAVE_KEY);
  if (!d || d.v !== 1) return null;
  const base = newState();
  return Object.assign(base, d);
}
function hasSave() { return !!Storage.get(SAVE_KEY); }
function recordEnding(key) {
  const list = Storage.get(ENDINGS_KEY) || [];
  if (!list.includes(key)) list.push(key);
  Storage.set(ENDINGS_KEY, list);
}
function endingsSeen() { return Storage.get(ENDINGS_KEY) || []; }
