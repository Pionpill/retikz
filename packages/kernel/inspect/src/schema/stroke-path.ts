import { boolean, strictObject } from 'zod';

import { InspectionLabelsInputSchema, InspectionLabelsSchema } from './labels';

/** 内置 stroke Path Inspector sparse options schema */
export const StrokePathInspectOptionsInputSchema = strictObject({
  controlPoints: boolean().optional().describe('Whether control handles and points are visible.'),
  labels: InspectionLabelsInputSchema.describe('Whether control point labels are visible.'),
}).describe('Sparse stroke Path Inspector options.');

/** 内置 stroke Path Inspector canonical options schema */
export const StrokePathInspectOptionsSchema = strictObject({
  controlPoints: boolean().default(true).describe('Whether control handles and points are visible.'),
  labels: InspectionLabelsSchema.describe('Whether control point labels are visible.'),
}).describe('Canonical stroke Path Inspector options.');
