// @retikz/plot-react public API barrel.
export { Plot } from './Plot';
export type { PlotProps, PlotSpecProps, PlotDslProps } from './Plot';
export { BarMark, LineMark, PointMark, SectorMark, AreaMark, Axis, buildPlotSpec } from './components';
export type {
  BarMarkProps,
  LineMarkProps,
  PointMarkProps,
  SectorMarkProps,
  AreaMarkProps,
  AxisProps,
  BuildPlotSpecOptions,
  DslScaleX,
  CoordinateInput,
} from './components';
