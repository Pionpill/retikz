import type {
  ChartPresentationAuthoringRecord,
  ChartPresentationShorthand,
  ChartThemeStyleDefinition,
  IRChart,
} from '@retikz/chart';
import type { CompileResult, IRScene, ThemeStyleDefinition } from '@retikz/core';
import type { ExternalDatasets } from '@retikz/data';
import type { IRPlotSpec, LowerPlotsOptions } from '@retikz/plot';
import type { RenderToStringOptions } from '@retikz/vanilla';

import { createChart as createCanonicalChart } from '@retikz/chart';
import { compileToScene, resolveCoreProviderDependencies } from '@retikz/core';
import { renderToSvgString } from '@retikz/vanilla';

import type { ChartAuthoringResult } from '../shared';

import { chartContributionOf } from '../shared';

export type { ChartAuthoringResult } from '../shared';

/** 基础 Chart Vanilla authoring 输入 */
export type CreateChartInput = Readonly<{
  /** 完整 PlotSpec */
  plot: IRPlotSpec;
  /** Plot lowering 的外部 datasets */
  datasets: ExternalDatasets;
  /** Plot lowering runtime options */
  lowerOptions?: LowerPlotsOptions;
  /** Chart outer identity */
  id?: string;
  /** Chart-owned token sparse overrides */
  chartThemeTokens?: IRChart['chartThemeTokens'];
  /** Chart-owned runtime Theme definitions */
  chartThemeStyles?: ReadonlyArray<ChartThemeStyleDefinition>;
  /** factory 时解析 Chart 的根 Core Theme */
  theme?: IRScene['theme'];
  /** factory 时解析 Chart 的根 Core Theme style definitions */
  themeStyles?: ReadonlyArray<ThemeStyleDefinition>;
}> &
  ChartPresentationShorthand & {
    /** 按 authoring 顺序排列的 presentation records */
    presentation?: ReadonlyArray<ChartPresentationAuthoringRecord>;
  };

/** 从完整 PlotSpec 和 plain presentation authoring 创建 canonical Chart */
export const createChart = (input: CreateChartInput): ChartAuthoringResult => {
  const { datasets, lowerOptions, chartThemeStyles, theme, themeStyles, ...authoring } = input;
  const chart = createCanonicalChart(authoring);
  return chartContributionOf(
    chart,
    {
      spec: chart.plot,
      datasets,
      ...(lowerOptions === undefined ? {} : { lowerOptions }),
    },
    chartThemeStyles,
    theme,
    themeStyles,
  );
};

/** Chart SSR render 选项 */
export type RenderChartOptions = Omit<RenderToStringOptions, 'adapters' | 'compileDriver'>;

/** Chart 单次 compile + SSR render 结果 */
export type RenderChartResult = Readonly<{
  /** 从同一个 CompileResult Scene 渲染出的 SVG */
  svg: string;
  /** 由该 SVG 直接消费的 Core compile result */
  compileResult: CompileResult;
}>;

/** 用一次 Core compile 将 Chart authoring result 渲染为 SVG */
export const renderChart = (input: ChartAuthoringResult, options: RenderChartOptions = {}): RenderChartResult => {
  const { compile: compileOptions, ...renderOptions } = options;
  const {
    composites: explicitComposites,
    themeStyles: explicitThemeStyles,
    ...compileOptionsWithoutDefinitions
  } = compileOptions ?? {};
  const providerDefinitions = resolveCoreProviderDependencies({
    contributions: [input.contribution],
    ...(explicitComposites === undefined ? {} : { definitions: { composites: explicitComposites } }),
  });
  const themeStyles =
    input.themeStyles === undefined
      ? explicitThemeStyles
      : explicitThemeStyles === undefined
        ? input.themeStyles
        : [...input.themeStyles, ...explicitThemeStyles];
  const compileResult = compileToScene(
    {
      version: 1,
      type: 'scene',
      ...(input.theme === undefined ? {} : { theme: input.theme }),
      children: [input.chart],
    },
    {
      ...compileOptionsWithoutDefinitions,
      ...providerDefinitions,
      ...(themeStyles === undefined ? {} : { themeStyles }),
    },
  );
  const svg = renderToSvgString(compileResult.scene, renderOptions);
  return { svg, compileResult };
};
