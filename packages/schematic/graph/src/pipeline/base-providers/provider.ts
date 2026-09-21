import type { CoreDependencyProvider } from '@retikz/core';
import { FlexLayoutProvider } from '@retikz/layout';
import { SurfaceProvider } from '@retikz/standard';
import {
  DiamondArrowProvider,
  OpenDiamondArrowProvider,
  SquareArrowProvider,
  StraightBarbArrowProvider,
} from '@retikz/standard/arrow';
import { PathClipProvider } from '@retikz/standard/clip';
import { EllipticCapsuleShapeProvider, HexagonShapeProvider } from '@retikz/standard/node-shape';

import type { GraphDefinitionOptions } from '../../contract';
import { BlockProvider, createBlockProvider } from '../block';
import { BlockHeaderProvider, BlockRowProvider, BlockSectionProvider } from '../block';
import { createEntityProvider, EntityProvider } from '../entity';
import { createGraphProvider, GraphProvider } from '../graph';
import { GroupBodyAllocationProvider } from '../group';
import { createGroupProvider, GroupProvider } from '../group';
import { createRelationProvider, RelationProvider } from '../relation';

const DEFAULT_GRAPH_PROVIDERS: ReadonlyArray<CoreDependencyProvider> = Object.freeze([
  GraphProvider,
  EntityProvider,
  RelationProvider,
  GroupProvider,
  GroupBodyAllocationProvider,
  BlockProvider,
  BlockHeaderProvider,
  BlockSectionProvider,
  BlockRowProvider,
  FlexLayoutProvider,
  SurfaceProvider,
  PathClipProvider,
  HexagonShapeProvider,
  EllipticCapsuleShapeProvider,
  StraightBarbArrowProvider,
  SquareArrowProvider,
  DiamondArrowProvider,
  OpenDiamondArrowProvider,
]);

/** 创建当前 Graph 包族的完整 composite dependency provider 集合 */
export const createBaseGraphProviders = (options?: GraphDefinitionOptions): ReadonlyArray<CoreDependencyProvider> => {
  if (options === undefined) return DEFAULT_GRAPH_PROVIDERS;
  return Object.freeze([
    createGraphProvider(options),
    createEntityProvider(options),
    createRelationProvider(options),
    createGroupProvider(options),
    GroupBodyAllocationProvider,
    createBlockProvider(options),
    BlockHeaderProvider,
    BlockSectionProvider,
    BlockRowProvider,
    FlexLayoutProvider,
    SurfaceProvider,
    PathClipProvider,
    HexagonShapeProvider,
    EllipticCapsuleShapeProvider,
    StraightBarbArrowProvider,
    SquareArrowProvider,
    DiamondArrowProvider,
    OpenDiamondArrowProvider,
  ]);
};
