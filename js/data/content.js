'use strict';
// ───────────────────────── 게임 데이터: 테마 / 적 / 보스 / 아티팩트 / 아이템 ─────────────────────────

// 장소 테마 (표면/뒷면 팔레트)
const THEMES = {
  apartment: {
    name: '은하맨션 복도', short: '아파트', meme: 'm45', boss: 'door',
    front: { wall: '#4a5468', wall2: '#424a5c', trim: '#6a7488', floor: '#8a8478', floor2: '#6e695f', solid: '#3a3f4c', solid2: '#30343f', plat: '#9a948a', barrier: '#c8a040', sky: '#1a2238' },
    back: { wall: '#2a1018', wall2: '#22080f', trim: '#4a1a28', floor: '#5a2030', floor2: '#40141f', solid: '#1e0a10', solid2: '#16060b', plat: '#7a3040', barrier: '#ff3a5a', sky: '#0a0306' },
    decor: ['door', 'door', 'extinguisher', 'sign', 'window', 'mailbox', 'plant'],
    enemies: ['follower', 'noise', 'watcher', 'crawler'],
    artifacts: ['button45', 'nametag', 'glove', 'frame', 'key'],
  },
  store: {
    name: '새벽마트 매장', short: '편의점', meme: 'm3am', boss: 'receipt',
    front: { wall: '#d8dce4', wall2: '#c8ccd6', trim: '#3a8a5a', floor: '#e8e8ec', floor2: '#c8c8d0', solid: '#8a8e9a', solid2: '#7a7e8a', plat: '#b8bcc8', barrier: '#3a8a5a', sky: '#101820' },
    back: { wall: '#3a3020', wall2: '#2e2618', trim: '#6a2a1a', floor: '#5a4a30', floor2: '#463a24', solid: '#221a10', solid2: '#1a140c', plat: '#7a6040', barrier: '#ff8a2a', sky: '#0a0804' },
    decor: ['shelf', 'shelf', 'fridge', 'counter', 'poster', 'atm'],
    enemies: ['noise', 'flyer', 'crawler', 'follower'],
    artifacts: ['receipt', 'umbrella', 'tube', 'glove'],
  },
  subway: {
    name: '환승역 지하 3층', short: '지하철', meme: 'm0line', boss: 'speaker',
    front: { wall: '#7a8a8e', wall2: '#6a7a7e', trim: '#d8b030', floor: '#9a9a98', floor2: '#7a7a78', solid: '#4a5254', solid2: '#3e4547', plat: '#b0b0ae', barrier: '#d8b030', sky: '#141a1c' },
    back: { wall: '#102028', wall2: '#0a181e', trim: '#1a6a7a', floor: '#1a3a44', floor2: '#122a32', solid: '#061014', solid2: '#040a0d', plat: '#2a5a6a', barrier: '#3af0ff', sky: '#020608' },
    decor: ['pillar', 'bench', 'map', 'screen', 'sign', 'pillar'],
    enemies: ['watcher', 'noise', 'notif', 'follower'],
    artifacts: ['ticket', 'cassette', 'key', 'nametag'],
  },
  school: {
    name: '구 한별고 본관', short: '학교', meme: 'm13', boss: 'clock',
    front: { wall: '#c8b898', wall2: '#b8a888', trim: '#6a8a5a', floor: '#a8784a', floor2: '#8a6038', solid: '#5a5048', solid2: '#4a423a', plat: '#c8a070', barrier: '#6a8a5a', sky: '#202418' },
    back: { wall: '#28283a', wall2: '#1e1e2e', trim: '#5a2a6a', floor: '#3a2a4a', floor2: '#2a1e38', solid: '#100c18', solid2: '#0a0812', plat: '#5a3a7a', barrier: '#c46cff', sky: '#06040a' },
    decor: ['locker', 'locker', 'board', 'window', 'clock', 'trophy'],
    enemies: ['follower', 'crawler', 'flyer', 'watcher'],
    artifacts: ['nail13', 'mirror', 'erased', 'cassette'],
  },
  pcbang: {
    name: '24시 별빛PC방', short: 'PC방', meme: 'msmile', boss: 'monitor',
    front: { wall: '#2a2a3a', wall2: '#24243a', trim: '#5a7dff', floor: '#3a3a4e', floor2: '#2e2e40', solid: '#1a1a26', solid2: '#14141e', plat: '#4a4a62', barrier: '#5a7dff', sky: '#0a0a14' },
    back: { wall: '#2a2a10', wall2: '#22220a', trim: '#8a8a1a', floor: '#3a3a14', floor2: '#2a2a0c', solid: '#121206', solid2: '#0c0c04', plat: '#6a6a20', barrier: '#f2f23a', sky: '#060602' },
    decor: ['pc', 'pc', 'pc', 'poster', 'vending', 'sign'],
    enemies: ['notif', 'noise', 'flyer', 'follower'],
    artifacts: ['unread', 'thumb', 'shadowA', 'tube'],
  },
  hq: {
    name: '청명관리 본사', short: '본사', meme: 'mcheong', boss: 'suit',
    front: { wall: '#b8bcc4', wall2: '#a8acb4', trim: '#2b3d73', floor: '#6a6e7a', floor2: '#5a5e6a', solid: '#3a3e4a', solid2: '#30343e', plat: '#8a8e9a', barrier: '#2b3d73', sky: '#101420' },
    back: { wall: '#3a0a10', wall2: '#2e060b', trim: '#b8202e', floor: '#5a1018', floor2: '#460a12', solid: '#14040a', solid2: '#0e0206', plat: '#8a1a28', barrier: '#ff2a3a', sky: '#050102' },
    decor: ['cubicle', 'cubicle', 'cooler', 'plant', 'board', 'cctv'],
    enemies: ['watcher', 'follower', 'flyer', 'notif', 'noise'],
    artifacts: ['frame', 'erased', 'mirror', 'key'],
  },
};
const REGULAR_THEMES = ['apartment', 'store', 'subway', 'school', 'pcbang'];

