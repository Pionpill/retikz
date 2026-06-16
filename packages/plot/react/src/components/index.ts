// 组合 DSL：mark / guide 声明组件 + 纯装配 builder。
export { BarMark, LineMark, PointMark, AreaMark, RectMark, RuleMark, TextMark, RibbonMark } from './marks';
export type { BarMarkProps, LineMarkProps, PointMarkProps, AreaMarkProps, RectMarkProps, RuleMarkProps, TextMarkProps, RibbonMarkProps, DatumLabelProps } from './marks';
export { Axis, Legend } from './guides';
export type { AxisProps, LegendProps } from './guides';
export { Scale } from './scales';
export type { ScaleProps, ScaleDimension, PositionScaleType } from './scales';
export { Transform } from './transform';
export type { TransformProps } from './transform';
export { buildPlotSpec, resolveLabelOf } from './build-plot-spec';
export type { BuildPlotSpecOptions, CoordinateInput, ResolveLabelMap } from './build-plot-spec';
