import { defineComposite } from '@retikz/core';

import type { ChartExpand } from '../../families/shared';

import { CHART_NAMESPACE, ChartType } from '../../schemas';
import { InfrastructureChartSpecSchema } from './schema';

/** 创建测试专用基础设施 fixture 的 Core composite definition */
export const createInfrastructureChartDefinition = (expand: ChartExpand) =>
  defineComposite({
    namespace: CHART_NAMESPACE,
    type: ChartType.InfrastructureFixture,
    schema: InfrastructureChartSpecSchema,
    expand,
  });
