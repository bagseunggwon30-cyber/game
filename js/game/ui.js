'use strict';
// ───────────────────────── UI 모달: 대화 / 메뉴 / 문서 / 상태창 ─────────────────────────

class DialogModal {
  constructor(lines, onDone, opt = {}) {
    this.lines = lines.filter(Boolean);
    this.i = 0; this.ch = 0; this.t = 0;
    this.onDone = onDone;
    this.opt = opt;
    this.blockInput = 6;
  }
  get cur() { return this.lines[this.i]; }
  update() {
    this.t++;
    if (this.blockInput > 0) { this.blockInput--; return; }
    const line = this.cur;
    if (!line) { this.finish(); return; }
    const text = line[1];
    if (this.ch < text.length) {
      const prev = Math.floor(this.ch);
      this.ch += 1.4;
      if (Math.floor(this.ch) !== prev && prev % 2 === 0 && text[prev] !== ' ') Sound.play('text');
    }
    if (Input.pressed('confirm') || Input.pressed('attack')) {
      if (this.ch < text.length) this.ch = text.length;
      else { this.i++; this.ch = 0; Sound.play('menu'); if (this.i >= this.lines.length) this.finish(); }
    }
  }
  finish() {
    if (this.closed) return;
    this.closed = true;
    Game.pop(this);
    if (this.onDone) this.onDone();
  }
  draw(ctx) {
    const line = this.cur;
    if (!line) return;
    const sp = SPEAKERS[line[0]] || SPEAKERS[''];
    const bx = 8, by = VH - 64, bw = VW - 16, bh = 58;
    const phone = line[0] === 'phone';
    Gfx.panel(ctx, bx, by, bw, bh, { edge: phone ? '#62d6e8' : line[0] === 'unknown' ? '#ff5a6a' : COL.panelEdge });
    let tx = bx + 10;
    if (sp.face && SPR.face[sp.face]) {
      Gfx.panel(ctx, bx + 6, by + 8, 40, 40, { fill: '#1a1826', edge: sp.col, inner: false });
      ctx.drawImage(SPR.face[sp.face], bx + 9, by + 11);
      tx = bx + 54;
    }
    if (sp.name) {
      const nw = Gfx.measure(ctx, sp.name, { bold: true }) + 14;
      Gfx.panel(ctx, bx + 4, by - 13, nw, 16, { edge: sp.col, inner: false });
      Gfx.text(ctx, sp.name, bx + 11, by - 11, sp.col, { bold: true });
    }
    const shown = line[1].slice(0, Math.floor(this.ch));
    Gfx.para(ctx, shown, tx, by + 8, bx + bw - tx - 10, phone ? '#bff4ff' : line[0] === '' ? '#d8d4e8' : COL.white, { maxLines: 3 });
    if (this.ch >= line[1].length && Math.floor(this.t / 20) % 2 === 0) Gfx.text(ctx, '▼', bx + bw - 16, by + bh - 14, COL.yellow, { small: true });
  }
}

