import { boolean, strictObject } from 'zod';

import { InspectionLabelsSchema } from './labels';

/** 内置 Scope Inspector 选项及默认值 */
export const ScopeInspectOptionsSchema = strictObject({
  envelope: boolean().default(true).describe('Whether the intrinsic Scope envelope is visible.'),
  origin: boolean().default(true).describe('Whether the Scope local origin is visible.'),
  axes: boolean().default(false).describe('Whether the Scope local axes are visible.'),
  labels: InspectionLabelsSchema.describe('Whether Scope hierarchy labels are visible.'),
}).describe('Scope Inspector options; defaults apply after authored options are merged.');
