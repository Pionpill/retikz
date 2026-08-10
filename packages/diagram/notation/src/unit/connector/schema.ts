import { PathBaseSchema } from '@retikz/core';
import { NonBlankStringSchema } from '@retikz/foundation';
import { z } from 'zod';

import { NOTATION_NAMESPACE, NotationElementType } from '../../shared';

const ConnectorPathShape = PathBaseSchema.omit({
  type: true,
  id: true,
  kind: true,
  kindOptions: true,
  ribbon: true,
  children: true,
}).shape;

/** Connector 的 JSON 安全规范模式 */
export const ConnectorSchema = z
  .strictObject({
    namespace: z.literal(NOTATION_NAMESPACE).describe('Notation element namespace.'),
    type: z.literal(NotationElementType.Connector).describe('Connector element discriminator.'),
    id: NonBlankStringSchema.describe('Stable authored Connector identity.'),
    role: NonBlankStringSchema.optional().describe('Open authored Connector role.'),
    ...ConnectorPathShape,
    children: PathBaseSchema.shape.children.unwrap().describe('Canonical Core Step sequence.'),
    marks: PathBaseSchema.shape.marks
      .default([{ pos: 1, mark: { kind: 'arrow' } }])
      .describe('Core Path marks; omission adds one terminal arrow while an explicit array replaces the default.'),
  })
  .describe('Canonical JSON-safe Notation Connector lowered directly to a Core stroke Path.');
