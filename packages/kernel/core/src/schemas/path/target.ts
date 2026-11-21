import { object, tuple, number, union, lazy } from 'zod';
import type { infer as ZodInfer } from 'zod';

import { BetweenPositionSchema } from '../position/between';
import { OffsetPositionSchema } from '../position/offset';
import { PolarPositionSchema } from '../position/polar';
import { PositionSchema } from '../position/position';
import { NodeTargetSchema } from '../position/target';

/** 校验不更新累积参考游标的相对偏移目标 */
export const RelativeTargetSchema = object({
  relative: tuple([number(), number()]).describe('Cartesian [dx, dy].'),
}).describe('Offset from the relative baseline; later offsets keep using that baseline.');

/** 校验更新累积参考游标的相对偏移目标 */
export const RelativeAccumulateTargetSchema = object({
  relativeAccumulate: tuple([number(), number()]).describe('Cartesian [dx, dy].'),
}).describe('Offset from the relative baseline; the result becomes the baseline for later offsets.');

/** 校验笛卡尔、极坐标、节点引用、相对偏移或两点插值等路径目标 */
export const TargetSchema = union([
  PositionSchema,
  PolarPositionSchema,
  NodeTargetSchema,
  RelativeTargetSchema,
  RelativeAccumulateTargetSchema,
  OffsetPositionSchema,
  // 延迟读取两点定位，避免递归目标在模块初始化时求值
  lazy(() => BetweenPositionSchema),
]);

/** 路径端点：直接坐标 [x, y] / 极坐标 / NodeTarget 对象 `{ id, anchor?, offset?, boundary? }` / 相对偏移对象 / offset / between；裸节点 id 字符串仅 React DSL，解析为 NodeTarget 后才进 IR */
export type IRTarget = ZodInfer<typeof TargetSchema>;

/** 相对前一 step 终点的偏移；不更新 prevEnd（TikZ `(+x, +y)`） */
export type IRRelativeTarget = ZodInfer<typeof RelativeTargetSchema>;

/** 累积相对偏移；更新 prevEnd（TikZ `(++x, ++y)`） */
export type IRRelativeAccumulateTarget = ZodInfer<typeof RelativeAccumulateTargetSchema>;
