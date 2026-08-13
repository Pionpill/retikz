import { z } from 'zod';

import { omitUndefinedProperties } from '../shared';
import { BubbleChartSpecSchema } from './bubble';
import { ConnectedScatterChartSpecSchema } from './connected-scatter';
import { ScatterChartSpecSchema } from './scatter';

type PointChartSpec =
  | z.infer<typeof ScatterChartSpecSchema>
  | z.infer<typeof BubbleChartSpecSchema>
  | z.infer<typeof ConnectedScatterChartSpecSchema>;

/** Chart owner 内建 typed variant 的封闭输入 union */
export const PointChartSpecSchema: z.ZodType<PointChartSpec> = z
  .lazy(() =>
    z.discriminatedUnion('type', [ScatterChartSpecSchema, BubbleChartSpecSchema, ConnectedScatterChartSpecSchema]),
  )
  .describe('Closed Chart typed authoring union')
  .overwrite(omitUndefinedProperties);

/** Point family typed variant 的 JSON-safe 输入 */
export type IRPointChartSpec = z.infer<typeof PointChartSpecSchema>;

export { BubbleChartSpecSchema, type IRBubbleChartSpec } from './bubble';
export {
  ConnectedPathPatchSchema,
  ConnectedPointPatchSchema,
  ConnectedScatterChartSpecSchema,
  type IRConnectedPathPatch,
  type IRConnectedPointPatch,
  type IRConnectedScatterChartSpec,
} from './connected-scatter';
export type { PointChartTypeValue } from './constants';
export { PointChartType } from './constants';
export { type IRScatterChartSpec, ScatterChartSpecSchema } from './scatter';
