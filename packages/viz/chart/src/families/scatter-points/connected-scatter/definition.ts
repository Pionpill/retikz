import { defineComposite } from '@retikz/core';

import type { ChartExpand } from '../../shared';

import { CHART_NAMESPACE, ChartType } from '../../../schemas';
import { ConnectedScatterChartSpecSchema } from './schema';

/** 创建 Connected Scatter canonical type 的 Core composite definition */
export const createConnectedScatterChartDefinition = (expand: ChartExpand) =>
  defineComposite({
    namespace: CHART_NAMESPACE,
    type: ChartType.ConnectedScatter,
    schema: ConnectedScatterChartSpecSchema,
    expand,
  });
