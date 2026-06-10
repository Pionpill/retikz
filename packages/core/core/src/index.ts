/**
 * @retikz/core 公开 API
 * @description 任何 framework adapter（@retikz/react、@retikz/vue、@retikz/render/canvas、@retikz/ssr）只能 import 本文件导出内容，不准走子路径。本包零 React/零 DOM 依赖
 */

// IR
export {
  PositionSchema,
  PolarPositionSchema,
  AtPositionSchema,
  OffsetPositionSchema,
  AtDirection,
  TargetSchema,
  AnchorRefSchema,
  NodeTargetSchema,
  RelativeTargetSchema,
  RelativeAccumulateTargetSchema,
  AbsoluteTargetSchema,
  BetweenPositionSchema,
  MoveStepSchema,
  LineStepSchema,
  FoldStepSchema,
  CycleStepSchema,
  CurveStepSchema,
  CubicStepSchema,
  BendStepSchema,
  ArcStepSchema,
  CirclePathStepSchema,
  EllipsePathStepSchema,
  RectangleStepSchema,
  GeneratorStepSchema,
  ControlPointSchema,
  StepLabelSchema,
  StepSchema,
  NodeSchema,
  NodeLabelSchema,
  ShapeRefSchema,
  CoordinateSchema,
  FontSchema,
  TextBlockSchema,
  LineSpecSchema,
  PathSchema,
  ArrowDetailSchema,
  ArrowEndDetailSchema,
  ScopeSchema,
  CompositeBaseSchema,
  NodeDefaultSchema,
  PathDefaultSchema,
  LabelDefaultSchema,
  ArrowDefaultSchema,
  TransformSchema,
  ChildSchema,
  SceneSchema,
  CURRENT_IR_VERSION,
  PaintSpecSchema,
  GradientStopSchema,
  JsonValueSchema,
  JsonObjectSchema,
  ClipSpecSchema,
  ViewBoxSchema,
} from './ir';
export type {
  IRPosition,
  IRAtPosition,
  IROffsetPosition,
  AtDirectionValue,
  IRTarget,
  IRAnchorRef,
  IRNodeTarget,
  IRRelativeTarget,
  IRRelativeAccumulateTarget,
  IRAbsoluteTarget,
  IRBetweenPosition,
  IRMoveStep,
  IRLineStep,
  IRFoldStep,
  IRCycleStep,
  IRCurveStep,
  IRCubicStep,
  IRBendStep,
  IRArcStep,
  IRCirclePathStep,
  IREllipsePathStep,
  IRRectangleStep,
  IRGeneratorStep,
  IRControlPoint,
  IRStepLabel,
  IRStep,
  IRNode,
  IRNodeLabel,
  IRShapeRef,
  IRCoordinate,
  IRFont,
  IRLineSpec,
  IRTextBlock,
  IRPath,
  IRScope,
  IRComposite,
  IRNodeDefault,
  IRPathDefault,
  IRLabelDefault,
  IRArrowDefault,
  StyleChannel,
  IRTransform,
  IRTranslateTransform,
  IRPolarTranslateTransform,
  IRAtTranslateTransform,
  IROffsetTranslateTransform,
  IRRotateTransform,
  IRScaleTransform,
  IRChild,
  IR,
  ArrowShapeValue,
  BuiltinArrowName,
  ArrowShapeName,
  IRArrowDetail,
  IRArrowEndDetail,
  NodeShape,
  BuiltinShapeName,
  BuiltinShapeValue,
  NodeTextAlignValue,
  PatternShapeValue,
  PatternShapeName,
  BuiltinPatternName,
  IRPaintSpec,
  IRGradientStop,
  JsonValue,
  IRJsonObject,
  IRClipSpec,
  IRViewBox,
} from './ir';
export {
  ArrowShape,
  DEFAULT_ARROW_SHAPE,
  HOLLOW_ARROW_SHAPES,
  ARROW_MARKER_DEFAULT_SIZE,
  ARROW_MARKER_HOLLOW_DEFAULT_LINE_WIDTH,
  BuiltinShape,
  NodeTextAlign,
  PatternShape,
  Boundary,
  BoundarySchema,
  AnimationProperty,
  AnimationEasing,
  AnimationDirection,
  AnimationFill,
  AnimationTrigger,
  AnimationTrackSchema,
  KeyframeSchema,
  TriggerSchema,
  EasingSchema,
  OriginSchema,
} from './ir';
export type { BoundaryValue, IRBoundary } from './ir';
export type {
  BuiltinAnimationProperty,
  AnimationPropertyRef,
  AnimationEasingValue,
  AnimationDirectionValue,
  AnimationFillValue,
  AnimationTriggerValue,
  IRAnimationTrack,
  IRKeyframe,
  IRAnimationTrigger,
  IRAnimationOrigin,
} from './ir';

