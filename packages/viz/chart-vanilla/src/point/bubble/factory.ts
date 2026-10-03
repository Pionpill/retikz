import { createBubbleChartProviderContribution } from '@retikz/chart/point';
import type { InputEmbed, SynchronousInputEmbedAdapter } from '@retikz/vanilla';

import { buildChartProviderContribution, wrapChartPanel } from '../../shared';
import { buildPointChartRuntime, typedChartPartsOf } from '../shared';
import { normalizeBubbleChart } from './normalize';
import type { BubbleChartInputEmbedProps } from './types';

/** 在场景处理时规范化 Bubble 输入并组装 provider 依赖 */
export const BubbleChartInputEmbedAdapter: SynchronousInputEmbedAdapter<BubbleChartInputEmbedProps> = {
  kind: 'chart.bubble',
  lower: input => {
    const parts = typedChartPartsOf(input);
    const source = normalizeBubbleChart({
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
      createBubbleChartProviderContribution(parts.themeDefinitions, parts.lowerOptions),
    );
    return {
      node: wrapChartPanel(runtime.source, runtime.panel),
      providerDependencies: buildChartProviderContribution(runtime),
    };
  },
};

/** 创建可直接组合到 Vanilla Scene 的 Bubble 节点 */
export const bubbleChart = (input: BubbleChartInputEmbedProps): InputEmbed<BubbleChartInputEmbedProps> => ({
  type: 'embed',
  kind: BubbleChartInputEmbedAdapter.kind,
  ...(input.id === undefined ? {} : { id: input.id }),
  props: input,
});
