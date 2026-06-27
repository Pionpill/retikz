/**
 * @retikz/core 公开 API
 * @description 任何 framework adapter（@retikz/react、@retikz/vue、@retikz/render/canvas、@retikz/ssr）只能 import 本文件导出内容，不准走子路径。本包零 React/零 DOM 依赖
 */

// Schemas
export {
  PositionSchema,
  Vector2Schema,
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
  FoldStepVia,
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
  GeometryLabelPlacement,
  GeometryLabelSchema,
  StepLabelSchema,
  StepSchema,
  NodeSchema,
  NodeLabelSchema,
  NodeLabelBoundaryPositionSchema,
  NodeLabelPlacement,
  NodeLabelBoundarySide,
  ShapeRefSchema,
  CoordinateSchema,
  FontSchema,
  TextBlockSchema,
  LineSpecSchema,
  PathBaseSchema,
  PathSchema,
  PathScaleSchema,
  RibbonDirectionSchema,
  RibbonArcCapSchema,
  RibbonCapSchema,
  PathRibbonOptionsSchema,
  RibbonWidthSchema,
  RibbonWidthStopSchema,
  ArrowMarkSchema,
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
  DropShadowSchema,
  TexContentSchema,
  JsonValueSchema,
  JsonObjectSchema,
  ClipSpecSchema,
  ViewBoxSchema,
  DrawableStyleSchema,
  DrawableMetaSchema,
} from './schemas';
export type {
  IRPosition,
  IRVector2,
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
  FoldStepViaValue,
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
  GeometryLabelPlacementValue,
  IRGeometryLabel,
  IRStepLabel,
  IRStep,
  IRNode,
  IRNodeLabel,
  IRNodeLabelBoundaryPosition,
  NodeLabelPlacementValue,
  NodeLabelBoundarySideValue,
  IRShapeRef,
  IRCoordinate,
  IRFont,
  IRLineSpec,
  IRTextBlock,
  IRPathBase,
  IRPath,
  IRPathScale,
  IRRibbonArcCap,
  IRRibbonCap,
  IRRibbonDirection,
  IRPathRibbonOptions,
  IRRibbonWidth,
  IRRibbonWidthStop,
  RibbonArcCapSweepValue,
  RibbonCapValue,
  IRArrowMark,
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
  IRBetweenTranslateTransform,
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
  DropShadow,
  ShadowPresetValue,
  BlendModeValue,
  IRTexContent,
  JsonValue,
  IRJsonObject,
  IRClipSpec,
  IRViewBox,
  IRDrawableStyle,
  IRDrawableMeta,
  IRDrawableSharedStyle,
} from './schemas';
export {
  ArrowShape,
  DEFAULT_ARROW_SHAPE,
  HOLLOW_ARROW_SHAPES,
  ARROW_MARKER_DEFAULT_SIZE,
  ARROW_MARKER_HOLLOW_DEFAULT_LINE_WIDTH,
  BuiltinShape,
  ShadowPreset,
  SHADOW_PRESETS,
  BlendMode,
  RibbonArcCapSweep,
  RibbonCap,
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
} from './schemas';
export type { BoundaryValue, IRBoundary } from './schemas';
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
} from './schemas';

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
  CompileWarningCodeValue,
  LowerTex,
  LoweredTex,
} from './compile';
export { computeLayout, fallbackMeasurer, compileToScene, CompileWarningCode, formatCompileWarning } from './compile';

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
  Vector2,
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
  normalizeCompassAnchor,
  rect,
  circle,
  ellipse,
  diamond,
  polar,
} from './geometry';

// Shapes (Shape Registry 扩展面：第三方 shape 注入 + 内置注册项 + 作者所需 helper)
export type { ShapeDefinition, ShapeDefinitionInput, ShapeStyle } from './contract/shape';
export { contour, defineShape, worldToLocal, localToWorld } from './contract/shape';
export { BUILTIN_SHAPES } from './providers/shape';

// Arrows (Arrow Registry 扩展面：第三方 arrow 注入 + 内置注册项)
export type { ArrowDefinition, ArrowEmitContext } from './contract/arrow';
export { defineArrow } from './contract/arrow';
export { BUILTIN_ARROWS } from './providers/arrow';

// Patterns (Pattern Registry 扩展面：第三方 pattern motif 注入 + 内置注册项)
export type { PatternDefinition, PatternEmitContext } from './contract/pattern';
export { definePattern } from './contract/pattern';
export { BUILTIN_PATTERNS } from './providers/pattern';

// Path (generator + kind provider extension surface)
export type {
  PathGeneratorDefinition,
  PathGeneratorContext,
  PathKindCompileContext,
  PathKindCompileResult,
  PathKindDefinition,
  PathKindDefinitionInput,
} from './contract/path';
export { definePathGenerator, definePathKind } from './contract/path';
export { BUILTIN_PATH_KINDS } from './providers/path-kind';
// Ribbons (Ribbon width profile extension surface)
export type {
  RibbonWidthProfileContext,
  RibbonWidthProfileDefinition,
  RibbonWidthProfileInput,
} from './contract/ribbon';
export { defineRibbonWidthProfile } from './contract/ribbon';
export { BUILTIN_RIBBON_WIDTH_PROFILES } from './providers/ribbon';

// Composites (Tier 2 注册面：domain 节点 schema + 展开逻辑；core 无内置)
export type { CompositeDefinition } from './contract/composite';
export { defineComposite } from './contract/composite';

// Type utilities
export type { ValueOf, AssertEqual } from './types';
