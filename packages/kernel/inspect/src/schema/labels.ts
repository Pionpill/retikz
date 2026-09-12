import { boolean } from 'zod';

export const InspectionLabelsSchema = boolean().default(false).describe('Whether Inspector labels are visible.');
