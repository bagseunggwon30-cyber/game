'use strict';
// ───────────────────────── 노드식 스킬트리 "마음 지도" / 상태 효과 정의 ─────────────────────────

// 다섯 갈래의 마음. 노드 모양이 갈래마다 다르다.
const SKILL_BRANCHES = [
  { id: 'fear', name: '공포', shape: 'star', col: '#ff4a5a', dark: '#5a1420', desc: '두려움을 무기로 삼는다. 공포가 높을수록, 뒷면에 있을수록 강해진다.' },
  { id: 'rage', name: '분노', shape: 'flame', col: '#ff9a3a', dark: '#5a2e10', desc: '몰아치는 공격. 처치와 피격이 분노가 되어 쌓인다.' },
  { id: 'oblivion', name: '망각', shape: 'hex', col: '#a99cff', dark: '#2e2850', desc: '흘려보내는 마음. 정신력·공포·디버프에 대한 저항.' },
  { id: 'doubt', name: '의심', shape: 'eye', col: '#62d6e8', dark: '#123a44', desc: '꿰뚫어 보는 눈. 치명타, 정보 수집, 은닉 기술.' },
  { id: 'hope', name: '희망', shape: 'sun', col: '#f2d040', dark: '#4a3e10', desc: '끝까지 버티는 힘. 회복과 "희망" 버프 강화.' },
];
const BRANCH_BY_ID = Object.fromEntries(SKILL_BRANCHES.map((b) => [b.id, b]));

// 갈래별 노드 7개: [이름, 비용, 효과, 설명]
const SKILL_DEFS = {
  fear: [
    ['오싹함', 1, { dmgBack: 0.12 }, '뒷면에서 공격력 +12%.'],
    ['식은땀', 1, { frightSpeed: true }, '"겁먹음" 상태의 이동 속도 감소가 오히려 +5% 증가로 바뀐다.'],
    ['어둠 적응', 1, { light: 22 }, '뒷면 시야 +22.'],
    ['공포 증폭', 2, { fearDmg: 0.03 }, '공포 10마다 공격력 +3%. (공포 100이면 +30%)'],
    ['비명', 2, { scream: true }, '패닉이 시작되는 순간 비명을 질러 주변 존재에게 30 피해 + 밀쳐내기.'],
    ['두려움의 맛', 2, { fearLeech: true }, '공포 50 이상일 때 존재를 쓰러뜨리면 정신력 +5.'],
    ['광란', 3, { frenzy: true }, '[핵심] 패닉 중 조작이 흔들리지 않고, 공격력 +50%, 받는 피해 -25%.'],
  ],
  rage: [
    ['주먹 쥐기', 1, { dmg: 0.1 }, '공격력 +10%.'],
    ['연타', 1, { atkSpd: 0.1 }, '공격 속도 +10%.'],
    ['근성', 1, { maxHp: 10, maxSan: 12 }, '최대 체력 +10, 최대 정신력 +12.'],
    ['격앙', 2, { rageOnKill: true }, '존재를 쓰러뜨리면 "분노" 1중첩. (5초, 중첩당 공격력 +8%, 최대 5)'],
    ['앙갚음', 2, { rageOnHit: true }, '피격 시 공포 증가가 절반이 되고, 대신 "분노" 1중첩.'],
    ['박살', 2, { bossDmg: 0.15, knock: 0.5 }, '핵(보스)에게 피해 +15%, 밀쳐내기 +50%.'],
    ['폭주', 3, { rageWave: true }, '[핵심] 분노 3중첩 이상이면 휘두를 때마다 충격파가 날아간다.'],
  ],
  oblivion: [
    ['무덤덤', 1, { fearGain: 0.2 }, '공포 증가 -20%.'],
    ['흘려듣기', 1, { drain: 0.15 }, '뒷면 정신력 소모 -15%.'],
    ['익숙함', 1, { flipCd: 0.2, flipFree: true }, '뒤집기 대기 시간 -20%, 뒤집을 때 정신력을 쓰지 않는다.'],
    ['빠른 망각', 2, { frontRecover: true }, '표면에서 공포가 2배 빨리 가라앉고 정신력 회복 +50%.'],
    ['면역', 2, { debuffDur: 0.5 }, '침식·둔화 지속 시간 -50%.'],
    ['정화된 기억', 2, { contAbs: 0.3 }, '아티팩트를 흡수할 때 오염도 증가 -30%.'],
    ['백지', 3, { blank: true }, '[핵심] 패닉에 빠지지 않는다. 공포가 100에 닿으면 0으로 비워지고 희망 8초.'],
  ],
  doubt: [
    ['눈치', 1, { crit: 0.06 }, '치명타 확률 +6%.'],
    ['시치미', 1, { sus: 0.3 }, '아티팩트를 은닉할 때 의심도 증가 -30%.'],
    ['뒷조사', 1, { docChance: 0.2 }, '현장에 진실 문서가 놓여 있을 확률 +20%.'],
    ['빈틈', 2, { critDmg: 0.5 }, '치명타 피해 +50%.'],
    ['간파', 2, { sight: true, jamSight: true }, '뒷면 존재가 표면에서도 희미하게 보이고 적 체력이 항상 보인다. 교란 중에도 진짜 수치가 주기적으로 비친다.'],
    ['감사 대비', 2, { auditHalf: true }, '감사에 걸려도 은닉품의 절반만 압수되고 벌금도 절반.'],
    ['진실의 눈', 3, { extraArt: 1, bossDmg: 0.2 }, '[핵심] 현장마다 아티팩트 +1개, 핵(보스)에게 피해 +20%.'],
  ],
  hope: [
    ['작은 위안', 1, { maxHp: 15 }, '최대 체력 +15.'],
    ['버팀목', 1, { hopeDur: 0.5 }, '얻는 "희망" 지속 시간 +50%.'],
    ['따뜻한 손', 1, { healMul: 0.3 }, '회복 소모품 효과 +30%.'],
    ['응원', 2, { startHope: 20 }, '현장에 도착하면 희망 20초.'],
    ['등불', 2, { hopeHeal: true }, '희망 중 체력이 초당 1씩 회복된다.'],
    ['포기하지 않아', 2, { hopeNoFear: true }, '희망 중에는 공포가 전혀 쌓이지 않는다.'],
    ['마지막 희망', 3, { lastHope: true }, '[핵심] 현장마다 1회, 쓰러질 상황에서 버텨 내고 희망 15초 + 잠깐 무적.'],
  ],
};

