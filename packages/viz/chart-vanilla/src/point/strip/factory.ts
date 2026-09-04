import type { IRStripChart } from '@retikz/chart/point/strip';

import { createStripChartProviderContribution } from '@retikz/chart/point/strip';

import type { ChartAuthoringResult } from '../../shared';
import type { CreateStripChartInput } from './types';

import { createPointChart, typedChartPartsOf } from '../shared';
import { normalizeStripChart } from './normalize';

/** 创建确定形态的 StripChart */
export const createStripChart = (input: CreateStripChartInput): ChartAuthoringResult<IRStripChart> => {
  const parts = typedChartPartsOf(input);
  const source = normalizeStripChart({
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
    createStripChartProviderContribution(parts.themeDefinitions, parts.lowerOptions),
  );
};
