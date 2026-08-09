import { z } from 'zod';

import { BaseLayoutInspectOptionsInputSchema, resolveBaseLayoutInspectOptions } from '../shared';

/** Flex 布局专属的稀疏输入字段 */
const FlexLayoutInspectFamilyOptionsInputSchema = z.strictObject({
  lines: z.boolean().optional().describe('Whether to draw FlexLayout line regions.'),
  gaps: z.boolean().optional().describe('Whether to shade authored FlexLayout gaps.'),
  distributedSpace: z.boolean().optional().describe('Whether to draw distributed free-space perimeters.'),
});

/** Flex 布局检查器的稀疏输入结构 */
export const FlexLayoutInspectOptionsInputSchema = BaseLayoutInspectOptionsInputSchema.safeExtend(
  FlexLayoutInspectFamilyOptionsInputSchema.shape,
).describe('Sparse shared and FlexLayout-specific inspection options.');

/** Flex 布局检查器的标准选项结构 */
export const FlexLayoutInspectOptionsSchema = FlexLayoutInspectOptionsInputSchema.transform(value =>
  Object.freeze({
    ...resolveBaseLayoutInspectOptions(value),
    lines: value.lines ?? true,
    gaps: value.gaps ?? true,
    distributedSpace: value.distributedSpace ?? true,
  }),
).describe('Canonical shared and FlexLayout-specific inspection options.');
