import { createScatterChartProviderContribution } from '@retikz/chart/point';
import type { InputEmbed } from '@retikz/vanilla';

import { createChartInputEmbedAdapter } from '../../shared';
import { buildPointChartRuntime, typedChartPartsOf } from '../shared';
import { normalizeScatterChart } from './normalize';
import type { ScatterChartInputEmbedProps } from './types';

/** 在场景处理时规范化 ScatterChart 输入并复用统一数据准备 */
export const ScatterChartInputEmbedAdapter = createChartInputEmbedAdapter(
  'chart.scatter',
  (input: ScatterChartInputEmbedProps<unknown>) => {
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

    return buildPointChartRuntime(
      source,
      parts,
      createScatterChartProviderContribution(parts.themeDefinitions, parts.lowerOptions),
    );
  },
);

/** 创建可直接组合到 Vanilla Scene 的 Scatter 节点 */
export const scatterChart = <TNative = never>(
  input: ScatterChartInputEmbedProps<TNative>,
): InputEmbed<ScatterChartInputEmbedProps<TNative>> => ({
  type: 'embed',
  kind: ScatterChartInputEmbedAdapter.kind,
  ...(input.id === undefined ? {} : { id: input.id }),
  props: input,
});
