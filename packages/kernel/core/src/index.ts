/**
 * @retikz/core 公开 API
 * @description 任何 framework adapter（@retikz/react、@retikz/vue、@retikz/render/canvas、@retikz/ssr）只能 import 本文件导出内容，不准走子路径。本包零 React/零 DOM 依赖
 */

// Schemas
export type {
  ArrowShapeValue,
  AtDirectionValue,
  BlendModeValue,
  BuiltinArrowShapeValue,
  BuiltinPatternName,
  BuiltinShapeName,
  BuiltinShapeValue,
  DropShadow,
  FoldStepViaValue,
  GeometryLabelPlacementValue,
  IR,
  IRAbsoluteTarget,
  IRAnchorRef,
  IRArcStep,
  IRArrowDefault,
  IRArrowDetail,
  IRArrowEndDetail,
  IRArrowMark,
  IRAtPosition,
  IRAtTranslateTransform,
  IRBendStep,
  IRBetweenPosition,
  IRBetweenTranslateTransform,
  IRChild,
  IRCirclePathStep,
  IRClipSpec,
  IRComposite,
  IRControlPoint,
  IRCoordinate,
  IRCubicStep,
  IRCurveStep,
  IRCycleStep,
  IRDrawableMeta,
  IRDrawableSharedStyle,
  IRDrawableStyle,
  IREllipsePathStep,
  IRFoldStep,
  IRFont,
  IRGeneratorStep,
  IRGeometryLabel,
  IRGradientStop,
  IRJsonObject,
  IRLabelDefault,
  IRLineSpec,
  IRLineStep,
  IRMoveStep,
  IRNode,
  IRNodeDefault,
  IRNodeLabel,
  IRNodeLabelBoundaryPosition,
  IRNodeTarget,
  IROffsetPosition,
  IROffsetTranslateTransform,
  IRPaintSpec,
  IRPath,
  IRPathBase,
  IRPathDefault,
  IRPathRibbonOptions,
  IRPathScale,
  IRPolarTranslateTransform,
  IRPosition,
  IRRectangleStep,
  IRRelativeAccumulateTarget,
  IRRelativeTarget,
  IRRibbonArcCap,
  IRRibbonCap,
  IRRibbonDirection,
  IRRibbonWidth,
  IRRibbonWidthStop,
  IRRotateTransform,
  IRScaleTransform,
  IRScope,
  IRShapeRef,
  IRStep,
  IRStepLabel,
  IRTarget,
  IRTexContent,
  IRTextBlock,
  IRTransform,
  IRTranslateTransform,
  IRVector2,
  IRViewBox,
  JsonValue,
  NodeLabelBoundarySideValue,
  NodeLabelPlacementValue,
  NodeShape,
  NodeTextAlignValue,
  PatternShapeName,
  PatternShapeValue,
  RibbonArcCapSweepValue,
  RibbonCapValue,
  ShadowPresetValue,
  StyleChannel,
} from './schemas';
export type { BoundaryValue, IRBoundary } from './schemas';
export type {
  AnimationDirectionValue,
  AnimationEasingValue,
  AnimationFillValue,
  AnimationPropertyRef,
  AnimationTriggerValue,
  BuiltinAnimationProperty,
  IRAnimationOrigin,
  IRAnimationTrack,
  IRAnimationTrigger,
  IRKeyframe,
} from './schemas';
export {
  AbsoluteTargetSchema,
  AnchorRefSchema,
  ArcStepSchema,
  ArrowDefaultSchema,
  ArrowDetailSchema,
  ArrowEndDetailSchema,
  ArrowMarkSchema,
  AtDirection,
  AtPositionSchema,
  BendStepSchema,
  BetweenPositionSchema,
  ChildSchema,
  CirclePathStepSchema,
  ClipSpecSchema,
  CompositeBaseSchema,
  ControlPointSchema,
  CoordinateSchema,
  CubicStepSchema,
  CURRENT_IR_VERSION,
  CurveStepSchema,
  CycleStepSchema,
  DrawableMetaSchema,
  DrawableStyleSchema,
  DropShadowSchema,
  EllipsePathStepSchema,
  FoldStepSchema,
  FoldStepVia,
  FontSchema,
  GeneratorStepSchema,
  GeometryLabelPlacement,
  GeometryLabelSchema,
  GradientStopSchema,
  JsonObjectSchema,
  JsonValueSchema,
  LabelDefaultSchema,
  LineSpecSchema,
  LineStepSchema,
  MoveStepSchema,
  NodeDefaultSchema,
  NodeLabelBoundaryPositionSchema,
  NodeLabelBoundarySide,
  NodeLabelPlacement,
  NodeLabelSchema,
  NodeSchema,
  NodeTargetSchema,
  OffsetPositionSchema,
  PaintSpecSchema,
  PathBaseSchema,
  PathDefaultSchema,
  PathRibbonOptionsSchema,
  PathScaleSchema,
  PathSchema,
  PolarPositionSchema,
  PositionSchema,
  RectangleStepSchema,
  RelativeAccumulateTargetSchema,
  RelativeTargetSchema,
  RibbonArcCapSchema,
  RibbonCapSchema,
  RibbonDirectionSchema,
  RibbonWidthSchema,
  RibbonWidthStopSchema,
  SceneSchema,
  ScopeSchema,
  ShapeRefSchema,
  StepLabelSchema,
  StepSchema,
  TargetSchema,
  TexContentSchema,
  TextBlockSchema,
  TransformSchema,
  Vector2Schema,
  ViewBoxSchema,
} from './schemas';
export {
  AnimationDirection,
  AnimationEasing,
  AnimationFill,
  AnimationProperty,
  AnimationTrackSchema,
  AnimationTrigger,
  ARROW_MARKER_DEFAULT_SIZE,
  ARROW_MARKER_HOLLOW_DEFAULT_LINE_WIDTH,
  BlendMode,
  Boundary,
  BoundarySchema,
  BuiltinArrowShape,
  BuiltinShape,
  DEFAULT_ARROW_SHAPE,
  EasingSchema,
  KeyframeSchema,
  NodeTextAlign,
  OriginSchema,
  PatternShape,
  RibbonArcCapSweep,
  RibbonCap,
  SHADOW_PRESETS,
  ShadowPreset,
  TriggerSchema,
} from './schemas';

