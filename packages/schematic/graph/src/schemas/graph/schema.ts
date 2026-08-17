import { ChildSchema } from '@retikz/core';
import { NonBlankStringSchema } from '@retikz/foundation';
import { z } from 'zod';

import { GRAPH_NAMESPACE, GraphType } from '../../shared';
import { GraphEntityThemeTokenRulesSchema, GraphThemeTokenOverridesSchema } from '../theme';

/** Graph presentation root 的 JSON 安全规范模式 */
export const GraphSchema = z
  .strictObject({
    namespace: z.literal(GRAPH_NAMESPACE).describe('Graph semantic element namespace.'),
    type: z.literal(GraphType.Graph).describe('Graph presentation root discriminator.'),
    id: NonBlankStringSchema.optional().describe('Optional stable authored Graph scope identity.'),
    entityVariant: NonBlankStringSchema.optional().describe(
      'Open default Entity variant key inherited by descendant Graph entities.',
    ),
    graphThemeTokens: GraphThemeTokenOverridesSchema.optional().describe(
      'Sparse Graph-local Entity theme token overrides.',
    ),
    graphThemeTokenRules: GraphEntityThemeTokenRulesSchema.optional().describe(
      'Ordered Graph-local Entity theme token rules.',
    ),
    children: z.array(ChildSchema).describe('Graph presentation children in authored order.'),
  })
  .describe('Optional JSON-safe Graph presentation root lowered to one Core Scope.');
