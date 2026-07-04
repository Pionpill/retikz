// 组合 DSL：mark / guide 声明组件 + 纯装配 builder。
export type {
  BuildPlotSpecOptions,
  CoordinateInput,
  MarkTransformShortcutContext,
  MarkTransformShortcutDefinition,
  ResolveLabelMap,
} from './build-plot-spec';
export { buildPlotSpec, resolveLabelOf } from './build-plot-spec';
export type { FacetDimensionInput, FacetProps, ScaffoldProps, TrackProps } from './composition';
export { Facet, Scaffold, Track } from './composition';
export type { AxisProps, LegendProps } from './guides';
export { Axis, Legend } from './guides';
export type { CaptionLabelProps, PlotLabelText, PlotTextLabelProps, TitleLabelProps } from './labels';
export { CaptionLabel, TitleLabel } from './labels';
export type {
  DatumLabelProps,
  FieldName,
  IntervalMarkProps,
  PathMarkProps,
  PointMarkProps,
  ReferenceMarkProps,
  RelationMarkProps,
} from './marks';
export { IntervalMark, PathMark, PointMark, ReferenceMark, RelationMark } from './marks';
export type { PositionScaleType, ScaleDimension, ScaleProps } from './scales';
export { Scale } from './scales';
export type { TransformProps } from './transform';
export { Transform } from './transform';
