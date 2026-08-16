import { NodeSchema } from '@retikz/core';
import { NonBlankStringSchema } from '@retikz/foundation';
import { z as zod } from 'zod';

import { GRAPH_NAMESPACE, GraphType } from '../shared';
import { EntityRole, EntityVariant } from './constants';

const EntityShape = NodeSchema.omit({ type: true, id: true }).shape;

/** Entity 的 JSON 安全规范模式 */
export const EntitySchema = zod
  .strictObject({
    namespace: zod.literal(GRAPH_NAMESPACE).describe('Graph semantic element namespace.'),
    type: zod.literal(GraphType.Entity).describe('Entity semantic element discriminator.'),
    ...EntityShape,
    id: NonBlankStringSchema.describe('Stable authored Entity identity.'),
    role: zod.enum(EntityRole).describe('Closed Entity role describing the node semantic.'),
    variant: zod
      .enum(EntityVariant)
      .optional()
      .describe('Entity visual variant; omitted values use the nearest Container scope or default.'),
  })
  .describe('Canonical JSON-safe Entity lowered to one Core Node.');
