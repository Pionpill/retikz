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

import { DEFAULT_CHART_DATA_REFERENCE, PointChartType, resolvePointChartSpec } from '@retikz/chart/point';
import { DEFAULT_RESOLVED_THEME, resolveTheme, resolveThemeStyleRegistry } from '@retikz/core';

import type { ChartAuthoringResult } from '../shared';

import { chartContributionOf } from '../shared';

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
  const resolution = resolvePointChartSpec(
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
  return chartContributionOf(
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
