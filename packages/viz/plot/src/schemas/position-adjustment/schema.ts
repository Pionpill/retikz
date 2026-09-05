import { JsonObjectSchema } from '@retikz/core';
import { NonBlankStringSchema, NonNegativeNumberSchema } from '@retikz/foundation';
import { array, literal, looseObject, number, strictObject, union } from 'zod';

import { BUILTIN_POSITION_ADJUSTMENT_KINDS, PlotPositionAdjustment } from './constants';

/** 离散刻度间距比例形式的 jitter 总宽 */
export const JitterRatioSpanSchema = strictObject({
  kind: literal('ratio'),
  value: number().min(0).max(1).describe('Fraction of the resolved discrete position scale step'),
}).describe('Jitter span expressed as a 0..1 fraction of the resolved discrete scale step');

/** jitter 总散布宽度：role 输出单位数值或离散 step 比例 */
export const JitterSpanSchema = union([NonNegativeNumberSchema, JitterRatioSpanSchema]).describe(
  'Total jitter span in mapped-role units or as a 0..1 ratio of discrete scale step',
);

const UniformRandomDistributionSchema = strictObject({
  kind: literal('uniform'),
}).describe('Uniform jitter distribution over the normalized -1..1 support');

const NormalRandomDistributionSchema = strictObject({
  kind: literal('normal'),
  sigma: number().positive().optional().describe('Standard deviation relative to half of the jitter span; default 0.5'),
}).describe('Zero-mean normal jitter distribution truncated to the normalized -1..1 support');

/** jitter 使用的内置随机分布契约 */
export const PlotRandomDistributionSchema = union([
  UniformRandomDistributionSchema,
  NormalRandomDistributionSchema,
]).describe('Built-in random distribution used to sample a bounded jitter offset');

/** 内置 role-space jitter operation */
export const JitterPositionAdjustmentSchema = strictObject({
  kind: literal(PlotPositionAdjustment.Jitter),
  role: NonBlankStringSchema.optional().describe(
    'Coordinate role to jitter; omit only when exactly one discrete role can be selected',
  ),
  span: JitterSpanSchema.optional().describe('Total jitter span; default is ratio 0.3'),
  distribution: PlotRandomDistributionSchema.optional().describe('Random distribution; default is uniform'),
  seed: number().optional().describe('Deterministic random seed; default 0'),
}).describe('Role-space deterministic jitter applied after position scale mapping and before coordinate projection');

/** 自定义 JSON-safe position adjustment operation */
export const CustomPositionAdjustmentSchema = looseObject({
  kind: NonBlankStringSchema.refine(kind => !BUILTIN_POSITION_ADJUSTMENT_KINDS.has(kind), {
    message: 'custom position adjustment kind must not collide with a built-in kind',
  }).describe('Custom adjustment discriminator resolved through LowerPlotsOptions.positionAdjustmentDefinitions'),
})
  .superRefine((operation, ctx) => {
    if (!JsonObjectSchema.safeParse(operation).success) {
      ctx.addIssue({
        code: 'custom',
        message: 'custom position adjustment must be a JSON-serializable object',
      });
    }
  })
  .describe('Custom JSON-safe position adjustment operation validated by a runtime definition');

/** 内置与自定义 position adjustment operation */
export const PositionAdjustmentOperationSchema = union([
  JitterPositionAdjustmentSchema,
  CustomPositionAdjustmentSchema,
]).describe('Position adjustment operation resolved by the shared runtime registry');

/** Mark 的有序 placement 配置 */
export const MarkPlacementSchema = strictObject({
  adjustments: array(PositionAdjustmentOperationSchema)
    .min(1)
    .describe('Ordered position adjustments; role-space operations run before screen-space operations'),
}).describe('Mark placement configuration between position encoding and mark geometry');
