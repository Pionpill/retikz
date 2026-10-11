import type { IRStep } from '@retikz/core';
import { AngleDegreesSchema, BoundaryLabelSchema, PolarPositionSchema, StepSchema, Vector2Schema } from '@retikz/core';
import {
  createOpenStringSchema,
  JsonObjectSchema,
  NonNegativeNumberSchema,
  NormalizedFractionSchema,
  PositiveNumberSchema,
} from '@retikz/foundation';
import type { ZodType } from 'zod';
import { array, discriminatedUnion, enum as zodEnum, literal, number, strictObject, union } from 'zod';

import {
  RibbonAlignment,
  RibbonArcCapSweep,
  BuiltinRibbonCap,
  RibbonTaperInterpolation,
  RibbonWidthInterpolation,
  BuiltinRibbonWidthProfile,
} from './constants';
import type { IRRibbonDirection } from './types';

/** Extension 内置 Ribbon profile 与自定义注册名共享的开放名称 schema */
export const RibbonWidthProfileNameSchema = createOpenStringSchema(BuiltinRibbonWidthProfile).describe(
  'Ribbon width profile name assembled from Extension profile definitions and provider contributions.',
);

/** 圆弧端帽在端面局部坐标系中的参数 */
export const RibbonArcCapSchema = strictObject({
  center: Vector2Schema.describe('Circle center in the cap frame: outward x and section-axis y.'),
  radius: PositiveNumberSchema.describe('Circle radius in user units.'),
  sweep: zodEnum(RibbonArcCapSweep).default('short').describe('Short or long circular sweep.'),
}).describe('Circular cap parameters in the endpoint frame.');

/** 内置与自定义端帽共用的持久化引用 */
export const RibbonCapSchema = strictObject({
  name: createOpenStringSchema(BuiltinRibbonCap).describe('Registered ribbon cap name.'),
  params: JsonObjectSchema.optional().describe('JSON-safe cap parameters.'),
}).describe('Reference to a registered ribbon cap.');

/** 校验中心线上归一化位置与该处非负宽度组成的控制点 */
export const RibbonWidthStopSchema = strictObject({
  offset: NormalizedFractionSchema.describe('Normalized position along the centerline.'),
  value: NonNegativeNumberSchema.describe('Ribbon width in user units at this stop.'),
}).describe('One stop in a sampled ribbon width curve.');

/** 校验至少两个宽度控制点及其插值方式，后续解析按位置排序 */
export const StopsRibbonWidthSchema = strictObject({
  kind: literal('stops').describe('Discriminator for stop-based width rules.'),
  stops: array(RibbonWidthStopSchema)
    .min(2)
    .describe('Width stops; compile sorts them by offset before interpolation.'),
  interpolation: zodEnum(RibbonWidthInterpolation)
    .default('linear')
    .describe('Interpolation curve between adjacent stops.'),
}).describe('A multi-stop ribbon width rule.');

/** 校验已注册宽度函数的名称与可序列化参数 */
export const ProfileRibbonWidthSchema = strictObject({
  kind: literal('profile').describe('Discriminator for registered width profiles.'),
  name: RibbonWidthProfileNameSchema,
  params: JsonObjectSchema.optional().describe('JSON-safe profile parameters.'),
}).describe('A registered width profile reference.');

/** 固定宽度 */
export const FixedRibbonWidthSchema = strictObject({
  kind: literal('fixed').describe('Fixed width discriminator.'),
  value: NonNegativeNumberSchema.describe('Constant ribbon width.'),
});

/** 首尾宽度渐变 */
export const TaperRibbonWidthSchema = strictObject({
  kind: literal('taper').describe('Endpoint taper discriminator.'),
  start: NonNegativeNumberSchema.describe('Width at the centerline start.'),
  end: NonNegativeNumberSchema.describe('Width at the centerline end.'),
  interpolation: zodEnum(RibbonTaperInterpolation).default('linear').describe('Width interpolation along arc length.'),
});

/** 四种互斥宽度策略 */
export const RibbonWidthSchema = discriminatedUnion('kind', [
  FixedRibbonWidthSchema,
  TaperRibbonWidthSchema,
  StopsRibbonWidthSchema,
  ProfileRibbonWidthSchema,
]);

