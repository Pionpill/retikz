import type { CompositeDefinition } from '@retikz/core';

import { defineComposite } from '@retikz/core';
import { createSurface } from '@retikz/standard';

import type { IRBaseChart } from './schemas';
import type { ChartThemeStyleDefinition } from './style';

import { BaseChartType, CHART_NAMESPACE, ChartThemeToken } from '../_shared';
import { resolveChartPresentation } from './presentation';
import { BaseChartSchema } from './schemas';
import { resolveChartStyle } from './style';

/** 创建携带 Chart 自有主题定义的 Base Chart 定义 */
export const createChartDefinition = (
  chartThemeStyles: ReadonlyArray<ChartThemeStyleDefinition> | undefined = undefined,
): CompositeDefinition<IRBaseChart, typeof CHART_NAMESPACE, typeof BaseChartType.Base> =>
  defineComposite({
    namespace: CHART_NAMESPACE,
    type: BaseChartType.Base,
    schema: BaseChartSchema,
    expand: (chart, context) => {
      const style = resolveChartStyle(context.theme, chart, chartThemeStyles);
      const presentation = resolveChartPresentation(chart.presentation, chart.plot, style.tokens);
      return {
        children: [
          createSurface({
            namespace: 'standard',
            type: 'surface',
            ...(chart.id === undefined ? {} : { id: chart.id }),
            child: presentation.content,
            padding: style.tokens[ChartThemeToken.ChartPadding],
            background: { fill: style.tokens[ChartThemeToken.ChartCanvasFill] },
          }),
        ],
      };
    },
  });

/** Base Chart 到 Standard Surface 的默认定义 */
export const ChartDefinition: CompositeDefinition<IRBaseChart, typeof CHART_NAMESPACE, typeof BaseChartType.Base> =
  createChartDefinition();
