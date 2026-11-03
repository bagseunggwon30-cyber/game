'use strict';
// ───────────────────────── 공용 상수 / 유틸 ─────────────────────────
const VW = 384;            // 내부 해상도 가로
const VH = 216;            // 내부 해상도 세로
const TS = 16;             // 타일 크기
const FPS = 60;

function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
function lerp(a, b, t) { return a + (b - a) * t; }
function approach(v, t, d) { return v < t ? Math.min(v + d, t) : Math.max(v - d, t); }
function sign(v) { return v > 0 ? 1 : v < 0 ? -1 : 0; }
function rnd(a, b) { return a + Math.random() * (b - a); }
function rndi(a, b) { return Math.floor(a + Math.random() * (b - a + 1)); }
function pickR(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function dist(ax, ay, bx, by) { const dx = bx - ax, dy = by - ay; return Math.sqrt(dx * dx + dy * dy); }
function overlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

// 시드 고정 난수 (mulberry32)
class RNG {
  constructor(seed) { this.s = (seed >>> 0) || 1; }
  next() {
    let t = (this.s += 0x6D2B79F5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  range(a, b) { return a + this.next() * (b - a); }
  int(a, b) { return Math.floor(a + this.next() * (b - a + 1)); }
  chance(p) { return this.next() < p; }
  pick(arr) { return arr[Math.floor(this.next() * arr.length)]; }
  weighted(list) { // [[item, weight], ...]
    let total = 0;
    for (const [, w] of list) total += w;
    let r = this.next() * total;
    for (const [it, w] of list) { if ((r -= w) <= 0) return it; }
    return list[list.length - 1][0];
  }
  shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(this.next() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }
}

function won(n) {
  const neg = n < 0;
  return (neg ? '-₩' : '₩') + Math.abs(Math.round(n)).toLocaleString('ko-KR');
}

// 한국어 조사 선택: josa('하람', '이/가') → '하람이'
function josa(word, pair) {
  const [withF, withoutF] = pair.split('/');
  const ch = word.charCodeAt(word.length - 1);
  if (ch < 0xAC00 || ch > 0xD7A3) return word + withoutF;
  const jong = (ch - 0xAC00) % 28;
  if (pair === '으로/로' && jong === 8) return word + '로';
  return word + (jong ? withF : withoutF);
}

// 캔버스 텍스트 자동 줄바꿈 (한글은 글자 단위, 공백 우선)
function wrapText(ctx, text, maxW) {
  const out = [];
  for (const para of String(text).split('\n')) {
    if (para === '') { out.push(''); continue; }
    let line = '';
    let lastSpace = -1;
    for (let i = 0; i < para.length; i++) {
      const ch = para[i];
      const test = line + ch;
      if (ctx.measureText(test).width > maxW && line.length > 0) {
        if (ch !== ' ' && lastSpace > 0 && lastSpace > line.length - 8) {
          out.push(line.slice(0, lastSpace));
          line = line.slice(lastSpace + 1) + ch;
        } else {
          out.push(line);
          line = ch === ' ' ? '' : ch;
        }
        lastSpace = -1;
      } else {
        if (ch === ' ') lastSpace = line.length;
        line = test;
      }
    }
    out.push(line);
  }
  return out;
}

const Storage = {
  get(key) {
    try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : null; } catch (e) { return null; }
  },
  set(key, val) {
    try { localStorage.setItem(key, JSON.stringify(val)); return true; } catch (e) { return false; }
  },
  del(key) { try { localStorage.removeItem(key); } catch (e) { /* 무시 */ } },
};
