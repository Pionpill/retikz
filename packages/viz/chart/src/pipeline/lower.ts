import { defineComposite } from '@retikz/core';

import { CHART_NAMESPACE, InfrastructureChartSpecSchema, InfrastructureChartType } from '../schemas';
import { resolveChartSpec } from './resolve';

/** 私有基础设施 fixture 的逐类型 composite definition */
export const InfrastructureChartDefinition = defineComposite({
  namespace: CHART_NAMESPACE,
  type: InfrastructureChartType,
  schema: InfrastructureChartSpecSchema,
  expand: node => resolveChartSpec(node).node,
});
