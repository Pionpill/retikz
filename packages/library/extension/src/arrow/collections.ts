import type { ArrowDefinition, CoreDependencyProvider } from '@retikz/core';

import {
  barArrowDefinition,
  barArrowProvider,
  crowFootArrowDefinition,
  crowFootArrowProvider,
  diamondArrowDefinition,
  diamondArrowProvider,
  kiteArrowDefinition,
  kiteArrowProvider,
  openDiamondArrowDefinition,
  openDiamondArrowProvider,
  openKiteArrowDefinition,
  openKiteArrowProvider,
  openSquareArrowDefinition,
  openSquareArrowProvider,
  squareArrowDefinition,
  squareArrowProvider,
  straightBarbArrowDefinition,
  straightBarbArrowProvider,
} from './definitions';

/** Extension 提供的全部可选箭头 Definition */
export const extensionArrowDefinitions: ReadonlyArray<ArrowDefinition> = [
  diamondArrowDefinition,
  openDiamondArrowDefinition,
  barArrowDefinition,
  crowFootArrowDefinition,
  straightBarbArrowDefinition,
  kiteArrowDefinition,
  openKiteArrowDefinition,
  squareArrowDefinition,
  openSquareArrowDefinition,
];

/** Extension 提供的全部箭头 Provider */
export const extensionArrowProviders: ReadonlyArray<CoreDependencyProvider> = [
  diamondArrowProvider,
  openDiamondArrowProvider,
  barArrowProvider,
  crowFootArrowProvider,
  straightBarbArrowProvider,
  kiteArrowProvider,
  openKiteArrowProvider,
  squareArrowProvider,
  openSquareArrowProvider,
];
