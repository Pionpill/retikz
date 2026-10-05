import { createBubbleChartProviderContribution } from '@retikz/chart/point';
import type { InputEmbed } from '@retikz/vanilla';

import { createChartInputEmbedAdapter } from '../../shared';
import { buildPointChartRuntime, typedChartPartsOf } from '../shared';
import { normalizeBubbleChart } from './normalize';
import type { BubbleChartInputEmbedProps } from './types';

/** 在场景处理时规范化 BubbleChart 输入并复用统一数据准备 */
export const BubbleChartInputEmbedAdapter = createChartInputEmbedAdapter(
  'chart.bubble',
  (input: BubbleChartInputEmbedProps<unknown>) => {
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

    return buildPointChartRuntime(
      source,
      parts,
      createBubbleChartProviderContribution(parts.themeDefinitions, parts.lowerOptions),
    );
  },
);

/**
 * 创建可直接组合到 Vanilla Scene 的 Bubble 节点
 * @template TNative 原生数据源句柄类型，关联数据绑定与执行器支持的源；默认 never 表示不接入原生源
 */
export const bubbleChart = <TNative = never>(
  input: BubbleChartInputEmbedProps<TNative>,
): InputEmbed<BubbleChartInputEmbedProps<TNative>> => ({
  type: 'embed',
  kind: BubbleChartInputEmbedAdapter.kind,
  ...(input.id === undefined ? {} : { id: input.id }),
  props: input,
});