// 밈적 존재 (괴담)
const MEMES = {
  m45: { name: '4.5층', desc: '엘리베이터에 없는 버튼을 누르면, 4층과 5층 사이의 복도에 도착한다는 이야기.' },
  m3am: { name: '새벽 3시의 손님', desc: '새벽 3시에 들어오는 손님에게 영수증을 주면 안 된다. 그 손님은 영수증을 받아 간 사람의 하루를 계산한다.' },
  m0line: { name: '0호선', desc: '막차를 놓친 사람에게만 들리는 안내방송. "0호선 열차가 들어오고 있습니다."' },
  m13: { name: '13번째 계단', desc: '야자 시간에 본관 계단을 세면 12개가 아니라 13개다. 13번째 계단을 밟은 학생은 출석부에서 지워진다.' },
  msmile: { name: '웃는 썸네일', desc: '끝까지 보면 안 되는 영상. 썸네일 속 얼굴은 볼 때마다 조금씩 더 웃고 있다.' },
  mtteum: { name: '틈새 공고', desc: '정말 급한 사람에게만 보이는 구인 공고. 지원 버튼은 누를 수 있지만, 취소 버튼은 없다.' },
  mcheong: { name: '청명(淸明)', desc: '"누군가 이상한 것들을 치우고 있으니 괜찮다." 모두가 그렇게 믿는다.' },
};

