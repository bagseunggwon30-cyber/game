'use strict';
// ───────────────────────── 방 조각 레벨 생성기 + 도달 가능성 검사 ─────────────────────────
// 방 하나 = 24 x 14 타일. 모든 방은 같은 위치에 출입구를 가진다.
//   L: 왼쪽 벽(열 0, 행 10~12)   R: 오른쪽 벽(열 23, 행 10~12)
//   U: 천장(행 0, 열 10~13)       D: 바닥(행 13, 열 10~13)
// 연결되지 않은 출입구는 벽으로 막힌다.
// 기호: # 벽(공통) . 빈칸 = 발판(공통) F 표면 전용 벽 B 뒷면 전용 벽 f/b 레이어 전용 발판
//       % 가시(공통) ^ 가시(뒷면)  e 적 a 아티팩트 i 아이템/돈/문서 o 목표 지점
const RW = 24, RH = 14;

const ROOM_TEMPLATES = {
  start: [
    ['##########UUUU##########',
     '#......................#',
     '#.........uuuu.........#',
     '#......................#',
     '#.........====.........#',
     '#......................#',
     '#......................#',
     '#.........====.........#',
     '#......................#',
     '#......................#',
     'L.........====.........R',
     'L......................R',
     'L.......i..............R',
     '##########DDDD##########'],
  ],
  arena: [
    ['##########UUUU##########',
     '#......................#',
     '#......................#',
     '#......................#',
     '#......................#',
     '#......................#',
     '#......................#',
     '#.........====.........#',
     '#......................#',
     '#......................#',
     'L...====........====...R',
     'L......................R',
     'L......................R',
     '##########DDDD##########'],
  ],
  goal: [
    ['##########UUUU##########',
     '#......................#',
     '#.........uuuu.........#',
     '#......................#',
     '#.........====.........#',
     '#......................#',
     '#..===............===..#',
     '#.........====.........#',
     '#......................#',
     '#......................#',
     'L.........====.........R',
     'L......................R',
     'L....o.................R',
     '##########DDDD##########'],
  ],
  normal: [
    // 0 넓은 복도
    ['##########UUUU##########',
     '#......................#',
     '#.........uuuu.........#',
     '#......................#',
     '#.........====.........#',
     '#......................#',
     '#......................#',
     '#...a.....====.........#',
     '#..====................#',
     '#......................#',
     'L.........====.........R',
     'L......................R',
     'L..e....o.......i...e..R',
     '##########DDDD##########'],
    // 1 표면 벽 / 뒷면 벽 (두 번 뒤집기)
    ['##########UUUU##########',
     '#.....F...........B....#',
     '#.....F...uuuu....B....#',
     '#.....F...........B....#',
     '#.....F...====....B....#',
     '#.....F...........B....#',
     '#.....F...........B....#',
     '#.....F...====....B....#',
     '#.....F...........B....#',
     '#.....F...........B....#',
     'L.....F...====....B....R',
     'L.....F...........B....R',
     'L..i..F.e...o.....B..a.R',
     '##########DDDD##########'],
    // 2 가시밭 위 뒷면 다리
    ['##########UUUU##########',
     '#......................#',
     '#.........uuuu.........#',
     '#......................#',
     '#.........====.........#',
     '#......................#',
     '#......................#',
     '#.........====.........#',
     '#...a..................#',
     '#..bbb.................#',
     'L.........====.........R',
     'L.BBBBBBB......BBBBBBB.R',
     'L.%%%%%%%.e..o.%%%%%%%.R',
     '##########DDDD##########'],
    // 3 기둥과 높은 선반
    ['##########UUUU##########',
     '#......................#',
     '#.........uuuu.........#',
     '#......................#',
     '#.........====.........#',
     '#......................#',
     '#......................#',
     '#.........====.........#',
     '#..===...........===...#',
     '#......................#',
     'L.........====...a.....R',
     'L....##..........##....R',
     'L..e.##...o......##.e..R',
     '##########DDDD##########'],
    // 4 이층 구조 (위 복도 / 아래 복도)
    ['##########UUUU##########',
     '#......................#',
     '#.........uuuu.........#',
     '#......................#',
     '#..a............e...i..#',
     '#.#######..==..#######.#',
     '#......................#',
     '#......................#',
     '#.........====.........#',
     '#......................#',
     'L.........====.........R',
     'L......................R',
     'L..e...o...........e...R',
     '##########DDDD##########'],
    // 5 이층 구조 — 바닥이 레이어마다 다름
    ['##########UUUU##########',
     '#......................#',
     '#.........uuuu.........#',
     '#......................#',
     '#...a..........i....e..#',
     '#.FFFFFFF..==..BBBBBBB.#',
     '#......................#',
     '#......................#',
     '#.........====.........#',
     '#......................#',
     'L.........====.........R',
     'L......................R',
     'L...e....o........e....R',
     '##########DDDD##########'],
    // 6 표면 벽 우리 속 아티팩트
    ['##########UUUU##########',
     '#......................#',
     '#.........uuuu.........#',
     '#......................#',
     '#.........====.........#',
     '#......................#',
     '#......................#',
     '#.........====.........#',
     '#......................#',
     '#..FFFFF...............#',
     'L..F...F..====.........R',
     'L..F...F...........e...R',
     'L..F.a.F...o.......i...R',
     '##########DDDD##########'],
    // 7 뒷면 가시 바닥 (표면은 안전)
    ['##########UUUU##########',
     '#......................#',
     '#.........uuuu.........#',
     '#......................#',
     '#.........====.........#',
     '#......................#',
     '#......................#',
     '#.....a...====...a.....#',
     '#....bbb.........bbb...#',
     '#......................#',
     'L.........====.........R',
     'L......................R',
     'L.^^^^^^^.e..o.^^^^^^^.R',
     '##########DDDD##########'],
    // 8 낮은 장벽들 (넘거나 뒤집거나)
    ['##########UUUU##########',
     '#......................#',
     '#.........uuuu.........#',
     '#......................#',
     '#.........====.........#',
     '#......................#',
     '#......................#',
     '#.........====.........#',
     '#......................#',
     '#..i...................#',
     'L.##......====......a..R',
     'L.##..F...........B.##.R',
     'L.##..F...e...o...B.##.R',
     '##########DDDD##########'],
    // 9 계단식 단상
    ['##########UUUU##########',
     '#......................#',
     '#.........uuuu.........#',
     '#......................#',
     '#.........====.........#',
     '#......................#',
     '#..........a...........#',
     '#.........####.........#',
     '#........######........#',
     '#.......########.......#',
     'L......##########......R',
     'L.....############.....R',
     'L..e.##############..i.R',
     '##########DDDD##########'],
    // 10 넓은 전투실
    ['##########UUUU##########',
     '#......................#',
     '#.........uuuu.........#',
     '#......................#',
     '#.........====.........#',
     '#......................#',
     '#..===............===..#',
     '#.........====.........#',
     '#......................#',
     '#......................#',
     'L....====......====....R',
     'L......................R',
     'L..e..e....o.....e..e..R',
     '##########DDDD##########'],
    // 11 뒷면 전용 발판 사다리
    ['##########UUUU##########',
     '#......................#',
     '#.........uuuu.........#',
     '#......................#',
     '#.........bbbb..a......#',
     '#..............bbb.....#',
     '#......................#',
     '#.........bbbb.........#',
     '#......................#',
     '#......................#',
     'L.........====.........R',
     'L......................R',
     'L...i...e....o.....e...R',
     '##########DDDD##########'],
  ],
};

