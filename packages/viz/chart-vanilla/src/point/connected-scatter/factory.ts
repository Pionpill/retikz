import { createConnectedScatterChartProviderContribution } from '@retikz/chart/point';
import type { InputEmbed } from '@retikz/vanilla';

import { createChartInputEmbedAdapter } from '../../shared';
import { buildPointChartRuntime, typedChartPartsOf } from '../shared';
import { normalizeConnectedScatterChart } from './normalize';
import type { ConnectedScatterChartInputEmbedProps } from './types';

/** 在场景处理时规范化 ConnectedScatterChart 输入并复用统一数据准备 */
export const ConnectedScatterChartInputEmbedAdapter = createChartInputEmbedAdapter(
  'chart.connected-scatter',
  (input: ConnectedScatterChartInputEmbedProps<unknown>) => {
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
    return buildPointChartRuntime(
      source,
      parts,
      createConnectedScatterChartProviderContribution(parts.themeDefinitions, parts.lowerOptions),
    );
  },
);

/** 创建可直接组合到 Vanilla Scene 的 ConnectedScatter 节点 */
export const connectedScatterChart = <TNative = never>(
  input: ConnectedScatterChartInputEmbedProps<TNative>,
): InputEmbed<ConnectedScatterChartInputEmbedProps<TNative>> => ({
  type: 'embed',
  kind: ConnectedScatterChartInputEmbedAdapter.kind,
  ...(input.id === undefined ? {} : { id: input.id }),
  props: input,
});