// 적 정의
const ENEMIES = {
  noise: { name: '잡음', hp: 14, dmg: 8, san: 3, spd: 0.55, ai: 'float', w: 12, h: 12, layer: 'back', sprite: 'noise', score: 1 },
  follower: { name: '따라쟁이', hp: 22, dmg: 10, san: 2, spd: 1.05, ai: 'walker', w: 10, h: 22, layer: 'back', sprite: 'follower', score: 2 },
  flyer: { name: '눈알 전단지', hp: 12, dmg: 7, san: 4, spd: 0, ai: 'turret', w: 12, h: 14, layer: 'back', sprite: 'flyer', score: 1 },
  notif: { name: '읽지 않은 알림', hp: 6, dmg: 6, san: 2, spd: 1.5, ai: 'swarm', w: 10, h: 10, layer: 'back', sprite: 'notif', score: 1, jam: 0.3 },
  watcher: { name: '등 뒤의 사람', hp: 34, dmg: 16, san: 8, spd: 2.4, ai: 'watcher', w: 10, h: 32, layer: 'back', sprite: 'watcher', score: 3 },
  crawler: { name: '기어다니는 손', hp: 10, dmg: 8, san: 1, spd: 1.6, ai: 'hopper', w: 12, h: 8, layer: 'back', sprite: 'crawler', score: 1 },
  echo: { name: '잔향', hp: 12, dmg: 6, san: 4, spd: 0.5, ai: 'drift', w: 10, h: 22, layer: 'front', sprite: 'echo', score: 1 },
};

// 보스 정의 (메인 패턴, 소환물)
const BOSSES = {
  door: { name: '4.5층의 주민', hp: 170, w: 28, h: 40, patterns: ['dash', 'slam', 'summon'], minion: 'follower', color: '#f2d040', title: '말소 대상 · 4.5층', eff: 'fear' },
  receipt: { name: '새벽 3시의 손님', hp: 190, w: 22, h: 44, patterns: ['spread', 'teleport', 'beam'], minion: 'crawler', color: '#ff2a3a', title: '말소 대상 · 새벽 3시의 손님', eff: 'erosion' },
  speaker: { name: '0호선 안내원', hp: 210, w: 22, h: 44, patterns: ['ring', 'sweep', 'spread', 'hack'], minion: 'notif', color: '#3af0ff', title: '말소 대상 · 0호선', eff: 'slow' },
  clock: { name: '자율학습 감독', hp: 210, w: 22, h: 44, patterns: ['rain', 'dash', 'ring'], minion: 'crawler', color: '#c46cff', title: '말소 대상 · 13번째 계단', eff: 'slow' },
  monitor: { name: '웃는 썸네일', hp: 200, w: 36, h: 32, patterns: ['beam', 'summon', 'rain', 'hack'], minion: 'notif', color: '#f2f23a', title: '말소 대상 · 웃는 썸네일', flying: true, eff: 'erosion' },
  flyer: { name: '틈새 공고', hp: 300, w: 22, h: 46, patterns: ['spread', 'summon', 'teleport', 'rain', 'hack'], minion: 'follower', color: '#f2c230', title: '말소 대상 · 틈새 공고 (구 민재)', eff: 'erosion' },
  suit: { name: '청명(淸明)', hp: 480, w: 30, h: 60, patterns: ['beam', 'ring', 'summon', 'slam', 'sweep', 'rain', 'hack'], minion: 'watcher', color: '#ff2a3a', title: '최종 결재 · 청명', eff: 'terror' },
};

