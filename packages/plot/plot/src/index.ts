// @retikz/plot public API barrel.
// Built-in concrete coordinate frames are internal lowering objects; expose
// CoordinateDefinition/frame helpers here, not built-in frame constructors.
export {
  cellInterval,
  createCoordinateFrame,
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
  DimensionRole,
  CreateCoordinateFrameOptions,
  DensifyCellContourOptions,
  CoordinateFrame,
} from './coordinate';
export * from './data/resolve';
export * from './interaction/locate';
export * from './ir';
export * from './pipeline/expand';
export * from './pipeline/layout';
