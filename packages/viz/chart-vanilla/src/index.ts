import type {
  ChartPresentationAuthoringRecord,
  ChartPresentationShorthand,
  ChartThemeStyleDefinition,
  ChartTypeValue,
  IRBubbleChartSpec,
  IRChart,
  IRConnectedScatterChartSpec,
  IRScatterChartSpec,
} from '@retikz/chart';
import type {
  CompileResult,
  CompositeDependencyContribution,
  IRScene,
  ResolvedTheme,
  ThemeStyleDefinition,
} from '@retikz/core';
import type { ExternalDatasets, ExternalRow } from '@retikz/data';
import type { IRPlotSpec, LowerPlotsOptions, PlotThemeStyleDefinition } from '@retikz/plot';
import type { PlotContributionInput } from '@retikz/plot-vanilla';
import type { RenderToStringOptions } from '@retikz/vanilla';

import {
  ChartProvider,
  ChartType,
  createChart as createCanonicalChart,
  createChartProvider,
  DEFAULT_CHART_DATA_REFERENCE,
  resolveChartSpec,
} from '@retikz/chart';
import {
  compileToScene,
  DEFAULT_RESOLVED_THEME,
  resolveCompositeDependencies,
  resolveTheme,
  resolveThemeStyleRegistry,
} from '@retikz/core';
import { FlexLayoutProvider } from '@retikz/layout';
import { resolvePlotContribution } from '@retikz/plot-vanilla';
import { SurfaceProvider } from '@retikz/standard';
import { renderToSvgString } from '@retikz/vanilla';

/** Chart Vanilla creation 的统一结果 */
export type ChartAuthoringResult = Readonly<{
  /** strict canonical Chart IR */
  chart: IRChart;
  /** 只以 chart.chart 为 root 的完整 dependency contribution */
  contribution: CompositeDependencyContribution;
  /** factory 时声明的根 Core Theme */
  theme?: IRScene['theme'];
  /** factory 时声明的根 Core Theme style definitions */
  themeStyles?: ReadonlyArray<ThemeStyleDefinition>;
}>;

/** 从 renderChart 的 Core Theme 输入解析 typed recipe 所需的有效 Theme */
const resolveTypedChartTheme = (
  theme: IRScene['theme'] | undefined,
  themeStyles: ReadonlyArray<ThemeStyleDefinition> | undefined,
): ResolvedTheme =>
  resolveTheme(DEFAULT_RESOLVED_THEME, theme, 'chart-vanilla creation Theme', resolveThemeStyleRegistry(themeStyles));

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

const chartContributionOf = (
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

/** typed Chart 共享 Vanilla input algebra */
export type CreateTypedChartInput<TSpec> = Omit<
  TSpec,
  'namespace' | 'type' | 'data' | 'transform' | 'scales' | 'coordinate' | 'composition' | 'guides' | 'marks'
> &
  ChartPresentationShorthand & {
    /** typed recipe 使用的 rows */
    data: Array<ExternalRow>;
    /** 稳定 data reference；省略时固定为 chart.data */
    dataRef?: string;
    /** recipe 外追加的 Plot transforms */
    transform?: IRScatterChartSpec['transform'];
    /** recipe 外追加或替换的 Plot scales */
    scales?: IRScatterChartSpec['scales'];
    /** recipe 外 coordinate root */
    coordinate?: IRScatterChartSpec['coordinate'];
    /** recipe 外 composition root */
    composition?: IRScatterChartSpec['composition'];
    /** recipe 外 Plot guides */
    guides?: IRScatterChartSpec['guides'];
    /** recipe 外 Plot marks */
    marks?: IRScatterChartSpec['marks'];
    /** ordered plain presentation records */
    presentation?: ReadonlyArray<ChartPresentationAuthoringRecord>;
    /** Chart-owned runtime Theme definitions */
    chartThemeStyles?: ReadonlyArray<ChartThemeStyleDefinition>;
    /** Plot-owned runtime Theme definitions */
    plotThemeStyles?: ReadonlyArray<PlotThemeStyleDefinition>;
    /** factory 时解析 typed recipe 的根 Core Theme */
    theme?: IRScene['theme'];
    /** factory 时解析 typed recipe 的根 Core Theme style definitions */
    themeStyles?: ReadonlyArray<ThemeStyleDefinition>;
  };

/** ScatterChart Vanilla input */
export type CreateScatterChartInput = CreateTypedChartInput<IRScatterChartSpec>;
/** BubbleChart Vanilla input */
export type CreateBubbleChartInput = CreateTypedChartInput<IRBubbleChartSpec>;
/** ConnectedScatterChart Vanilla input */
export type CreateConnectedScatterChartInput = CreateTypedChartInput<IRConnectedScatterChartSpec>;

const createTypedChart = (
  type: ChartTypeValue,
  input: CreateTypedChartInput<IRScatterChartSpec>,
): ChartAuthoringResult => {
  const {
    data,
    dataRef,
    title,
    subtitle,
    note,
    source,
    presentation,
    chartThemeStyles,
    plotThemeStyles,
    theme,
    themeStyles,
    transform,
    scales,
    coordinate,
    composition,
    guides,
    marks,
    ...recipe
  } = input;
  const reference = dataRef ?? DEFAULT_CHART_DATA_REFERENCE;
  const effectiveTheme = resolveTypedChartTheme(theme, themeStyles);
  const resolution = resolveChartSpec(
    {
      namespace: 'chart',
      type,
      data: { reference },
      ...recipe,
      ...(transform === undefined ? {} : { transform }),
      ...(scales === undefined ? {} : { scales }),
      ...(coordinate === undefined ? {} : { coordinate }),
      ...(composition === undefined ? {} : { composition }),
      ...(guides === undefined ? {} : { guides }),
      ...(marks === undefined ? {} : { marks }),
    },
    effectiveTheme,
    { chartThemeStyles, plotThemeStyles },
    {
      ...(title === undefined ? {} : { title }),
      ...(subtitle === undefined ? {} : { subtitle }),
      ...(note === undefined ? {} : { note }),
      ...(source === undefined ? {} : { source }),
      ...(presentation === undefined ? {} : { presentation }),
    },
  );
  const result = chartContributionOf(
    resolution.chart,
    {
      spec: resolution.plotSpec,
      datasets: { [reference]: data },
      ...(plotThemeStyles === undefined ? {} : { lowerOptions: { plotThemeStyles } }),
    },
    chartThemeStyles,
    theme,
    themeStyles,
  );
  return result;
};

/** 创建 canonical ScatterChart */
export const createScatterChart = (input: CreateScatterChartInput): ChartAuthoringResult =>
  createTypedChart(ChartType.Scatter, input);

/** 创建 canonical BubbleChart */
export const createBubbleChart = (input: CreateBubbleChartInput): ChartAuthoringResult =>
  createTypedChart(ChartType.Bubble, input);

/** 创建 canonical ConnectedScatterChart */
export const createConnectedScatterChart = (input: CreateConnectedScatterChartInput): ChartAuthoringResult =>
  createTypedChart(ChartType.ConnectedScatter, input);

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
  const composites = resolveCompositeDependencies({
    contributions: [input.contribution],
    ...(explicitComposites === undefined ? {} : { composites: explicitComposites }),
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
      composites,
      ...(themeStyles === undefined ? {} : { themeStyles }),
    },
  );
  const svg = renderToSvgString(compileResult.scene, renderOptions);
  return { svg, compileResult };
};
