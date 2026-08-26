import type { IRScatterChart } from '@retikz/chart/point/scatter';

import { createScatterChartProviderContribution } from '@retikz/chart/point/scatter';

import type { ChartAuthoringResult } from '../../shared';
import type { CreateScatterChartInput } from './types';

import { createPointChart, typedChartPartsOf } from '../shared';
import { normalizeScatterChart } from './normalize';

/** 创建确定形态的 ScatterChart */
export const createScatterChart = (input: CreateScatterChartInput): ChartAuthoringResult<IRScatterChart> => {
  const parts = typedChartPartsOf(input);
  const source = normalizeScatterChart({
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
    createScatterChartProviderContribution(parts.themeDefinitions, parts.lowerOptions),
  );
};
