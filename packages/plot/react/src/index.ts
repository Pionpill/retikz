// @retikz/plot-react public API barrel.
export { Plot } from './Plot';
export type { PlotProps, PlotSpecProps, PlotDslProps, PlotPanelProps } from './Plot';
export { BarMark, LineMark, PointMark, SectorMark, AreaMark, RectMark, Axis, Legend, Scale, buildPlotSpec } from './components';
export type {
  BarMarkProps,
  LineMarkProps,
  PointMarkProps,
  SectorMarkProps,
  AreaMarkProps,
  RectMarkProps,
  AxisProps,
  LegendProps,
  ScaleProps,
  ScaleDimension,
  PositionScaleType,
  BuildPlotSpecOptions,
  CoordinateInput,
} from './components';
