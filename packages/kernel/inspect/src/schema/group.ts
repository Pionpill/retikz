import { boolean, strictObject } from 'zod';

/** 最终 Scene 分组坐标系的检查选项 */
export const GroupInspectOptionsSchema = strictObject({
  origin: boolean().default(true),
  axes: boolean().default(false).describe('Positive local axes.'),
  labels: boolean().default(false).describe('The group’s path in the Scene tree.'),
});
