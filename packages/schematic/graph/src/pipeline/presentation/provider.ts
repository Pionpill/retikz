import type { CompositeCoreProviderKey, CoreDependencyProvider } from '@retikz/core';

import type { GraphDefinitionOptions } from '../../contract';

import { createGraphRuntimeDatasets, resolveGraphRuntimeOptions } from '../../providers';
import { GRAPH_NAMESPACE } from '../../shared';
import { GRAPH_PRESENTATION_TYPE } from './constants';
import { createGraphPresentationDefinition } from './lower';

/** Graph 私有 presentation continuation 的完整 provider key */
export const GraphPresentationProviderKey: CompositeCoreProviderKey = Object.freeze({
  capability: 'composite',
  namespace: GRAPH_NAMESPACE,
  type: GRAPH_PRESENTATION_TYPE,
});

/** 使用 Core 已合并的 runtime envelopes 创建唯一 presentation Definition */
const makeGraphPresentationDefinition: CoreDependencyProvider['makeDefinition'] = datasets =>
  createGraphPresentationDefinition(resolveGraphRuntimeOptions(datasets));

/** 创建携带当前 Graph definition options 的 presentation provider */
export const createGraphPresentationProvider = (options: GraphDefinitionOptions = {}): CoreDependencyProvider =>
  Object.freeze({
    key: GraphPresentationProviderKey,
    dependencies: Object.freeze([]),
    datasets: createGraphRuntimeDatasets(options),
    makeDefinition: makeGraphPresentationDefinition,
  });

/** 使用内置 Graph registries 的默认 presentation provider */
export const GraphPresentationProvider = createGraphPresentationProvider();
