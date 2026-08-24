import { ChildSchema, ScopePropsSchema } from '@retikz/core';
import { array, literal, strictObject } from 'zod';

import { GRAPH_NAMESPACE, GraphType } from '../../shared';
import { GraphThemeLayerSchema } from '../theme';

export const GraphSchema = strictObject({
  namespace: literal(GRAPH_NAMESPACE).describe('Graph semantic element namespace.'),
  type: literal(GraphType.Graph).describe('Graph Source assembly discriminator.'),
  ...ScopePropsSchema.shape,
  graphTheme: GraphThemeLayerSchema.optional().describe('Optional Graph-local appearance rule layer.'),
  children: array(ChildSchema).optional().describe('Optional ordered Core children in this Graph Scope.'),
}).describe('JSON-safe Graph Source composite combining the complete Core Scope surface with Graph-local context.');
