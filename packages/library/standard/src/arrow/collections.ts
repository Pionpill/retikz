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
} from './definitions';

/** Standard 提供的全部可选箭头 Definition */
export const StandardArrowDefinitions: ReadonlyArray<ArrowDefinition> = [
  DiamondArrowDefinition,
  OpenDiamondArrowDefinition,
  BarArrowDefinition,
  CrowFootArrowDefinition,
  KiteArrowDefinition,
  OpenKiteArrowDefinition,
  SquareArrowDefinition,
  OpenSquareArrowDefinition,
];

/** Standard 提供的全部箭头 Provider */
export const StandardArrowProviders: ReadonlyArray<CoreDependencyProvider> = [
  DiamondArrowProvider,
  OpenDiamondArrowProvider,
  BarArrowProvider,
  CrowFootArrowProvider,
  KiteArrowProvider,
  OpenKiteArrowProvider,
  SquareArrowProvider,
  OpenSquareArrowProvider,
];
