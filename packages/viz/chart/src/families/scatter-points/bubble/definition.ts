import { defineComposite } from '@retikz/core';

import type { ChartExpand } from '../../shared';

import { CHART_NAMESPACE, ChartType } from '../../../schemas';
import { BubbleChartSpecSchema } from './schema';

/** 创建 Bubble canonical type 的 Core composite definition */
export const createBubbleChartDefinition = (expand: ChartExpand) =>
  defineComposite({
    namespace: CHART_NAMESPACE,
    type: ChartType.Bubble,
    schema: BubbleChartSpecSchema,
    expand,
  });
