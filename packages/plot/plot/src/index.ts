// @retikz/plot public API barrel.
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
