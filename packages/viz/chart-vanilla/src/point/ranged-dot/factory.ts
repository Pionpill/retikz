import { createRangedDotChartProviderContribution } from '@retikz/chart/point';
import { embed } from '@retikz/vanilla';
import type { InputEmbed, InputEmbedContext } from '@retikz/vanilla';

import { buildChartRuntime, typedChartPartsOf } from '../../authoring';
import { lowerChartInput } from '../../shared';
import { normalizeRangedDotChart } from './normalize';
import type { RangedDotChartInputEmbedProps } from './types';

/** 在场景处理时规范化 RangedDotChart 输入并复用统一数据准备 */
const chartRuntimeOf = (input: RangedDotChartInputEmbedProps) => {
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

  return buildChartRuntime(
    source,
    parts,
    createRangedDotChartProviderContribution(parts.chartThemeDefinitions, parts.lowerOptions),
  );
};

/** 绑定当前配方的同步转换 */
export const rangedDotChartInputEmbedAdapter = {
  kind: 'chart.ranged-dot',
  lower: (input: RangedDotChartInputEmbedProps, _context: InputEmbedContext) => lowerChartInput(chartRuntimeOf(input)),
};

/**
 * 创建可直接组合到 Vanilla Scene 的 RangedDot 节点
 */
export const rangedDotChart = (input: RangedDotChartInputEmbedProps): InputEmbed<RangedDotChartInputEmbedProps> =>
  embed({
    adapter: rangedDotChartInputEmbedAdapter,
    ...(input.id === undefined ? {} : { id: input.id }),
    props: input,
  });
