import { PlotFacetOptionsSchema } from '@retikz/plot';
import type { infer as ZodInfer } from 'zod';
import { strictObject } from 'zod';

import {
  ChartPositionScaleBindingSchema,
  ChartPartitionEncodingSchema,
  createChartPositionEncodingSchema,
  refineChartFacetEncodings,
} from '../../_chart/schemas';
import { PointColorEncodingSchema } from '../shared';

/** Ranged Dot category 字段映射 */
export const RangedDotCategoryEncodingSchema = createChartPositionEncodingSchema('y', 'Ranged Dot');

/** Ranged Dot start 字段映射 */
export const RangedDotStartEncodingSchema = createChartPositionEncodingSchema('x', 'Ranged Dot');

/** Ranged Dot end 字段映射 */
export const RangedDotEndEncodingSchema = createChartPositionEncodingSchema('x', 'Ranged Dot');

type RangedDotPositionEncoding = ZodInfer<typeof RangedDotStartEncodingSchema>;

/** 读取 Ranged Dot 位置映射显式声明或引用的 scale 名称 */
const authoredScaleNameOf = (mapping: RangedDotPositionEncoding): string | undefined => {
  if (typeof mapping === 'string') return undefined;

  const parsed = ChartPositionScaleBindingSchema.safeParse(mapping.scale);
  if (!parsed.success) return undefined;

  return 'reference' in parsed.data ? parsed.data.reference : parsed.data.operation.name;
};

/** Ranged Dot 共享颜色字段映射 */
export const RangedDotColorEncodingSchema = PointColorEncodingSchema.describe('Ranged Dot shared color field mapping');

/** Ranged Dot Chart 精确字段映射计划 */
export const RangedDotChartEncodingsSchema = strictObject({
  category: RangedDotCategoryEncodingSchema,
  start: RangedDotStartEncodingSchema,
  end: RangedDotEndEncodingSchema,
  color: RangedDotColorEncodingSchema.optional(),
  row: ChartPartitionEncodingSchema.optional(),
  column: ChartPartitionEncodingSchema.optional(),
  facet: PlotFacetOptionsSchema.optional(),
})
  .superRefine((encodings, context) => {
    refineChartFacetEncodings({ ...encodings, x: encodings.start, y: encodings.category }, context, 'Ranged Dot');
    const startScale = authoredScaleNameOf(encodings.start);
    const endScale = authoredScaleNameOf(encodings.end);
    if (startScale !== undefined && endScale !== undefined && startScale !== endScale) {
      context.addIssue({
        code: 'custom',
        path: ['end', 'scale'],
        message: 'Ranged Dot start and end must use the same x scale',
      });
    }
  })
  .describe('Ranged Dot Chart exact field mapping plan');
