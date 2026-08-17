import type { CompositeCoreProviderKey, CoreDependencyProvider } from '@retikz/core';

import type { GraphDefinitionOptions } from '../../contract';

import { createGraphRuntimeDatasets, resolveGraphRuntimeOptions } from '../../providers';
import { GRAPH_NAMESPACE, GraphType } from '../../shared';
import { GraphPresentationProviderKey } from '../presentation';
import { createContainerDefinitionFromOptions } from './definition';

/** Container Composite provider 的公开完整 key */
export const ContainerProviderKey: CompositeCoreProviderKey = Object.freeze({
  capability: 'composite',
  namespace: GRAPH_NAMESPACE,
  type: GraphType.Container,
});

/** 使用 Core 已合并的 runtime envelopes 创建唯一 Container Definition */
const makeContainerDefinition: CoreDependencyProvider['makeDefinition'] = datasets =>
  createContainerDefinitionFromOptions(resolveGraphRuntimeOptions(datasets));

/** 创建携带当前 Graph definition options 的 Container provider */
export const createContainerProvider = (options: GraphDefinitionOptions = {}): CoreDependencyProvider =>
  Object.freeze({
    key: ContainerProviderKey,
    dependencies: Object.freeze([GraphPresentationProviderKey]),
    datasets: createGraphRuntimeDatasets(options),
    makeDefinition: makeContainerDefinition,
  });

/** Container 的 Core Composite dependency provider */
export const ContainerProvider = createContainerProvider();
