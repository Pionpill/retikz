import { ChildSchema, ScopePropsSchema } from '@retikz/core';
import { z } from 'zod';

import { GRAPH_NAMESPACE, GraphType } from '../../shared';
import { GraphThemeLayerSchema } from '../theme';

export const GraphSchema = z
  .strictObject({
    namespace: z.literal(GRAPH_NAMESPACE).describe('Graph semantic element namespace.'),
    type: z.literal(GraphType.Graph).describe('Graph Source assembly discriminator.'),
    ...ScopePropsSchema.shape,
    graphTheme: GraphThemeLayerSchema.optional().describe('Optional Graph-local appearance rule layer.'),
    children: z.array(ChildSchema).optional().describe('Optional ordered Core children in this Graph Scope.'),
  })
  .describe('JSON-safe Graph Source composite combining the complete Core Scope surface with Graph-local context.');
