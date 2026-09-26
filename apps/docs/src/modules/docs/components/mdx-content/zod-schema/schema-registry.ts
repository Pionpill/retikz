import * as IR from '@retikz/core';
import * as DataIR from '@retikz/data';
import * as DiagramIR from '@retikz/diagram/flow';
import { CircleClipSchema, EllipseClipSchema, RibbonPathOptionsSchema } from '@retikz/extension';
import {
  JsonObjectSchema,
  JsonValueSchema,
  NonBlankStringSchema,
  NonNegativeIntegerSchema,
  NonNegativeNumberSchema,
  NormalizedFractionSchema,
  PositiveIntegerSchema,
  PositiveNumberSchema,
} from '@retikz/foundation';
import * as GraphIR from '@retikz/graph';
import {
  ClipInspectOptionsSchema,
  CoordinateInspectOptionsSchema,
  NodeInspectOptionsSchema,
  PathInspectOptionsSchema,
  ScopeInspectOptionsSchema,
} from '@retikz/inspect';
import * as LayoutIR from '@retikz/layout';
import * as LayoutInspectIR from '@retikz/layout/inspect';
import * as IRPlot from '@retikz/plot';
import * as StandardContainerIR from '@retikz/standard/container';
import * as StandardPresentationIR from '@retikz/standard/presentation';
import {
  CircleSchema,
  EllipseSchema,
  RectangleSchema,
  RegularPolygonSchema,
  StarSchema,
  ArcSchema,
  SectorSchema,
} from '@retikz/standard/shape';
import * as IRTable from '@retikz/table';
import type { core, z } from 'zod';

import { LegendArtifactSchemaZhLocalization, LegendSchemaZhLocalization } from './legend-schema-localizations';

/** schema 注册项按语言提供的本地化描述 */
export type SchemaRegistryLocalization = {
  /** schema 顶层描述 */
  description?: string;
  /** canonical path 到本地化字段描述的完整映射 */
  descriptions: Readonly<Partial<Record<string, string>>>;
};

export type SchemaRegistryEntry = {
  schema: z.ZodType;
  /** 渲染类型签名时使用的名称 */
  label: string;
  /** Reference / contract 页面 URL（含可选 #anchor） */
  url?: string;
  /** docs runtime 使用的可选本地化描述 */
  localizations?: Partial<Record<'zh' | 'en', SchemaRegistryLocalization>>;
};

