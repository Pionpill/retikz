import type {
  ChartPresentationAuthoringRecord,
  ChartPresentationShorthand,
  ChartThemeStyleDefinition,
  IRBubbleChartSpec,
  IRConnectedScatterChartSpec,
  IRScatterChartSpec,
  PointChartTypeValue,
} from '@retikz/chart/point';
import type { IRScene, ResolvedTheme, ThemeStyleDefinition } from '@retikz/core';
import type { ExternalRow } from '@retikz/data';
import type { PlotThemeStyleDefinition } from '@retikz/plot';
import type { InputEmbedAdapter } from '@retikz/vanilla';

import { DEFAULT_CHART_DATA_REFERENCE, PointChartType, resolvePointChartSpec } from '@retikz/chart/point';
import { DEFAULT_RESOLVED_THEME, resolveTheme, resolveThemeStyleRegistry } from '@retikz/core';
import { inputPlotFromSpec } from '@retikz/plot-vanilla';

import type { InputChartPanel, NormalizedChart } from '../normalize/chart';
import type { ChartAuthoringResult } from '../shared';

import { chartContributionOf, wrapChartPanel } from '../shared';

export * from '../index';

/** typed Point Chart 共享 Vanilla input algebra */
export type CreateTypedPointChartInput<TSpec> = Omit<
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
export type CreateScatterChartInput = CreateTypedPointChartInput<IRScatterChartSpec>;
/** BubbleChart Vanilla input */
export type CreateBubbleChartInput = CreateTypedPointChartInput<IRBubbleChartSpec>;
/** ConnectedScatterChart Vanilla input */
export type CreateConnectedScatterChartInput = CreateTypedPointChartInput<IRConnectedScatterChartSpec>;

type InputTypedPointChartInput<TSpec> = Omit<
  CreateTypedPointChartInput<TSpec>,
  'theme' | 'themeStyles' | 'width' | 'height'
> & {
  /** Chart host 传入的宽度，Recipe schema 仍在下沉时校验 */
  width?: number | string;
  /** Chart host 传入的高度，Recipe schema 仍在下沉时校验 */
  height?: number | string;
};

/** Point Chart InputEmbed adapter 的已类型化领域输入 */
export type InputPointChart = Readonly<{
  /** 选定的 Point Chart recipe 类型 */
  type: PointChartTypeValue;
  /** 不带 Core Scope Theme 的 typed Chart authoring 输入 */
  input:
    | InputTypedPointChartInput<IRScatterChartSpec>
    | InputTypedPointChartInput<IRBubbleChartSpec>
    | InputTypedPointChartInput<IRConnectedScatterChartSpec>;
  /** 可选的 Chart 根 Scope */
  panel?: InputChartPanel;
}>;

/** 从 Vanilla Theme 输入解析 typed Point recipe 所需的有效 Theme */
const resolveTypedChartTheme = (
  theme: IRScene['theme'] | undefined,
  themeStyles: ReadonlyArray<ThemeStyleDefinition> | undefined,
): ResolvedTheme =>
  resolveTheme(
    DEFAULT_RESOLVED_THEME,
    theme,
    'chart-vanilla Point Chart Theme',
    resolveThemeStyleRegistry(themeStyles),
  );

const createTypedChart = (
  type: PointChartTypeValue,
  input: CreateTypedPointChartInput<IRScatterChartSpec>,
  effectiveTheme: ResolvedTheme | undefined = undefined,
): ChartAuthoringResult => {
  const {
    data,
    dataRef,
    id,
    chartThemeTokens,
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
  const resolvedTheme = effectiveTheme ?? resolveTypedChartTheme(theme, themeStyles);
  const resolution = resolvePointChartSpec(
    {
      namespace: 'chart',
      type,
      data: { reference },
      ...(id === undefined ? {} : { id }),
      ...(chartThemeTokens === undefined ? {} : { chartThemeTokens }),
      ...recipe,
      ...(transform === undefined ? {} : { transform }),
      ...(scales === undefined ? {} : { scales }),
      ...(coordinate === undefined ? {} : { coordinate }),
      ...(composition === undefined ? {} : { composition }),
      ...(guides === undefined ? {} : { guides }),
      ...(marks === undefined ? {} : { marks }),
    },
    resolvedTheme,
    { chartThemeStyles, plotThemeStyles },
    {
      ...(title === undefined ? {} : { title }),
      ...(subtitle === undefined ? {} : { subtitle }),
      ...(note === undefined ? {} : { note }),
      ...(source === undefined ? {} : { source }),
      ...(presentation === undefined ? {} : { presentation }),
    },
  );
  const normalized: NormalizedChart = {
    chart: resolution.chart,
    spec: resolution.plotSpec,
    input: {
      ...(id === undefined ? {} : { id }),
      ...(chartThemeTokens === undefined ? {} : { chartThemeTokens }),
      plot: inputPlotFromSpec(resolution.plotSpec),
      ...(title === undefined ? {} : { title }),
      ...(subtitle === undefined ? {} : { subtitle }),
      ...(note === undefined ? {} : { note }),
      ...(source === undefined ? {} : { source }),
      ...(presentation === undefined ? {} : { presentation }),
      datasets: { [reference]: data },
      ...(plotThemeStyles === undefined ? {} : { lowerOptions: { plotThemeStyles } }),
      ...(chartThemeStyles === undefined ? {} : { chartThemeStyles }),
    },
  };
  return chartContributionOf(normalized, theme, themeStyles);
};

/** 创建 canonical ScatterChart */
export const createScatterChart = (input: CreateScatterChartInput): ChartAuthoringResult =>
  createTypedChart(PointChartType.Scatter, input);

/** 创建 canonical BubbleChart */
export const createBubbleChart = (input: CreateBubbleChartInput): ChartAuthoringResult =>
  createTypedChart(PointChartType.Bubble, input);

/** 创建 canonical ConnectedScatterChart */
export const createConnectedScatterChart = (input: CreateConnectedScatterChartInput): ChartAuthoringResult =>
  createTypedChart(PointChartType.ConnectedScatter, input);

/** 将 Point Chart Input 以 processing 提供的 Scope Theme 下沉为 Core contribution */
export const PointChartInputEmbedAdapter: InputEmbedAdapter<InputPointChart> = {
  kind: 'chart-point',
  lower: (props, context) => {
    const result = createTypedChart(
      props.type,
      props.input as CreateTypedPointChartInput<IRScatterChartSpec>,
      context.theme ?? DEFAULT_RESOLVED_THEME,
    );
    return {
      node: wrapChartPanel(result.chart, props.panel),
      providerDependencies: result.contribution,
    };
  },
};
