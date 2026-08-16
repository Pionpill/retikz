// @retikz/plot-react public API barrel.
export { buildPlotIR, resolvePlotExtensionAuthoring } from './adapter';
export type {
  AxisProps,
  DatumLabelProps,
  FacetProps,
  IntervalMarkProps,
  LegendProps,
  PathMarkProps,
  PointMarkProps,
  ReferenceMarkProps,
  RelationMarkProps,
  ScaffoldProps,
  ScaleProps,
  TrackProps,
  TransformProps,
} from './components';
export {
  Axis,
  Facet,
  IntervalMark,
  Legend,
  PathMark,
  PointMark,
  ReferenceMark,
  RelationMark,
  Scaffold,
  Scale,
  Track,
  Transform,
} from './components';
export type { PlotDslProps, PlotLineageProps, PlotPanelProps, PlotProps, PlotIRProps } from './Plot';
export { Plot } from './Plot';
export type { ResolvedPlotAuthoring, ResolvePlotAuthoringOptions } from './plot-runtime';
export { resolvePlotAuthoring, resolvePlotLineage } from './plot-runtime';
export { usePlotThemeStyles } from './theme-context';
export type { PlotThemeProviderProps } from './theme-provider';
export { PlotThemeProvider } from './theme-provider';
