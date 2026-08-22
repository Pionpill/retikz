import { z } from 'zod';

/** Inspect 选项中标签开关的稀疏输入 schema */
export const InspectionLabelsInputSchema = z.boolean().optional().describe('Whether Inspector labels are visible.');

/** Inspect 选项中标签开关的 canonical schema */
export const InspectionLabelsSchema = z.boolean().default(false).describe('Whether Inspector labels are visible.');
