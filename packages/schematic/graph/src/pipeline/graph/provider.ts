import type { CompositeCoreProviderKey, CoreDependencyProvider } from '@retikz/core';

import type { GraphDefinitionOptions } from '../../contract';

import { createGraphRuntimeDatasets, resolveGraphRuntimeOptions } from '../../providers';
import { GRAPH_NAMESPACE, GraphType } from '../../shared';
import { EntityProviderKey } from '../entity';
import { GroupProviderKey } from '../group';
import { RelationProviderKey } from '../relation';
import { createGraphDefinitionFromOptions } from './definition';

/** Graph Composite provider 的公开完整 key */
export const GraphProviderKey: CompositeCoreProviderKey = Object.freeze({
  capability: 'composite',
  namespace: GRAPH_NAMESPACE,
  type: GraphType.Graph,
});

/** 使用 Core 已合并的 runtime envelopes 创建唯一 Graph Definition */
const makeGraphDefinition: CoreDependencyProvider['makeDefinition'] = datasets =>
  createGraphDefinitionFromOptions(resolveGraphRuntimeOptions(datasets));

/** 创建携带当前 Graph definition options 的 Graph provider */
export const createGraphProvider = (options: GraphDefinitionOptions = {}): CoreDependencyProvider =>
  Object.freeze({
    key: GraphProviderKey,
    dependencies: Object.freeze([EntityProviderKey, RelationProviderKey, GroupProviderKey]),
    datasets: createGraphRuntimeDatasets(options),
    makeDefinition: makeGraphDefinition,
  });

/** 使用内置 Graph registries 的默认 Graph provider */
export const GraphProvider = createGraphProvider();