export const SCHEMA_REGISTRY: Record<string, SchemaRegistryEntry> = {
  AxisScaleSchema: { schema: IR.AxisScaleSchema, label: 'AxisScaleSchema' },
  BoxSizeSchema: { schema: IR.BoxSizeSchema, label: 'BoxSizeSchema' },
  BoxSpacingSchema: { schema: IR.BoxSpacingSchema, label: 'BoxSpacingSchema' },
  NodeInspectOptionsSchema: {
    schema: NodeInspectOptionsSchema,
    label: 'NodeInspectOptions',
    url: '/kernel/packages/inspect/schema-reference#nodeinspectoptionsschema',
  },
  ScopeInspectOptionsSchema: {
    schema: ScopeInspectOptionsSchema,
    label: 'ScopeInspectOptions',
    url: '/kernel/packages/inspect/schema-reference#scopeinspectoptionsschema',
  },
  ClipInspectOptionsSchema: {
    schema: ClipInspectOptionsSchema,
    label: 'ClipInspectOptions',
    url: '/kernel/packages/inspect/schema-reference#clipinspectoptionsschema',
  },
  CoordinateInspectOptionsSchema: {
    schema: CoordinateInspectOptionsSchema,
    label: 'CoordinateInspectOptions',
    url: '/kernel/packages/inspect/schema-reference#coordinateinspectoptionsschema',
  },
  PathInspectOptionsSchema: {
    schema: PathInspectOptionsSchema,
    label: 'StrokePathInspectOptions',
    url: '/kernel/packages/inspect/schema-reference#pathinspectoptionsschema',
  },
  SceneSchema: {
    schema: IR.SceneSchema,
    label: 'Scene',
    url: '/kernel/components/layout/schema-reference#sceneschema',
  },
  ThemeSchema: {
    schema: IR.ThemeSchema,
    label: 'Theme',

    localizations: {
      zh: {
        description: 'Scene 或 Scope 的稀疏 Theme 环境选择；style 与 mode 分别继承',
        descriptions: {
          style: '显式视觉人格名称；省略时继承外层值，根级省略时使用 owner 默认 baseline',
          mode: '明暗环境：light 或 dark；省略时继承外层值',
        },
      },
    },
  },
  ChildSchema: { schema: IR.ChildSchema, label: 'Child' },
  ViewBoxSchema: {
    schema: IR.ViewBoxSchema,
    label: 'ViewBox',
    url: '/kernel/components/layout/schema-reference#viewboxschema',
  },
  CompositeNodeSchema: {
    schema: IR.CompositeNodeSchema,
    label: 'CompositeNode',
  },
  JsonObjectSchema: {
    schema: JsonObjectSchema,
    label: 'JsonObject',
    url: '/kernel/packages/foundation/schema-reference#jsonobjectschema',
  },
  JsonValueSchema: {
    schema: JsonValueSchema,
    label: 'JsonValue',
    url: '/kernel/packages/foundation/schema-reference#jsonvalueschema',
  },
  NonBlankStringSchema: {
    schema: NonBlankStringSchema,
    label: 'NonBlankString',
    url: '/kernel/packages/foundation/schema-reference#nonblankstringschema',
  },
  PositiveNumberSchema: {
    schema: PositiveNumberSchema,
    label: 'PositiveNumber',
    url: '/kernel/packages/foundation/schema-reference#positivenumberschema',
  },
  NonNegativeNumberSchema: {
    schema: NonNegativeNumberSchema,
    label: 'NonNegativeNumber',
    url: '/kernel/packages/foundation/schema-reference#nonnegativenumberschema',
  },
  PositiveIntegerSchema: {
    schema: PositiveIntegerSchema,
    label: 'PositiveInteger',
    url: '/kernel/packages/foundation/schema-reference#positiveintegerschema',
  },
  NonNegativeIntegerSchema: {
    schema: NonNegativeIntegerSchema,
    label: 'NonNegativeInteger',
    url: '/kernel/packages/foundation/schema-reference#nonnegativeintegerschema',
  },
  NormalizedFractionSchema: {
    schema: NormalizedFractionSchema,
    label: 'NormalizedFraction',
    url: '/kernel/packages/foundation/schema-reference#normalizedfractionschema',
  },

  ScopeFrameSchema: {
    schema: IR.ScopeFrameSchema,
    label: 'ScopeFrame',
    url: '/kernel/components/scope/schema-reference#scopeframeschema',
  },
  ScopeFrameStyleSchema: {
    schema: IR.ScopeFrameStyleSchema,
    label: 'ScopeFrameStyle',
    url: '/kernel/components/scope/schema-reference#scopeframestyleschema',
  },
  ScopeSchema: { schema: IR.ScopeSchema, label: 'Scope', url: '/kernel/components/scope/schema-reference#scopeschema' },
  AnchorRefSchema: {
    schema: IR.AnchorRefSchema,
    label: 'AnchorRefSchema',
    url: '/kernel/components/scope/schema-reference#scopeschema',
  },
  BoundaryAnchorRefSchema: {
    schema: IR.BoundaryAnchorRefSchema,
    label: 'BoundaryAnchorRefSchema',
    url: '/kernel/components/scope/schema-reference#scopeschema',
  },
  ScopePlacementTargetSchema: {
    schema: IR.ScopePlacementSchema.shape.target,
    label: 'ScopePlacementTargetSchema',
    url: '/kernel/components/scope/schema-reference#scopeschema',
  },
  TranslateSchema: {
    schema: IR.TransformSchema.options[0],
    label: 'TranslateSchema',
    url: '/kernel/components/scope/schema-reference#scopeschema',
  },
  PolarTranslateSchema: {
    schema: IR.TransformSchema.options[1],
    label: 'PolarTranslateSchema',
    url: '/kernel/components/scope/schema-reference#scopeschema',
  },
  AtTranslateSchema: {
    schema: IR.TransformSchema.options[2],
    label: 'AtTranslateSchema',
    url: '/kernel/components/scope/schema-reference#scopeschema',
  },
  OffsetTranslateSchema: {
    schema: IR.TransformSchema.options[3],
    label: 'OffsetTranslateSchema',
    url: '/kernel/components/scope/schema-reference#scopeschema',
  },
  BetweenTranslateSchema: {
    schema: IR.TransformSchema.options[4],
    label: 'BetweenTranslateSchema',
    url: '/kernel/components/scope/schema-reference#scopeschema',
  },
  RotateSchema: {
    schema: IR.TransformSchema.options[5],
    label: 'RotateSchema',
    url: '/kernel/components/scope/schema-reference#scopeschema',
  },
  'core.ScaleSchema': {
    schema: IR.TransformSchema.options[6],
    label: 'ScaleSchema',
    url: '/kernel/components/scope/schema-reference#scopeschema',
  },
  ScopePlacementSchema: {
    schema: IR.ScopePlacementSchema,
    label: 'ScopePlacement',
    url: '/kernel/components/scope/schema-reference#scopeplacementschema',
  },
  ScopeSelfPointSchema: {
    schema: IR.ScopeSelfPointSchema,
    label: 'ScopeSelfPoint',
    url: '/kernel/components/scope/schema-reference#scopeselfpointschema',
  },
  NodeDefaultSchema: {
    schema: IR.NodeDefaultSchema,
    label: 'NodeDefault',
  },
  ScopeDefaultsSchema: {
    // 独立定义视图不改变其他页面按原实例展开 defaults 的行为
    schema: IR.ScopeDefaultsSchema.clone(),
    label: 'ScopeDefaultsSchema',
    url: '/kernel/components/scope/schema-reference#scopedefaultsschema',
  },
  PathDefaultSchema: {
    schema: IR.PathDefaultSchema,
    label: 'PathDefault',
  },
  LabelDefaultSchema: {
    schema: IR.LabelDefaultSchema,
    label: 'LabelDefault',
  },
  TransformSchema: {
    schema: IR.TransformSchema,
    label: 'Transform',
    url: '/viz/plot/reference/transform#transformschema',
  },
  ClipSchema: { schema: IR.ClipSchema, label: 'Clip', url: '/kernel/components/scope/schema-reference#clipschema' },
  RectClipSchema: {
    schema: IR.RectClipSchema,
    label: 'RectClip',
    url: '/kernel/components/scope/schema-reference#rectclipschema',
  },
  CircleClipSchema: {
    schema: CircleClipSchema,
    label: 'CircleClip',
  },
  EllipseClipSchema: {
    schema: EllipseClipSchema,
    label: 'EllipseClip',
  },
  NodeStyleSchema: {
    schema: IR.NodeStyleSchema,
    label: 'NodeStyleSchema',
    url: '/kernel/components/node/schema-reference#nodestyleschema',
  },
  NodeLayoutSchema: {
    schema: IR.NodeLayoutSchema,
    label: 'NodeLayoutSchema',
    url: '/kernel/components/node/schema-reference#nodelayoutschema',
  },
  NodeLabelBoundaryPositionSchema: {
    schema: IR.NodeLabelBoundaryPositionSchema,
    label: 'NodeLabelBoundaryPositionSchema',
    url: '/kernel/components/node/schema-reference#nodelabelboundarypositionschema',
  },
  NodeLabelPinSchema: {
    schema: IR.NodeLabelPinSchema,
    label: 'NodeLabelPinSchema',
    url: '/kernel/components/node/schema-reference#nodelabelpinschema',
  },
  NodeSchema: {
    schema: IR.NodeSchema,
    label: 'NodeSchema',
    url: '/kernel/components/node/schema-reference#nodeschema',
  },
  NodeLabelSchema: {
    schema: IR.NodeLabelSchema,
    label: 'NodeLabelSchema',
    url: '/kernel/components/node/schema-reference#nodelabelschema',
  },
  CoordinateSchema: {
    schema: IR.CoordinateSchema,
    label: 'CoordinateSchema',
    url: '/kernel/components/node/schema-reference#coordinateschema',
  },
  FontSchema: { schema: IR.FontSchema, label: 'Font' },
  FontFamilySchema: {
    schema: IR.FontFamilySchema,
    label: 'FontFamily',
  },
  FontWeightSchema: {
    schema: IR.FontWeightSchema,
    label: 'FontWeight',
  },
  FontStyleSchema: {
    schema: IR.FontStyleSchema,
    label: 'FontStyle',
  },
  TextAlignSchema: {
    schema: IR.TextAlignSchema,
    label: 'TextAlign',
  },
  LineHeightSchema: {
    schema: IR.LineHeightSchema,
    label: 'LineHeight',
  },
  TextBlockSchema: { schema: IR.TextBlockSchema, label: 'TextBlock' },
  LineSchema: { schema: IR.LineSchema, label: 'Line' },
  StyledLineSchema: {
    schema: IR.StyledLineSchema,
    label: 'StyledLine',
  },
  MixedLineSchema: {
    schema: IR.MixedLineSchema,
    label: 'MixedLine',
  },
  TextRunSchema: { schema: IR.TextRunSchema, label: 'TextRun' },
  MathRunSchema: { schema: IR.MathRunSchema, label: 'MathRun' },
  ShapeRefSchema: { schema: IR.ShapeRefSchema, label: 'ShapeRef' },
  BoundarySchema: {
    schema: IR.BoundarySchema,
    label: 'BoundarySchema',
    url: '/kernel/components/node/schema-reference#boundaryschema',
  },

  PathStrokeSchema: {
    schema: IR.PathStrokeSchema,
    label: 'PathStroke',
  },
  PathFillSchema: {
    schema: IR.PathFillSchema,
    label: 'PathFill',
  },
  PathGeometrySchema: {
    schema: IR.PathGeometrySchema,
    label: 'PathGeometry',
  },
  PathDecorationSchema: {
    schema: IR.PathDecorationSchema,
    label: 'PathDecoration',
  },
  PathStructureSchema: {
    schema: IR.PathStructureSchema,
    label: 'PathStructure',
  },
  PathSchema: { schema: IR.PathSchema, label: 'Path', url: '/kernel/components/path/schema-reference#pathschema' },
  DrawableStyleSchema: {
    schema: IR.DrawableStyleSchema,
    label: 'DrawableStyle',
  },
  DrawableInstanceSchema: {
    schema: IR.DrawableInstanceSchema,
    label: 'DrawableInstance',
  },
  RibbonPathOptionsSchema: {
    schema: RibbonPathOptionsSchema,
    label: 'RibbonPathOptions',
    url: '/library/extension/ribbon',
  },
  PathMarkPlacementSchema: {
    schema: IR.PathMarkPlacementSchema,
    label: 'PathMarkPlacement',
    url: '/kernel/components/path/schema-reference#pathmarkplacementschema',
  },
  StepSchema: { schema: IR.StepSchema, label: 'Step', url: '/kernel/components/path/schema-reference#stepschema' },
  GeometryLabelSchema: {
    schema: IR.GeometryLabelSchema,
    label: 'GeometryLabel',
    url: '/kernel/components/path/schema-reference#geometrylabelschema',
  },
  StepLabelSchema: { schema: IR.StepLabelSchema, label: 'StepLabel' },
  ControlPointSchema: {
    schema: IR.ControlPointSchema,
    label: 'ControlPoint',
  },
  TargetSchema: { schema: IR.TargetSchema, label: 'Target' },
  PositionSchema: { schema: IR.PositionSchema, label: 'Position' },
  PolarPositionSchema: {
    schema: IR.PolarPositionSchema,
    label: 'PolarPosition',
  },
  AtPositionSchema: {
    schema: IR.AtPositionSchema,
    label: 'AtPosition',
  },
  OffsetPositionSchema: {
    schema: IR.OffsetPositionSchema,
    label: 'OffsetPosition',
  },
  BetweenPositionSchema: {
    schema: IR.BetweenPositionSchema,
    label: 'BetweenPosition',
  },
  AnchorPositionSchema: {
    schema: IR.AnchorPositionSchema,
    label: 'AnchorPosition',
  },
  AbsoluteTargetSchema: {
    schema: IR.AbsoluteTargetSchema,
    label: 'AbsoluteTarget',
  },
  NodeTargetSchema: {
    schema: IR.NodeTargetSchema,
    label: 'NodeTarget',
  },

  GraphicPaintSchema: {
    schema: IR.GraphicPaintSchema,
    label: 'GraphicPaint',
  },
  GraphicOpacitySchema: {
    schema: IR.GraphicOpacitySchema,
    label: 'GraphicOpacity',
  },
  GraphicEffectsSchema: {
    schema: IR.GraphicEffectsSchema,
    label: 'GraphicEffects',
  },
  StrokeStyleSchema: {
    schema: IR.StrokeStyleSchema,
    label: 'StrokeStyle',
  },
  StrokeWidthSchema: {
    schema: IR.StrokeWidthSchema,
    label: 'StrokeWidth',
  },
  ContextualColorSchema: {
    schema: IR.ContextualColorSchema,
    label: 'ContextualColor',
  },
  PaintValueSchema: {
    schema: IR.PaintValueSchema,
    label: 'PaintValue',
  },
  GraphicStyleSchema: {
    schema: IR.GraphicStyleSchema,
    label: 'GraphicStyle',
  },
  CascadingGraphicStyleSchema: {
    schema: IR.CascadingGraphicStyleSchema,
    label: 'CascadingGraphicStyle',
  },
  DropShadowSchema: {
    schema: IR.DropShadowSchema,
    label: 'DropShadow',
    url: '/kernel/visual/style/schema-reference#dropshadowschema',
  },
  GradientStopSchema: {
    schema: IR.GradientStopSchema,
    label: 'GradientStop',
  },
  PaintSchema: { schema: IR.PaintSchema, label: 'Paint' },
  LinearGradientPaintSchema: {
    schema: IR.LinearGradientPaintSchema,
    label: 'LinearGradientPaint',
  },
  RadialGradientPaintSchema: {
    schema: IR.RadialGradientPaintSchema,
    label: 'RadialGradientPaint',
  },
  ConicGradientPaintSchema: {
    schema: IR.ConicGradientPaintSchema,
    label: 'ConicGradientPaint',
  },
  PatternShapeNameSchema: {
    schema: IR.PatternShapeNameSchema,
    label: 'PatternShapeNameSchema',
    url: '/kernel/visual/style/schema-reference#patternshapenameschema',
  },
  PatternLineStyleSchema: {
    schema: IR.PatternLineStyleSchema,
    label: 'PatternLineStyleSchema',
    url: '/kernel/visual/style/schema-reference#patternlinestyleschema',
  },
  PatternLineStyleOverrideSchema: {
    schema: IR.PatternLineStyleOverrideSchema,
    label: 'PatternLineStyleOverrideSchema',
    url: '/kernel/visual/style/schema-reference#patternlinestyleoverrideschema',
  },
  PatternLineStyleCycleSchema: {
    schema: IR.PatternLineStyleCycleSchema,
    label: 'PatternLineStyleCycleSchema',
    url: '/kernel/visual/style/schema-reference#patternlinestylecycleschema',
  },
  PatternPaintSchema: {
    schema: IR.PatternPaintSchema,
    label: 'PatternPaint',
    url: '/kernel/visual/style/schema-reference#patternpaintschema',
  },
  ImagePaintSchema: {
    schema: IR.ImagePaintSchema,
    label: 'ImagePaint',
  },

  AnimationTrackSchema: {
    schema: IR.AnimationTrackSchema,
    label: 'AnimationTrack',
    url: '/kernel/visual/animation/schema-reference#animationtrackschema',
  },
  KeyframeSchema: {
    schema: IR.KeyframeSchema,
    label: 'Keyframe',
    url: '/kernel/visual/animation/schema-reference#keyframeschema',
  },
  EasingSchema: {
    schema: IR.EasingSchema,
    label: 'Easing',
    url: '/kernel/visual/animation/schema-reference#easingschema',
  },
  TriggerSchema: {
    schema: IR.TriggerSchema,
    label: 'Trigger',
    url: '/kernel/visual/animation/schema-reference#triggerschema',
  },
  EventTriggerSchema: {
    schema: IR.EventTriggerSchema,
    label: 'EventTrigger',
    url: '/kernel/visual/animation/schema-reference#eventtriggerschema',
  },
  OriginSchema: {
    schema: IR.OriginSchema,
    label: 'Origin',
    url: '/kernel/visual/animation/schema-reference#originschema',
  },

  MoveStepSchema: {
    schema: IR.MoveStepSchema,
    label: 'MoveStep',
    url: '/kernel/components/path/schema-reference#movestepschema',
  },
  LineStepSchema: {
    schema: IR.LineStepSchema,
    label: 'LineStep',
    url: '/kernel/components/path/schema-reference#linestepschema',
  },
  AxisLineStepSchema: {
    schema: IR.AxisLineStepSchema,
    label: 'AxisLineStep',
    url: '/kernel/components/path/schema-reference#axislinestepschema',
  },
  FoldStepSchema: {
    schema: IR.FoldStepSchema,
    label: 'FoldStep',
    url: '/kernel/components/path/schema-reference#foldstepschema',
  },
  CycleStepSchema: {
    schema: IR.CycleStepSchema,
    label: 'CycleStep',
    url: '/kernel/components/path/schema-reference#cyclestepschema',
  },
  CurveStepSchema: {
    schema: IR.CurveStepSchema,
    label: 'CurveStep',
    url: '/kernel/components/path/schema-reference#curvestepschema',
  },
  CubicStepSchema: {
    schema: IR.CubicStepSchema,
    label: 'CubicStep',
    url: '/kernel/components/path/schema-reference#cubicstepschema',
  },
  BendStepSchema: {
    schema: IR.BendStepSchema,
    label: 'BendStep',
    url: '/kernel/components/path/schema-reference#bendstepschema',
  },
  ArcStepSchema: {
    schema: IR.ArcStepSchema,
    label: 'ArcStep',
    url: '/kernel/components/path/schema-reference#arcstepschema',
  },
  CircleSchema: { schema: CircleSchema, label: 'Circle', url: '/library/standard/circle-ellipse#circleschema' },
  EllipseSchema: { schema: EllipseSchema, label: 'Ellipse', url: '/library/standard/circle-ellipse#ellipseschema' },
  RectangleSchema: { schema: RectangleSchema, label: 'Rectangle', url: '/library/standard/rectangle#rectangleschema' },
  RegularPolygonSchema: {
    schema: RegularPolygonSchema,
    label: 'RegularPolygon',
    url: '/library/standard/regular-polygon#regularpolygonschema',
  },
  StarSchema: { schema: StarSchema, label: 'Star', url: '/library/standard/star#starschema' },
  ArcSchema: { schema: ArcSchema, label: 'Arc', url: '/library/standard/arc-sector#arcschema' },
  SectorSchema: { schema: SectorSchema, label: 'Sector', url: '/library/standard/arc-sector#sectorschema' },
  CirclePathStepSchema: {
    schema: IR.CirclePathStepSchema,
    label: 'CirclePathStep',
    url: '/kernel/components/path/schema-reference#circlepathstepschema',
  },
  EllipsePathStepSchema: {
    schema: IR.EllipsePathStepSchema,
    label: 'EllipsePathStep',
    url: '/kernel/components/path/schema-reference#ellipsepathstepschema',
  },
  RectangleStepSchema: {
    schema: IR.RectangleStepSchema,
    label: 'RectangleStep',
    url: '/kernel/components/path/schema-reference#rectanglestepschema',
  },
  SmoothStepSchema: {
    schema: IR.SmoothStepSchema,
    label: 'SmoothStep',
    url: '/kernel/components/path/schema-reference#smoothstepschema',
  },
  GeneratorStepSchema: {
    schema: IR.GeneratorStepSchema,
    label: 'GeneratorStep',
    url: '/kernel/components/path/schema-reference#generatorstepschema',
  },

  RelativeTargetSchema: {
    schema: IR.RelativeTargetSchema,
    label: 'RelativeTarget',
  },
  RelativeAccumulateTargetSchema: {
    schema: IR.RelativeAccumulateTargetSchema,
    label: 'RelativeAccumulateTarget',
  },

  ArrowMarkSchema: {
    schema: IR.ArrowMarkSchema,
    label: 'ArrowMark',
    url: '/kernel/components/path/schema-reference#arrowmarkschema',
  },
  ArrowDetailSchema: {
    schema: IR.ArrowDetailSchema,
    label: 'ArrowDetail',
    url: '/kernel/components/path/schema-reference#arrowdetailschema',
  },
  ArrowEndDetailSchema: {
    schema: IR.ArrowEndDetailSchema,
    label: 'ArrowEndDetail',
    url: '/kernel/components/path/schema-reference#arrowenddetailschema',
  },

  LayoutInspectBoundsOptionsSchema: {
    schema: LayoutInspectIR.LayoutInspectBoundsOptionsSchema,
    label: 'LayoutInspectBoundsOptions',
    url: '/library/layout/reference/runtime#layoutinspectboundsoptionsschema',
  },
  LayoutInspectSpacingOptionsSchema: {
    schema: LayoutInspectIR.LayoutInspectSpacingOptionsSchema,
    label: 'LayoutInspectSpacingOptions',
    url: '/library/layout/reference/runtime#layoutinspectspacingoptionsschema',
  },
  BaseLayoutInspectOptionsSchema: {
    schema: LayoutInspectIR.BaseLayoutInspectOptionsSchema,
    label: 'BaseLayoutInspectOptions',
    url: '/library/layout/reference/runtime#baselayoutinspectoptionsschema',
  },
  FlexLayoutInspectOptionsSchema: {
    schema: LayoutInspectIR.FlexLayoutInspectOptionsSchema,
    label: 'FlexLayoutInspectOptions',
    url: '/library/layout/reference/runtime#flexlayoutinspectoptionsschema',
  },
  GridLayoutInspectOptionsSchema: {
    schema: LayoutInspectIR.GridLayoutInspectOptionsSchema,
    label: 'GridLayoutInspectOptions',
    url: '/library/layout/reference/runtime#gridlayoutinspectoptionsschema',
  },
  OverlayLayoutInspectOptionsSchema: {
    schema: LayoutInspectIR.OverlayLayoutInspectOptionsSchema,
    label: 'OverlayLayoutInspectOptions',
    url: '/library/layout/reference/runtime#overlaylayoutinspectoptionsschema',
  },

  FlexLayoutSchema: {
    schema: LayoutIR.FlexLayoutSchema,
    label: 'FlexLayout',
    url: '/library/layout/reference/contract-input#flexlayoutschema',
  },
  GridLayoutSchema: {
    schema: LayoutIR.GridLayoutSchema,
    label: 'GridLayout',
    url: '/library/layout/reference/contract-input#gridlayoutschema',
  },
  OverlayLayoutSchema: {
    schema: LayoutIR.OverlayLayoutSchema,
    label: 'OverlayLayout',
    url: '/library/layout/reference/contract-input#overlaylayoutschema',
  },
  LayoutItemSchema: {
    schema: LayoutIR.LayoutItemSchema,
    label: 'LayoutItem',
    url: '/library/layout/reference/contract-input#layoutitemschema',
  },
  LayoutArtifactSchema: {
    schema: LayoutIR.LayoutArtifactSchema,
    label: 'LayoutArtifact',
    url: '/library/layout/reference/contract-artifact#layoutartifactschema',
  },
  LayoutSpacingArtifactSchema: {
    schema: LayoutIR.LayoutSpacingArtifactSchema,
    label: 'LayoutSpacingArtifact',
    url: '/library/layout/reference/contract-artifact#layoutspacingartifactschema',
  },
  FlexLayoutArtifactSchema: {
    schema: LayoutIR.FlexLayoutArtifactSchema,
    label: 'FlexLayoutArtifact',
    url: '/library/layout/reference/contract-artifact#flexlayoutartifactschema',
  },
  GridLayoutArtifactSchema: {
    schema: LayoutIR.GridLayoutArtifactSchema,
    label: 'GridLayoutArtifact',
    url: '/library/layout/reference/contract-artifact#gridlayoutartifactschema',
  },
  OverlayLayoutArtifactSchema: {
    schema: LayoutIR.OverlayLayoutArtifactSchema,
    label: 'OverlayLayoutArtifact',
    url: '/library/layout/reference/contract-artifact#overlaylayoutartifactschema',
  },
  LegendSchema: {
    schema: StandardPresentationIR.LegendSchema,
    label: 'Legend',
    url: '/library/standard/legend#legendschema',
    localizations: { zh: LegendSchemaZhLocalization },
  },
  LegendArtifactSchema: {
    schema: StandardPresentationIR.LegendArtifactSchema,
    label: 'LegendArtifact',
    url: '/library/standard/legend#legendartifactschema',
    localizations: { zh: LegendArtifactSchemaZhLocalization },
  },
  ListSchema: { schema: StandardContainerIR.ListSchema, label: 'List', url: '/library/standard/list#listschema' },
  MapSchema: { schema: StandardContainerIR.MapSchema, label: 'Map', url: '/library/standard/map#mapschema' },
  SurfaceSchema: {
    schema: StandardPresentationIR.SurfaceSchema,
    label: 'Surface',
    url: '/library/standard/surface#surfaceschema',
  },

  FlowDiagramSchema: {
    schema: DiagramIR.FlowDiagramSchema,
    label: 'FlowDiagram',
    url: '/schematic/diagram/flow/basic#flow-source',
  },
  FlowLayoutSchema: {
    schema: DiagramIR.FlowLayoutSchema,
    label: 'FlowLayout',
    url: '/schematic/diagram/flow/basic#flow-source',
  },
  FlowDiagramArtifactSchema: {
    schema: DiagramIR.FlowDiagramArtifactSchema,
    label: 'FlowDiagramArtifact',
    url: '/schematic/diagram/flow/basic#flowdiagramartifact',
  },

  GraphSchema: {
    schema: GraphIR.GraphSchema,
    label: 'Graph',
  },
  GroupSchema: {
    schema: GraphIR.GroupSchema,
    label: 'Group',
    url: '/schematic/graph/group',
  },
  BlockSchema: {
    schema: GraphIR.BlockSchema,
    label: 'Block',
    url: '/schematic/graph/block/basic',
  },
  BlockHeaderSchema: {
    schema: GraphIR.BlockHeaderSchema,
    label: 'BlockHeader',
    url: '/schematic/graph/block/basic',
  },
  BlockSectionSchema: {
    schema: GraphIR.BlockSectionSchema,
    label: 'BlockSection',
    url: '/schematic/graph/block/basic',
  },
  BlockRowSchema: {
    schema: GraphIR.BlockRowSchema,
    label: 'BlockRow',
    url: '/schematic/graph/block/basic',
  },
  EntitySchema: {
    schema: GraphIR.EntitySchema,
    label: 'Entity',
    url: '/schematic/graph/entity/schema-reference',
  },
  EntityRoleSchema: {
    schema: GraphIR.EntityRoleSchema,
    label: 'EntityRole',
    url: '/schematic/graph/entity/schema-reference#entityroleschema',
  },
  RelationSchema: {
    schema: GraphIR.RelationSchema,
    label: 'Relation',
  },
  GraphPredicateRefSchema: {
    schema: GraphIR.GraphPredicateRefSchema,
    label: 'GraphPredicateRef',
  },
  GraphDefaultsSchema: {
    schema: GraphIR.GraphDefaultsSchema,
    label: 'GraphDefaults',
  },
  GraphRuleSchema: {
    schema: GraphIR.GraphRuleSchema,
    label: 'GraphRule',
  },
  GraphEntityThemeSelectorSchema: {
    schema: GraphIR.GraphEntityThemeSelectorSchema,
    label: 'GraphEntityThemeSelector',
  },
  GraphRelationThemeSelectorSchema: {
    schema: GraphIR.GraphRelationThemeSelectorSchema,
    label: 'GraphRelationThemeSelector',
  },
  TableSchema: {
    schema: IRTable.TableSchema,
    label: 'Table',
    url: '/viz/table/reference/contract-table#tableschema',
  },
  DetailTableSchema: {
    schema: IRTable.DetailTableSchema,
    label: 'DetailTable',
    url: '/viz/table/reference/contract-detail#detailtableschema',
  },
  ManualTableSchema: {
    schema: IRTable.ManualTableSchema,
    label: 'ManualTable',
    url: '/viz/table/reference/contract-table#manualtableschema',
  },
  CustomTableSchema: {
    schema: IRTable.CustomTableSchema,
    label: 'CustomTable',
    url: '/viz/table/reference/contract-table#customtableschema',
  },
  ManualTableCellSchema: {
    schema: IRTable.ManualTableCellSchema,
    label: 'ManualTableCell',
    url: '/viz/table/reference/contract-table#manualtablecellschema',
  },
  TableCellPayloadSchema: {
    schema: IRTable.TableCellPayloadSchema,
    label: 'TableCellPayload',
    url: '/viz/table/reference/contract-table#tablecellpayloadschema',
  },
  TableCellValuePayloadSchema: {
    schema: IRTable.TableCellValuePayloadSchema,
    label: 'TableCellValuePayload',
    url: '/viz/table/reference/contract-table#tablecellvaluepayloadschema',
  },
  TableCellContentPayloadSchema: {
    schema: IRTable.TableCellContentPayloadSchema,
    label: 'TableCellContentPayload',
    url: '/viz/table/reference/contract-table#tablecellcontentpayloadschema',
  },
  TablePresentationRefSchema: {
    schema: IRTable.TablePresentationRefSchema,
    label: 'TablePresentationRef',
    url: '/viz/table/reference/contract-table#tablepresentationrefschema',
  },
  TableFormatterRefSchema: {
    schema: IRTable.TableFormatterRefSchema,
    label: 'TableFormatterRef',
    url: '/viz/table/reference/contract-table#tableformatterrefschema',
  },
  TableCellSelectorSchema: {
    schema: IRTable.TableCellSelectorSchema,
    label: 'TableCellSelector',
    url: '/viz/table/reference/contract-table#tablecellselectorschema',
  },
  TableCellRuleSchema: {
    schema: IRTable.TableCellRuleSchema,
    label: 'TableCellRule',
    url: '/viz/table/reference/contract-table#tablecellruleschema',
  },
  TableCellVisualEncodingSchema: {
    schema: IRTable.TableCellVisualEncodingSchema,
    label: 'TableCellVisualEncoding',
    url: '/viz/table/reference/contract-table#tablecellvisualencodingschema',
  },
  TableCellBackgroundDefaultsSchema: {
    schema: IRTable.TableCellBackgroundDefaultsSchema,
    label: 'TableCellBackgroundDefaults',
    url: '/viz/table/reference/contract-table#tablecellbackgrounddefaultsschema',
  },
  TableCellAppearanceDefaultsSchema: {
    schema: IRTable.TableCellAppearanceDefaultsSchema,
    label: 'TableCellAppearanceDefaults',
    url: '/viz/table/reference/contract-table#tablecellappearancedefaultsschema',
  },
  TableAppearanceDefaultsSchema: {
    schema: IRTable.TableAppearanceDefaultsSchema,
    label: 'TableAppearanceDefaults',
    url: '/viz/table/reference/contract-table#tableappearancedefaultsschema',
  },
  TableVisualDefaultsSchema: {
    schema: IRTable.TableVisualDefaultsSchema,
    label: 'TableVisualDefaults',
    url: '/viz/table/reference/contract-table#tablevisualdefaultsschema',
  },
  TableLayoutDefaultsSchema: {
    schema: IRTable.TableLayoutDefaultsSchema,
    label: 'TableLayoutDefaults',
    url: '/viz/table/reference/contract-table#tablelayoutdefaultsschema',
  },
  TableDefaultsSchema: {
    schema: IRTable.TableDefaultsSchema,
    label: 'TableDefaults',
    url: '/viz/table/reference/contract-table#tabledefaultsschema',
  },
  TableCellSpanSchema: {
    schema: IRTable.TableCellSpanSchema,
    label: 'TableCellSpan',
    url: '/viz/table/reference/contract-layout#tablecellspanschema',
  },
  TableCellLayoutSchema: {
    schema: IRTable.TableCellLayoutSchema,
    label: 'TableCellLayout',
    url: '/viz/table/reference/contract-layout#tablecelllayoutschema',
  },
  TableCellFitSchema: {
    schema: IRTable.TableCellFitSchema,
    label: 'TableCellFit',
    url: '/viz/table/reference/contract-layout#tablecellfitschema',
  },
  TableCellOverflowSchema: {
    schema: IRTable.TableCellOverflowSchema,
    label: 'TableCellOverflow',
    url: '/viz/table/reference/contract-layout#tablecelloverflowschema',
  },
  TableLayoutSchema: {
    schema: IRTable.TableLayoutSchema,
    label: 'TableLayout',
    url: '/viz/table/reference/contract-layout#tablelayoutschema',
  },
  TableFixedTrackSizeSchema: {
    schema: IRTable.TableFixedTrackSizeSchema,
    label: 'TableFixedTrackSize',
    url: '/viz/table/reference/contract-layout#tablefixedtracksizeschema',
  },
  TableAutoTrackSizeSchema: {
    schema: IRTable.TableAutoTrackSizeSchema,
    label: 'TableAutoTrackSize',
    url: '/viz/table/reference/contract-layout#tableautotracksizeschema',
  },
  TableFractionTrackSizeSchema: {
    schema: IRTable.TableFractionTrackSizeSchema,
    label: 'TableFractionTrackSize',
    url: '/viz/table/reference/contract-layout#tablefractiontracksizeschema',
  },
  TableMinmaxTrackSizeSchema: {
    schema: IRTable.TableMinmaxTrackSizeSchema,
    label: 'TableMinmaxTrackSize',
    url: '/viz/table/reference/contract-layout#tableminmaxtracksizeschema',
  },
  TableTrackSizeSchema: {
    schema: IRTable.TableTrackSizeSchema,
    label: 'TableTrackSize',
    url: '/viz/table/reference/contract-layout#tabletracksizeschema',
  },
  TableTrackOverrideSchema: {
    schema: IRTable.TableTrackOverrideSchema,
    label: 'TableTrackOverride',
    url: '/viz/table/reference/contract-layout#tabletrackoverrideschema',
  },
  TableTrackOverridesSchema: {
    schema: IRTable.TableTrackOverridesSchema,
    label: 'TableTrackOverrides',
    url: '/viz/table/reference/contract-layout#tabletrackoverridesschema',
  },
  TableNoBorderSchema: {
    schema: IRTable.TableNoBorderSchema,
    label: 'TableNoBorder',
    url: '/viz/table/reference/contract-layout#tablenoborderschema',
  },
  TableLineBorderSchema: {
    schema: IRTable.TableLineBorderSchema,
    label: 'TableLineBorder',
    url: '/viz/table/reference/contract-layout#tablelineborderschema',
  },
  TableBorderSchema: {
    schema: IRTable.TableBorderSchema,
    label: 'TableBorder',
    url: '/viz/table/reference/contract-layout#tableborderschema',
  },
  TableCellBordersSchema: {
    schema: IRTable.TableCellBordersSchema,
    label: 'TableCellBorders',
    url: '/viz/table/reference/contract-layout#tablecellbordersschema',
  },
  TableOuterBordersSchema: {
    schema: IRTable.TableOuterBordersSchema,
    label: 'TableOuterBorders',
    url: '/viz/table/reference/contract-layout#tableouterbordersschema',
  },
  TableBordersSchema: {
    schema: IRTable.TableBordersSchema,
    label: 'TableBorders',
    url: '/viz/table/reference/contract-layout#tablebordersschema',
  },
  TableLayoutManifestSchema: {
    schema: IRTable.TableLayoutManifestSchema,
    label: 'TableLayoutManifest',
    url: '/viz/table/reference/manifest#tablelayoutmanifestschema',
  },
  TableTrackManifestEntrySchema: {
    schema: IRTable.TableTrackManifestEntrySchema,
    label: 'TableTrackManifestEntry',
    url: '/viz/table/reference/manifest#tabletrackmanifestentryschema',
  },
  TableCellManifestEntrySchema: {
    schema: IRTable.TableCellManifestEntrySchema,
    label: 'TableCellManifestEntry',
    url: '/viz/table/reference/manifest#tablecellmanifestentryschema',
  },
  ResolvedTableBorderLineSchema: {
    schema: IRTable.ResolvedTableBorderLineSchema,
    label: 'ResolvedTableBorderLine',
    url: '/viz/table/reference/manifest#resolvedtableborderlineschema',
  },
  TableBorderSourceSchema: {
    schema: IRTable.TableBorderSourceSchema,
    label: 'TableBorderSource',
    url: '/viz/table/reference/manifest#tablebordersourceschema',
  },
  TableNoBorderContributionSchema: {
    schema: IRTable.TableNoBorderContributionSchema,
    label: 'TableNoBorderContribution',
    url: '/viz/table/reference/manifest#tablenobordercontributionschema',
  },
  TableLineBorderContributionSchema: {
    schema: IRTable.TableLineBorderContributionSchema,
    label: 'TableLineBorderContribution',
    url: '/viz/table/reference/manifest#tablelinebordercontributionschema',
  },
  TableBorderContributionSchema: {
    schema: IRTable.TableBorderContributionSchema,
    label: 'TableBorderContribution',
    url: '/viz/table/reference/manifest#tablebordercontributionschema',
  },
  TableBorderManifestAtomSchema: {
    schema: IRTable.TableBorderManifestAtomSchema,
    label: 'TableBorderManifestAtom',
    url: '/viz/table/reference/manifest#tablebordermanifestatomschema',
  },
  TableBorderManifestEntrySchema: {
    schema: IRTable.TableBorderManifestEntrySchema,
    label: 'TableBorderManifestEntry',
    url: '/viz/table/reference/manifest#tablebordermanifestentryschema',
  },
  TableBorderPathMetaSchema: {
    schema: IRTable.TableBorderPathMetaSchema,
    label: 'TableBorderPathMeta',
    url: '/viz/table/reference/manifest#tableborderpathmetaschema',
  },
  TableBorderLocatorEntrySchema: {
    schema: IRTable.TableBorderLocatorEntrySchema,
    label: 'TableBorderLocatorEntry',
    url: '/viz/table/reference/manifest#tableborderlocatorentryschema',
  },
  DetailTableStructureSchema: {
    schema: IRTable.DetailTableStructureSchema,
    label: 'DetailTableStructure',
    url: '/viz/table/reference/contract-detail#detailtablestructureschema',
  },
  TableDetailColumnSchema: {
    schema: IRTable.TableDetailColumnSchema,
    label: 'TableDetailColumn',
    url: '/viz/table/reference/contract-detail#tabledetailcolumnschema',
  },

  DataReferenceSchema: {
    schema: DataIR.DataReferenceSchema,
    label: 'DataReference',
    url: '/viz/data/reference/contract#datareferenceschema',
  },
  DataModelSchema: {
    schema: DataIR.DataModelSchema,
    label: 'DataModel',
    url: '/viz/data/reference/contract#datamodelschema',
  },
  FieldDefinitionSchema: {
    schema: DataIR.FieldDefinitionSchema,
    label: 'FieldDefinition',
    url: '/viz/data/reference/contract#fielddefinitionschema',
  },
  DataTransformSchema: {
    schema: DataIR.TransformSchema,
    label: 'DataTransform',
    url: '/viz/data/reference/contract#transformschema',
  },
  SortTransformSchema: {
    schema: DataIR.SortTransformSchema,
    label: 'SortTransform',
    url: '/viz/data/reference/contract#sorttransformschema',
  },
  SummarizeTransformSchema: {
    schema: DataIR.SummarizeTransformSchema,
    label: 'SummarizeTransform',
    url: '/viz/data/reference/contract#summarizetransformschema',
  },
  SelectTransformSchema: {
    schema: DataIR.SelectTransformSchema,
    label: 'SelectTransform',
    url: '/viz/data/reference/contract#selecttransformschema',
  },
  AnnotateTransformSchema: {
    schema: DataIR.AnnotateTransformSchema,
    label: 'AnnotateTransform',
    url: '/viz/data/reference/contract#annotatetransformschema',
  },
  ReducerMetricsSchema: {
    schema: DataIR.ReducerMetricsSchema,
    label: 'ReducerMetrics',
    url: '/viz/data/reference/contract#reducermetricsschema',
  },
  ReducerOperationSchema: {
    schema: DataIR.ReducerOperationSchema,
    label: 'ReducerOperation',
    url: '/viz/data/reference/contract#reduceroperationschema',
  },
  SelectorOperationSchema: {
    schema: DataIR.SelectorOperationSchema,
    label: 'SelectorOperation',
    url: '/viz/data/reference/contract#selectoroperationschema',
  },
  AnnotateSelectorSchema: {
    schema: DataIR.AnnotateSelectorSchema,
    label: 'AnnotateSelector',
    url: '/viz/data/reference/contract#annotateselectorschema',
  },

  PlotSchema: {
    schema: IRPlot.PlotSchema,
    label: 'Plot',
    url: '/viz/plot/reference/plot#plotschema',
  },
  CoordinateCompositionSchema: {
    schema: IRPlot.CoordinateCompositionSchema,
    label: 'CoordinateComposition',
    url: '/viz/plot/reference/plot#coordinatecompositionschema',
  },
  CoordinateViewSchema: {
    schema: IRPlot.CoordinateViewSchema,
    label: 'CoordinateView',
    url: '/viz/plot/reference/plot#coordinateviewschema',
  },
  PlotFacetConfigurationSchema: {
    schema: IRPlot.PlotFacetConfigurationSchema,
    label: 'PlotFacetConfiguration',
    url: '/viz/plot/reference/plot#plotfacetconfigurationschema',
  },
  FacetArrangementSchema: {
    schema: IRPlot.FacetArrangementSchema,
    label: 'FacetArrangement',
    url: '/viz/plot/reference/plot#facetarrangementschema',
  },
  TrackArrangementSchema: {
    schema: IRPlot.TrackArrangementSchema,
    label: 'TrackArrangement',
    url: '/viz/plot/reference/plot#trackarrangementschema',
  },
  EncodingSchema: {
    schema: IRPlot.EncodingSchema,
    label: 'Encoding',
    url: '/viz/plot/reference/encoding#encodingschema',
  },
  ChannelSchema: {
    schema: IRPlot.ChannelSchema,
    label: 'Channel',
    url: '/viz/plot/reference/encoding#channelschema',
  },
  PositionEncodingSchema: {
    schema: IRPlot.PositionEncodingSchema,
    label: 'PositionEncoding',
    url: '/viz/plot/reference/encoding#positionencodingschema',
  },
  MarkChannelEncodingSchema: {
    schema: IRPlot.MarkChannelEncodingSchema,
    label: 'MarkChannelEncoding',
    url: '/viz/plot/reference/encoding#markchannelencodingschema',
  },
  SizeChannelSchema: {
    schema: IRPlot.SizeChannelSchema,
    label: 'SizeChannel',
    url: '/viz/plot/reference/encoding#sizechannelschema',
  },
  OpacityChannelSchema: {
    schema: IRPlot.OpacityChannelSchema,
    label: 'OpacityChannel',
    url: '/viz/plot/reference/encoding#opacitychannelschema',
  },
  ShapeChannelSchema: {
    schema: IRPlot.ShapeChannelSchema,
    label: 'ShapeChannel',
    url: '/viz/plot/reference/encoding#shapechannelschema',
  },
  TextChannelSchema: {
    schema: IRPlot.TextChannelSchema,
    label: 'TextChannel',
    url: '/viz/plot/reference/encoding#textchannelschema',
  },
  LabelPinStyleSchema: {
    schema: IRPlot.LabelPinStyleSchema,
    label: 'LabelPinStyle',
    url: '/viz/plot/reference/encoding#labelpinstyleschema',
  },
  MarkLabelContentSchema: {
    schema: IRPlot.MarkLabelContentSchema,
    label: 'MarkLabelContent',
    url: '/viz/plot/reference/encoding#marklabelcontentschema',
  },
  PointEncodingSchema: {
    schema: IRPlot.PointEncodingSchema,
    label: 'PointEncoding',
    url: '/viz/plot/reference/encoding#pointencodingschema',
  },
  MarkLabelSchema: {
    schema: IRPlot.MarkLabelSchema,
    label: 'MarkLabel',
    url: '/viz/plot/reference/encoding#marklabelschema',
  },
  MarkNodeLabelSchema: {
    schema: IRPlot.MarkNodeLabelSchema,
    label: 'MarkNodeLabel',
    url: '/viz/plot/reference/encoding#marknodelabelschema',
  },
  MarkGeometryLabelSchema: {
    schema: IRPlot.MarkGeometryLabelSchema,
    label: 'MarkGeometryLabel',
    url: '/viz/plot/reference/encoding#markgeometrylabelschema',
  },
  PlotTransformSchema: {
    schema: IRPlot.TransformSchema,
    label: 'PlotTransform',
    url: '/viz/plot/reference/transform#transformschema',
  },
  StackTransformSchema: {
    schema: IRPlot.StackTransformSchema,
    label: 'StackTransform',
    url: '/viz/plot/reference/transform#stacktransformschema',
  },
  BinTransformSchema: {
    schema: IRPlot.BinTransformSchema,
    label: 'BinTransform',
    url: '/viz/plot/reference/transform#bintransformschema',
  },
  RelateTransformSchema: {
    schema: IRPlot.RelateTransformSchema,
    label: 'RelateTransform',
    url: '/viz/plot/reference/transform#relatetransformschema',
  },
  EndpointProjectionSchema: {
    schema: IRPlot.EndpointProjectionSchema,
    label: 'EndpointProjection',
    url: '/viz/plot/reference/transform#endpointprojectionschema',
  },
  PairMeasureOperationSchema: {
    schema: IRPlot.PairMeasureOperationSchema,
    label: 'PairMeasureOperation',
    url: '/viz/plot/reference/transform#pairmeasureoperationschema',
  },
  NormalizeTransformSchema: {
    schema: IRPlot.NormalizeTransformSchema,
    label: 'NormalizeTransform',
    url: '/viz/plot/reference/transform#normalizetransformschema',
  },
  DeriveIntervalTransformSchema: {
    schema: IRPlot.DeriveIntervalTransformSchema,
    label: 'DeriveIntervalTransform',
    url: '/viz/plot/reference/transform#deriveintervaltransformschema',
  },
  JitterTransformSchema: {
    schema: IRPlot.JitterTransformSchema,
    label: 'JitterTransform',
    url: '/viz/plot/reference/transform#jittertransformschema',
  },
  DensityTransformSchema: {
    schema: IRPlot.DensityTransformSchema,
    label: 'DensityTransform',
    url: '/viz/plot/reference/transform#densitytransformschema',
  },
  DensityBandwidthSchema: {
    schema: IRPlot.DensityBandwidthSchema,
    label: 'DensityBandwidth',
    url: '/viz/plot/reference/transform#densitybandwidthschema',
  },
  SmoothTransformSchema: {
    schema: IRPlot.SmoothTransformSchema,
    label: 'SmoothTransform',
    url: '/viz/plot/reference/transform#smoothtransformschema',
  },
  SmoothMethodSchema: {
    schema: IRPlot.SmoothMethodSchema,
    label: 'SmoothMethod',
    url: '/viz/plot/reference/transform#smoothmethodschema',
  },
  MarkSchema: {
    schema: IRPlot.MarkSchema,
    label: 'Mark',
    url: '/viz/plot/reference/mark#markschema',
  },
  MarkOperationSchema: {
    schema: IRPlot.MarkOperationSchema,
    label: 'MarkOperation',
    url: '/viz/plot/reference/mark#markoperationschema',
  },
  MarkPlacementSchema: {
    schema: IRPlot.MarkPlacementSchema,
    label: 'MarkPlacement',
    url: '/viz/plot/reference/mark#markplacementschema',
  },
  PositionAdjustmentOperationSchema: {
    schema: IRPlot.PositionAdjustmentOperationSchema,
    label: 'PositionAdjustmentOperation',
    url: '/viz/plot/reference/mark#positionadjustmentoperationschema',
  },
  JitterPositionAdjustmentSchema: {
    schema: IRPlot.JitterPositionAdjustmentSchema,
    label: 'JitterPositionAdjustment',
    url: '/viz/plot/reference/mark#jitterpositionadjustmentschema',
  },
  PlotRandomDistributionSchema: {
    schema: IRPlot.PlotRandomDistributionSchema,
    label: 'PlotRandomDistribution',
    url: '/viz/plot/reference/mark#plotrandomdistributionschema',
  },
  JitterRatioSpanSchema: {
    schema: IRPlot.JitterRatioSpanSchema,
    label: 'JitterRatioSpan',
    url: '/viz/plot/reference/mark#jitterratiospanschema',
  },
  CustomPositionAdjustmentSchema: {
    schema: IRPlot.CustomPositionAdjustmentSchema,
    label: 'CustomPositionAdjustment',
    url: '/viz/plot/reference/mark#custompositionadjustmentschema',
  },
  MarkTransformSchema: {
    schema: IRPlot.MarkTransformSchema,
    label: 'MarkTransform',
    url: '/viz/plot/reference/mark#marktransformschema',
  },
  AnchorIdSchema: {
    schema: IRPlot.AnchorIdSchema,
    label: 'AnchorId',
    url: '/viz/plot/reference/mark#anchoridschema',
  },
  PointMarkSchema: {
    schema: IRPlot.PointMarkSchema,
    label: 'PointMark',
    url: '/viz/plot/reference/mark#pointmarkschema',
  },
  PathMarkSchema: {
    schema: IRPlot.PathMarkSchema,
    label: 'PathMark',
    url: '/viz/plot/reference/mark#pathmarkschema',
  },
  IntervalMarkSchema: {
    schema: IRPlot.IntervalMarkSchema,
    label: 'IntervalMark',
    url: '/viz/plot/reference/mark#intervalmarkschema',
  },
  IntervalBoundSchema: {
    schema: IRPlot.IntervalBoundSchema,
    label: 'IntervalBound',
    url: '/viz/plot/reference/mark#intervalboundschema',
  },
  IntervalBoundsSchema: {
    schema: IRPlot.IntervalBoundsSchema,
    label: 'IntervalBounds',
    url: '/viz/plot/reference/mark#intervalboundsschema',
  },
  ReferenceMarkSchema: {
    schema: IRPlot.ReferenceMarkSchema,
    label: 'ReferenceMark',
    url: '/viz/plot/reference/mark#referencemarkschema',
  },
  RelationMarkSchema: {
    schema: IRPlot.RelationMarkSchema,
    label: 'RelationMark',
    url: '/viz/plot/reference/mark#relationmarkschema',
  },
  RelationPrimitiveStyleSchema: {
    schema: IRPlot.RelationPrimitiveStyleSchema,
    label: 'RelationPrimitiveStyle',
    url: '/viz/plot/reference/mark#relationprimitivestyleschema',
  },
  RelationPathGeometrySchema: {
    schema: IRPlot.RelationPathGeometrySchema,
    label: 'RelationPathGeometry',
    url: '/viz/plot/reference/mark#relationpathgeometryschema',
  },
  RelationRibbonOptionsSchema: {
    schema: IRPlot.RelationRibbonOptionsSchema,
    label: 'RelationRibbonOptions',
    url: '/viz/plot/reference/mark#relationribbonoptionsschema',
  },
  RelationRouteStepSchema: {
    schema: IRPlot.RelationRouteStepSchema,
    label: 'RelationRouteStep',
    url: '/viz/plot/reference/mark#relationroutestepschema',
  },
  CustomMarkSchema: {
    schema: IRPlot.CustomMarkSchema,
    label: 'CustomMark',
    url: '/viz/plot/reference/mark#custommarkschema',
  },
  PlotTargetRefSchema: {
    schema: IRPlot.PlotTargetRefSchema,
    label: 'PlotTargetRef',
    url: '/viz/plot/reference/mark#plottargetrefschema',
  },
  RelationRoutingSchema: {
    schema: IRPlot.RelationRoutingSchema,
    label: 'RelationRouting',
    url: '/viz/plot/reference/mark#relationroutingschema',
  },
  PathClosureSchema: {
    schema: IRPlot.PathClosureSchema,
    label: 'PathClosure',
    url: '/viz/plot/reference/mark#pathclosureschema',
  },
  ScaleSchema: {
    schema: IRPlot.ScaleSchema,
    label: 'Scale',
    url: '/viz/plot/reference/scale#scaleschema',
  },
  ScaleOperationSchema: {
    schema: IRPlot.ScaleOperationSchema,
    label: 'ScaleOperation',
    url: '/viz/plot/reference/scale#scaleoperationschema',
  },
  ColorSchemeNameSchema: {
    schema: IRPlot.ColorSchemeNameSchema,
    label: 'ColorSchemeName',
    url: '/viz/plot/reference/scale#colorschemenameschema',
  },
  CategoryValueSchema: {
    schema: IRPlot.CategoryValueSchema,
    label: 'CategoryValue',
    url: '/viz/plot/reference/scale#categoryvalueschema',
  },
  DomainPaddingSchema: {
    schema: IRPlot.DomainPaddingSchema,
    label: 'DomainPadding',
    url: '/viz/plot/reference/scale#domainpaddingschema',
  },
  LinearScaleSchema: {
    schema: IRPlot.LinearScaleSchema,
    label: 'LinearScale',
    url: '/viz/plot/reference/scale#linearscaleschema',
  },
  BandScaleSchema: {
    schema: IRPlot.BandScaleSchema,
    label: 'BandScale',
    url: '/viz/plot/reference/scale#bandscaleschema',
  },
  PointScaleSchema: {
    schema: IRPlot.PointScaleSchema,
    label: 'PointScale',
    url: '/viz/plot/reference/scale#pointscaleschema',
  },
  OrdinalScaleSchema: {
    schema: IRPlot.OrdinalScaleSchema,
    label: 'OrdinalScale',
    url: '/viz/plot/reference/scale#ordinalscaleschema',
  },
  TimeScaleSchema: {
    schema: IRPlot.TimeScaleSchema,
    label: 'TimeScale',
    url: '/viz/plot/reference/scale#timescaleschema',
  },
  LogScaleSchema: {
    schema: IRPlot.LogScaleSchema,
    label: 'LogScale',
    url: '/viz/plot/reference/scale#logscaleschema',
  },
  PowScaleSchema: {
    schema: IRPlot.PowScaleSchema,
    label: 'PowScale',
    url: '/viz/plot/reference/scale#powscaleschema',
  },
  SqrtScaleSchema: {
    schema: IRPlot.SqrtScaleSchema,
    label: 'SqrtScale',
    url: '/viz/plot/reference/scale#sqrtscaleschema',
  },
  SymlogScaleSchema: {
    schema: IRPlot.SymlogScaleSchema,
    label: 'SymlogScale',
    url: '/viz/plot/reference/scale#symlogscaleschema',
  },
  RadialScaleSchema: {
    schema: IRPlot.RadialScaleSchema,
    label: 'RadialScale',
    url: '/viz/plot/reference/scale#radialscaleschema',
  },
  SequentialColorScaleSchema: {
    schema: IRPlot.SequentialColorScaleSchema,
    label: 'SequentialColorScale',
    url: '/viz/plot/reference/scale#sequentialcolorscaleschema',
  },
  DivergingColorScaleSchema: {
    schema: IRPlot.DivergingColorScaleSchema,
    label: 'DivergingColorScale',
    url: '/viz/plot/reference/scale#divergingcolorscaleschema',
  },
  QuantizeColorScaleSchema: {
    schema: IRPlot.QuantizeColorScaleSchema,
    label: 'QuantizeColorScale',
    url: '/viz/plot/reference/scale#quantizecolorscaleschema',
  },
  ThresholdColorScaleSchema: {
    schema: IRPlot.ThresholdColorScaleSchema,
    label: 'ThresholdColorScale',
    url: '/viz/plot/reference/scale#thresholdcolorscaleschema',
  },
  QuantileColorScaleSchema: {
    schema: IRPlot.QuantileColorScaleSchema,
    label: 'QuantileColorScale',
    url: '/viz/plot/reference/scale#quantilecolorscaleschema',
  },
  CustomScaleSchema: {
    schema: IRPlot.CustomScaleSchema,
    label: 'CustomScale',
    url: '/viz/plot/reference/scale#customscaleschema',
  },
  PlotCoordinateSchema: {
    schema: IRPlot.CoordinateSchema,
    label: 'PlotCoordinate',
    url: '/viz/plot/reference/coordinate#coordinateschema',
  },
  Cartesian2DSchema: {
    schema: IRPlot.Cartesian2DSchema,
    label: 'Cartesian2D',
    url: '/viz/plot/reference/coordinate#cartesian2dschema',
  },
  Polar2DSchema: {
    schema: IRPlot.Polar2DSchema,
    label: 'Polar2D',
    url: '/viz/plot/reference/coordinate#polar2dschema',
  },
  Cartesian1DSchema: {
    schema: IRPlot.Cartesian1DSchema,
    label: 'Cartesian1D',
    url: '/viz/plot/reference/coordinate#cartesian1dschema',
  },
  Polar1DSchema: {
    schema: IRPlot.Polar1DSchema,
    label: 'Polar1D',
    url: '/viz/plot/reference/coordinate#polar1dschema',
  },
  CustomCoordinateSchema: {
    schema: IRPlot.CustomCoordinateSchema,
    label: 'CustomCoordinate',
    url: '/viz/plot/reference/coordinate#customcoordinateschema',
  },
  PlotCoordinateOperationSchema: {
    schema: IRPlot.CoordinateOperationSchema,
    label: 'PlotCoordinateOperation',
    url: '/viz/plot/reference/coordinate#coordinateoperationschema',
  },
  GuideSchema: {
    schema: IRPlot.GuideSchema,
    label: 'Guide',
    url: '/viz/plot/reference/guide#guideschema',
  },
  AxisGuideValueSchema: {
    schema: IRPlot.AxisGuideValueSchema,
    label: 'AxisGuideValue',
    url: '/viz/plot/reference/guide#axisguidevalueschema',
  },
  GuideLineStyleSchema: {
    schema: IRPlot.GuideLineStyleSchema,
    label: 'GuideLineStyle',
    url: '/viz/plot/reference/guide#guidelinestyleschema',
  },
  AxisLineStyleSchema: {
    schema: IRPlot.AxisLineStyleSchema,
    label: 'AxisLineStyle',
    url: '/viz/plot/reference/guide#axislinestyleschema',
  },
  AxisGridLineStyleSchema: {
    schema: IRPlot.AxisGridLineStyleSchema,
    label: 'AxisGridLineStyle',
    url: '/viz/plot/reference/guide#axisgridlinestyleschema',
  },
  GuideTextStyleSchema: {
    schema: IRPlot.GuideTextStyleSchema,
    label: 'GuideTextStyle',
    url: '/viz/plot/reference/guide#guidetextstyleschema',
  },
  GuideTickIntervalSchema: {
    schema: IRPlot.GuideTickIntervalSchema,
    label: 'GuideTickInterval',
    url: '/viz/plot/reference/guide#guidetickintervalschema',
  },
  GuideTickSourceSchema: {
    schema: IRPlot.GuideTickSourceSchema,
    label: 'GuideTickSource',
    url: '/viz/plot/reference/guide#guideticksourceschema',
  },
  GuideTickLabelFormatSchema: {
    schema: IRPlot.GuideTickLabelFormatSchema,
    label: 'GuideTickLabelFormat',
    url: '/viz/plot/reference/guide#guideticklabelformatschema',
  },
  AxisGuideSchema: {
    schema: IRPlot.AxisGuideSchema,
    label: 'AxisGuide',
    url: '/viz/plot/reference/guide#axisguideschema',
  },
  LegendGuideSchema: {
    schema: IRPlot.LegendGuideSchema,
    label: 'LegendGuide',
    url: '/viz/plot/reference/guide#legendguideschema',
  },
  GuideTargetSelectorSchema: {
    schema: IRPlot.GuideTargetSelectorSchema,
    label: 'GuideTargetSelector',
    url: '/viz/plot/reference/guide#guidetargetselectorschema',
  },
  AxisPlacementSchema: {
    schema: IRPlot.AxisPlacementSchema,
    label: 'AxisPlacement',
    url: '/viz/plot/reference/guide#axisplacementschema',
  },
  AxisLineSchema: {
    schema: IRPlot.AxisLineSchema,
    label: 'AxisLine',
    url: '/viz/plot/reference/guide#axislineschema',
  },
  AxisTicksSchema: {
    schema: IRPlot.AxisTicksSchema,
    label: 'AxisTicks',
    url: '/viz/plot/reference/guide#axisticksschema',
  },
  AxisTickDensitySchema: {
    schema: IRPlot.AxisTickDensitySchema,
    label: 'AxisTickDensity',
    url: '/viz/plot/reference/guide#axistickdensityschema',
  },
  AxisTickMarkSchema: {
    schema: IRPlot.AxisTickMarkSchema,
    label: 'AxisTickMark',
    url: '/viz/plot/reference/guide#axistickmarkschema',
  },
  AxisTickLabelAutoRotateSchema: {
    schema: IRPlot.AxisTickLabelAutoRotateSchema,
    label: 'AxisTickLabelAutoRotate',
    url: '/viz/plot/reference/guide#axisticklabelautorotateschema',
  },
  AxisTickLabelAutoHideSchema: {
    schema: IRPlot.AxisTickLabelAutoHideSchema,
    label: 'AxisTickLabelAutoHide',
    url: '/viz/plot/reference/guide#axisticklabelautohideschema',
  },
  AxisTickLabelBoundsSchema: {
    schema: IRPlot.AxisTickLabelBoundsSchema,
    label: 'AxisTickLabelBounds',
    url: '/viz/plot/reference/guide#axisticklabelboundsschema',
  },
  AxisTickLabelLayoutSchema: {
    schema: IRPlot.AxisTickLabelLayoutSchema,
    label: 'AxisTickLabelLayout',
    url: '/viz/plot/reference/guide#axisticklabellayoutschema',
  },
  AxisTickLabelsSchema: {
    schema: IRPlot.AxisTickLabelsSchema,
    label: 'AxisTickLabels',
    url: '/viz/plot/reference/guide#axisticklabelsschema',
  },
  AxisTitleSchema: {
    schema: IRPlot.AxisTitleSchema,
    label: 'AxisTitle',
    url: '/viz/plot/reference/guide#axistitleschema',
  },
  AxisGridSchema: {
    schema: IRPlot.AxisGridSchema,
    label: 'AxisGrid',
    url: '/viz/plot/reference/guide#axisgridschema',
  },
  AxisGridComponentSchema: {
    schema: IRPlot.AxisGridComponentSchema,
    label: 'AxisGridComponent',
    url: '/viz/plot/reference/guide#axisgridcomponentschema',
  },
  LegendGuideStyleSchema: {
    schema: IRPlot.LegendGuideStyleSchema,
    label: 'LegendGuideStyle',
    url: '/viz/plot/reference/guide#legendguidestyleschema',
  },
  BoxPaddingSchema: {
    schema: IRPlot.BoxPaddingSchema,
    label: 'BoxPadding',
    url: '/viz/plot/reference/layout#boxpaddingschema',
  },
  PlotLayerSchema: {
    schema: IRPlot.PlotLayerSchema,
    label: 'PlotLayer',
    url: '/viz/plot/reference/layer#plotlayerschema',
  },
  PlotDefaultsSchema: {
    schema: IRPlot.PlotDefaultsSchema,
    label: 'PlotDefaults',
    url: '/viz/plot/reference/theme#plotdefaultsschema',
  },
  PlotAreaDefaultsSchema: {
    schema: IRPlot.PlotAreaDefaultsSchema,
    label: 'PlotAreaDefaults',
    url: '/viz/plot/reference/theme#plotareadefaultsschema',
  },
  PlotTypographyDefaultsSchema: {
    schema: IRPlot.PlotTypographyDefaultsSchema,
    label: 'PlotTypographyDefaults',
    url: '/viz/plot/reference/theme#plottypographydefaultsschema',
  },
  PlotAxisDefaultsSchema: {
    schema: IRPlot.PlotAxisDefaultsSchema,
    label: 'PlotAxisDefaults',
    url: '/viz/plot/reference/theme#plotaxisdefaultsschema',
  },
  PlotPaletteDefaultsSchema: {
    schema: IRPlot.PlotPaletteDefaultsSchema,
    label: 'PlotPaletteDefaults',
    url: '/viz/plot/reference/theme#plotpalettedefaultsschema',
  },
  PlotAxisRuleSchema: {
    schema: IRPlot.PlotAxisRuleSchema,
    label: 'PlotAxisRule',
    url: '/viz/plot/reference/theme#plotaxisruleschema',
  },
  PlotAxisRulesSchema: {
    schema: IRPlot.PlotAxisRulesSchema,
    label: 'PlotAxisRules',
    url: '/viz/plot/reference/theme#plotaxisrulesschema',
  },
  PlotDefaultsSourceRecordSchema: {
    schema: IRPlot.PlotDefaultsSourceRecordSchema,
    label: 'PlotDefaultsSourceRecord',
    url: '/viz/plot/reference/theme#inspection',
  },
  PlotAxisRuleSourceRecordSchema: {
    schema: IRPlot.PlotAxisRuleSourceRecordSchema,
    label: 'PlotAxisRuleSourceRecord',
    url: '/viz/plot/reference/theme#inspection',
  },
  PlotPaletteResolutionSchema: {
    schema: IRPlot.PlotPaletteResolutionSchema,
    label: 'PlotPaletteResolution',
    url: '/viz/plot/reference/theme#inspection',
  },
  PlotThemeResolutionSchema: {
    schema: IRPlot.PlotThemeResolutionSchema,
    label: 'PlotThemeResolution',
    url: '/viz/plot/reference/theme#inspection',
  },
};

export function lookupSchema(schema: core.$ZodType): SchemaRegistryEntry | undefined {
  const match = Object.entries(SCHEMA_REGISTRY).find(([, entry]) => entry.schema === schema);
  if (match) return { ...match[1], label: match[1].label.endsWith('Schema') ? match[1].label : match[0] };
  return undefined;
}
