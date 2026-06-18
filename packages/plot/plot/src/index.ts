// @retikz/plot public API barrel.
export {
  RETIKZ_POLAR_SEGMENT_SAMPLES,
  cellInterval,
  createCartesian1DCoordinate,
  createCartesianCoordinate,
  createCustomCoordinate,
  defineCoordinate,
  createPolar1DCoordinate,
  createPolarCoordinate,
  createTernary2DCoordinate,
  densifyCellContour,
  densifyPolarSegments,
  extractCoordinateType,
  resolveCoordinateRegistry,
  toPolarVertex,
} from './coordinate';
export type {
  AxisFrame,
  AnyCoordinateDefinition,
  ResolvedCartesianCoordinate,
  Cell,
  CellGeometry,
  CoordinateDefinition,
  CoordinateResolution,
  CoordinateResolveContext,
  ResolvedCustomCoordinate,
  DimensionRole,
  CreateCustomCoordinateOptions,
  DensifyCellContourOptions,
  ResolvedPolarCoordinate,
  PolarCoordinateSpec,
  ResolvedPolar1DCoordinate,
  Polar1DCoordinateSpec,
  PolarVertex,
  ResolvedCoordinate,
  ResolvedCartesian1DCoordinate,
  ResolvedTernary2DCoordinate,
  TernaryVertices,
} from './coordinate';
export * from './data/resolve';
export * from './interaction/locate';
export * from './ir';
export * from './pipeline/expand';
export * from './pipeline/layout';
