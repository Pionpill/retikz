import { NodeSchema } from '@retikz/core';
import { NonBlankStringSchema } from '@retikz/foundation';
import { z as zod } from 'zod';

import { GRAPH_NAMESPACE, GraphType } from '../../shared';

export const EntityRoleSchema = NonBlankStringSchema.describe(
  'Open Entity role key resolved by the configured Graph role registry.',
);

export const EntityVariantSchema = NonBlankStringSchema.describe('Open Entity variant key.');

/** Entity 的 JSON 安全规范模式 */
export const EntitySchema = zod
  .strictObject({
    namespace: zod.literal(GRAPH_NAMESPACE).describe('Graph semantic element namespace.'),
    type: zod.literal(GraphType.Entity).describe('Entity semantic element discriminator.'),
    ...NodeSchema.omit({ type: true, id: true }).shape,
    id: NonBlankStringSchema.describe('Stable authored Entity identity.'),
    role: EntityRoleSchema,
    variant: EntityVariantSchema.optional().describe(
      'Open Entity variant key; omitted values use the nearest Graph or Container scope, then default.',
    ),
  })
  .describe('Canonical JSON-safe Entity lowered to one Core Node.');
