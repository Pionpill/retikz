import type { ExpandCompositeDefinition } from '@retikz/core';

import { defineComposite } from '@retikz/core';

import type { GraphDefinitionOptions } from '../../contract';
import type { ResolvedGraphDefinitionOptions } from '../../providers';
import type { IRGraphRelation } from '../../schemas';

import { resolveGraphDefinitionOptions } from '../../providers';
import { resolveRelation, resolveRelationAppearance, resolveRelationStructure } from '../../resolve';
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
      const structure = resolveRelationStructure(relation);
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
