import { z } from 'zod';

export const PositionSchema = z
  .tuple([z.number(), z.number()])
  .describe('Cartesian position [x, y]');

/** 笛卡尔坐标 [x, y] */
export type IRPosition = z.infer<typeof PositionSchema>;
