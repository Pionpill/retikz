import { createSlopeChartProviderContribution } from '@retikz/chart/line';
import { embed } from '@retikz/vanilla';
import type { InputEmbed, InputEmbedContext, InputEmbedPreparationContext } from '@retikz/vanilla';

import { buildChartRuntime, typedChartPartsOf } from '../../authoring';
import { lowerChartInput, prepareChartInput } from '../../shared';
import { normalizeSlopeChart } from './normalize';
import type { SlopeChartInputEmbedProps } from './types';

/** 在场景处理时规范化 SlopeChart 输入并复用统一数据准备 */
const chartRuntimeOf = <TNative>(input: SlopeChartInputEmbedProps<TNative>) => {
  const parts = typedChartPartsOf(input);
  const source = normalizeSlopeChart({
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
    createSlopeChartProviderContribution(parts.chartThemeDefinitions, parts.lowerOptions),
  );
};

/** 绑定当前配方的同步转换与异步准备 */
export const slopeChartInputEmbedAdapter = {
  kind: 'chart.slope',
  lower: <TNative>(input: SlopeChartInputEmbedProps<TNative>, _context: InputEmbedContext) =>
    lowerChartInput(chartRuntimeOf(input)),
  prepare: <TNative>(input: SlopeChartInputEmbedProps<TNative>, context: InputEmbedPreparationContext) =>
    prepareChartInput(chartRuntimeOf(input), context),
};

/**
 * 创建可直接组合到 Vanilla Scene 的 Slope 节点
 * @template TNative 原生数据源句柄类型，关联数据绑定与执行器支持的源；默认 never 表示不接入原生源
 */
export const slopeChart = <TNative = never>(
  input: SlopeChartInputEmbedProps<TNative>,
): InputEmbed<SlopeChartInputEmbedProps<TNative>> =>
  embed({
    adapter: slopeChartInputEmbedAdapter,
    ...(input.id === undefined ? {} : { id: input.id }),
    props: input,
  });
