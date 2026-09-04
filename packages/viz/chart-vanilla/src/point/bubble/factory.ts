import type { IRBubbleChart } from '@retikz/chart/point/bubble';

import { createBubbleChartProviderContribution } from '@retikz/chart/point/bubble';

import type { ChartAuthoringResult } from '../../shared';
import type { CreateBubbleChartInput } from './types';

import { createPointChart, typedChartPartsOf } from '../shared';
import { normalizeBubbleChart } from './normalize';

/** 创建确定形态的 BubbleChart */
export const createBubbleChart = (input: CreateBubbleChartInput): ChartAuthoringResult<IRBubbleChart> => {
  const parts = typedChartPartsOf(input);
  const source = normalizeBubbleChart({
    ...parts.root,
    ...(input.title === undefined ? {} : { title: input.title }),
    ...(input.subtitle === undefined ? {} : { subtitle: input.subtitle }),
    ...(input.note === undefined ? {} : { note: input.note }),
    ...(input.source === undefined ? {} : { source: input.source }),
    encodings: input.encodings,
    ...(input.properties === undefined ? {} : { properties: input.properties }),
    ...(input.marks === undefined ? {} : { marks: input.marks }),
  });
  return createPointChart(
    source,
    parts,
    createBubbleChartProviderContribution(parts.themeDefinitions, parts.lowerOptions),
  );
};
