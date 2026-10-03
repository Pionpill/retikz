import { createRangedDotChartProviderContribution } from '@retikz/chart/point';
import type { InputEmbed, SynchronousInputEmbedAdapter } from '@retikz/vanilla';

import { buildChartProviderContribution, wrapChartPanel } from '../../shared';
import { buildPointChartRuntime, typedChartPartsOf } from '../shared';
import { normalizeRangedDotChart } from './normalize';
import type { RangedDotChartInputEmbedProps } from './types';

/** 在场景处理时规范化 RangedDot 输入并组装 provider 依赖 */
export const RangedDotChartInputEmbedAdapter: SynchronousInputEmbedAdapter<RangedDotChartInputEmbedProps> = {
  kind: 'chart.ranged-dot',
  lower: input => {
    const parts = typedChartPartsOf(input);
    const source = normalizeRangedDotChart({
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
      createRangedDotChartProviderContribution(parts.themeDefinitions, parts.lowerOptions),
    );
    return {
      node: wrapChartPanel(runtime.source, runtime.panel),
      providerDependencies: buildChartProviderContribution(runtime),
    };
  },
};

/** 创建可直接组合到 Vanilla Scene 的 RangedDot 节点 */
export const rangedDotChart = (input: RangedDotChartInputEmbedProps): InputEmbed<RangedDotChartInputEmbedProps> => ({
  type: 'embed',
  kind: RangedDotChartInputEmbedAdapter.kind,
  ...(input.id === undefined ? {} : { id: input.id }),
  props: input,
});
