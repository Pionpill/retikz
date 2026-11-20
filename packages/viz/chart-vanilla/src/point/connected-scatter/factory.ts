import { createConnectedScatterChartProviderContribution } from '@retikz/chart/point';
import { embed } from '@retikz/vanilla';
import type { InputEmbed, InputEmbedContext, InputEmbedPreparationContext } from '@retikz/vanilla';

import { buildChartRuntime, typedChartPartsOf } from '../../authoring';
import { lowerChartInput, prepareChartInput } from '../../shared';
import { normalizeConnectedScatterChart } from './normalize';
import type { ConnectedScatterChartInputEmbedProps } from './types';

/** 在场景处理时规范化 ConnectedScatterChart 输入并复用统一数据准备 */
const chartRuntimeOf = <TNative>(input: ConnectedScatterChartInputEmbedProps<TNative>) => {
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

/** 绑定当前配方的同步转换与异步准备 */
export const connectedScatterChartInputEmbedAdapter = {
  kind: 'chart.connected-scatter',
  lower: <TNative>(input: ConnectedScatterChartInputEmbedProps<TNative>, _context: InputEmbedContext) =>
    lowerChartInput(chartRuntimeOf(input)),
  prepare: <TNative>(input: ConnectedScatterChartInputEmbedProps<TNative>, context: InputEmbedPreparationContext) =>
    prepareChartInput(chartRuntimeOf(input), context),
};

/**
 * 创建可直接组合到 Vanilla Scene 的 ConnectedScatter 节点
 * @template TNative 原生数据源句柄类型，关联数据绑定与执行器支持的源；默认 never 表示不接入原生源
 */
export const connectedScatterChart = <TNative = never>(
  input: ConnectedScatterChartInputEmbedProps<TNative>,
): InputEmbed<ConnectedScatterChartInputEmbedProps<TNative>> =>
  embed({
    adapter: connectedScatterChartInputEmbedAdapter,
    ...(input.id === undefined ? {} : { id: input.id }),
    props: input,
  });
