import type { AnyCompositeDefinition, CoreDependencyProvider } from '@retikz/core';

import {
  DiamondArrowProvider,
  KiteArrowProvider,
  OpenDiamondArrowProvider,
  SquareArrowProvider,
} from '@retikz/standard/arrow';
import { EllipticCapsuleShapeProvider, HexagonShapeProvider } from '@retikz/standard/shape';

import type { GraphDefinitionOptions } from '../contract';

import { resolveGraphDefinitionOptions } from '../providers';
import { createEntityDefinitionFromOptions } from './entity/definition';
import { createEntityProvider, EntityProvider } from './entity/provider';
import { createGraphDefinitionFromOptions } from './graph/definition';
import { createGraphProvider, GraphProvider } from './graph/provider';
import { createRelationDefinitionFromOptions } from './relation/definition';
import { createRelationProvider, RelationProvider } from './relation/provider';

/** 创建当前 Graph 包族的完整 composite definition 集合 */
export const createGraphDefinitions = (options: GraphDefinitionOptions = {}): Array<AnyCompositeDefinition> => {
  const resolved = resolveGraphDefinitionOptions(options);
  return [
    createGraphDefinitionFromOptions(resolved),
    createEntityDefinitionFromOptions(resolved),
    createRelationDefinitionFromOptions(resolved),
  ];
};

const DEFAULT_GRAPH_PROVIDERS: ReadonlyArray<CoreDependencyProvider> = Object.freeze([
  GraphProvider,
  EntityProvider,
  RelationProvider,
  HexagonShapeProvider,
  EllipticCapsuleShapeProvider,
  KiteArrowProvider,
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
    HexagonShapeProvider,
    EllipticCapsuleShapeProvider,
    KiteArrowProvider,
    SquareArrowProvider,
    DiamondArrowProvider,
    OpenDiamondArrowProvider,
  ]);
};
