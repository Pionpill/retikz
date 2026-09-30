import { createScatterChartProviderContribution } from '@retikz/chart/point';
import type { InputEmbed, InputEmbedAdapter } from '@retikz/vanilla';

import { buildChartProviderContribution, wrapChartPanel } from '../../shared';
import { buildPointChartRuntime, typedChartPartsOf } from '../shared';
import { normalizeScatterChart } from './normalize';
import type { ScatterChartInputEmbedProps } from './types';

/** 在场景处理时规范化 Scatter 输入并组装 provider 依赖 */
export const ScatterChartInputEmbedAdapter: InputEmbedAdapter<ScatterChartInputEmbedProps> = {
  kind: 'chart.scatter',
  lower: input => {
    const parts = typedChartPartsOf(input);
    const source = normalizeScatterChart({
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
      createScatterChartProviderContribution(parts.themeDefinitions, parts.lowerOptions),
    );
    return {
      node: wrapChartPanel(runtime.source, runtime.panel),
      providerDependencies: buildChartProviderContribution(runtime),
    };
  },
};

/** 创建可直接组合到 Vanilla Scene 的 Scatter 节点 */
export const scatterChart = (input: ScatterChartInputEmbedProps): InputEmbed<ScatterChartInputEmbedProps> => ({
  type: 'embed',
  kind: ScatterChartInputEmbedAdapter.kind,
  ...(input.id === undefined ? {} : { id: input.id }),
  props: input,
});
