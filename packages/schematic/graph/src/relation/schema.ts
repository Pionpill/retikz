import { PathBaseSchema } from '@retikz/core';
import { NonBlankStringSchema } from '@retikz/foundation';
import { z } from 'zod';

import { GRAPH_NAMESPACE, GraphType } from '../shared';
import { RelationRole } from './constants';

const RelationPathShape = PathBaseSchema.omit({
  type: true,
  id: true,
  kind: true,
  kindOptions: true,
  children: true,
}).shape;

/** Relation 的 JSON 安全规范模式 */
export const RelationSchema = z
  .strictObject({
    namespace: z.literal(GRAPH_NAMESPACE).describe('Graph element namespace.'),
    type: z.literal(GraphType.Relation).describe('Relation element discriminator.'),
    id: NonBlankStringSchema.describe('Stable authored Relation identity.'),
    role: z.enum(RelationRole).describe('Closed Relation role describing the relation semantic.'),
    ...RelationPathShape,
    children: PathBaseSchema.shape.children.unwrap().describe('Canonical Core Step sequence.'),
    marks: PathBaseSchema.shape.marks
      .default([{ pos: 1, mark: { kind: 'arrow' } }])
      .describe('Core Path marks; omission adds one terminal arrow while an explicit array replaces the default.'),
  })
  .describe('Canonical JSON-safe Relation lowered directly to a Core stroke Path.');
