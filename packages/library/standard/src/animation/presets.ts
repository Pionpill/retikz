import type { AnimationPresetOptions, IRAnimationOrigin, IRAnimationTrack, ScaleInOptions } from '@retikz/core';
import { AnimationProperty, scaleIn } from '@retikz/core';

/** 把公共项叠到 track（duration/easing 取 opts 覆盖否则 preset 默认；delay/trigger 仅在给定时写入） */
const applyBase = (
  base: { duration: number; easing: NonNullable<IRAnimationTrack['easing']> },
  opts: AnimationPresetOptions,
): Pick<IRAnimationTrack, 'duration' | 'easing' | 'delay' | 'trigger'> => ({
  duration: opts.duration ?? base.duration,
  easing: opts.easing ?? base.easing,
  ...(opts.delay !== undefined ? { delay: opts.delay } : {}),
  ...(opts.trigger !== undefined ? { trigger: opts.trigger } : {}),
});

/** 从无到有放大：`scaleIn` 的 `from: 0` 别名 */
export const grow = (opts: Omit<ScaleInOptions, 'from'> = {}): IRAnimationTrack => scaleIn({ ...opts, from: 0 });

/** `growUp` 选项：支点 `origin`（缺省底边中点，柱状图从基线长出） */
export type GrowUpOptions = AnimationPresetOptions & {
  /** 缩放支点；缺省 'bottom'（底边中点） */
  origin?: IRAnimationOrigin;
};

/** 从基线长出：`scaleY` 0→1，支点底边（柱状图入场） */
export const growUp = (opts: GrowUpOptions = {}): IRAnimationTrack => ({
  property: AnimationProperty.ScaleY,
  keyframes: [
    { at: 0, value: 0 },
    { at: 1, value: 1 },
  ],
  origin: opts.origin ?? 'bottom',
  ...applyBase({ duration: 500, easing: 'ease-out' }, opts),
});

/** `pulse` 选项：峰值缩放 + 支点 */
export type PulseOptions = AnimationPresetOptions & {
  /** 峰值缩放；缺省 1.1 */
  peak?: number;
  /** 缩放支点（缺省几何中心） */
  origin?: IRAnimationOrigin;
};

/** 脉冲：`scale` 1→peak→1 无限循环（强调 / 心跳） */
export const pulse = (opts: PulseOptions = {}): IRAnimationTrack => ({
  property: AnimationProperty.Scale,
  keyframes: [
    { at: 0, value: 1 },
    { at: 0.5, value: opts.peak ?? 1.1 },
    { at: 1, value: 1 },
  ],
  iterations: 'infinite',
  ...(opts.origin !== undefined ? { origin: opts.origin } : {}),
  ...applyBase({ duration: 1000, easing: 'ease-in-out' }, opts),
});

/** `spin` 选项：旋转支点 */
export type SpinOptions = AnimationPresetOptions & {
  /** 旋转支点（缺省几何中心） */
  origin?: IRAnimationOrigin;
};

/** 旋转：`rotate` 0→360 无限循环、匀速（loader） */
export const spin = (opts: SpinOptions = {}): IRAnimationTrack => ({
  property: AnimationProperty.Rotate,
  keyframes: [
    { at: 0, value: 0 },
    { at: 1, value: 360 },
  ],
  iterations: 'infinite',
  ...(opts.origin !== undefined ? { origin: opts.origin } : {}),
  ...applyBase({ duration: 1000, easing: 'linear' }, opts),
});

/** `flash` 选项：谷值不透明度 + 闪烁次数 */
export type FlashOptions = AnimationPresetOptions & {
  /** 闪烁谷值不透明度；缺省 0 */
  dim?: number;
  /** 闪烁次数；缺省 2 */
  iterations?: IRAnimationTrack['iterations'];
};

/** 闪一下强调：`opacity` 1→dim→1，默认闪 2 次（末帧 = base = 完整可见） */
export const flash = (opts: FlashOptions = {}): IRAnimationTrack => ({
  property: AnimationProperty.Opacity,
  keyframes: [
    { at: 0, value: 1 },
    { at: 0.5, value: opts.dim ?? 0 },
    { at: 1, value: 1 },
  ],
  iterations: opts.iterations ?? 2,
  ...applyBase({ duration: 300, easing: 'ease-in-out' }, opts),
});

/** `blink` 选项：谷值不透明度 + 闪烁次数（缺省无限） */
export type BlinkOptions = AnimationPresetOptions & {
  /** 闪烁谷值不透明度；缺省 0 */
  dim?: number;
  /** 闪烁次数；缺省 'infinite' */
  iterations?: IRAnimationTrack['iterations'];
};

/** 持续闪烁：`opacity` 1→dim→1 无限循环（blink = 无限版 flash） */
export const blink = (opts: BlinkOptions = {}): IRAnimationTrack => ({
  property: AnimationProperty.Opacity,
  keyframes: [
    { at: 0, value: 1 },
    { at: 0.5, value: opts.dim ?? 0 },
    { at: 1, value: 1 },
  ],
  iterations: opts.iterations ?? 'infinite',
  ...applyBase({ duration: 800, easing: 'ease-in-out' }, opts),
});

/** `wiggle` 选项：抖动幅度（度）+ 支点 + 抖动次数 */
export type WiggleOptions = AnimationPresetOptions & {
  /** 抖动幅度（度）；缺省 5 */
  angle?: number;
  /** 旋转支点（缺省几何中心） */
  origin?: IRAnimationOrigin;
  /** 抖动次数；缺省 3 */
  iterations?: IRAnimationTrack['iterations'];
};

/** 抖动强调：`rotate` 0→+a→−a→+a→0 来回摆（末帧 = base 不旋转） */
export const wiggle = (opts: WiggleOptions = {}): IRAnimationTrack => {
  const angle = opts.angle ?? 5;
  return {
    property: AnimationProperty.Rotate,
    keyframes: [
      { at: 0, value: 0 },
      { at: 0.25, value: angle },
      { at: 0.5, value: -angle },
      { at: 0.75, value: angle },
      { at: 1, value: 0 },
    ],
    iterations: opts.iterations ?? 3,
    ...(opts.origin !== undefined ? { origin: opts.origin } : {}),
    ...applyBase({ duration: 400, easing: 'ease-in-out' }, opts),
  };
};