/** Core 坐标 Schema 接受 unknown；这里将作者输入限定为公开方向类型，运行时仍复用其完整校验 */
export const RibbonDirectionSchema = union([
  AngleDegreesSchema.describe('Direction angle in degrees, where 0 points to the positive x axis.'),
  Vector2Schema.refine(([x, y]) => x !== 0 || y !== 0, {
    message: 'Ribbon direction vector must not be zero length.',
  }).describe(
    'Direction vector [x, y]; Position tuples share the same shape and are treated as vectors from the origin.',
  ),
  PolarPositionSchema.describe('PolarPosition sugar converted to a vector before normalization.'),
]).describe('Endpoint section axis as an angle, Vector2/Position tuple, or PolarPosition sugar.') as ZodType<
  IRRibbonDirection,
  IRRibbonDirection
>;

/** 校验带状路径端面的标签、轴向和端帽；自动轴向沿中心线法向 */
export const RibbonEndpointSchema = strictObject({
  label: BoundaryLabelSchema.optional().describe('Label attached to the final endpoint cap boundary.'),
  direction: union([literal('auto'), RibbonDirectionSchema])
    .default('auto')
    .describe('Endpoint section axis; auto follows the centerline normal. Does not change the centerline tangent.'),
  cap: RibbonCapSchema.default({ name: 'butt' }).describe(
    'Cap style used at this endpoint of the emitted ribbon polygon.',
  ),
}).describe('Endpoint-local ribbon properties such as section direction and cap.');

/** 校验固定横截面采样策略，采样数限定为 2 到 512 的整数 */
export const RibbonFixedSamplingSchema = strictObject({
  kind: literal('fixed').describe('Use a fixed number of cross-section samples.'),
  samples: number()
    .int()
    .min(2)
    .max(512)
    .describe('Number of cross-section samples used to approximate the ribbon polygon.'),
}).describe('Fixed ribbon sampling strategy.');

/** 校验按路径长度与目标段长估算采样数的策略，并限制最大采样数 */
export const RibbonAdaptiveSamplingSchema = strictObject({
  kind: literal('adaptive').describe('Choose a sample count from path length and tolerance.'),
  tolerance: PositiveNumberSchema.describe('Approximate target segment length in user units.'),
  maxSamples: number().int().min(2).max(512).default(512).describe('Optional upper bound for generated samples.'),
}).describe('Length-aware adaptive ribbon sampling strategy.');

/** 校验固定或自适应的基础采样策略，几何特征点另行保留 */
export const RibbonSamplingSchema = discriminatedUnion('kind', [
  RibbonFixedSamplingSchema,
  RibbonAdaptiveSamplingSchema,
]).describe(
  'Ribbon boundary sampling strategy; additional feature points are preserved independently of the base sample count.',
);

/** 中心线模式的独立输入契约 */
export const CenterlineRibbonPathOptionsSchema = strictObject({
  mode: literal('centerline').optional().default('centerline').describe('Build an outline from an open centerline.'),
  width: RibbonWidthSchema.describe('Required discriminated width strategy.'),
  start: RibbonEndpointSchema.prefault({}).describe('Start section and cap.'),
  end: RibbonEndpointSchema.prefault({}).describe('End section and cap.'),
  sampling: RibbonSamplingSchema.default({ kind: 'fixed', samples: 64 }).describe(
    'Base sampling strategy; feature points are preserved separately.',
  ),
  align: zodEnum(RibbonAlignment).default('center').describe('Width distribution relative to the centerline.'),
});

/** 复用 Core Step 校验，将坐标预处理的 unknown 输入收窄到公开 JSON Step 类型 */
const ribbonBoundaryStepSchema = StepSchema as ZodType<IRStep, IRStep>;

/** 作者直接提供上下边界的独立输入契约 */
export const BoundaryRibbonPathOptionsSchema = strictObject({
  mode: literal('boundary').describe('Preserve authored upper and lower curves.'),
  upper: array(ribbonBoundaryStepSchema).min(2).describe('Open upper boundary steps.'),
  lower: array(ribbonBoundaryStepSchema).min(2).describe('Open lower boundary steps.'),
});

/** 由 mode 区分的流带构造契约 */
export const RibbonPathOptionsSchema = discriminatedUnion('mode', [
  CenterlineRibbonPathOptionsSchema,
  BoundaryRibbonPathOptionsSchema,
]);
