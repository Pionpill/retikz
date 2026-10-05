import { createRangedDotChartProviderContribution } from '@retikz/chart/point';
import type { InputEmbed } from '@retikz/vanilla';

import { createChartInputEmbedAdapter } from '../../shared';
import { buildPointChartRuntime, typedChartPartsOf } from '../shared';
import { normalizeRangedDotChart } from './normalize';
import type { RangedDotChartInputEmbedProps } from './types';

/** 在场景处理时规范化 RangedDotChart 输入并复用统一数据准备 */
export const RangedDotChartInputEmbedAdapter = createChartInputEmbedAdapter(
  'chart.ranged-dot',
  (input: RangedDotChartInputEmbedProps<unknown>) => {
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

    return buildPointChartRuntime(
      source,
      parts,
      createRangedDotChartProviderContribution(parts.themeDefinitions, parts.lowerOptions),
    );
  },
);

/** 创建可直接组合到 Vanilla Scene 的 RangedDot 节点 */
export const rangedDotChart = <TNative = never>(
  input: RangedDotChartInputEmbedProps<TNative>,
): InputEmbed<RangedDotChartInputEmbedProps<TNative>> => ({
  type: 'embed',
  kind: RangedDotChartInputEmbedAdapter.kind,
  ...(input.id === undefined ? {} : { id: input.id }),
  props: input,
});
