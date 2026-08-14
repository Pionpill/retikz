import type { ArrowDefinition, CoreDependencyProvider } from '@retikz/core';

import {
  DiamondArrowDefinition,
  DiamondArrowProvider,
  OpenDiamondArrowDefinition,
  OpenDiamondArrowProvider,
} from './definitions';

/** Standard 提供的全部可选箭头 Definition */
export const StandardArrowDefinitions: ReadonlyArray<ArrowDefinition> = [
  DiamondArrowDefinition,
  OpenDiamondArrowDefinition,
];

/** Standard 提供的全部箭头 Provider */
export const StandardArrowProviders: ReadonlyArray<CoreDependencyProvider> = [
  DiamondArrowProvider,
  OpenDiamondArrowProvider,
];
