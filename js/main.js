'use strict';
// ───────────────────────── 게임 루프 / 씬 관리 ─────────────────────────
const Game = {
  scene: null,
  modals: [],
  state: null,
  toasts: [],
  fade: { a: 0, dir: 0, speed: 0.05, cb: null },
  frame: 0,

  setScene(s) {
    if (this.scene && this.scene.exit) this.scene.exit();
    this.modals = [];
    this.scene = s;
    if (s.enter) s.enter();
  },
  push(m) { this.modals.push(m); },
  pop(m) {
    const i = this.modals.lastIndexOf(m);
    if (i >= 0) this.modals.splice(i, 1);
  },
  toast(text, col = COL.white) {
    this.toasts.push({ text, col, t: 170 });
    if (this.toasts.length > 4) this.toasts.shift();
  },
  fadeTo(cb, frames = 22) {
    if (this.fade.dir !== 0) return;
    this.fade.dir = 1; this.fade.speed = 1 / frames; this.fade.cb = cb;
  },

  update() {
    Input.update();
    this.frame++;
    if (this.fade.dir === 1) {
      this.fade.a += this.fade.speed;
      if (this.fade.a >= 1) {
        this.fade.a = 1; this.fade.dir = -1;
        const cb = this.fade.cb; this.fade.cb = null;
        if (cb) cb();
      }
      return;
    }
    if (this.fade.dir === -1) {
      this.fade.a -= this.fade.speed;
      if (this.fade.a <= 0) { this.fade.a = 0; this.fade.dir = 0; }
    }
    if (this.modals.length) {
      const top = this.modals[this.modals.length - 1];
      top.update();
      if (this.scene && this.scene.alwaysUpdate) this.scene.alwaysUpdate();
    } else if (this.scene) this.scene.update();
    for (const t of this.toasts) t.t--;
    this.toasts = this.toasts.filter((t) => t.t > 0);
  },

  draw() {
    const ctx = Gfx.b;
    ctx.imageSmoothingEnabled = false;
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    if (this.scene) this.scene.draw(ctx);
    for (const m of this.modals) m.draw(ctx);
    // 토스트 (화면 상단 HUD 아래)
    let y = 80;
    for (let i = this.toasts.length - 1; i >= 0; i--) {
      const t = this.toasts[i];
      const a = clamp(t.t / 20, 0, 1) * clamp((170 - t.t) / 8, 0, 1);
      ctx.globalAlpha = a;
      const w = Math.min(VW - 16, Gfx.measure(ctx, t.text, { small: true }) + 18);
      Gfx.panel(ctx, (VW - w) / 2, y - 2, w, 15, { fill: 'rgba(10,9,16,0.9)', edge: t.col, inner: false });
      Gfx.text(ctx, t.text, VW / 2, y, t.col, { small: true, align: 'center' });
      y += 17;
    }
    ctx.globalAlpha = 1;
    if (this.fade.a > 0) { ctx.fillStyle = `rgba(0,0,0,${this.fade.a})`; ctx.fillRect(0, 0, VW, VH); }
    Gfx.present();
  },
};

async function boot() {
  Input.init();
  Gfx.init();
  const loading = document.getElementById('loading');
  try {
    await Promise.race([
      Promise.all([document.fonts.load(FONT_M), document.fonts.load(FONT_S), document.fonts.load(FONT_B)]),
      new Promise((r) => setTimeout(r, 4000)),
    ]);
  } catch (e) { /* 폰트 로드 실패 시 시스템 글꼴 사용 */ }
  buildAllSprites();
  if (loading) loading.style.display = 'none';
  Game.setScene(new TitleScene());

  // 고정 60fps 업데이트
  let last = performance.now(), acc = 0;
  const step = 1000 / FPS;
  function loop(now) {
    acc += Math.min(250, now - last);
    last = now;
    let n = 0;
    while (acc >= step && n < 5) { Game.update(); acc -= step; n++; }
    if (n > 0) Game.draw();
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
  window.__game = Game;
}

window.addEventListener('load', boot);