// 아티팩트: rarity 0=흔함 1=희귀 2=이상
const ARTIFACTS = {
  receipt: { name: '끝나지 않는 영수증', icon: 'receipt', rarity: 0, from: 'm3am', eff: { luk: 1 }, desc: '아무리 당겨도 끝이 나오지 않는다. 맨 아래 합계란에 오늘 날짜가 찍혀 있다.' },
  button45: { name: '4.5층 버튼', icon: 'button', rarity: 1, from: 'm45', eff: { agi: 1 }, ability: 'quickflip', desc: '엘리베이터에서 뜯겨 나온 버튼. 누르면 아주 잠깐, 층과 층 사이가 보인다.' },
  unread: { name: '사라지지 않는 "1"', icon: 'unread', rarity: 0, from: 'msmile', eff: { per: 1 }, desc: '누군가 아직 읽지 않았다는 표시. 그 누군가가 누구인지는 아무도 모른다.' },
  thumb: { name: '웃는 썸네일 조각', icon: 'thumb', rarity: 0, from: 'msmile', eff: { str: 1 }, desc: '모니터 액정 조각. 볼 때마다 입꼬리가 1픽셀씩 올라간다.' },
  nail13: { name: '13번째 계단의 못', icon: 'nail', rarity: 1, from: 'm13', eff: {}, ability: 'doubleJump', desc: '존재하지 않는 계단을 고정하던 못. 쥐고 있으면 허공에도 발판이 있는 것 같다.' },
  ticket: { name: '0호선 승차권', icon: 'ticket', rarity: 1, from: 'm0line', eff: {}, ability: 'dash', desc: '행선지가 인쇄되지 않은 승차권. 개찰구를 통과하면 몸이 한 칸 앞서 도착한다.' },
  nametag: { name: '누군가의 명찰', icon: 'nametag', rarity: 0, from: 'm45', eff: { vit: 1 }, desc: '이름 칸이 비어 있다. 손에 쥐면 내 이름을 적고 싶어진다.' },
  umbrella: { name: '마르지 않는 우산', icon: 'umbrella', rarity: 0, from: 'm3am', eff: { mnd: 1 }, desc: '비가 오지 않는 날에도 물이 떨어진다. 이상하게 마음이 차분해진다.' },
  mirror: { name: '깨지지 않는 거울 조각', icon: 'mirror', rarity: 1, from: 'm13', eff: { per: 1 }, ability: 'backSight', desc: '거울 속 나는 항상 반 박자 늦게 움직인다. 표면에서도 뒷면이 비친다.' },
  tube: { name: '꺼지지 않는 형광등', icon: 'tube', rarity: 0, from: 'm3am', eff: { per: 1 }, light: 20, desc: '전원이 없어도 켜져 있다. 뒷면에서 시야가 넓어진다.' },
  shadowA: { name: '따라쟁이의 그림자', icon: 'shadow', rarity: 1, from: 'msmile', eff: { str: 1, agi: 1 }, desc: '바닥에 놓으면 내 발밑으로 기어 온다. 내 움직임을 미리 알고 있다.' },
  key: { name: '누구의 것도 아닌 열쇠', icon: 'key', rarity: 1, from: 'm0line', eff: { luk: 2 }, desc: '어느 문에도 맞지 않는다. 대신, 맞지 않는 문이 가끔 열린다.' },
  cassette: { name: '웃음소리 카세트', icon: 'cassette', rarity: 0, from: 'm0line', eff: { mnd: 1 }, desc: '녹음된 것은 웃음소리뿐이다. 듣다 보면 따라 웃고 있다.' },
  glove: { name: '체온이 남은 장갑', icon: 'glove', rarity: 0, from: 'm45', eff: { vit: 1 }, desc: '방금 누가 벗어 놓은 것처럼 따뜻하다. 계속 따뜻하다.' },
  frame: { name: '빈 액자', icon: 'frame', rarity: 2, from: 'm45', eff: { vit: 1, mnd: 1, str: 1, agi: 1, per: 1, luk: 1 }, desc: '안에 들어 있던 사진이 사라졌다. 액자는 새 얼굴을 기다린다.' },
  erased: { name: '지워진 이름표', icon: 'erased', rarity: 2, from: 'm13', eff: { mnd: 2, per: 1 }, ability: 'sanLeech', desc: '출석부에서 찢겨 나온 이름. 지워진 자리에서 아직 누가 대답한다.' },
  mincard: { name: '민재의 명찰', icon: 'mincard', rarity: 2, from: 'mtteum', eff: { str: 2, vit: 1 }, story: true, desc: '"박민재 / 청명관리 현장지원". 뒷면에 볼펜으로 적혀 있다: "다 먹이지 마."' },
  idcard: { name: '청명 사원증', icon: 'idcard', rarity: 2, from: 'mcheong', eff: {}, story: true, desc: '사진 칸에 아무 얼굴도 없다. 누구든 될 수 있다.' },
};
const RARITY = [
  { name: '흔함', col: '#c8c4d8', submit: 30000, trust: 3, sus: 8, cont: 6 },
  { name: '희귀', col: '#62d6e8', submit: 70000, trust: 6, sus: 15, cont: 10 },
  { name: '이상', col: '#ff5a8a', submit: 150000, trust: 12, sus: 25, cont: 18 },
];
const ABILITIES = {
  doubleJump: { name: '이단 점프', desc: '공중에서 한 번 더 점프할 수 있다.' },
  dash: { name: '대시', desc: 'Shift 또는 방향키 두 번으로 순간 이동하듯 돌진한다.' },
  backSight: { name: '이면 시야', desc: '표면에서도 뒷면의 존재가 희미하게 보인다.' },
  quickflip: { name: '빠른 전환', desc: '뒤집기 대기 시간이 줄어든다.' },
  sanLeech: { name: '대답', desc: '뒷면의 존재를 쓰러뜨리면 정신력을 회복한다.' },
};

