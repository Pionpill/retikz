import type { AnyCompositeDefinition, CoreDependencyProvider } from '@retikz/core';

import type { GraphDefinitionOptions } from '../contract';

import { resolveGraphDefinitionOptions } from '../providers';
import { ContainerProvider, createContainerDefinitionFromOptions, createContainerProvider } from './container';
import { createEntityDefinitionFromOptions, createEntityProvider, EntityProvider } from './entity';
import { createGraphDefinitionFromOptions, createGraphProvider, GraphProvider } from './graph';
import {
  createGraphPresentationDefinition,
  createGraphPresentationProvider,
  GraphPresentationProvider,
} from './presentation';
import { RelationDefinition, RelationProvider } from './relation';

/** 创建当前 Graph 包族的完整 composite definition 集合 */
export const createGraphDefinitions = (options: GraphDefinitionOptions = {}): Array<AnyCompositeDefinition> => {
  const resolved = resolveGraphDefinitionOptions(options);
  return [
    createGraphDefinitionFromOptions(resolved),
    createContainerDefinitionFromOptions(resolved),
    createEntityDefinitionFromOptions(resolved),
    RelationDefinition,
    createGraphPresentationDefinition(resolved),
  ];
};

const DEFAULT_GRAPH_PROVIDERS: ReadonlyArray<CoreDependencyProvider> = Object.freeze([
  GraphProvider,
  ContainerProvider,
  EntityProvider,
  RelationProvider,
  GraphPresentationProvider,
]);

/** 创建当前 Graph 包族的完整 composite dependency provider 集合 */
export const createGraphProviders = (options?: GraphDefinitionOptions): ReadonlyArray<CoreDependencyProvider> => {
  if (options === undefined) return DEFAULT_GRAPH_PROVIDERS;
  return Object.freeze([
    createGraphProvider(options),
    createContainerProvider(options),
    createEntityProvider(options),
    RelationProvider,
    createGraphPresentationProvider(options),
  ]);
};
