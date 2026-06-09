// @retikz/plot-react public API barrel.
export { Plot } from './Plot';
export type { PlotProps, PlotSpecProps, PlotDslProps } from './Plot';
export { BarMark, LineMark, PointMark, SectorMark, AreaMark, Axis, Legend, buildPlotSpec } from './components';
export type {
  BarMarkProps,
  LineMarkProps,
  PointMarkProps,
  SectorMarkProps,
  AreaMarkProps,
  AxisProps,
  LegendProps,
  BuildPlotSpecOptions,
  DslScaleX,
  CoordinateInput,
} from './components';
