import { defineComposite } from '@retikz/core';

import type { ChartExpand } from '../../shared';

import { CHART_NAMESPACE, ChartType } from '../../../schemas';
import { ScatterChartSpecSchema } from './schema';

/** 创建 Scatter canonical type 的 Core composite definition */
export const createScatterChartDefinition = (expand: ChartExpand) =>
  defineComposite({
    namespace: CHART_NAMESPACE,
    type: ChartType.Scatter,
    schema: ScatterChartSpecSchema,
    expand,
  });
