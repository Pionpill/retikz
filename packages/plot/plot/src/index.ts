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
export * from './data/resolve';
export * from './interaction/locate';
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
export type { ColorSchemeResolver, PositionScale } from './providers';
// Transform / mark extension surface: factory + types from contract; registry helpers from providers.
export { defineMark, defineTransform, extractTransformKind } from './contract';
export type { AnyMarkDefinition, AnyTransformDefinition, MarkDefinition, TransformContext, TransformDefinition } from './contract';
export { BUILTIN_TRANSFORMS, BUILTIN_TRANSFORM_DEFINITIONS_BY_KIND, DEFAULT_TRANSFORM_CONTEXT, aggregateOutputField, applyTransforms, binOutputFields, collectTransformFields, resolveMarkRegistry, resolveTransformRegistry } from './providers';
