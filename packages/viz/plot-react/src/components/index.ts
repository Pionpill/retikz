// 组合 DSL：mark / guide 声明组件
export type { FacetProps, ScaffoldProps, TrackProps } from './composition';
export { Facet, Scaffold, Track } from './composition';
export type { AxisProps, LegendProps } from './guides';
export { Axis, Legend } from './guides';
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
export type { ScaleProps } from './scales';
export { Scale } from './scales';
export type { TransformProps } from './transform';
export { Transform } from './transform';
