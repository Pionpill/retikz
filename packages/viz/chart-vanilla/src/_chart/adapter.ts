import type { InputEmbedAdapter } from '@retikz/vanilla';

import { CHART_NAMESPACE } from '@retikz/chart';

import type { ChartInput } from '../shared/types';

import { chartContributionOf, wrapChartPanel } from '../shared';

/** 将精简 Chart Source 与具体 chartType contribution 下沉为唯一 Core 贡献 */
export const ChartInputEmbedAdapter: InputEmbedAdapter<ChartInput> = {
  kind: CHART_NAMESPACE,
  lower: props => {
    const result = chartContributionOf(props);
    return {
      node: wrapChartPanel(props.source, props.panel),
      providerDependencies: result.contribution,
    };
  },
};
