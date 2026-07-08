/**
 * @retikz/vanilla 公开 API —— framework-free runtime / SSR 入口 + plain spec helpers
 *
 * 无框架 / SSR 的 runtime 门面：组合 `@retikz/render/svg`（descriptor / 字符串）与 `@retikz/render/canvas`（后置），
 * 不自维护第二套 Scene→输出内核。`renderToSvgString` 走 SSR（零 DOM）；`mount` / `mountSvg` / `mountCanvas`
 * 走浏览器挂载。`figure` / `layer` / `node` / `path` / `coordinate` / `scope` / `embed` 是 plain spec helper；
 * 旧命令式 builder 仅以 `legacyFigure` / `draw` 形态保留迁移入口。
 * 模块顶层不触碰任何 DOM 全局——`import` 在纯 Node 下安全。
 */
export { hydrate } from './hydrate';
export type { MountRenderer, MountUnifiedOptions } from './mount';
export { mount } from './mount';
export { mountCanvas } from './mount-canvas';
export { mountSvg } from './mount-svg';
export { renderToSvgString } from './render-to-svg-string';
// 透传 render 层水合 runtime 类型，方便 vanilla 用户单包 import（事件名 / 注册表 / handler context 类型）
export type {
  HydrationAnimationControls,
  HydrationContext,
  HydrationGeometry,
  HydrationHandler,
  HydrationHandlers,
  RetikzEventValue,
} from '@retikz/render/hydration';
// 具名动画 preset（产 AnimationTrack 的纯工厂，re-export 自 core；配 IR / builder 的 animations）
export type {
  AnimationPresetOptions,
  BlinkOptions,
  CameraToOptions,
  ColorShiftOptions,
  FlashOptions,
  GrowUpOptions,
  LoopOptions,
  PulseOptions,
  ScaleInOptions,
  SlideInOptions,
  SpinOptions,
  WiggleOptions,
} from '@retikz/core';
export {
  blink,
  cameraTo,
  colorShift,
  drawOn,
  fadeIn,
  flash,
  grow,
  growUp,
  loop,
  pulse,
  scaleIn,
  slideIn,
  spin,
  stagger,
  wiggle,
} from '@retikz/core';
// 透传 core 的 way 关键字常量与字面量类型，方便 vanilla 用户单包 import（与 react 对齐）
export type { WayCycle, WayDSL, WayItem, WayLabel, WayLabelOp, WayRelativeItem, WayVia } from '@retikz/core';
export { DrawWay } from '@retikz/core';
// 结构化 Target / Anchor 对象形态：用户写对象 target 时有类型
export type { IRAnchorRef, IRNodeTarget } from '@retikz/core';
// 扩展面：自定义箭头 / pattern motif / 路径生成器注册——vanilla 用户单包 import 即可定义并注入
export type {
  ArrowDefinition,
  ArrowEmitContext,
  BoundaryDefinition,
  BoundaryDefinitionInput,
  ClipDefinition,
  ClipDefinitionInput,
  ClipResolveContext,
  IRJsonObject,
  MarkerFill,
  MarkerPrimitive,
  PathGeneratorDefinition,
  PathGeneratorGenerateContext,
  PathKindCompileContext,
  PathKindDefinition,
  PatternDefinition,
  PatternEmitContext,
  RibbonWidthProfileContext,
  RibbonWidthProfileDefinition,
  RibbonWidthProfileDefinitionInput,
} from '@retikz/core';
export {
  defineArrow,
  defineBoundary,
  defineClip,
  definePathGenerator,
  definePathKind,
  definePattern,
  defineRibbonWidthProfile,
} from '@retikz/core';
// 动画扩展类型（构造 mountCanvas 的 animationProperties / easings 用，re-export 自 render）
export { draw } from './builder/draw';
export { figure as legacyFigure } from './builder/figure';
export type { ScopeBuilder } from './builder/scope';
export type {
  Child,
  CoordinateConfig,
  DrawConfig,
  FigureConfig,
  FigureRootStyle,
  NodeConfig,
  ScopeConfig,
  Way,
} from './builder/types';
export type { Figure } from './figure';
export type {
  VanillaChildSpec,
  VanillaEmbedContext,
  VanillaEmbedSpec,
  VanillaFigureSpec,
  VanillaLayerCacheValue,
  VanillaLayerMeta,
  VanillaLayerSpec,
  VanillaRuntimeMeta,
  VanillaTier2Adapter,
  VanillaTier2Contribution,
} from './spec';
export { coordinate, embed, figure, layer, node, path, scope, VanillaLayerCache } from './spec';
export type {
  AnimationControls,
  CanvasView,
  CommonOptions,
  HydrateOptions,
  HydrationHandle,
  MountCanvasOptions,
  MountOptions,
  RenderInput,
  RenderToStringOptions,
  ScenePoint,
  VanillaView,
} from './types';
export type {
  AnimationPropertyDefinition,
  AnimationPropertyRegistry,
  CubicBezier,
  EasingFn,
  EasingRegistry,
} from '@retikz/render/animation';
