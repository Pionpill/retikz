// @retikz/plot-react public API barrel.
export { Plot } from './Plot';
export type { PlotProps, PlotSpecProps, PlotDslProps, PlotPanelProps } from './Plot';
export { PointMark, PathMark, RegionMark, IntervalMark, LinkMark, ReferenceMark, Axis, Legend, Scale, Transform, buildPlotSpec, resolveLabelOf } from './components';
export type {
  PointMarkProps,
  PathMarkProps,
  RegionMarkProps,
  IntervalMarkProps,
  LinkMarkProps,
  ReferenceMarkProps,
  DatumLabelProps,
  AxisProps,
  LegendProps,
  ScaleProps,
  ScaleDimension,
  PositionScaleType,
  TransformProps,
  BuildPlotSpecOptions,
  CoordinateInput,
  ResolveLabelMap,
} from './components';
