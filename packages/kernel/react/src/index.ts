/**
 * @retikz/react 公开 API
 *
 * Kernel 组件：<Layout> <Node> <Path> <Step> <Text> <Coordinate> <Scope>
 * Sugar 组件：<Draw> <EdgeLabel> + 形状 <Circle> <Ellipse> <Arc> <Sector> <Rectangle> <Grid> <RegularPolygon> <Star>
 *
 * 渲染管道：buildIR → compileToScene → renderPrim → SVG
 */

export type { HydrationEventProps, RendererMode, RendererModeProviderProps } from './kernel';
export type {
  EmbeddableContribution,
  EmbeddableContributionRecord,
  EmbeddableDatasets,
  EmbeddableTier2Adapter,
} from './kernel';
export {
  collectHydrationHandlers,
  Coordinate,
  isEmbeddableMarked,
  Layout,
  Node,
  Path,
  RendererModeProvider,
  resolveEmbeddableAdapter,
  Scope,
  Step,
  Text,
  useRendererMode,
} from './kernel';
// 透传 render 层水合 runtime 类型，方便 react 用户单包 import（事件名 / 注册表 / handler context 类型）
export type {
  ArcStepProps,
  BendStepProps,
  CirclePathStepProps,
  CoordinateProps,
  CubicStepProps,
  CurveStepProps,
  CycleStepProps,
  /** React DSL target：core `IRTarget` 对象 + 字符串 shorthand（仅 DSL 层，eager 转对象后入 IR） */
  DslTarget,
  EllipsePathStepProps,
  FoldStepProps,
  LayoutProps,
  LineStepProps,
  /** 12 个 named Step kind props（按 IR `IR*Step` 命名对照） */
  MoveStepProps,
  NodeProps,
  PathProps,
  RectangleStepProps,
  ScopeProps,
  SmoothStepProps,
  StepProps,
  TextProps,
} from './kernel';
export type {
  AngleInput,
  ArcProps,
  BoxAdjustmentProps,
  CircleProps,
  DrawProps,
  EdgeLabelProps,
  EllipseProps,
  GridProps,
  PathVisualProps,
  RectangleProps,
  RegularPolygonProps,
  SectorProps,
  ShapeBox,
  StarProps,
} from './sugar';
export { Arc, Circle, Draw, EdgeLabel, Ellipse, Grid, Rectangle, RegularPolygon, Sector, Star } from './sugar';
export type {
  HydrationAnimationControls,
  HydrationContext,
  HydrationGeometry,
  HydrationHandler,
  HydrationHandlers,
  RetikzEventValue,
} from '@retikz/render/hydration';

// 透传 core 的 way 关键字常量与字面量类型，方便 react 用户单包 import
export type { WayCycle, WayDSL, WayItem, WayLabel, WayLabelOp, WayRelativeItem, WayVia } from '@retikz/core';
export { DrawWay } from '@retikz/core';

// 结构化 Target / Anchor 对象形态：用户写对象 target 时有类型
export type { IRAnchorRef, IRNodeTarget } from '@retikz/core';

// 扩展面：自定义箭头 / pattern motif / 路径生成器注册——react 用户单包 import 即可定义并注入
// <Layout arrows / patterns / pathGenerators / pathKinds>
export type {
  ArrowDefinition,
  ArrowEmitContext,
  BoundaryDefinition,
  BoundaryDefinitionInput,
  IRJsonObject,
  MarkerFill,
  MarkerPrimitive,
  PathGeneratorContext,
  PathGeneratorDefinition,
  PathKindCompileContext,
  PathKindDefinition,
  PatternDefinition,
  PatternEmitContext,
  RibbonWidthProfileContext,
  RibbonWidthProfileDefinition,
  RibbonWidthProfileInput,
} from '@retikz/core';
export {
  defineArrow,
  defineBoundary,
  definePathGenerator,
  definePathKind,
  definePattern,
  defineRibbonWidthProfile,
} from '@retikz/core';

// 具名动画 preset（产 AnimationTrack 的纯工厂，re-export 自 core；配 <Node/Layout animations>）
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
// 动画扩展类型（构造 <Layout easings / animationProperties> 用，re-export 自 render）
export type {
  AnimationControls,
  AnimationPropertyDefinition,
  AnimationPropertyRegistry,
  CubicBezier,
  EasingFn,
  EasingRegistry,
} from '@retikz/render/animation';

// React 节点 ↔ IR 桥接：buildIR 内部名保留，对外以 convertReactNodeToIR 暴露（命名 pattern 给后续多框架 adapter 留位）
export { buildIR as convertReactNodeToIR } from './kernel/builder';
// IR JSON → Kernel element 树（带 key、不裹 TikZ/Fragment 外壳）；Sugar 不可逆——只产 <Node/>/<Path/>/<Step/> 三件套
export { convertIRToReactNode } from './kernel/unbuilder';
