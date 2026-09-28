import { createStripChartProviderContribution } from '@retikz/chart/point';
import type { InputEmbed, InputEmbedAdapter } from '@retikz/vanilla';

import { buildChartProviderContribution, wrapChartPanel } from '../../shared';
import { buildPointChartRuntime, typedChartPartsOf } from '../shared';
import { normalizeStripChart } from './normalize';
import type { StripChartInputEmbedProps } from './types';

/** 在场景处理时规范化 Strip 输入并组装 provider 依赖 */
export const StripChartInputEmbedAdapter: InputEmbedAdapter<StripChartInputEmbedProps> = {
  kind: 'chart.strip',
  lower: input => {
    const parts = typedChartPartsOf(input);
    const source = normalizeStripChart({
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
      createStripChartProviderContribution(parts.themeDefinitions, parts.lowerOptions),
    );
    return {
      node: wrapChartPanel(runtime.source, runtime.panel),
      providerDependencies: buildChartProviderContribution(runtime),
    };
  },
};

/** 创建可直接组合到 Vanilla Scene 的 Strip 节点 */
export const stripChart = (input: StripChartInputEmbedProps): InputEmbed<StripChartInputEmbedProps> => ({
  type: 'embed',
  kind: StripChartInputEmbedAdapter.kind,
  ...(input.id === undefined ? {} : { id: input.id }),
  props: input,
});
