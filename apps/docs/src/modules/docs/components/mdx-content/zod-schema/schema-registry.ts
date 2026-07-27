import type { core, z } from 'zod';

import * as IR from '@retikz/core';
import * as PlotIR from '@retikz/plot';
import * as TableIR from '@retikz/table';

export type SchemaRegistryEntry = {
  schema: z.ZodType;
  /** 渲染类型签名时使用的名字（去掉 "Schema" 后缀） */
  label: string;
  /** Reference / contract 页面 URL（含可选 #anchor） */
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
  TableCellSpanSchema: {
    schema: TableIR.TableCellSpanSchema,
    label: 'TableCellSpan',
    url: '/viz/table/reference/contract-table#tablecellspanschema',
  },
  TableCellLayoutSchema: {
    schema: TableIR.TableCellLayoutSchema,
    label: 'TableCellLayout',
    url: '/viz/table/reference/contract-table#tablecelllayoutschema',
  },
  TableCellFitSchema: {
    schema: TableIR.TableCellFitSchema,
    label: 'TableCellFit',
    url: '/viz/table/reference/contract-table#tablecellfitschema',
  },
  TableCellOverflowSchema: {
    schema: TableIR.TableCellOverflowSchema,
    label: 'TableCellOverflow',
    url: '/viz/table/reference/contract-table#tablecelloverflowschema',
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
  TableNoBorderSchema: {
    schema: TableIR.TableNoBorderSchema,
    label: 'TableNoBorder',
    url: '/viz/table/reference/contract-table#tablenoborderschema',
  },
  TableLineBorderSchema: {
    schema: TableIR.TableLineBorderSchema,
    label: 'TableLineBorder',
    url: '/viz/table/reference/contract-table#tablelineborderschema',
  },
  TableBorderSchema: {
    schema: TableIR.TableBorderSchema,
    label: 'TableBorder',
    url: '/viz/table/reference/contract-table#tableborderschema',
  },
  TableCellBordersSchema: {
    schema: TableIR.TableCellBordersSchema,
    label: 'TableCellBorders',
    url: '/viz/table/reference/contract-table#tablecellbordersschema',
  },
  TableBordersSchema: {
    schema: TableIR.TableBordersSchema,
    label: 'TableBorders',
    url: '/viz/table/reference/contract-table#tablebordersschema',
  },
  TableLayoutManifestSchema: {
    schema: TableIR.TableLayoutManifestSchema,
    label: 'TableLayoutManifest',
    url: '/viz/table/reference/contract-table#tablelayoutmanifestschema',
  },
  TableTrackManifestEntrySchema: {
    schema: TableIR.TableTrackManifestEntrySchema,
    label: 'TableTrackManifestEntry',
    url: '/viz/table/reference/contract-table#tabletrackmanifestentryschema',
  },
  TableCellManifestEntrySchema: {
    schema: TableIR.TableCellManifestEntrySchema,
    label: 'TableCellManifestEntry',
    url: '/viz/table/reference/contract-table#tablecellmanifestentryschema',
  },
  ResolvedTableBorderLineSchema: {
    schema: TableIR.ResolvedTableBorderLineSchema,
    label: 'ResolvedTableBorderLine',
    url: '/viz/table/reference/contract-table#resolvedtableborderlineschema',
  },
  TableBorderSourceSchema: {
    schema: TableIR.TableBorderSourceSchema,
    label: 'TableBorderSource',
    url: '/viz/table/reference/contract-table#tablebordersourceschema',
  },
  TableNoBorderContributionSchema: {
    schema: TableIR.TableNoBorderContributionSchema,
    label: 'TableNoBorderContribution',
    url: '/viz/table/reference/contract-table#tablenobordercontributionschema',
  },
  TableLineBorderContributionSchema: {
    schema: TableIR.TableLineBorderContributionSchema,
    label: 'TableLineBorderContribution',
    url: '/viz/table/reference/contract-table#tablelinebordercontributionschema',
  },
  TableBorderContributionSchema: {
    schema: TableIR.TableBorderContributionSchema,
    label: 'TableBorderContribution',
    url: '/viz/table/reference/contract-table#tablebordercontributionschema',
  },
  TableBorderManifestAtomSchema: {
    schema: TableIR.TableBorderManifestAtomSchema,
    label: 'TableBorderManifestAtom',
    url: '/viz/table/reference/contract-table#tablebordermanifestatomschema',
  },
  TableBorderManifestEntrySchema: {
    schema: TableIR.TableBorderManifestEntrySchema,
    label: 'TableBorderManifestEntry',
    url: '/viz/table/reference/contract-table#tablebordermanifestentryschema',
  },
  TableBorderPathMetaSchema: {
    schema: TableIR.TableBorderPathMetaSchema,
    label: 'TableBorderPathMeta',
    url: '/viz/table/reference/contract-table#tableborderpathmetaschema',
  },
  TableBorderLocatorEntrySchema: {
    schema: TableIR.TableBorderLocatorEntrySchema,
    label: 'TableBorderLocatorEntry',
    url: '/viz/table/reference/contract-table#tableborderlocatorentryschema',
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
