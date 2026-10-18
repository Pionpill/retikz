// @retikz/plot-react public API barrel.
export { buildPlotIR, resolvePlotExtensionAuthoring } from './adapter';
export type {
  DatumLabelProps,
  IntervalMarkProps,
  PathMarkProps,
  PlotAxisProps,
  PlotFacetProps,
  PlotLegendProps,
  PlotScaffoldProps,
  PlotScaleProps,
  PlotTrackProps,
  PlotTransformProps,
  PointMarkProps,
  RelationMarkProps,
} from './components';
export {
  IntervalMark,
  PathMark,
  PlotAxis,
  PlotFacet,
  PlotLegend,
  PlotScaffold,
  PlotScale,
  PlotTrack,
  PlotTransform,
  PointMark,
  RelationMark,
} from './components';
export * from './error';
export type { PlotDslProps, PlotIRProps, PlotLineageProps, PlotPanelProps, PlotProps } from './Plot';
export { Plot } from './Plot';
export type { ResolvedPlotAuthoring, ResolvePlotAuthoringOptions } from './plot-runtime';
export { resolvePlotAuthoring, resolvePlotLineage } from './plot-runtime';
export { usePlotThemeStyles } from './theme-context';
export type { PlotThemeProviderProps } from './theme-provider';
export { PlotThemeProvider } from './theme-provider';
export { PointAnnotation, PathAnnotation, IntervalAnnotation } from './components';
export type { PointAnnotationProps, PathAnnotationProps, IntervalAnnotationProps } from './components';
