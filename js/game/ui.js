'use strict';
// ───────────────────────── UI 모달: 대화 / 메뉴 / 문서 / 상태창 / 휴대폰 ─────────────────────────

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
    const phone = line[0] === 'phone';
    const narr = line[0] === '';
    // 아래쪽 그라데이션 띠
    const top = VH - 74;
    const g = ctx.createLinearGradient(0, top, 0, VH);
    g.addColorStop(0, 'rgba(8,7,14,0)');
    g.addColorStop(0.28, 'rgba(8,7,14,0.9)');
    g.addColorStop(1, 'rgba(8,7,14,0.97)');
    ctx.fillStyle = g; ctx.fillRect(0, top, VW, VH - top);
    let tx = 24;
    const ty = VH - 52;
    if (sp.face && SPR.face[sp.face]) {
      UI.card(ctx, 14, VH - 58, 40, 40, { fill: '#1b1928', border: sp.col });
      ctx.drawImage(SPR.face[sp.face], 17, VH - 55);
      tx = 64;
    }
    if (sp.name) {
      if (phone) { UI.pill(ctx, tx, ty - 3, '알림', '#62d6e8'); Gfx.text(ctx, sp.name, tx + 30, ty - 3, sp.col, { bold: true }); }
      else Gfx.text(ctx, sp.name, tx, ty - 3, sp.col, { bold: true });
    }
    const shown = line[1].slice(0, Math.floor(this.ch));
    const textY = sp.name ? ty + 12 : ty;
    Gfx.para(ctx, shown, tx, textY, VW - tx - 24, phone ? '#bff4ff' : narr ? '#cfcbe0' : UI.C.text, { maxLines: 3, lh: 13 });
    if (this.ch >= line[1].length) {
      const by = VH - 13 + (Math.floor(this.t / 12) % 2);
      ctx.fillStyle = UI.C.accent;
      ctx.fillRect(VW - 20, by, 7, 1); ctx.fillRect(VW - 19, by + 1, 5, 1); ctx.fillRect(VW - 18, by + 2, 3, 1); ctx.fillRect(VW - 17, by + 3, 1, 1);
    }
    // 진행 표시
    if (this.lines.length > 1) Gfx.text(ctx, `${this.i + 1}/${this.lines.length}`, VW - 26, VH - 14, UI.C.mute, { small: true, align: 'right' });
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
    const twoLine = o.phone && this.items.some((i) => i.sub);
    this.maxVis = o.maxVis || (o.phone ? (twoLine ? (o.desc ? 4 : 6) : (o.desc ? 7 : 9)) : 8);
    this.onCancel = o.onCancel;
    this.blockInput = o.block || 4;
    this.t = 0;
    this.covers = true;
    this.wantsDim = o.dim !== false;
    const parent = (typeof Game !== 'undefined') ? [...Game.modals].reverse().find((m) => m instanceof Menu) : null;
    this.crumb = o.crumb !== undefined ? o.crumb : parent && !o.phone ? parent.title : '';
    this.anim = 0;
  }
  rebuild() { if (this.refresh) { this.items = this.refresh(); this.sel = clamp(this.sel, 0, Math.max(0, this.items.length - 1)); } }
  update() {
    this.t++;
    if (this.blockInput > 0) { this.blockInput--; return; }
    const n = this.items.length;
    if (n > 0) {
      const prev = this.sel;
      if (Input.pressed('up')) this.sel = (this.sel - 1 + n) % n;
      if (Input.pressed('down')) this.sel = (this.sel + 1) % n;
      if (this.o.horizontal) {
        if (Input.pressed('left')) this.sel = (this.sel - 1 + n) % n;
        if (Input.pressed('right')) this.sel = (this.sel + 1) % n;
      }
      if (prev !== this.sel) { Sound.play('menu'); this.anim = 0; }
    }
    this.anim = Math.min(1, this.anim + 0.25);
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

  draw(ctx) {
    if (this.o.phone) return this.drawPhone(ctx);
    if (this.o.plain) return this.drawPlain(ctx);
    const C = UI.C, RH = 15;
    const rows = Math.min(this.items.length, this.maxVis);
    const headH = this.title ? (this.crumb ? 35 : 24) : 6;
    const descH = this.o.desc ? 44 : 0;
    const h = headH + rows * RH + 6 + descH;
    const w = this.w;
    const x = this.o.x != null ? this.o.x : Math.round((VW - w) / 2);
    const y = this.o.y != null ? this.o.y : clamp(Math.round((VH - h) / 2) - 6, 4, VH - h - 16);
    UI.card(ctx, x, y, w, h, { accent: this.o.accent || C.accent });
    let yy = y + 6;
    if (this.title) {
      if (this.crumb) { Gfx.text(ctx, this.crumb + '  ›', x + 10, yy - 1, C.mute, { small: true }); yy += 12; }
      Gfx.text(ctx, this.title, x + 10, yy, this.o.titleCol || C.text, { bold: true });
      if (this.o.titleRight) Gfx.text(ctx, this.o.titleRight, x + w - 10, yy + 1, C.sub, { align: 'right', small: true });
      ctx.fillStyle = this.o.accent || C.accent; ctx.fillRect(x + 10, yy + 15, 14, 2);
      yy = y + headH;
    }
    for (let i = 0; i < rows; i++) {
      const idx = this.top + i;
      const it = this.items[idx];
      if (!it) break;
      const selected = idx === this.sel;
      if (selected) {
        ctx.fillStyle = C.accentSoft; ctx.fillRect(x + 4, yy, w - 8, RH - 1);
        ctx.fillStyle = C.accent; ctx.fillRect(x + 4, yy + 2, 2, RH - 5);
      }
      let lx = x + 12 + (selected ? Math.round(2 * this.anim) : 0);
      if (it.icon) { ctx.drawImage(it.icon, lx - 1, yy); lx += 15; }
      const col = it.disabled ? C.mute : it.col || (selected ? C.text : C.sub);
      const rightW = it.right ? Gfx.measure(ctx, it.right, { small: true }) + 14 : 0;
      const label = Gfx.fit(ctx, it.label, x + w - 12 - rightW - lx);
      Gfx.text(ctx, label, lx, yy + 1, col);
      if (it.right) Gfx.text(ctx, it.right, x + w - 10, yy + 2, it.rightCol || (it.disabled ? C.mute : C.sub), { align: 'right', small: true });
      if (it.badge) {
        const bx = lx + Gfx.measure(ctx, label) + 4;
        UI.card(ctx, bx, yy + 2, Gfx.measure(ctx, String(it.badge), { small: true }) + 7, 10, { fill: '#e0474c', border: false });
        Gfx.text(ctx, String(it.badge), bx + 4, yy + 2, '#ffffff', { small: true });
      }
      yy += RH;
    }
    if (this.items.length > this.maxVis) {
      const ty = y + headH, by = y + headH + rows * RH - 4;
      ctx.fillStyle = this.top > 0 ? C.sub : C.line;
      ctx.fillRect(x + w - 8, ty, 3, 1); ctx.fillRect(x + w - 7, ty - 1, 1, 1);
      ctx.fillStyle = this.top + this.maxVis < this.items.length ? C.sub : C.line;
      ctx.fillRect(x + w - 8, by, 3, 1); ctx.fillRect(x + w - 7, by + 1, 1, 1);
    }
    // 설명
    const it = this.items[this.sel];
    if (this.o.desc) {
      const dy = y + h - descH;
      UI.divider(ctx, x + 8, dy, w - 16);
      if (it && it.desc) {
        let tx = x + 10;
        if (it.bigIcon) { ctx.drawImage(it.bigIcon, x + 10, dy + 7, 28, 28); tx += 34; }
        Gfx.para(ctx, it.desc, tx, dy + 6, x + w - tx - 10, '#c8c4d8', { small: true, maxLines: 3 });
      }
    }
    // 조작 안내
    if (y + h + 14 <= VH) {
      const list = [['Z', '선택']];
      if (this.onCancel !== false) list.push(['X', '뒤로']);
      UI.hints(ctx, x + w, y + h + 4, list, 'right');
    }
  }

  // 타이틀처럼 테두리 없는 목록
  drawPlain(ctx) {
    const C = UI.C, RH = 16;
    const y0 = this.o.y != null ? this.o.y : 120;
    this.items.forEach((it, i) => {
      const y = y0 + i * RH;
      const sel = i === this.sel;
      if (sel) {
        const w = Gfx.measure(ctx, it.label, { bold: true }) + 30;
        const g = ctx.createLinearGradient(VW / 2 - w / 2, 0, VW / 2 + w / 2, 0);
        g.addColorStop(0, 'rgba(242,194,48,0)'); g.addColorStop(0.5, 'rgba(242,194,48,0.18)'); g.addColorStop(1, 'rgba(242,194,48,0)');
        ctx.fillStyle = g; ctx.fillRect(VW / 2 - w / 2, y - 1, w, RH - 2);
        ctx.fillStyle = C.accent;
        const off = Math.round(Math.sin(this.t * 0.12) * 1.5);
        ctx.fillRect(VW / 2 - w / 2 + 4 + off, y + 5, 3, 3); ctx.fillRect(VW / 2 + w / 2 - 7 - off, y + 5, 3, 3);
      }
      Gfx.text(ctx, it.label, VW / 2, y, sel ? C.text : C.sub, { align: 'center', bold: sel, shadow: true });
    });
    const it = this.items[this.sel];
    if (it && it.desc) Gfx.text(ctx, it.desc, VW / 2, y0 + this.items.length * RH + 4, C.mute, { align: 'center', small: true, shadow: true });
  }

  // 휴대폰 앱 화면
  drawPhone(ctx) {
    const C = UI.C;
    const W = 204, H = 210;
    const px = Math.round((VW - W) / 2), py = Math.round((VH - H) / 2);
    const S = drawPhoneFrame(ctx, px, py, W, H, this.o.phoneTime);
    // 앱 헤더
    const hy = S.sy + 12;
    const appCol = this.o.appCol || C.accent;
    ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(S.sx, hy, S.sw, 18);
    ctx.fillStyle = appCol; ctx.fillRect(S.sx, hy + 17, S.sw, 1);
    Gfx.text(ctx, '‹', S.sx + 6, hy + 2, C.sub);
    Gfx.text(ctx, Gfx.fit(ctx, this.title, S.sw - 70, { bold: true }), S.sx + 16, hy + 3, C.text, { bold: true });
    if (this.o.titleRight) Gfx.text(ctx, this.o.titleRight, S.sx + S.sw - 6, hy + 5, C.sub, { small: true, align: 'right' });
    // 목록
    const two = this.items.some((i) => i.sub);
    const RH = two ? 25 : 15;
    let yy = hy + 22;
    const rows = Math.min(this.items.length, this.maxVis);
    for (let i = 0; i < rows; i++) {
      const idx = this.top + i;
      const it = this.items[idx];
      if (!it) break;
      const sel = idx === this.sel;
      if (sel) { ctx.fillStyle = 'rgba(255,255,255,0.1)'; ctx.fillRect(S.sx + 3, yy - 1, S.sw - 6, RH - 1); ctx.fillStyle = appCol; ctx.fillRect(S.sx + 3, yy + 1, 2, RH - 5); }
      else { ctx.fillStyle = 'rgba(255,255,255,0.05)'; ctx.fillRect(S.sx + 8, yy + RH - 2, S.sw - 16, 1); }
      let lx = S.sx + 9;
      if (it.icon) { ctx.drawImage(it.icon, lx - 1, yy - 1); lx += 15; }
      const rightW = it.right ? Gfx.measure(ctx, it.right, { small: true }) + 8 : 0;
      const col = it.disabled ? C.mute : it.col || (sel ? C.text : '#c8c4d8');
      Gfx.text(ctx, Gfx.fit(ctx, it.label, S.sx + S.sw - 8 - rightW - lx, { small: true }), lx, yy + 1, col, { small: true });
      if (it.right) Gfx.text(ctx, it.right, S.sx + S.sw - 7, yy + 1, it.rightCol || C.sub, { small: true, align: 'right' });
      if (it.badge) { const bx = S.sx + S.sw - 7 - rightW - 10; UI.card(ctx, bx, yy + 1, 10, 10, { fill: '#e0474c', border: false }); Gfx.text(ctx, String(it.badge), bx + 5, yy + 1, '#fff', { small: true, align: 'center' }); }
      if (it.sub) Gfx.text(ctx, Gfx.fit(ctx, it.sub, S.sw - 18, { small: true }), S.sx + 9, yy + 12, it.disabled ? C.mute : it.subCol || C.mute, { small: true });
      yy += RH;
    }
    // 상세
    const it = this.items[this.sel];
    if (this.o.desc && it && it.desc) {
      const dy = S.sy + S.sh - 46;
      ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(S.sx, dy, S.sw, 44);
      ctx.fillStyle = appCol; ctx.fillRect(S.sx, dy, S.sw, 1);
      Gfx.para(ctx, it.desc, S.sx + 7, dy + 4, S.sw - 14, '#d8d4e8', { small: true, maxLines: 3 });
    }
    UI.hints(ctx, px + W + 8, py + H - 12, [['Z', '열기'], ['X', '뒤로']], 'left');
  }
}

