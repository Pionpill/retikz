import type { CompositeCoreProviderKey, CoreDependencyProvider } from '@retikz/core';

import { EllipticCapsuleShapeProvider, HexagonShapeProvider } from '@retikz/standard/shape';

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

/** 使用当前 provider key 已合并的 runtime datasets 创建唯一 Entity Definition */
const makeEntityDefinition: CoreDependencyProvider['makeDefinition'] = datasets =>
  createEntityDefinitionFromOptions(resolveGraphRuntimeOptions(datasets));

/** 创建携带当前 Graph definition options 的 Entity provider */
export const createEntityProvider = (options: GraphDefinitionOptions = {}): CoreDependencyProvider =>
  Object.freeze({
    key: EntityProviderKey,
    dependencies: Object.freeze([HexagonShapeProvider.key, EllipticCapsuleShapeProvider.key]),
    datasets: createGraphRuntimeDatasets(options),
    makeDefinition: makeEntityDefinition,
  });

/** 使用内置 Graph registries 的默认 Entity provider */
export const EntityProvider = createEntityProvider();
