import { NormalizedFractionSchema, createOpenStringSchema, NonBlankStringSchema } from '@retikz/foundation';
import { object, enum as zodEnum, union, number, tuple } from 'zod';
import type { infer as ZodInfer } from 'zod';

import { Side, CenterAnchor, Anchor } from '../../shared';
import { BoundarySchema } from '../node/boundary';

/** 校验真实形状边界上按边及比例指定的锚点 */
export const BoundaryAnchorRefSchema = object({
  side: zodEnum(Side),
  fraction: NormalizedFractionSchema.describe(
    'Proportion along the edge; top/bottom run left to right, right/left run top to bottom.',
  ),
}).describe('Point on a shape boundary edge.');

/** 校验节点提供的自定义锚点名称 */
const NamedAnchorRefSchema = createOpenStringSchema({ ...CenterAnchor, ...Anchor });

/** 校验命名锚点、角度或边界比例点形式的锚点引用 */
export const AnchorRefSchema = union([
  NamedAnchorRefSchema.describe(
    'Named anchor: canonical anchor or shape-specific anchor. Unknown names fail at compile time.',
  ),
  number().describe('Angle anchor in degrees (boundary point in that direction)'),
  BoundaryAnchorRefSchema,
]);

/** 校验对节点、坐标或已解析作用域的标识引用及可选锚点和世界坐标偏移 */
export const NodeTargetSchema = object({
  id: NonBlankStringSchema.describe('Referenced Node, Coordinate, or resolved Scope id.'),
  anchor: AnchorRefSchema.optional().describe('The consuming position or path determines the anchor when omitted.'),
  offset: tuple([number(), number()]).optional().describe('World-space offset applied after resolving the anchor.'),
  boundary: BoundarySchema.optional().describe(
    'Per-endpoint override of the target node connection surface. Used for auto-clipped endpoints and standard direction or angle anchors.',
  ),
}).describe('Direct references to resolved targets use an object with id, not a bare id string.');

/** anchor 引用：命名 anchor / 角度 / 边上比例点 */
export type IRAnchorRef = ZodInfer<typeof AnchorRefSchema>;

/** Node / Coordinate / 已解析 Scope 引用对象：`{ id, anchor?, offset?, boundary? }` */
export type IRNodeTarget = ZodInfer<typeof NodeTargetSchema>;
