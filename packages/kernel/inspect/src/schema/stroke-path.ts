import { boolean, strictObject } from 'zod';

import { InspectionLabelsSchema } from './labels';

/** 内置 stroke Path Inspector 选项及默认值 */
export const StrokePathInspectOptionsSchema = strictObject({
  controlPoints: boolean().default(true).describe('Whether control handles and points are visible.'),
  labels: InspectionLabelsSchema.describe('Whether control point labels are visible.'),
}).describe('Stroke Path Inspector options; defaults apply after authored options are merged.');
