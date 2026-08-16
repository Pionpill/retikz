import { z } from 'zod';

import { omitUndefinedProperties } from '../shared';
import { BubbleChartSchema } from './bubble';
import { ConnectedScatterChartSchema } from './connected-scatter';
import { ScatterChartSchema } from './scatter';

type PointChartIR =
  | z.infer<typeof ScatterChartSchema>
  | z.infer<typeof BubbleChartSchema>
  | z.infer<typeof ConnectedScatterChartSchema>;

/** Chart owner 内建 typed variant 的封闭输入 union */
export const PointChartSchema: z.ZodType<PointChartIR> = z
  .lazy(() =>
    z.discriminatedUnion('type', [ScatterChartSchema, BubbleChartSchema, ConnectedScatterChartSchema]),
  )
  .describe('Closed Chart typed authoring union')
  .overwrite(omitUndefinedProperties);

/** Point family typed variant 的 JSON-safe 输入 */
export type IRPointChart = z.infer<typeof PointChartSchema>;

export { BubbleChartSchema, type IRBubbleChart } from './bubble';
export {
  ConnectedPathPatchSchema,
  ConnectedPointPatchSchema,
  ConnectedScatterChartSchema,
  type IRConnectedPathPatch,
  type IRConnectedPointPatch,
  type IRConnectedScatterChart,
} from './connected-scatter';
export type { PointChartTypeValue } from './constants';
export { PointChartType } from './constants';
export { type IRScatterChart, ScatterChartSchema } from './scatter';