class Menu {
  constructor(o) {
    this.o = o;
    this.title = o.title || '';
    this.items = o.items || [];
    this.refresh = o.refresh || null;
    if (this.refresh) this.items = this.refresh();
    this.w = o.w || 220;
    this.sel = clamp(o.sel || 0, 0, Math.max(0, this.items.length - 1));
    this.top = 0;
    this.maxVis = o.maxVis || 8;
    this.onCancel = o.onCancel;
    this.blockInput = o.block || 4;
    this.t = 0;
    this.depth = (typeof Game !== 'undefined') ? Game.modals.filter((m) => m instanceof Menu).length : 0;
  }
  rebuild() { if (this.refresh) { this.items = this.refresh(); this.sel = clamp(this.sel, 0, Math.max(0, this.items.length - 1)); } }
  update() {
    this.t++;
    if (this.blockInput > 0) { this.blockInput--; return; }
    const n = this.items.length;
    if (n > 0) {
      if (Input.pressed('up')) { this.sel = (this.sel - 1 + n) % n; Sound.play('menu'); }
      if (Input.pressed('down')) { this.sel = (this.sel + 1) % n; Sound.play('menu'); }
      if (this.o.horizontal) {
        if (Input.pressed('left')) { this.sel = (this.sel - 1 + n) % n; Sound.play('menu'); }
        if (Input.pressed('right')) { this.sel = (this.sel + 1) % n; Sound.play('menu'); }
      }
    }
    if (this.sel < this.top) this.top = this.sel;
    if (this.sel >= this.top + this.maxVis) this.top = this.sel - this.maxVis + 1;
    if (Input.pressed('confirm')) {
      const it = this.items[this.sel];
      if (it && !it.disabled && it.onSelect) { Sound.play('select'); it.onSelect(this, it); this.rebuild(); }
      else if (it && it.disabled) Sound.play('deny');
      return;
    }
    if (Input.pressed('cancel') && this.onCancel !== false) {
      Sound.play('cancel');
      this.close();
      if (this.onCancel) this.onCancel();
    }
  }
  close() { Game.pop(this); }
  layout() {
    const rows = Math.min(this.items.length, this.maxVis);
    const h = 10 + (this.title ? 18 : 0) + rows * 15 + (this.o.footer ? 14 : 0);
    const off = this.o.x == null ? this.depth * 14 : 0;
    const x = this.o.x != null ? this.o.x : clamp(Math.round((VW - this.w) / 2) + off, 4, VW - this.w - 4);
    const y = this.o.y != null ? this.o.y : clamp(Math.round((VH - h) / 2 - (this.o.desc ? 24 : 0)) + Math.round(off * 0.7), this.o.phone ? 18 : 4, VH - h - (this.o.desc ? 58 : 4));
    return { x, y, w: this.w, h, rows };
  }
  draw(ctx) {
    const L = this.layout();
    if (this.o.dim !== false && this.depth === 0) { ctx.fillStyle = 'rgba(0,0,0,0.45)'; ctx.fillRect(0, 0, VW, VH); }
    if (this.o.phone) {
      Gfx.panel(ctx, L.x - 8, L.y - 16, L.w + 16, L.h + 30, { fill: '#14141e', edge: '#5a5a6a', edge2: '#2a2a34' });
      ctx.fillStyle = '#3a3a48'; ctx.fillRect(L.x + L.w / 2 - 12, L.y - 11, 24, 3);
      Gfx.text(ctx, this.o.phoneTime || '', L.x, L.y - 14, COL.dim, { small: true });
      Gfx.text(ctx, '▮▮▮ 87%', L.x + L.w - 2, L.y - 14, COL.dim, { small: true, align: 'right' });
    }
    Gfx.panel(ctx, L.x, L.y, L.w, L.h, { edge: this.o.edge || COL.panelEdge });
    let y = L.y + 6;
    if (this.title) {
      Gfx.text(ctx, this.title, L.x + 8, y, this.o.titleCol || COL.yellow, { bold: true });
      if (this.o.titleRight) Gfx.text(ctx, this.o.titleRight, L.x + L.w - 8, y, COL.dim, { align: 'right', small: true });
      ctx.fillStyle = COL.panelEdge2; ctx.fillRect(L.x + 6, y + 14, L.w - 12, 1);
      y += 18;
    }
    for (let i = 0; i < L.rows; i++) {
      const idx = this.top + i;
      const it = this.items[idx];
      if (!it) break;
      const selected = idx === this.sel;
      if (selected) { ctx.fillStyle = 'rgba(242,194,48,0.14)'; ctx.fillRect(L.x + 4, y - 1, L.w - 8, 14); }
      let lx = L.x + 16;
      if (selected) Gfx.text(ctx, '▶', L.x + 6, y, COL.yellow, { small: true });
      if (it.icon) { ctx.drawImage(it.icon, lx - 2, y - 1); lx += 14; }
      const col = it.disabled ? COL.dark : it.col || (selected ? COL.white : '#c8c4d8');
      Gfx.text(ctx, it.label, lx, y, col);
      if (it.right) Gfx.text(ctx, it.right, L.x + L.w - 8, y, it.rightCol || (it.disabled ? COL.dark : COL.dim), { align: 'right' });
      if (it.badge) {
        const bw = Gfx.measure(ctx, it.label) + lx + 4;
        ctx.fillStyle = COL.red; ctx.fillRect(bw, y + 1, 12, 10);
        Gfx.text(ctx, String(it.badge), bw + 6, y + 1, '#fff', { small: true, align: 'center', shadow: false });
      }
      y += 15;
    }
    if (this.items.length > this.maxVis) {
      if (this.top > 0) Gfx.text(ctx, '▲', L.x + L.w - 12, L.y + (this.title ? 22 : 4), COL.dim, { small: true });
      if (this.top + this.maxVis < this.items.length) Gfx.text(ctx, '▼', L.x + L.w - 12, L.y + L.h - 12, COL.dim, { small: true });
    }
    if (this.o.footer) Gfx.text(ctx, typeof this.o.footer === 'function' ? this.o.footer() : this.o.footer, L.x + 8, L.y + L.h - 14, COL.dim, { small: true });
    // 설명창
    const it = this.items[this.sel];
    if (this.o.desc && it && it.desc) {
      const dx = 8, dw = VW - 16, dh = 50, dy = VH - dh - 6;
      Gfx.panel(ctx, dx, dy, dw, dh, { edge: '#7a7690' });
      let tx = dx + 8;
      if (it.bigIcon) { ctx.drawImage(it.bigIcon, dx + 8, dy + 8, 28, 28); tx += 34; }
      Gfx.para(ctx, it.desc, tx, dy + 6, dw - (tx - dx) - 8, '#d8d4e8', { maxLines: 3 });
    }
  }
}

