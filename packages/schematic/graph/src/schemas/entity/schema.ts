import { NodeSchema } from '@retikz/core';
import { createOpenStringSchema, NonBlankStringSchema } from '@retikz/foundation';
import { literal, strictObject } from 'zod';

import { EntityRole, GRAPH_NAMESPACE, GraphType } from '../../shared';
import { GraphPredicateRefSchema } from '../predicate';

export const EntityRoleSchema = createOpenStringSchema(EntityRole).describe(
  'Open Entity role key resolved by the configured Graph role registry.',
);

const EntityNodeShape = NodeSchema.omit({
  type: true,
  shape: true,
  boundary: true,
  padding: true,
  cornerRadius: true,
}).shape;

export const EntitySchema = strictObject({
  namespace: literal(GRAPH_NAMESPACE).describe('Graph semantic element namespace.'),
  type: literal(GraphType.Entity).describe('Entity Source record discriminator.'),
  role: EntityRoleSchema,
  kind: NonBlankStringSchema.optional().describe('Open stable subtype key within the selected Entity role.'),
  predicate: GraphPredicateRefSchema.optional().describe('Optional precise semantic predicate reference.'),
  ...EntityNodeShape,
  position: EntityNodeShape.position.optional().describe('Optional Core Node placement.'),
}).describe('JSON-safe Graph Entity with role-owned structure and the non-structural Core Node surface.');
