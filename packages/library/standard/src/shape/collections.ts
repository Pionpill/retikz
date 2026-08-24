import type { CoreDependencyProvider, ShapeDefinition } from '@retikz/core';

import {
  ContourShapeDefinition,
  ContourShapeProvider,
  CrossShapeDefinition,
  CrossShapeProvider,
  CylinderShapeDefinition,
  CylinderShapeProvider,
  EllipticCapsuleShapeDefinition,
  EllipticCapsuleShapeProvider,
  HexagonShapeDefinition,
  HexagonShapeProvider,
  ParallelogramShapeDefinition,
  ParallelogramShapeProvider,
  SectorShapeDefinition,
  SectorShapeProvider,
  StarShapeDefinition,
  StarShapeProvider,
  TrapezoidShapeDefinition,
  TrapezoidShapeProvider,
} from './definitions';

/** Standard 提供的全部可选形状 Definition */
export const StandardShapeDefinitions: ReadonlyArray<ShapeDefinition> = [
  ContourShapeDefinition,
  CrossShapeDefinition,
  SectorShapeDefinition,
  StarShapeDefinition,
  TrapezoidShapeDefinition,
  ParallelogramShapeDefinition,
  HexagonShapeDefinition,
  CylinderShapeDefinition,
  EllipticCapsuleShapeDefinition,
];

/** Standard 提供的全部形状 Provider */
export const StandardShapeProviders: ReadonlyArray<CoreDependencyProvider> = [
  ContourShapeProvider,
  CrossShapeProvider,
  SectorShapeProvider,
  StarShapeProvider,
  TrapezoidShapeProvider,
  ParallelogramShapeProvider,
  HexagonShapeProvider,
  CylinderShapeProvider,
  EllipticCapsuleShapeProvider,
];
