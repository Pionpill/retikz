import type { CompositeCoreProviderKey, CoreDependencyProvider } from '@retikz/core';

import { FlexLayoutProvider } from '@retikz/layout';
import { SurfaceProvider } from '@retikz/standard';

import type { GraphDefinitionOptions } from '../../contract';

import { createGraphRuntimeDatasets, resolveGraphRuntimeOptions } from '../../providers';
import { GRAPH_NAMESPACE, GraphType } from '../../shared';
import { EntityProviderKey } from '../entity';
import { RelationProviderKey } from '../relation';
import { createGroupDefinitionFromOptions } from './definition';

/** Group Composite provider 的公开完整 key */
export const GroupProviderKey: CompositeCoreProviderKey = Object.freeze({
  capability: 'composite',
  namespace: GRAPH_NAMESPACE,
  type: GraphType.Group,
});

const makeGroupDefinition: CoreDependencyProvider['makeDefinition'] = datasets =>
  createGroupDefinitionFromOptions(resolveGraphRuntimeOptions(datasets));

/** 创建携带当前 Graph definition options 的 Group provider */
export const createGroupProvider = (options: GraphDefinitionOptions = {}): CoreDependencyProvider =>
  Object.freeze({
    key: GroupProviderKey,
    dependencies: Object.freeze([EntityProviderKey, RelationProviderKey, FlexLayoutProvider.key, SurfaceProvider.key]),
    datasets: createGraphRuntimeDatasets(options),
    makeDefinition: makeGroupDefinition,
  });

/** 使用内置 Graph registries 的默认 Group provider */
export const GroupProvider = createGroupProvider();
