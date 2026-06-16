// 组合 DSL：mark / guide 声明组件 + 纯装配 builder。
export { BarMark, LineMark, PointMark, SectorMark, AreaMark, RectMark } from './marks';
export type { BarMarkProps, LineMarkProps, PointMarkProps, SectorMarkProps, AreaMarkProps, RectMarkProps } from './marks';
export { Axis, Legend } from './guides';
export type { AxisProps, LegendProps } from './guides';
export { Scale } from './scales';
export type { ScaleProps, ScaleDimension, PositionScaleType } from './scales';
export { buildPlotSpec } from './build-plot-spec';
export type { BuildPlotSpecOptions, CoordinateInput } from './build-plot-spec';
