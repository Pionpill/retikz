import type { CompositeDefinition, CompositeCoreProviderKey, CoreDependencyProvider } from '@retikz/core';
import { defineComposite } from '@retikz/core';

import type { GraphDefinitionOptions } from '../../contract';
import type { ResolvedGraphDefinitionOptions } from '../../providers';
import { resolveGraphDefinitionOptions, resolveGraphRuntimeOptions } from '../../providers';
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
): CompositeDefinition<IRGraph, typeof GRAPH_NAMESPACE, typeof GraphType.Graph> =>
  defineComposite({
    namespace: GRAPH_NAMESPACE,
    type: GraphType.Graph,
    schema: GraphSchema,
    compile: createCompileGraph(options),
  });

/** 创建使用指定 registries 的 Graph Composite Definition */
export const createGraphDefinition = (
  options: GraphDefinitionOptions = {},
): CompositeDefinition<IRGraph, typeof GRAPH_NAMESPACE, typeof GraphType.Graph> =>
  createGraphDefinitionFromOptions(resolveGraphDefinitionOptions(options));

/** 使用内置 registries 的默认 Graph Composite Definition */
export const GraphDefinition: CompositeDefinition<IRGraph, typeof GRAPH_NAMESPACE, typeof GraphType.Graph> =
  createGraphDefinition();

/** Graph Composite provider 的公开完整 key */
export const GraphProviderKey: CompositeCoreProviderKey = Object.freeze({
  capability: 'composite',
  namespace: GRAPH_NAMESPACE,
  type: GraphType.Graph,
});

/** 合并 Graph 提供者参数并创建唯一定义 */
const makeGraphDefinition: CoreDependencyProvider<GraphDefinitionOptions>['makeDefinition'] = contributions =>
  createGraphDefinitionFromOptions(resolveGraphRuntimeOptions(contributions));

/** 创建携带当前 Graph definition options 的 Graph provider */
export const createGraphProvider = (
  options: GraphDefinitionOptions = {},
): CoreDependencyProvider<GraphDefinitionOptions> =>
  Object.freeze({
    key: GraphProviderKey,
    dependencies: Object.freeze([EntityProviderKey, RelationProviderKey, GroupProviderKey, BlockProviderKey]),
    params: options,
    makeDefinition: makeGraphDefinition,
  });

/** 使用内置 Graph registries 的默认 Graph provider */
export const GraphProvider = createGraphProvider();
