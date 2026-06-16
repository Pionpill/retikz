// @retikz/plot-react public API barrel.
export { Plot } from './Plot';
export type { PlotProps, PlotSpecProps, PlotDslProps, PlotPanelProps } from './Plot';
export { BarMark, LineMark, PointMark, SectorMark, AreaMark, RectMark, RuleMark, TextMark, Axis, Legend, Scale, buildPlotSpec, resolveLabelOf } from './components';
export type {
  BarMarkProps,
  LineMarkProps,
  PointMarkProps,
  SectorMarkProps,
  AreaMarkProps,
  RectMarkProps,
  RuleMarkProps,
  TextMarkProps,
  DatumLabelProps,
  AxisProps,
  LegendProps,
  ScaleProps,
  ScaleDimension,
  PositionScaleType,
  BuildPlotSpecOptions,
  CoordinateInput,
  ResolveLabelMap,
} from './components';
