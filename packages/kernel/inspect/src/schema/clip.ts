import { boolean, strictObject } from 'zod';

import { InspectionLabelsSchema } from './labels';

/** 内置 Clip Inspector 选项及默认值 */
export const ClipInspectOptionsSchema = strictObject({
  outline: boolean().default(true).describe('Whether the complete lowered Clip outline is visible.'),
  labels: InspectionLabelsSchema.describe('Whether Clip application labels are visible.'),
}).describe('Clip Inspector options; defaults apply after authored options are merged.');
