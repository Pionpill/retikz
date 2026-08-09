import type { ChartResolveOptions } from './resolve';

import { createBubbleChartDefinition } from '../families/scatter-points/bubble';
import { createConnectedScatterChartDefinition } from '../families/scatter-points/connected-scatter';
import { createScatterChartDefinition } from '../families/scatter-points/scatter';
import { resolveChartSpec } from './resolve';

const createExpandChart =
  (options: ChartResolveOptions) =>
  (
    node: Parameters<typeof resolveChartSpec>[0],
    context?: Parameters<Parameters<typeof createScatterChartDefinition>[0]>[1],
  ) =>
    resolveChartSpec(node, context?.theme, options).node;

/** 创建可注入 Chart 与 Plot Theme style definitions 的 Chart composite definitions */
export const createChartComposites = (
  options: ChartResolveOptions = {},
): readonly [
  ReturnType<typeof createScatterChartDefinition>,
  ReturnType<typeof createBubbleChartDefinition>,
  ReturnType<typeof createConnectedScatterChartDefinition>,
] => {
  const expandChart = createExpandChart(options);
  return [
    createScatterChartDefinition(expandChart),
    createBubbleChartDefinition(expandChart),
    createConnectedScatterChartDefinition(expandChart),
  ];
};

const [defaultScatterChartDefinition, defaultBubbleChartDefinition, defaultConnectedScatterChartDefinition] =
  createChartComposites();

/** Scatter canonical type 的逐类型 composite definition */
export const ScatterChartDefinition = defaultScatterChartDefinition;

/** Bubble canonical type 的逐类型 composite definition */
export const BubbleChartDefinition = defaultBubbleChartDefinition;

/** Connected Scatter canonical type 的逐类型 composite definition */
export const ConnectedScatterChartDefinition = defaultConnectedScatterChartDefinition;
