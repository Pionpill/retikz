import { literal, strictObject } from 'zod';

import { AnchorRefSchema, NodeTargetSchema } from '../node-target';

/** Node 锚点对锚点定位结构 */
export const AnchorPositionSchema = strictObject({
  kind: literal('anchor').describe('Discriminator for anchor-to-anchor node positioning.'),
  target: NodeTargetSchema.describe(
    'Already-laid-out Node, Coordinate, or resolved Scope target. An omitted target anchor means center in this context.',
  ),
  selfAnchor: AnchorRefSchema.optional().describe(
    'Anchor on the current node to align with the target point. Defaults to center.',
  ),
}).describe('Positions a Node by aligning one of its anchors with an already-laid-out target anchor.');
