import type {
  BoundChart,
  ChartPresentationAuthoringRecord,
  ChartPresentationShorthand,
  ChartThemeStyleDefinition,
  IRBaseChart,
} from '@retikz/chart';
import type { IRBubbleChart, IRConnectedScatterChart, IRScatterChart } from '@retikz/chart/point';
import type { IRScene, ThemeStyleDefinition } from '@retikz/core';
import type { ExternalRow } from '@retikz/data';
import type { PlotThemeStyleDefinition } from '@retikz/plot';

import { DEFAULT_CHART_DATA_REFERENCE, normalizeChartPresentation } from '@retikz/chart';
import {
  BubbleChartRecipe,
  BubbleChartSchema,
  ConnectedScatterChartRecipe,
  ConnectedScatterChartSchema,
  ScatterChartRecipe,
  ScatterChartSchema,
} from '@retikz/chart/point';

import type { BoundChartAuthoring, ChartAuthoringResult } from '../shared/types';

import { createBoundChartResult } from '../_chart/adapter';

export * from '../index';

type TypedChartSource = IRScatterChart | IRBubbleChart | IRConnectedScatterChart;

type TypedChartCommonInput = ChartPresentationShorthand &
  Omit<IRScatterChart['plot'], 'data'> & {
    /** 具体类型解析方案使用的数据行 */
    data: Array<ExternalRow>;
    /** 稳定的数据引用；省略时固定为 `chart.data` */
    dataRef?: string;
    /** 可选的 Plot 数据模型 */
    dataModel?: IRScatterChart['plot']['data']['model'];
    /** Chart 外层标识 */
    id?: string;
    /** Chart 自有令牌的稀疏覆盖 */
    chartThemeTokens?: IRBaseChart['chartThemeTokens'];
    /** 按顺序排列的普通展示记录 */
    presentation?: ReadonlyArray<ChartPresentationAuthoringRecord>;
    /** Chart 自有的运行时主题定义 */
    chartThemeStyles?: ReadonlyArray<ChartThemeStyleDefinition>;
    /** Plot 自有的运行时主题定义 */
    plotThemeStyles?: ReadonlyArray<PlotThemeStyleDefinition>;
    /** 创建时解析具体类型解析方案的根 Core 主题 */
    theme?: IRScene['theme'];
    /** 创建时解析具体类型解析方案的根 Core 主题样式定义 */
    themeStyles?: ReadonlyArray<ThemeStyleDefinition>;
  };

/** ScatterChart 的 Vanilla 精确输入 */
export type CreateScatterChartInput = TypedChartCommonInput & IRScatterChart['config'];

/** BubbleChart 的 Vanilla 精确输入 */
export type CreateBubbleChartInput = TypedChartCommonInput & IRBubbleChart['config'];

/** ConnectedScatterChart 的 Vanilla 精确输入 */
export type CreateConnectedScatterChartInput = TypedChartCommonInput & IRConnectedScatterChart['config'];

type TypedRecipe<TSource extends TypedChartSource> = Readonly<{
  parse: (input: unknown) => TSource;
  bind: (source: TSource) => BoundChart;
}>;

const createTypedChart = <TSource extends TypedChartSource>(
  input: TypedChartCommonInput,
  config: TSource['config'],
  type: TSource['type'],
  recipe: TypedRecipe<TSource>,
): ChartAuthoringResult => {
  const {
    data,
    dataRef,
    dataModel,
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
    ...plot
  } = input;
  const reference = dataRef ?? DEFAULT_CHART_DATA_REFERENCE;
  const normalizedPresentation = normalizeChartPresentation({ title, subtitle, note, source, presentation });
  const spec = recipe.parse({
    namespace: 'chart',
    type,
    ...(id === undefined ? {} : { id }),
    ...(chartThemeTokens === undefined ? {} : { chartThemeTokens }),
    ...(normalizedPresentation === undefined ? {} : { presentation: normalizedPresentation }),
    plot: {
      data: {
        reference,
        ...(dataModel === undefined ? {} : { model: dataModel }),
      },
      ...plot,
    },
    config,
  });
  const bound: BoundChartAuthoring = {
    bound: recipe.bind(spec),
    datasets: { [reference]: data },
    ...(plotThemeStyles === undefined ? {} : { lowerOptions: { plotThemeStyles }, plotThemeStyles }),
    ...(chartThemeStyles === undefined ? {} : { chartThemeStyles }),
  };
  return createBoundChartResult(bound, theme, themeStyles);
};

/** 创建确定形态的 ScatterChart */
export const createScatterChart = (input: CreateScatterChartInput): ChartAuthoringResult => {
  const { encoding, mark, ...common } = input;
  return createTypedChart(common, { encoding, ...(mark === undefined ? {} : { mark }) }, 'scatter', {
    parse: value => ScatterChartSchema.parse(value),
    bind: spec => ScatterChartRecipe.bind(spec),
  });
};

/** 创建确定形态的 BubbleChart */
export const createBubbleChart = (input: CreateBubbleChartInput): ChartAuthoringResult => {
  const { encoding, mark, ...common } = input;
  return createTypedChart(common, { encoding, ...(mark === undefined ? {} : { mark }) }, 'bubble', {
    parse: value => BubbleChartSchema.parse(value),
    bind: spec => BubbleChartRecipe.bind(spec),
  });
};

/** 创建确定形态的 ConnectedScatterChart */
export const createConnectedScatterChart = (input: CreateConnectedScatterChartInput): ChartAuthoringResult => {
  const { encoding, mark, components, ...common } = input;
  return createTypedChart(
    common,
    {
      encoding,
      ...(mark === undefined ? {} : { mark }),
      ...(components === undefined ? {} : { components }),
    },
    'connected-scatter',
    {
      parse: value => ConnectedScatterChartSchema.parse(value),
      bind: spec => ConnectedScatterChartRecipe.bind(spec),
    },
  );
};
