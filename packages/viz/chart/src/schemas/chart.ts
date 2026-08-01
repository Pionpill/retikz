import { z } from 'zod';

import { InfrastructureChartSpecSchema } from './infrastructure';
import { ScatterChartSpecSchema } from './scatter';

/** Chart owner 内建 variant 的封闭输入 union */
export const ChartSpecSchema = z
  .discriminatedUnion('type', [InfrastructureChartSpecSchema, ScatterChartSpecSchema])
  .describe('Closed owner-private Chart variant union');

/** Chart owner 内建 variant 的 JSON-safe 输入 */
export type IRChartSpec = z.infer<typeof ChartSpecSchema>;
