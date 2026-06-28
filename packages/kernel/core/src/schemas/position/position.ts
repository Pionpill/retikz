import { z } from 'zod';

export const PositionSchema = z
  .tuple([z.number(), z.number()])
  .describe('Cartesian position [x, y]; rejects NaN / ±Infinity to keep IR JSON-serializable round-trip stable');

/** 笛卡尔坐标 [x, y] */
export type IRPosition = z.infer<typeof PositionSchema>;
