import type { core, z } from 'zod';

import * as IR from '@retikz/core';
import * as DataIR from '@retikz/data';
import * as PlotIR from '@retikz/plot';
import * as StandardIR from '@retikz/standard';
import * as TableIR from '@retikz/table';

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
  /** 渲染类型签名时使用的名字（去掉 "Schema" 后缀） */
  label: string;
  /** Reference / contract 页面 URL（含可选 #anchor） */
  url: string;
  /** docs runtime 使用的可选本地化描述 */
  localizations?: Partial<Record<'zh' | 'en', SchemaRegistryLocalization>>;
};

export const SCHEMA_REGISTRY: Record<string, SchemaRegistryEntry> = {
  SceneSchema: { schema: IR.SceneSchema, label: 'Scene', url: '/kernel/reference/schema/scene' },
  ThemeSchema: {
    schema: IR.ThemeSchema,
    label: 'Theme',
    url: '/kernel/reference/schema/scene#theme',
    localizations: {
      zh: {
        description: 'Scene 或 Scope 的稀疏、可序列化 Theme 覆盖',
        descriptions: {
          style: '视觉人格：neutral、academic、vibrant 或 clean；省略时继承外层值',
          mode: '明暗环境：light 或 dark；省略时继承外层值',
        },
      },
    },
  },
  ChildSchema: { schema: IR.ChildSchema, label: 'Child', url: '/kernel/reference/schema/scene#child' },
  ViewBoxSchema: { schema: IR.ViewBoxSchema, label: 'ViewBox', url: '/kernel/reference/schema/scene#viewbox' },
  CompositeNodeSchema: {
    schema: IR.CompositeNodeSchema,
    label: 'CompositeNode',
    url: '/kernel/reference/schema/scene#compositenode',
  },
  JsonObjectSchema: {
    schema: IR.JsonObjectSchema,
    label: 'JsonObject',
    url: '/kernel/reference/schema/scene#jsonobject',
  },
  JsonValueSchema: {
    schema: IR.JsonValueSchema,
    label: 'JsonValue',
    url: '/kernel/reference/schema/scene#jsonvalue',
  },

  ScopeSchema: { schema: IR.ScopeSchema, label: 'Scope', url: '/kernel/reference/schema/scope#scope' },
  ScopePlacementSchema: {
    schema: IR.ScopePlacementSchema,
    label: 'ScopePlacement',
    url: '/kernel/reference/schema/scope#scopeplacement',
  },
  ScopeSelfPointSchema: {
    schema: IR.ScopeSelfPointSchema,
    label: 'ScopeSelfPoint',
    url: '/kernel/reference/schema/scope#scopeselfpoint',
  },
  NodeDefaultSchema: {
    schema: IR.NodeDefaultSchema,
    label: 'NodeDefault',
    url: '/kernel/reference/schema/scope#default-channels',
  },
  PathDefaultSchema: {
    schema: IR.PathDefaultSchema,
    label: 'PathDefault',
    url: '/kernel/reference/schema/scope#default-channels',
  },
  LabelDefaultSchema: {
    schema: IR.LabelDefaultSchema,
    label: 'LabelDefault',
    url: '/kernel/reference/schema/scope#default-channels',
  },
  TransformSchema: {
    schema: IR.TransformSchema,
    label: 'Transform',
    url: '/kernel/reference/schema/scope#transform',
  },
  ClipSpecSchema: { schema: IR.ClipSpecSchema, label: 'ClipSpec', url: '/kernel/reference/schema/scope#clipspec' },
  RectClipSchema: { schema: IR.RectClipSchema, label: 'RectClip', url: '/kernel/reference/schema/scope#rectclip' },
  CircleClipSchema: {
    schema: IR.CircleClipSchema,
    label: 'CircleClip',
    url: '/kernel/reference/schema/scope#circleclip',
  },
  EllipseClipSchema: {
    schema: IR.EllipseClipSchema,
    label: 'EllipseClip',
    url: '/kernel/reference/schema/scope#ellipseclip',
  },
  PolygonClipSchema: {
    schema: IR.PolygonClipSchema,
    label: 'PolygonClip',
    url: '/kernel/reference/schema/scope#polygonclip',
  },
  PathClipSchema: { schema: IR.PathClipSchema, label: 'PathClip', url: '/kernel/reference/schema/scope#pathclip' },
  CompoundClipSchema: {
    schema: IR.CompoundClipSchema,
    label: 'CompoundClip',
    url: '/kernel/reference/schema/scope#compoundclip',
  },

  NodeSchema: { schema: IR.NodeSchema, label: 'Node', url: '/kernel/reference/schema/entity#node' },
  NodeLabelSchema: { schema: IR.NodeLabelSchema, label: 'NodeLabel', url: '/kernel/reference/schema/entity#nodelabel' },
  CoordinateSchema: {
    schema: IR.CoordinateSchema,
    label: 'Coordinate',
    url: '/kernel/reference/schema/entity#coordinate',
  },
  FontSchema: { schema: IR.FontSchema, label: 'Font', url: '/kernel/reference/schema/entity#font' },
  TextBlockSchema: { schema: IR.TextBlockSchema, label: 'TextBlock', url: '/kernel/reference/schema/entity#textblock' },
  LineSpecSchema: { schema: IR.LineSpecSchema, label: 'LineSpec', url: '/kernel/reference/schema/entity#linespec' },
  StyledLineSchema: {
    schema: IR.StyledLineSchema,
    label: 'StyledLine',
    url: '/kernel/reference/schema/entity#styledline',
  },
  MixedLineSchema: {
    schema: IR.MixedLineSchema,
    label: 'MixedLine',
    url: '/kernel/reference/schema/entity#mixedline',
  },
  TextRunSchema: { schema: IR.TextRunSchema, label: 'TextRun', url: '/kernel/reference/schema/entity#textrun' },
  MathRunSchema: { schema: IR.MathRunSchema, label: 'MathRun', url: '/kernel/reference/schema/entity#mathrun' },
  ShapeRefSchema: { schema: IR.ShapeRefSchema, label: 'ShapeRef', url: '/kernel/reference/schema/entity#shaperef' },
  BoundarySchema: { schema: IR.BoundarySchema, label: 'Boundary', url: '/kernel/reference/schema/entity#boundary' },

  PathStrokeSchema: {
    schema: IR.PathStrokeSchema,
    label: 'PathStroke',
    url: '/kernel/reference/schema/path#pathstroke',
  },
  PathFillSchema: {
    schema: IR.PathFillSchema,
    label: 'PathFill',
    url: '/kernel/reference/schema/path#pathfill',
  },
  PathGeometrySchema: {
    schema: IR.PathGeometrySchema,
    label: 'PathGeometry',
    url: '/kernel/reference/schema/path#pathgeometry',
  },
  PathDecorationSchema: {
    schema: IR.PathDecorationSchema,
    label: 'PathDecoration',
    url: '/kernel/reference/schema/path#pathdecoration',
  },
  PathStructureSchema: {
    schema: IR.PathStructureSchema,
    label: 'PathStructure',
    url: '/kernel/reference/schema/path#pathstructure',
  },
  PathSchema: { schema: IR.PathSchema, label: 'Path', url: '/kernel/reference/schema/path#path' },
  DrawableStyleSchema: {
    schema: IR.DrawableStyleSchema,
    label: 'DrawableStyle',
    url: '/kernel/reference/schema/path#drawablestyle',
  },
  DrawableInstanceSchema: {
    schema: IR.DrawableInstanceSchema,
    label: 'DrawableInstance',
    url: '/kernel/reference/schema/path#drawableinstance',
  },
  PathRibbonOptionsSchema: {
    schema: IR.PathRibbonOptionsSchema,
    label: 'PathRibbonOptions',
    url: '/kernel/reference/schema/path#pathribbonoptions',
  },
  PathMarkPlacementSchema: {
    schema: IR.PathMarkPlacementSchema,
    label: 'PathMarkPlacement',
    url: '/kernel/reference/schema/path#pathmarkplacement',
  },
  StepSchema: { schema: IR.StepSchema, label: 'Step', url: '/kernel/reference/schema/path#step' },
  GeometryLabelSchema: {
    schema: IR.GeometryLabelSchema,
    label: 'GeometryLabel',
    url: '/kernel/reference/schema/path#geometrylabel',
  },
  StepLabelSchema: { schema: IR.StepLabelSchema, label: 'StepLabel', url: '/kernel/reference/schema/path#steplabel' },
  ControlPointSchema: {
    schema: IR.ControlPointSchema,
    label: 'ControlPoint',
    url: '/kernel/reference/schema/path#controlpoint',
  },
  TargetSchema: { schema: IR.TargetSchema, label: 'Target', url: '/kernel/reference/schema/path#target' },
  PositionSchema: { schema: IR.PositionSchema, label: 'Position', url: '/kernel/reference/schema/placement#position' },
  PolarPositionSchema: {
    schema: IR.PolarPositionSchema,
    label: 'PolarPosition',
    url: '/kernel/reference/schema/placement#polarposition',
  },
  AtPositionSchema: {
    schema: IR.AtPositionSchema,
    label: 'AtPosition',
    url: '/kernel/reference/schema/placement#atposition',
  },
  OffsetPositionSchema: {
    schema: IR.OffsetPositionSchema,
    label: 'OffsetPosition',
    url: '/kernel/reference/schema/placement#offsetposition',
  },
  BetweenPositionSchema: {
    schema: IR.BetweenPositionSchema,
    label: 'BetweenPosition',
    url: '/kernel/reference/schema/placement#betweenposition',
  },
  AnchorPositionSchema: {
    schema: IR.AnchorPositionSchema,
    label: 'AnchorPosition',
    url: '/kernel/reference/schema/placement#anchorposition',
  },
  AbsoluteTargetSchema: {
    schema: IR.AbsoluteTargetSchema,
    label: 'AbsoluteTarget',
    url: '/kernel/reference/schema/placement#absolutetarget',
  },
  NodeTargetSchema: {
    schema: IR.NodeTargetSchema,
    label: 'NodeTarget',
    url: '/kernel/reference/schema/placement#nodetarget',
  },

  GraphicPaintSchema: {
    schema: IR.GraphicPaintSchema,
    label: 'GraphicPaint',
    url: '/kernel/reference/schema/style#graphicpaint',
  },
  GraphicOpacitySchema: {
    schema: IR.GraphicOpacitySchema,
    label: 'GraphicOpacity',
    url: '/kernel/reference/schema/style#graphicopacity',
  },
  GraphicEffectsSchema: {
    schema: IR.GraphicEffectsSchema,
    label: 'GraphicEffects',
    url: '/kernel/reference/schema/style#graphiceffects',
  },
  StrokeStyleSchema: {
    schema: IR.StrokeStyleSchema,
    label: 'StrokeStyle',
    url: '/kernel/reference/schema/style#strokestyle',
  },
  PaintValueSchema: {
    schema: IR.PaintValueSchema,
    label: 'PaintValue',
    url: '/kernel/reference/schema/style#paintvalue',
  },
  GraphicStyleSchema: {
    schema: IR.GraphicStyleSchema,
    label: 'GraphicStyle',
    url: '/kernel/reference/schema/style#graphicstyle',
  },
  CascadingGraphicStyleSchema: {
    schema: IR.CascadingGraphicStyleSchema,
    label: 'CascadingGraphicStyle',
    url: '/kernel/reference/schema/style#cascadinggraphicstyle',
  },
  DropShadowSchema: {
    schema: IR.DropShadowSchema,
    label: 'DropShadow',
    url: '/kernel/reference/schema/style#dropshadow',
  },
  GradientStopSchema: {
    schema: IR.GradientStopSchema,
    label: 'GradientStop',
    url: '/kernel/reference/schema/style#gradientstop',
  },
  PaintSpecSchema: { schema: IR.PaintSpecSchema, label: 'PaintSpec', url: '/kernel/reference/schema/style#paintspec' },
  LinearGradientPaintSpecSchema: {
    schema: IR.LinearGradientPaintSpecSchema,
    label: 'LinearGradientPaintSpec',
    url: '/kernel/reference/schema/style#lineargradient',
  },
  RadialGradientPaintSpecSchema: {
    schema: IR.RadialGradientPaintSpecSchema,
    label: 'RadialGradientPaintSpec',
    url: '/kernel/reference/schema/style#radialgradient',
  },
  ConicGradientPaintSpecSchema: {
    schema: IR.ConicGradientPaintSpecSchema,
    label: 'ConicGradientPaintSpec',
    url: '/kernel/reference/schema/style#conicgradient',
  },
  PatternPaintSpecSchema: {
    schema: IR.PatternPaintSpecSchema,
    label: 'PatternPaintSpec',
    url: '/kernel/reference/schema/style#pattern',
  },
  ImagePaintSpecSchema: {
    schema: IR.ImagePaintSpecSchema,
    label: 'ImagePaintSpec',
    url: '/kernel/reference/schema/style#image',
  },

  AnimationTrackSchema: {
    schema: IR.AnimationTrackSchema,
    label: 'AnimationTrack',
    url: '/kernel/reference/schema/animation#animationtrack',
  },
  KeyframeSchema: {
    schema: IR.KeyframeSchema,
    label: 'Keyframe',
    url: '/kernel/reference/schema/animation#keyframe',
  },
  EasingSchema: { schema: IR.EasingSchema, label: 'Easing', url: '/kernel/reference/schema/animation#easing' },
  TriggerSchema: { schema: IR.TriggerSchema, label: 'Trigger', url: '/kernel/reference/schema/animation#trigger' },
  EventTriggerSchema: {
    schema: IR.EventTriggerSchema,
    label: 'EventTrigger',
    url: '/kernel/reference/schema/animation#eventtrigger',
  },
  OriginSchema: { schema: IR.OriginSchema, label: 'Origin', url: '/kernel/reference/schema/animation#origin' },

  MoveStepSchema: { schema: IR.MoveStepSchema, label: 'MoveStep', url: '/kernel/reference/schema/path#move' },
  LineStepSchema: { schema: IR.LineStepSchema, label: 'LineStep', url: '/kernel/reference/schema/path#line' },
  AxisLineStepSchema: {
    schema: IR.AxisLineStepSchema,
    label: 'AxisLineStep',
    url: '/kernel/reference/schema/path#axis-line',
  },
  FoldStepSchema: { schema: IR.FoldStepSchema, label: 'FoldStep', url: '/kernel/reference/schema/path#fold' },
  CycleStepSchema: { schema: IR.CycleStepSchema, label: 'CycleStep', url: '/kernel/reference/schema/path#cycle' },
  CurveStepSchema: { schema: IR.CurveStepSchema, label: 'CurveStep', url: '/kernel/reference/schema/path#curve' },
  CubicStepSchema: { schema: IR.CubicStepSchema, label: 'CubicStep', url: '/kernel/reference/schema/path#cubic' },
  BendStepSchema: { schema: IR.BendStepSchema, label: 'BendStep', url: '/kernel/reference/schema/path#bend' },
  ArcStepSchema: { schema: IR.ArcStepSchema, label: 'ArcStep', url: '/kernel/reference/schema/path#arc' },
  CirclePathStepSchema: {
    schema: IR.CirclePathStepSchema,
    label: 'CirclePathStep',
    url: '/kernel/reference/schema/path#circlepath',
  },
  EllipsePathStepSchema: {
    schema: IR.EllipsePathStepSchema,
    label: 'EllipsePathStep',
    url: '/kernel/reference/schema/path#ellipsepath',
  },
  RectangleStepSchema: {
    schema: IR.RectangleStepSchema,
    label: 'RectangleStep',
    url: '/kernel/reference/schema/path#rectangle',
  },
  SmoothStepSchema: {
    schema: IR.SmoothStepSchema,
    label: 'SmoothStep',
    url: '/kernel/reference/schema/path#smooth',
  },
  GeneratorStepSchema: {
    schema: IR.GeneratorStepSchema,
    label: 'GeneratorStep',
    url: '/kernel/reference/schema/path#generator',
  },

  RelativeTargetSchema: {
    schema: IR.RelativeTargetSchema,
    label: 'RelativeTarget',
    url: '/kernel/reference/schema/path#relative',
  },
  RelativeAccumulateTargetSchema: {
    schema: IR.RelativeAccumulateTargetSchema,
    label: 'RelativeAccumulateTarget',
    url: '/kernel/reference/schema/path#relativeaccumulate',
  },

  ArrowMarkSchema: {
    schema: IR.ArrowMarkSchema,
    label: 'ArrowMark',
    url: '/kernel/reference/schema/path#arrowmark',
  },
  ArrowDetailSchema: {
    schema: IR.ArrowDetailSchema,
    label: 'ArrowDetail',
    url: '/kernel/reference/schema/path#arrowdetail',
  },
  ArrowEndDetailSchema: {
    schema: IR.ArrowEndDetailSchema,
    label: 'ArrowEndDetail',
    url: '/kernel/reference/schema/path#arrowenddetail',
  },

  LayoutInspectBoundsOptionsInputSchema: {
    schema: IR.LayoutInspectBoundsOptionsInputSchema,
    label: 'LayoutInspectBoundsOptionsInput',
    url: '/standard/layout/reference/runtime#layoutinspectboundsoptionsinputschema',
  },
  LayoutInspectSpacingOptionsInputSchema: {
    schema: IR.LayoutInspectSpacingOptionsInputSchema,
    label: 'LayoutInspectSpacingOptionsInput',
    url: '/kernel/reference/runtime/compile#layoutinspectspacingoptionsinputschema',
  },
  BaseLayoutInspectOptionsInputSchema: {
    schema: IR.BaseLayoutInspectOptionsInputSchema,
    label: 'BaseLayoutInspectOptionsInput',
    url: '/standard/layout/reference/runtime#baselayoutinspectoptionsinputschema',
  },
  InspectOptionsInputSchema: {
    schema: IR.InspectOptionsInputSchema,
    label: 'InspectOptionsInput',
    url: '/standard/layout/reference/runtime#inspectoptionsinputschema',
  },
  FlexLayoutInspectOptionsInputSchema: {
    schema: StandardIR.FlexLayoutInspectOptionsInputSchema,
    label: 'FlexLayoutInspectOptionsInput',
    url: '/standard/layout/reference/runtime#flexlayoutinspectoptionsinputschema',
  },
  GridLayoutInspectOptionsInputSchema: {
    schema: StandardIR.GridLayoutInspectOptionsInputSchema,
    label: 'GridLayoutInspectOptionsInput',
    url: '/standard/layout/reference/runtime#gridlayoutinspectoptionsinputschema',
  },
  OverlayLayoutInspectOptionsInputSchema: {
    schema: StandardIR.OverlayLayoutInspectOptionsInputSchema,
    label: 'OverlayLayoutInspectOptionsInput',
    url: '/standard/layout/reference/runtime#overlaylayoutinspectoptionsinputschema',
  },

  FlexLayoutSchema: {
    schema: StandardIR.FlexLayoutSchema,
    label: 'FlexLayout',
    url: '/standard/layout/reference/contract-input#flexlayoutschema',
  },
  GridLayoutSchema: {
    schema: StandardIR.GridLayoutSchema,
    label: 'GridLayout',
    url: '/standard/layout/reference/contract-input#gridlayoutschema',
  },
  OverlayLayoutSchema: {
    schema: StandardIR.OverlayLayoutSchema,
    label: 'OverlayLayout',
    url: '/standard/layout/reference/contract-input#overlaylayoutschema',
  },
  LayoutItemSchema: {
    schema: StandardIR.LayoutItemSchema,
    label: 'LayoutItem',
    url: '/standard/layout/reference/contract-input#layoutitemschema',
  },
  LayoutArtifactSchema: {
    schema: StandardIR.LayoutArtifactSchema,
    label: 'LayoutArtifact',
    url: '/standard/layout/reference/contract-artifact#layoutartifactschema',
  },
  LayoutSpacingArtifactSchema: {
    schema: StandardIR.LayoutSpacingArtifactSchema,
    label: 'LayoutSpacingArtifact',
    url: '/standard/layout/reference/contract-artifact#layoutspacingartifactschema',
  },
  FlexLayoutArtifactSchema: {
    schema: StandardIR.FlexLayoutArtifactSchema,
    label: 'FlexLayoutArtifact',
    url: '/standard/layout/reference/contract-artifact#flexlayoutartifactschema',
  },
  GridLayoutArtifactSchema: {
    schema: StandardIR.GridLayoutArtifactSchema,
    label: 'GridLayoutArtifact',
    url: '/standard/layout/reference/contract-artifact#gridlayoutartifactschema',
  },
  OverlayLayoutArtifactSchema: {
    schema: StandardIR.OverlayLayoutArtifactSchema,
    label: 'OverlayLayoutArtifact',
    url: '/standard/layout/reference/contract-artifact#overlaylayoutartifactschema',
  },
  LegendSchema: {
    schema: StandardIR.LegendSchema,
    label: 'Legend',
    url: '/standard/composite/legend#legendschema',
    localizations: { zh: LegendSchemaZhLocalization },
  },
  LegendArtifactSchema: {
    schema: StandardIR.LegendArtifactSchema,
    label: 'LegendArtifact',
    url: '/standard/composite/legend#legendartifactschema',
    localizations: { zh: LegendArtifactSchemaZhLocalization },
  },

  TableSpecSchema: {
    schema: TableIR.TableSpecSchema,
    label: 'TableSpec',
    url: '/viz/table/reference/contract-table#tablespecschema',
  },
  DetailTableSpecSchema: {
    schema: TableIR.DetailTableSpecSchema,
    label: 'DetailTableSpec',
    url: '/viz/table/reference/contract-detail#detailtablespecschema',
  },
  ManualTableSpecSchema: {
    schema: TableIR.ManualTableSpecSchema,
    label: 'ManualTableSpec',
    url: '/viz/table/reference/contract-table#manualtablespecschema',
  },
  CustomTableSpecSchema: {
    schema: TableIR.CustomTableSpecSchema,
    label: 'CustomTableSpec',
    url: '/viz/table/reference/contract-table#customtablespecschema',
  },
  ManualTableCellSchema: {
    schema: TableIR.ManualTableCellSchema,
    label: 'ManualTableCell',
    url: '/viz/table/reference/contract-table#manualtablecellschema',
  },
  TableCellPayloadSchema: {
    schema: TableIR.TableCellPayloadSchema,
    label: 'TableCellPayload',
    url: '/viz/table/reference/contract-table#tablecellpayloadschema',
  },
  TableCellValuePayloadSchema: {
    schema: TableIR.TableCellValuePayloadSchema,
    label: 'TableCellValuePayload',
    url: '/viz/table/reference/contract-table#tablecellvaluepayloadschema',
  },
  TableCellContentPayloadSchema: {
    schema: TableIR.TableCellContentPayloadSchema,
    label: 'TableCellContentPayload',
    url: '/viz/table/reference/contract-table#tablecellcontentpayloadschema',
  },
  TablePresentationRefSchema: {
    schema: TableIR.TablePresentationRefSchema,
    label: 'TablePresentationRef',
    url: '/viz/table/reference/contract-table#tablepresentationrefschema',
  },
  TableFormatterRefSchema: {
    schema: TableIR.TableFormatterRefSchema,
    label: 'TableFormatterRef',
    url: '/viz/table/reference/contract-table#tableformatterrefschema',
  },
  TableCellSelectorSchema: {
    schema: TableIR.TableCellSelectorSchema,
    label: 'TableCellSelector',
    url: '/viz/table/reference/contract-table#tablecellselectorschema',
  },
  TableCellRuleSchema: {
    schema: TableIR.TableCellRuleSchema,
    label: 'TableCellRule',
    url: '/viz/table/reference/contract-table#tablecellruleschema',
  },
  TableCellVisualEncodingSchema: {
    schema: TableIR.TableCellVisualEncodingSchema,
    label: 'TableCellVisualEncoding',
    url: '/viz/table/reference/contract-table#tablecellvisualencodingschema',
  },
  TableStyleSchema: {
    schema: TableIR.TableStyleSchema,
    label: 'TableStyle',
    url: '/viz/table/reference/contract-table#tablestyleschema',
  },
  TableThemeModeSchema: {
    schema: TableIR.TableThemeModeSchema,
    label: 'TableThemeMode',
    url: '/viz/table/reference/contract-table#tablethememodeschema',
  },
  TableStyleTokensSchema: {
    schema: TableIR.TableStyleTokensSchema,
    label: 'TableStyleTokens',
    url: '/viz/table/reference/contract-table#tablestyletokensschema',
  },
  TableCellSpanSchema: {
    schema: TableIR.TableCellSpanSchema,
    label: 'TableCellSpan',
    url: '/viz/table/reference/contract-layout#tablecellspanschema',
  },
  TableCellLayoutSchema: {
    schema: TableIR.TableCellLayoutSchema,
    label: 'TableCellLayout',
    url: '/viz/table/reference/contract-layout#tablecelllayoutschema',
  },
  TableCellFitSchema: {
    schema: TableIR.TableCellFitSchema,
    label: 'TableCellFit',
    url: '/viz/table/reference/contract-layout#tablecellfitschema',
  },
  TableCellOverflowSchema: {
    schema: TableIR.TableCellOverflowSchema,
    label: 'TableCellOverflow',
    url: '/viz/table/reference/contract-layout#tablecelloverflowschema',
  },
  TableLayoutSchema: {
    schema: TableIR.TableLayoutSchema,
    label: 'TableLayout',
    url: '/viz/table/reference/contract-layout#tablelayoutschema',
  },
  TableFixedTrackSizeSchema: {
    schema: TableIR.TableFixedTrackSizeSchema,
    label: 'TableFixedTrackSize',
    url: '/viz/table/reference/contract-layout#tablefixedtracksizeschema',
  },
  TableAutoTrackSizeSchema: {
    schema: TableIR.TableAutoTrackSizeSchema,
    label: 'TableAutoTrackSize',
    url: '/viz/table/reference/contract-layout#tableautotracksizeschema',
  },
  TableFractionTrackSizeSchema: {
    schema: TableIR.TableFractionTrackSizeSchema,
    label: 'TableFractionTrackSize',
    url: '/viz/table/reference/contract-layout#tablefractiontracksizeschema',
  },
  TableMinmaxTrackSizeSchema: {
    schema: TableIR.TableMinmaxTrackSizeSchema,
    label: 'TableMinmaxTrackSize',
    url: '/viz/table/reference/contract-layout#tableminmaxtracksizeschema',
  },
  TableTrackSizeSchema: {
    schema: TableIR.TableTrackSizeSchema,
    label: 'TableTrackSize',
    url: '/viz/table/reference/contract-layout#tabletracksizeschema',
  },
  TableTrackOverrideSchema: {
    schema: TableIR.TableTrackOverrideSchema,
    label: 'TableTrackOverride',
    url: '/viz/table/reference/contract-layout#tabletrackoverrideschema',
  },
  TableTrackOverridesSchema: {
    schema: TableIR.TableTrackOverridesSchema,
    label: 'TableTrackOverrides',
    url: '/viz/table/reference/contract-layout#tabletrackoverridesschema',
  },
  TableNoBorderSchema: {
    schema: TableIR.TableNoBorderSchema,
    label: 'TableNoBorder',
    url: '/viz/table/reference/contract-layout#tablenoborderschema',
  },
  TableLineBorderSchema: {
    schema: TableIR.TableLineBorderSchema,
    label: 'TableLineBorder',
    url: '/viz/table/reference/contract-layout#tablelineborderschema',
  },
  TableBorderSchema: {
    schema: TableIR.TableBorderSchema,
    label: 'TableBorder',
    url: '/viz/table/reference/contract-layout#tableborderschema',
  },
  TableCellBordersSchema: {
    schema: TableIR.TableCellBordersSchema,
    label: 'TableCellBorders',
    url: '/viz/table/reference/contract-layout#tablecellbordersschema',
  },
  TableBordersSchema: {
    schema: TableIR.TableBordersSchema,
    label: 'TableBorders',
    url: '/viz/table/reference/contract-layout#tablebordersschema',
  },
  TableLayoutManifestSchema: {
    schema: TableIR.TableLayoutManifestSchema,
    label: 'TableLayoutManifest',
    url: '/viz/table/reference/manifest#tablelayoutmanifestschema',
  },
  TableTrackManifestEntrySchema: {
    schema: TableIR.TableTrackManifestEntrySchema,
    label: 'TableTrackManifestEntry',
    url: '/viz/table/reference/manifest#tabletrackmanifestentryschema',
  },
  TableCellManifestEntrySchema: {
    schema: TableIR.TableCellManifestEntrySchema,
    label: 'TableCellManifestEntry',
    url: '/viz/table/reference/manifest#tablecellmanifestentryschema',
  },
  ResolvedTableBorderLineSchema: {
    schema: TableIR.ResolvedTableBorderLineSchema,
    label: 'ResolvedTableBorderLine',
    url: '/viz/table/reference/manifest#resolvedtableborderlineschema',
  },
  TableBorderSourceSchema: {
    schema: TableIR.TableBorderSourceSchema,
    label: 'TableBorderSource',
    url: '/viz/table/reference/manifest#tablebordersourceschema',
  },
  TableNoBorderContributionSchema: {
    schema: TableIR.TableNoBorderContributionSchema,
    label: 'TableNoBorderContribution',
    url: '/viz/table/reference/manifest#tablenobordercontributionschema',
  },
  TableLineBorderContributionSchema: {
    schema: TableIR.TableLineBorderContributionSchema,
    label: 'TableLineBorderContribution',
    url: '/viz/table/reference/manifest#tablelinebordercontributionschema',
  },
  TableBorderContributionSchema: {
    schema: TableIR.TableBorderContributionSchema,
    label: 'TableBorderContribution',
    url: '/viz/table/reference/manifest#tablebordercontributionschema',
  },
  TableBorderManifestAtomSchema: {
    schema: TableIR.TableBorderManifestAtomSchema,
    label: 'TableBorderManifestAtom',
    url: '/viz/table/reference/manifest#tablebordermanifestatomschema',
  },
  TableBorderManifestEntrySchema: {
    schema: TableIR.TableBorderManifestEntrySchema,
    label: 'TableBorderManifestEntry',
    url: '/viz/table/reference/manifest#tablebordermanifestentryschema',
  },
  TableBorderPathMetaSchema: {
    schema: TableIR.TableBorderPathMetaSchema,
    label: 'TableBorderPathMeta',
    url: '/viz/table/reference/manifest#tableborderpathmetaschema',
  },
  TableBorderLocatorEntrySchema: {
    schema: TableIR.TableBorderLocatorEntrySchema,
    label: 'TableBorderLocatorEntry',
    url: '/viz/table/reference/manifest#tableborderlocatorentryschema',
  },
  DetailTableStructureSchema: {
    schema: TableIR.DetailTableStructureSchema,
    label: 'DetailTableStructure',
    url: '/viz/table/reference/contract-detail#detailtablestructureschema',
  },
  TableDetailColumnSchema: {
    schema: TableIR.TableDetailColumnSchema,
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

  PlotSpecSchema: {
    schema: PlotIR.PlotSpecSchema,
    label: 'PlotSpec',
    url: '/viz/plot/reference/plot#plotspecschema',
  },
  CoordinateCompositionSchema: {
    schema: PlotIR.CoordinateCompositionSchema,
    label: 'CoordinateComposition',
    url: '/viz/plot/reference/plot#coordinatecompositionschema',
  },
  CoordinateViewSchema: {
    schema: PlotIR.CoordinateViewSchema,
    label: 'CoordinateView',
    url: '/viz/plot/reference/plot#coordinateviewschema',
  },
  FacetArrangementSchema: {
    schema: PlotIR.FacetArrangementSchema,
    label: 'FacetArrangement',
    url: '/viz/plot/reference/plot#facetarrangementschema',
  },
  TrackArrangementSchema: {
    schema: PlotIR.TrackArrangementSchema,
    label: 'TrackArrangement',
    url: '/viz/plot/reference/plot#trackarrangementschema',
  },
  EncodingSchema: {
    schema: PlotIR.EncodingSchema,
    label: 'Encoding',
    url: '/viz/plot/reference/encoding#encodingschema',
  },
  ChannelSchema: {
    schema: PlotIR.ChannelSchema,
    label: 'Channel',
    url: '/viz/plot/reference/encoding#channelschema',
  },
  PositionEncodingSchema: {
    schema: PlotIR.PositionEncodingSchema,
    label: 'PositionEncoding',
    url: '/viz/plot/reference/encoding#positionencodingschema',
  },
  MarkChannelEncodingSchema: {
    schema: PlotIR.MarkChannelEncodingSchema,
    label: 'MarkChannelEncoding',
    url: '/viz/plot/reference/encoding#markchannelencodingschema',
  },
  SizeChannelSchema: {
    schema: PlotIR.SizeChannelSchema,
    label: 'SizeChannel',
    url: '/viz/plot/reference/encoding#sizechannelschema',
  },
  OpacityChannelSchema: {
    schema: PlotIR.OpacityChannelSchema,
    label: 'OpacityChannel',
    url: '/viz/plot/reference/encoding#opacitychannelschema',
  },
  ShapeChannelSchema: {
    schema: PlotIR.ShapeChannelSchema,
    label: 'ShapeChannel',
    url: '/viz/plot/reference/encoding#shapechannelschema',
  },
  TextChannelSchema: {
    schema: PlotIR.TextChannelSchema,
    label: 'TextChannel',
    url: '/viz/plot/reference/encoding#textchannelschema',
  },
  LabelPinStyleSchema: {
    schema: PlotIR.LabelPinStyleSchema,
    label: 'LabelPinStyle',
    url: '/viz/plot/reference/encoding#labelpinstyleschema',
  },
  MarkLabelContentSchema: {
    schema: PlotIR.MarkLabelContentSchema,
    label: 'MarkLabelContent',
    url: '/viz/plot/reference/encoding#marklabelcontentschema',
  },
  PointEncodingSchema: {
    schema: PlotIR.PointEncodingSchema,
    label: 'PointEncoding',
    url: '/viz/plot/reference/encoding#pointencodingschema',
  },
  MarkLabelSchema: {
    schema: PlotIR.MarkLabelSchema,
    label: 'MarkLabel',
    url: '/viz/plot/reference/encoding#marklabelschema',
  },
  MarkNodeLabelSchema: {
    schema: PlotIR.MarkNodeLabelSchema,
    label: 'MarkNodeLabel',
    url: '/viz/plot/reference/encoding#marknodelabelschema',
  },
  MarkGeometryLabelSchema: {
    schema: PlotIR.MarkGeometryLabelSchema,
    label: 'MarkGeometryLabel',
    url: '/viz/plot/reference/encoding#markgeometrylabelschema',
  },
  PlotTransformSchema: {
    schema: PlotIR.TransformSchema,
    label: 'PlotTransform',
    url: '/viz/plot/reference/transform#transformschema',
  },
  StackTransformSchema: {
    schema: PlotIR.StackTransformSchema,
    label: 'StackTransform',
    url: '/viz/plot/reference/transform#stacktransformschema',
  },
  BinTransformSchema: {
    schema: PlotIR.BinTransformSchema,
    label: 'BinTransform',
    url: '/viz/plot/reference/transform#bintransformschema',
  },
  RelateTransformSchema: {
    schema: PlotIR.RelateTransformSchema,
    label: 'RelateTransform',
    url: '/viz/plot/reference/transform#relatetransformschema',
  },
  EndpointProjectionSchema: {
    schema: PlotIR.EndpointProjectionSchema,
    label: 'EndpointProjection',
    url: '/viz/plot/reference/transform#endpointprojectionschema',
  },
  PairMeasureOperationSchema: {
    schema: PlotIR.PairMeasureOperationSchema,
    label: 'PairMeasureOperation',
    url: '/viz/plot/reference/transform#pairmeasureoperationschema',
  },
  NormalizeTransformSchema: {
    schema: PlotIR.NormalizeTransformSchema,
    label: 'NormalizeTransform',
    url: '/viz/plot/reference/transform#normalizetransformschema',
  },
  DeriveIntervalTransformSchema: {
    schema: PlotIR.DeriveIntervalTransformSchema,
    label: 'DeriveIntervalTransform',
    url: '/viz/plot/reference/transform#deriveintervaltransformschema',
  },
  JitterTransformSchema: {
    schema: PlotIR.JitterTransformSchema,
    label: 'JitterTransform',
    url: '/viz/plot/reference/transform#jittertransformschema',
  },
  DensityTransformSchema: {
    schema: PlotIR.DensityTransformSchema,
    label: 'DensityTransform',
    url: '/viz/plot/reference/transform#densitytransformschema',
  },
  DensityBandwidthSpecSchema: {
    schema: PlotIR.DensityBandwidthSpecSchema,
    label: 'DensityBandwidthSpec',
    url: '/viz/plot/reference/transform#densitybandwidthspecschema',
  },
  SmoothTransformSchema: {
    schema: PlotIR.SmoothTransformSchema,
    label: 'SmoothTransform',
    url: '/viz/plot/reference/transform#smoothtransformschema',
  },
  SmoothMethodSpecSchema: {
    schema: PlotIR.SmoothMethodSpecSchema,
    label: 'SmoothMethodSpec',
    url: '/viz/plot/reference/transform#smoothmethodspecschema',
  },
  MarkSchema: {
    schema: PlotIR.MarkSchema,
    label: 'Mark',
    url: '/viz/plot/reference/mark#markschema',
  },
  MarkOperationSchema: {
    schema: PlotIR.MarkOperationSchema,
    label: 'MarkOperation',
    url: '/viz/plot/reference/mark#markoperationschema',
  },
  MarkTransformSchema: {
    schema: PlotIR.MarkTransformSchema,
    label: 'MarkTransform',
    url: '/viz/plot/reference/mark#marktransformschema',
  },
  AnchorIdSpecSchema: {
    schema: PlotIR.AnchorIdSpecSchema,
    label: 'AnchorIdSpec',
    url: '/viz/plot/reference/mark#anchoridspecschema',
  },
  PointMarkSchema: {
    schema: PlotIR.PointMarkSchema,
    label: 'PointMark',
    url: '/viz/plot/reference/mark#pointmarkschema',
  },
  PathMarkSchema: {
    schema: PlotIR.PathMarkSchema,
    label: 'PathMark',
    url: '/viz/plot/reference/mark#pathmarkschema',
  },
  IntervalMarkSchema: {
    schema: PlotIR.IntervalMarkSchema,
    label: 'IntervalMark',
    url: '/viz/plot/reference/mark#intervalmarkschema',
  },
  IntervalBoundSchema: {
    schema: PlotIR.IntervalBoundSchema,
    label: 'IntervalBound',
    url: '/viz/plot/reference/mark#intervalboundschema',
  },
  IntervalBoundsSchema: {
    schema: PlotIR.IntervalBoundsSchema,
    label: 'IntervalBounds',
    url: '/viz/plot/reference/mark#intervalboundsschema',
  },
  ReferenceMarkSchema: {
    schema: PlotIR.ReferenceMarkSchema,
    label: 'ReferenceMark',
    url: '/viz/plot/reference/mark#referencemarkschema',
  },
  RelationMarkSchema: {
    schema: PlotIR.RelationMarkSchema,
    label: 'RelationMark',
    url: '/viz/plot/reference/mark#relationmarkschema',
  },
  RelationPrimitiveStyleSchema: {
    schema: PlotIR.RelationPrimitiveStyleSchema,
    label: 'RelationPrimitiveStyle',
    url: '/viz/plot/reference/mark#relationprimitivestyleschema',
  },
  RelationPathGeometrySchema: {
    schema: PlotIR.RelationPathGeometrySchema,
    label: 'RelationPathGeometry',
    url: '/viz/plot/reference/mark#relationpathgeometryschema',
  },
  RelationRibbonOptionsSchema: {
    schema: PlotIR.RelationRibbonOptionsSchema,
    label: 'RelationRibbonOptions',
    url: '/viz/plot/reference/mark#relationribbonoptionsschema',
  },
  RelationRouteStepSchema: {
    schema: PlotIR.RelationRouteStepSchema,
    label: 'RelationRouteStep',
    url: '/viz/plot/reference/mark#relationroutestepschema',
  },
  CustomMarkSchema: {
    schema: PlotIR.CustomMarkSchema,
    label: 'CustomMark',
    url: '/viz/plot/reference/mark#custommarkschema',
  },
  PlotTargetRefSchema: {
    schema: PlotIR.PlotTargetRefSchema,
    label: 'PlotTargetRef',
    url: '/viz/plot/reference/mark#plottargetrefschema',
  },
  RelationRoutingSpecSchema: {
    schema: PlotIR.RelationRoutingSpecSchema,
    label: 'RelationRoutingSpec',
    url: '/viz/plot/reference/mark#relationroutingspecschema',
  },
  PathClosureSchema: {
    schema: PlotIR.PathClosureSchema,
    label: 'PathClosure',
    url: '/viz/plot/reference/mark#pathclosureschema',
  },
  ScaleSchema: {
    schema: PlotIR.ScaleSchema,
    label: 'Scale',
    url: '/viz/plot/reference/scale#scaleschema',
  },
  ScaleOperationSchema: {
    schema: PlotIR.ScaleOperationSchema,
    label: 'ScaleOperation',
    url: '/viz/plot/reference/scale#scaleoperationschema',
  },
  ColorSchemeNameSchema: {
    schema: PlotIR.ColorSchemeNameSchema,
    label: 'ColorSchemeName',
    url: '/viz/plot/reference/scale#colorschemenameschema',
  },
  CategoryValueSchema: {
    schema: PlotIR.CategoryValueSchema,
    label: 'CategoryValue',
    url: '/viz/plot/reference/scale#categoryvalueschema',
  },
  DomainPaddingSchema: {
    schema: PlotIR.DomainPaddingSchema,
    label: 'DomainPadding',
    url: '/viz/plot/reference/scale#domainpaddingschema',
  },
  LinearScaleSchema: {
    schema: PlotIR.LinearScaleSchema,
    label: 'LinearScale',
    url: '/viz/plot/reference/scale#linearscaleschema',
  },
  BandScaleSchema: {
    schema: PlotIR.BandScaleSchema,
    label: 'BandScale',
    url: '/viz/plot/reference/scale#bandscaleschema',
  },
  PointScaleSchema: {
    schema: PlotIR.PointScaleSchema,
    label: 'PointScale',
    url: '/viz/plot/reference/scale#pointscaleschema',
  },
  OrdinalScaleSchema: {
    schema: PlotIR.OrdinalScaleSchema,
    label: 'OrdinalScale',
    url: '/viz/plot/reference/scale#ordinalscaleschema',
  },
  TimeScaleSchema: {
    schema: PlotIR.TimeScaleSchema,
    label: 'TimeScale',
    url: '/viz/plot/reference/scale#timescaleschema',
  },
  LogScaleSchema: {
    schema: PlotIR.LogScaleSchema,
    label: 'LogScale',
    url: '/viz/plot/reference/scale#logscaleschema',
  },
  PowScaleSchema: {
    schema: PlotIR.PowScaleSchema,
    label: 'PowScale',
    url: '/viz/plot/reference/scale#powscaleschema',
  },
  SqrtScaleSchema: {
    schema: PlotIR.SqrtScaleSchema,
    label: 'SqrtScale',
    url: '/viz/plot/reference/scale#sqrtscaleschema',
  },
  SymlogScaleSchema: {
    schema: PlotIR.SymlogScaleSchema,
    label: 'SymlogScale',
    url: '/viz/plot/reference/scale#symlogscaleschema',
  },
  RadialScaleSchema: {
    schema: PlotIR.RadialScaleSchema,
    label: 'RadialScale',
    url: '/viz/plot/reference/scale#radialscaleschema',
  },
  SequentialColorScaleSchema: {
    schema: PlotIR.SequentialColorScaleSchema,
    label: 'SequentialColorScale',
    url: '/viz/plot/reference/scale#sequentialcolorscaleschema',
  },
  DivergingColorScaleSchema: {
    schema: PlotIR.DivergingColorScaleSchema,
    label: 'DivergingColorScale',
    url: '/viz/plot/reference/scale#divergingcolorscaleschema',
  },
  QuantizeColorScaleSchema: {
    schema: PlotIR.QuantizeColorScaleSchema,
    label: 'QuantizeColorScale',
    url: '/viz/plot/reference/scale#quantizecolorscaleschema',
  },
  ThresholdColorScaleSchema: {
    schema: PlotIR.ThresholdColorScaleSchema,
    label: 'ThresholdColorScale',
    url: '/viz/plot/reference/scale#thresholdcolorscaleschema',
  },
  QuantileColorScaleSchema: {
    schema: PlotIR.QuantileColorScaleSchema,
    label: 'QuantileColorScale',
    url: '/viz/plot/reference/scale#quantilecolorscaleschema',
  },
  CustomScaleSchema: {
    schema: PlotIR.CustomScaleSchema,
    label: 'CustomScale',
    url: '/viz/plot/reference/scale#customscaleschema',
  },
  PlotCoordinateSchema: {
    schema: PlotIR.CoordinateSchema,
    label: 'PlotCoordinate',
    url: '/viz/plot/reference/coordinate#coordinateschema',
  },
  Cartesian2DSchema: {
    schema: PlotIR.Cartesian2DSchema,
    label: 'Cartesian2D',
    url: '/viz/plot/reference/coordinate#cartesian2dschema',
  },
  Polar2DSchema: {
    schema: PlotIR.Polar2DSchema,
    label: 'Polar2D',
    url: '/viz/plot/reference/coordinate#polar2dschema',
  },
  Cartesian1DSchema: {
    schema: PlotIR.Cartesian1DSchema,
    label: 'Cartesian1D',
    url: '/viz/plot/reference/coordinate#cartesian1dschema',
  },
  Polar1DSchema: {
    schema: PlotIR.Polar1DSchema,
    label: 'Polar1D',
    url: '/viz/plot/reference/coordinate#polar1dschema',
  },
  CustomCoordinateSchema: {
    schema: PlotIR.CustomCoordinateSchema,
    label: 'CustomCoordinate',
    url: '/viz/plot/reference/coordinate#customcoordinateschema',
  },
  PlotCoordinateOperationSchema: {
    schema: PlotIR.CoordinateOperationSchema,
    label: 'PlotCoordinateOperation',
    url: '/viz/plot/reference/coordinate#coordinateoperationschema',
  },
  GuideSchema: {
    schema: PlotIR.GuideSchema,
    label: 'Guide',
    url: '/viz/plot/reference/guide#guideschema',
  },
  AxisGuideValueSchema: {
    schema: PlotIR.AxisGuideValueSchema,
    label: 'AxisGuideValue',
    url: '/viz/plot/reference/guide#axisguidevalueschema',
  },
  GuideLineStyleSchema: {
    schema: PlotIR.GuideLineStyleSchema,
    label: 'GuideLineStyle',
    url: '/viz/plot/reference/guide#guidelinestyleschema',
  },
  AxisLineStyleSchema: {
    schema: PlotIR.AxisLineStyleSchema,
    label: 'AxisLineStyle',
    url: '/viz/plot/reference/guide#axislinestyleschema',
  },
  AxisGridLineStyleSchema: {
    schema: PlotIR.AxisGridLineStyleSchema,
    label: 'AxisGridLineStyle',
    url: '/viz/plot/reference/guide#axisgridlinestyleschema',
  },
  GuideTextStyleSchema: {
    schema: PlotIR.GuideTextStyleSchema,
    label: 'GuideTextStyle',
    url: '/viz/plot/reference/guide#guidetextstyleschema',
  },
  GuideTickIntervalSchema: {
    schema: PlotIR.GuideTickIntervalSchema,
    label: 'GuideTickInterval',
    url: '/viz/plot/reference/guide#guidetickintervalschema',
  },
  GuideTickSourceSchema: {
    schema: PlotIR.GuideTickSourceSchema,
    label: 'GuideTickSource',
    url: '/viz/plot/reference/guide#guideticksourceschema',
  },
  GuideTickLabelFormatSchema: {
    schema: PlotIR.GuideTickLabelFormatSchema,
    label: 'GuideTickLabelFormat',
    url: '/viz/plot/reference/guide#guideticklabelformatschema',
  },
  AxisGuideSchema: {
    schema: PlotIR.AxisGuideSchema,
    label: 'AxisGuide',
    url: '/viz/plot/reference/guide#axisguideschema',
  },
  LegendGuideSchema: {
    schema: PlotIR.LegendGuideSchema,
    label: 'LegendGuide',
    url: '/viz/plot/reference/guide#legendguideschema',
  },
  GuideTargetSelectorSchema: {
    schema: PlotIR.GuideTargetSelectorSchema,
    label: 'GuideTargetSelector',
    url: '/viz/plot/reference/guide#guidetargetselectorschema',
  },
  AxisPlacementSchema: {
    schema: PlotIR.AxisPlacementSchema,
    label: 'AxisPlacement',
    url: '/viz/plot/reference/guide#axisplacementschema',
  },
  AxisLineSchema: {
    schema: PlotIR.AxisLineSchema,
    label: 'AxisLine',
    url: '/viz/plot/reference/guide#axislineschema',
  },
  AxisTicksSchema: {
    schema: PlotIR.AxisTicksSchema,
    label: 'AxisTicks',
    url: '/viz/plot/reference/guide#axisticksschema',
  },
  AxisTickDensitySchema: {
    schema: PlotIR.AxisTickDensitySchema,
    label: 'AxisTickDensity',
    url: '/viz/plot/reference/guide#axistickdensityschema',
  },
  AxisTickMarkSchema: {
    schema: PlotIR.AxisTickMarkSchema,
    label: 'AxisTickMark',
    url: '/viz/plot/reference/guide#axistickmarkschema',
  },
  AxisTickLabelAutoRotateSchema: {
    schema: PlotIR.AxisTickLabelAutoRotateSchema,
    label: 'AxisTickLabelAutoRotate',
    url: '/viz/plot/reference/guide#axisticklabelautorotateschema',
  },
  AxisTickLabelAutoHideSchema: {
    schema: PlotIR.AxisTickLabelAutoHideSchema,
    label: 'AxisTickLabelAutoHide',
    url: '/viz/plot/reference/guide#axisticklabelautohideschema',
  },
  AxisTickLabelBoundsSchema: {
    schema: PlotIR.AxisTickLabelBoundsSchema,
    label: 'AxisTickLabelBounds',
    url: '/viz/plot/reference/guide#axisticklabelboundsschema',
  },
  AxisTickLabelLayoutSchema: {
    schema: PlotIR.AxisTickLabelLayoutSchema,
    label: 'AxisTickLabelLayout',
    url: '/viz/plot/reference/guide#axisticklabellayoutschema',
  },
  AxisTickLabelsSchema: {
    schema: PlotIR.AxisTickLabelsSchema,
    label: 'AxisTickLabels',
    url: '/viz/plot/reference/guide#axisticklabelsschema',
  },
  AxisTitleSchema: {
    schema: PlotIR.AxisTitleSchema,
    label: 'AxisTitle',
    url: '/viz/plot/reference/guide#axistitleschema',
  },
  AxisGridSchema: {
    schema: PlotIR.AxisGridSchema,
    label: 'AxisGrid',
    url: '/viz/plot/reference/guide#axisgridschema',
  },
  AxisGridComponentSchema: {
    schema: PlotIR.AxisGridComponentSchema,
    label: 'AxisGridComponent',
    url: '/viz/plot/reference/guide#axisgridcomponentschema',
  },
  LegendGuideStyleSchema: {
    schema: PlotIR.LegendGuideStyleSchema,
    label: 'LegendGuideStyle',
    url: '/viz/plot/reference/guide#legendguidestyleschema',
  },
  BoxPaddingSchema: {
    schema: PlotIR.BoxPaddingSchema,
    label: 'BoxPadding',
    url: '/viz/plot/reference/layout#boxpaddingschema',
  },
  LayoutPlacementSchema: {
    schema: PlotIR.LayoutPlacementSchema,
    label: 'LayoutPlacement',
    url: '/viz/plot/reference/layout#layoutplacementschema',
  },
  PlotLayoutSchema: {
    schema: PlotIR.PlotLayoutSchema,
    label: 'PlotLayout',
    url: '/viz/plot/reference/layout#plotlayoutschema',
  },
  PlotLabelSchema: {
    schema: PlotIR.PlotLabelSchema,
    label: 'PlotLabel',
    url: '/viz/plot/reference/layout#plotlabelschema',
  },
  PlotLayerSchema: {
    schema: PlotIR.PlotLayerSchema,
    label: 'PlotLayer',
    url: '/viz/plot/reference/layer#plotlayerschema',
  },
  PlotAxisThemeSchema: {
    schema: PlotIR.PlotAxisThemeSchema,
    label: 'PlotAxisTheme',
    url: '/viz/plot/reference/theme#plotaxisthemeschema',
  },
  PlotPaletteThemeSchema: {
    schema: PlotIR.PlotPaletteThemeSchema,
    label: 'PlotPaletteTheme',
    url: '/viz/plot/reference/theme#plotpalettethemeschema',
  },
  PlotThemeSchema: {
    schema: PlotIR.PlotThemeSchema,
    label: 'PlotTheme',
    url: '/viz/plot/reference/theme#plotthemeschema',
  },
};

export function lookupSchema(schema: core.$ZodType): SchemaRegistryEntry | undefined {
  return Object.values(SCHEMA_REGISTRY).find(e => e.schema === schema);
}
