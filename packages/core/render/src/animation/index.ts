/**
 * @retikz/render/animation 公开 API —— renderer 无关的动画播放基建
 *
 * 纯函数、零框架运行时：oklch 颜色插值（SVG 预采样 + Canvas 真 lerp 共用）+ 缓动注册表类型。
 * ADR-03 在此再加 `evaluateTrack`（给时刻求值）+ 自定义 property 插值器注册表。
 */

export { lerpColorOklch, sampleColorOklch } from './oklch';
export type { CubicBezier, EasingFn, EasingRegistry } from './types';
export { evaluateTrack } from './evaluate';
export type { EvaluateTrackOptions } from './evaluate';
export { classifyProperty, primHasStroke, resolveTransformOrigin } from './channels';
export type { PropertyClass } from './channels';
export type { AnimationPropertyDefinition, AnimationPropertyRegistry } from './registry';
export {
  createClock,
  prefersReducedMotion,
  sceneHasAnimations,
  sceneHasAutoplayTrigger,
  sceneAnimationDurationMs,
  bindWaapiDescriptors,
} from './runtime';
export { isAutoplayTrigger } from './channels';
export type { AnimationControls, ClockOptions } from './runtime';
export { createIdClockRegistry } from './idClock';
export type { IdClockRegistry } from './idClock';
