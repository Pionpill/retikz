import { boolean, strictObject } from 'zod';

import { BaseLayoutInspectOptionsSchema } from '../shared';

/** Grid 布局专属的选项字段及默认值 */
const GridLayoutInspectFamilyOptionsSchema = strictObject({
  tracks: boolean().default(true).describe('Whether to draw GridLayout track boundaries.'),
  cells: boolean().default(false).describe('Whether to draw individual GridLayout cell bounds.'),
  gaps: boolean().default(true).describe('Whether to shade authored GridLayout gaps.'),
  distributedSpace: boolean().default(true).describe('Whether to draw distributed free-space perimeters.'),
  spans: boolean().default(true).describe('Whether to mark multi-track spans.'),
});

/** Grid 布局检查器的选项结构及默认值 */
export const GridLayoutInspectOptionsSchema = BaseLayoutInspectOptionsSchema.safeExtend(
  GridLayoutInspectFamilyOptionsSchema.shape,
).describe('Shared and GridLayout-specific inspection options.');