class TextView {
  constructor(title, text, onClose, opt = {}) {
    this.title = title; this.text = text; this.onClose = onClose; this.opt = opt;
    this.blockInput = 8; this.t = 0;
  }
  update() {
    this.t++;
    if (this.blockInput > 0) { this.blockInput--; return; }
    if (Input.pressed('confirm') || Input.pressed('cancel')) {
      Sound.play('menu');
      Game.pop(this);
      if (this.onClose) this.onClose();
    }
  }
  draw(ctx) {
    ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(0, 0, VW, VH);
    const w = 300, x = (VW - w) / 2;
    ctx.font = FONT_M;
    const lines = wrapText(ctx, this.text, w - 24);
    const h = Math.min(VH - 20, 46 + lines.length * 14 + (this.opt.icon ? 0 : 0));
    const y = (VH - h) / 2;
    Gfx.panel(ctx, x, y, w, h, { fill: this.opt.paper ? '#e8e2d0' : COL.panel, edge: this.opt.edge || COL.panelEdge, edge2: this.opt.paper ? '#c8c0a8' : COL.panelEdge2 });
    let tx = x + 12;
    if (this.opt.icon) { ctx.drawImage(this.opt.icon, x + 10, y + 7); tx += 16; }
    Gfx.text(ctx, this.title, tx, y + 8, this.opt.paper ? '#7a1e2e' : this.opt.titleCol || COL.yellow, { bold: true, shadow: !this.opt.paper });
    ctx.fillStyle = this.opt.paper ? '#b8b098' : COL.panelEdge2; ctx.fillRect(x + 8, y + 24, w - 16, 1);
    lines.forEach((ln, i) => Gfx.text(ctx, ln, x + 12, y + 30 + i * 14, this.opt.paper ? '#2a2630' : '#d8d4e8', { shadow: !this.opt.paper }));
    if (Math.floor(this.t / 20) % 2 === 0) Gfx.text(ctx, '▼', x + w - 16, y + h - 13, this.opt.paper ? '#7a1e2e' : COL.yellow, { small: true, shadow: false });
  }
}

