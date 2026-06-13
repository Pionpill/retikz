// 组合 DSL：mark / guide 声明组件 + 纯装配 builder。
export { BarMark, LineMark, PointMark, SectorMark, AreaMark } from './marks';
export type { BarMarkProps, LineMarkProps, PointMarkProps, SectorMarkProps, AreaMarkProps } from './marks';
export { Axis, Legend } from './guides';
export type { AxisProps, LegendProps } from './guides';
export { buildPlotSpec } from './build-plot-spec';
export type { BuildPlotSpecOptions, DslScaleX, DslScaleY, CoordinateInput } from './build-plot-spec';