const NO_DOWN = [9];   // 가운데가 막혀 아래 방과 이어질 수 없는 템플릿

function parseTemplate(rows) {
  if (rows.length !== RH) throw new Error('room template height ' + rows.length);
  rows.forEach((r, i) => { if (r.length !== RW) throw new Error(`room template row ${i} width ${r.length}: ${r}`); });
  return rows;
}
for (const k in ROOM_TEMPLATES) ROOM_TEMPLATES[k] = ROOM_TEMPLATES[k].map(parseTemplate);

// ───── 도달 가능성 검사 (간단한 이동 모델: 걷기·낙하·점프·뒤집기) ─────
function reachSet(lvl, sx, sy, blocked) {
  const W = lvl.W, H = lvl.H;
  const g = (L, x, y) => (blocked && blocked.has(x + ',' + y)) ? T_SOLID : lvl.get(L ? 'back' : 'front', x, y);
  const free = (L, x, y) => { const t = g(L, x, y); return t !== T_SOLID && t !== T_SPIKE; };
  const body = (L, x, y) => free(L, x, y) && free(L, x, y - 1);
  const sup = (L, x, y) => { const t = g(L, x, y + 1); return t === T_SOLID || t === T_PLAT; };
  const fall = (L, x, y) => { for (let yy = y; yy < H; yy++) { if (!body(L, x, yy)) return -1; if (sup(L, x, yy)) return yy; } return -1; };
  const seen = new Uint8Array(W * H * 2);
  const q = [];
  const push = (x, y, L) => { if (x < 0 || x >= W || y < 1 || y >= H) return; const k = (L * H + y) * W + x; if (seen[k]) return; seen[k] = 1; q.push(x, y, L); };
  for (const L of [0, 1]) { const y = fall(L, sx, sy); if (y >= 0) push(sx, y, L); }
  for (let qi = 0; qi < q.length; qi += 3) {
    const x = q[qi], y = q[qi + 1], L = q[qi + 2];
    for (const s of [-1, 1]) {
      const nx = x + s;
      if (body(L, nx, y)) { const ny = fall(L, nx, y); if (ny >= 0) push(nx, ny, L); }
    }
    const o = 1 - L;
    if (body(o, x, y)) { const ny = fall(o, x, y); if (ny >= 0) push(x, ny, o); }
    if (g(L, x, y + 1) === T_PLAT) { const ny = fall(L, x, y + 1); if (ny >= 0) push(x, ny, L); }
    // 점프: 위로 h칸 오른 뒤 옆으로 이동, 이후 낙하
    for (let h = 1; h <= 3; h++) {
      if (!free(L, x, y - h - 1)) break;
      const maxDx = h === 3 ? 3 : 4;
      if (sup(L, x, y - h)) push(x, y - h, L);
      for (const s of [-1, 1]) {
        for (let dx = 1; dx <= maxDx; dx++) {
          const ax = x + s * dx, ay = y - h;
          if (!body(L, ax, ay)) break;
          const ny = fall(L, ax, ay);
          if (ny >= 0) push(ax, ny, L);
        }
      }
    }
  }
  return { seen, W, H };
}
function canReach(R, tx, ty, layer) {
  for (let y = ty - 1; y <= ty + 1; y++) for (let x = tx - 1; x <= tx + 1; x++) {
    if (x < 0 || x >= R.W || y < 0 || y >= R.H) continue;
    for (const L of [0, 1]) {
      if (layer === 'front' && L !== 0) continue;
      if (layer === 'back' && L !== 1) continue;
      if (R.seen[(L * R.H + y) * R.W + x]) return true;
    }
  }
  return false;
}

