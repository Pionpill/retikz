/**
 * @retikz/vanilla 公开 API —— framework-free runtime / SSR 入口 + 命令式 builder
 *
 * 无框架 / SSR 的 runtime 门面：组合 `@retikz/render/svg`（descriptor / 字符串）与 `@retikz/render/canvas`（后置），
 * 不自维护第二套 Scene→输出内核。`renderToSvgString` 走 SSR（零 DOM）；`mountSvg` 走浏览器 DOM 挂载。
 * `figure`/`node`/`draw`/`coordinate`/`scope` 是命令式 builder：用具名图元 + 自定义 shape 构图、产同一份 IR。
 * 模块顶层不触碰任何 DOM 全局——`import` 在纯 Node 下安全。
 */
export { renderToSvgString } from './renderToSvgString';
export { mountSvg } from './mountSvg';
export { hydrate } from './hydrate';
export { mountCanvas } from './mountCanvas';
// 透传 render 层水合 runtime 类型，方便 vanilla 用户单包 import（事件名 / 注册表 / handler context 类型）
export type {
  RetikzEventName,
  HydrationHandlers,
  HydrationHandler,
  HydrationContext,
  HydrationAnimationControls,
  HydrationGeometry,
} from '@retikz/render/hydration';
// 具名动画 preset（产 AnimationTrack 的纯工厂，re-export 自 core；配 IR / builder 的 animations）
export {
  fadeIn,
  drawOn,
  scaleIn,
  grow,
  growUp,
  slideIn,
  colorShift,
  cameraTo,
  pulse,
  spin,
  loop,
  flash,
  blink,
  wiggle,
  stagger,
} from '@retikz/core';
export type {
  AnimationPresetOptions,
  ScaleInOptions,
  GrowUpOptions,
  SlideInOptions,
  ColorShiftOptions,
  CameraToOptions,
  PulseOptions,
  SpinOptions,
  LoopOptions,
  FlashOptions,
  BlinkOptions,
  WiggleOptions,
} from '@retikz/core';
export { figure } from './builder/figure';
export { node } from './builder/node';
export { draw } from './builder/draw';
export { coordinate } from './builder/coordinate';
export { scope } from './builder/scope';
export type { Figure } from './figure';
export type { ScopeBuilder } from './builder/scope';
export type {
  Child,
  NodeConfig,
  DrawConfig,
  CoordinateConfig,
  ScopeConfig,
  FigureConfig,
  Way,
} from './builder/types';
export type {
  RenderInput,
  CommonOptions,
  MountOptions,
  RenderToStringOptions,
  VanillaView,
  CanvasView,
  MountCanvasOptions,
  HydrateOptions,
  HydrationHandle,
  ScenePoint,
  AnimationControls,
} from './types';
