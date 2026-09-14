import { CHART_NAMESPACE } from '@retikz/chart';
import type { InputEmbedAdapter } from '@retikz/vanilla';

import { buildChartProviderContribution, wrapChartPanel } from '../shared';
import type { ChartInput } from '../shared/types';

/** 将精简 Chart Source 与具体 chartType contribution 下沉为唯一 Core 贡献 */
export const ChartInputEmbedAdapter: InputEmbedAdapter<ChartInput> = {
  kind: CHART_NAMESPACE,
  lower: props => {
    return {
      node: wrapChartPanel(props.source, props.panel),
      providerDependencies: buildChartProviderContribution(props),
    };
  },
};
