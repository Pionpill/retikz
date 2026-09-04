import type { IRRangedDotChart } from '@retikz/chart/point/ranged-dot';

import { createRangedDotChartProviderContribution } from '@retikz/chart/point/ranged-dot';

import type { ChartAuthoringResult } from '../../shared';
import type { CreateRangedDotChartInput } from './types';

import { createPointChart, typedChartPartsOf } from '../shared';
import { normalizeRangedDotChart } from './normalize';

/** 创建 Ranged Dot Chart */
export const createRangedDotChart = (input: CreateRangedDotChartInput): ChartAuthoringResult<IRRangedDotChart> => {
  const parts = typedChartPartsOf(input);
  const source = normalizeRangedDotChart({
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
    createRangedDotChartProviderContribution(parts.themeDefinitions, parts.lowerOptions),
  );
};
