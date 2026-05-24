/**
 * @retikz/core 公开 API
 * @description 任何 framework adapter（@retikz/react、@retikz/vue、@retikz/canvas、@retikz/ssr）只能 import 本文件导出内容，不准走子路径。本包零 React/零 DOM 依赖
 */

// IR
export {
  PositionSchema,
  PolarPositionSchema,
  AtPositionSchema,
  OffsetPositionSchema,
  AT_DIRECTIONS,
  TargetSchema,
  AnchorRefSchema,
  NodeTargetSchema,
  RelativeTargetSchema,
  RelativeAccumulateTargetSchema,
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
  CoordinateSchema,
  FontSchema,
  TextBlockSchema,
  LineSpecSchema,
  PathSchema,
  ArrowDetailSchema,
  ArrowEndDetailSchema,
  ScopeSchema,
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
} from './ir';
export type {
  IRPosition,
  IRAtPosition,
  IROffsetPosition,
  AtDirection,
  IRTarget,
  IRAnchorRef,
  IRNodeTarget,
  IRRelativeTarget,
  IRRelativeAccumulateTarget,
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
  IRCoordinate,
  IRFont,
  IRLineSpec,
  IRTextBlock,
  IRPath,
  IRScope,
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
  ArrowShape,
  BuiltinArrowName,
  ArrowShapeName,
  IRArrowDetail,
  IRArrowEndDetail,
  NodeShape,
  BuiltinShapeName,
  NodeTextAlign,
  PatternShapeName,
  BuiltinPatternName,
  IRPaintSpec,
  IRGradientStop,
  JsonValue,
  IRJsonObject,
} from './ir';
export {
  ARROW_SHAPES,
  DEFAULT_ARROW_SHAPE,
  HOLLOW_ARROW_SHAPES,
  ARROW_MARKER_DEFAULT_SIZE,
  ARROW_MARKER_HOLLOW_DEFAULT_LINE_WIDTH,
  NODE_SHAPES,
  NODE_TEXT_ALIGNS,
  PATTERN_SHAPES,
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

// Geometry
// RECT_ANCHORS（const 集合，值）与 RectAnchor（派生 type）配对，名字不撞
export type {
  Position,
  Rect,
  RectAnchor,
  Circle,
  Ellipse,
  Diamond,
  PolarPosition,
} from './geometry';
export { point, rect, circle, ellipse, diamond, RECT_ANCHORS, polar } from './geometry';

// Shapes (Shape Registry 扩展面：第三方 shape 注入 + 内置注册项 + 作者所需 helper)
export type { ShapeDefinition, ShapeStyle } from './shapes';
export { BUILTIN_SHAPES, worldToLocal, localToWorld } from './shapes';

// Arrows (Arrow Registry 扩展面：第三方 arrow 注入 + 内置注册项)
export type { ArrowDefinition, ArrowEmitContext } from './arrows';
export { BUILTIN_ARROWS } from './arrows';

// Patterns (Pattern Registry 扩展面：第三方 pattern motif 注入 + 内置注册项)
export type { PatternDefinition, PatternEmitContext } from './patterns';
export { BUILTIN_PATTERNS } from './patterns';

// Path Generators (Path Generator Registry 扩展面：第三方曲线生成器注入；core 无内置)
export type { PathGeneratorDefinition, PathGeneratorContext } from './pathGenerators';
export { definePathGenerator } from './pathGenerators';

// Type utilities
export type { ValueOf, AssertEqual } from './types';
