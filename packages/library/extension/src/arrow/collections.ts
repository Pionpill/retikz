import type { ArrowDefinition, CoreDependencyProvider } from '@retikz/core';

import {
  BarArrowDefinition,
  BarArrowProvider,
  CrowFootArrowDefinition,
  CrowFootArrowProvider,
  DiamondArrowDefinition,
  DiamondArrowProvider,
  KiteArrowDefinition,
  KiteArrowProvider,
  OpenDiamondArrowDefinition,
  OpenDiamondArrowProvider,
  OpenKiteArrowDefinition,
  OpenKiteArrowProvider,
  OpenSquareArrowDefinition,
  OpenSquareArrowProvider,
  SquareArrowDefinition,
  SquareArrowProvider,
  StraightBarbArrowDefinition,
  StraightBarbArrowProvider,
} from './definitions';

/** Extension 提供的全部可选箭头 Definition */
export const ExtensionArrowDefinitions: ReadonlyArray<ArrowDefinition> = [
  DiamondArrowDefinition,
  OpenDiamondArrowDefinition,
  BarArrowDefinition,
  CrowFootArrowDefinition,
  StraightBarbArrowDefinition,
  KiteArrowDefinition,
  OpenKiteArrowDefinition,
  SquareArrowDefinition,
  OpenSquareArrowDefinition,
];

/** Extension 提供的全部箭头 Provider */
export const ExtensionArrowProviders: ReadonlyArray<CoreDependencyProvider> = [
  DiamondArrowProvider,
  OpenDiamondArrowProvider,
  BarArrowProvider,
  CrowFootArrowProvider,
  StraightBarbArrowProvider,
  KiteArrowProvider,
  OpenKiteArrowProvider,
  SquareArrowProvider,
  OpenSquareArrowProvider,
];
