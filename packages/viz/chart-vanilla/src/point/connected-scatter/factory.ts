import { createConnectedScatterChartProviderContribution } from '@retikz/chart/point';
import { embed } from '@retikz/vanilla';
import type { InputEmbed, InputEmbedContext } from '@retikz/vanilla';

import { buildChartRuntime, typedChartPartsOf } from '../../authoring';
import { lowerChartInput } from '../../shared';
import { normalizeConnectedScatterChart } from './normalize';
import type { ConnectedScatterChartInputEmbedProps } from './types';

/** 在场景处理时规范化 ConnectedScatterChart 输入并复用统一数据准备 */
const chartRuntimeOf = (input: ConnectedScatterChartInputEmbedProps) => {
  const parts = typedChartPartsOf(input);
  const source = normalizeConnectedScatterChart({
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
    createConnectedScatterChartProviderContribution(parts.chartThemeDefinitions, parts.lowerOptions),
  );
};

/** 绑定当前配方的同步转换 */
export const connectedScatterChartInputEmbedAdapter = {
  kind: 'chart.connected-scatter',
  lower: (input: ConnectedScatterChartInputEmbedProps, _context: InputEmbedContext) =>
    lowerChartInput(chartRuntimeOf(input)),
};

/**
 * 创建可直接组合到 Vanilla Scene 的 ConnectedScatter 节点
 */
export const connectedScatterChart = (
  input: ConnectedScatterChartInputEmbedProps,
): InputEmbed<ConnectedScatterChartInputEmbedProps> =>
  embed({
    adapter: connectedScatterChartInputEmbedAdapter,
    ...(input.id === undefined ? {} : { id: input.id }),
    props: input,
  });
