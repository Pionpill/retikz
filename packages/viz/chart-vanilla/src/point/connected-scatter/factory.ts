import { createConnectedScatterChartProviderContribution } from '@retikz/chart/point/connected-scatter';
import type { InputEmbed, InputEmbedAdapter } from '@retikz/vanilla';

import { buildChartProviderContribution, wrapChartPanel } from '../../shared';
import { buildPointChartRuntime, typedChartPartsOf } from '../shared';
import { normalizeConnectedScatterChart } from './normalize';
import type { ConnectedScatterChartInputEmbedProps } from './types';

/** 在场景处理时规范化 ConnectedScatter 输入并组装 provider 依赖 */
export const ConnectedScatterChartInputEmbedAdapter: InputEmbedAdapter<ConnectedScatterChartInputEmbedProps> = {
  kind: 'chart.connected-scatter',
  lower: input => {
    const parts = typedChartPartsOf(input);
    const source = normalizeConnectedScatterChart({
      ...parts.root,
      ...(input.title === undefined ? {} : { title: input.title }),
      ...(input.subtitle === undefined ? {} : { subtitle: input.subtitle }),
      ...(input.note === undefined ? {} : { note: input.note }),
      ...(input.source === undefined ? {} : { source: input.source }),
      encodings: input.encodings,
      ...(input.properties === undefined ? {} : { properties: input.properties }),
      ...(input.guides === undefined ? {} : { guides: input.guides }),
      ...(input.marks === undefined ? {} : { marks: input.marks }),
    });
    const runtime = buildPointChartRuntime(
      source,
      parts,
      createConnectedScatterChartProviderContribution(parts.themeDefinitions, parts.lowerOptions),
    );
    return {
      node: wrapChartPanel(runtime.source, runtime.panel),
      providerDependencies: buildChartProviderContribution(runtime),
    };
  },
};

/** 创建可直接组合到 Vanilla Scene 的 ConnectedScatter 节点 */
export const connectedScatterChart = (
  input: ConnectedScatterChartInputEmbedProps,
): InputEmbed<ConnectedScatterChartInputEmbedProps> => ({
  type: 'embed',
  kind: ConnectedScatterChartInputEmbedAdapter.kind,
  ...(input.id === undefined ? {} : { id: input.id }),
  props: input,
});
