import { createBubbleChartDefinition } from '../families/scatter-points/bubble';
import { createConnectedScatterChartDefinition } from '../families/scatter-points/connected-scatter';
import { createScatterChartDefinition } from '../families/scatter-points/scatter';
import { createInfrastructureChartDefinition } from '../internal/fixture';
import { resolveChartSpec } from './resolve';

const expandChart = (node: Parameters<typeof resolveChartSpec>[0]) => resolveChartSpec(node).node;

/** 私有基础设施 fixture 的逐类型 composite definition */
export const InfrastructureChartDefinition = createInfrastructureChartDefinition(expandChart);

/** Scatter canonical type 的逐类型 composite definition */
export const ScatterChartDefinition = createScatterChartDefinition(expandChart);

/** Bubble canonical type 的逐类型 composite definition */
export const BubbleChartDefinition = createBubbleChartDefinition(expandChart);

/** Connected Scatter canonical type 的逐类型 composite definition */
export const ConnectedScatterChartDefinition = createConnectedScatterChartDefinition(expandChart);
