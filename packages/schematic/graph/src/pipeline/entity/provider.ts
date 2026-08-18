import type { CompositeCoreProviderKey, CoreDependencyProvider } from '@retikz/core';

import type { GraphDefinitionOptions } from '../../contract';

import { createGraphRuntimeDatasets, resolveGraphRuntimeOptions } from '../../providers';
import { GRAPH_NAMESPACE, GraphType } from '../../shared';
import { createEntityDefinitionFromOptions } from './definition';

/** Entity Composite provider 的公开完整 key */
export const EntityProviderKey: CompositeCoreProviderKey = Object.freeze({
  capability: 'composite',
  namespace: GRAPH_NAMESPACE,
  type: GraphType.Entity,
});

/** 使用 Core 已合并的 runtime envelopes 创建唯一 Entity Definition */
const makeEntityDefinition: CoreDependencyProvider['makeDefinition'] = datasets =>
  createEntityDefinitionFromOptions(resolveGraphRuntimeOptions(datasets));

/** 创建携带当前 Graph definition options 的 Entity provider */
export const createEntityProvider = (options: GraphDefinitionOptions = {}): CoreDependencyProvider =>
  Object.freeze({
    key: EntityProviderKey,
    dependencies: Object.freeze([]),
    datasets: createGraphRuntimeDatasets(options),
    makeDefinition: makeEntityDefinition,
  });

/** Entity 的 Core Composite dependency provider */
export const EntityProvider = createEntityProvider();

/** 创建 Entity provider 集合 */
export const createEntityProviders = (options: GraphDefinitionOptions = {}): ReadonlyArray<CoreDependencyProvider> =>
  Object.freeze([createEntityProvider(options)]);
