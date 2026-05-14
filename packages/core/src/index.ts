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
  ChildSchema,
  SceneSchema,
  CURRENT_IR_VERSION,
} from './ir';
export type {
  IRPosition,
  IRAtPosition,
  IROffsetPosition,
  AtDirection,
  IRTarget,
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
  IRChild,
  IR,
  ArrowShape,
  IRArrowDetail,
  IRArrowEndDetail,
  NodeShape,
  NodeTextAlign,
} from './ir';
export {
  ARROW_SHAPES,
  HOLLOW_ARROW_SHAPES,
  ARROW_MARKER_DEFAULT_SIZE,
  ARROW_MARKER_HOLLOW_DEFAULT_LINE_WIDTH,
  NODE_SHAPES,
  NODE_TEXT_ALIGNS,
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
export { parseWay, DrawWay, parseTargetSugar } from './parsers';

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

// Type utilities
export type { ValueOf, AssertEqual } from './types';
