import { boolean, strictObject } from 'zod';

/** 内置 stroke Path Inspector 选项及默认值 */
export const PathInspectOptionsSchema = strictObject({
  controlPoints: boolean().default(true).describe('Whether control handles and points are visible.'),
  vertices: boolean().default(false).describe('Whether valid path vertices are visible.'),
  arcGeometry: boolean().default(true).describe('Whether arc centers, endpoints, and radii are visible.'),
  ellipseAxes: boolean().default(false).describe('Whether ellipse axes are visible, independently of arcGeometry.'),
  labels: boolean()
    .default(false)
    .describe(
      'Whether labels for selected geometry are visible; Bézier control-point labels can also be shown separately.',
    ),
}).describe('Stroke Path Inspector options; defaults apply after authored options are merged.');
