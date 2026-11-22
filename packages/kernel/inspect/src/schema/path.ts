import { boolean, strictObject } from 'zod';

/** 最终 Scene 路径的检查选项 */
export const PathInspectOptionsSchema = strictObject({
  controlPoints: boolean().default(true).describe('Quadratic and cubic Bézier handles.'),
  vertices: boolean().default(false),
  labels: boolean()
    .default(false)
    .describe('Label control points by command index even when handles are hidden; vertex labels require vertices.'),
});
