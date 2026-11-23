import { createSlopeChartProviderContribution } from '@retikz/chart/line';
import { embed } from '@retikz/vanilla';
import type { InputEmbed, InputEmbedContext } from '@retikz/vanilla';

import { buildChartRuntime, typedChartPartsOf } from '../../authoring';
import { lowerChartInput } from '../../shared';
import { normalizeSlopeChart } from './normalize';
import type { SlopeChartInputEmbedProps } from './types';

/** 在场景处理时规范化 SlopeChart 输入并复用统一数据准备 */
const chartRuntimeOf = (input: SlopeChartInputEmbedProps) => {
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

/** 绑定当前配方的同步转换 */
export const slopeChartInputEmbedAdapter = {
  kind: 'chart.slope',
  lower: (input: SlopeChartInputEmbedProps, _context: InputEmbedContext) => lowerChartInput(chartRuntimeOf(input)),
};

/**
 * 创建可直接组合到 Vanilla Scene 的 Slope 节点
 */
export const slopeChart = (input: SlopeChartInputEmbedProps): InputEmbed<SlopeChartInputEmbedProps> =>
  embed({
    adapter: slopeChartInputEmbedAdapter,
    ...(input.id === undefined ? {} : { id: input.id }),
    props: input,
  });
