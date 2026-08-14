import type { IRScene, ThemeStyleDefinition } from '@retikz/core';

import { ChartProvider, createChartProvider } from '@retikz/chart';
import { FlexLayoutProvider } from '@retikz/layout';
import { resolvePlotContribution } from '@retikz/plot-vanilla';
import { SurfaceProvider } from '@retikz/standard';

import type { NormalizedChart } from '../normalize/chart';
import type { ChartAuthoringResult } from './types';

/** 以 canonical Chart 与 Plot contribution 组装唯一 dependency root */
export const chartContributionOf = (
  normalized: NormalizedChart,
  theme: IRScene['theme'] | undefined = undefined,
  themeStyles: ReadonlyArray<ThemeStyleDefinition> | undefined = undefined,
): ChartAuthoringResult => {
  const { chart, input, spec } = normalized;
  const plot = resolvePlotContribution({
    spec,
    datasets: input.datasets,
    ...(input.lowerOptions === undefined ? {} : { lowerOptions: input.lowerOptions }),
  });
  const chartProvider = createChartProvider(input.chartThemeStyles);
  return {
    chart,
    input,
    contribution: {
      roots: [ChartProvider.key],
      providers: [SurfaceProvider, FlexLayoutProvider, ...plot.contribution.providers, chartProvider],
    },
    ...(theme === undefined ? {} : { theme }),
    ...(themeStyles === undefined ? {} : { themeStyles }),
  };
};
