import { number, tuple } from 'zod';

/** 校验由两个有限数值组成的笛卡尔坐标 */
export const PositionSchema = tuple([number(), number()]).describe(
  'Cartesian position [x, y]; rejects NaN / ±Infinity to keep IR JSON-serializable round-trip stable',
);
