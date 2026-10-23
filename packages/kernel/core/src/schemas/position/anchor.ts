import { strictObject, literal } from 'zod';
import type { infer as ZodInfer } from 'zod';

import { NodeTargetSchema, AnchorRefSchema } from './target';

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

/**
 * Node 锚点对锚点定位
 * @description 当前 Node 完成自身布局后，整体平移，使 `selfAnchor` 与 `target` 解析出的全局点重合
 */
export type IRAnchorPosition = ZodInfer<typeof AnchorPositionSchema>;
