import { createRegressionChartProviderContribution } from '@retikz/chart/point';
import type { InputEmbed } from '@retikz/vanilla';

import { createChartInputEmbedAdapter } from '../../shared';
import { buildPointChartRuntime, typedChartPartsOf } from '../shared';
import { normalizeRegressionChart } from './normalize';
import type { RegressionChartInputEmbedProps } from './types';

/** 在场景处理时规范化 RegressionChart 输入并复用统一数据准备 */
export const RegressionChartInputEmbedAdapter = createChartInputEmbedAdapter(
  'chart.regression',
  (input: RegressionChartInputEmbedProps<unknown>) => {
    const parts = typedChartPartsOf(input);
    const source = normalizeRegressionChart({
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
      createRegressionChartProviderContribution(parts.themeDefinitions, parts.lowerOptions),
    );
  },
);

/** 创建可直接组合到 Vanilla Scene 的 Regression 节点 */
export const regressionChart = <TNative = never>(
  input: RegressionChartInputEmbedProps<TNative>,
): InputEmbed<RegressionChartInputEmbedProps<TNative>> => ({
  type: 'embed',
  kind: RegressionChartInputEmbedAdapter.kind,
  ...(input.id === undefined ? {} : { id: input.id }),
  props: input,
});
