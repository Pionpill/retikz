import { boolean, strictObject } from 'zod';

import { BaseLayoutInspectOptionsSchema } from '../shared';

/** Overlay 布局专属的稀疏输入字段 */
const OverlayLayoutInspectFamilyOptionsSchema = strictObject({
  placements: boolean().default(true).describe('Whether to draw OverlayLayout placement relations.'),
  anchors: boolean().default(true).describe('Whether to draw positioned item anchors.'),
  stacking: boolean().default(false).describe('Whether to label stacking order.'),
});

/** Overlay 布局检查器的稀疏输入结构 */
export const OverlayLayoutInspectOptionsSchema = BaseLayoutInspectOptionsSchema.safeExtend(
  OverlayLayoutInspectFamilyOptionsSchema.shape,
).describe('Sparse shared and OverlayLayout-specific inspection options.');
