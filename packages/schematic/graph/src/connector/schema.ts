import { PathBaseSchema } from '@retikz/core';
import { NonBlankStringSchema } from '@retikz/foundation';
import { z } from 'zod';

import { GRAPH_NAMESPACE, GraphElementType } from '../shared';
import { GraphConnectorRole } from './constants';

const GraphConnectorPathShape = PathBaseSchema.omit({
  type: true,
  id: true,
  kind: true,
  kindOptions: true,
  ribbon: true,
  children: true,
}).shape;

/** GraphConnector 的 JSON 安全规范模式 */
export const GraphConnectorSchema = z
  .strictObject({
    namespace: z.literal(GRAPH_NAMESPACE).describe('Graph element namespace.'),
    type: z.literal(GraphElementType.GraphConnector).describe('GraphConnector element discriminator.'),
    id: NonBlankStringSchema.describe('Stable authored GraphConnector identity.'),
    role: z.enum(GraphConnectorRole).describe('Closed GraphConnector role describing the relation semantic.'),
    ...GraphConnectorPathShape,
    children: PathBaseSchema.shape.children.unwrap().describe('Canonical Core Step sequence.'),
    marks: PathBaseSchema.shape.marks
      .default([{ pos: 1, mark: { kind: 'arrow' } }])
      .describe('Core Path marks; omission adds one terminal arrow while an explicit array replaces the default.'),
  })
  .describe('Canonical JSON-safe GraphConnector lowered directly to a Core stroke Path.');
