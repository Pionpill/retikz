// @retikz/plot-react public API barrel.
export type {
  AxisProps,
  BuildPlotSpecOptions,
  CoordinateInput,
  DatumLabelProps,
  FieldName,
  IntervalMarkProps,
  LegendProps,
  MarkTransformShortcutContext,
  MarkTransformShortcutDefinition,
  PathMarkProps,
  PointMarkProps,
  PositionScaleType,
  ReferenceMarkProps,
  RelationMarkProps,
  ResolveLabelMap,
  ScaleDimension,
  ScaleProps,
  TransformProps,
} from './components';
export {
  Axis,
  buildPlotSpec,
  IntervalMark,
  Legend,
  PathMark,
  PointMark,
  ReferenceMark,
  RelationMark,
  resolveLabelOf,
  Scale,
  Transform,
} from './components';
export type { PlotDslProps, PlotPanelProps, PlotProps, PlotSpecProps } from './Plot';
export { Plot } from './Plot';
