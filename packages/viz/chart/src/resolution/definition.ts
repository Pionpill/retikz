import type { CompositeDefinition } from '@retikz/core';

import { defineComposite } from '@retikz/core';
import { createSurface } from '@retikz/standard';

import type { IRChart } from '../schemas';
import type { ChartThemeStyleDefinition } from '../style';

import { resolveChartPresentation } from '../presentation';
import { CHART_COMPOSITE_TYPE, CHART_NAMESPACE, ChartSchema } from '../schemas';
import { ChartThemeToken, resolveChartStyle } from '../style';

/** 创建携带 Chart-owned Theme definitions 的 canonical chart.chart Definition */
export const createChartDefinition = (
  chartThemeStyles: ReadonlyArray<ChartThemeStyleDefinition> | undefined = undefined,
): CompositeDefinition<IRChart, typeof CHART_NAMESPACE, typeof CHART_COMPOSITE_TYPE> =>
  defineComposite({
    namespace: CHART_NAMESPACE,
    type: CHART_COMPOSITE_TYPE,
    schema: ChartSchema,
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

/** canonical chart.chart 到 Standard Surface 的默认 Definition */
export const ChartDefinition: CompositeDefinition<IRChart, typeof CHART_NAMESPACE, typeof CHART_COMPOSITE_TYPE> =
  createChartDefinition();
