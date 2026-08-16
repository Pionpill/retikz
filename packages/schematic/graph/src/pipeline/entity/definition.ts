import type { ExpandCompositeDefinition } from '@retikz/core';

import { defineComposite } from '@retikz/core';

import type { GraphDefinitionOptions } from '../../contract';
import type { ResolvedGraphDefinitionOptions } from '../../providers';
import type { IREntity } from '../../schemas';

import { resolveGraphDefinitionOptions } from '../../providers';
import { lowerEntityPresentation, resolveEntityPresentation } from '../../resolve';
import { EntitySchema } from '../../schemas';
import { GRAPH_NAMESPACE, GraphType } from '../../shared';

/** 用已解析的 Graph registries 创建 Entity Composite Definition */
export const createEntityDefinitionFromOptions = (
  options: ResolvedGraphDefinitionOptions,
): ExpandCompositeDefinition<IREntity, typeof GRAPH_NAMESPACE, typeof GraphType.Entity> =>
  defineComposite({
    namespace: GRAPH_NAMESPACE,
    type: GraphType.Entity,
    schema: EntitySchema,
    expand: (node, context) => ({
      children: [
        lowerEntityPresentation(
          resolveEntityPresentation(node, {
            ...options,
            theme: context.theme,
          }),
        ),
      ],
    }),
  });

/** 创建使用指定 Graph registries 的 Entity Composite Definition */
export const createEntityDefinition = (
  options: GraphDefinitionOptions = {},
): ExpandCompositeDefinition<IREntity, typeof GRAPH_NAMESPACE, typeof GraphType.Entity> =>
  createEntityDefinitionFromOptions(resolveGraphDefinitionOptions(options));

/** 使用内置 Graph registries 的默认 Entity Composite Definition */
export const EntityDefinition = createEntityDefinition();
