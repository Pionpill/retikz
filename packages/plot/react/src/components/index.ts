// 组合 DSL：mark / guide 声明组件 + 纯装配 builder。
export { BarMark, LineMark, PointMark, SectorMark, AreaMark } from './marks';
export type { BarMarkProps, LineMarkProps, PointMarkProps, SectorMarkProps, AreaMarkProps } from './marks';
export { Axis } from './guides';
export type { AxisProps } from './guides';
export { buildPlotSpec } from './buildPlotSpec';
export type { BuildPlotSpecOptions, DslScaleX, DslScaleY, CoordinateInput } from './buildPlotSpec';