class TextView {
  constructor(title, text, onClose, opt = {}) {
    this.title = title; this.text = text; this.onClose = onClose; this.opt = opt;
    this.blockInput = 8; this.t = 0;
    this.wantsDim = true;
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
    const paper = this.opt.paper;
    const w = 304, x = Math.round((VW - w) / 2);
    ctx.font = FONT_M;
    const lines = wrapText(ctx, this.text, w - 28);
    const h = Math.min(VH - 24, 52 + lines.length * 13);
    const y = Math.round((VH - h) / 2) - 4;
    if (paper) {
      UI.card(ctx, x, y, w, h, { fill: '#ebe5d3', border: '#b8ae94' });
      ctx.fillStyle = 'rgba(122,30,46,0.65)'; ctx.fillRect(x + 3, y + 2, w - 6, 1);
      for (let ly = y + 32; ly < y + h - 10; ly += 13) { ctx.fillStyle = 'rgba(120,110,90,0.12)'; ctx.fillRect(x + 12, ly + 12, w - 24, 1); }
    } else UI.card(ctx, x, y, w, h, { accent: this.opt.titleCol || UI.C.accent });
    let tx = x + 12;
    if (this.opt.icon) { ctx.drawImage(this.opt.icon, x + 10, y + 7); tx += 17; }
    Gfx.text(ctx, this.title, tx, y + 8, paper ? '#7a1e2e' : this.opt.titleCol || UI.C.text, { bold: true });
    if (paper) Gfx.text(ctx, '대외비', x + w - 12, y + 9, 'rgba(160,30,40,0.7)', { small: true, align: 'right' });
    UI.divider(ctx, x + 10, y + 24, w - 20, paper ? '#cfc6ae' : UI.C.line);
    lines.forEach((ln, i) => Gfx.text(ctx, ln, x + 14, y + 31 + i * 13, paper ? '#2a2630' : '#d4d0e2'));
    UI.hints(ctx, x + w, y + h + 4, [['Z', '닫기']], 'right');
  }
}

