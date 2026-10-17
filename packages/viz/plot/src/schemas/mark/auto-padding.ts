import { BoxSpacingSchema } from '@retikz/core';
import { NonNegativeNumberSchema } from '@retikz/foundation';
import { enum as zodEnum, literal, strictObject, union } from 'zod';
import type { infer as ZodInfer } from 'zod';

const AutoPaddingKindSchema = zodEnum(['max-radius', 'point-aware']);

/** 点及关系端点的自动留白策略；false 关闭当前图元的隐式贡献 */
export const PointAutoPaddingSchema = union([
  literal(false),
  AutoPaddingKindSchema,
  strictObject({
    kind: AutoPaddingKindSchema.describe('Automatic padding strategy'),
    clearance: union([NonNegativeNumberSchema, BoxSpacingSchema])
      .optional()
      .describe('Nonnegative edge clearance in drawing units; omitted means zero'),
  }),
]).describe('Automatic point padding strategy; false disables implicit contributions from this mark');

export type IRPlotPointAutoPadding = ZodInfer<typeof PointAutoPaddingSchema>;
