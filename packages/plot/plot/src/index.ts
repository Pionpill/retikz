// @retikz/plot public API barrel.
export {
  REQUIRED_POSITION_CHANNELS,
  RETIKZ_POLAR_SEGMENT_SAMPLES,
  VALID_GUIDE_DIMENSIONS,
  cellInterval,
  createCartesian1DCoordinate,
  createCartesianCoordinate,
  createCustomCoordinate,
  createPolar1DCoordinate,
  createPolarCoordinate,
  createTernary2DCoordinate,
  densifyCellContour,
  densifyPolarSegments,
  toPolarVertex,
} from './coordinate';
export type {
  AxisFrame,
  ResolvedCartesianCoordinate,
  Cell,
  CellGeometry,
  ResolvedCustomCoordinate,
  CustomCoordinateContext,
  CustomCoordinateFactory,
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
