import type { IRRegressionChart } from '@retikz/chart/point/regression';

import { createRegressionChartProviderContribution } from '@retikz/chart/point/regression';

import type { ChartAuthoringResult } from '../../shared';
import type { CreateRegressionChartInput } from './types';

import { createPointChart, typedChartPartsOf } from '../shared';
import { normalizeRegressionChart } from './normalize';

/** 创建确定形态的 RegressionChart */
export const createRegressionChart = (input: CreateRegressionChartInput): ChartAuthoringResult<IRRegressionChart> => {
  const parts = typedChartPartsOf(input);
  const source = normalizeRegressionChart({
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
    createRegressionChartProviderContribution(parts.themeDefinitions, parts.lowerOptions),
  );
};