// Primitive (Scene 数据模型)
export type {
  ScenePrimitive,
  RectPrim,
  EllipsePrim,
  TextPrim,
  TextLine,
  PathPrim,
  PathCommand,
  /** 7 个 named PathCommand 分支（便于 wrapper / Pick<>） */
  MovePathCommand,
  LinePathCommand,
  QuadPathCommand,
  CubicPathCommand,
  ArcPathCommand,
  EllipseArcPathCommand,
  ClosePathCommand,
  ArrowEndSpec,
  GroupPrim,
  Transform,
  /** 3 个 named Transform 分支 */
  TranslateTransform,
  RotateTransform,
  ScaleTransform,
  Layout,
  Scene,
  PaintValue,
  SceneResource,
  PaintResource,
  /** 裁剪资源（renderer-agnostic，adapter 物化 `<clipPath>`） */
  ClipResource,
  ClipShape,
  /** 已解析 pattern tile（emit-in-compile 产物，进 Scene 资源，纯数据无函数） */
  ResolvedPatternTile,
  /** marker 窄子集（ArrowDefinition.emit 产物，renderer-agnostic） */
  MarkerPrimitive,
  MarkerPathPrim,
  MarkerEllipsePrim,
  MarkerRectPrim,
  MarkerGroupPrim,
  MarkerPathCommand,
  MarkerFill,
} from './primitive';

// Compile (IR → Scene)
export type {
  FontSpec,
  TextMetrics,
  TextMeasurer,
  CompileOptions,
  CompileWarning,
} from './compile';
export { computeLayout, fallbackMeasurer, compileToScene } from './compile';

// Parsers
export type {
  WayItem,
  WayDSL,
  WayCycle,
  WayVia,
  WayRelativeItem,
  WayLabel,
  WayLabelOp,
} from './parsers';
export { parseWay, DrawWay, parseTargetSugar, parseNodeTarget } from './parsers';

// Presets（具名动画 sugar：产 AnimationTrack 的纯工厂）
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
} from './presets';
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
} from './presets';

export type {
  Position,
  CompassAnchorValue,
  AnchorInput,
  WebAnchorValue,
  Rect,
  Circle,
  Ellipse,
  Diamond,
  PolarPosition,
} from './geometry';
export {
  point,
  CompassAnchor,
  WebAnchor,
  isCompassAnchorInput,
  normalizeCompassAnchor,
  rect,
  circle,
  ellipse,
  diamond,
  polar,
} from './geometry';

// Shapes (Shape Registry 扩展面：第三方 shape 注入 + 内置注册项 + 作者所需 helper)
export type { ShapeDefinition, ShapeDefinitionInput, ShapeStyle } from './shapes';
export { BUILTIN_SHAPES, defineShape, worldToLocal, localToWorld } from './shapes';

// Arrows (Arrow Registry 扩展面：第三方 arrow 注入 + 内置注册项)
export type { ArrowDefinition, ArrowEmitContext } from './arrows';
export { BUILTIN_ARROWS } from './arrows';

// Patterns (Pattern Registry 扩展面：第三方 pattern motif 注入 + 内置注册项)
export type { PatternDefinition, PatternEmitContext } from './patterns';
export { BUILTIN_PATTERNS } from './patterns';

// Path Generators (Path Generator Registry 扩展面：第三方曲线生成器注入；core 无内置)
export type { PathGeneratorDefinition, PathGeneratorContext } from './path-generators';
export { definePathGenerator } from './path-generators';

// Composites (Tier 2 注册面：domain 节点 schema + 展开逻辑；core 无内置)
export type { CompositeDefinition } from './composites';
export { defineComposite } from './composites';

// Type utilities
export type { ValueOf, AssertEqual } from './types';