// 상태창
class StatusView {
  constructor(s, onClose) { this.s = s; this.onClose = onClose; this.blockInput = 6; this.page = 0; this.covers = true; this.wantsDim = true; }
  update() {
    if (this.blockInput > 0) { this.blockInput--; return; }
    if (Input.pressed('left') || Input.pressed('right')) { this.page = 1 - this.page; Sound.play('menu'); }
    if (Input.pressed('confirm') || Input.pressed('cancel')) { Sound.play('menu'); Game.pop(this); if (this.onClose) this.onClose(); }
  }
  draw(ctx) {
    const s = this.s, D = derive(s), C = UI.C;
    const x = 16, y = 10, w = VW - 32, h = VH - 34;
    UI.card(ctx, x, y, w, h, { accent: C.accent });
    // 탭
    ['내 상태', '능력 · 장비'].forEach((t, i) => {
      const tw = Gfx.measure(ctx, t, { bold: true }) + 16, tx = x + 8 + i * 78;
      const on = this.page === i;
      if (on) { ctx.fillStyle = C.accentSoft; ctx.fillRect(tx, y + 5, tw, 15); ctx.fillStyle = C.accent; ctx.fillRect(tx, y + 19, tw, 1); }
      Gfx.text(ctx, t, tx + 8, y + 6, on ? C.text : C.mute, { bold: on });
    });
    UI.divider(ctx, x + 6, y + 20, w - 12);
    const L = x + 12, T = y + 28;
    if (this.page === 0) {
      UI.card(ctx, L, T, 40, 40, { fill: '#1b1928', border: C.line2 });
      ctx.drawImage(SPR.face.me, L + 3, T + 3);
      Gfx.text(ctx, '윤하람', L + 48, T + 2, C.text, { bold: true });
      const ri = rankIndex(s), nr = RANKS[ri + 1];
      UI.pill(ctx, L + 48, T + 18, RANKS[ri].name, COL.cyan);
      Gfx.text(ctx, nr ? `신뢰 ${s.trust} / ${nr.need}` : `신뢰 ${s.trust} (최고)`, L + 48, T + 32, C.sub, { small: true });
      // 능력치
      let yy = T + 50;
      STAT_KEYS.forEach((k, i) => {
        const cx = L + (i % 2) * 110, cy = yy + Math.floor(i / 2) * 15;
        Gfx.text(ctx, STAT_INFO[k].name, cx, cy, C.sub, { small: true });
        Gfx.text(ctx, String(s.stats[k]), cx + 32, cy, C.text, { small: true });
        for (let j = 0; j < 10; j++) { ctx.fillStyle = j < s.stats[k] ? C.accent : C.track; ctx.fillRect(cx + 46 + j * 5, cy + 4, 4, 3); }
      });
      yy += 50;
      UI.divider(ctx, L, yy - 3, 208);
      const row = (k, v, i) => { Gfx.text(ctx, k, L + (i % 2) * 110, yy + Math.floor(i / 2) * 12, C.mute, { small: true }); Gfx.text(ctx, v, L + (i % 2) * 110 + 98, yy + Math.floor(i / 2) * 12, C.sub, { small: true, align: 'right' }); };
      row('최대 체력', String(D.maxHp), 0); row('최대 정신력', String(D.maxSan), 1);
      row('공격 배율', 'x' + D.atkMul.toFixed(2), 2); row('치명타', Math.round(D.crit * 100) + '%', 3);
      row('뒷면 시야', String(Math.round(D.light)), 4); row('정신 소모', D.drain.toFixed(1) + '/초', 5);
      // 오른쪽 게이지
      const gx = x + w - 112, gy = T;
      UI.card(ctx, gx - 8, gy - 2, 112, 128, { fill: 'rgba(255,255,255,0.03)', border: C.line });
      const meter = (label, v, max, col, i) => {
        const yy2 = gy + 4 + i * 24;
        Gfx.text(ctx, label, gx, yy2, col, { small: true });
        Gfx.text(ctx, `${Math.round(v)}`, gx + 94, yy2, C.sub, { small: true, align: 'right' });
        UI.bar(ctx, gx, yy2 + 13, 94, 3, v / max, col);
      };
      meter('의심도', s.suspicion, 100, COL.orange, 0);
      meter('오염도', s.contamination, 100, COL.pink, 1);
      meter('진실 조각', s.truths.length, 10, COL.cyan, 2);
      Gfx.text(ctx, `은닉 ${s.stash.length} · 흡수 ${s.absorbed.length}`, gx, gy + 78, C.sub, { small: true });
      Gfx.text(ctx, `제출 ${s.submitted} · 임무 ${s.record.missions}`, gx, gy + 90, C.sub, { small: true });
      Gfx.text(ctx, `마음 지도 ${s.skills.length - 1} · SP ${s.sp || 0}`, gx, gy + 102, '#a99cff', { small: true });
      if (s.statPoints > 0) Gfx.text(ctx, `승급 포인트 ${s.statPoints}`, gx, gy + 114, COL.green, { small: true });
    } else {
      let yy = T;
      const head = (t, col) => { ctx.fillStyle = col; ctx.fillRect(L, yy + 3, 2, 8); Gfx.text(ctx, t, L + 6, yy, C.text, { bold: true }); yy += 16; };
      head('능력', COL.cyan);
      const abs = Object.keys(s.abilities).filter((k) => s.abilities[k]);
      if (!abs.length) { Gfx.text(ctx, '아티팩트를 "흡수"하면 얻을 수 있다.', L + 6, yy, C.mute, { small: true }); yy += 13; }
      for (const k of abs) { Gfx.text(ctx, ABILITIES[k].name, L + 6, yy, C.text, { small: true }); Gfx.text(ctx, ABILITIES[k].desc, L + 80, yy, C.sub, { small: true }); yy += 13; }
      yy += 4;
      head('장비', COL.yellow);
      const wpn = WEAPONS[s.weapon];
      Gfx.text(ctx, wpn.name, L + 6, yy, C.text, { small: true }); Gfx.text(ctx, wpn.desc, L + 80, yy, C.sub, { small: true }); yy += 13;
      for (const g of s.gear) { Gfx.text(ctx, GEAR[g].name, L + 6, yy, C.text, { small: true }); Gfx.text(ctx, GEAR[g].desc, L + 120, yy, C.sub, { small: true }); yy += 13; }
      yy += 4;
      head('흡수한 아티팩트', COL.pink);
      let ix = L + 6;
      for (const id of s.absorbed) { ctx.drawImage(SPR.icon[ARTIFACTS[id].icon], ix, yy); ix += 16; if (ix > x + w - 20) { ix = L + 6; yy += 16; } }
      if (!s.absorbed.length) Gfx.text(ctx, '없음', L + 6, yy, C.mute, { small: true });
    }
    UI.hints(ctx, x + w, y + h + 4, [['←→', '탭'], ['Z', '닫기']], 'right');
  }
}

