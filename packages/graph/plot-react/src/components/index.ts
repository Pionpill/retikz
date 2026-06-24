// 组合 DSL：mark / guide 声明组件 + 纯装配 builder。
export { PointMark, PathMark, RegionMark, IntervalMark, LinkMark, ReferenceMark } from './marks';
export type { PointMarkProps, PathMarkProps, RegionMarkProps, IntervalMarkProps, LinkMarkProps, ReferenceMarkProps, DatumLabelProps, FieldName } from './marks';
export { Axis, Legend } from './guides';
export type { AxisProps, LegendProps } from './guides';
export { Scale } from './scales';
export type { ScaleProps, ScaleDimension, PositionScaleType } from './scales';
export { Transform } from './transform';
export type { TransformProps } from './transform';
export { buildPlotSpec, resolveLabelOf } from './build-plot-spec';
export type { BuildPlotSpecOptions, CoordinateInput, ResolveLabelMap } from './build-plot-spec';
