'use strict';
// ───────────────────────── 입력 (키보드 + 게임패드 + 터치) ─────────────────────────
const KEYMAP = {
  left: ['ArrowLeft', 'KeyA', 'T_left', 'G_left'],
  right: ['ArrowRight', 'KeyD', 'T_right', 'G_right'],
  up: ['ArrowUp', 'KeyW', 'T_up', 'G_up'],
  down: ['ArrowDown', 'KeyS', 'T_down', 'G_down'],
  jump: ['KeyZ', 'Space', 'T_a', 'G_a'],
  attack: ['KeyX', 'KeyJ', 'T_b', 'G_x'],
  flip: ['KeyC', 'KeyK', 'T_c', 'G_y'],
  item: ['KeyV', 'KeyL', 'T_d', 'G_rb'],
  cycle: ['KeyQ', 'Tab', 'G_lb'],
  dash: ['ShiftLeft', 'ShiftRight', 'T_e', 'G_b', 'G_lt', 'G_rt'],
  interact: ['ArrowUp', 'KeyW', 'KeyE', 'T_up', 'G_up'],
  confirm: ['KeyZ', 'Enter', 'Space', 'KeyE', 'T_a', 'G_a'],
  cancel: ['KeyX', 'Escape', 'Backspace', 'T_b', 'G_b'],
  pause: ['Escape', 'KeyP', 'T_pause', 'G_start'],
  phone: ['KeyV', 'KeyQ', 'Tab', 'T_d', 'G_select', 'G_rb'],
};
// 표준 배치 게임패드 버튼 번호 → 코드
const PAD_BUTTONS = { 0: 'G_a', 1: 'G_b', 2: 'G_x', 3: 'G_y', 4: 'G_lb', 5: 'G_rb', 6: 'G_lt', 7: 'G_rt', 8: 'G_select', 9: 'G_start', 12: 'G_up', 13: 'G_down', 14: 'G_left', 15: 'G_right' };

const Input = {
  keys: new Set(),        // 현재 눌린 키 코드
  fresh: new Set(),       // 이번 업데이트 이전에 새로 눌린 키
  pressedActs: new Set(),
  downActs: new Set(),
  lastTap: { left: -999, right: -999 },
  tapDash: 0,             // 더블탭 대시 신호 (-1/1)
  frame: 0,
  anyKeyFresh: false,
  touchEnabled: false,
  padKeys: new Set(),     // 게임패드로 눌린 코드
  padId: '',

  init() {
    window.addEventListener('keydown', (e) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'Tab', 'Backspace'].includes(e.code)) e.preventDefault();
      if (!this.keys.has(e.code)) this.fresh.add(e.code);
      this.keys.add(e.code);
      Sound.unlock();
    });
    window.addEventListener('keyup', (e) => { this.keys.delete(e.code); });
    window.addEventListener('blur', () => { this.keys.clear(); });
    window.addEventListener('pointerdown', () => Sound.unlock());
    window.addEventListener('gamepadconnected', (e) => {
      this.padId = e.gamepad.id || '게임패드';
      if (typeof Game !== 'undefined' && Game.toast) Game.toast('게임패드 연결됨', '#62d6e8');
    });
    window.addEventListener('gamepaddisconnected', () => {
      this.padId = '';
      for (const c of this.padKeys) this.keys.delete(c);
      this.padKeys.clear();
      if (typeof Game !== 'undefined' && Game.toast) Game.toast('게임패드 연결 끊김', '#ff8a8a');
    });
    this.setupTouch();
  },

  // 게임패드 상태를 읽어 가상 키로 바꾼다
  pollPad() {
    if (!navigator.getGamepads) return;
    let pads;
    try { pads = navigator.getGamepads(); } catch (e) { return; }
    const now = new Set();
    for (const gp of pads) {
      if (!gp || !gp.connected) continue;
      if (!this.padId) this.padId = gp.id || '게임패드';
      gp.buttons.forEach((b, i) => { const c = PAD_BUTTONS[i]; if (c && (b.pressed || b.value > 0.5)) now.add(c); });
      const ax = gp.axes[0] || 0, ay = gp.axes[1] || 0;
      if (ax < -0.5) now.add('G_left'); if (ax > 0.5) now.add('G_right');
      if (ay < -0.6) now.add('G_up'); if (ay > 0.6) now.add('G_down');
    }
    for (const c of now) if (!this.padKeys.has(c)) { this.fresh.add(c); this.keys.add(c); }
    for (const c of this.padKeys) if (!now.has(c)) this.keys.delete(c);
    if (now.size && !this.padKeys.size && typeof Sound !== 'undefined') Sound.unlock();
    this.padKeys = now;
  },
  // 게임패드 진동 (터치 기기는 휴대폰 진동)
  rumble(strong, weak, ms) {
    if (typeof Settings !== 'undefined' && Settings.v.rumble === false) return;
    try {
      if (navigator.getGamepads) for (const gp of navigator.getGamepads()) {
        if (gp && gp.vibrationActuator && gp.vibrationActuator.playEffect) gp.vibrationActuator.playEffect('dual-rumble', { duration: ms, strongMagnitude: strong, weakMagnitude: weak });
      }
      if (this.touchEnabled && navigator.vibrate) navigator.vibrate(Math.round(ms * strong));
    } catch (e) { /* 지원하지 않는 기기 */ }
  },
  padName() {
    if (!this.padId) return '';
    return this.padId.replace(/\(.*?\)/g, '').trim().slice(0, 28) || '게임패드';
  },

  update() {
    this.pollPad();
    this.frame++;
    this.pressedActs.clear();
    this.downActs.clear();
    this.anyKeyFresh = this.fresh.size > 0;
    for (const act in KEYMAP) {
      const codes = KEYMAP[act];
      for (const c of codes) {
        if (this.keys.has(c)) this.downActs.add(act);
        if (this.fresh.has(c)) this.pressedActs.add(act);
      }
    }
    // 방향키 더블탭 → 대시
    this.tapDash = 0;
    for (const d of ['left', 'right']) {
      if (this.pressedActs.has(d)) {
        if (this.frame - this.lastTap[d] < 14) this.tapDash = d === 'left' ? -1 : 1;
        this.lastTap[d] = this.frame;
      }
    }
    this.fresh.clear();
  },

  down(act) { return this.downActs.has(act); },
  pressed(act) { return this.pressedActs.has(act); },
  consume(act) { this.pressedActs.delete(act); },
  clearAll() { this.pressedActs.clear(); },

  // ── 터치 컨트롤 ──
  setupTouch() {
    const isTouch = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0 && matchMedia('(pointer: coarse)').matches);
    const root = document.getElementById('touch');
    if (!root) return;
    if (!isTouch) { root.style.display = 'none'; return; }
    this.touchEnabled = true;
    root.style.display = 'block';
    root.querySelectorAll('[data-key]').forEach((el) => {
      const code = 'T_' + el.dataset.key;
      const on = (e) => {
        e.preventDefault();
        if (!this.keys.has(code)) this.fresh.add(code);
        this.keys.add(code);
        el.classList.add('on');
        Sound.unlock();
      };
      const off = (e) => { e.preventDefault(); this.keys.delete(code); el.classList.remove('on'); };
      el.addEventListener('pointerdown', on);
      el.addEventListener('pointerup', off);
      el.addEventListener('pointercancel', off);
      el.addEventListener('pointerleave', off);
      el.addEventListener('contextmenu', (e) => e.preventDefault());
    });
  },
};
