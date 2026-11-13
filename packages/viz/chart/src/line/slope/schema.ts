import { StrokeWidthSchema } from '@retikz/core';
import { NonBlankStringSchema } from '@retikz/foundation';
import { MarkNodeLabelSchema, PathPropertiesSchema, PointPropertiesSchema } from '@retikz/plot';
import { array, boolean, literal, strictObject, tuple, union } from 'zod';
import type { infer as ZodInfer } from 'zod';

import { ChartRecipeGuidesSchema, createChartSourceSchema } from '../../_chart/schemas';
import { LineChartFamily, SlopeChartType } from '../constants';
import { SlopeChartEncodingsSchema } from './encoding-schema';

/** 坡度图端点的常量样式 */
export const SlopePointPropertiesSchema = PointPropertiesSchema.pick({
  size: true,
  shape: true,
  fill: true,
  stroke: true,
  strokeWidth: true,
  opacity: true,
});

/** 两阶段间的直线描边；不开放曲线、闭合和缺值桥接 */
export const SlopePathPropertiesSchema = PathPropertiesSchema.pick({
  stroke: true,
  strokeWidth: true,
  opacity: true,
  lineCap: true,
  lineJoin: true,
  dashPattern: true,
  shadow: true,
  blendMode: true,
}).extend({ strokeWidth: StrokeWidthSchema.default(2).optional() });

/** 单个实体标签的样式；内容固定来自 entity，复用节点标签布局契约 */
export const SlopeLabelPropertiesSchema = strictObject(MarkNodeLabelSchema.shape)
  .omit({ text: true })
  .superRefine((label, context) => {
    if (label.placement === 'inside' && label.pin) {
      context.addIssue({
        code: 'custom',
        path: ['pin'],
        message: 'Node label pin is only supported for outside placement.',
      });
    }
  });

/** 坡度图公开属性 */
export const SlopeChartPropertiesSchema = strictObject({
  stages: tuple([NonBlankStringSchema, NonBlankStringSchema])
    .refine(stages => stages[0] !== stages[1], {
      message: 'Slope stage names must be distinct',
    })
    .optional()
    .describe('Start and end stage names; omitted uses the mapped field names'),
  path: SlopePathPropertiesSchema.optional(),
  point: union([boolean(), SlopePointPropertiesSchema]).default(true).optional(),
  label: union([boolean(), SlopeLabelPropertiesSchema]).default(true).optional(),
});

/** 坡度图标记的稀疏样式；缺省保留继承而非提前默认化 */
const SlopeMarkPropertiesSchema = strictObject({
  path: SlopePathPropertiesSchema.extend({
    strokeWidth: SlopePathPropertiesSchema.shape.strokeWidth.unwrap().unwrap().optional(),
  }).optional(),
  point: union([boolean(), SlopePointPropertiesSchema]).optional(),
  label: union([boolean(), SlopeLabelPropertiesSchema]).optional(),
});

/** 坡度图标记允许直接覆盖两个数值字段 */
export const SlopeMarkEncodingsSchema = strictObject({
  start: NonBlankStringSchema.optional(),
  end: NonBlankStringSchema.optional(),
});

/** 一个坡度图语义组的作者声明 */
export const SlopeChartMarkSchema = strictObject({
  kind: literal(SlopeChartType),
  override: boolean().optional(),
  encodings: SlopeMarkEncodingsSchema.optional(),
  properties: SlopeMarkPropertiesSchema.optional(),
});

/** 坡度图精确配方 */
export const SlopeChartRecipeSchema = strictObject({
  chartType: literal(SlopeChartType),
  encodings: SlopeChartEncodingsSchema,
  properties: SlopeChartPropertiesSchema.optional(),
  guides: ChartRecipeGuidesSchema.optional(),
  marks: array(SlopeChartMarkSchema).optional(),
}).superRefine((recipe, context) => {
  const fieldOf = (mapping: typeof recipe.encodings.start): string =>
    typeof mapping === 'string' ? mapping : mapping.field;
  if (recipe.properties?.stages === undefined && fieldOf(recipe.encodings.start) === fieldOf(recipe.encodings.end)) {
    context.addIssue({
      code: 'custom',
      path: ['properties', 'stages'],
      message: 'Identical endpoint fields require distinct explicit stage names',
    });
  }
});

/** 坡度图 Source IR */
export const SlopeChartSchema = createChartSourceSchema(LineChartFamily, SlopeChartRecipeSchema).describe(
  'Slope Chart Source IR',
);

export type IRSlopeChart = ZodInfer<typeof SlopeChartSchema>;
export type IRSlopeChartEncodings = ZodInfer<typeof SlopeChartEncodingsSchema>;
export type IRSlopeChartProperties = ZodInfer<typeof SlopeChartPropertiesSchema>;
export type IRSlopePointProperties = ZodInfer<typeof SlopePointPropertiesSchema>;
export type IRSlopeLabelProperties = ZodInfer<typeof SlopeLabelPropertiesSchema>;
export type IRSlopeMark = ZodInfer<typeof SlopeChartMarkSchema>;
