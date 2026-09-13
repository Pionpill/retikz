import { boolean, strictObject } from 'zod';

/** 内置 Node Inspector 选项及默认值 */
export const NodeInspectOptionsSchema = strictObject({
  outline: boolean().default(true).describe('Whether the exact Shape outline is visible.'),
  boundary: boolean().default(true).describe('Whether the resolved Boundary outline is visible.'),
  box: boolean().default(true).describe('Whether the rotated Node outer box is visible.'),
  bounds: boolean().default(true).describe('Whether the final Scene-space axis-aligned bounding box is visible.'),
  content: boolean().default(true).describe('Whether the settled content box is visible.'),
  baselines: boolean().default(true).describe('Whether settled physical text baselines are visible.'),
  keyPoints: boolean().default(true).describe('Whether Shape provider key points are visible.'),
  labels: boolean().default(true).describe('Whether Node geometry labels are visible.'),
}).describe('Node Inspector options; defaults apply after authored options are merged.');
