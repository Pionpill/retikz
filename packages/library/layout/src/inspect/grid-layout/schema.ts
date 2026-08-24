import { boolean, strictObject } from 'zod';

import { BaseLayoutInspectOptionsInputSchema, resolveBaseLayoutInspectOptions } from '../shared';

/** Grid 布局专属的稀疏输入字段 */
const GridLayoutInspectFamilyOptionsInputSchema = strictObject({
  tracks: boolean().optional().describe('Whether to draw GridLayout track boundaries.'),
  cells: boolean().optional().describe('Whether to draw individual GridLayout cell bounds.'),
  gaps: boolean().optional().describe('Whether to shade authored GridLayout gaps.'),
  distributedSpace: boolean().optional().describe('Whether to draw distributed free-space perimeters.'),
  spans: boolean().optional().describe('Whether to mark multi-track spans.'),
});

/** Grid 布局检查器的稀疏输入结构 */
export const GridLayoutInspectOptionsInputSchema = BaseLayoutInspectOptionsInputSchema.safeExtend(
  GridLayoutInspectFamilyOptionsInputSchema.shape,
).describe('Sparse shared and GridLayout-specific inspection options.');

/** Grid 布局检查器的标准选项结构 */
export const GridLayoutInspectOptionsSchema = GridLayoutInspectOptionsInputSchema.transform(value =>
  Object.freeze({
    ...resolveBaseLayoutInspectOptions(value),
    tracks: value.tracks ?? true,
    cells: value.cells ?? false,
    gaps: value.gaps ?? true,
    distributedSpace: value.distributedSpace ?? true,
    spans: value.spans ?? true,
  }),
).describe('Canonical shared and GridLayout-specific inspection options.');
