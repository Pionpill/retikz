/**
 * @retikz/vanilla 公开 API —— framework-free runtime / SSR 入口 + 命令式 builder
 *
 * 无框架 / SSR 的 runtime 门面：组合 `@retikz/render/svg`（descriptor / 字符串）与 `@retikz/render/canvas`（后置），
 * 不自维护第二套 Scene→输出内核。`renderToSvgString` 走 SSR（零 DOM）；`mountSvg` 走浏览器 DOM 挂载。
 * `figure`/`node`/`draw`/`coordinate`/`scope` 是命令式 builder：用具名图元 + 自定义 shape 构图、产同一份 IR。
 * 模块顶层不触碰任何 DOM 全局——`import` 在纯 Node 下安全。
 */
export { renderToSvgString } from './render-to-svg-string';
export { mountSvg } from './mount-svg';
export { hydrate } from './hydrate';
export { mountCanvas } from './mount-canvas';
// 透传 render 层水合 runtime 类型，方便 vanilla 用户单包 import（事件名 / 注册表 / handler context 类型）
export type {
  RetikzEventValue,
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
// 透传 core 的 way 关键字常量与字面量类型，方便 vanilla 用户单包 import（与 react 对齐）
export { DrawWay } from '@retikz/core';
export type {
  WayItem,
  WayDSL,
  WayCycle,
  WayVia,
  WayRelativeItem,
  WayLabel,
  WayLabelOp,
} from '@retikz/core';
// 结构化 Target / Anchor 对象形态：用户写对象 target 时有类型
export type { IRNodeTarget, IRAnchorRef } from '@retikz/core';
// 扩展面：自定义箭头 / pattern motif / 路径生成器注册——vanilla 用户单包 import 即可定义并注入
export { defineArrow, definePattern, definePathGenerator } from '@retikz/core';
export type {
  ArrowDefinition,
  ArrowEmitContext,
  PatternDefinition,
  PatternEmitContext,
  MarkerPrimitive,
  MarkerFill,
  PathGeneratorDefinition,
  PathGeneratorContext,
  IRJsonObject,
} from '@retikz/core';
// 动画扩展类型（构造 mountCanvas 的 animationProperties / easings 用，re-export 自 render）
export type {
  AnimationPropertyDefinition,
  AnimationPropertyRegistry,
  CubicBezier,
  EasingFn,
  EasingRegistry,
} from '@retikz/render/animation';

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
  FigureRootStyle,
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
