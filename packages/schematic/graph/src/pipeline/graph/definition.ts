import type { ExpandCompositeDefinition } from '@retikz/core';

import { defineComposite } from '@retikz/core';

import type { GraphDefinitionOptions } from '../../contract';
import type { ResolvedGraphDefinitionOptions } from '../../providers';
import type { IRGraph } from '../../schemas';

import { resolveGraphDefinitionOptions } from '../../providers';
import { GraphSchema } from '../../schemas';
import { GRAPH_NAMESPACE, GraphType } from '../../shared';
import { lowerGraphPresentationChildren } from '../presentation';

/** 用已解析 registries 创建 Graph presentation Composite Definition */
export const createGraphDefinitionFromOptions = (
  options: ResolvedGraphDefinitionOptions,
): ExpandCompositeDefinition<IRGraph, typeof GRAPH_NAMESPACE, typeof GraphType.Graph> =>
  defineComposite({
    namespace: GRAPH_NAMESPACE,
    type: GraphType.Graph,
    schema: GraphSchema,
    expand: (node, context) => ({
      children: [
        {
          type: 'scope',
          ...(node.id === undefined ? {} : { id: node.id }),
          children: lowerGraphPresentationChildren(node.children, {
            ...options,
            theme: context.theme,
            ...(node.entityVariant === undefined ? {} : { inheritedVariant: node.entityVariant }),
            tokenLayers:
              node.graphThemeTokens === undefined && node.graphThemeTokenRules === undefined
                ? []
                : [
                    {
                      ...(node.graphThemeTokens === undefined ? {} : { tokens: node.graphThemeTokens }),
                      ...(node.graphThemeTokenRules === undefined ? {} : { tokenRules: node.graphThemeTokenRules }),
                    },
                  ],
          }),
        },
      ],
    }),
  });

/** 创建使用指定 registries 的 Graph presentation Composite Definition */
export const createGraphDefinition = (
  options: GraphDefinitionOptions = {},
): ExpandCompositeDefinition<IRGraph, typeof GRAPH_NAMESPACE, typeof GraphType.Graph> =>
  createGraphDefinitionFromOptions(resolveGraphDefinitionOptions(options));

/** 使用内置 registries 的默认 Graph presentation Composite Definition */
export const GraphDefinition = createGraphDefinition();