// 이웃한 두 갈래를 잇는 혼합 노드
const HYBRID_DEFS = [
  ['fear', 'rage', '광포', 2, { berserkSpd: true }, '공포 50 이상일 때 공격 속도 +15%.'],
  ['rage', 'oblivion', '무아지경', 2, { trance: true }, '분노 1중첩마다 공포 증가 -12%.'],
  ['oblivion', 'doubt', '냉정', 2, { coldMind: true }, '"겁먹음"으로 인한 정신력 소모 증가를 무시한다.'],
  ['doubt', 'hope', '확신', 2, { conviction: true }, '희망 중 치명타 확률 +12%.'],
  ['hope', 'fear', '용기', 2, { courage: true }, '패닉이 끝나면 희망 12초.'],
];

// 노드 그래프 생성 (극좌표 → 좌표)
const SKILL_NODES = (() => {
  const nodes = [{ id: 'core', name: '하람', branch: null, cost: 0, eff: {}, desc: '마음 지도의 중심. 여기서부터 다섯 갈래로 뻗어 나간다.', x: 0, y: 0, req: [], kind: 'core' }];
  const P = (r, deg) => ({ x: Math.round(Math.cos(deg * Math.PI / 180) * r), y: Math.round(Math.sin(deg * Math.PI / 180) * r) });
  const layout = [[36, 0, ['core']], [66, -16, [1]], [66, 16, [1]], [96, -16, [2]], [96, 16, [3]], [124, 0, [4, 5]], [156, 0, [6]]];
  SKILL_BRANCHES.forEach((b, i) => {
    const base = -90 + i * 72;
    SKILL_DEFS[b.id].forEach(([name, cost, eff, desc], k) => {
      const [r, off, req] = layout[k];
      const pos = P(r, base + off);
      nodes.push({
        id: `${b.id}${k + 1}`, name, branch: b.id, cost, eff, desc, x: pos.x, y: pos.y,
        req: req.map((q) => (q === 'core' ? 'core' : `${b.id}${q}`)), kind: k === 6 ? 'key' : 'node',
      });
    });
  });
  HYBRID_DEFS.forEach(([a, bb, name, cost, eff, desc]) => {
    const ia = SKILL_BRANCHES.findIndex((x) => x.id === a);
    const pos = P(104, -90 + ia * 72 + 36);
    nodes.push({ id: `mix_${a}_${bb}`, name, branch: a, branch2: bb, cost, eff, desc, x: pos.x, y: pos.y, req: [`${a}5`, `${bb}4`], kind: 'hybrid' });
  });
  return nodes;
})();
const SKILL_BY_ID = Object.fromEntries(SKILL_NODES.map((n) => [n.id, n]));