// ───── 맵 생성 ─────
function generateRoomMission(spec) {
  for (let attempt = 0; attempt < 12; attempt++) {
    const out = buildRoomMap(spec, (spec.seed || 1) + attempt * 7919);
    if (out) return out;
  }
  return null;
}

function buildRoomMap(spec, seed) {
  const fail = (why) => { if (typeof ROOMGEN_DEBUG !== 'undefined') ROOMGEN_DEBUG.push(why); return null; };
  const rng = new RNG(seed);
  const th = THEMES[spec.theme];
  const d = spec.diff;
  const deep = spec.deep || null;
  const cols = deep ? 4 + (d >= 3 ? 1 : 0) : [0, 5, 6, 6, 7, 8][d];
  const rows = deep ? (deep.stage >= 3 ? 3 : 2) : d >= 3 ? 3 : 2;
  const grid = [];
  for (let y = 0; y < rows; y++) grid.push(new Array(cols).fill(null));
  const mk = (gx, gy) => ({ gx, gy, conns: { L: false, R: false, U: false, D: false }, role: 'normal', marks: { e: [], a: [], i: [], o: [] } });
  const link = (a, b) => {
    if (b.gx === a.gx + 1) { a.conns.R = true; b.conns.L = true; }
    else if (b.gx === a.gx - 1) { a.conns.L = true; b.conns.R = true; }
    else if (b.gy === a.gy + 1) { a.conns.D = true; b.conns.U = true; }
    else { a.conns.U = true; b.conns.D = true; }
  };
  // 1) 주 경로: 왼쪽 → 오른쪽, 가끔 위아래로
  let gx = 0, gy = rng.int(0, rows - 1);
  const path = [];
  let cur = mk(gx, gy); grid[gy][gx] = cur; path.push(cur);
  while (gx < cols - 1) {
    let vert = 0;
    while (rows > 1 && vert < rows - 1 && rng.chance(0.38)) {
      const opts = [gy - 1, gy + 1].filter((y) => y >= 0 && y < rows && !grid[y][gx]);
      if (!opts.length) break;
      const ny = rng.pick(opts);
      const r = mk(gx, ny); grid[ny][gx] = r; link(cur, r); cur = r; gy = ny; path.push(r); vert++;
    }
    gx++;
    const r = mk(gx, gy); grid[gy][gx] = r; link(cur, r); cur = r; path.push(r);
  }
  // 2) 곁가지 (막다른 방)
  const deadEnds = [];
  for (let i = 1; i < path.length - 1; i++) {
    if (!rng.chance(0.45)) continue;
    let base = path[i];
    const len = rng.chance(0.4) ? 2 : 1;
    let made = null;
    for (let k = 0; k < len; k++) {
      const cands = [[base.gx, base.gy - 1], [base.gx, base.gy + 1], [base.gx + 1, base.gy], [base.gx - 1, base.gy]]
        .filter(([x, y]) => x >= 0 && x < cols && y >= 0 && y < rows && !grid[y][x]);
      if (!cands.length) break;
      const [x, y] = rng.pick(cands);
      const r = mk(x, y); r.role = 'branch'; r.root = i;
      grid[y][x] = r; link(base, r); base = r; made = r;
    }
    if (made) { made.role = 'dead'; deadEnds.push(made); }
  }
  const rooms = [];
  for (const row of grid) for (const r of row) if (r) rooms.push(r);
  path.forEach((r, i) => { r.pi = i; });
  const start = path[0], goal = path[path.length - 1];
  start.role = 'start'; goal.role = 'goal';

  // 3) 템플릿 배정
  const finalObj = spec.obj;
  const arenaGoal = finalObj === 'erase' || finalObj === 'finale';
  let lastT = -1;
  for (const r of rooms) {
    if (r === start) r.tpl = ROOM_TEMPLATES.start[0];
    else if (r === goal) r.tpl = arenaGoal ? ROOM_TEMPLATES.arena[0] : ROOM_TEMPLATES.goal[0];
    else {
      const pool = ROOM_TEMPLATES.normal;
      let t = rng.int(0, pool.length - 1);
      if (t === lastT) t = (t + 1) % pool.length;
      // 초반 방은 쉬운 것 위주
      if (r.pi != null && r.pi <= 1 && [2, 7, 9].includes(t)) t = 0;
      if (r.conns.D && NO_DOWN.includes(t)) t = (t + 1) % pool.length;
      lastT = t; r.tplIdx = t; r.tpl = pool[t];
    }
  }

  // 4) 타일 쓰기
  const W = cols * RW, H = rows * RH;
  const lvl = new Level(W, H);
  lvl.rowH = RH; lvl.trimOff = 9.2;
  for (let i = 0; i < W * H; i++) { lvl.f[i] = T_SOLID; lvl.b[i] = T_SOLID; }
  for (const r of rooms) {
    const ox = r.gx * RW, oy = r.gy * RH;
    r.ox = ox; r.oy = oy;
    for (let y = 0; y < RH; y++) for (let x = 0; x < RW; x++) {
      const ch = r.tpl[y][x];
      const X = ox + x, Y = oy + y;
      let f = T_EMPTY, b = T_EMPTY;
      switch (ch) {
        case '#': f = b = T_SOLID; break;
        case '=': f = b = T_PLAT; break;
        case 'F': f = T_SOLID; break;
        case 'B': b = T_SOLID; break;
        case 'f': f = T_PLAT; break;
        case 'b': b = T_PLAT; break;
        case '%': f = b = T_SPIKE; break;
        case '^': b = T_SPIKE; break;
        case 'L': case 'R': case 'U': if (!r.conns[ch]) f = b = T_SOLID; break;
        case 'D': f = b = r.conns.D ? T_PLAT : T_SOLID; break;   // 아래 방과 이어진 바닥 = 통과형 발판
        case 'u': if (r.conns.U) f = b = T_PLAT; break;
        case 'e': case 'a': case 'i': case 'o': r.marks[ch].push({ x: X, y: Y }); break;
        default: break;
      }
      lvl.f[Y * W + X] = f; lvl.b[Y * W + X] = b;
    }
  }

  const out = {
    lvl, enemies: [], pickups: [], interacts: [], decor: [], hints: [], ambush: [], start: null, arena: null, theme: spec.theme, jamZones: [],
    map: { cols, rows, rooms: rooms.map((r) => ({ gx: r.gx, gy: r.gy, conns: r.conns, role: r.role })) },
  };
  const wx = (t) => t * TS;
  const floorY = (r) => (r.oy + RH - 1) * TS;   // 방 바닥 윗면
  // 방 바닥에서 비어 있는 지점 찾기
  const floorSpot = (r, fromRight, layer, avoidCenter = true) => {
    for (let k = 2; k <= 21; k++) {
      const lx = fromRight ? RW - 1 - k : k;
      if (avoidCenter && lx >= 8 && lx <= 15) continue;
      const X = r.ox + lx, Yf = r.oy + RH - 1;
      let ok = true;
      for (const L of layer === 'both' ? ['front', 'back'] : [layer]) {
        if (lvl.get(L, X, Yf) !== T_SOLID) ok = false;
        for (let h = 1; h <= 3; h++) if (lvl.get(L, X, Yf - h) !== T_EMPTY) ok = false;
        if (lvl.get(L, X + 1, Yf - 1) !== T_EMPTY) ok = false;
      }
      if (ok) return { x: X, y: Yf - 1 };
    }
    return null;
  };
  const takeMark = (r, k) => (r.marks[k].length ? r.marks[k].splice(rng.int(0, r.marks[k].length - 1), 1)[0] : null);

  // 5) 입구 / 출구
  const sp = floorSpot(start, false, 'both', false) || { x: start.ox + 3, y: start.oy + RH - 2 };
  out.start = { x: wx(sp.x + 1), y: wx(sp.y + 1) - 22 };
  out.interacts.push({ type: 'entry', x: wx(sp.x) - 4, y: wx(sp.y + 1) - 32, w: 24, h: 32, layer: 'both' });
  const needExit = finalObj !== 'descend';
  let exitSpot = null;
  if (needExit) {
    exitSpot = floorSpot(goal, true, 'both', false);
    if (!exitSpot) return fail('exitSpot');
    out.interacts.push({ type: 'exit', x: wx(exitSpot.x) - 4, y: wx(exitSpot.y + 1) - 32, w: 24, h: 32, layer: 'both' });
  }
  const targets = [];   // 도달해야 하는 지점 [x, y, layer, 설명]
  const roomAt = (x, y) => grid[Math.floor(y / RH)] && grid[Math.floor(y / RH)][Math.floor(x / RW)];
  if (exitSpot) targets.push([exitSpot.x, exitSpot.y, 'both']);

  // 6) 목표 배치
  const middle = path.slice(1, -1);
  const spread = (n) => {
    const pool = deadEnds.concat(middle.filter((r) => !deadEnds.includes(r)));
    const picked = [];
    // 막다른 방 우선, 나머지는 경로에 고르게
    for (const r of deadEnds) if (picked.length < n && rng.chance(0.7)) picked.push(r);
    const rest = middle.filter((r) => !picked.includes(r));
    while (picked.length < n && rest.length) picked.push(rest.splice(Math.floor(rest.length * (picked.length + 0.5) / (n + 0.5)) % rest.length, 1)[0]);
    while (picked.length < n && pool.length) { const r = pool.shift(); if (!picked.includes(r)) picked.push(r); }
    return picked;
  };
  const objSpot = (r, layer) => {
    const m = takeMark(r, 'o');
    if (m && lvl.get(layer, m.x, m.y + 1) === T_SOLID && [0, 1, 2].every((h) => lvl.get(layer, m.x, m.y - h) === T_EMPTY)) return m;
    const side = rng.chance(0.5);
    return floorSpot(r, side, layer) || floorSpot(r, side, layer, false);
  };
  if (finalObj === 'resolve' || finalObj === 'stabilize') {
    const type = finalObj === 'resolve' ? 'clue' : 'rift';
    for (const r of spread(3)) {
      const s2 = objSpot(r, 'back');
      if (!s2) return fail('objSpot ' + type + ' tpl' + r.tplIdx);
      if (type === 'clue') out.interacts.push({ type, x: wx(s2.x), y: wx(s2.y + 1) - 20, w: 16, h: 20, layer: 'back', room: r });
      else out.interacts.push({ type, x: wx(s2.x) - 4, y: wx(s2.y + 1) - 40, w: 24, h: 40, layer: 'back', room: r });
      targets.push([s2.x, s2.y, 'back']);
    }
    if (finalObj === 'resolve') {
      const c = floorSpot(goal, false, 'back') || objSpot(goal, 'back');
      if (!c) return fail('causeSpot');
      out.interacts.push({ type: 'cause', x: wx(c.x) - 6, y: wx(c.y + 1) - 44, w: 28, h: 44, layer: 'back' });
      targets.push([c.x, c.y, 'back']);
    }
  } else if (finalObj === 'patrol') {
    // 야간 순찰 지점 (표면/뒷면 번갈아)
    const n = spec.patrol || 3;
    spread(n).forEach((r, i) => {
      const layer = i % 2 ? 'back' : 'front';
      const s2 = objSpot(r, layer) || floorSpot(r, false, 'both', false);
      if (!s2) return;
      out.interacts.push({ type: 'patrol', x: wx(s2.x), y: wx(s2.y + 1) - 24, w: 16, h: 24, layer });
      targets.push([s2.x, s2.y, layer]);
    });
    const ruleIds = (spec.rules || []).map((r) => r.id);
    // 빨간 문 (열면 안 되는 문)
    if (ruleIds.includes('noRedDoor')) {
      for (const r of rng.shuffle(middle.slice()).slice(0, 2)) {
        const c = floorSpot(r, rng.chance(0.5), 'both');
        if (c) out.interacts.push({ type: 'reddoor', x: wx(c.x) - 4, y: wx(c.y + 1) - 32, w: 24, h: 32, layer: 'both' });
      }
    }
    // 이전 근무자의 메모 (거짓 수칙을 알려 준다) — 막다른 방 우선
    if ((spec.rules || []).some((r) => r.fake)) {
      const r = deadEnds.length ? rng.pick(deadEnds) : rng.pick(middle.length ? middle : rooms);
      const m = takeMark(r, 'i') || floorSpot(r, rng.chance(0.5), 'front');
      if (m) { out.interacts.push({ type: 'rulenote', x: wx(m.x), y: wx(m.y + 1) - 14, w: 16, h: 14, layer: 'front' }); targets.push([m.x, m.y, 'front']); }
    }
    // 웃는 손님
    if (ruleIds.includes('noHitSmile')) {
      for (const r of rng.shuffle(middle.slice()).slice(0, 3 + Math.floor(d / 2))) {
        const layer = rng.chance(0.5) ? 'front' : 'back';
        const m = floorSpot(r, rng.chance(0.5), layer);
        if (m) out.enemies.push({ type: 'smiler', x: wx(m.x) + 2, y: wx(m.y + 1) - 22, layer });
      }
    }
  } else if (finalObj === 'descend') {
    const c = floorSpot(goal, true, 'back') || objSpot(goal, 'back');
    if (!c) return fail('descendSpot');
    out.interacts.push({ type: 'descend', x: wx(c.x) - 6, y: wx(c.y + 1) - 40, w: 28, h: 40, layer: 'back' });
    targets.push([c.x, c.y, 'back']);
  }
  if (arenaGoal) {
    const seal = [];
    for (let y = 0; y < RH; y++) for (let x = 0; x < RW; x++) if ('LRUD'.includes(goal.tpl[y][x]) && goal.conns[goal.tpl[y][x]]) seal.push([goal.ox + x, goal.oy + y]);
    out.arena = {
      tx0: goal.ox + 1, tx1: goal.ox + RW - 1, gy: goal.oy + RH - 1,
      x0: wx(goal.ox + 1), x1: wx(goal.ox + RW - 1), floorY: floorY(goal), ceilY: wx(goal.oy + 1),
      y0: wx(goal.oy), y1: wx(goal.oy + RH), boss: spec.boss || th.boss, finale: finalObj === 'finale', seal,
    };
    if (finalObj === 'finale') out.interacts.push({ type: 'core', x: wx(goal.ox + RW - 6), y: floorY(goal) - 48, w: 32, h: 48, layer: 'both' });
  }

  // 7) 임시 앵커 (체크포인트)
  if (middle.length >= 2) {
    const r = middle[Math.floor(middle.length / 2)];
    const c = floorSpot(r, false, 'both');
    if (c) out.interacts.push({ type: 'checkpoint', x: wx(c.x), y: wx(c.y + 1) - 24, w: 16, h: 24, layer: 'both' });
  }

  // 8) 열쇠와 봉인문
  let gateCells = null;
  const wantGate = (d >= 3 || (deep && deep.stage >= 2)) && deadEnds.length && rng.chance(0.6);
  if (wantGate) {
    const keyRoom = rng.pick(deadEnds);
    const root = keyRoom.root;
    const conns = [];
    for (let j = Math.max(root, 1); j < path.length - 1; j++) if (path[j + 1].gy === path[j].gy && path[j + 1].gx === path[j].gx + 1) conns.push(j);
    if (conns.length) {
      const j = rng.pick(conns);
      const A = path[j];
      const ks = takeMark(keyRoom, 'a') || floorSpot(keyRoom, rng.chance(0.5), 'both');
      if (ks) {
        out.pickups.push({ type: 'key', x: wx(ks.x) + 1, y: wx(ks.y + 1) - 18, layer: 'both' });
        gateCells = [];
        for (let y = 10; y <= 12; y++) { gateCells.push([A.ox + RW - 1, A.oy + y]); gateCells.push([A.ox + RW, A.oy + y]); }
        for (const [x, y] of gateCells) { lvl.set('both', x, y, T_SOLID); }
        out.interacts.push({ type: 'gate', x: wx(A.ox + RW - 3), y: wx(A.oy + 10), w: 48, h: 48, layer: 'both', cells: gateCells });
        out.keyAt = [ks.x, ks.y];
        out.gateRoom = A;
      }
    }
  }

  // 9) 적
  const pool = th.enemies.map((e) => [e, e === 'watcher' ? (d >= 2 ? 1.5 : 0) : e === 'flyer' || e === 'notif' ? 2 : 3]);
  if (spec.weekMod === 'notif') { const n = pool.find((q) => q[0] === 'notif'); if (n) n[1] = 6; else pool.push(['notif', 5]); }
  const spawnMul = (spec.weekMod === 'quiet' ? 0.7 : 1) * (finalObj === 'patrol' ? 0.5 : 1);
  const placeEnemy = (type, m, layer) => {
    const def = ENEMIES[type];
    const air = def.ai === 'float' || def.ai === 'swarm' || def.ai === 'turret';
    out.enemies.push({ type, x: wx(m.x) + 2, y: air ? wx(m.y - 3) : wx(m.y + 1) - def.h, layer: layer || def.layer });
  };
  const ambushRooms = middle.filter((r) => r.pi >= 2 && rng.chance(0.25 + 0.05 * d)).slice(0, 2);
  for (const r of rooms) {
    if (r === start || (arenaGoal && r === goal)) continue;
    const ambush = ambushRooms.includes(r);
    const list = [];
    for (const m of r.marks.e) {
      if (!rng.chance(ambush ? 1 : (0.4 + 0.08 * d) * spawnMul)) continue;
      const t = rng.weighted(pool);
      if (ambush) list.push({ type: t, tx: m.x, gy: m.y + 1 });
      else placeEnemy(t, m);
    }
    if (ambush && list.length) out.ambush.push({ x: wx(r.ox + 2), x1: wx(r.ox + RW - 2), y0: wx(r.oy), y1: wx(r.oy + RH), list, done: false });
    if (d >= 2 && rng.chance(0.1 + 0.03 * d)) { const m = floorSpot(r, rng.chance(0.5), 'front'); if (m) placeEnemy('echo', m, 'front'); }
  }

  // 10) 아티팩트 / 돈 / 아이템 / 문서
  const nArt = 2 + Math.floor(d / 2) + (rng.chance(0.05 * spec.luk) ? 1 : 0) + (spec.extraArt || 0);
  const artRooms = deadEnds.concat(rng.shuffle(rooms.filter((r) => r !== start && !deadEnds.includes(r))));
  let placed = 0;
  for (const r of artRooms) {
    if (placed >= nArt) break;
    const m = takeMark(r, 'a');
    if (!m) continue;
    const stand = (L) => lvl.get(L, m.x, m.y) === T_EMPTY && [T_SOLID, T_PLAT].includes(lvl.get(L, m.x, m.y + 1));
    const sf = stand('front'), sb = stand('back');
    const layer = sf && !sb ? 'front' : sb && !sf ? 'back' : lvl.get('front', m.x, m.y) !== T_EMPTY ? 'back' : lvl.get('back', m.x, m.y) !== T_EMPTY ? 'front' : rng.chance(0.7) ? 'back' : 'front';
    out.pickups.push({ type: 'artifact', id: rollArtifact(rng, spec.theme, d, spec.luk), x: wx(m.x) + 1, y: wx(m.y + 1) - 18, layer });
    targets.push([m.x, m.y, layer]);
    placed++;
  }
  const iSpots = [];
  for (const r of rooms) for (const m of r.marks.i) iSpots.push(m);
  rng.shuffle(iSpots);
  const docId = spec.doc || spec.randomDoc;
  if (docId && iSpots.length) { const m = iSpots.pop(); out.interacts.push({ type: 'doc', id: docId, x: wx(m.x), y: wx(m.y + 1) - 14, w: 16, h: 14, layer: 'front' }); targets.push([m.x, m.y, 'front']); }
  const nCash = rng.int(1, 3) + Math.floor(rooms.length / 6);
  for (let k = 0; k < nCash && iSpots.length; k++) { const m = iSpots.pop(); out.pickups.push({ type: 'cash', amount: rng.int(3, 12) * 1000 * d, x: wx(m.x) + 1, y: wx(m.y + 1) - 16, layer: 'front' }); }
  const nBox = rng.int(1, 2) + Math.floor(rooms.length / 8);
  for (let k = 0; k < nBox && iSpots.length; k++) { const m = iSpots.pop(); out.pickups.push({ type: 'item', id: rng.pick(['drink', 'candy', 'gimbap', 'salt', 'charm', 'candy', 'coffee', 'foil']), x: wx(m.x) + 1, y: wx(m.y + 1) - 16, layer: rng.pick(['front', 'back']) }); }

  // 11) 전파 오염 구역
  if (d >= 4 || (spec.theme === 'pcbang' && d >= 2) || spec.jammed || (deep && deep.stage >= 3) || spec.weekMod === 'flood' || spec.weekMod === 'notif') {
    const n = spec.jammed ? 3 : d >= 5 ? 3 : 2;
    const cands = rng.shuffle(middle.slice());
    for (const r of cands.slice(0, n)) out.jamZones.push({ x0: wx(r.ox), x1: wx(r.ox + RW), y0: wx(r.oy), y1: wx(r.oy + RH) });
  }

  // 12) 배경 소품
  for (const r of rooms) {
    let lx = rng.int(2, 4);
    while (lx < RW - 3) {
      if (lx < 8 || lx > 15) {
        const X = r.ox + lx, Yf = r.oy + RH - 1;
        const okCol = lvl.get('front', X, Yf) === T_SOLID && lvl.get('back', X, Yf) === T_SOLID &&
          [1, 2, 3].every((h) => lvl.get('front', X, Yf - h) === T_EMPTY && lvl.get('back', X, Yf - h) === T_EMPTY);
        if (okCol) {
          const type = rng.pick(th.decor);
          const spr = decorSprite(type, 'front');
          const yOff = DECOR_Y[type] || spr.height - 1;
          const top = Yf * TS - yOff;
          if (top > (r.oy + 1) * TS) out.decor.push({ type, x: X * TS, y: top });
        }
      }
      lx += rng.int(3, 6);
    }
  }

  // 13) 검사: 봉인문이 닫힌 상태로 열쇠까지, 연 상태로 나머지 전부
  const sx = sp.x + 1, sy = sp.y;
  if (gateCells) {
    const closed = reachSet(lvl, sx, sy, null);
    if (!canReach(closed, out.keyAt[0], out.keyAt[1], 'both')) return fail('key');
    for (const [x, y] of gateCells) lvl.set('both', x, y, T_EMPTY);
    const open = reachSet(lvl, sx, sy, null);
    for (const [x, y] of gateCells) lvl.set('both', x, y, T_SOLID);
    for (const [x, y, L] of targets) if (!canReach(open, x, y, L)) { const rr = roomAt(x, y); return fail(`target ${L} tpl${rr && rr.tplIdx} role=${rr && rr.role} local=${x % RW},${y % RH} conns=${rr && JSON.stringify(rr.conns)}`); }
  } else {
    const R = reachSet(lvl, sx, sy, null);
    for (const [x, y, L] of targets) if (!canReach(R, x, y, L)) { const rr = roomAt(x, y); return fail(`target ${L} tpl${rr && rr.tplIdx} role=${rr && rr.role} local=${x % RW},${y % RH} conns=${rr && JSON.stringify(rr.conns)}`); }
  }
  for (const o of out.interacts) delete o.room;
  return out;
}
