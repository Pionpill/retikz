import type { InputEmbedAdapter } from '@retikz/vanilla';

import { CHART_NAMESPACE } from '@retikz/chart';

import type { InputChart } from '../normalize/chart';

import { normalizeChart } from '../normalize/chart';
import { chartContributionOf, wrapChartPanel } from '../shared';

/** 将基础 Chart Input 下沉为唯一的 Core contribution */
export const ChartInputEmbedAdapter: InputEmbedAdapter<InputChart> = {
  kind: CHART_NAMESPACE,
  lower: props => {
    const result = chartContributionOf(normalizeChart(props));
    return {
      node: wrapChartPanel(result.chart, props.panel),
      compositeDependencies: result.contribution,
    };
  },
};
