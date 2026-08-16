import type { core, z } from 'zod';

import * as IR from '@retikz/core';
import * as DataIR from '@retikz/data';
import * as GraphIR from '@retikz/graph';
import * as LayoutIR from '@retikz/layout';
import * as LayoutInspectIR from '@retikz/layout/inspect';
import * as IRPlot from '@retikz/plot';
import * as StandardIR from '@retikz/standard';
import { RibbonPathOptionsSchema } from '@retikz/standard/ribbon';
import * as IRTable from '@retikz/table';

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
        description: 'Scene 或 Scope 的稀疏、可序列化 Theme 覆盖；tokens 按 owner namespace 由 registry 校验',
        descriptions: {
          style: '显式视觉人格名称；省略时继承外层值，根级省略时使用 owner 默认 baseline',
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
  ClipSchema: { schema: IR.ClipSchema, label: 'Clip', url: '/kernel/reference/schema/scope#clip' },
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
  NodeSchema: { schema: IR.NodeSchema, label: 'Node', url: '/kernel/reference/schema/entity#node' },
  NodeLabelSchema: { schema: IR.NodeLabelSchema, label: 'NodeLabel', url: '/kernel/reference/schema/entity#nodelabel' },
  CoordinateSchema: {
    schema: IR.CoordinateSchema,
    label: 'Coordinate',
    url: '/kernel/reference/schema/entity#coordinate',
  },
  FontSchema: { schema: IR.FontSchema, label: 'Font', url: '/kernel/reference/schema/entity#font' },
  FontFamilySchema: {
    schema: IR.FontFamilySchema,
    label: 'FontFamily',
    url: '/kernel/reference/schema/entity#fontfamily',
  },
  FontWeightSchema: {
    schema: IR.FontWeightSchema,
    label: 'FontWeight',
    url: '/kernel/reference/schema/entity#fontweight',
  },
  FontStyleSchema: {
    schema: IR.FontStyleSchema,
    label: 'FontStyle',
    url: '/kernel/reference/schema/entity#fontstyle',
  },
  TextAlignSchema: {
    schema: IR.TextAlignSchema,
    label: 'TextAlign',
    url: '/kernel/reference/schema/entity#textalign',
  },
  LineHeightSchema: {
    schema: IR.LineHeightSchema,
    label: 'LineHeight',
    url: '/kernel/reference/schema/entity#lineheight',
  },
  TextBlockSchema: { schema: IR.TextBlockSchema, label: 'TextBlock', url: '/kernel/reference/schema/entity#textblock' },
  LineSchema: { schema: IR.LineSchema, label: 'Line', url: '/kernel/reference/schema/entity#irline' },
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
  RibbonPathOptionsSchema: {
    schema: RibbonPathOptionsSchema,
    label: 'RibbonPathOptions',
    url: '/library/standard/extension/ribbon',
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
  StrokeWidthSchema: {
    schema: IR.StrokeWidthSchema,
    label: 'StrokeWidth',
    url: '/kernel/reference/schema/style#strokewidth',
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
  PaintSchema: { schema: IR.PaintSchema, label: 'Paint', url: '/kernel/reference/schema/style#paint' },
  LinearGradientPaintSchema: {
    schema: IR.LinearGradientPaintSchema,
    label: 'LinearGradientPaint',
    url: '/kernel/reference/schema/style#lineargradient',
  },
  RadialGradientPaintSchema: {
    schema: IR.RadialGradientPaintSchema,
    label: 'RadialGradientPaint',
    url: '/kernel/reference/schema/style#radialgradient',
  },
  ConicGradientPaintSchema: {
    schema: IR.ConicGradientPaintSchema,
    label: 'ConicGradientPaint',
    url: '/kernel/reference/schema/style#conicgradient',
  },
  PatternPaintSchema: {
    schema: IR.PatternPaintSchema,
    label: 'PatternPaint',
    url: '/kernel/reference/schema/style#pattern',
  },
  ImagePaintSchema: {
    schema: IR.ImagePaintSchema,
    label: 'ImagePaint',
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
    schema: LayoutInspectIR.LayoutInspectBoundsOptionsInputSchema,
    label: 'LayoutInspectBoundsOptionsInput',
    url: '/library/layout/reference/runtime#layoutinspectboundsoptionsinputschema',
  },
  LayoutInspectSpacingOptionsInputSchema: {
    schema: LayoutInspectIR.LayoutInspectSpacingOptionsInputSchema,
    label: 'LayoutInspectSpacingOptionsInput',
    url: '/library/layout/reference/runtime#layoutinspectspacingoptionsinputschema',
  },
  BaseLayoutInspectOptionsInputSchema: {
    schema: LayoutInspectIR.BaseLayoutInspectOptionsInputSchema,
    label: 'BaseLayoutInspectOptionsInput',
    url: '/library/layout/reference/runtime#baselayoutinspectoptionsinputschema',
  },
  FlexLayoutInspectOptionsInputSchema: {
    schema: LayoutInspectIR.FlexLayoutInspectOptionsInputSchema,
    label: 'FlexLayoutInspectOptionsInput',
    url: '/library/layout/reference/runtime#flexlayoutinspectoptionsinputschema',
  },
  GridLayoutInspectOptionsInputSchema: {
    schema: LayoutInspectIR.GridLayoutInspectOptionsInputSchema,
    label: 'GridLayoutInspectOptionsInput',
    url: '/library/layout/reference/runtime#gridlayoutinspectoptionsinputschema',
  },
  OverlayLayoutInspectOptionsInputSchema: {
    schema: LayoutInspectIR.OverlayLayoutInspectOptionsInputSchema,
    label: 'OverlayLayoutInspectOptionsInput',
    url: '/library/layout/reference/runtime#overlaylayoutinspectoptionsinputschema',
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
    schema: StandardIR.LegendSchema,
    label: 'Legend',
    url: '/library/standard/composite/legend#legendschema',
    localizations: { zh: LegendSchemaZhLocalization },
  },
  LegendArtifactSchema: {
    schema: StandardIR.LegendArtifactSchema,
    label: 'LegendArtifact',
    url: '/library/standard/composite/legend#legendartifactschema',
    localizations: { zh: LegendArtifactSchemaZhLocalization },
  },
  SurfaceSchema: {
    schema: StandardIR.SurfaceSchema,
    label: 'Surface',
    url: '/library/standard/composite/surface#surfaceschema',
  },

  ContainerSchema: {
    schema: GraphIR.ContainerSchema,
    label: 'Container',
    url: '/schematic/graph/container/basic',
  },
  EntitySchema: {
    schema: GraphIR.EntitySchema,
    label: 'Entity',
    url: '/schematic/graph/entity/basic',
  },
  RelationSchema: {
    schema: GraphIR.RelationSchema,
    label: 'Relation',
    url: '/schematic/graph/relation/basic',
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
  TableThemeTokenOverridesSchema: {
    schema: IRTable.TableThemeTokenOverridesSchema,
    label: 'TableThemeTokenOverrides',
    url: '/viz/table/reference/contract-table#tablethemetokenoverridesschema',
  },
  TableThemeTokenMapSchema: {
    schema: IRTable.TableThemeTokenMapSchema,
    label: 'TableThemeTokenMap',
    url: '/viz/table/reference/contract-table#tablethemetokenmapschema',
  },
  TableThemeTokenPresetMapSchema: {
    schema: IRTable.TableThemeTokenPresetMapSchema,
    label: 'TableThemeTokenPresetMap',
    url: '/viz/table/reference/contract-table#tablethemetokenpresetmapschema',
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
  PlotThemeTokenOverridesSchema: {
    schema: IRPlot.PlotThemeTokenOverridesSchema,
    label: 'PlotThemeTokenOverrides',
    url: '/viz/plot/reference/theme#plotthemetokenoverridesschema',
  },
  PlotAxisThemeTokenRulesSchema: {
    schema: IRPlot.PlotAxisThemeTokenRulesSchema,
    label: 'PlotAxisThemeTokenRules',
    url: '/viz/plot/reference/theme#plotaxisthemetokenrulesschema',
  },
  PlotThemeTokenResolutionSchema: {
    schema: IRPlot.PlotThemeTokenResolutionSchema,
    label: 'PlotThemeTokenResolution',
    url: '/viz/plot/reference/theme#plotthemetokenresolutionschema',
  },
  PlotThemeResolutionSchema: {
    schema: IRPlot.PlotThemeResolutionSchema,
    label: 'PlotThemeResolution',
    url: '/viz/plot/reference/theme#inspection',
  },
  PlotAreaThemeSchema: {
    schema: IRPlot.PlotAreaThemeSchema,
    label: 'PlotAreaTheme',
    url: '/viz/plot/reference/theme#plotareathemeschema',
  },
  PlotAxisThemeSchema: {
    schema: IRPlot.PlotAxisThemeSchema,
    label: 'PlotAxisTheme',
    url: '/viz/plot/reference/theme#plotaxisthemeschema',
  },
  PlotPaletteThemeSchema: {
    schema: IRPlot.PlotPaletteThemeSchema,
    label: 'PlotPaletteTheme',
    url: '/viz/plot/reference/theme#plotpalettethemeschema',
  },
  PlotThemeSchema: {
    schema: IRPlot.PlotThemeSchema,
    label: 'PlotTheme',
    url: '/viz/plot/reference/theme#plotthemeschema',
  },
};

export function lookupSchema(schema: core.$ZodType): SchemaRegistryEntry | undefined {
  return Object.values(SCHEMA_REGISTRY).find(e => e.schema === schema);
}
