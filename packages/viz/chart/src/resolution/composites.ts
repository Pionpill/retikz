import { createBubbleChartDefinition } from '../families/scatter-points/bubble';
import { createConnectedScatterChartDefinition } from '../families/scatter-points/connected-scatter';
import { createScatterChartDefinition } from '../families/scatter-points/scatter';
import { resolveChartSpec } from './resolve';

const expandChart = (
  node: Parameters<typeof resolveChartSpec>[0],
  context?: Parameters<Parameters<typeof createScatterChartDefinition>[0]>[1],
) => resolveChartSpec(node, context?.theme).node;

/** Scatter canonical type 的逐类型 composite definition */
export const ScatterChartDefinition = createScatterChartDefinition(expandChart);

/** Bubble canonical type 的逐类型 composite definition */
export const BubbleChartDefinition = createBubbleChartDefinition(expandChart);

/** Connected Scatter canonical type 的逐类型 composite definition */
export const ConnectedScatterChartDefinition = createConnectedScatterChartDefinition(expandChart);
