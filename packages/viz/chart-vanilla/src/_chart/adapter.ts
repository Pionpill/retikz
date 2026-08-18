import type { IRScene, ThemeStyleDefinition } from '@retikz/core';
import type { InputEmbedAdapter } from '@retikz/vanilla';

import { CHART_NAMESPACE, resolveChart } from '@retikz/chart';
import { DEFAULT_RESOLVED_THEME, resolveTheme, resolveThemeStyleRegistry } from '@retikz/core';

import type { BoundChartAuthoring, ChartAuthoringResult } from '../shared/types';

import { chartContributionOf, wrapChartPanel } from '../shared';

/** 以创建时声明的根主题解析已绑定 Chart */
export const createBoundChartResult = (
  input: BoundChartAuthoring,
  theme: IRScene['theme'] | undefined,
  themeStyles: ReadonlyArray<ThemeStyleDefinition> | undefined,
): ChartAuthoringResult => {
  const effectiveTheme = resolveTheme(
    DEFAULT_RESOLVED_THEME,
    theme,
    'chart-vanilla Chart Theme',
    resolveThemeStyleRegistry(themeStyles),
  );
  const resolution = resolveChart(input.bound, {
    theme: effectiveTheme,
    chartThemeStyles: input.chartThemeStyles,
    plotThemeStyles: input.plotThemeStyles,
  });
  return chartContributionOf(resolution, input, theme, themeStyles);
};

/** 将已绑定 Chart 下沉为唯一的 Base Chart 与 Core 贡献 */
export const ChartInputEmbedAdapter: InputEmbedAdapter<BoundChartAuthoring> = {
  kind: CHART_NAMESPACE,
  lower: (props, context) => {
    const resolution = resolveChart(props.bound, {
      theme: context.theme ?? DEFAULT_RESOLVED_THEME,
      chartThemeStyles: props.chartThemeStyles,
      plotThemeStyles: props.plotThemeStyles,
    });
    const result = chartContributionOf(resolution, props);
    return {
      node: wrapChartPanel(result.chart, props.panel),
      providerDependencies: result.contribution,
    };
  },
};
