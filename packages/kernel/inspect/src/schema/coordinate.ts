import { boolean, strictObject } from 'zod';

/** 内置 Coordinate Inspector 选项及默认值 */
export const CoordinateInspectOptionsSchema = strictObject({
  labels: boolean().default(false).describe('Whether Coordinate labels are visible.'),
}).describe('Coordinate Inspector options; defaults apply after authored options are merged.');
