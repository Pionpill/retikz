import type { AnyCompositeDefinition, CoreDependencyProvider } from '@retikz/core';

import { ContainerDefinition, ContainerProvider } from './container';
import { EntityDefinition, EntityProvider } from './entity';
import { RelationDefinition, RelationProvider } from './relation';

/** 创建当前 Graph 包族的完整 composite definition 集合 */
export const createGraphDefinitions = (): Array<AnyCompositeDefinition> => [
  ContainerDefinition,
  EntityDefinition,
  RelationDefinition,
];

/** 创建当前 Graph 包族的完整 composite dependency provider 集合 */
export const createGraphProviders = (): ReadonlyArray<CoreDependencyProvider> =>
  Object.freeze([ContainerProvider, EntityProvider, RelationProvider]);
