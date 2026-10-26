/**
 * 共享插值引擎：给绝对时间求一条 track 当下值（renderer 无关、纯数学、无 DOM）
 * @description Canvas 逐帧、SVG 静态截帧 `{at:t}`、WAAPI JS fallback 都「给 t 求值」——一份引擎三处复用，
 *   避免漂移。处理 delay / iteration / direction / fill / easing（预设 / cubic-bezier）/ 段插值
 *   （数值线性、颜色 oklch 真 lerp、viewBox 4 元组分量线性）
 */
import type { IRAnimationTrack, IRKeyframe } from '@retikz/core';

import { lerpColorOklch } from './oklch';
import type { CubicBezier, EasingFn } from './types';

const LINEAR: EasingFn = t => t;

const NAMED_BEZIER: Record<Exclude<NonNullable<IRAnimationTrack['easing']>, CubicBezier | 'linear'>, CubicBezier> = {
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

/** 将缓动预设或贝塞尔控制点转换为缓动函数 */
const resolveEasingFn = (easing: IRAnimationTrack['easing']): EasingFn => {
  if (easing === undefined || easing === 'linear') return LINEAR;
  if (Array.isArray(easing)) return cubicBezier(easing[0], easing[1], easing[2], easing[3]);
  const named = NAMED_BEZIER[easing];
  return cubicBezier(named[0], named[1], named[2], named[3]);
};

/** 将受限动画进度约束到有效区间 */
const clampProgress = (value: number): number => Math.max(0, Math.min(1, value));

/** 按属性约束和段缓动计算相邻关键帧之间的值 */
const interpolateTrackSegment = (track: IRAnimationTrack, index: number, progress: number): IRKeyframe['value'] => {
  const eased = resolveEasingFn(track.keyframes[index].easing ?? track.easing)(progress);
  switch (track.property) {
    case 'fill':
    case 'stroke': {
      return lerpColorOklch(track.keyframes[index].value, track.keyframes[index + 1].value, eased);
    }
    case 'viewBox': {
      const from = track.keyframes[index].value;
      const to = track.keyframes[index + 1].value;
      const t = clampProgress(eased);
      return [
        from[0] + (to[0] - from[0]) * t,
        from[1] + (to[1] - from[1]) * t,
        from[2] + (to[2] - from[2]) * t,
        from[3] + (to[3] - from[3]) * t,
      ];
    }
    default: {
      const from = track.keyframes[index].value;
      const to = track.keyframes[index + 1].value;
      const value = from + (to - from) * eased;
      switch (track.property) {
        case 'opacity':
        case 'fillOpacity':
        case 'strokeOpacity':
        case 'pathDraw':
          return clampProgress(value);
        case 'strokeWidth':
          return Math.max(0, value);
        default:
          return value;
      }
    }
  }
};

/** 在一次迭代的归一化进度上读取轨道值 */
const valueAtProgress = (track: IRAnimationTrack, p: number): IRKeyframe['value'] => {
  const frames = track.keyframes;
  if (p < frames[0].at) return frames[0].value;
  const last = frames[frames.length - 1];
  if (p >= last.at) return last.value;
  let i = 0;
  while (i < frames.length - 1 && p >= frames[i + 1].at) i++;
  const span = frames[i + 1].at - frames[i].at;
  return interpolateTrackSegment(track, i, span > 0 ? (p - frames[i].at) / span : 0);
};

/** 按段采样缓动后的值，供 SVG 在样本之间线性插值 */
export const sampleAnimationTrack = (
  track: IRAnimationTrack,
): Array<{ offset: number; value: IRKeyframe['value'] }> => {
  const first = track.keyframes[0];
  const samples = [{ offset: 0, value: first.value }];
  if (first.at > 0) samples.push({ offset: first.at, value: first.value });
  for (let index = 0; index < track.keyframes.length - 1; index++) {
    const from = track.keyframes[index];
    const to = track.keyframes[index + 1];
    if (to.at === from.at) {
      samples.push({ offset: to.at, value: to.value });
      continue;
    }
    for (let step = 1; step <= 32; step++) {
      const progress = step / 32;
      samples.push({
        offset: from.at + (to.at - from.at) * progress,
        value: interpolateTrackSegment(track, index, progress),
      });
    }
  }
  const last = track.keyframes[track.keyframes.length - 1];
  if (last.at < 1) samples.push({ offset: 1, value: last.value });
  return samples;
};

/**
 * 给绝对时间 timeMs 求 track 当下值；返回 `null` 表示该时刻 track 不活动（caller 用 base、不施加）
 * @description 减 delay → 算迭代次序 + 迭代内进度 → 按 fill 处理活动区间外 → 按 direction 翻转 → 段插值
 */
export const evaluateTrack = (track: IRAnimationTrack, timeMs: number): { value: IRKeyframe['value'] } | null => {
  const dur = track.duration;
  const iterCount = track.iterations === 'infinite' ? Infinity : (track.iterations ?? 1);
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

  return { value: valueAtProgress(track, p) };
};
