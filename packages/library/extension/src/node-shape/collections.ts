import type { CoreDependencyProvider, ShapeDefinition } from '@retikz/core';

import {
  contourShapeDefinition,
  contourShapeProvider,
  crossShapeDefinition,
  crossShapeProvider,
  cylinderShapeDefinition,
  cylinderShapeProvider,
  ellipticCapsuleShapeDefinition,
  ellipticCapsuleShapeProvider,
  hexagonShapeDefinition,
  hexagonShapeProvider,
  parallelogramShapeDefinition,
  parallelogramShapeProvider,
  sectorShapeDefinition,
  sectorShapeProvider,
  starShapeDefinition,
  starShapeProvider,
  trapezoidShapeDefinition,
  trapezoidShapeProvider,
} from './definitions';

/** Extension 提供的全部可选形状 Definition */
export const extensionShapeDefinitions: ReadonlyArray<ShapeDefinition> = [
  contourShapeDefinition,
  crossShapeDefinition,
  sectorShapeDefinition,
  starShapeDefinition,
  trapezoidShapeDefinition,
  parallelogramShapeDefinition,
  hexagonShapeDefinition,
  cylinderShapeDefinition,
  ellipticCapsuleShapeDefinition,
];

/** Extension 提供的全部形状 Provider */
export const extensionShapeProviders: ReadonlyArray<CoreDependencyProvider> = [
  contourShapeProvider,
  crossShapeProvider,
  sectorShapeProvider,
  starShapeProvider,
  trapezoidShapeProvider,
  parallelogramShapeProvider,
  hexagonShapeProvider,
  cylinderShapeProvider,
  ellipticCapsuleShapeProvider,
];
