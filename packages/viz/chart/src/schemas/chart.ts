import { z } from 'zod';

import { BubbleChartSpecSchema } from './bubble';
import { ConnectedScatterChartSpecSchema } from './connected-scatter';
import { InfrastructureChartSpecSchema } from './infrastructure';
import { omitUndefinedProperties } from './normalize';
import { ScatterChartSpecSchema } from './scatter';

type InternalChartSpec =
  | z.infer<typeof InfrastructureChartSpecSchema>
  | z.infer<typeof ScatterChartSpecSchema>
  | z.infer<typeof BubbleChartSpecSchema>
  | z.infer<typeof ConnectedScatterChartSpecSchema>;

/** Chart owner 内建 variant 的封闭输入 union */
export const ChartSpecSchema: z.ZodType<InternalChartSpec> = z
  .discriminatedUnion('type', [
    InfrastructureChartSpecSchema,
    ScatterChartSpecSchema,
    BubbleChartSpecSchema,
    ConnectedScatterChartSpecSchema,
  ])
  .describe('Closed owner-private Chart variant union')
  .overwrite(omitUndefinedProperties);

/** Chart owner 内建 variant 的 JSON-safe 输入 */
export type IRChartSpec = z.infer<typeof ChartSpecSchema>;