// 상태창
class StatusView {
  constructor(s, onClose) { this.s = s; this.onClose = onClose; this.blockInput = 6; this.page = 0; }
  update() {
    if (this.blockInput > 0) { this.blockInput--; return; }
    if (Input.pressed('left') || Input.pressed('right')) { this.page = 1 - this.page; Sound.play('menu'); }
    if (Input.pressed('confirm') || Input.pressed('cancel')) { Sound.play('menu'); Game.pop(this); if (this.onClose) this.onClose(); }
  }
  draw(ctx) {
    const s = this.s, D = derive(s);
    ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(0, 0, VW, VH);
    const x = 20, y = 12, w = VW - 40, h = VH - 24;
    Gfx.panel(ctx, x, y, w, h);
    Gfx.text(ctx, this.page === 0 ? '내 상태' : '능력 · 장비', x + 10, y + 7, COL.yellow, { bold: true });
    Gfx.text(ctx, '◀ ▶ 페이지   Z 닫기', x + w - 10, y + 8, COL.dim, { small: true, align: 'right' });
    ctx.fillStyle = COL.panelEdge2; ctx.fillRect(x + 6, y + 22, w - 12, 1);
    if (this.page === 0) {
      ctx.drawImage(SPR.face.me, x + 12, y + 30);
      Gfx.text(ctx, '윤하람', x + 52, y + 30, COL.white, { bold: true });
      Gfx.text(ctx, RANKS[rankIndex(s)].name + ' · 신뢰 ' + s.trust, x + 52, y + 45, COL.cyan);
      const nr = RANKS[rankIndex(s) + 1];
      Gfx.text(ctx, nr ? `다음: ${nr.name} (${nr.need})` : '최고 등급', x + 52, y + 58, COL.dim, { small: true });
      let yy = y + 76;
      STAT_KEYS.forEach((k, i) => {
        const cx = x + 12 + (i % 2) * 120, cy = yy + Math.floor(i / 2) * 16;
        Gfx.text(ctx, STAT_INFO[k].name, cx, cy, '#c8c4d8');
        Gfx.text(ctx, String(s.stats[k]), cx + 40, cy, COL.white, { bold: true });
        for (let j = 0; j < Math.min(10, s.stats[k]); j++) { ctx.fillStyle = COL.yellow; ctx.fillRect(cx + 56 + j * 5, cy + 4, 4, 4); }
      });
      yy += 52;
      Gfx.text(ctx, `최대 체력 ${D.maxHp}   최대 정신력 ${D.maxSan}   공격 x${D.atkMul.toFixed(2)}`, x + 12, yy, COL.dim, { small: true });
      Gfx.text(ctx, `뒷면 시야 ${Math.round(D.light)}   정신 소모 ${D.drain.toFixed(2)}/초   치명 ${Math.round(D.crit * 100)}%`, x + 12, yy + 12, COL.dim, { small: true });
      // 우측: 게이지
      const gx = x + 250, gy = y + 30;
      Gfx.text(ctx, '의심도', gx, gy, COL.orange); Gfx.bar(ctx, gx, gy + 14, 96, 5, s.suspicion / 100, COL.orange);
      Gfx.text(ctx, s.suspicion + '/100', gx + 96, gy, COL.dim, { small: true, align: 'right' });
      Gfx.text(ctx, '오염도', gx, gy + 26, COL.pink); Gfx.bar(ctx, gx, gy + 40, 96, 5, s.contamination / 100, COL.pink);
      Gfx.text(ctx, Math.round(s.contamination) + '/100', gx + 96, gy + 26, COL.dim, { small: true, align: 'right' });
      Gfx.text(ctx, '진실 조각 ' + s.truths.length + '/10', gx, gy + 54, COL.cyan);
      Gfx.text(ctx, '은닉 ' + s.stash.length + ' · 흡수 ' + s.absorbed.length, gx, gy + 68, COL.dim);
      Gfx.text(ctx, '제출 ' + s.submitted + ' · 임무 ' + s.record.missions, gx, gy + 82, COL.dim);
      Gfx.text(ctx, `마음 지도 ${s.skills.length - 1}노드 · SP ${s.sp || 0}`, gx, gy + 100, '#a99cff', { small: true });
      if (s.statPoints > 0) Gfx.text(ctx, '승급 포인트 ' + s.statPoints + ' (사무소)', gx, gy + 112, COL.green, { small: true });
    } else {
      let yy = y + 30;
      Gfx.text(ctx, '능력', x + 12, yy, COL.cyan, { bold: true }); yy += 15;
      const abs = Object.keys(s.abilities).filter((k) => s.abilities[k]);
      if (!abs.length) { Gfx.text(ctx, '없음 — 아티팩트를 "흡수"하면 얻을 수 있다.', x + 16, yy, COL.dark); yy += 14; }
      for (const k of abs) { Gfx.text(ctx, '· ' + ABILITIES[k].name, x + 16, yy, COL.white); Gfx.text(ctx, ABILITIES[k].desc, x + 100, yy, COL.dim, { small: true }); yy += 14; }
      yy += 6;
      Gfx.text(ctx, '장비', x + 12, yy, COL.cyan, { bold: true }); yy += 15;
      const wpn = WEAPONS[s.weapon];
      Gfx.text(ctx, '무기: ' + wpn.name, x + 16, yy, COL.white); Gfx.text(ctx, wpn.desc, x + 140, yy, COL.dim, { small: true }); yy += 14;
      for (const g of s.gear) { Gfx.text(ctx, '· ' + GEAR[g].name, x + 16, yy, COL.white); Gfx.text(ctx, GEAR[g].desc, x + 140, yy, COL.dim, { small: true }); yy += 14; }
      yy += 6;
      Gfx.text(ctx, '흡수한 아티팩트', x + 12, yy, COL.pink, { bold: true }); yy += 15;
      let ix = x + 16;
      for (const id of s.absorbed) { ctx.drawImage(SPR.icon[ARTIFACTS[id].icon], ix, yy); ix += 16; if (ix > x + w - 20) { ix = x + 16; yy += 16; } }
      if (!s.absorbed.length) Gfx.text(ctx, '없음', x + 16, yy, COL.dark);
    }
  }
}

// 아티팩트 상세 텍스트
function artifactDesc(id) {
  const a = ARTIFACTS[id];
  const eff = Object.keys(a.eff).map((k) => `${STAT_INFO[k].name}+${a.eff[k]}`);
  if (a.ability) eff.push(`능력:${ABILITIES[a.ability].name}`);
  if (a.light) eff.push(`시야+${a.light}`);
  return `[${RARITY[a.rarity].name}] ${a.desc}\n흡수 효과: ${eff.join(', ') || '없음'}  (오염 +${RARITY[a.rarity].cont})`;
}
