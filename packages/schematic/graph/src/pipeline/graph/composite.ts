import type { LayoutCompositeDefinition, CompositeCoreProviderKey, CoreDependencyProvider } from '@retikz/core';
import { defineComposite } from '@retikz/core';

import type { GraphDefinitionOptions } from '../../contract';
import type { ResolvedGraphDefinitionOptions } from '../../providers';
import { resolveGraphDefinitionOptions, createGraphRuntimeDatasets, resolveGraphRuntimeOptions } from '../../providers';
import type { IRGraph } from '../../schemas';
import { GraphSchema } from '../../schemas';
import { GRAPH_NAMESPACE, GraphType } from '../../shared';
import { BlockProviderKey } from '../block';
import { EntityProviderKey } from '../entity';
import { GroupProviderKey } from '../group';
import { RelationProviderKey } from '../relation';
import { createCompileGraph } from './compile';

/** 用已解析 registries 创建 Graph Composite Definition */
export const createGraphDefinitionFromOptions = (
  options: ResolvedGraphDefinitionOptions,
): LayoutCompositeDefinition<IRGraph, typeof GRAPH_NAMESPACE, typeof GraphType.Graph> =>
  defineComposite({
    namespace: GRAPH_NAMESPACE,
    type: GraphType.Graph,
    schema: GraphSchema,
    compile: createCompileGraph(options),
  });

/** 创建使用指定 registries 的 Graph Composite Definition */
export const createGraphDefinition = (
  options: GraphDefinitionOptions = {},
): LayoutCompositeDefinition<IRGraph, typeof GRAPH_NAMESPACE, typeof GraphType.Graph> =>
  createGraphDefinitionFromOptions(resolveGraphDefinitionOptions(options));

/** 使用内置 registries 的默认 Graph Composite Definition */
export const GraphDefinition: LayoutCompositeDefinition<IRGraph, typeof GRAPH_NAMESPACE, typeof GraphType.Graph> =
  createGraphDefinition();

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
    dependencies: Object.freeze([EntityProviderKey, RelationProviderKey, GroupProviderKey, BlockProviderKey]),
    datasets: createGraphRuntimeDatasets(options),
    makeDefinition: makeGraphDefinition,
  });

/** 使用内置 Graph registries 的默认 Graph provider */
export const GraphProvider = createGraphProvider();
