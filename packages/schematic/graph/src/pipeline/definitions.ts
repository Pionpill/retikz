import type { AnyCompositeDefinition, CoreDependencyProvider } from '@retikz/core';

import { FlexLayoutDefinition, FlexLayoutProvider } from '@retikz/layout';
import { SurfaceDefinition, SurfaceProvider } from '@retikz/standard';
import {
  DiamondArrowProvider,
  OpenDiamondArrowProvider,
  SquareArrowProvider,
  StraightBarbArrowProvider,
} from '@retikz/standard/arrow';
import { PathClipProvider } from '@retikz/standard/clip';
import { EllipticCapsuleShapeProvider, HexagonShapeProvider } from '@retikz/standard/shape';

import type { GraphDefinitionOptions } from '../contract';

import { resolveGraphDefinitionOptions } from '../providers';
import { createBlockDefinitionFromOptions } from './block/definition';
import { BlockProvider, createBlockProvider } from './block/provider';
import { BlockHeaderDefinition, BlockRowDefinition, BlockSectionDefinition } from './block/structure-definition';
import { BlockHeaderProvider, BlockRowProvider, BlockSectionProvider } from './block/structure-provider';
import { createEntityDefinitionFromOptions } from './entity/definition';
import { createEntityProvider, EntityProvider } from './entity/provider';
import { createGraphDefinitionFromOptions } from './graph/definition';
import { createGraphProvider, GraphProvider } from './graph/provider';
import { GroupBodyAllocationDefinition, GroupBodyAllocationProvider } from './group/allocation';
import { createGroupDefinitionFromOptions } from './group/definition';
import { createGroupProvider, GroupProvider } from './group/provider';
import { createRelationDefinitionFromOptions } from './relation/definition';
import { createRelationProvider, RelationProvider } from './relation/provider';

/** 创建当前 Graph 包族的完整 composite definition 集合 */
export const createGraphDefinitions = (options: GraphDefinitionOptions = {}): Array<AnyCompositeDefinition> => {
  const resolved = resolveGraphDefinitionOptions(options);
  return [
    createGraphDefinitionFromOptions(resolved),
    createGroupDefinitionFromOptions(resolved),
    GroupBodyAllocationDefinition,
    createBlockDefinitionFromOptions(resolved),
    BlockHeaderDefinition,
    BlockSectionDefinition,
    BlockRowDefinition,
    createEntityDefinitionFromOptions(resolved),
    createRelationDefinitionFromOptions(resolved),
    FlexLayoutDefinition,
    SurfaceDefinition,
  ];
};

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
export const createGraphProviders = (options?: GraphDefinitionOptions): ReadonlyArray<CoreDependencyProvider> => {
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
