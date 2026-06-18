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
  ternaryCellContour,
  toPolarVertex,
} from './coordinate';
export type {
  AxisFrame,
  CartesianCoordinate,
  Cell,
  CellGeometry,
  CustomCoordinate as RuntimeCustomCoordinate,
  CustomCoordinateContext,
  CustomCoordinateFactory,
  DimensionRole,
  CreateCustomCoordinateOptions,
  DensifyCellContourOptions,
  PolarCoordinate,
  PolarCoordinateSpec,
  Polar1DCoordinate as RuntimePolar1DCoordinate,
  Polar1DCoordinateSpec,
  PolarVertex,
  ResolvedCoordinate,
  Cartesian1DCoordinate as RuntimeCartesian1DCoordinate,
  Ternary2DCoordinate as RuntimeTernary2DCoordinate,
  TernaryVertices,
} from './coordinate';
export * from './data/resolve';
export * from './interaction/locate';
export * from './ir';
export * from './pipeline/expand';
export * from './pipeline/layout';
