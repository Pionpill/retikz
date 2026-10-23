import type { Vector2 } from '@retikz/math';
import { tuple, number } from 'zod';
import type { ZodType, infer as ZodInfer } from 'zod';

/** 校验由两个有限数值组成的笛卡尔坐标 */
export const PositionSchema = tuple([number(), number()]).describe(
  'Cartesian position [x, y]; rejects NaN / ±Infinity to keep IR JSON-serializable round-trip stable',
);

/** 校验表示方向或位移的二维有限数值向量 */
export const Vector2Schema: ZodType<Vector2> = tuple([number(), number()]).describe(
  'Cartesian 2D vector [x, y]; shares the same tuple shape as Position but means direction or offset.',
);

/** 笛卡尔坐标 [x, y] */
export type IRPosition = ZodInfer<typeof PositionSchema>;