// 소모품 (편의점)
const ITEMS = {
  drink: { name: '에너지드링크', icon: 'drink', price: 6000, desc: '체력 +35. 카페인으로 버틴다.', hp: 35 },
  candy: { name: '박하사탕', icon: 'candy', price: 5000, desc: '정신력 +30, 공포 -10. 화한 맛이 머리를 맑게 한다.', san: 30, fear: 10 },
  coffee: { name: '따뜻한 캔커피', icon: 'coffee', price: 7000, desc: '희망 25초, 공포 -35. 손이 따뜻해지면 마음도 조금 놓인다.', hope: 25, fear: 35 },
  gimbap: { name: '삼각김밥', icon: 'gimbap', price: 3500, desc: '체력 +15, 정신력 +15. 참치마요.', hp: 15, san: 15 },
  salt: { name: '굵은 소금', icon: 'salt', price: 8000, desc: '던져서 뒷면의 존재에게 큰 피해(30).', throw: 30 },
  charm: { name: '부적 스티커', icon: 'charm', price: 12000, desc: '다음 피해 1회를 막는다. 효과는 진짜다.', shield: 1 },
  foil: { name: '전파 차단 호일', icon: 'foil', price: 6000, desc: '휴대폰을 호일로 감싼다. 30초 동안 통신 교란을 막는다.', jamImmune: 30 },
};
const ITEM_MAX = 6;

// 비품 (청명관리)
const WEAPONS = {
  mop: { name: '대걸레', dmg: 10, reach: 26, cd: 24, kind: 'mop', desc: '기본 지급품. 길고 느리다.', price: 0 },
  bat: { name: '알루미늄 배트', dmg: 15, reach: 20, cd: 20, kind: 'bat', desc: '짧지만 묵직하다.', price: 140000 },
  spray: { name: '정화 스프레이', dmg: 7, reach: 0, cd: 14, kind: 'spray', ranged: true, desc: '원거리. 뿌린 곳이 잠시 정화된다.', price: 200000 },
  baton: { name: '전기 충격봉', dmg: 18, reach: 22, cd: 22, kind: 'baton', stun: 40, desc: '맞은 존재를 잠시 경직시킨다.', price: 320000, rank: 2 },
};
const GEAR = {
  vest2: { name: '형광 안전조끼 Pro', desc: '최대 체력 +20.', price: 110000, maxHp: 20 },
  earmuff: { name: '노이즈캔슬링 이어폰', desc: '뒷면 정신력 소모 -35%.', price: 170000, drain: 0.35 },
  lamp: { name: '고휘도 헤드랜턴', desc: '뒷면 시야 +28.', price: 90000, light: 28 },
  boots: { name: '미끄럼방지 안전화', desc: '이동 속도 증가.', price: 130000, speed: 0.25 },
  amulet: { name: '사내 정화 부적', desc: '최대 정신력 +20.', price: 150000, maxSan: 20, rank: 2 },
  shieldcase: { name: '차폐 폰케이스', desc: '통신 교란의 세기를 절반으로 줄인다.', price: 120000, jamRes: 0.5 },
};

