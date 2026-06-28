// @retikz/plot public API barrel.
// Built-in concrete coordinate frames are internal lowering objects; expose
// CoordinateDefinition/frame helpers here, not built-in frame constructors.
export type {
  AnyCoordinateDefinition,
  AxisFrame,
  Cell,
  CellGeometry,
  CoordinateDefinition,
  CoordinateFrame,
  CoordinateResolution,
  CoordinateResolveContext,
  CreateCoordinateFrameOptions,
  DensifyCellContourOptions,
  DimensionRole,
} from './contract';
export type { FieldResolution, ResolveField } from './contract';
export {
  cellInterval,
  createCoordinateFrame,
  defineCoordinate,
  densifyCellContour,
  extractCoordinateType,
} from './contract';
export * from './features/interaction/locate';
export * from './pipeline/expand';
export * from './pipeline/layout';
export { resolveCoordinateRegistry } from './providers';
export { applyFieldResolver } from './providers';
export * from './schemas';
// Built-in scale resolve* builders are internal lowering helpers; expose the
// ScaleDefinition / registry extension surface here, not the d3 wrappers.
export type {
  AnyScaleDefinition,
  ChannelResolveContext,
  ChannelScaleDefinition,
  ChannelScaleResolution,
  PositionScaleDefinition,
  ScaleDefinition,
} from './contract';
export { defineScale, extractScaleType, isBuiltinScaleOperation } from './contract';
export { resolveScaleRegistry } from './providers';
// Channel extension surface: all channel kinds share one registry; scope/node/path channels keep typed convenience factories.
export type {
  AnyChannelDefinition,
  BaseChannelDefinition,
  ChannelBindingResolver,
  ChannelContext,
  ChannelDefinition,
  ChannelDefinitionKindValue,
  ChannelOutputSpace,
  MarkChannelDefinition,
  MarkChannelResolution,
  NodeChannelContext,
  NodeChannelDefinition,
  NodeChannelDelivery,
  NodeChannelDeliveryContext,
  PathChannelContext,
  PathChannelDefinition,
  PathChannelDelivery,
  PathChannelDeliveryContext,
  PositionChannelDefinition,
  ScopeChannelContext,
  ScopeChannelDefinition,
  ScopeChannelDelivery,
  ScopeChannelDeliveryContext,
  ScopeChannelResolution,
} from './contract';
export type { PositionScale } from './contract';
export {
  ChannelDefinitionKind,
  defineChannel,
  defineNodeChannel,
  definePathChannel,
  defineScopeChannel,
} from './contract';
export type { ColorSchemeResolver, PlotColorSchemeValue } from './providers';
export { BUILTIN_COLOR_SCHEMES, PlotColorScheme } from './providers';
// Transform / mark extension surface: factory + types from contract; registry helpers from providers.
export type {
  AnyMarkDefinition,
  AnyRowSelectorDefinition,
  AnyStatisticsReducerDefinition,
  AnyTransformDefinition,
  FieldFormatDefinition,
  MarkDefinition,
  RowSelection,
  RowSelectorDefinition,
  StatisticsReducerDefinition,
  TransformContext,
  TransformDefinition,
} from './contract';
export {
  defineFieldFormat,
  defineMark,
  defineRowSelector,
  defineStatisticsReducer,
  defineTransform,
  extractStatisticOperation,
  extractTransformKind,
} from './contract';
export type { PlotFieldFormatValue } from './providers';
export {
  applyTransforms,
  binMetricOperations,
  binOutputFields,
  BUILTIN_FIELD_FORMATS,
  BUILTIN_FORMAT_DEFINITIONS_BY_NAME,
  BUILTIN_FORMATS,
  BUILTIN_ROW_SELECTORS,
  BUILTIN_STATISTICS_REDUCERS,
  BUILTIN_TRANSFORM_DEFINITIONS_BY_KIND,
  BUILTIN_TRANSFORMS,
  collectFormatFields,
  collectTransformFields,
  DEFAULT_TRANSFORM_CONTEXT,
  isBuiltinFieldFormat,
  PlotFieldFormat,
  resolveFormatRegistry,
  resolveMarkRegistry,
  resolveRowSelectorRegistry,
  resolveStatisticsReducerRegistry,
  resolveTransformRegistry,
} from './providers';
