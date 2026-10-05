import { createStripChartProviderContribution } from '@retikz/chart/point';
import type { InputEmbed } from '@retikz/vanilla';

import { createChartInputEmbedAdapter } from '../../shared';
import { buildPointChartRuntime, typedChartPartsOf } from '../shared';
import { normalizeStripChart } from './normalize';
import type { StripChartInputEmbedProps } from './types';

/** 在场景处理时规范化 StripChart 输入并复用统一数据准备 */
export const StripChartInputEmbedAdapter = createChartInputEmbedAdapter(
  'chart.strip',
  (input: StripChartInputEmbedProps<unknown>) => {
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

    return buildPointChartRuntime(
      source,
      parts,
      createStripChartProviderContribution(parts.themeDefinitions, parts.lowerOptions),
    );
  },
);

/** 创建可直接组合到 Vanilla Scene 的 Strip 节点 */
export const stripChart = <TNative = never>(
  input: StripChartInputEmbedProps<TNative>,
): InputEmbed<StripChartInputEmbedProps<TNative>> => ({
  type: 'embed',
  kind: StripChartInputEmbedAdapter.kind,
  ...(input.id === undefined ? {} : { id: input.id }),
  props: input,
});
