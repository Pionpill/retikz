import type { CompositeCoreProviderKey, ExpandCompositeDefinition } from '@retikz/core';
import { defineComposite } from '@retikz/core';
import { literal, strictObject } from 'zod';

import { RetikzGraphError, RetikzGraphErrorCode } from '../../errors';
import type { ResolvedGraphDefinitionOptions } from '../../providers';
import { resolveCodeBlockTokens } from '../../resolve/theme';
import { GRAPH_NAMESPACE, GraphType } from '../../shared';
import type { CodeBlockDefinition } from '../contract';
import { resolveCodeBlockSurface } from '../resolve';
import type { IRCodeBlock } from '../schemas';

/** 为实体建立主题边界；领域内容留待边界内展开 */
export const createCodeBlockDefinition = <TSource extends IRCodeBlock>(
  definition: CodeBlockDefinition<TSource>,
  contentKey: CompositeCoreProviderKey,
): ExpandCompositeDefinition<TSource> =>
  defineComposite({
    namespace: definition.namespace,
    type: definition.type,
    schema: definition.schema,
    expand: source => {
      const { theme, ...content } = source;
      const child = { namespace: contentKey.namespace, type: contentKey.type, source: content };
      return { children: theme === undefined ? [child] : [{ type: 'scope', theme, children: [child] }] };
    },
  });

/** 在有效 Core Theme 下组合内容与唯一 Block 根 */
export const createCodeBlockContentDefinition = <TSource extends IRCodeBlock>(
  definition: CodeBlockDefinition<TSource>,
  key: CompositeCoreProviderKey,
  options: ResolvedGraphDefinitionOptions,
) =>
  defineComposite({
    namespace: key.namespace,
    type: key.type,
    schema: strictObject({ namespace: literal(key.namespace), type: literal(key.type), source: definition.schema }),
    expand: ({ source }, context) => {
      const codeBlockTokens = resolveCodeBlockTokens(context.theme, options.graphThemeStyles);
      const surface = resolveCodeBlockSurface(source);
      try {
        return {
          children: [
            {
              namespace: GRAPH_NAMESPACE,
              type: GraphType.Block,
              ...surface,
              children: [...definition.compose(source, { theme: context.theme, codeBlockTokens })],
            },
          ],
        };
      } catch (cause) {
        throw new RetikzGraphError({
          code: RetikzGraphErrorCode.DefinitionCallbackFailed,
          message: `Code block '${definition.namespace}.${definition.type}' composition failed.`,
          details: {
            capability: 'code-block-compose',
            key: `${definition.namespace}.${definition.type}`,
            nodeId: source.id,
          },
          cause,
        });
      }
    },
  });
