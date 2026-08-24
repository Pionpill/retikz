import { boolean, strictObject } from 'zod';

import { BaseLayoutInspectOptionsInputSchema, resolveBaseLayoutInspectOptions } from '../shared';

/** Overlay 布局专属的稀疏输入字段 */
const OverlayLayoutInspectFamilyOptionsInputSchema = strictObject({
  placements: boolean().optional().describe('Whether to draw OverlayLayout placement relations.'),
  anchors: boolean().optional().describe('Whether to draw positioned item anchors.'),
  stacking: boolean().optional().describe('Whether to label stacking order.'),
});

/** Overlay 布局检查器的稀疏输入结构 */
export const OverlayLayoutInspectOptionsInputSchema = BaseLayoutInspectOptionsInputSchema.safeExtend(
  OverlayLayoutInspectFamilyOptionsInputSchema.shape,
).describe('Sparse shared and OverlayLayout-specific inspection options.');

/** Overlay 布局检查器的标准选项结构 */
export const OverlayLayoutInspectOptionsSchema = OverlayLayoutInspectOptionsInputSchema.transform(value =>
  Object.freeze({
    ...resolveBaseLayoutInspectOptions(value),
    placements: value.placements ?? true,
    anchors: value.anchors ?? true,
    stacking: value.stacking ?? false,
  }),
).describe('Canonical shared and OverlayLayout-specific inspection options.');
