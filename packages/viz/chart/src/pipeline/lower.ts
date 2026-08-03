import { defineComposite } from '@retikz/core';

import {
  BubbleChartSpecSchema,
  CHART_NAMESPACE,
  ChartType,
  ConnectedScatterChartSpecSchema,
  InfrastructureChartSpecSchema,
  ScatterChartSpecSchema,
} from '../schemas';
import { resolveChartSpec } from './resolve';

/** 私有基础设施 fixture 的逐类型 composite definition */
export const InfrastructureChartDefinition = defineComposite({
  namespace: CHART_NAMESPACE,
  type: ChartType.InfrastructureFixture,
  schema: InfrastructureChartSpecSchema,
  expand: node => resolveChartSpec(node).node,
});

/** Scatter canonical type 的逐类型 composite definition */
export const ScatterChartDefinition = defineComposite({
  namespace: CHART_NAMESPACE,
  type: ChartType.Scatter,
  schema: ScatterChartSpecSchema,
  expand: node => resolveChartSpec(node).node,
});

/** Bubble canonical type 的逐类型 composite definition */
export const BubbleChartDefinition = defineComposite({
  namespace: CHART_NAMESPACE,
  type: ChartType.Bubble,
  schema: BubbleChartSpecSchema,
  expand: node => resolveChartSpec(node).node,
});

/** Connected Scatter canonical type 的逐类型 composite definition */
export const ConnectedScatterChartDefinition = defineComposite({
  namespace: CHART_NAMESPACE,
  type: ChartType.ConnectedScatter,
  schema: ConnectedScatterChartSpecSchema,
  expand: node => resolveChartSpec(node).node,
});
