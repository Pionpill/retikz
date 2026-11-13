import { createLineChartProviderContribution } from '@retikz/chart/line';
import type { InputEmbed } from '@retikz/vanilla';

import { buildChartRuntime, typedChartPartsOf } from '../../authoring';
import { createChartInputEmbedAdapter } from '../../shared';
import { normalizeLineChart } from './normalize';
import type { LineChartInputEmbedProps } from './types';

/** 在场景处理时规范化 LineChart 输入并复用统一数据准备 */
export const lineChartInputEmbedAdapter = createChartInputEmbedAdapter(
  'chart.line',
  (input: LineChartInputEmbedProps<unknown>) => {
    const parts = typedChartPartsOf(input);
    const source = normalizeLineChart({
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

    return buildChartRuntime(
      source,
      parts,
      createLineChartProviderContribution(parts.chartThemeDefinitions, parts.lowerOptions),
    );
  },
);

/**
 * 创建可直接组合到 Vanilla Scene 的 Line 节点
 * @template TNative 原生数据源句柄类型，关联数据绑定与执行器支持的源；默认 never 表示不接入原生源
 */
export const lineChart = <TNative = never>(
  input: LineChartInputEmbedProps<TNative>,
): InputEmbed<LineChartInputEmbedProps<TNative>> => ({
  type: 'embed',
  kind: lineChartInputEmbedAdapter.kind,
  ...(input.id === undefined ? {} : { id: input.id }),
  props: input,
});
