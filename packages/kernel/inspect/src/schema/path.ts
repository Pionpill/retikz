import { boolean, strictObject } from 'zod';

/** 最终 Scene 路径的检查选项 */
export const PathInspectOptionsSchema = strictObject({
  controlPoints: boolean().default(true).describe('Show quadratic and cubic control handles.'),
  vertices: boolean().default(false).describe('Show final path vertices.'),
  labels: boolean().default(false).describe('Show final command labels.'),
});
