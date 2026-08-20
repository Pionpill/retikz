import type {
  ChartPresentationAuthoringRecord,
  ChartPresentationShorthand,
  ChartThemeStyleDefinition,
  IRBaseChart,
} from '@retikz/chart';
import type { CompileResult, IRScene, ThemeStyleDefinition } from '@retikz/core';
import type { ExternalDatasets } from '@retikz/data';
import type { LowerPlotsOptions } from '@retikz/plot';
import type { PlotSource } from '@retikz/plot-vanilla';
import type { RenderToStringOptions } from '@retikz/vanilla';

import { BaseChartRecipe, CHART_NAMESPACE, createChart as createBaseChart, RetikzChartError } from '@retikz/chart';
import { plotIROf } from '@retikz/plot-vanilla';
import { embed, renderToSvgString, scene, toSceneResult } from '@retikz/vanilla';

import type { BoundChartAuthoring, ChartAuthoringResult } from '../shared/types';

import { chartContributionOf } from '../shared';
import { ChartInputEmbedAdapter } from './adapter';

export type { ChartAuthoringResult, InputChartPanel } from '../shared';
export { ChartInputEmbedAdapter } from './adapter';

/** 基础 Chart Vanilla 编写输入 */
export type CreateChartInput = Readonly<{
  /** Plot Vanilla 的显式输入或源 IR */
  plot: PlotSource;
  /** Plot 下沉使用的外部数据集 */
  datasets: ExternalDatasets;
  /** Plot 下沉的运行时选项 */
  lowerOptions?: LowerPlotsOptions;
  /** Chart 外层标识 */
  id?: string;
  /** Chart 自有令牌的稀疏覆盖 */
  chartThemeTokens?: IRBaseChart['chartThemeTokens'];
  /** Chart 自有的运行时主题定义 */
  chartThemeStyles?: ReadonlyArray<ChartThemeStyleDefinition>;
  /** 创建时解析 Chart 的根 Core 主题 */
  theme?: IRScene['theme'];
  /** 创建时解析 Chart 的根 Core 主题样式定义 */
  themeStyles?: ReadonlyArray<ThemeStyleDefinition>;
}> &
  ChartPresentationShorthand & {
    /** 按编写顺序排列的展示记录 */
    presentation?: ReadonlyArray<ChartPresentationAuthoringRecord>;
  };

/** 从完整 Plot 编写输入创建 Base Chart */
export const createChart = (input: CreateChartInput): ChartAuthoringResult => {
  const { plot, datasets, lowerOptions, chartThemeStyles, theme, themeStyles, ...chartAuthoring } = input;
  const spec = plotIROf(plot);
  const chart = createBaseChart({ ...chartAuthoring, plot: spec });
  const bound: BoundChartAuthoring = {
    bound: BaseChartRecipe.bind(chart),
    datasets,
    ...(lowerOptions === undefined ? {} : { lowerOptions }),
    ...(chartThemeStyles === undefined ? {} : { chartThemeStyles }),
    ...(lowerOptions?.plotThemeStyles === undefined ? {} : { plotThemeStyles: lowerOptions.plotThemeStyles }),
  };
  return chartContributionOf({ chart, plotSpec: spec }, bound, theme, themeStyles);
};

/** Chart 服务端渲染选项 */
export type RenderChartOptions = Omit<RenderToStringOptions, 'adapters' | 'compileDriver'>;

/** Chart 单次编译与服务端渲染结果 */
export type RenderChartResult = Readonly<{
  /** 从同一个 `CompileResult` 场景渲染出的 SVG */
  svg: string;
  /** 该 SVG 直接使用的 Core 编译结果 */
  compileResult: CompileResult;
}>;

/** 通过一次 Core 编译将 Chart 编写结果渲染为 SVG */
export const renderChart = (input: ChartAuthoringResult, options: RenderChartOptions = {}): RenderChartResult => {
  const { compile: compileOptions, ...renderOptions } = options;
  const {
    composites: explicitComposites,
    themeStyles: explicitThemeStyles,
    ...compileOptionsWithoutDefinitions
  } = compileOptions ?? {};
  const themeStyles =
    input.themeStyles === undefined
      ? explicitThemeStyles
      : explicitThemeStyles === undefined
        ? input.themeStyles
        : [...input.themeStyles, ...explicitThemeStyles];
  const result = toSceneResult(
    scene({
      ...(input.theme === undefined ? {} : { theme: input.theme }),
      children: [embed(CHART_NAMESPACE, input.chart.id ?? CHART_NAMESPACE, input.input)],
    }),
    {
      adapters: [ChartInputEmbedAdapter],
      compile: {
        ...compileOptionsWithoutDefinitions,
        ...(explicitComposites === undefined ? {} : { composites: explicitComposites }),
        ...(themeStyles === undefined ? {} : { themeStyles }),
      },
    },
  );
  if (result.compileResult === undefined) {
    throw new RetikzChartError('chart vanilla: InputScene processing must produce a Core compile result');
  }
  const svg = renderToSvgString(result.scene, renderOptions);
  return { svg, compileResult: result.compileResult };
};
