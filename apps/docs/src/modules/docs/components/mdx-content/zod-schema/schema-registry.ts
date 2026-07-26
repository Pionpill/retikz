import type { core, z } from 'zod';

import * as IR from '@retikz/core';
import * as TableIR from '@retikz/table';

export type SchemaRegistryEntry = {
  schema: z.ZodType;
  /** 渲染类型签名时使用的名字（去掉 "Schema" 后缀） */
  label: string;
  /** Reference 页面 URL（含可选 #anchor） */
  url: string;
};

export const SCHEMA_REGISTRY: Record<string, SchemaRegistryEntry> = {
  SceneSchema: { schema: IR.SceneSchema, label: 'Scene', url: '/kernel/reference/schema/scene' },
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
  TableCellSchema: {
    schema: TableIR.TableCellSchema,
    label: 'TableCell',
    url: '/viz/table/reference/contract-table#tablecellschema',
  },
  TableCellPayloadSchema: {
    schema: TableIR.TableCellPayloadSchema,
    label: 'TableCellPayload',
    url: '/viz/table/reference/contract-table#tablecellpayloadschema',
  },
  TableLayoutSchema: {
    schema: TableIR.TableLayoutSchema,
    label: 'TableLayout',
    url: '/viz/table/reference/contract-table#tablelayoutschema',
  },
  TableFixedTrackSizeSchema: {
    schema: TableIR.TableFixedTrackSizeSchema,
    label: 'TableFixedTrackSize',
    url: '/viz/table/reference/contract-table#tablefixedtracksizeschema',
  },
  TableAutoTrackSizeSchema: {
    schema: TableIR.TableAutoTrackSizeSchema,
    label: 'TableAutoTrackSize',
    url: '/viz/table/reference/contract-table#tableautotracksizeschema',
  },
  TableFractionTrackSizeSchema: {
    schema: TableIR.TableFractionTrackSizeSchema,
    label: 'TableFractionTrackSize',
    url: '/viz/table/reference/contract-table#tablefractiontracksizeschema',
  },
  TableMinmaxTrackSizeSchema: {
    schema: TableIR.TableMinmaxTrackSizeSchema,
    label: 'TableMinmaxTrackSize',
    url: '/viz/table/reference/contract-table#tableminmaxtracksizeschema',
  },
  TableTrackSizeSchema: {
    schema: TableIR.TableTrackSizeSchema,
    label: 'TableTrackSize',
    url: '/viz/table/reference/contract-table#tabletracksizeschema',
  },
  TableTrackOverrideSchema: {
    schema: TableIR.TableTrackOverrideSchema,
    label: 'TableTrackOverride',
    url: '/viz/table/reference/contract-table#tabletrackoverrideschema',
  },
  TableTrackOverridesSchema: {
    schema: TableIR.TableTrackOverridesSchema,
    label: 'TableTrackOverrides',
    url: '/viz/table/reference/contract-table#tabletrackoverridesschema',
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
};

export function lookupSchema(schema: core.$ZodType): SchemaRegistryEntry | undefined {
  return Object.values(SCHEMA_REGISTRY).find(e => e.schema === schema);
}
