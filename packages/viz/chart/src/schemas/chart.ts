import { z } from 'zod';

import { BubbleChartSpecSchema } from '../families/scatter-points/bubble';
import { ConnectedScatterChartSpecSchema } from '../families/scatter-points/connected-scatter';
import { ScatterChartSpecSchema } from '../families/scatter-points/scatter';
import { omitUndefinedProperties } from '../shared';

type InternalChartSpec =
  | z.infer<typeof ScatterChartSpecSchema>
  | z.infer<typeof BubbleChartSpecSchema>
  | z.infer<typeof ConnectedScatterChartSpecSchema>;

/** Chart owner 内建 variant 的封闭输入 union */
export const ChartSpecSchema: z.ZodType<InternalChartSpec> = z
  .discriminatedUnion('type', [ScatterChartSpecSchema, BubbleChartSpecSchema, ConnectedScatterChartSpecSchema])
  .describe('Closed owner-private Chart variant union')
  .overwrite(omitUndefinedProperties);

/** Chart owner 内建 variant 的 JSON-safe 输入 */
export type IRChartSpec = z.infer<typeof ChartSpecSchema>;
