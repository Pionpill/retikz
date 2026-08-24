import { literal, union } from 'zod';

import { AnchorRefSchema, PositionSchema } from '../position';

/**
 * Scope 固有局部坐标系中的自身参照点
 * @description `origin` 表示局部原点；其它字符串、数字和边上比例点复用 anchor 契约；二元组是显式局部坐标
 */
export const ScopeSelfPointSchema = union([literal('origin'), AnchorRefSchema, PositionSchema]).describe(
  'Point on the intrinsic Scope envelope, the local origin, or an explicit local Cartesian point.',
);
