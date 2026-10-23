import { discriminatedUnion, literal, number, object, strictObject } from 'zod';

import { AtPositionSchema, BetweenPositionSchema, OffsetPositionSchema, PolarPositionSchema } from '../position';
import { AngleDegreesSchema } from '../scalar';
import { ScopeSelfPointSchema } from '../scope/self-point';

/** 校验水平和竖直平移量 */
const TranslateSchema = object({
  kind: literal('translate').describe('Discriminator for Cartesian translate.'),
  x: number().describe('Cartesian x translation in user units.'),
  y: number().describe('Cartesian y translation in user units (screen y-down).'),
}).describe('Cartesian translate transform using user-unit x and y offsets.');

/** 校验按角度和距离指定的平移 */
const PolarTranslateSchema = object({
  kind: literal('polar-translate').describe('Discriminator for polar translate.'),
  ...PolarPositionSchema.shape,
}).describe('Polar translate transform lowered to Cartesian translate at compile time.');

/** 校验相对已有节点的方向平移 */
const AtTranslateSchema = object({
  kind: literal('at-translate').describe('Discriminator for direction-relative translate.'),
  ...AtPositionSchema.shape,
}).describe('Direction-relative translate transform lowered to Cartesian translate at compile time.');

/** 校验相对参考位置的坐标偏移 */
const OffsetTranslateSchema = object({
  kind: literal('offset-translate').describe('Discriminator for offset-from-reference translate.'),
  ...OffsetPositionSchema.shape,
  // 平移允许省略偏移量，此时直接移动到参考点
  offset: OffsetPositionSchema.shape.offset
    .optional()
    .describe(
      'Additional [dx, dy] offset in user units; omit = [0, 0] so the transform translates exactly to the referent.',
    ),
}).describe('Offset translate transform lowered to Cartesian translate at compile time.');

/** 校验按两点之间的比例指定的平移 */
const BetweenTranslateSchema = object({
  kind: literal('between-translate').describe('Discriminator for proportional translate between two endpoints.'),
  ...BetweenPositionSchema.shape,
}).describe('Proportional translate transform lowered to Cartesian translate at compile time.');

/** 校验旋转角度与可选支点 */
const RotateSchema = strictObject({
  kind: literal('rotate').describe('Discriminator: rotation about a point.'),
  degrees: AngleDegreesSchema.describe('Rotation angle in degrees; positive = visually clockwise under screen y-down.'),
  pivot: ScopeSelfPointSchema.optional().describe(
    'Pivot on the intrinsic Scope envelope or an explicit local point. Omitted fields use origin.',
  ),
}).describe('Rotation transform around an intrinsic Scope self point.');

/** 校验缩放倍率与可选支点 */
const ScaleSchema = strictObject({
  kind: literal('scale').describe('Discriminator: uniform / anisotropic scale.'),
  x: number().describe('Scale factor on the x axis.'),
  y: number().optional().describe('Scale factor on the y axis. Omitted fields use x for uniform scaling.'),
  pivot: ScopeSelfPointSchema.optional().describe(
    'Pivot on the intrinsic Scope envelope or an explicit local point. Omitted fields use origin.',
  ),
}).describe('Scale transform with x and optional y factors around an intrinsic Scope self point.');

/** 校验按 kind 区分的平移、旋转与缩放；引用式平移在编译时解析 */
export const TransformSchema = discriminatedUnion('kind', [
  TranslateSchema,
  PolarTranslateSchema,
  AtTranslateSchema,
  OffsetTranslateSchema,
  BetweenTranslateSchema,
  RotateSchema,
  ScaleSchema,
]).describe(
  'IR-level transform union. Translate variants resolve to Cartesian translate at compile time; rotate and scale pass through as transform primitives.',
);
