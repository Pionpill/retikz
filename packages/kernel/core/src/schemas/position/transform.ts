import { object, literal, number, strictObject, discriminatedUnion } from 'zod';
import type { infer as ZodInfer } from 'zod';

import { ScopeSelfPointSchema } from '../scope/self-point';
import { AtPositionSchema } from './at';
import { BetweenPositionSchema } from './between';
import { OffsetPositionSchema } from './offset';
import { PolarPositionSchema } from './polar';

/** 校验水平和竖直平移量 */
const TranslateSchema = object({
  kind: literal('translate'),
  x: number(),
  y: number(),
}).describe('Cartesian offsets in user units; positive y points down.');

/** 校验按角度和距离指定的平移 */
const PolarTranslateSchema = object({
  kind: literal('polar-translate'),
  ...PolarPositionSchema.shape,
});

/** 校验相对已有节点的方向平移 */
const AtTranslateSchema = object({
  kind: literal('at-translate'),
  ...AtPositionSchema.shape,
});

/** 校验相对参考位置的坐标偏移 */
const OffsetTranslateSchema = object({
  kind: literal('offset-translate'),
  ...OffsetPositionSchema.shape,
  // 平移允许省略偏移量，此时直接移动到参考点
  offset: OffsetPositionSchema.shape.offset
    .optional()
    .describe('Offset in user units. Omit to translate to the reference itself.'),
});

/** 校验按两点之间的比例指定的平移 */
const BetweenTranslateSchema = object({
  kind: literal('between-translate'),
  ...BetweenPositionSchema.shape,
});

/** 校验旋转角度与可选支点 */
const RotateSchema = strictObject({
  kind: literal('rotate'),
  degrees: number().describe('Degrees clockwise in screen coordinates.'),
  pivot: ScopeSelfPointSchema.optional().describe(
    'Pivot on the intrinsic Scope envelope or an explicit local point. Omitted fields use origin.',
  ),
});

/** 校验缩放倍率与可选支点 */
const ScaleSchema = strictObject({
  kind: literal('scale'),
  x: number(),
  y: number().optional().describe('Defaults to x for uniform scaling.'),
  pivot: ScopeSelfPointSchema.optional().describe(
    'Pivot on the intrinsic Scope envelope or an explicit local point. Omitted fields use origin.',
  ),
});

/** 校验按 kind 区分的平移、旋转与缩放；引用式平移在编译时解析 */
export const TransformSchema = discriminatedUnion('kind', [
  TranslateSchema,
  PolarTranslateSchema,
  AtTranslateSchema,
  OffsetTranslateSchema,
  BetweenTranslateSchema,
  RotateSchema,
  ScaleSchema,
]).describe('Reference-based translations resolve at compile time.');

/** IR 层 transform 类型——7 变体 discriminated union（5 translate + rotate + scale） */
export type IRTransform = ZodInfer<typeof TransformSchema>;

/** 笛卡尔 translate 子分支 */
export type IRTranslateTransform = Extract<IRTransform, { kind: 'translate' }>;

/** 极坐标 translate 子分支 */
export type IRPolarTranslateTransform = Extract<IRTransform, { kind: 'polar-translate' }>;

/** 相对方向 translate 子分支 */
export type IRAtTranslateTransform = Extract<IRTransform, { kind: 'at-translate' }>;

/** 偏移 translate 子分支 */
export type IROffsetTranslateTransform = Extract<IRTransform, { kind: 'offset-translate' }>;

/** 两端点比例 translate 子分支 */
export type IRBetweenTranslateTransform = Extract<IRTransform, { kind: 'between-translate' }>;
