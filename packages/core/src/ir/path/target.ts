import { z } from 'zod';
import { PolarPositionSchema, PositionSchema } from '../position';

export const TargetSchema = z
  .union([PositionSchema, PolarPositionSchema, z.string().min(1)])
  .describe(
    'Path endpoint: Cartesian [x, y], polar position (resolved at compile time), or node id reference',
  );

/** 路径端点：直接坐标 [x, y]、极坐标，或节点 id 字符串 */
export type IRTarget = z.infer<typeof TargetSchema>;
