import { NodeSchema } from '@retikz/core';
import { NonBlankStringSchema } from '@retikz/foundation';
import { z as zod } from 'zod';

import { GRAPH_NAMESPACE, GraphElementType } from '../shared';
import { GraphNodeRole, GraphNodeVariant } from './constants';

const GraphNodeShape = NodeSchema.omit({ type: true, id: true }).shape;

/** GraphNode 的 JSON 安全规范模式 */
export const GraphNodeSchema = zod
  .strictObject({
    namespace: zod.literal(GRAPH_NAMESPACE).describe('Graph semantic element namespace.'),
    type: zod.literal(GraphElementType.GraphNode).describe('GraphNode semantic element discriminator.'),
    ...GraphNodeShape,
    id: NonBlankStringSchema.describe('Stable authored GraphNode identity.'),
    role: zod.enum(GraphNodeRole).describe('Closed GraphNode role describing the node semantic.'),
    variant: zod
      .enum(GraphNodeVariant)
      .optional()
      .describe('GraphNode visual variant; omitted values use the nearest GraphFrame scope or default.'),
  })
  .describe('Canonical JSON-safe GraphNode lowered to one Core Node.');
