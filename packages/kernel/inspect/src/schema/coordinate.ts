import { strictObject } from 'zod';

import { InspectionLabelsSchema } from './labels';

/** 内置 Coordinate Inspector 选项及默认值 */
export const CoordinateInspectOptionsSchema = strictObject({
  labels: InspectionLabelsSchema.describe('Whether Coordinate labels are visible.'),
}).describe('Coordinate Inspector options; defaults apply after authored options are merged.');