const RANKS = [
  { name: '수습 알바', need: 0 },
  { name: '알바', need: 30 },
  { name: '숙련 알바', need: 85 },
  { name: '현장 조장', need: 160 },
  { name: '특별 계약자', need: 260 },
];

const OBJECTIVES = {
  resolve: { name: '원인해소', desc: '흩어진 단서를 모아 괴담의 원인을 찾아 해소한다.', col: '#62d6e8' },
  erase: { name: '말소', desc: '괴담의 핵이 된 존재를 찾아 말소한다.', col: '#ff5a6a' },
  stabilize: { name: '안정화', desc: '현장의 균열 3곳에 안정화 앵커를 설치한다.', col: '#6fd08c' },
  deep: { name: '심층 탐사', desc: '뒷면 깊이 내려간다. 균열마다 계속할지 챙겨서 철수할지 고른다.', col: '#b86cff' },
  descend: { name: '하강', desc: '더 깊은 균열을 찾아 내려간다.', col: '#b86cff' },
};

const STAT_INFO = {
  vit: { name: '체력', desc: '최대 체력' },
  mnd: { name: '정신', desc: '최대 정신력 · 정신 저항' },
  str: { name: '근력', desc: '공격력' },
  agi: { name: '민첩', desc: '이동 · 공격 속도' },
  per: { name: '인지', desc: '뒷면 시야 · 소모 감소 · 치명타' },
  luk: { name: '행운', desc: '희귀 아티팩트 · 보수' },
};
const STAT_KEYS = ['vit', 'mnd', 'str', 'agi', 'per', 'luk'];

// 테마별 민원 문구 (알바 공고 제목)
const DEEP_TITLES = ['[심층 탐사] 뒷면 하층부 조사', '[심층 탐사] 끝이 보이지 않는 균열', '[심층 탐사] 괴담의 뿌리 추적', '[심층 탐사] 미확인 층 매핑'];
const JOB_TITLES = {
  apartment: ['엘리베이터에 없는 층 버튼이 생겼다는 민원', '복도 끝 현관문이 매일 하나씩 늘어남', '4층과 5층 사이에서 발소리가 들림', '관리실 CCTV에 같은 주민이 열두 명'],
  store: ['새벽 3시마다 계산대에 영수증이 쌓임', '냉장고 안쪽에서 누가 문을 두드림', '아무도 없는데 "어서오세요"가 계속 울림', '바코드가 찍히지 않는 손님 목격담'],
  subway: ['막차 이후 안내방송이 계속 나옴', '노선도에 없는 승강장 목격 신고', '환승 통로가 끝나지 않는다는 제보', '스크린도어 너머에서 손을 흔드는 사람'],
  school: ['폐교 본관 계단 개수가 맞지 않음', '야간 경비원이 출석 부르는 소리를 들음', '사물함이 안쪽에서 잠김', '교실 거울에 수업 중인 학생들이 비침'],
  pcbang: ['특정 썸네일을 본 손님들이 계속 웃음', '꺼진 모니터에서 알림음이 울림', '빈자리에서 키보드 소리가 남', '"읽지 않음 1"이 사라지지 않는다는 제보'],
};

