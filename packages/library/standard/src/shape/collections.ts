import type { CoreDependencyProvider, ShapeDefinition } from '@retikz/core';

import {
  ContourShapeDefinition,
  ContourShapeProvider,
  CrossShapeDefinition,
  CrossShapeProvider,
  SectorShapeDefinition,
  SectorShapeProvider,
  StarShapeDefinition,
  StarShapeProvider,
} from './definitions';

/** Standard 提供的全部可选形状 Definition */
export const StandardShapeDefinitions: ReadonlyArray<ShapeDefinition> = [
  ContourShapeDefinition,
  CrossShapeDefinition,
  SectorShapeDefinition,
  StarShapeDefinition,
];

/** Standard 提供的全部形状 Provider */
export const StandardShapeProviders: ReadonlyArray<CoreDependencyProvider> = [
  ContourShapeProvider,
  CrossShapeProvider,
  SectorShapeProvider,
  StarShapeProvider,
];
