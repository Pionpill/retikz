import type { ChartThemeStyleDefinition, IRChart } from '@retikz/chart';
import type { IRScene, ThemeStyleDefinition } from '@retikz/core';
import type { PlotContributionInput } from '@retikz/plot-vanilla';

import { ChartProvider, createChartProvider } from '@retikz/chart';
import { FlexLayoutProvider } from '@retikz/layout';
import { resolvePlotContribution } from '@retikz/plot-vanilla';
import { SurfaceProvider } from '@retikz/standard';

import type { ChartAuthoringResult } from './types';

/** 以 canonical Chart 与 Plot contribution 组装唯一 dependency root */
export const chartContributionOf = (
  chart: IRChart,
  plotInput: PlotContributionInput,
  chartThemeStyles: ReadonlyArray<ChartThemeStyleDefinition> | undefined = undefined,
  theme: IRScene['theme'] | undefined = undefined,
  themeStyles: ReadonlyArray<ThemeStyleDefinition> | undefined = undefined,
): ChartAuthoringResult => {
  const plot = resolvePlotContribution(plotInput);
  const chartProvider = createChartProvider(chartThemeStyles);
  return {
    chart,
    contribution: {
      roots: [ChartProvider.key],
      providers: [SurfaceProvider, FlexLayoutProvider, ...plot.contribution.providers, chartProvider],
    },
    ...(theme === undefined ? {} : { theme }),
    ...(themeStyles === undefined ? {} : { themeStyles }),
  };
};
