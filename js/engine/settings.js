'use strict';
// ───────────────────────── 환경 설정 (기기마다 저장) ─────────────────────────
const SETTINGS_KEY = 'backside_parttimer_settings_v1';
const TEXT_SPEEDS = [0.7, 1.4, 3, 999];
const TEXT_SPEED_NAMES = ['느리게', '보통', '빠르게', '즉시'];
const SHAKE_NAMES = ['끔', '약하게', '보통'];

const Settings = {
  v: { master: 7, music: 6, sfx: 8, shake: 2, calm: false, textSpeed: 1 },
  load() {
    const d = Storage.get(SETTINGS_KEY);
    if (d && typeof d === 'object') Object.assign(this.v, d);
    this.apply();
  },
  save() { Storage.set(SETTINGS_KEY, this.v); this.apply(); },
  apply() { if (typeof Sound !== 'undefined' && Sound.applyVolumes) Sound.applyVolumes(); },
  // 깜빡임·글리치 줄이기 (광과민성 배려)
  get calm() { return !!this.v.calm; },
  get shakeMul() { return [0, 0.5, 1][this.v.shake] ?? 1; },
  get textSpeed() { return TEXT_SPEEDS[this.v.textSpeed] ?? 1.4; },
};
