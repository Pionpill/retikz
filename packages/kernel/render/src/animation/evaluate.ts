/**
 * 共享插值引擎：给绝对时间求一条 track 当下值（renderer 无关、纯数学、无 DOM）
 * @description Canvas 逐帧、SVG 静态截帧 `{at:t}`、WAAPI JS fallback 都「给 t 求值」——一份引擎三处复用，
 *   避免漂移。处理 delay / iteration / direction / fill / easing（具名 / cubic-bezier / 注册函数）/ 段插值
 *   （数值线性、颜色 oklch 真 lerp、viewBox 4 元组分量线性、自定义经注入插值器）。
 */
import type { IRAnimationTrack } from '@retikz/core';
import type { CubicBezier, EasingFn, EasingRegistry } from './types';
import { lerpColorOklch } from './oklch';

const LINEAR: EasingFn = t => t;
const NAMED_BEZIER: Record<string, CubicBezier | undefined> = {
  ease: [0.25, 0.1, 0.25, 1],
  'ease-in': [0.42, 0, 1, 1],
  'ease-out': [0, 0, 0.58, 1],
  'ease-in-out': [0.42, 0, 0.58, 1],
};

/** cubic-bezier(x1,y1,x2,y2) → 缓动函数（Newton-Raphson 解 x，回退二分） */
const cubicBezier = (x1: number, y1: number, x2: number, y2: number): EasingFn => {
  const cx = 3 * x1;
  const bx = 3 * (x2 - x1) - cx;
  const ax = 1 - cx - bx;
  const cy = 3 * y1;
  const by = 3 * (y2 - y1) - cy;
  const ay = 1 - cy - by;
  const sampleX = (t: number): number => ((ax * t + bx) * t + cx) * t;
  const sampleY = (t: number): number => ((ay * t + by) * t + cy) * t;
  const sampleDX = (t: number): number => (3 * ax * t + 2 * bx) * t + cx;
  const solveX = (x: number): number => {
    let t = x;
    for (let i = 0; i < 8; i++) {
      const dx = sampleX(t) - x;
      if (Math.abs(dx) < 1e-6) return t;
      const d = sampleDX(t);
      if (Math.abs(d) < 1e-6) break;
      t -= dx / d;
    }
    let lo = 0;
    let hi = 1;
    let tt = x;
    for (let i = 0; i < 20; i++) {
      const xv = sampleX(tt);
      if (Math.abs(xv - x) < 1e-6) return tt;
      if (x > xv) lo = tt;
      else hi = tt;
      tt = (lo + hi) / 2;
    }
    return tt;
  };
  return x => (x <= 0 ? 0 : x >= 1 ? 1 : sampleY(solveX(x)));
};

/** easing（具名 / cubic-bezier / 自定义注册名）→ 缓动函数；未知 → linear */
const resolveEasingFn = (easing: string | CubicBezier | undefined, registry: EasingRegistry | undefined): EasingFn => {
  if (easing === undefined || easing === 'linear') return LINEAR;
  if (Array.isArray(easing)) return cubicBezier(easing[0], easing[1], easing[2], easing[3]);
  const named = NAMED_BEZIER[easing];
  if (named) return cubicBezier(named[0], named[1], named[2], named[3]);
  const custom = registry?.[easing];
  if (Array.isArray(custom)) return cubicBezier(custom[0], custom[1], custom[2], custom[3]);
  if (typeof custom === 'function') return custom;
  return LINEAR;
};

/** evaluateTrack 选项：自定义 easing 注册表 + 自定义 property 插值器（内置类型不需要） */
export type EvaluateTrackOptions = {
  /** 自定义 easing 注册表 */
  easings?: EasingRegistry;
  /** 自定义 property 的插值器（内置数值 / 颜色 / 数组以外的值类型用） */
  interpolateCustom?: (from: unknown, to: unknown, t: number) => unknown;
};

/** 按值类型插值：数值线性 / 颜色 oklch / 数组分量 / 自定义经注入器（缺省 step） */
const interpolateValue = (
  from: unknown,
  to: unknown,
  t: number,
  interpolateCustom: EvaluateTrackOptions['interpolateCustom'],
): unknown => {
  if (typeof from === 'number' && typeof to === 'number') return from + (to - from) * t;
  if (typeof from === 'string' && typeof to === 'string') return lerpColorOklch(from, to, t);
  if (Array.isArray(from) && Array.isArray(to)) {
    return from.map((a, i) => (typeof a === 'number' && typeof to[i] === 'number' ? a + (to[i] - a) * t : a));
  }
  if (interpolateCustom) return interpolateCustom(from, to, t);
  return t < 1 ? from : to;
};

/** 在归一化进度 p 处定位 keyframe 段并插值（段内按 easing 映射） */
const valueAtProgress = (track: IRAnimationTrack, p: number, options: EvaluateTrackOptions): unknown => {
  const frames = track.keyframes;
  if (p <= frames[0].at) return frames[0].value;
  const last = frames[frames.length - 1];
  if (p >= last.at) return last.value;
  let i = 0;
  while (i < frames.length - 1 && !(p >= frames[i].at && p <= frames[i + 1].at)) i++;
  const a = frames[i];
  const b = frames[i + 1];
  const span = b.at - a.at;
  const u = span > 0 ? (p - a.at) / span : 0;
  const eased = resolveEasingFn(a.easing ?? track.easing, options.easings)(u);
  return interpolateValue(a.value, b.value, eased, options.interpolateCustom);
};

/**
 * 给绝对时间 timeMs 求 track 当下值；返回 `null` 表示该时刻 track 不活动（caller 用 base、不施加）
 * @description 减 delay → 算迭代次序 + 迭代内进度 → 按 fill 处理活动区间外 → 按 direction 翻转 → 段插值。
 */
export const evaluateTrack = (
  track: IRAnimationTrack,
  timeMs: number,
  options: EvaluateTrackOptions = {},
): { value: unknown } | null => {
  const dur = track.duration;
  const iterCount = track.iterations === 'infinite' ? Infinity : track.iterations ?? 1;
  const fill = track.fill ?? 'forwards';
  const local = timeMs - (track.delay ?? 0);

  let iterationIndex: number;
  let progress: number;
  if (local < 0) {
    if (fill === 'backwards' || fill === 'both') {
      iterationIndex = 0;
      progress = 0;
    } else {
      return null;
    }
  } else if (local >= dur * iterCount) {
    if (fill === 'forwards' || fill === 'both') {
      let finishedIter = Math.floor(iterCount);
      let finishedProgress = iterCount - finishedIter;
      if (finishedProgress === 0) {
        finishedIter -= 1;
        finishedProgress = 1;
      }
      iterationIndex = finishedIter;
      progress = finishedProgress;
    } else {
      return null;
    }
  } else {
    iterationIndex = Math.floor(local / dur);
    progress = local / dur - iterationIndex;
  }

  const direction = track.direction ?? 'normal';
  const reverse =
    direction === 'reverse' ||
    (direction === 'alternate' && iterationIndex % 2 === 1) ||
    (direction === 'alternate-reverse' && iterationIndex % 2 === 0);
  const p = reverse ? 1 - progress : progress;
  return { value: valueAtProgress(track, p, options) };
};
