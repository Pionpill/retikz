import { boolean, strictObject } from 'zod';

/** 最终 Scene 分组坐标系的检查选项 */
export const GroupInspectOptionsSchema = strictObject({
  origin: boolean().default(true).describe('Show the group origin.'),
  axes: boolean().default(false).describe('Show positive local axes.'),
  labels: boolean().default(false).describe('Show the Scene group path.'),
});
