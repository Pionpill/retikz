import type { AnyCoreDependencyProvider } from '@retikz/core';
import {
  diamondArrowProvider,
  openDiamondArrowProvider,
  squareArrowProvider,
  straightBarbArrowProvider,
  pathClipProvider,
  ellipticCapsuleShapeProvider,
  hexagonShapeProvider,
} from '@retikz/extension';
import { flexLayoutProvider } from '@retikz/layout';
import { surfaceProvider } from '@retikz/standard/presentation';

import type { GraphDefinitionOptions } from '../../contract';
import { blockProvider, createBlockProvider } from '../block';
import { blockHeaderProvider, blockRowProvider, blockSectionProvider } from '../block';
import { createEntityProvider, entityProvider } from '../entity';
import { createGraphProvider, GraphProvider } from '../graph';
import { groupBodyAllocationProvider } from '../group';
import { createGroupProvider, groupProvider } from '../group';
import { createRelationProvider, relationProvider } from '../relation';

const DEFAULT_GRAPH_PROVIDERS: ReadonlyArray<AnyCoreDependencyProvider> = Object.freeze([
  GraphProvider,
  entityProvider,
  relationProvider,
  groupProvider,
  groupBodyAllocationProvider,
  blockProvider,
  blockHeaderProvider,
  blockSectionProvider,
  blockRowProvider,
  flexLayoutProvider,
  surfaceProvider,
  pathClipProvider,
  hexagonShapeProvider,
  ellipticCapsuleShapeProvider,
  straightBarbArrowProvider,
  squareArrowProvider,
  diamondArrowProvider,
  openDiamondArrowProvider,
]);

/** 创建当前 Graph 包族的完整 composite dependency provider 集合 */
export const createBaseGraphProviders = (
  options?: GraphDefinitionOptions,
): ReadonlyArray<AnyCoreDependencyProvider> => {
  if (options === undefined) return DEFAULT_GRAPH_PROVIDERS;

  return Object.freeze([
    createGraphProvider(options),
    createEntityProvider(options),
    createRelationProvider(options),
    createGroupProvider(options),
    groupBodyAllocationProvider,
    createBlockProvider(options),
    blockHeaderProvider,
    blockSectionProvider,
    blockRowProvider,
    flexLayoutProvider,
    surfaceProvider,
    pathClipProvider,
    hexagonShapeProvider,
    ellipticCapsuleShapeProvider,
    straightBarbArrowProvider,
    squareArrowProvider,
    diamondArrowProvider,
    openDiamondArrowProvider,
  ]);
};
