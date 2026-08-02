import { defineComposite } from '@retikz/core';

import {
  CHART_NAMESPACE,
  ConnectedScatterChartSpecSchema,
  ConnectedScatterChartType,
  InfrastructureChartSpecSchema,
  InfrastructureChartType,
  ScatterChartSpecSchema,
  ScatterChartType,
} from '../schemas';
import { resolveChartSpec } from './resolve';

/** 私有基础设施 fixture 的逐类型 composite definition */
export const InfrastructureChartDefinition = defineComposite({
  namespace: CHART_NAMESPACE,
  type: InfrastructureChartType,
  schema: InfrastructureChartSpecSchema,
  expand: node => resolveChartSpec(node).node,
});

/** Scatter canonical type 的逐类型 composite definition */
export const ScatterChartDefinition = defineComposite({
  namespace: CHART_NAMESPACE,
  type: ScatterChartType,
  schema: ScatterChartSpecSchema,
  expand: node => resolveChartSpec(node).node,
});

/** Connected Scatter canonical type 的逐类型 composite definition */
export const ConnectedScatterChartDefinition = defineComposite({
  namespace: CHART_NAMESPACE,
  type: ConnectedScatterChartType,
  schema: ConnectedScatterChartSpecSchema,
  expand: node => resolveChartSpec(node).node,
});
