import type { infer as ZodInfer } from 'zod';

import { PlotFacetOptionsSchema } from '@retikz/plot';
import { strictObject } from 'zod';

import {
  createPointPositionEncodingSchema,
  PointColorEncodingSchema,
  PointPartitionEncodingSchema,
  PointPositionScaleBindingSchema,
  refinePointFacetEncodings,
} from '../shared';

/** Ranged Dot category 字段映射 */
export const RangedDotCategoryEncodingSchema = createPointPositionEncodingSchema('y', 'Ranged Dot');

/** Ranged Dot start 字段映射 */
export const RangedDotStartEncodingSchema = createPointPositionEncodingSchema('x', 'Ranged Dot');

/** Ranged Dot end 字段映射 */
export const RangedDotEndEncodingSchema = createPointPositionEncodingSchema('x', 'Ranged Dot');

type RangedDotPositionEncoding = ZodInfer<typeof RangedDotStartEncodingSchema>;

/** 读取 Ranged Dot 位置映射显式声明或引用的 scale 名称 */
const authoredScaleNameOf = (mapping: RangedDotPositionEncoding): string | undefined => {
  if (typeof mapping === 'string') return undefined;
  const parsed = PointPositionScaleBindingSchema.safeParse(mapping.scale);
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
  row: PointPartitionEncodingSchema.optional(),
  column: PointPartitionEncodingSchema.optional(),
  facet: PlotFacetOptionsSchema.optional(),
})
  .superRefine((encodings, context) => {
    refinePointFacetEncodings({ ...encodings, x: encodings.start, y: encodings.category }, context, 'Ranged Dot');
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
