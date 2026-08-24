import { boolean } from 'zod';

/** Inspect 选项中标签开关的稀疏输入 schema */
export const InspectionLabelsInputSchema = boolean().optional().describe('Whether Inspector labels are visible.');

/** Inspect 选项中标签开关的 canonical schema */
export const InspectionLabelsSchema = boolean().default(false).describe('Whether Inspector labels are visible.');
