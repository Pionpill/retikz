import { createLineChartProviderContribution } from '@retikz/chart/line';
import { embed } from '@retikz/vanilla';
import type { InputEmbed, InputEmbedContext } from '@retikz/vanilla';

import { buildChartRuntime, typedChartPartsOf } from '../../authoring';
import { lowerChartInput } from '../../shared';
import { normalizeLineChart } from './normalize';
import type { LineChartInputEmbedProps } from './types';

/** 在场景处理时规范化 LineChart 输入并复用统一数据准备 */
const chartRuntimeOf = (input: LineChartInputEmbedProps) => {
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
};

/** 绑定当前配方的同步转换 */
export const lineChartInputEmbedAdapter = {
  kind: 'chart.line',
  lower: (input: LineChartInputEmbedProps, _context: InputEmbedContext) => lowerChartInput(chartRuntimeOf(input)),
};

/**
 * 创建可直接组合到 Vanilla Scene 的 Line 节点
 */
export const lineChart = (input: LineChartInputEmbedProps): InputEmbed<LineChartInputEmbedProps> =>
  embed({
    adapter: lineChartInputEmbedAdapter,
    ...(input.id === undefined ? {} : { id: input.id }),
    props: input,
  });
