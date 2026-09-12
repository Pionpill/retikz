import { boolean, strictObject } from 'zod';

import { BaseLayoutInspectOptionsSchema } from '../shared';

/** Flex 布局专属的选项字段及默认值 */
const FlexLayoutInspectFamilyOptionsSchema = strictObject({
  lines: boolean().default(true).describe('Whether to draw FlexLayout line regions.'),
  gaps: boolean().default(true).describe('Whether to shade authored FlexLayout gaps.'),
  distributedSpace: boolean().default(true).describe('Whether to draw distributed free-space perimeters.'),
});

/** Flex 布局检查器的选项结构及默认值 */
export const FlexLayoutInspectOptionsSchema = BaseLayoutInspectOptionsSchema.safeExtend(
  FlexLayoutInspectFamilyOptionsSchema.shape,
).describe('Shared and FlexLayout-specific inspection options.');
