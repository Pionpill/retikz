import { z } from 'zod';

import { BubbleChartSpecSchema } from '../families/scatter-points/bubble';
import { ConnectedScatterChartSpecSchema } from '../families/scatter-points/connected-scatter';
import { ScatterChartSpecSchema } from '../families/scatter-points/scatter';
import { omitUndefinedProperties } from '../shared';

type InternalChartSpec =
  | z.infer<typeof ScatterChartSpecSchema>
  | z.infer<typeof BubbleChartSpecSchema>
  | z.infer<typeof ConnectedScatterChartSpecSchema>;

/** Chart owner 内建 typed variant 的封闭输入 union */
export const ChartSpecSchema: z.ZodType<InternalChartSpec> = z
  .lazy(() =>
    z.discriminatedUnion('type', [ScatterChartSpecSchema, BubbleChartSpecSchema, ConnectedScatterChartSpecSchema]),
  )
  .describe('Closed Chart typed authoring union')
  .overwrite(omitUndefinedProperties);

/** Chart owner 内建 typed variant 的 JSON-safe 输入 */
export type IRChartSpec = z.infer<typeof ChartSpecSchema>;

export { BubbleChartSpecSchema, type IRBubbleChartSpec } from '../families/scatter-points/bubble';
export {
  ConnectedPathPatchSchema,
  ConnectedPointPatchSchema,
  ConnectedScatterChartSpecSchema,
  type IRConnectedPathPatch,
  type IRConnectedPointPatch,
  type IRConnectedScatterChartSpec,
} from '../families/scatter-points/connected-scatter';
export { type IRScatterChartSpec, ScatterChartSpecSchema } from '../families/scatter-points/scatter';
export * from './chart';
export * from './constants';
