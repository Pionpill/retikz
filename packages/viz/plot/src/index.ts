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
export type { PlotFacetLocatorOptions, PlotLocator, PlotLocatorOptions, ResolvedAnchor } from './contract';
export type {
  PlotDatumLineage,
  PlotHostLineageMetadata,
  PlotHostLineageMetadataOptions,
  PlotLayoutLineage,
  PlotLineageEncodingField,
  PlotLineageLocator,
  PlotLineageLowerResult,
  PlotLineageOptions,
  PlotLineageResolvedAnchor,
  PlotLineageRun,
  PlotLineageTransformScope,
  PlotLocatorAnchorLineage,
  PlotLocatorQueryLineage,
  PlotMarkDataLineage,
  PlotMarkLineage,
  PlotRowValueOptions,
  PlotScaleChannelLineage,
  PlotScaleLineage,
  PlotSeriesLineage,
} from './contract';
export {
  cellInterval,
  createCoordinateFrame,
  defineCoordinate,
  densifyCellContour,
  extractCoordinateType,
} from './contract';
export type { LowerPlotsOptions } from './pipeline/expand';
export { lowerPlots } from './pipeline/expand';
export type { PlotLineageLowerOptions } from './pipeline/lineage';
export { createPlotLineageLocator, lowerPlotWithLineage } from './pipeline/lineage';
export { createPlotLocator } from './pipeline/locator';
export { resolveCoordinateRegistry } from './providers';
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
// Mark extension surface: factory + types from contract; registry helpers from providers.
export type { AnyMarkDefinition, MarkDefinition } from './contract';
export { defineMark } from './contract';
export { resolveMarkRegistry } from './providers';
