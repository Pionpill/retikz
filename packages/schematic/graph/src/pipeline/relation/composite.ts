import type { ExpandCompositeDefinition, CompositeCoreProviderKey, CoreDependencyProvider } from '@retikz/core';
import { defineComposite } from '@retikz/core';
import {
  DiamondArrowProvider,
  OpenDiamondArrowProvider,
  SquareArrowProvider,
  StraightBarbArrowProvider,
} from '@retikz/extension';

import type { GraphDefinitionOptions } from '../../contract';
import type { ResolvedGraphDefinitionOptions } from '../../providers';
import { resolveGraphDefinitionOptions, createGraphRuntimeDatasets, resolveGraphRuntimeOptions } from '../../providers';
import { resolveRelation, resolveRelationAppearance, resolveRelationStructure } from '../../resolve';
import type { IRGraphRelation } from '../../schemas';
import { RelationSchema } from '../../schemas';
import { GRAPH_NAMESPACE, GraphType } from '../../shared';
import { lowerRelation } from './lower';

/** 使用已解析 Graph definitions 创建独立 Relation Composite Definition */
export const createRelationDefinitionFromOptions = (
  options: ResolvedGraphDefinitionOptions,
): ExpandCompositeDefinition<IRGraphRelation, typeof GRAPH_NAMESPACE, typeof GraphType.Relation> =>
  defineComposite({
    namespace: GRAPH_NAMESPACE,
    type: GraphType.Relation,
    schema: RelationSchema,
    expand: (source, context) => {
      const relation = resolveRelation(source, options);
      const structure = resolveRelationStructure(relation, { ...options, theme: context.theme });
      const appearance = resolveRelationAppearance(relation, { ...options, theme: context.theme });

      return { children: [lowerRelation(relation, structure, appearance)] };
    },
  });

/** 创建使用指定 Graph definitions 的独立 Relation Composite Definition */
export const createRelationDefinition = (
  options: GraphDefinitionOptions = {},
): ExpandCompositeDefinition<IRGraphRelation, typeof GRAPH_NAMESPACE, typeof GraphType.Relation> =>
  createRelationDefinitionFromOptions(resolveGraphDefinitionOptions(options));

/** 使用内置 Graph definitions 的默认 Relation Composite Definition */
export const RelationDefinition = createRelationDefinition();

/** Relation Composite provider 的公开完整 key */
export const RelationProviderKey: CompositeCoreProviderKey = Object.freeze({
  capability: 'composite',
  namespace: GRAPH_NAMESPACE,
  type: GraphType.Relation,
});

/** 使用当前 provider key 已合并的 runtime datasets 创建唯一 Relation Definition */
const makeRelationDefinition: CoreDependencyProvider['makeDefinition'] = datasets =>
  createRelationDefinitionFromOptions(resolveGraphRuntimeOptions(datasets));

/** 创建携带当前 Graph definition options 的 Relation provider */
export const createRelationProvider = (options: GraphDefinitionOptions = {}): CoreDependencyProvider =>
  Object.freeze({
    key: RelationProviderKey,
    dependencies: Object.freeze([
      StraightBarbArrowProvider.key,
      SquareArrowProvider.key,
      DiamondArrowProvider.key,
      OpenDiamondArrowProvider.key,
    ]),
    datasets: createGraphRuntimeDatasets(options),
    makeDefinition: makeRelationDefinition,
  });

/** 使用内置 Graph registries 的默认 Relation provider */
export const RelationProvider = createRelationProvider();
