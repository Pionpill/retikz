import type { ExpandCompositeDefinition } from '@retikz/core';

import { defineComposite } from '@retikz/core';

import type { GraphDefinitionOptions } from '../../contract';
import type { ResolvedGraphDefinitionOptions } from '../../providers';
import type { IRGraphEntity } from '../../schemas';

import { resolveGraphDefinitionOptions } from '../../providers';
import { resolveEntity, resolveEntityAppearance } from '../../resolve';
import { EntitySchema } from '../../schemas';
import { GRAPH_NAMESPACE, GraphType } from '../../shared';
import { lowerEntity } from './lower';

/** 使用已解析 Graph definitions 创建独立 Entity Composite Definition */
export const createEntityDefinitionFromOptions = (
  options: ResolvedGraphDefinitionOptions,
): ExpandCompositeDefinition<IRGraphEntity, typeof GRAPH_NAMESPACE, typeof GraphType.Entity> =>
  defineComposite({
    namespace: GRAPH_NAMESPACE,
    type: GraphType.Entity,
    schema: EntitySchema,
    expand: (source, context) => {
      const entity = resolveEntity(source, options);
      const appearance = resolveEntityAppearance(entity, { ...options, theme: context.theme });
      return { children: [lowerEntity(entity, appearance)] };
    },
  });

/** 创建使用指定 Graph definitions 的独立 Entity Composite Definition */
export const createEntityDefinition = (
  options: GraphDefinitionOptions = {},
): ExpandCompositeDefinition<IRGraphEntity, typeof GRAPH_NAMESPACE, typeof GraphType.Entity> =>
  createEntityDefinitionFromOptions(resolveGraphDefinitionOptions(options));

/** 使用内置 Graph definitions 的默认 Entity Composite Definition */
export const EntityDefinition = createEntityDefinition();