// 단서 / 원인 문구
const CLUE_TEXT = {
  apartment: ['엘리베이터 패널에 매직으로 그린 "4.5" 버튼. 덧칠한 흔적이 수십 겹이다.', '주민 단톡방 캡처: "4.5층 가 본 사람? ㅋㅋ 진짜 있대"', '복도 벽의 낙서: "여기서부터 세지 마시오"', '관리비 고지서. 존재하지 않는 호수가 인쇄되어 있다.'],
  store: ['계산대 밑의 영수증 뭉치. 전부 03:00:00에 발행됐다.', '야간 근무 인수인계 노트: "3시 손님한텐 절대 영수증 주지 말 것"', 'SNS 게시물: "새벽 3시 편의점 괴담 진짜임?" 공유 2,431회', '포스기 화면에 찍힌 상품명: "당신의 오늘"'],
  subway: ['안내방송 녹음 파일. 노선 번호 자리만 지직거린다.', '노선도 스티커. 누군가 0호선을 손으로 그려 넣었다.', '커뮤니티 글: "막차 놓치면 0호선 탄다는 썰" 조회수 9만', '분실물 보관함 속 승차권 묶음. 전부 행선지가 비어 있다.'],
  school: ['계단 옆 낙서: "12, 13, 14..." 숫자가 점점 작아진다.', '졸업앨범 한 페이지. 얼굴 하나가 지워져 있다.', '괴담 게시판 인쇄물: "13번째 계단을 밟으면 출석부에서 지워진다"', '경비 일지: "학생 없음. 출석 대답 있음."'],
  pcbang: ['모니터에 띄워진 영상. 재생 시간이 무한대다.', '채팅 로그: "이거 끝까지 본 사람 있음?" "ㅋㅋㅋㅋㅋㅋ"', '공유 횟수가 계속 올라가는 게시물. 업로더 정보 없음.', '헤드셋 속에서 아직 누가 웃고 있다.'],
  hq: ['결재 서류 더미. 전부 같은 도장이 찍혀 있다.', '사내 게시판: "우리가 있어 모두가 안심합니다"', '서랍 속 아르바이트 명단. 이름 위에 줄이 그어져 있다.', '천장 스피커에서 박수 소리가 들린다.'],
};
const CAUSE_TEXT = {
  apartment: '복도 한가운데, 엘리베이터 패널만 덩그러니 서 있다. "4.5" 버튼에 수많은 손자국이 겹쳐 있다.',
  store: '계산대 위에 끝없이 이어진 영수증. 그 끝은 계산대 안쪽 어둠으로 빨려 들어간다.',
  subway: '선로 위에 놓인 낡은 스피커. 아무것도 연결되지 않았는데 안내방송이 흘러나온다.',
  school: '계단 맨 위, 존재하지 않는 13번째 칸. 그 위에 출석부 한 권이 펼쳐져 있다.',
  pcbang: '한 자리의 모니터만 켜져 있다. 화면 속 얼굴이 당신을 보고 웃는다.',
  hq: '거대한 결재함. 안에서 수많은 목소리가 "승인"이라고 속삭인다.',
};

// ───── 통신 교란: 휴대폰이 보여 주는 거짓말 ─────
const FAKE_TOASTS = [
  '[틈새] 공포 수치 정상 (0%)',
  '[청명] 이 구역은 안전합니다',
  '[시스템] 희망 버프가 적용되었습니다',
  '[서경] 지금은 표면으로 나오지 마세요',
  '[알림] 정신력 100% — 계속 진행하세요',
  '[알림] 목표 달성! 퇴근하셔도 됩니다',
  '[틈새] 뒷면 체류 수당 +₩30,000',
  '[민재] 하람아 이쪽이야 이쪽',
  '[알림] 읽지 않은 메시지 1',
];
const OBJ_LIES = ['임무 완료', '출구 없음', '돌아가', '단서 ■/■', '여기 있어', '뒤를 봐', '앵커 9/3'];
const FAKE_JOB_TITLES = ['[긴■] ■■ 상주 근무 — 경력 무■', '[구인] 뒷면 야간 상■ 직원', '[틈새] 당신만 볼 수 있는 공고', '[■■] 오늘 바로 출근 · 퇴근 없■'];
const FAKE_MESSAGES = [
  '하람 씨, 뒷면에 오래 있을수록 수당이 붙어요. 나오지 마세요.',
  '오늘 측정된 공포 수치는 정상이에요. 걱정하지 말고 계속 일하세요.',
  '아티팩트는 전부 흡수해도 괜찮아요. 회사 방침이 바뀌었어요.',
  '민재 씨가 하람 씨를 찾아요. 틈새에 새로 뜬 공고로 오래요.',
];
