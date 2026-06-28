/** @retikz/render/canvas 公开 API */
export { drawScene } from './draw-scene';
export type { HitPoint, HitTestOptions } from './hit-test';
export { hitTest } from './hit-test';
export { renderToCanvas } from './render-to-canvas';
export type {
  CanvasWarning,
  DrawOptions,
  PrimAnimationResolution,
  RenderOptions,
  UnsupportedCanvasFeature,
} from './types';
// 动画自定义扩展类型（构造 DrawOptions.animationProperties / easings 用）
export type { AnimationPropertyDefinition, AnimationPropertyRegistry } from '../animation/registry';
export type { EasingRegistry } from '../animation/types';
