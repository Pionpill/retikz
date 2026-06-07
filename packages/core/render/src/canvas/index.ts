/** @retikz/render/canvas 公开 API */
export type { CanvasWarning, DrawOptions, PrimAnimationResolution, RenderOptions, UnsupportedCanvasFeature } from './types';
export type { HitPoint, HitTestOptions } from './hitTest';
export { drawScene } from './drawScene';
export { renderToCanvas } from './renderToCanvas';
export { hitTest } from './hitTest';
// 动画自定义扩展类型（构造 DrawOptions.animationProperties / easings 用）
export type { AnimationPropertyDefinition, AnimationPropertyRegistry } from '../animation/registry';
export type { EasingRegistry } from '../animation/types';
