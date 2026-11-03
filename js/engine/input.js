'use strict';
// ───────────────────────── 입력 (키보드 + 터치) ─────────────────────────
const KEYMAP = {
  left: ['ArrowLeft', 'KeyA', 'T_left'],
  right: ['ArrowRight', 'KeyD', 'T_right'],
  up: ['ArrowUp', 'KeyW', 'T_up'],
  down: ['ArrowDown', 'KeyS', 'T_down'],
  jump: ['KeyZ', 'Space', 'T_a'],
  attack: ['KeyX', 'KeyJ', 'T_b'],
  flip: ['KeyC', 'KeyK', 'T_c'],
  item: ['KeyV', 'KeyL', 'T_d'],
  cycle: ['KeyQ', 'Tab'],
  dash: ['ShiftLeft', 'ShiftRight'],
  interact: ['ArrowUp', 'KeyW', 'KeyE', 'T_up'],
  confirm: ['KeyZ', 'Enter', 'Space', 'KeyE', 'T_a'],
  cancel: ['KeyX', 'Escape', 'Backspace', 'T_b'],
  pause: ['Escape', 'KeyP', 'T_pause'],
  phone: ['KeyV', 'KeyQ', 'Tab', 'T_d'],
};

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
    this.setupTouch();
  },

  update() {
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
