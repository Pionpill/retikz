// 组合 DSL：mark / guide 声明组件
export type { PlotFacetProps, PlotScaffoldProps, PlotTrackProps } from './composition';
export { PlotFacet, PlotScaffold, PlotTrack } from './composition';
export type { PlotAxisProps, PlotLegendProps } from './guides';
export { PlotAxis, PlotLegend } from './guides';
export type {
  CoreNodeChannelProps,
  CorePathChannelProps,
  DatumLabelProps,
  IntervalMarkProps,
  PathMarkProps,
  PointMarkProps,
  ReferenceMarkProps,
  RelationMarkProps,
} from './marks';
export { IntervalMark, PathMark, PointMark, ReferenceMark, RelationMark } from './marks';
export type { PlotScaleProps } from './scales';
export { PlotScale } from './scales';
export type { PlotTransformProps } from './transform';
export { PlotTransform } from './transform';
