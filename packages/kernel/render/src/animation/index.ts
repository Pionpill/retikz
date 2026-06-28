/**
 * @retikz/render/animation 公开 API —— renderer 无关的动画播放基建
 *
 * 纯函数、零框架运行时：oklch 颜色插值（SVG 预采样 + Canvas 真 lerp 共用）+ 缓动注册表类型，
 * 以及 `evaluateTrack`（给时刻求值）+ 自定义 property 插值器注册表。
 */

export type { PropertyClass } from './channels';
export { classifyProperty, primHasStroke, resolveTransformOrigin } from './channels';
export { isAutoplayTrigger } from './channels';
export type { EvaluateTrackOptions } from './evaluate';
export { evaluateTrack } from './evaluate';
export type { IdClockRegistry } from './id-clock';
export { createIdClockRegistry } from './id-clock';
export { lerpColorOklch, sampleColorOklch } from './oklch';
export type { AnimationPropertyDefinition, AnimationPropertyRegistry } from './registry';
export type { AnimationControls, ClockOptions } from './runtime';
export {
  bindWaapiDescriptors,
  createClock,
  prefersReducedMotion,
  sceneAnimationDurationMs,
  sceneHasAnimations,
  sceneHasAutoplayTrigger,
} from './runtime';
export type { CubicBezier, EasingFn, EasingRegistry } from './types';
