// @retikz/plot public API barrel.
// Built-in resolved coordinate frames are internal lowering objects; expose
// CoordinateDefinition/custom helpers here, not concrete frame constructors.
export {
  cellInterval,
  createCustomCoordinate,
  defineCoordinate,
  densifyCellContour,
  extractCoordinateType,
  resolveCoordinateRegistry,
} from './coordinate';
export type {
  AxisFrame,
  AnyCoordinateDefinition,
  Cell,
  CellGeometry,
  CoordinateDefinition,
  CoordinateResolution,
  CoordinateResolveContext,
  ResolvedCustomCoordinate,
  DimensionRole,
  CreateCustomCoordinateOptions,
  DensifyCellContourOptions,
  ResolvedCoordinate,
} from './coordinate';
export * from './data/resolve';
export * from './interaction/locate';
export * from './ir';
export * from './pipeline/expand';
export * from './pipeline/layout';