function skillAvailable(s, id) {
  const n = SKILL_BY_ID[id];
  if (!n || s.skills.includes(id)) return false;
  return n.req.some((r) => s.skills.includes(r));
}

// 해금한 노드들의 효과 합산 (숫자는 더하고, 플래그는 OR)
function skillMods(s) {
  const m = {
    dmg: 0, dmgBack: 0, fearDmg: 0, atkSpd: 0, crit: 0, critDmg: 0, bossDmg: 0, knock: 0,
    maxHp: 0, maxSan: 0, light: 0, drain: 0, fearGain: 0, flipCd: 0, debuffDur: 0, contAbs: 0,
    sus: 0, docChance: 0, extraArt: 0, hopeDur: 0, healMul: 0, startHope: 0,
  };
  for (const id of (s.skills || [])) {
    const n = SKILL_BY_ID[id];
    if (!n) continue;
    for (const k in n.eff) {
      const v = n.eff[k];
      if (typeof v === 'boolean') m[k] = m[k] || v;
      else m[k] = (m[k] || 0) + v;
    }
  }
  return m;
}

function skillSpent(s) { return (s.skills || []).reduce((a, id) => a + (SKILL_BY_ID[id] ? SKILL_BY_ID[id].cost : 0), 0); }

// ── 상태 효과 (버프 / 디버프) ──
const STATUS = {
  panic: { name: '패닉', col: '#ff3a5a', debuff: true, desc: '공포 100. 조작이 흔들리고 뒤집기 불가, 정신력 소모 2배.' },
  frightened: { name: '겁먹음', col: '#ff8a5a', debuff: true, desc: '공포 50 이상. 정신력 소모 +25%, 이동 속도 -10%.' },
  erosion: { name: '침식', col: '#c07cff', debuff: true, desc: '정신력이 중첩당 초당 2씩 깎인다.' },
  slow: { name: '둔화', col: '#7a9aff', debuff: true, desc: '이동 속도 -35%.' },
  halluc: { name: '환각', col: '#ff5a8a', debuff: true, desc: '정신력 30% 미만. 받는 피해 +25%.' },
  hope: { name: '희망', col: '#f2d040', desc: '공포 증가 절반, 정신력 초당 +1.5, 공격력 +10%.' },
  rage: { name: '분노', col: '#ff9a3a', desc: '중첩당 공격력 +8%.' },
  shield: { name: '부적', col: '#f2d040', desc: '다음 피해 1회 무효.' },
  focus: { name: '집중', col: '#9ae8ff', desc: '아슬아슬하게 피한 직후. 다음 공격(내려찍기 포함)이 반드시 치명타.' },
  jam: { name: '신호 불량', col: '#62d6e8', debuff: true, desc: '통신 교란. 휴대폰(HUD)의 수치와 알림을 믿을 수 없다.' },
};

// 시간제 상태 묶음
class StatusSet {
  constructor() { this.m = {}; }
  add(id, frames, stacks = 1, maxStacks = 1) {
    const cur = this.m[id];
    if (cur) {
      cur.t = Math.max(cur.t, frames);
      cur.max = Math.max(cur.t, cur.max);
      cur.n = Math.min(maxStacks, cur.n + stacks);
    } else this.m[id] = { t: frames, max: frames, n: Math.min(maxStacks, stacks) };
  }
  has(id) { return !!this.m[id]; }
  stacks(id) { return this.m[id] ? this.m[id].n : 0; }
  left(id) { return this.m[id] ? this.m[id].t : 0; }
  remove(id) { delete this.m[id]; }
  update() {
    const ended = [];
    for (const k in this.m) { if (--this.m[k].t <= 0) { delete this.m[k]; ended.push(k); } }
    return ended;
  }
}
