import type { IRConnectedScatterChart } from '@retikz/chart/point/connected-scatter';

import { createConnectedScatterChartProviderContribution } from '@retikz/chart/point/connected-scatter';

import type { ChartAuthoringResult } from '../../shared';
import type { CreateConnectedScatterChartInput } from './types';

import { createPointChart, typedChartPartsOf } from '../shared';
import { normalizeConnectedScatterChart } from './normalize';

/** 创建 Connected Scatter Chart */
export const createConnectedScatterChart = (
  input: CreateConnectedScatterChartInput,
): ChartAuthoringResult<IRConnectedScatterChart> => {
  const parts = typedChartPartsOf(input);
  const source = normalizeConnectedScatterChart({
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
    createConnectedScatterChartProviderContribution(parts.themeDefinitions, parts.lowerOptions),
  );
};
