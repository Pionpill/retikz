// @retikz/plot public API barrel.
// Built-in concrete coordinate frames are internal lowering objects; expose
// CoordinateDefinition/frame helpers here, not built-in frame constructors.
export {
  cellInterval,
  createCoordinateFrame,
  defineCoordinate,
  densifyCellContour,
  extractCoordinateType,
} from './contract';
export { resolveCoordinateRegistry } from './providers';
export type {
  AxisFrame,
  AnyCoordinateDefinition,
  Cell,
  CellGeometry,
  CoordinateDefinition,
  CoordinateResolution,
  CoordinateResolveContext,
  DimensionRole,
  CreateCoordinateFrameOptions,
  DensifyCellContourOptions,
  CoordinateFrame,
} from './contract';
export { applyFieldResolver } from './providers';
export type { FieldResolution, ResolveField } from './contract';
export * from './features/interaction/locate';
export * from './schemas';
export * from './pipeline/expand';
export * from './pipeline/layout';
// Built-in scale resolve* builders are internal lowering helpers; expose the
// ScaleDefinition / registry extension surface here, not the d3 wrappers.
export { defineScale, extractScaleType, isBuiltinScaleOperation } from './contract';
export { resolveScaleRegistry } from './providers';
export type {
  AnyScaleDefinition,
  ChannelResolveContext,
  ChannelScaleDefinition,
  ChannelScaleResolution,
  PositionScaleDefinition,
  ScaleDefinition,
} from './contract';
// Channel extension surface: all channel kinds share one registry; scope/node/path channels keep typed convenience factories.
export { ChannelDefinitionKind, defineChannel, defineNodeChannel, definePathChannel, defineScopeChannel } from './contract';
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
  NodeChannelDelivery,
  NodeChannelDeliveryContext,
  NodeChannelDefinition,
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
export { BUILTIN_COLOR_SCHEMES, PlotColorScheme } from './providers';
export type { ColorSchemeResolver, PlotColorSchemeValue } from './providers';
export type { PositionScale } from './contract';
// Transform / mark extension surface: factory + types from contract; registry helpers from providers.
export { defineFieldFormat, defineMark, defineRowSelector, defineStatisticsReducer, defineTransform, extractStatisticOperation, extractTransformKind } from './contract';
export type { AnyMarkDefinition, AnyRowSelectorDefinition, AnyStatisticsReducerDefinition, AnyTransformDefinition, FieldFormatDefinition, MarkDefinition, RowSelectorDefinition, RowSelection, StatisticsReducerDefinition, TransformContext, TransformDefinition } from './contract';
export { BUILTIN_FIELD_FORMATS, BUILTIN_FORMATS, BUILTIN_FORMAT_DEFINITIONS_BY_NAME, BUILTIN_ROW_SELECTORS, BUILTIN_STATISTICS_REDUCERS, BUILTIN_TRANSFORMS, BUILTIN_TRANSFORM_DEFINITIONS_BY_KIND, DEFAULT_TRANSFORM_CONTEXT, PlotFieldFormat, applyTransforms, binMetricOperations, binOutputFields, collectFormatFields, collectTransformFields, isBuiltinFieldFormat, resolveFormatRegistry, resolveMarkRegistry, resolveRowSelectorRegistry, resolveStatisticsReducerRegistry, resolveTransformRegistry } from './providers';
export type { PlotFieldFormatValue } from './providers';
