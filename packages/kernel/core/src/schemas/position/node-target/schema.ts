import { createOpenStringSchema, NonBlankStringSchema, NormalizedFractionSchema } from '@retikz/foundation';
import { enum as zodEnum, number, object, tuple, union } from 'zod';

import { Anchor, CenterAnchor, Side } from '../../../shared';
import { BoundarySchema } from '../../boundary';
import { AngleDegreesSchema } from '../../scalar';

/** 校验真实形状边界上按边及比例指定的锚点 */
export const BoundaryAnchorRefSchema = object({
  side: zodEnum(Side).describe('Canonical edge of the shape boundary.'),
  fraction: NormalizedFractionSchema.describe(
    'Proportion along the edge; top/bottom run left to right, right/left run top to bottom.',
  ),
}).describe('Proportional point on the real shape boundary edge');

const NamedAnchorRefSchema = createOpenStringSchema({ ...CenterAnchor, ...Anchor });

/** 校验命名锚点、角度或边界比例点形式的锚点引用 */
export const AnchorRefSchema = union([
  NamedAnchorRefSchema.describe(
    'Named anchor: canonical anchor or shape-specific anchor. Unknown names fail at compile time.',
  ),
  AngleDegreesSchema.describe('Angle anchor in degrees (boundary point in that direction)'),
  BoundaryAnchorRefSchema,
]).describe(
  'Anchor reference: named anchor, angle in degrees, or proportional point { side, fraction } on the boundary',
);

/** 校验对节点、坐标或已解析作用域的标识引用及可选锚点和世界坐标偏移 */
export const NodeTargetSchema = object({
  id: NonBlankStringSchema.describe('Referenced Node, Coordinate, or resolved Scope id.'),
  anchor: AnchorRefSchema.optional().describe(
    'Optional target anchor. The meaning of omission is defined by the consuming position or path context.',
  ),
  offset: tuple([number(), number()])
    .optional()
    .describe('Optional world-space 2D offset added after the anchor/edge point is resolved'),
  boundary: BoundarySchema.optional().describe(
    'Per-endpoint override of the target node connection surface. Used for auto-clipped endpoints and standard direction or angle anchors.',
  ),
}).describe('Reference to a Node, Coordinate, or resolved Scope by id, with optional anchor and world-space offset');
