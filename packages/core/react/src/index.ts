/**
 * @retikz/react 公开 API
 *
 * Kernel 组件：<Layout> <Node> <Path> <Step> <Text> <Coordinate> <Scope>
 * Sugar 组件：<Draw> <EdgeLabel> + 形状 <Circle> <Ellipse> <Arc> <Sector> <Rectangle> <Grid> <RegularPolygon> <Star>
 *
 * 渲染管道：buildIR → compileToScene → renderPrim → SVG
 */

export { Layout, Node, Path, Step, Text, Coordinate, Scope, RendererModeProvider, useRendererMode, collectHydrationHandlers } from './kernel';
export type { RendererMode, HydrationEventProps } from './kernel';
// 透传 render 层水合 runtime 类型，方便 react 用户单包 import（事件名 / 注册表 / handler context 类型）
export type {
  RetikzEventValue,
  HydrationHandlers,
  HydrationHandler,
  HydrationContext,
  HydrationAnimationControls,
  HydrationGeometry,
} from '@retikz/render/hydration';
export type {
  LayoutProps,
  NodeProps,
  PathProps,
  StepProps,
  /** React DSL target：core `IRTarget` 对象 + 字符串 shorthand（仅 DSL 层，eager 转对象后入 IR） */
  DslTarget,
  /** 11 个 named Step kind props（按 IR `IR*Step` 命名对照） */
  MoveStepProps,
  LineStepProps,
  FoldStepProps,
  CycleStepProps,
  CurveStepProps,
  CubicStepProps,
  BendStepProps,
  ArcStepProps,
  CirclePathStepProps,
  EllipsePathStepProps,
  RectangleStepProps,
  TextProps,
  CoordinateProps,
  ScopeProps,
} from './kernel';

export {
  Draw,
  EdgeLabel,
  Circle,
  Ellipse,
  Arc,
  Sector,
  Rectangle,
  Grid,
  RegularPolygon,
  Star,
} from './sugar';
export type {
  DrawProps,
  EdgeLabelProps,
  CircleProps,
  EllipseProps,
  ArcProps,
  SectorProps,
  RectangleProps,
  GridProps,
  RegularPolygonProps,
  StarProps,
  AngleInput,
  BoxAdjustmentProps,
  PathVisualProps,
  ShapeBox,
} from './sugar';

// 透传 core 的 way 关键字常量与字面量类型，方便 react 用户单包 import
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

// 扩展面：自定义箭头 / pattern motif / 路径生成器注册——react 用户单包 import 即可定义并注入
// <Layout arrows / patterns / pathGenerators>
export { definePathGenerator } from '@retikz/core';
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

// 具名动画 preset（产 AnimationTrack 的纯工厂，re-export 自 core；配 <Node/Layout animations>）
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
// 动画扩展类型（构造 <Layout easings / animationProperties> 用，re-export 自 render）
export type {
  AnimationPropertyDefinition,
  AnimationPropertyRegistry,
  AnimationControls,
  CubicBezier,
  EasingFn,
  EasingRegistry,
} from '@retikz/render/animation';

// React 节点 ↔ IR 桥接：buildIR 内部名保留，对外以 convertReactNodeToIR 暴露（命名 pattern 给后续多框架 adapter 留位）
export { buildIR as convertReactNodeToIR } from './kernel/builder';
// IR JSON → Kernel element 树（带 key、不裹 TikZ/Fragment 外壳）；Sugar 不可逆——只产 <Node/>/<Path/>/<Step/> 三件套
export { convertIRToReactNode } from './kernel/unbuilder';
