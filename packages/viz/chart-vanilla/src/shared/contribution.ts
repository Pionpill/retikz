import type { ChartResolution } from '@retikz/chart';
import type { IRScene, ThemeStyleDefinition } from '@retikz/core';

import { ChartProvider, createChartProvider } from '@retikz/chart';
import { FlexLayoutProvider } from '@retikz/layout';
import { resolvePlotContribution } from '@retikz/plot-vanilla';
import { SurfaceProvider } from '@retikz/standard';
import { PathClipProvider } from '@retikz/standard/clip';

import type { BoundChartAuthoring, ChartAuthoringResult } from './types';

/** 以确定形态的 Chart 与 Plot 贡献组装唯一依赖根 */
export const chartContributionOf = (
  resolution: ChartResolution,
  input: BoundChartAuthoring,
  theme: IRScene['theme'] | undefined = undefined,
  themeStyles: ReadonlyArray<ThemeStyleDefinition> | undefined = undefined,
): ChartAuthoringResult => {
  const plot = resolvePlotContribution({
    spec: resolution.plotSpec,
    datasets: input.datasets,
    ...(input.lowerOptions === undefined ? {} : { lowerOptions: input.lowerOptions }),
  });
  const chartProvider = createChartProvider(input.chartThemeStyles);
  return {
    chart: resolution.chart,
    input,
    contribution: {
      roots: [ChartProvider.key],
      providers: [SurfaceProvider, PathClipProvider, FlexLayoutProvider, ...plot.contribution.providers, chartProvider],
    },
    ...(theme === undefined ? {} : { theme }),
    ...(themeStyles === undefined ? {} : { themeStyles }),
  };
};