// Primitive (Scene 数据模型)
export type {
  ArcPathCommand,
  ArrowEndSpec,
  /** 裁剪资源（renderer-agnostic，adapter 物化 `<clipPath>`） */
  ClipResource,
  ClipShape,
  ClosePathCommand,
  CubicPathCommand,
  EllipseArcPathCommand,
  EllipsePrim,
  GroupPrim,
  Layout,
  LinePathCommand,
  MarkerEllipsePrim,
  MarkerFill,
  MarkerGroupPrim,
  MarkerPathCommand,
  MarkerPathPrim,
  /** marker 窄子集（ArrowDefinition.emit 产物，renderer-agnostic） */
  MarkerPrimitive,
  MarkerRectPrim,
  /** 7 个 named PathCommand 分支（便于 wrapper / Pick<>） */
  MovePathCommand,
  PaintResource,
  PaintValue,
  PathCommand,
  PathPrim,
  QuadPathCommand,
  RectPrim,
  /** 已解析 pattern tile（emit-in-compile 产物，进 Scene 资源，纯数据无函数） */
  ResolvedPatternTile,
  RotateTransform,
  ScaleTransform,
  Scene,
  ScenePrimitive,
  SceneResource,
  TextLine,
  TextPrim,
  Transform,
  /** 3 个 named Transform 分支 */
  TranslateTransform,
} from './primitive';

// Compile (IR → Scene)
export type {
  CompileOptions,
  CompileWarning,
  CompileWarningCodeValue,
  FontSpec,
  LoweredTex,
  LowerTex,
  TextMeasurer,
  TextMetrics,
} from './compile';
export { compileToScene, CompileWarningCode, computeLayout, fallbackMeasurer, formatCompileWarning } from './compile';

// Parsers
export type { WayCycle, WayDSL, WayItem, WayLabel, WayLabelOp, WayRelativeItem, WayVia } from './parsers';
export { DrawWay, parseNodeTarget, parseTargetSugar, parseWay } from './parsers';

// Presets（具名动画 sugar：产 AnimationTrack 的纯工厂）
export type {
  AnchorInput,
  Circle,
  CompassAnchorValue,
  Diamond,
  Ellipse,
  PolarPosition,
  Position,
  Rect,
  Vector2,
  WebAnchorValue,
} from './geometry';
export {
  circle,
  CompassAnchor,
  diamond,
  ellipse,
  normalizeCompassAnchor,
  point,
  polar,
  rect,
  WebAnchor,
} from './geometry';
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
} from './presets';
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
} from './presets';

// Shapes (Shape Registry 扩展面：第三方 shape 注入 + 内置注册项 + 作者所需 helper)
export type { BoundaryDefinition, BoundaryDefinitionInput } from './contract/boundary';
export { defineBoundary } from './contract/boundary';
export type { ShapeDefinition, ShapeDefinitionInput, ShapeStyle } from './contract/shape';
export { contour, defineShape, localToWorld, worldToLocal } from './contract/shape';
export { BUILTIN_BOUNDARIES } from './providers/boundary';
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
  PathGeneratorContext,
  PathGeneratorDefinition,
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
export type { AssertEqual, ValueOf } from './types';
