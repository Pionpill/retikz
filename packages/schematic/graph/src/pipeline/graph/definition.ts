import type { LayoutCompositeDefinition } from '@retikz/core';

import { defineComposite } from '@retikz/core';

import type { GraphDefinitionOptions } from '../../contract';
import type { ResolvedGraphDefinitionOptions } from '../../providers';
import type { IRGraph } from '../../schemas';

import { resolveGraphDefinitionOptions } from '../../providers';
import { GraphSchema } from '../../schemas';
import { GRAPH_NAMESPACE, GraphType } from '../../shared';
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
