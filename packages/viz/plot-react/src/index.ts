// @retikz/plot-react public API barrel.
export type {
  BuildPlotSpecOptions,
  CoordinateInput,
  MarkTransformShortcutContext,
  MarkTransformShortcutDefinition,
  ResolveLabelMap,
} from './adapter';
export { buildPlotSpec, resolveLabelOf } from './adapter';
export type {
  AxisProps,
  CaptionLabelProps,
  DatumLabelProps,
  FacetDimensionInput,
  FacetProps,
  FieldName,
  IntervalMarkProps,
  LegendProps,
  PathMarkProps,
  PlotLabelText,
  PlotTextLabelProps,
  PointMarkProps,
  PositionScaleType,
  ReferenceMarkProps,
  RelationMarkProps,
  ScaffoldProps,
  ScaleDimension,
  ScaleProps,
  TitleLabelProps,
  TrackProps,
  TransformProps,
} from './components';
export {
  Axis,
  CaptionLabel,
  Facet,
  IntervalMark,
  Legend,
  PathMark,
  PointMark,
  ReferenceMark,
  RelationMark,
  Scaffold,
  Scale,
  TitleLabel,
  Track,
  Transform,
} from './components';
export type { PlotDslProps, PlotLineageProps, PlotPanelProps, PlotProps, PlotSpecProps } from './Plot';
export { Plot } from './Plot';
export { resolvePlotLineage } from './plot-runtime';
