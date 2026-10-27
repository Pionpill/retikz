import type { CompositeDefinition, CompositeCoreProviderKey, CoreDependencyProvider } from '@retikz/core';
import { defineComposite } from '@retikz/core';
import {
  diamondArrowProvider,
  openDiamondArrowProvider,
  squareArrowProvider,
  straightBarbArrowProvider,
} from '@retikz/extension';

import type { GraphDefinitionOptions } from '../../contract';
import type { GraphDefinitionRegistries } from '../../providers';
import { resolveGraphDefinitionOptions, resolveGraphRuntimeOptions } from '../../providers';
import { resolveRelation, resolveRelationAppearance, resolveRelationStructure } from '../../resolve';
import type { IRGraphRelation } from '../../schemas';
import { RelationSchema } from '../../schemas';
import { GRAPH_NAMESPACE, GraphType } from '../../shared';
import { lowerRelation } from './lower';

/** 使用已解析 Graph definitions 创建独立 Relation Composite Definition */
export const createRelationDefinitionFromOptions = (
  options: GraphDefinitionRegistries,
): CompositeDefinition<IRGraphRelation, typeof GRAPH_NAMESPACE, typeof GraphType.Relation> =>
  defineComposite({
    namespace: GRAPH_NAMESPACE,
    type: GraphType.Relation,
    schema: RelationSchema,
    compile: (source, context) => {
      const relation = resolveRelation(source, options);
      const structure = resolveRelationStructure(relation, { ...options, theme: context.theme });
      const appearance = resolveRelationAppearance(relation, { ...options, theme: context.theme });

      return { children: [lowerRelation(relation, structure, appearance)] };
    },
  });

/** 创建使用指定 Graph definitions 的独立 Relation Composite Definition */
export const createRelationDefinition = (
  options: GraphDefinitionOptions = {},
): CompositeDefinition<IRGraphRelation, typeof GRAPH_NAMESPACE, typeof GraphType.Relation> =>
  createRelationDefinitionFromOptions(resolveGraphDefinitionOptions(options));

/** 使用内置 Graph definitions 的默认 Relation Composite Definition */
export const relationDefinition = createRelationDefinition();

/** Relation Composite provider 的公开完整 key */
export const relationProviderKey: CompositeCoreProviderKey = Object.freeze({
  capability: 'composite',
  namespace: GRAPH_NAMESPACE,
  type: GraphType.Relation,
});

/** 合并 Relation 提供者参数并创建唯一定义 */
const makeRelationDefinition: CoreDependencyProvider<GraphDefinitionOptions>['makeDefinition'] = contributions =>
  createRelationDefinitionFromOptions(resolveGraphRuntimeOptions(contributions));

/** 创建携带当前 Graph definition options 的 Relation provider */
export const createRelationProvider = (
  options: GraphDefinitionOptions = {},
): CoreDependencyProvider<GraphDefinitionOptions> =>
  Object.freeze({
    key: relationProviderKey,
    dependencies: Object.freeze([
      straightBarbArrowProvider.key,
      squareArrowProvider.key,
      diamondArrowProvider.key,
      openDiamondArrowProvider.key,
    ]),
    params: options,
    makeDefinition: makeRelationDefinition,
  });

/** 使用内置 Graph registries 的默认 Relation provider */
export const relationProvider = createRelationProvider();