// 휴대폰 홈 화면
class PhoneHome {
  constructor(apps, timeText, dateText) {
    this.apps = apps; this.timeText = timeText; this.dateText = dateText;
    this.sel = 0; this.t = 0; this.blockInput = 5;
    this.covers = true; this.wantsDim = true;
  }
  update() {
    this.t++;
    if (this.blockInput > 0) { this.blockInput--; return; }
    const n = this.apps.length, cols = 3;
    const prev = this.sel;
    if (Input.pressed('left')) this.sel = (this.sel - 1 + n) % n;
    if (Input.pressed('right')) this.sel = (this.sel + 1) % n;
    if (Input.pressed('up')) this.sel = (this.sel - cols + n) % n;
    if (Input.pressed('down')) this.sel = (this.sel + cols) % n;
    if (prev !== this.sel) Sound.play('menu');
    if (Input.pressed('confirm')) { Sound.play('select'); this.apps[this.sel].open(); }
    else if (Input.pressed('cancel') || Input.pressed('pause')) { Sound.play('cancel'); Game.pop(this); }
  }
  draw(ctx) {
    const W = 204, H = 210;
    const px = Math.round((VW - W) / 2), py = Math.round((VH - H) / 2);
    const S = drawPhoneFrame(ctx, px, py, W, H, '');
    // 시계
    if (!this.clock || this.clockKey !== this.timeText) { this.clock = Gfx.bigText(this.timeText, '#f4f0e6', 2, FONT_B, '#14102a'); this.clockKey = this.timeText; }
    ctx.drawImage(this.clock, Math.round(px + W / 2 - this.clock.width / 2), S.sy + 14);
    Gfx.text(ctx, this.dateText, px + W / 2, S.sy + 48, '#c8c4e0', { small: true, align: 'center' });
    // 앱 격자
    const cols = 3, cw = 56, ch = 46;
    const gx = px + Math.round((W - cols * cw) / 2), gy = S.sy + 70;
    this.apps.forEach((a, i) => {
      const cx = gx + (i % cols) * cw, cy = gy + Math.floor(i / cols) * ch;
      const sel = i === this.sel;
      const ix = cx + (cw - 22) / 2, iy = cy + (sel ? -1 : 0);
      if (sel) { UI.card(ctx, ix - 3, iy - 3, 28, 28, { fill: 'rgba(255,255,255,0.14)', border: '#ffffff' }); }
      ctx.drawImage(appIcon(a.icon), ix, iy);
      if (a.badge) {
        const b = String(a.badge);
        UI.card(ctx, ix + 15, iy - 4, Gfx.measure(ctx, b, { small: true }) + 7, 10, { fill: '#e0474c', border: false });
        Gfx.text(ctx, b, ix + 18, iy - 4, '#ffffff', { small: true });
      }
      Gfx.text(ctx, a.name, cx + cw / 2, cy + 26, sel ? '#ffffff' : '#b8b4cc', { small: true, align: 'center' });
    });
    // 선택 앱 설명
    const a = this.apps[this.sel];
    if (a && a.desc) {
      const dy = S.sy + S.sh - 30;
      ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fillRect(S.sx, dy, S.sw, 24);
      Gfx.para(ctx, a.desc, S.sx + 7, dy + 1, S.sw - 14, '#d8d4e8', { small: true, maxLines: 2, lh: 11 });
    }
    UI.hints(ctx, px + W + 8, py + H - 12, [['Z', '열기'], ['X', '닫기']], 'left');
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
